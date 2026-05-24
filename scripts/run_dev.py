"""
Run native development services without Docker.

Starts backend, AI service, frontend web, and Expo mobile from one command:

    python scripts/run_dev.py
"""

from __future__ import annotations

import argparse
import os
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
IS_WINDOWS = os.name == "nt"


@dataclass(frozen=True)
class Service:
    name: str
    command: list[str]
    cwd: Path
    env: dict[str, str]
    raw_output: bool = False
    note: str | None = None


def command_name(name: str) -> str:
    if IS_WINDOWS and name in {"npm", "npx"}:
        return f"{name}.cmd"
    return name


def python_in_venv(path: Path) -> Path:
    if IS_WINDOWS:
        return path / "Scripts" / "python.exe"
    return path / "bin" / "python"


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def merged_env(*env_files: Path, overrides: dict[str, str] | None = None) -> dict[str, str]:
    env = os.environ.copy()
    for env_file in env_files:
        env.update(load_env_file(env_file))
    if overrides:
        for key, value in overrides.items():
            env.setdefault(key, value)
    return env


def with_env(env: dict[str, str], values: dict[str, str]) -> dict[str, str]:
    """Return a copy of env with explicit values applied."""
    next_env = env.copy()
    next_env.update(values)
    return next_env


def detect_lan_ip() -> str:
    """Return the local IPv4 address used for outbound LAN traffic."""
    override = os.environ.get("AGRI_LAN_IP")
    if override:
        return override

    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        try:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
        except OSError:
            return socket.gethostbyname(socket.gethostname())


def require_file(path: Path, label: str, errors: list[str]) -> None:
    if not path.is_file():
        errors.append(f"Missing {label}: {path.relative_to(ROOT)}")


def require_dir(path: Path, label: str, errors: list[str]) -> None:
    if not path.is_dir():
        errors.append(f"Missing {label}: {path.relative_to(ROOT)}")


def require_command(name: str, errors: list[str]) -> None:
    if shutil.which(command_name(name)) is None:
        errors.append(f"Required command not found on PATH: {name}")


def preflight(include_web: bool, include_mobile: bool, backend_only: bool) -> None:
    errors: list[str] = []

    require_file(ROOT / "backend" / ".env", "backend env file", errors)
    require_file(ROOT / "backend" / "requirements.txt", "backend requirements", errors)
    require_file(python_in_venv(ROOT / "backend" / ".venv"), "backend virtualenv Python", errors)

    if not backend_only:
        require_file(ROOT / "ai" / ".env", "AI env file", errors)
        require_file(ROOT / "ai" / "requirements.txt", "AI requirements", errors)
        require_file(python_in_venv(ROOT / "ai" / ".venv"), "AI virtualenv Python", errors)

    if include_web and not backend_only:
        require_command("npm", errors)
        require_file(ROOT / "frontend-web" / ".env.local", "frontend-web env file", errors)
        require_dir(ROOT / "frontend-web" / "node_modules", "frontend-web node_modules", errors)

    if include_mobile and not backend_only:
        require_command("npx", errors)
        require_file(ROOT / "mobile" / ".env", "mobile env file", errors)
        require_dir(ROOT / "mobile" / "node_modules", "mobile node_modules", errors)

    if errors:
        print("Cannot start native dev services. Fix these setup issues first:\n", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        print("\nSee README.md Quick Start for setup commands.", file=sys.stderr)
        raise SystemExit(1)


def build_services(args: argparse.Namespace) -> list[Service]:
    lan_ip = args.lan_ip or detect_lan_ip()
    mobile_api_url = args.mobile_api_url or f"http://{lan_ip}:8000/api/v1"
    backend_env = merged_env(ROOT / "backend" / ".env")
    services = [
        Service(
            name="backend",
            command=[
                str(python_in_venv(ROOT / "backend" / ".venv")),
                "-m",
                "uvicorn",
                "app.main:app",
                "--reload",
                "--host",
                "0.0.0.0",
                "--port",
                "8000",
            ],
            cwd=ROOT / "backend",
            env=backend_env,
        )
    ]

    if not args.no_sensor:
        mock_cmd = [str(python_in_venv(ROOT / "backend" / ".venv")), str(ROOT / "scripts" / "sensor.py"), "--interval", "30"]
        if args.mock_api_url and args.mock_username and args.mock_password:
            mock_cmd += ["--api-url", args.mock_api_url, "--api-username", args.mock_username, "--api-password", args.mock_password]
        services.append(Service(
            name="mock-sensor",
            command=mock_cmd,
            cwd=ROOT,
            env=backend_env,
            note="Publishing mock sensor data every 30s to MQTT",
        ))

    if args.backend_only:
        return services

    services.append(
        Service(
            name="ai",
            command=[
                str(python_in_venv(ROOT / "ai" / ".venv")),
                "-m",
                "uvicorn",
                "ai.api.inference_server:app",
                "--host",
                "0.0.0.0",
                "--port",
                "8001",
                "--reload",
                "--reload-dir",
                "ai/api",
                "--reload-dir",
                "ai/inference",
            ],
            cwd=ROOT,
            env=merged_env(ROOT / "ai" / ".env"),
        )
    )

    if not args.no_web:
        services.append(
            Service(
                name="web",
                command=[command_name("npm"), "run", "dev"],
                cwd=ROOT / "frontend-web",
                env=merged_env(
                    ROOT / "frontend-web" / ".env.local",
                    overrides={"NEXT_PUBLIC_API_URL": "http://localhost:8000/api/v1"},
                ),
            )
        )

    if not args.no_mobile:
        services.append(
            Service(
                name="mobile",
                command=[command_name("npx"), "expo", "start", "-c", "--lan"],
                cwd=ROOT / "mobile",
                env=with_env(
                    merged_env(ROOT / "mobile" / ".env"),
                    {
                        "EXPO_PUBLIC_API_URL": mobile_api_url,
                        # Expo hides interactive terminal UI, including QR output,
                        # when CI is truthy in the parent environment.
                        "CI": "0",
                    },
                ),
                raw_output=True,
                note=f"Expo API URL: {mobile_api_url}",
            )
        )

    return services


def stream_output(name: str, process: subprocess.Popen[str]) -> None:
    assert process.stdout is not None
    for line in process.stdout:
        print(f"[{name}] {line}", end="", flush=True)


def stop_process(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    if IS_WINDOWS:
        try:
            process.send_signal(signal.CTRL_BREAK_EVENT)
        except Exception:
            process.terminate()
    else:
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            return
    try:
        process.wait(timeout=8)
    except subprocess.TimeoutExpired:
        process.kill()


def run_services(services: list[Service]) -> int:
    processes: list[tuple[Service, subprocess.Popen[str]]] = []

    try:
        for service in services:
            print(f"Starting {service.name}: {' '.join(service.command)}")
            if service.note:
                print(f"  {service.note}")
            process_options = {}
            if IS_WINDOWS:
                process_options["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
            else:
                process_options["preexec_fn"] = os.setsid
            process = subprocess.Popen(
                service.command,
                cwd=service.cwd,
                env=service.env,
                stdout=None if service.raw_output else subprocess.PIPE,
                stderr=None if service.raw_output else subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                **process_options,
            )
            processes.append((service, process))
            if not service.raw_output:
                thread = threading.Thread(target=stream_output, args=(service.name, process), daemon=True)
                thread.start()

        print("\nServices started. Press Ctrl+C to stop all services.\n")
        while True:
            for service, process in processes:
                code = process.poll()
                if code is not None:
                    print(f"\n{service.name} exited with code {code}; stopping remaining services.")
                    return code if code else 1
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopping services...")
        return 130
    finally:
        for _, process in reversed(processes):
            stop_process(process)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run native development services without Docker.")
    parser.add_argument("--no-mobile", action="store_true", help="Start backend, AI, and web only.")
    parser.add_argument("--no-web", action="store_true", help="Start backend, AI, and mobile only.")
    parser.add_argument("--backend-only", action="store_true", help="Start only the backend service.")
    parser.add_argument("--lan-ip", help="LAN IPv4 address exposed to mobile devices. Defaults to auto-detect.")
    parser.add_argument(
        "--mobile-api-url",
        help="Full API URL injected into Expo, e.g. http://192.168.1.10:8000/api/v1.",
    )
    parser.add_argument("--no-sensor", action="store_true", help="Skip the MQTT sensor publisher.")

    parser.add_argument("--mock-api-url", default="http://localhost:8000", help="Backend URL for mock sensor auto-registration.")
    parser.add_argument("--mock-username", help="Username for mock sensor node auto-registration.")
    parser.add_argument("--mock-password", help="Password for mock sensor node auto-registration.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    include_web = not args.no_web
    include_mobile = not args.no_mobile
    preflight(include_web=include_web, include_mobile=include_mobile, backend_only=args.backend_only)
    return run_services(build_services(args))


if __name__ == "__main__":
    raise SystemExit(main())
