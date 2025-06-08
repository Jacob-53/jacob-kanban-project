from fastapi import FastAPI
from sqlalchemy import text
from app.database import engine
from app.routers import user, task, auth, stage, time_tracking, help_request, websocket
from app.utils.background_tasks import start_background_tasks
from fastapi.middleware.cors import CORSMiddleware
from app.routers import classes
from app.routers.classes import router as classes_router
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parents[1] / ".env"
load_dotenv(env_path)
# FastAPI 앱 생성
app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 구체적인 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터베이스 초기화 함수
def init_db():
    try:
        with engine.connect() as conn:
            # 테이블 생성
            tables = [
                """
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR NOT NULL,
                    email VARCHAR,
                    hashed_password VARCHAR NOT NULL,
                    is_teacher BOOLEAN DEFAULT FALSE
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR NOT NULL,
                    description VARCHAR,
                    user_id INTEGER REFERENCES users(id),
                    stage VARCHAR DEFAULT 'todo',
                    expected_time INTEGER DEFAULT 0,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    current_stage_started_at TIMESTAMP,
                    help_needed BOOLEAN DEFAULT FALSE,
                    help_requested_at TIMESTAMP,
                    help_message VARCHAR,
                    is_delayed BOOLEAN DEFAULT FALSE
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS stage_configs (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER REFERENCES tasks(id),
                    stage VARCHAR NOT NULL,
                    expected_time INTEGER NOT NULL,
                    description VARCHAR,
                    "order" INTEGER NOT NULL
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS task_histories (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER REFERENCES tasks(id),
                    user_id INTEGER REFERENCES users(id),
                    previous_stage VARCHAR,
                    new_stage VARCHAR NOT NULL,
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    time_spent INTEGER,
                    comment VARCHAR
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS help_requests (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER REFERENCES tasks(id),
                    user_id INTEGER REFERENCES users(id),
                    message VARCHAR,
                    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved BOOLEAN DEFAULT FALSE,
                    resolved_at TIMESTAMP,
                    resolved_by INTEGER REFERENCES users(id),
                    resolution_message VARCHAR
                )
                """,
                """
                CREATE TABLE IF NOT EXISTS classes (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50) NOT NULL UNIQUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
                """
            ]
            for stmt in tables:
                try:
                    conn.execute(text(stmt))
                except Exception as e:
                    print(f"테이블 생성 중 오류 (무시 가능): {e}")

            # 컬럼 추가 (IF NOT EXISTS)
            alters = [
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT FROM information_schema.columns
                         WHERE table_name='users' AND column_name='class_id'
                    ) THEN
                        ALTER TABLE users
                          ADD COLUMN class_id INTEGER
                          REFERENCES classes(id)
                          ON DELETE SET NULL;
                    END IF;
                END $$;
                """
            ]
            for stmt in alters:
                try:
                    conn.execute(text(stmt))
                except Exception as e:
                    print(f"컬럼 추가 중 오류 (무시 가능): {e}")

            # 인덱스 생성 (옵션)
            indexes = [
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_indexes WHERE indexname='ix_tasks_title'
                    ) THEN
                        CREATE INDEX ix_tasks_title ON tasks(title);
                    END IF;
                END $$;
                """
            ]
            for stmt in indexes:
                try:
                    conn.execute(text(stmt))
                except Exception as e:
                    print(f"인덱스 생성 중 오류 (무시 가능): {e}")

            conn.commit()
        print("데이터베이스 초기화 완료")
    except Exception as e:
        print(f"데이터베이스 초기화 중 오류 발생: {e}")

# 앱 시작 시 DB 초기화
init_db()

# 라우터 등록
app.include_router(user.router)
app.include_router(task.router)
app.include_router(auth.router)
app.include_router(stage.router)
app.include_router(time_tracking.router)
app.include_router(help_request.router)
app.include_router(websocket.router)
app.include_router(classes.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

# 백그라운드 태스크 실행
@app.on_event("startup")
def startup_event():
    start_background_tasks()
