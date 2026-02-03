# [기획서] AI 기반 생기부 컨설팅 솔루션 (v2.3)

> **문서 이력**
> - **v2.2**: 초기 기획 및 기능 명세
> - **v2.3**: **Multi-Agent Skill Integration** (Architecture, DB, UX, AI Deep Dive)
>   - *Refined by*: `prd-writer`, `supabase-expert`, `ui-ux-pro-max`, `prompt-engineering-patterns`

---

## 1. 프로젝트 개요 (Overview)
*v2.2 내용 유지*

---

## 2. 서비스 프로세스 & 아키텍처 (Advanced)

### 2.1 System Architecture
```mermaid
graph TD
    subgraph "Local Environment"
        LS[(Local Storage)]
        Client[Web Client (Vanilla JS/SPA)]
    end
    
    subgraph "External Resources"
        DB[(Supabase DB - Read Only)]
        Edge[Edge Functions]
    end
    
    subgraph "AI Engine"
        Gemini[Gemini 3.0 Flash]
        Vector[Vector DB (Faiss/Pinecone)]
    end

    Client -->|Save/Load| LS
    Client -->|Ref Data Query| DB
    Client -->|Generation Request| Edge
    Edge -->|Prompt Chaining| Gemini
    Edge -->|Context Retrieval| DB
```

---

## 3. 상세 기능 명세 (Deep Dive)

### 3.1 [Stage 1] 대학 분석 (DataLogic)
- **F-03 (Master-Detail)**: 
    - **[UX Logic]** 좌측 리스트 선택 시 `selectedId` 상태 업데이트 → 우측 패널만 Re-render (SPA 방식)
    - **[Error Handling]** 로드맵 데이터 부재 시 "데이터 준비 중" Skeleton UI 표시
- **F-04 (Badge Logic)**:
    - **Logic**: `Subject.is_opened` 값에 따라 CSS Class 동적 바인딩 (`.badge.open`, `.badge.closed`)

### 3.2 [Stage 2] AI 탐구 가이드 (Gen-AI Patterns)
- **F-05 (탐구 주제 생성)**: **[Chain-of-Thought Pattern]** 적용
    1. **Context Loading**: 학생의 미개설 과목 + 희망 전공 인재상 로딩
    2. **Strategy Step**: "이 학생은 OO역량이 부족하므로 XX주제로 보완해야 함" 중간 추론 생성
    3. **Final Output**: 최종 주제 및 가이드 도출 (Gemini 3.0 Flash 활용)
- **F-06 (Hallucination 방지)**: RAG(증강 검색)를 통해 실제 존재하는 도서 리스트만 추천하도록 제약

### 3.3 [Admin] 프롬프트 센터 (Control Plane)
- **F-10 (Hyper-parameter)**: 
    - **Temperature**: 창의적 글쓰기(0.8) vs 데이터 분석(0.2) Presets 제공
    - **Max Tokens**: 비용 관리를 위한 Hard Limit 설정 기능

---

## 4. 데이터 모델 설계 (Supabase Schema Expert Ver.)

### 4.1 Hybrid Data Model Plan
- **Client-Side (Local Storage - JSON)**
    - `student_profile`: 학생 기본 정보, 내신 성적, 희망 전공 (Write/Read)
    - `consulting_result`: AI 탐구 주제 및 컨설팅 리포트 (Write/Read)
    
- **Server-Side (Supabase - Read Only)**
    - `univ_major_map`: 대학/학과 구조 마스터 (PK: `id`, `univ_name`, `raw_major_name`)
    - `subjects`: 고교학점제 과목 리스트 (PK: `id`, `course_name`, `course_type`)
    - `univ_dept_subject_map`: 학과별 권장/핵심 과목 매핑 (FK: `univ_map_id`, `course_key`)
    - `univ_dept_admission_stats`: 연도별 입시 결과 및 최저컷 (FK: `univ_map_id`)
    - *Note: AI는 위 테이블을 참조하여 Hallucination 없는 정확한 학과/과목 기반 추천 수행*

### 4.2 Data Access Policy
- **User Data**: 전적으로 사용자의 브라우저(Local Storage)에만 저장 (Privacy-First)
- **Reference Data**: Supabase `anon_key`를 통해 Public Table만 조회 허용

---

## 5. UI/UX 디자인 전략 (Design System)

### 5.1 Component Library (Atomic Design)
- **Atoms**: 
    - `Badge`: Status 표시 (Success/Warning/Error Colors)
    - `Card`: Shadow-sm, Rounded-xl, Bg-white
- **Molecules**:
    - `UnivRow`: 대학 정보 + 판정 배지 조합
    - `PromptEditor`: Code Area + Variable Chips 조합
- **Organisms**:
    - `RoadmapPanel`: 대학 선택 시 변경되는 반응형 컨테이너

### 5.2 Responsive Strategy (1080p Fix)
- **Grid Layout**: `display: grid; grid-template-columns: 280px 1fr 1.2fr;` (Admin 제외)
- **Flex Column**: `height: 100vh; overflow: hidden;` 선언으로 Global Scroll 방지

---

## 6. 기술 스택 및 배포 (Full Stack)
- **Frontend**: Vanilla JS (ES6+)
- **Storage**: Local Storage (User Data) + Supabase (Reference Data)
- **AI**: Google Gemini 3.0 Flash API (High Performance, Low Latency)
- **Deployment**: Vercel or Netlify (Static Hosting)
