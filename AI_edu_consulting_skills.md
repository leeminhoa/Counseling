# 프로젝트 기술 유지보수 스킬 구문 (Skill & Document Integration)

본 문서는 `@[.agent/skills/CATALOG.md]`에 명시된 에이전트 자원 및 역량을 활용하여, **AI 기반 생기부 컨설팅 솔루션**을 체계적으로 유지보수하고 고도화하기 위한 Skill 세팅 및 역할을 규정합니다.

---

## 1. 아키텍처 및 백엔드 파트 (Architecture & Database)

### 🧑‍💻 해당 스킬: `senior-architect` & `database-architect` (or `postgres-best-practices`)
*   **Target Scope**: `index.html`, SPA 라우팅 아키텍처, Supabase 스키마 안정성, 데이터 흐름 로직 개선.
*   **Role Setup**:
    *   **Vanilla JS 최적화 검토**: React나 프레임워크가 아님에도 코드가 엉키지 않도록 MVC 패턴 형태의 JS 모듈 분할 점검 (`manager.js`, `app.js`).
    *   **DB Model 최적화**: Supabase의 Reference Data 구조 변경 시 (Ex: 새로운 교육과정 과목 룰 추가) 스키마 변경 쿼리를 최적화하고 RLS 접근 보안 권한 정책 자문수행.
*   **Trigger Keywords**: "Supabase 스키마 변경", "JS 파일 구조 리팩토링", "앱 아키텍처 고도화"

---

## 2. 프론트엔드 UI/UX 설계 및 상태 제어 파트 (Frontend Development)

### 🧑‍💻 해당 스킬: `frontend-developer` & `ui-ux-designer`
*   **Target Scope**: `.css` (Grid/Flex Layouts), `stage1.js`, `profile.js` 등의 화면 렌더링.
*   **Role Setup**:
    *   **Responsive UX 유지**: 현재 `1080p` 픽스 해상도 전략에 대한 모바일 대응이나 비율 변환 요청 시 레이아웃 깨짐을 방지하고 코드 제안.
    *   **DOM State Handling**: Data-binding이 없는 Vanilla 환경에서의 Virtual DOM 렌더링 수준 성능 개선 건의. Error/Empty 시 Skeleton UI 대응 강화 작업.
*   **Trigger Keywords**: "컴포넌트 디자인 변경", "스크롤 버그 해결", "모달 스타일 수정", "프론트엔드 퍼포먼스"

---

## 3. 기획 로직 검증 밎 신규 피쳐 로드맵 관리 (Product Planning)

### 🧑‍💻 해당 스킬: `product-manager-toolkit` & `plan-writing`
*   **Target Scope**: 추가 기능 기획안(Markdown 문서), 앱 User Flow 전체.
*   **Role Setup**:
    *   **Edge Case 검증**: 학생 데이터를 저장하지 않고 로그아웃 하거나, AI 토큰 오류 시 사용자가 어떻게 대응하는가의 엣지 케이스 시나리오 보강 및 Task 도출.
    *   **작업 구조화**: 사용자가 "성적 시뮬레이터 기능을 추가해 줘"라고 요구 시, `plan-writing` 지침을 통해 변경이 필요한 파일을 정확하게 역추적(Traceability)하여 명세서화.
*   **Trigger Keywords**: "새로운 기능 기획", "유저 플로우 검토", "단계별 마일스톤 작성"

---

## 4. 인공지능 프롬프트 디자인 파트 (Gen-AI Patterns)

### 🧑‍💻 해당 스킬: `prompt-engineer` (또는 `prompt-engineering-patterns`)
*   **Target Scope**: `aiService.js`, `admin_prompts.js`, `test_server.py`.
*   **Role Setup**:
    *   **프롬프트 최적화**: Chain-of-Thought (추론 기반) 방식으로 JSON Schema를 뽑아내는 현재 전략(`Schema D` 등)을 고도화하여 토큰 소모를 방지 및 정확도 증가 설계.
    *   **Hallucination 대처 방안**: 없는 책/없는 과목을 지어내지 않도록 Rule Prompt의 우선순위 정렬 및 System 지시문 디버깅.
*   **Trigger Keywords**: "AI 응답 오류 개선", "프롬프트 튜닝", "토큰 리미트 조정"

---

### 👉 총괄 룰 (Project Manager Directive)
본 프로젝트에 요청사항이 올 경우, PM격인 총괄 에이전트는 사용자의 의도를 분석한 후, 위 4가지 Skill 분류 기준에 따라 **어느 영역의 파일을 수정해야 하며 어떤 Skill 규칙을 따를지** 명확하게 결정하고 단계를 밟아 수정에 진입해야 합니다.
모든 문서는 한국어를 원칙으로 하며, 코드 수정 후에는 `task.md`와 `walkthrough.md`에 변경의 영향을 꼼꼼히 기록하여 기능 작동 이상 여부를 확인합니다.
