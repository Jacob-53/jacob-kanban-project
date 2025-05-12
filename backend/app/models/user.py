# app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, nullable=True)
    hashed_password = Column(String)
    is_teacher = Column(Boolean, default=False)
    
    # 문자열 참조로 유지 (fully-qualified path 사용)
    tasks = relationship("app.models.task.Task", back_populates="user")
    
    # 다른 relationship들도 필요시 동일하게
    help_requests_student = relationship("app.models.help_request.HelpRequest", foreign_keys="app.models.help_request.HelpRequest.user_id", back_populates="student")
    help_requests_teacher = relationship("app.models.help_request.HelpRequest", foreign_keys="app.models.help_request.HelpRequest.resolved_by", back_populates="teacher")
    task_histories = relationship("app.models.task_history.TaskHistory", back_populates="user")


