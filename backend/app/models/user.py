# app/models/user.py - Task relationship 수정
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, nullable=True)
    hashed_password = Column(String)
    is_teacher = Column(Boolean, default=False)
    
    # ✅ 수정: Task relationship - 실제 파일 구조에 맞게
    tasks = relationship("Task", back_populates="user")
    
    # 다른 relationship들 (기존 유지)
    help_requests_student = relationship("app.models.help_request.HelpRequest", foreign_keys="app.models.help_request.HelpRequest.user_id", back_populates="student")
    help_requests_teacher = relationship("app.models.help_request.HelpRequest", foreign_keys="app.models.help_request.HelpRequest.resolved_by", back_populates="teacher")
    task_histories = relationship("app.models.task_history.TaskHistory", back_populates="user")

    # 반(class) FK (기존 유지 - 잘 되어 있음)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    class_   = relationship("Class", back_populates="students")