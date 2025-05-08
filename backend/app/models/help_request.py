from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from .task import Task  # 직접 클래스 임포트
from .user import User  # 직접 클래스 임포트

class HelpRequest(Base):
    __tablename__ = "help_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String, nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # 직접 클래스 참조로 변경
    task = relationship(Task, back_populates="help_requests")
    student = relationship(User, foreign_keys=[user_id], back_populates="help_requests_student")
    teacher = relationship(User, foreign_keys=[resolved_by], back_populates="help_requests_teacher")