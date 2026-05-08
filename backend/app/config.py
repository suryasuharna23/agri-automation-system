from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://agri_user:agri_pass@localhost:5432/agri_db"
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
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


settings = Settings()
