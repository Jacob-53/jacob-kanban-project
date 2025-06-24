# app/schemas/task.py - class_id 필드 추가
from pydantic import BaseModel
from typing import Optional
from app.models.task import TaskStage  # 추가: TaskStage Enum import

# 공통 필드 정의
class TaskBase(BaseModel):
    title: str
    stage: Optional[TaskStage] = TaskStage.TODO  # str → TaskStage로 변경
    description: Optional[str] = None
    expected_time: Optional[int] = 0

# 요청용 모델
class TaskCreate(TaskBase):
    user_id: Optional[int] = None  # Required → Optional로 변경
    # ✅ 새로 추가: 클래스 관련 필드
    class_id: Optional[int] = None
    is_class_task: Optional[bool] = False

# 업데이트용 모델
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    stage: Optional[TaskStage] = None  # str → TaskStage로 변경
    description: Optional[str] = None
    expected_time: Optional[int] = None
    # ✅ 새로 추가: 클래스 관련 필드 수정 가능
    class_id: Optional[int] = None
    is_class_task: Optional[bool] = None

# 응답용 모델
class TaskSchema(TaskBase):
    id: int
    user_id: int
    # ✅ 새로 추가: 클래스 정보 포함
    class_id: Optional[int] = None
    is_class_task: Optional[bool] = False

    class Config:
        from_attributes = True  # orm_mode 대체 (Pydantic v2)

# ✅ 새로 추가: 반별 Task 생성용 스키마
class ClassTaskCreate(BaseModel):
    """반 전체에 배정할 Task 생성용 스키마"""
    title: str
    description: Optional[str] = None
    stage: Optional[TaskStage] = TaskStage.TODO  # str → TaskStage로 변경
    expected_time: Optional[int] = 0
    class_id: int  # 필수: 어느 반에 배정할지