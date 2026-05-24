"""
Mock MQTT sensor publisher for the agri-automation-system.

Publishes physics-based sensor data (temperature, humidity, soil moisture, pH)
for three simulated crop nodes using a weather state machine and diurnal cycles.

Run with the backend virtualenv:
    backend/.venv/Scripts/python scripts/mock_sensor.py
    backend/.venv/Scripts/python scripts/mock_sensor.py --api-url http://localhost:8000 --api-username admin --api-password secret
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import random
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, field, replace
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths & env loading
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent


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


# ---------------------------------------------------------------------------
# Node profiles
# ---------------------------------------------------------------------------

@dataclass
class NodeProfile:
    device_id: str
    name: str
    location: str
    base_temp: float
    temp_amplitude: float
    temp_noise: float
    base_humidity: float
    humidity_temp_coeff: float
    humidity_noise: float
    base_soil: float
    soil_drain_rate: float
    irrigate_prob: float
    soil_noise: float
    base_ph: float
    ph_drift_sigma: float
    ph_noise: float


NODE_PROFILES: list[NodeProfile] = [
    NodeProfile(
        device_id="lahan-1",
        name="Lahan 1 (Tomat)",
        location="Blok A - Greenhouse",
        base_temp=27.5,
        temp_amplitude=3.0,
        temp_noise=0.25,
        base_humidity=72.0,
        humidity_temp_coeff=-2.2,
        humidity_noise=1.2,
        base_soil=62.0,
        soil_drain_rate=0.6,
        irrigate_prob=0.025,
        soil_noise=0.4,
        base_ph=6.20,
        ph_drift_sigma=0.008,
        ph_noise=0.015,
    ),
    NodeProfile(
        device_id="lahan-2",
        name="Lahan 2 (Cabai)",
        location="Blok B - Lahan Terbuka",
        base_temp=29.0,
        temp_amplitude=5.5,
        temp_noise=0.40,
        base_humidity=63.0,
        humidity_temp_coeff=-2.8,
        humidity_noise=1.8,
        base_soil=50.0,
        soil_drain_rate=0.9,
        irrigate_prob=0.020,
        soil_noise=0.6,
        base_ph=6.52,
        ph_drift_sigma=0.010,
        ph_noise=0.018,
    ),
    NodeProfile(
        device_id="lahan-3",
        name="Lahan 3 (Selada Hidroponik)",
        location="Blok C - Greenhouse Hidroponik",
        base_temp=24.5,
        temp_amplitude=1.8,
        temp_noise=0.15,
        base_humidity=78.0,
        humidity_temp_coeff=-1.5,
        humidity_noise=0.9,
        base_soil=73.0,
        soil_drain_rate=0.3,
        irrigate_prob=0.060,
        soil_noise=0.3,
        base_ph=5.92,
        ph_drift_sigma=0.006,
        ph_noise=0.012,
    ),
]

# ---------------------------------------------------------------------------
# Weather state machine
# ---------------------------------------------------------------------------

WEATHER_STATES = ["cerah", "berawan_sebagian", "berawan", "hujan"]

WEATHER_TRANSITIONS: dict[str, dict[str, float]] = {
    "cerah":            {"cerah": 0.94, "berawan_sebagian": 0.06},
    "berawan_sebagian": {"cerah": 0.08, "berawan_sebagian": 0.82, "berawan": 0.10},
    "berawan":          {"berawan_sebagian": 0.07, "berawan": 0.80, "hujan": 0.13},
    "hujan":            {"berawan": 0.30, "hujan": 0.70},
}

WEATHER_TEMP_MOD: dict[str, float] = {
    "cerah": 0.0,
    "berawan_sebagian": -0.8,
    "berawan": -2.0,
    "hujan": -3.5,
}

WEATHER_HUMIDITY_MOD: dict[str, float] = {
    "cerah": 0.0,
    "berawan_sebagian": 5.0,
    "berawan": 12.0,
    "hujan": 22.0,
}

WEATHER_ICONS: dict[str, str] = {
    "cerah": "[*]",
    "berawan_sebagian": "[~]",
    "berawan": "[c]",
    "hujan": "[r]",
}

WEATHER_LABELS: dict[str, str] = {
    "cerah": "Cerah",
    "berawan_sebagian": "Berawan Sebagian",
    "berawan": "Berawan",
    "hujan": "Hujan",
}


def next_weather(current: str) -> str:
    transitions = WEATHER_TRANSITIONS[current]
    states = list(transitions.keys())
    weights = [transitions[s] for s in states]
    return random.choices(states, weights=weights, k=1)[0]


# ---------------------------------------------------------------------------
# Node state
# ---------------------------------------------------------------------------

@dataclass
class NodeState:
    profile: NodeProfile
    soil_moisture: float = field(init=False)
    ph: float = field(init=False)
    weather: str = field(init=False)

    def __post_init__(self) -> None:
        self.soil_moisture = self.profile.base_soil + random.gauss(0, 2)
        self.ph = self.profile.base_ph + random.gauss(0, 0.05)
        hour = datetime.now().hour
        self.weather = "cerah" if 6 <= hour < 16 else "berawan_sebagian"

    def step(self, elapsed_hours: float) -> dict:
        p = self.profile
        now = datetime.now()
        hour = now.hour + now.minute / 60.0

        # Advance weather
        self.weather = next_weather(self.weather)

        # --- Temperature ---
        diurnal = -math.cos((hour - 13) * 2 * math.pi / 24)
        temp = (
            p.base_temp
            + p.temp_amplitude * diurnal
            + WEATHER_TEMP_MOD[self.weather]
            + random.gauss(0, p.temp_noise)
        )
        temp = max(16.0, min(42.0, temp))

        # --- Humidity ---
        humidity = (
            p.base_humidity
            + p.humidity_temp_coeff * (temp - p.base_temp)
            + WEATHER_HUMIDITY_MOD[self.weather]
            + random.gauss(0, p.humidity_noise)
        )
        humidity = max(30.0, min(98.0, humidity))

        # --- Soil moisture ---
        diurnal_positive = max(0.0, diurnal)
        evapotranspiration = (
            p.soil_drain_rate
            * diurnal_positive
            * (temp / p.base_temp)
            * elapsed_hours
        )
        self.soil_moisture -= evapotranspiration

        if self.weather == "hujan":
            rain_recharge = random.uniform(0.5, 2.0) * elapsed_hours * 60
            self.soil_moisture += rain_recharge

        irrigated = False
        if random.random() < p.irrigate_prob:
            self.soil_moisture += random.uniform(12.0, 22.0)
            irrigated = True

        self.soil_moisture += random.gauss(0, p.soil_noise)
        self.soil_moisture = max(18.0, min(90.0, self.soil_moisture))

        # --- pH ---
        drift_mean = -0.002 if self.weather == "hujan" else 0.0
        self.ph += random.gauss(drift_mean, p.ph_drift_sigma)
        self.ph += random.gauss(0, p.ph_noise)
        self.ph = max(4.8, min(8.2, self.ph))

        return {
            "device_id": p.device_id,
            "temperature": round(temp, 2),
            "humidity": round(humidity, 2),
            "soil_moisture": round(self.soil_moisture, 2),
            "ph": round(self.ph, 2),
            "_meta": {
                "weather": self.weather,
                "irrigated": irrigated,
                "node_name": p.name,
            },
        }


# ---------------------------------------------------------------------------
# Auto-registration
# ---------------------------------------------------------------------------

def register_nodes(api_url: str, username: str, password: str, profiles: list[NodeProfile]) -> None:
    # Login
    login_data = urllib.parse.urlencode({"username": username, "password": password}).encode()
    login_req = urllib.request.Request(
        f"{api_url}/api/v1/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(login_req, timeout=10) as resp:
            token_data = json.loads(resp.read().decode())
        access_token = token_data["access_token"]
    except Exception as exc:
        print(f"[mock-sensor] Auto-registration login failed: {exc}")
        return

    # Register each node
    for profile in profiles:
        body = json.dumps({
            "device_id": profile.device_id,
            "name": profile.name,
            "location": profile.location,
        }).encode()
        reg_req = urllib.request.Request(
            f"{api_url}/api/v1/sensors/nodes",
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(reg_req, timeout=10) as resp:
                resp.read()
            print(f"[mock-sensor] Registered node: {profile.device_id}")
        except urllib.request.HTTPError as exc:
            if exc.code in (400, 409):
                print(f"[mock-sensor] Node already exists (skipping): {profile.device_id}")
            else:
                print(f"[mock-sensor] Failed to register {profile.device_id}: {exc}")
        except Exception as exc:
            print(f"[mock-sensor] Failed to register {profile.device_id}: {exc}")


# ---------------------------------------------------------------------------
# ANSI colour helpers
# ---------------------------------------------------------------------------

RESET = "\033[0m"
RED = "\033[91m"
YELLOW = "\033[93m"
GREEN = "\033[92m"


_DEG = "°"


def colour_temp(val: float) -> str:
    if val > 35 or val < 15:
        return f"{RED}{val:.1f}{_DEG}{RESET}"
    if val > 32:
        return f"{YELLOW}{val:.1f}{_DEG}{RESET}"
    return f"{val:.1f}{_DEG}"


def colour_soil(val: float) -> str:
    if val < 20 or val > 80:
        return f"{RED}{val:.1f}%{RESET}"
    if val < 30:
        return f"{YELLOW}{val:.1f}%{RESET}"
    return f"{val:.1f}%"


def colour_ph(val: float) -> str:
    if val < 5.5 or val > 7.5:
        return f"{RED}{val:.2f}{RESET}"
    return f"{val:.2f}"


def print_table(payloads: list[dict]) -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    n = len(payloads)
    print(f"[{ts}] Sensor Update — {n} nodes")
    for p in payloads:
        meta = p["_meta"]
        weather = meta["weather"]
        icon = WEATHER_ICONS.get(weather, "?")
        label = WEATHER_LABELS.get(weather, weather)
        suffix = f"{icon}  {label}"
        if meta["irrigated"]:
            suffix += " · Irigasi"

        name = meta["node_name"]
        temp_str = colour_temp(p["temperature"])
        hum_str = f"{p['humidity']:.1f}%"
        soil_str = colour_soil(p["soil_moisture"])
        ph_str = colour_ph(p["ph"])

        print(f"  {name:<32} {temp_str:<8} {hum_str:<8} {soil_str:<8} {ph_str:<6} {suffix}")


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Mock MQTT sensor publisher for agri-automation-system.")
    parser.add_argument("--interval", type=int, default=30, help="Seconds between readings (default: 30).")
    parser.add_argument("--device-ids", nargs="+", metavar="ID", help="Override device IDs (mapped to profiles in order).")
    parser.add_argument("--api-url", help="Backend URL for auto-registration, e.g. http://localhost:8000.")
    parser.add_argument("--api-username", help="Username for mock sensor node auto-registration.")
    parser.add_argument("--api-password", help="Password for mock sensor node auto-registration.")
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Main async loop
# ---------------------------------------------------------------------------

async def run(args: argparse.Namespace) -> None:
    import aiomqtt  # imported here so the module can be imported without aiomqtt for tests

    # Load MQTT config from backend/.env
    env = load_env_file(ROOT / "backend" / ".env")
    broker_host = env.get("MQTT_BROKER_HOST", "localhost")
    broker_port = int(env.get("MQTT_BROKER_PORT", "1883"))
    mqtt_username = env.get("MQTT_USERNAME") or None
    mqtt_password = env.get("MQTT_PASSWORD") or None
    topic_prefix = env.get("MQTT_TOPIC_PREFIX", "agri/sensors")

    # Build profiles (apply device-id overrides if given)
    profiles = list(NODE_PROFILES)
    if args.device_ids:
        overridden: list[NodeProfile] = []
        for i, did in enumerate(args.device_ids):
            base = profiles[i % len(profiles)]
            overridden.append(replace(base, device_id=did))
        profiles = overridden

    # Auto-register nodes if credentials provided
    if args.api_url and args.api_username and args.api_password:
        print("[mock-sensor] Registering nodes with backend...")
        register_nodes(args.api_url, args.api_username, args.api_password, profiles)

    # Create node states
    states = [NodeState(profile=p) for p in profiles]

    print(f"\n[mock-sensor] Starting publisher")
    print(f"  Broker      : {broker_host}:{broker_port}")
    print(f"  Topic prefix: {topic_prefix}")
    print(f"  Nodes       : {len(states)}")
    print(f"  Interval    : {args.interval}s\n")

    elapsed_hours = args.interval / 3600.0

    while True:
        try:
            import ssl
            client_kwargs: dict = {
                "hostname": broker_host,
                "port": broker_port,
                "username": mqtt_username or None,
                "password": mqtt_password or None,
                "tls_context": ssl.create_default_context() if broker_port == 8883 else None,
            }

            async with aiomqtt.Client(**client_kwargs) as client:
                while True:
                    payloads: list[dict] = []
                    for state in states:
                        payload = state.step(elapsed_hours)
                        topic = f"{topic_prefix}/{payload['device_id']}"
                        publish_payload = {k: v for k, v in payload.items() if k != "_meta"}
                        await client.publish(topic, json.dumps(publish_payload), qos=1)
                        payloads.append(payload)

                    print_table(payloads)
                    await asyncio.sleep(args.interval)

        except Exception as exc:
            print(f"[mock-sensor] Connection error: {exc}. Retrying in 5s...")
            await asyncio.sleep(5)


async def main() -> None:
    args = parse_args()
    await run(args)


if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
