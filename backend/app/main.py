#backend/main.py (수정됨)
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parents[1] / ".env"  # ← 가장 먼저
load_dotenv(env_path)

from fastapi import FastAPI
from sqlalchemy import text
from app.database import engine
from app.routers import user, task, auth, stage, time_tracking, help_request, websocket
from app.utils.background_tasks import start_background_tasks
from fastapi.middleware.cors import CORSMiddleware
from app.routers import classes
from app.routers.classes import router as classes_router
from app.routers import admin

# FastAPI 앱 생성
app = FastAPI()

# CORS 설정
app.add_middleware(
   CORSMiddleware,
   allow_origins=["http://localhost:3000"],  # 프로덕션에서는 구체적인 도메인으로 제한
   allow_credentials=True,
   allow_methods=["*"],
   allow_headers=["*"],
)

# 데이터베이스 초기화 함수 (기존 코드 그대로 유지)
def init_db():
   try:
       with engine.connect() as conn:
           # ✅ 1. 테이블 생성 (CHECK 제약조건 포함)
           tables = [
               """
               CREATE TABLE IF NOT EXISTS classes (
                   id SERIAL PRIMARY KEY,
                   name VARCHAR(50) NOT NULL UNIQUE,
                   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
               )
               """,
               """
               CREATE TABLE IF NOT EXISTS users (
                   id SERIAL PRIMARY KEY,
                   username VARCHAR NOT NULL UNIQUE,
                   email VARCHAR,
                   hashed_password VARCHAR NOT NULL,
                   is_teacher BOOLEAN DEFAULT FALSE,
                   role VARCHAR DEFAULT 'student' NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
                   class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL
               )
               """,
               """
               CREATE TABLE IF NOT EXISTS tasks (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR NOT NULL,
                    description VARCHAR,
                    user_id INTEGER REFERENCES users(id),
                    stage VARCHAR DEFAULT 'todo' CHECK (stage IN ('todo', 'TODO', 'requirements', 'REQUIREMENTS', 'design', 'DESIGN', 'implementation', 'IMPLEMENTATION', 'testing', 'TESTING', 'review', 'REVIEW', 'done', 'DONE')),
                    expected_time INTEGER DEFAULT 0,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    current_stage_started_at TIMESTAMP,
                    help_needed BOOLEAN DEFAULT FALSE,
                    help_requested_at TIMESTAMP,
                    help_message VARCHAR,
                    is_delayed BOOLEAN DEFAULT FALSE,
                    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
                    is_class_task BOOLEAN DEFAULT FALSE
                )
               """,
               """
               CREATE TABLE IF NOT EXISTS stage_configs (
                   id SERIAL PRIMARY KEY,
                   task_id INTEGER REFERENCES tasks(id),
                   stage VARCHAR NOT NULL CHECK (stage IN ('todo', 'requirements', 'design', 'implementation', 'testing', 'review', 'done')),
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
                   previous_stage VARCHAR CHECK (previous_stage IS NULL OR previous_stage IN ('todo', 'requirements', 'design', 'implementation', 'testing', 'review', 'done')),
                   new_stage VARCHAR NOT NULL CHECK (new_stage IN ('todo', 'requirements', 'design', 'implementation', 'testing', 'review', 'done')),
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
               """
           ]
           
           for stmt in tables:
               try:
                   conn.execute(text(stmt))
                   print("✅ 테이블 생성 완료")
               except Exception as e:
                   print(f"테이블 생성 중 오류 (무시 가능): {e}")

           # ✅ 2. 기존 테이블에 CHECK 제약조건 추가 (이미 테이블이 있는 경우 대비)
           constraints = [
               """
               DO $$
               BEGIN
                   -- users 테이블 role CHECK 제약조건
                   IF NOT EXISTS (
                       SELECT 1 FROM pg_constraint 
                       WHERE conname = 'users_role_check'
                   ) THEN
                       ALTER TABLE users ADD CONSTRAINT users_role_check 
                       CHECK (role IN ('admin', 'teacher', 'student'));
                   END IF;
                   
                   -- tasks 테이블 stage CHECK 제약조건
                   IF NOT EXISTS (
                       SELECT 1 FROM pg_constraint 
                       WHERE conname = 'tasks_stage_check'
                   ) THEN
                       ALTER TABLE tasks ADD CONSTRAINT tasks_stage_check 
                       CHECK (stage IN ('todo', 'requirements', 'design', 'implementation', 'testing', 'review', 'done'));
                   END IF;
                   
               EXCEPTION
                   WHEN others THEN
                       -- 오류 발생 시 무시 (이미 제약조건이 있거나 테이블 생성 시 포함된 경우)
                       NULL;
               END $$;
               """
           ]
           
           for stmt in constraints:
               try:
                   conn.execute(text(stmt))
                   print("✅ CHECK 제약조건 추가 완료")
               except Exception as e:
                   print(f"제약조건 추가 중 오류 (무시 가능): {e}")

           # ✅ 3. 인덱스 생성
           indexes = [
               """
               DO $$
               BEGIN
                   IF NOT EXISTS (
                       SELECT 1 FROM pg_indexes WHERE indexname='ix_tasks_title'
                   ) THEN
                       CREATE INDEX ix_tasks_title ON tasks(title);
                   END IF;
                   
                   IF NOT EXISTS (
                       SELECT 1 FROM pg_indexes WHERE indexname='ix_users_username'
                   ) THEN
                       CREATE INDEX ix_users_username ON users(username);
                   END IF;
                   
                   IF NOT EXISTS (
                       SELECT 1 FROM pg_indexes WHERE indexname='ix_users_role'
                   ) THEN
                       CREATE INDEX ix_users_role ON users(role);
                   END IF;
                   
                   IF NOT EXISTS (
                       SELECT 1 FROM pg_indexes WHERE indexname='ix_tasks_stage'
                   ) THEN
                       CREATE INDEX ix_tasks_stage ON tasks(stage);
                   END IF;
                   
                   IF NOT EXISTS (
                       SELECT 1 FROM pg_indexes WHERE indexname='ix_tasks_user_id'
                   ) THEN
                       CREATE INDEX ix_tasks_user_id ON tasks(user_id);
                   END IF;
               END $$;
               """
           ]
           
           for stmt in indexes:
               try:
                   conn.execute(text(stmt))
                   print("✅ 인덱스 생성 완료")
               except Exception as e:
                   print(f"인덱스 생성 중 오류 (무시 가능): {e}")

           conn.commit()
       print("✅ 데이터베이스 초기화 완료")
   except Exception as e:
       print(f"❌ 데이터베이스 초기화 중 오류 발생: {e}")

# 앱 시작 시 DB 초기화
init_db()

# ================================
# 라우터 등록 (수정됨)
# ================================

print("🔧 라우터 등록 시작...")

# ✅ WebSocket 라우터를 가장 먼저 등록 (중복 제거)
print("📡 WebSocket 라우터 등록 중...")
app.include_router(websocket.router, tags=["websocket"])
print("✅ WebSocket 라우터 등록 완료")

# 나머지 라우터들 등록 (prefix 추가)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(user.router, prefix="/users", tags=["users"])  
app.include_router(task.router, prefix="/tasks", tags=["tasks"])
app.include_router(stage.router, prefix="/stages", tags=["stages"])
app.include_router(time_tracking.router, prefix="/time-tracking", tags=["time-tracking"])
app.include_router(help_request.router, prefix="/help-requests", tags=["help-requests"])
app.include_router(classes.router, prefix="/classes", tags=["classes"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])

print("✅ 모든 라우터 등록 완료")

@app.get("/health")
def health_check():
   return {"status": "ok"}

# 백그라운드 태스크 실행
@app.on_event("startup")
def startup_event():
   print("🚀 서버 시작됨")
   print("📋 등록된 WebSocket 라우트 확인:")
   for route in app.routes:
       if hasattr(route, 'path') and '/ws' in route.path:
           print(f"  🔌 WebSocket: {route.path}")
   print("=" * 50)
   start_background_tasks()