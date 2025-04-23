from fastapi import FastAPI
from app.database import Base, engine
from app.models import User, Task
from app.routers import user

Base.metadata.create_all(bind=engine)
app = FastAPI()
app.include_router(user.router)

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

