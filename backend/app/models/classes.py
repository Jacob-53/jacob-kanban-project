# app/models/classes.py - Task relationship 추가
from sqlalchemy import Column, Integer, String, TIMESTAMP, func
from sqlalchemy.orm import relationship
from app.database import Base

class Class(Base):
    __tablename__ = "classes"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(50), unique=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # 기존 관계
    students   = relationship("User", back_populates="class_")
    
    # ✅ 새로 추가: Task와의 관계
    tasks      = relationship("Task", back_populates="class_")