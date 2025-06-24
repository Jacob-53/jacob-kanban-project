from pydantic import BaseModel

# 토큰 응답 모델
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# 토큰 안에 들어가는 데이터
class TokenData(BaseModel):
    username: str | None = None