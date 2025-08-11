# WAF Test Platform

OWASP ModSecurity Core Rule Set (CRS)를 사용한 웹 애플리케이션 방화벽 테스트

## 아키텍처

```
nginx + ModSecurity (WAF) ←→ React Frontend ←→ FastAPI Backend ←→ MySQL Database
     ↓                          ↓                    ↓                ↓
   포트 80/443               포트 3000            포트 8000        포트 3306
```

## 기술 스택

- **WAF**: OWASP ModSecurity CRS (nginx) - Paranoia Level 1
- **Frontend**: React 18 + TypeScript + TailwindCSS + Vite + React Router
- **Backend**: FastAPI 0.116.1 + Python 3.12.x + SQLAlchemy
- **Database**: MySQL 8.0
- **컨테이너**: Docker + Docker Compose

## 취약점 테스트 기능

### 1. XSS (Cross-Site Scripting)

- Reflected XSS
- Stored XSS  
- DOM-based XSS
- 다양한 페이로드 템플릿 제공

### 2. SQL Injection

- Union-based injection
- Boolean-based blind SQLi
- Time-based blind SQLi
- Error-based injection

### 3. Path Traversal

- Directory traversal
- File inclusion 공격
- 다양한 인코딩 우회 기법

### 4. Command Injection

- Shell command injection
- Multiple execution contexts
- OS command bypass techniques

### 5. User-Agent 조작

- User-Agent 기반 권한 우회
- Bot detection bypass
- 브라우저 스푸핑

### 6. Header 조작 공격

- IP 스푸핑 (X-Forwarded-For, X-Real-IP)
- 권한 승격 헤더
- 인증 우회 시도

## 빠른 시작

### 1. 전체 환경 시작

```bash
cd /Users/jw.song/jeosong/waf_test
chmod +x manage.sh
./manage.sh start
```

### 2. 서비스 상태 확인

```bash
./manage.sh status
```

### 3. 접속 URL

- **WAF 보호된 프론트엔드**: <http://localhost>
- **API 엔드포인트**: <http://localhost/api/>
- **헬스체크**: <http://localhost/health>

### 4. 로그 모니터링

```bash
./manage.sh logs                    # 전체 로그
./manage.sh logs nginx-waf          # WAF 로그만
./manage.sh logs backend            # Backend 로그만
tail -f logs/nginx/access.log       # 접근 로그
```

## WAF 테스트 시나리오

### XSS 테스트

```bash
# Reflected XSS
curl "http://localhost/api/vulnerable/xss?input_data=<script>alert('XSS')</script>"

# DOM-based XSS
curl "http://localhost/api/vulnerable/xss?input_data=<img src=x onerror=alert('XSS')>"
```

### SQL Injection 테스트

```bash
# Union-based SQLi
curl "http://localhost/api/vulnerable/sqli?user_id=1 UNION SELECT username,password_hash FROM users--"

# Boolean-based SQLi
curl "http://localhost/api/vulnerable/sqli?user_id=1 AND 1=1"
```

### Path Traversal 테스트

```bash
# Directory traversal
curl "http://localhost/api/vulnerable/path-traversal?file_path=../../../etc/passwd"

# Windows 스타일
curl "http://localhost/api/vulnerable/path-traversal?file_path=..\\..\\..\\windows\\system32\\drivers\\etc\\hosts"
```

### Command Injection 테스트

```bash
# Basic command injection
curl "http://localhost/api/vulnerable/command-injection?command=whoami;ls -la"

# 고급 페이로드
curl "http://localhost/api/vulnerable/command-injection?command=cat /etc/passwd&execution_type=shell"
```

### User-Agent 우회 테스트

```bash
# Admin 권한 상승
curl -H "User-Agent: admin-bot" "http://localhost/api/vulnerable/user-agent"

# Bot 탐지 우회
curl -H "User-Agent: GoogleBot/2.1" "http://localhost/api/vulnerable/user-agent"
```

### Header 조작 테스트

```bash
# 권한 상승 헤더
curl -H "X-Admin-Access: true" -H "X-Privilege-Escalation: admin" "http://localhost/api/vulnerable/header-manipulation"

# IP 스푸핑
curl -H "X-Forwarded-For: 192.168.1.1" -H "X-Real-IP: 10.0.0.1" "http://localhost/api/vulnerable/header-manipulation"
```

## ModSecurity CRS 규칙 매핑

### 예상 트리거 규칙

- **920xxx**: Protocol Violations (비정상 헤더)
- **921xxx**: Application Attacks (일반 공격)
- **932xxx**: Remote Command Execution (명령 실행)
- **941xxx**: XSS Attacks (크로스사이트 스크립팅)
- **942xxx**: SQL Injection Attacks (SQL 인젝션)

## 개발 환경

### Frontend 개발 서버 실행

```bash
cd frontend
npm install
npm run dev
```

### Backend 개발 서버 실행

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 관리 명령어

```bash
./manage.sh start      # 전체 서비스 시작
./manage.sh stop       # 전체 서비스 중지
./manage.sh restart    # 전체 서비스 재시작
./manage.sh status     # 서비스 상태 확인
./manage.sh logs       # 로그 확인
./manage.sh clean      # 전체 환경 정리
./manage.sh build      # 서비스 빌드/재빌드
```
