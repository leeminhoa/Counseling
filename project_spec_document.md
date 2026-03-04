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
- **Google Gemini 2.5 Pro / Flash API**
  - `aiService.js`를 통해 API Key를 관리하고 프롬프트를 전송 (현재 기본 모델: `gemini-2.5-pro`).
  - JSON Schema 형태의 포맷 규격을 강제하여 UI에서 파싱할 수 있도록 구성 (Chain-of-Thought Pattern 적용).

## 3. 기술 스택 (Tech Stack)
- **Frontend Core**: HTML5, Vanilla JavaScript (ES6+), CSS3
- **Design System & Layout**: Atomic Design 컴포넌트 (`.btn-primary`, `.badge`, `.card`), Grid Layout 구조 (`grid-template-columns`). FontAwesome 아이콘, 구글 폰트 적용.
- **DB & Backend**: Supabase (BaaS, PostgreSQL 기반)
- **AI Agent**: Google Gemini 2.5 (Pro/Flash 기본 연동)
- **Export Tooling**: html2pdf.js (리포트 PDF 저장)

## 4. 상세 기능 명세 (Feature Details)
어떤 뷰나 기능도 누락되지 않도록 구성한 화면별 기능 맵입니다.

### 4.1 사이드바 네비게이션 & 글로벌 컨트롤
- **네비게이션 탭 라우팅**: '정보 입력하기', '계열 추천', '학부 선택', '대학 분석', '탐구 가이드', 'AI 챗봇', '학생 관리', '설정' 이동 처리 (`app.js`).
- **상담 초기화 버튼**: `resetCounselingSession()`을 통해 현재 로컬스토리지 데이터를 지우고 세션을 초기화.
- **오른쪽 상단 알림 (User Status)**: 헤더 우측에 현재 성적(GPA) 및 상태 정보 실시간 표시.

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

### 4.5 AI 챗봇 (chatbot.js)
- **대화형 추가 질문**: 분석 이후 추가적인 입시나 탐구 질문을 자연어로 답변하는 독립 챗봇 구현.

### 4.6 학생 관리 - 상담사 모드 (manager.js)
- **다중 학생 컨텍스트 분리**:
  - 복수 학생의 로컬 데이터 리스트업 및 선택 시 탭간 전환을 매끄럽게 처리.
  - 리스트 내 학생 검색창 지원.

### 4.7 어드민 및 프롬프트 관리 (admin.js, admin_prompts.js)
- **Control Plane (하이퍼파라미터 제어)**:
  - 각 AI 생성 단계별 `Temperature`, `Top P`, `Max Tokens` 조작. 
  - 프롬프트 설계(Pre-prompt) 편집 영역을 부여하여, 코드 수정 없이도 프롬프트 튜닝 가능.

## 5. 보안 및 성능 최적화 (Security & Performance)
- **로컬 스토리지 우선 전략 (Offline tolerance)**: 통신 에러 시에도 기존 저장 기록이 날아가지 않도록 관리 (`dataManager.js`).
- **컴포넌트 별 상태 최소 격리**: DOM 재렌더링 시 전역 리렌더를 막고 선택된 패널 내 뷰만 변경 (`document.getElementById` 교체).
- **에러 핸들링**: AI 응답 파싱 실패 시 `tryParse` 유틸리티와 모달(`confirmModal`) 호출로 우아한 실패(Graceful Fallback) 대응 처리.
