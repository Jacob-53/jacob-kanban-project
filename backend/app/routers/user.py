from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app import schemas, crud, database

router = APIRouter()


@router.post("/users/", response_model=schemas.User)
def create_user(
    user: schemas.UserCreate = Body(...),
    db: Session = Depends(database.get_db)
):
    return crud.create_user(db=db, user=user)


@router.get("/users/", response_model=list[schemas.User])
def read_users(db: Session = Depends(database.get_db)):
    return crud.get_users(db)

