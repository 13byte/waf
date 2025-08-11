# WAF Test Platform - React Frontend

React 18 + TypeScript + TailwindCSS로 구축된 WAF 테스트 플랫폼의 프론트엔드입니다.

## 기술 스택

- **React 18**: 최신 React with Hooks
- **TypeScript**: 정적 타입 검사
- **Vite**: 빠른 빌드 도구
- **React Router**: 클라이언트 사이드 라우팅
- **TailwindCSS**: 유틸리티 기반 CSS 프레임워크
- **Lucide React**: 아이콘 라이브러리

## 개발 환경 설정

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 프로덕션 빌드
```bash
npm run build
```

### 4. 빌드된 앱 미리보기
```bash
npm run preview
```

## 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 React 컴포넌트
│   └── Header.tsx      # 네비게이션 헤더
├── context/            # React Context (상태 관리)
│   └── AuthContext.tsx # 인증 상태 관리
├── pages/              # 페이지 컴포넌트
│   ├── HomePage.tsx    # 메인 페이지
│   ├── LoginPage.tsx   # 로그인 페이지
│   ├── RegisterPage.tsx # 회원가입 페이지
│   ├── PostsPage.tsx   # 게시물 페이지
│   └── VulnerablePage.tsx # 취약점 테스트 페이지
├── types/              # TypeScript 타입 정의
│   └── index.ts        # 공통 인터페이스
├── utils/              # 유틸리티 함수
│   └── api.ts          # API 클라이언트
├── App.tsx             # 메인 앱 컴포넌트
├── main.tsx            # 애플리케이션 진입점
└── index.css           # 글로벌 스타일
```

## 주요 기능

### 인증 시스템
- JWT 토큰 기반 인증
- Context API를 통한 전역 상태 관리
- 자동 토큰 갱신
- 보호된 라우트

### 취약점 테스트 인터페이스
- XSS (Cross-Site Scripting) 테스트
- SQL Injection 테스트
- Path Traversal 테스트
- Command Injection 테스트
- User-Agent 조작 테스트
- Header 조작 테스트

### 사용자 경험
- 반응형 디자인 (모바일 친화적)
- 로딩 상태 표시
- 에러 처리 및 알림
- 직관적인 UI/UX

## API 통신

### Base URL
```typescript
const API_BASE_URL = '/api'
```

### 주요 엔드포인트
- `POST /auth/login` - 로그인
- `POST /auth/register` - 회원가입
- `GET /auth/me` - 현재 사용자 정보
- `GET /vulnerable/*` - 취약점 테스트 엔드포인트

### API 클라이언트 사용 예시
```typescript
import { apiClient } from '@utils/api';

// XSS 테스트
const response = await apiClient.testXSS('<script>alert("XSS")</script>');

// SQL Injection 테스트
const response = await apiClient.testSQLInjection("' OR 1=1--");
```

## 스타일링

### TailwindCSS 커스텀 클래스
```css
.btn-primary       /* 기본 버튼 스타일 */
.btn-secondary     /* 보조 버튼 스타일 */
.input-field       /* 입력 필드 스타일 */
.card             /* 카드 컨테이너 */
.card-header      /* 카드 헤더 */
.card-body        /* 카드 본문 */
```

### 컬러 팔레트
- Primary: Blue (#2563eb)
- Gray Scale: 50-900
- Error: Red variants
- Success: Green variants

## 개발 가이드라인

### 컴포넌트 작성 규칙
1. TypeScript 사용 필수
2. 함수형 컴포넌트 + Hooks 사용
3. Props 인터페이스 정의
4. 기본값 제공

### 상태 관리
- 전역 상태: Context API 사용
- 로컬 상태: useState Hook 사용
- 복잡한 상태: useReducer Hook 고려

### 타입 안전성
- 모든 Props와 State에 타입 정의
- API 응답 타입 정의
- 엄격한 TypeScript 설정 사용

## 배포

### Docker를 통한 배포
```bash
# 이미지 빌드
docker build -t waf-test-frontend .

# 컨테이너 실행
docker run -p 3000:3000 waf-test-frontend
```

### 환경 변수
- `NODE_ENV`: 환경 모드 (development/production)
- `VITE_API_BASE_URL`: API 기본 URL (선택사항)

## 문제 해결

### 의존성 충돌
```bash
rm -rf node_modules package-lock.json
npm install
```

### 빌드 오류
```bash
npm run build -- --verbose
```

### 타입 에러
```bash
npx tsc --noEmit
```

## 라이선스

이 프로젝트는 교육 및 보안 연구 목적으로 제공됩니다.
