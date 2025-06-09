# app/models/help_request.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class HelpRequest(Base):
    __tablename__ = "help_requests"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(Text, nullable=True)  # String → Text로 변경 (긴 메시지 지원)
    requested_at = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_message = Column(Text, nullable=True)  # String → Text로 변경
    
    # 순환 참조 방지를 위해 문자열 참조 사용
    task = relationship("Task", back_populates="help_requests")
    student = relationship("User", foreign_keys=[user_id], back_populates="help_requests_student")
    teacher = relationship("User", foreign_keys=[resolved_by], back_populates="help_requests_teacher")