from pydantic import BaseModel

# 공통 필드 정의
class TaskBase(BaseModel):
    title: str
    status: str = "TODO"

# 요청용 모델
class TaskCreate(TaskBase):
    user_id: int

# 업데이트용 모델
class TaskUpdate(TaskBase):
    pass

# 응답용 모델
class Task(TaskBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True  # orm_mode 대체 (Pydantic v2)

