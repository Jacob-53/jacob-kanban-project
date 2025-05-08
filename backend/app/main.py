# app/main.py
from fastapi import FastAPI, Header
from app.database import Base, engine  # DB 베이스와 엔진 로딩
from app.routers import user, task, auth  # 유저/태스크/인증 라우터 임포트
from app.utils.security import SECRET_KEY, ALGORITHM  # 추가: 보안 관련 설정 임포트
from jose import jwt  # 추가: jwt 모듈 임포트

# 모든 테이블 생성 (models에서 정의한 Base 클래스 기준)
Base.metadata.create_all(bind=engine)

# FastAPI 인스턴스 생성
app = FastAPI()

# 라우터 등록 
app.include_router(user.router)  # /users/ 관련 라우팅
app.include_router(task.router)  # /tasks/ 관련 라우팅
app.include_router(auth.router)  # /auth/ 관련 라우팅 (prefix가 router에 있는지 확인)

# 루트 경로 응답 (테스트용)
@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

# 추가: 토큰 디버깅 엔드포인트
@app.get("/debug-token")
async def debug_token(authorization: str | None = Header(None)):
    if not authorization:
        return {"error": "No Authorization header"}
    if not authorization.startswith("Bearer "):
        return {"error": "Invalid Authorization format"}
    
    token = authorization.replace("Bearer ", "")
    
    try:
        print(f"▶ [DEBUG] SECRET_KEY starts with: {SECRET_KEY[:5] if SECRET_KEY else 'None'}")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "success": True, 
            "payload": payload,
            "secret_key_start": SECRET_KEY[:5] if SECRET_KEY else None,
            "algorithm": ALGORITHM
        }
    except Exception as e:
        return {
            "error": str(e), 
            "token_part": token[:10] + "...",
            "secret_key_start": SECRET_KEY[:5] if SECRET_KEY else None,
            "algorithm": ALGORITHM
        }