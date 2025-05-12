from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
from .task import Task, TaskStage  # 직접 클래스 임포트

class StageConfig(Base):
    __tablename__ = "stage_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    stage = Column(Enum(TaskStage))
    expected_time = Column(Integer)
    description = Column(String, nullable=True)
    order = Column(Integer)
    
    # 직접 클래스 참조로 변경
    task = relationship(Task, back_populates="stage_configs")