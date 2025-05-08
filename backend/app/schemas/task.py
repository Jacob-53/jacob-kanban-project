# app/schemas/task.py
from pydantic import BaseModel
from typing import Optional

# 공통 필드 정의 (status 필드를 완전히 제거)
class TaskBase(BaseModel):
    title: str
    # status 필드를 제거하고 stage로 대체
    stage: Optional[str] = "todo"
    description: Optional[str] = None
    expected_time: Optional[int] = 0

# 요청용 모델
class TaskCreate(TaskBase):
    user_id: int

# 업데이트용 모델
class TaskUpdate(BaseModel):  # TaskBase 상속 제거
    title: Optional[str] = None
    stage: Optional[str] = None
    description: Optional[str] = None
    expected_time: Optional[int] = None

# 응답용 모델
class TaskSchema(TaskBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True  # orm_mode 대체 (Pydantic v2)