# app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import relationship
from app.database import Base
import enum

# ✅ Python enum (타입 힌트용)
class UserRole(str, enum.Enum):
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
    
    # ✅ 기존 PostgreSQL enum 직접 참조
    role = Column(
        ENUM('admin', 'teacher', 'student', name='userrole', create_type=False),
        default='student',
        nullable=False
    )
    
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
    
    # 편의 메서드들 (문자열 비교)
    @property
    def is_admin(self) -> bool:
        return self.role == "admin"
    
    @property
    def is_teacher_role(self) -> bool:
        return self.role == "teacher"
    
    @property
    def is_student_role(self) -> bool:
        return self.role == "student"