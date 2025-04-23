from pydantic import BaseModel

class TaskBase(BaseModel):
    title: str
    status: str = "TODO"

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True


class UserBase(BaseModel):
    username: str
    is_teacher: bool = False

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    tasks: list[Task] = []

    class Config:
        orm_mode = True
