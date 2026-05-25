import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    phone: str | None = None
    role: UserRole = UserRole.FARMER

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    bank_account: str | None = None
    bank_name: str | None = None
    fcm_token: str | None = None


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    full_name: str
    phone: str | None
    role: UserRole
    is_active: bool
    bank_account: str | None
    bank_name: str | None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


def _normalize_email(value: str) -> str:
    normalized = value.strip().lower()
    local, separator, domain = normalized.partition("@")
    if not separator or not local or "." not in domain or domain.startswith(".") or domain.endswith("."):
        raise ValueError("Email tidak valid.")
    return normalized
