from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from .task import Task, TaskStage  # 직접 클래스 임포트
from .user import User  # 직접 클래스 임포트

class TaskHistory(Base):
    __tablename__ = "task_histories"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    previous_stage = Column(Enum(TaskStage), nullable=True)
    new_stage = Column(Enum(TaskStage))
    changed_at = Column(DateTime, default=datetime.utcnow)
    time_spent = Column(Integer, nullable=True)
    
    # 직접 클래스 참조로 변경
    task = relationship(Task, back_populates="task_histories")
    user = relationship(User, back_populates="task_histories")