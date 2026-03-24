# AI 기반 생기부 컨설팅 솔루션 (I HATE FLYING BUGS) - 종합 기술 명세서

## 1. 개요 및 설계 원칙
본 프로젝트는 학생의 진로 역량과 내신 성적을 기반으로 대학 진학 가능성을 분석하고, 구체적인 AI 기반 탐구 가이드를 제공하는 **교육 컨설팅 맞춤형 SPA(Single Page Application)**입니다. 사용자의 브라우저 로컬 데이터 보존을 통한 개인정보 보호(Privacy-First)와 빠른 렌더링을 최우선으로 설계되었습니다.

## 2. 아키텍처 및 데이터 흐름
### 2.1 하이브리드 데이터 모델
- **Client-Side (Local Storage)**
  - `student_profile`: 학생 기본 정보, 내신 성적 평점, 희망 전공.
  - `consulting_result`: AI를 통해 생성된 탐구 주제 리포트 밎 컨설팅 진행 내역.
- **Server-Side (Supabase - Public Read-Only)**
  - `anon_key` 기반의 API로 읽기 전용 접근을 허용합니다 (보안 및 편의성).
  - 대학교/학과 정보 밎 과목 데이터 (`univ_major_map`, `subjects`, `univ_dept_subject_map` 등).

### 2.2 외부 연동 (AI Engine)
- **Google Gemini 2.5 Pro / Flash API (Proxy 경유)**
  - Client에서 API Key 노출을 막기 위해 `/api/generate` (Node.js/Python Vercel Serverless 등) 프록시를 경유.
  - `aiService.js`를 통해 프롬프트를 전송하며 현재 기본 모델은 `gemini-3.1-pro-preview` 등을 선택 가능.
  - JSON Schema 형태의 포맷 규격을 강제하여 UI에서 파싱할 수 있도록 구성 (Chain-of-Thought Pattern 적용).
  - **AI 파라미터 제어 (Hyperparameters)**: 일관되고 안정화된 컨설팅 응답을 위해 `Temperature 0.5`, `Top P 1.0`, `Top K 40`, `Max Tokens 8100`을 시스템 기본값(Default)으로 하드코딩 운용 중.

## 3. 기술 스택 (Tech Stack)
- **Frontend Core**: HTML5, Vanilla JavaScript (ES6+), CSS3
- **Design System & Layout**: Atomic Design 컴포넌트 (`.btn-primary`, `.badge`, `.card`), Grid Layout 구조 (`grid-template-columns`). FontAwesome 아이콘, 구글 폰트 적용.
- **DB & Backend**: Supabase (BaaS, PostgreSQL 기반)
- **AI Agent**: Google Gemini 2.5 (Pro/Flash 기본 연동)
- **Export Tooling**: html2pdf.js (리포트 PDF 저장)

## 4. 상세 기능 명세 (Feature Details)
어떤 뷰나 기능도 누락되지 않도록 구성한 화면별 기능 맵입니다.

### 4.1 사이드바 네비게이션 & 글로벌 UI 컨트롤
- **네비게이션 탭 라우팅**: '정보 입력하기', '계열 추천', '학부 선택', '대학 분석', '탐구 가이드', 'AI 챗봇', '학생 관리', '설정' 이동 처리 (`app.js`).
- **상담 초기화 버튼**: `resetCounselingSession()`을 통해 현재 로컬스토리지 데이터를 지우고 세션을 초기화.
- **오른쪽 상단 알림 (User Status)**: 헤더 우측에 현재 성적(GPA) 및 상태 정보 실시간 표시.
- **자체 UI 다이얼로그 시스템 (`showCustomModal`)**: 
  - 브라우저의 네이티브 팝업 차단 및 탭 강제 포커스 해제 문제를 우회하기 위해, 기존의 `alert()` 및 `confirm()`을 앱 내 자체 디자인 컴포넌트(`customModal`)로 **100% 치환 완료**.
  - 비동기 콜백 체인을 지닌 `showCustomAlert`, `showCustomConfirm` 인터페이스를 전역(`app.js`)에 노출하여 모든 JS 모듈에서 안전하게 메세지/확인 절차를 제어하도록 구성됨.

### 4.2 프로필 설정 (profile.js)
- **정보 입력 모달 (`profileModal`)**:
  - 이름, 성적(내신), 1/2/3 희망 대학 및 학과, 학생의 주요 관심사 입력 폼 제공.
  - 데이터는 `dataManager.js`를 통해 Local Storage에 안전하게 저장.

### 4.3 Stage 1. 대학 분석 및 과목 매칭 (stage1.js, stage1_1.js, stage1_2.js)
- **계열 및 학부 추천 (stage1_1, stage1_2)**: 목표 전공 도출을 위한 인터렉티브 단계 구성.
- **대학 분석 리스트/디테일 뷰 (stage1.js - Master-Detail UX)**:
  - 좌측 리스트 클릭 시 우측에 상세 전공/대학 정보 및 과목 이수 매칭 현황 로드.
  - **배지 로직 (Badge Logic)**: Supabase에 정의된 `is_opened` 등의 과목 데이터 테이블 상태(미개설/핵심/일반 등)에 따라 UI `.badge` CSS 색상 동적 렌더링.

### 4.4 Stage 2. AI 탐구 가이드 (stage2.js, aiService.js)
- **AI 보고서 생성 (Chain-of-Tought)**:
  - 학생의 부족한 과목이나 진로 컨텍스트를 종합해 AI가 주제 추천 전략(`execution_plan`)을 제시.
  - `trigger_bank`와 같은 RAG(증강 검색) 방식 제약으로 실제로 존재하는 도서, 개념 키워드만을 응답에 포함시켜 Hallucination 방지.
- **JSON to UI 파싱**: `renderNewReportLayout`에서 반환된 AI 포맷(Schema D)을 읽어 테이블과 텍스트 영역으로 예쁘게 렌더링.
- **PDF 출력 다운로드**: HTML2PDF를 이용하여 분석 결과를 로컬 PDF 파일(`downloadPDF()`)로 저장.

### 4.5 AI 챗봇 컨텍스트 자동 주입 시스템 (chatbot.js)
- **대화형 추가 질문**: 분석 이후 추가적인 입시나 탐구 질문을 자연어로 답변하는 독립 AI 챗봇 구현.
- **탐구가이드 데이터 동기화 연동 (Context Injection Pipeline)**: 
  - `stage2.js`에서 학생의 과거 상담 이력을 불러오거나 방금 생성한 경우, 해당 화면에 띄워진 **JSON 데이터 전체를 긁어내어 챗봇의 백그라운드 메모리(`chatHistoryState`) 강제 맨 앞단**에 주입(`injectContextToChatbot` 함수).
  - 이를 통해 챗봇이 "학생이 어떤 컨설팅 결과를 받았고 무슨 책을 추천받았는지" 이미 완벽히 숙지한 상태로 대화가 시작됨. (UI 적으로는 배너 알림과 함께 챗봇이 먼저 로봇 응답을 던져 숙지 상태를 고지함)

### 4.6 학생 관리 - 상담사 모드 (manager.js)
- **다중 학생 컨텍스트 분리**:
  - 복수 학생의 로컬 데이터 리스트업 및 선택 시 탭간 전환을 매끄럽게 처리.
  - 리스트 내 학생 검색창 지원.

### 4.7 어드민 및 프롬프트 관리 (admin.js, admin_prompts.js)
- **Control Plane (하이퍼파라미터 제어)**:
  - 각 AI 생성 단계별 온도 조절을 위해 파라미터를 관리. 시스템 초기 스키마 값과 UI Slider 초기값을 매핑하여 무결성 유지.
  - 프롬프트 설계(Pre-prompt) 편집 영역을 부여하여, 코드 수정 없이도 프롬프트 튜닝 가능하며, 새로 도입된 **[학생 데이터] 디폴트 템플릿 구조**(목표 학과, 관련 이수 과목, 수강과목, 내신)를 강제하여 사용자 오류를 방지.

## 5. 보안 및 성능 최적화 (Security & Performance)
- **로컬 스토리지 우선 전략 (Offline tolerance)**: 통신 에러 시에도 기존 저장 기록이 날아가지 않도록 관리 (`dataManager.js`).
- **컴포넌트 별 상태 최소 격리**: DOM 재렌더링 시 전역 리렌더를 막고 선택된 패널 내 뷰만 변경 (`document.getElementById` 교체).
- **에러 핸들링**: AI 응답 파싱 실패 시 `tryParse` 유틸리티와 모달(`confirmModal`) 호출로 우아한 실패(Graceful Fallback) 대응 처리.
