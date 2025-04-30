from fastapi import FastAPI
from app.database import Base, engine  # DB 베이스와 엔진 로딩
from app.routers import user, task    # 유저/태스크 라우터 임포트

# 모든 테이블 생성 (models에서 정의한 Base 클래스 기준)
Base.metadata.create_all(bind=engine)

# FastAPI 인스턴스 생성
app = FastAPI()

# 라우터 등록
app.include_router(user.router)  # /users/ 관련 라우팅
app.include_router(task.router)  # /tasks/ 관련 라우팅

# 루트 경로 응답 (테스트용)
@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}


