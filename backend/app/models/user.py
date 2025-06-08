# app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

# ✅ Python enum (타입 힌트용으로만 사용)
class UserRole:
    STUDENT = "student"
    TEACHER = "teacher" 
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, nullable=True)
    hashed_password = Column(String)
    is_teacher = Column(Boolean, default=False)
    
    # ✅ 단순 String 컬럼 (데이터베이스 실제 상태에 맞춤)
    role = Column(String, default="student", nullable=False)
    
    # 반(class) FK
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    tasks = relationship("Task", back_populates="user")
    help_requests_student = relationship("app.models.help_request.HelpRequest", 
                                       foreign_keys="app.models.help_request.HelpRequest.user_id", 
                                       back_populates="student")
    help_requests_teacher = relationship("app.models.help_request.HelpRequest", 
                                       foreign_keys="app.models.help_request.HelpRequest.resolved_by", 
                                       back_populates="teacher")
    task_histories = relationship("app.models.task_history.TaskHistory", back_populates="user")
    class_ = relationship("Class", back_populates="students")
    
    # 편의 메서드들
    @property
    def is_admin(self) -> bool:
        return self.role == "admin"
    
    @property
    def is_teacher_role(self) -> bool:
        return self.role == "teacher"
    
    @property
    def is_student_role(self) -> bool:
        return self.role == "student"