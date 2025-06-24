# ✅ Dockerfile (backend/Dockerfile)
FROM python:3.12-slim

# 필수 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /app

# pdm 설치
RUN pip install pdm

# 가상환경 설정
ENV PDM_IGNORE_SAVED_PYTHON=1
RUN pdm config python.use_venv true

# 의존성 복사 및 설치
COPY pyproject.toml pdm.lock ./
RUN pdm install

# 전체 코드 복사
COPY . .

# 서버 실행
CMD ["pdm", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

