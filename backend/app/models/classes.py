# backend/app/models/class.py
from sqlalchemy import Column, Integer, String, TIMESTAMP, func
from sqlalchemy.orm import relationship
from app.database import Base

class Class(Base):
    __tablename__ = "classes"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(50), unique=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # User 모델에서 back_populates로 연결
    students   = relationship("User", back_populates="class_")
