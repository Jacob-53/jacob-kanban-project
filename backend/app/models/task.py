# app/models/task.py
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.database import Base
from app.models.user import User  # 직접 임포트 가능

# Task 단계를 표현하는 Enum 클래스
class TaskStage(str, enum.Enum):
    TODO = "todo"
    REQUIREMENTS = "requirements"
    DESIGN = "design"
    IMPLEMENTATION = "implementation"
    TESTING = "testing"
    REVIEW = "review"
    DONE = "done"

class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True)
    title = Column(String)
    description = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # 추가된 필드들
    stage = Column(Enum(TaskStage), default=TaskStage.TODO, nullable=True)
    expected_time = Column(Integer, default=0, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    current_stage_started_at = Column(DateTime, nullable=True)
    help_needed = Column(Boolean, default=False, nullable=True)
    help_requested_at = Column(DateTime, nullable=True)
    help_message = Column(String, nullable=True)
    is_delayed = Column(Boolean, default=False, nullable=True)
    
    # 직접 클래스 참조 사용
    user = relationship(User, back_populates="tasks")
    
    # 다른 relationship들
    stage_configs = relationship("app.models.stage_config.StageConfig", back_populates="task")
    task_histories = relationship("app.models.task_history.TaskHistory", back_populates="task")
    help_requests = relationship("app.models.help_request.HelpRequest", back_populates="task")