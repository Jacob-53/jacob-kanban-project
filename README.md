
# 🎯 Jacob Kanban - 교육용 실시간 칸반 보드

> 교육 현장에서 학생들의 태스크 진행 상황을 실시간으로 모니터링하고 관리할 수 있는 스마트 학습 관리 시스템

## 📖 프로젝트 소개

Jacob Kanban은 개발자 부트캠프나 프로그래밍 수업에서 **학생들의 과업 진행 상황을 실시간으로 추적하고 관리**할 수 있도록 설계된 교육용 칸반 보드 시스템입니다.

### 🎓 해결하는 교육 문제

- **교사**: 동시에 여러 명의 학생 상태를 실시간으로 파악하기 어려움
- **학생**: 몰입 중에 진행 상황을 인지하지 못하거나 도움 요청을 망설임
- **시간 관리**: 과업별 예상 시간 설정이 지켜지지 않음

### ✨ 핵심 기능

- 📊 **실시간 진행 상황 모니터링**: 교사가 학생들의 학습 진행도를 즉시 파악
- ⏰ **자동 지연 감지**: 예상 시간 초과 시 시각적 표시 및 알림
- 🆘 **원클릭 도움 요청**: 학생이 부담 없이 도움을 요청할 수 있는 시스템
- 📈 **데이터 기반 분석**: 학습 통계를 통한 교육 효과 분석

## 🛠 기술 스택

### Backend

- **FastAPI** 
- **PostgreSQL**
- **WebSocket** 
- **JWT**
- **Docker** 

### Frontend

- **Next.js 14**
- **TypeScript**
- **Tailwind CSS**
- **Zustand**

## 🚀 빠른 시작

### 필수 요구사항

- **Docker** 및 **Docker Compose**
- **Node.js 18+** (프론트엔드 개발용)
- **Git**

### 1. 프로젝트 클론

```bash
git clone https://github.com/Jacob-53/jacob-kanban-project
cd jacob-kanban-project
```

### 2. 백엔드 실행 (Docker)

```bash
cd backend
docker-compose up -d

# 로그 확인
docker-compose logs -f backend
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

### 4. 접속 확인

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

## 🎮 사용 방법

### 📋 기본 계정 정보

개발 및 테스트를 위한 기본 계정들이 미리 생성되어 있습니다:

```bash
# 관리자 계정 (교사 승인, 시스템 관리)
Username: admin
Password: 1234

# 교사 계정 (학생 모니터링, 도움 요청 처리)
Username: tom
Password: 1234

# 학생 계정 (태스크 관리, 도움 요청)
Username: student3
Password: 1234
```

### 👨‍🏫 교사용 기능

#### 1. 통계 대시보드 (`/statistics`)

- 반 전체 학생의 학습 현황 실시간 모니터링
- 지연된 태스크 즉시 식별
- 학생별 완료율 및 진행 상황 분석

#### 2. 학생 관리 (`/students`)

- 개별 학생의 태스크 진행 상황 상세 보기
- 학생별 맞춤형 과제 할당
- 문제 상황 학생 즉시 파악

#### 3. 도움 요청 관리 (`/help-requests`)

- 학생들의 도움 요청 실시간 접수
- 요청 내용 확인 및 해결 처리
- 해결 과정 기록 및 추적

### 👨‍🎓 학생용 기능

#### 1. 개인 칸반 보드 (`/tasks`)

- 7단계 워크플로우로 태스크 진행 관리
    - Todo → 요구사항 파악 → 설계 → 구현 → 테스트 → 검토 → 완료
- 드래그 앤 드롭으로 간편한 단계 이동
- 실시간 소요 시간 추적

#### 2. 도움 요청

- 어려움을 겪을 때 원클릭으로 도움 요청
- 요청 상태 실시간 확인
- 해결 과정 및 결과 확인

### 👨‍💼 관리자용 기능

#### 1. 교사 승인 시스템 ✅

- 교사 회원가입 신청 승인/거부 처리
- 승인 대기 교사 목록 관리
- 교사 권한 부여 및 관리
#### 2. 사용자 관리 

- 전체 사용자 목록 및 상태 관리
- 사용자 생성,정보 수정 기능 
- 사용자 역할 변경 (학생 ↔ 교사)
- 반 배정 및 관리
- 사용자 계정 활성화/비활성화

#### 3. 시스템 통계 📊 

- 전체 시스템 사용 현황
- 사용자별/반별 도움 요청 현황 분석

## 📊 주요 화면
### 교사 통계보드

<img width="1708" alt="스크린샷 2025-06-23 23 47 03" src="https://github.com/user-attachments/assets/b4b8ce40-b8af-4189-91d0-dcc479604dbd" />


### 학생 칸반 보드

<img width="1708" alt="스크린샷 2025-06-23 23 47 37" src="https://github.com/user-attachments/assets/6caae84d-4462-4f2b-9962-f8bd0adfa037" />


### 교사 도움 확인 페이지
<img width="1708" alt="스크린샷 2025-06-23 23 56 53" src="https://github.com/user-attachments/assets/99246f7f-59e2-45d5-a0b1-90f4d86b73de" />
<img width="1708" alt="스크린샷 2025-06-23 23 56 40" src="https://github.com/user-attachments/assets/f99bcd6d-196c-4091-8cf4-4026e1e695b7" />

### 관리자 대시보드

<img width="1708" alt="스크린샷 2025-06-10 14 12 45" src="https://github.com/user-attachments/assets/311c5e27-8f43-4119-8eb0-a8e6d2247a19" />


### 관리자 반생성 

<img width="1708" alt="스크린샷 2025-06-24 00 06 29" src="https://github.com/user-attachments/assets/38eb57ce-0a11-4716-906b-af8941ff8373" />


### 사용자 ,교사 관리 페이지
<img width="1708" alt="스크린샷 2025-06-23 23 53 22" src="https://github.com/user-attachments/assets/fc864864-6565-49b5-8858-d1576faa8d96" />
<img width="1708" alt="스크린샷 2025-06-24 00 07 47" src="https://github.com/user-attachments/assets/5c7e7660-b319-4617-a0e8-81f7ee46c960" />




## 📱 API 문서

### 인증

```http
POST /auth/token
Content-Type: application/x-www-form-urlencoded

username=student1&password=student123
```

### 태스크 관리

```http
# 태스크 목록 조회
GET /tasks/
Authorization: Bearer {token}

# 태스크 단계 이동  
PUT /tasks/{id}/stage
Authorization: Bearer {token}
Content-Type: application/json

{
  "stage": "implementation",
  "comment": "구현 단계 시작"
}
```

### 도움 요청

```http
# 도움 요청 생성
POST /help-requests/
Authorization: Bearer {token}
Content-Type: application/json

{
  "task_id": 1,
  "message": "이 부분이 이해가 안됩니다"
}
```

### 관리자 전용 API

```http
# 승인 대기 교사 목록
GET /admin/teachers/pending
Authorization: Bearer {admin_token}

# 교사 승인 처리
POST /admin/teachers/{teacher_id}/approve
Authorization: Bearer {admin_token}

# 사용자 역할 변경
PUT /admin/users/{user_id}/role
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "role": "teacher"
}

# 사용자 반 배정
PUT /admin/users/{user_id}/assign-class?class_id=1
Authorization: Bearer {admin_token}
```

### WebSocket 연결

```javascript
const socket = io('http://localhost:8000');

// 실시간 이벤트 수신
socket.on('task_update', (data) => {
  console.log('태스크 업데이트:', data);
});

socket.on('help_request', (data) => {
  console.log('도움 요청:', data);
});
```

## 🏗 프로젝트 구조

```
jacob-kanban/
├── backend/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── routers/         # API 라우터
│   │   ├── models/          # 데이터베이스 모델
│   │   ├── schemas/         # Pydantic 스키마
│   │   ├── crud/            # 데이터베이스 작업
│   │   └── utils/           # 유틸리티 함수
│   ├── docker-compose.yml   # Docker 설정
│   └── requirements.txt     # Python 의존성
├── frontend/                # Next.js 프론트엔드  
│   ├── src/
│   │   ├── app/             # 페이지 라우트
│   │   ├── components/      # React 컴포넌트
│   │   ├── store/           # Zustand 상태 관리
│   │   ├── lib/             # 라이브러리 설정
│   │   └── types/           # TypeScript 타입
│   ├── package.json         # Node.js 의존성
│   └── tailwind.config.js   # Tailwind 설정
└── README.md               # 프로젝트 문서
```

## 🔧 개발 환경 설정

### 백엔드 개발

```bash
cd backend

# 가상환경 생성 (선택사항)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 개발 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 프론트엔드 개발

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm run start
```

### 환경 변수 설정

```bash
# backend/.env
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL=postgresql://postgres:postgres@db:5432/kanban_db

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

## 🧪 테스트
### API 테스트 (curl)

```bash
# 로그인
TOKEN=$(curl -s -X POST http://localhost:8000/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=student3&password=1234" | jq -r .access_token)

# 태스크 목록 조회
curl -X GET http://localhost:8000/tasks/ \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## 🚀 배포

### Docker를 이용한 프로덕션 배포 (예정)

```bash
# 전체 스택 배포
docker-compose -f docker-compose.prod.yml up -d

# 특정 서비스만 재배포
docker-compose -f docker-compose.prod.yml up -d backend
```

### 클라우드 배포 (예: AWS)

1. **백엔드**: AWS ECS 또는 EC2에 Docker 배포
2. **프론트엔드**: Vercel 또는 AWS S3 + CloudFront
3. **데이터베이스**: AWS RDS PostgreSQL
4. **파일 저장소**: AWS S3

## 📋 로드맵

### v0.5 (예정)

- [ ] 알람기능
- [ ] 선생님-학생  채팅 기능 구현
- [ ] 진도 - 빠름,느림,도움요청,에러발생,완료 기능 추가 (알림기능으로)
- [ ] 가독성 수정

### v0.7 (예정)

- [ ] 팀 체팅기능
- [ ] 발표 순서 정하기 기능
- [ ] 랜덤팀구성기능
- [ ] 과제 파일 첨부 기능
- [ ] 이메일을 통해 비밀번호 찾기 기능

### v2.0 (장기)

- [ ] 모바일 앱 (React Native)
- [ ] 화상 회의 연동

---

**교육 현장의 실제 니즈를 반영한 실용적인 학습 관리 시스템** 🎯

_"몰입을 방해하지 않으면서도 실시간으로 학습 상황을 파악할 수 있는 도구"_
