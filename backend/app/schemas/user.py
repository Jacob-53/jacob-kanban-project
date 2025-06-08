from pydantic import BaseModel, EmailStr
from typing import Optional, List

# Task schemas
class TaskBase(BaseModel):
    title: str
    status: str = "TODO"

class TaskRead(TaskBase):
    id: int
    user_id: int

    model_config = {"from_attributes": True}

# User schemas
class UserBase(BaseModel):
    username: str
    is_teacher: bool = False

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    is_teacher: bool = False
    class_id: Optional[int] = None

class UserUpdate(UserBase):
    email: Optional[EmailStr] = None
    class_id: Optional[int] = None

class UserRead(UserBase):
    id: int
    email: Optional[EmailStr] = None
    class_id: Optional[int] = None
    tasks: List[TaskRead] = []

    model_config = {"from_attributes": True}
