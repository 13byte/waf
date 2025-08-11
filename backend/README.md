# WAF Test Backend

FastAPI 0.116.1 기반 WAF 테스트 백엔드

## 기술 스택
- FastAPI 0.116.1
- Python 3.12.x
- SQLAlchemy 2.0.23
- MySQL 8.0
- JWT Authentication

## 기능
- 사용자 인증 및 권한 관리
- 게시글 관리 (CRUD)
- 댓글 시스템
- 파일 업로드/다운로드
- WAF 테스트용 취약점 엔드포인트

## API 엔드포인트

### 인증
```
POST /api/auth/register     - 사용자 등록
POST /api/auth/login        - 로그인
GET  /api/auth/me           - 현재 사용자 정보
```

### 게시글
```
GET  /api/posts             - 게시글 목록
POST /api/posts             - 게시글 생성
GET  /api/posts/{id}        - 게시글 조회
PUT  /api/posts/{id}        - 게시글 수정
DELETE /api/posts/{id}      - 게시글 삭제
```

### WAF 테스트
```
GET  /api/vulnerable/xss                 - XSS 테스트
GET  /api/vulnerable/sqli                - SQL Injection 테스트
GET  /api/vulnerable/path-traversal      - Path Traversal 테스트
GET  /api/vulnerable/command-injection   - Command Injection 테스트
GET  /api/vulnerable/user-agent          - User-Agent 조작 테스트
GET  /api/vulnerable/header-manipulation - Header 조작 테스트
```

## 실행 방법

상위 디렉터리에서 실행:
```bash
./manage.sh start    # 전체 시작
./manage.sh stop     # 전체 중지
./manage.sh logs backend  # 백엔드 로그 확인
```

## 환경 설정
- **Host**: localhost:8000
- **Database**: MySQL (localhost:3306)
- **Upload Directory**: ./uploads

## 디렉터리 구조
```
backend/
├── main.py              # 메인 애플리케이션
├── Dockerfile           # Docker 설정
├── .env                 # 환경 변수
└── app/
    ├── config.py        # 설정
    ├── database.py      # DB 연결
    ├── models.py        # DB 모델
    ├── schemas.py       # Pydantic 스키마
    ├── auth.py          # 인증 로직
    ├── dependencies.py  # 의존성
    └── routers/         # API 라우터
        ├── auth.py
        └── posts.py
```

## 개발 정보
- Python 가상환경 사용 권장
- 환경 변수는 .env 파일에서 관리
- DB 마이그레이션 자동 실행
- JWT 토큰 기반 인증
