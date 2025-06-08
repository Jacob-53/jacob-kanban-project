# backend/app/schemas/classes.py
from datetime import datetime
from pydantic import BaseModel

class ClassCreate(BaseModel):
    name: str

class ClassRead(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
