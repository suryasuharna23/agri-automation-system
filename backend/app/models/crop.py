import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, Float, Integer, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class CropGrade(str, PyEnum):
    A = "A"
    B = "B"
    C = "C"
    UNGRADED = "ungraded"


class Crop(Base):
    __tablename__ = "crops"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farmer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    variety: Mapped[str | None] = mapped_column(String(255))
    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    grade: Mapped[CropGrade] = mapped_column(Enum(CropGrade), default=CropGrade.UNGRADED)
    grade_confidence: Mapped[float | None] = mapped_column(Float)
    image_url: Mapped[str | None] = mapped_column(String(512))
    description: Mapped[str | None] = mapped_column(Text)
    is_available: Mapped[bool] = mapped_column(default=True)
    harvest_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    farmer = relationship("User", back_populates="crops")
    traceability_logs = relationship("TraceabilityLog", back_populates="crop")


class DiagnosisRecord(Base):
    __tablename__ = "diagnosis_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farmer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    image_url: Mapped[str] = mapped_column(String(512), nullable=False)
    disease_name: Mapped[str | None] = mapped_column(String(255))
    confidence: Mapped[float | None] = mapped_column(Float)
    recommendation: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TraceabilityLog(Base):
    __tablename__ = "traceability_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    crop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("crops.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    event_data: Mapped[str | None] = mapped_column(Text)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    crop = relationship("Crop", back_populates="traceability_logs")
