# app/models/help_request.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from .task import Task  # 직접 클래스 임포트
from .user import User  # 직접 클래스 임포트

class HelpRequest(Base):
    __tablename__ = "help_requests"
    __table_args__ = {'extend_existing': True}  # 충돌 방지를 위해 추가
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String, nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_message = Column(String, nullable=True)  # 새로 추가된 필드
    
    # 직접 클래스 참조로 변경
    task = relationship(Task, back_populates="help_requests")
    student = relationship(User, foreign_keys=[user_id], back_populates="help_requests_student")
    teacher = relationship(User, foreign_keys=[resolved_by], back_populates="help_requests_teacher")