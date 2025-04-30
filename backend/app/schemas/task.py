from pydantic import BaseModel


class TaskBase(BaseModel):
    title: str
    status: str = "TODO"


class TaskCreate(TaskBase):
    user_id: int


class TaskUpdate(TaskBase):
    pass


class Task(TaskBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True  # Pydantic v2
