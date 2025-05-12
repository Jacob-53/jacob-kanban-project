from pydantic import BaseModel
from typing import List

class TaskBase(BaseModel):
    title: str
    status: str = "TODO"

class Task(TaskBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str
    is_teacher: bool = False

class UserCreate(UserBase):
    password: str      # ← 추가 JWT

class UserUpdate(UserBase):
    pass

class User(UserBase):
    id: int
    tasks: List[Task] = []

    class Config:
        from_attributes = True


