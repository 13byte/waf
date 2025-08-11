# WAF Test Database

MySQL 8.0 기반 WAF 테스트 데이터베이스

## 기술 스택
- MySQL 8.0
- Docker Container
- 자동 초기화 스크립트

## 테이블 구조
- `users` - 사용자 계정 및 권한
- `categories` - 게시판 카테고리
- `posts` - 게시글 콘텐츠
- `comments` - 댓글 시스템
- `files` - 첨부파일 메타데이터
- `user_sessions` - 세션 관리
- `audit_logs` - 감사 로그
- `post_views` - 조회수 추적

## 연결 정보
- **Host**: localhost
- **Port**: 3306
- **Database**: waf_test_db
- **User**: waf_user
- **Password**: waf_pass123

## 테스트 계정
| Username | Email | Role | Password |
|----------|-------|------|----------|
| admin | admin@waftest.com | admin | password123 |
| testuser1 | user1@waftest.com | user | password123 |
| vulnuser | vuln@waftest.com | user | password123 |

## 실행 방법
상위 디렉터리에서 실행:
```bash
./manage.sh start    # 전체 시작
./manage.sh stop     # 전체 중지
./manage.sh logs database  # DB 로그 확인
```

## 디렉터리 구조
```
db/
├── .env             # 환경 변수
├── config/
│   └── my.cnf       # MySQL 설정
└── init/            # 초기화 스크립트
    ├── 01_schema.sql
    ├── 02_tables.sql
    ├── 03_data.sql
    └── 04_config.sql
```

## 초기화 과정
1. 스키마 생성 (01_schema.sql)
2. 테이블 생성 (02_tables.sql)
3. 초기 데이터 삽입 (03_data.sql)
4. 설정 적용 (04_config.sql)

## WAF 테스트 벡터
- SQL Injection (로그인, 검색, 필터링)
- XSS (게시글, 댓글, 프로필)
- Path Traversal (파일 업로드/다운로드)
- Command Injection (파일 처리)
- Header 조작 (세션, 인증)

## 백업 및 복원
```bash
# 백업 생성
docker exec waf_test_database mysqldump -u root -p waf_test_db > backup.sql

# 백업 복원
docker exec -i waf_test_database mysql -u root -p waf_test_db < backup.sql
```

## 개발 정보
- 자동 초기화 설정됨
- UTF-8 문자셋 사용
- InnoDB 엔진 사용
- WAF 테스트용 취약한 설정 포함
