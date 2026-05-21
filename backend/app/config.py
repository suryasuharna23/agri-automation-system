from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict


class SettingsError(RuntimeError):
    """Raised when required runtime settings are unsafe or invalid."""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://agri_user:agri_pass@localhost:5432/agri_db"
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days for dev convenience
    refresh_token_expire_days: int = 7

    mqtt_broker_host: str = "localhost"
    mqtt_broker_port: int = 1883
    mqtt_username: str = "agri_iot"
    mqtt_password: str = "iot_password"
    mqtt_topic_prefix: str = "agri/sensor"

    ai_service_url: str = "http://localhost:8001"
    commodity_price_api_url: str = "https://api.hargapangan.id"

    firebase_credentials_path: str = "./firebase-credentials.json"

    payment_gateway_api_key: str = ""
    payment_gateway_url: str = ""

    def validate_startup(self) -> None:
        errors: list[str] = []

        if not self.database_url:
            errors.append("DATABASE_URL is required")

        if not self.secret_key or self.secret_key == "change-me":
            errors.append("SECRET_KEY must be set to a non-placeholder value")

        if self.algorithm != "HS256":
            errors.append("ALGORITHM must be HS256")

        for name, value in {
            "AI_SERVICE_URL": self.ai_service_url,
            "COMMODITY_PRICE_API_URL": self.commodity_price_api_url,
        }.items():
            parsed = urlparse(value)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                errors.append(f"{name} must be a valid http(s) URL")

        if errors:
            raise SettingsError("Invalid settings: " + "; ".join(errors))


settings = Settings()
