/**
 * aiService.js
 * Gemini 3.0 Flash API 연동 및 프롬프트 관리
 */
class AIService {
    constructor() {
        this.MODEL = 'gemini-3.1-pro-preview';
        this.apiKey = null; // Cache key
    }

    async ensureApiKey() {
        // [Deprecated] API Key is now handled securely on the server side (Vercel Functions).
        // This method is kept as a no-op or placeholder if needed, but should not return keys.
        return null;
    }

    /**
     * Get Available Gemini Models
     * Returns all models containing "gemini" in their name, sorted by version (descending).
     */
    /**
     * Get Available Gemini Models
     * [Security Update] Returns static list to avoid exposing API Key via client-side fetch.
     */
    async getAvailableModels() {
        // Return a curated list of supported models (2026 Compatible)
        return [
            { name: 'gemini-3.1-pro-preview', displayName: 'Gemini 3.1 Pro Preview', description: 'Preview reasoning model', version: '3.1.0' }
        ];
    }

    /**
     * Chatbot API Call
     */
    async chat(userMessage, history = []) {
        try {
            const apiKey = await this.ensureApiKey();
            const settings = dataManager.getData().appSettings || {};

            // Dynamic Generation Config
            const temperature = parseFloat(settings.temperature ?? 0.7);
            const topP = parseFloat(settings.topP ?? 0.95);
            const topK = parseInt(settings.topK ?? 40);
            const maxOutputTokens = parseInt(settings.maxOutputTokens ?? 2048);

            // Select Model (Saved > Default)
            let modelName = settings.geminiModel || this.MODEL;

            // [Fix] Auto-correct invalid legacy model names stored in localStorage
            if (modelName !== 'gemini-3.1-pro-preview') {
                console.warn(`[Auto-Fix] Invalid or Legacy Model '${modelName}' detected. Switching to 'gemini-3.1-pro-preview'.`);
                modelName = 'gemini-3.1-pro-preview';
            }

            const defaultChatPrompt = "당신은 입시 컨설팅 AI 챗봇입니다. 학생의 질문에 친절하고 전문적으로 답변하세요. 마크다운을 적절히 사용하여 읽기 쉽게 답변해주세요.";
            const systemPrompt = await this.getPrompt('챗봇', 'system', defaultChatPrompt);

            console.group('🤖 Gemini AI Chat Request');
            console.log('Model:', modelName);
            console.log('Params:', { temperature, topP, topK, maxOutputTokens });
            console.groupEnd();

            // [Security Update] Use Proxy API instead of Direct Call
            const url = '/api/generate';

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName, // Target Model for Proxy
                    contents: [
                        ...history,
                        { role: 'user', parts: [{ text: userMessage }] }
                    ],
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    generationConfig: {
                        temperature: temperature,
                        maxOutputTokens: 1000,
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gemini Chat Error (Proxy):', errorData);
                throw new Error(errorData.error?.message || 'Chat API 호출 실패');
            }

            const data = await response.json();
            // Proxy returns the same structure from Google
            if (data.error) throw new Error(data.error.message);
            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            console.error('Chat Service Error:', error);
            throw error;
        }
    }

    /**
     * Helper: Fetch Prompt from DB
     */
    async getPrompt(groupTitle, type, fallback) {
        if (!window.dbService) return fallback;
        try {
            // 1. Get Group ID
            const { data: group } = await window.dbService.client
                .from('prompt_group')
                .select('id')
                .eq('title', groupTitle)
                .maybeSingle();

            if (!group) return fallback;

            // 2. Get Valid Prompt
            const { data: prompt } = await window.dbService.client
                .from('prompt')
                .select('contents')
                .eq('prompt_group_id', group.id)
                .eq('type', type)
                .eq('valid', true) // Only active
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            return prompt ? prompt.contents : fallback;
        } catch (e) {
            console.warn(`Prompt fetch failed for ${groupTitle}/${type}:`, e);
            return fallback;
        }
    }

    /**
     * 탐구 주제 및 가이드 생성 (Stage 2)
     */
    async generateExplorationGuide(context) {
        const apiKey = await this.ensureApiKey();
        const settings = dataManager.getData().appSettings || {};
        const temperature = parseFloat(settings.temperature ?? 0.5);
        const topP = parseFloat(settings.topP ?? 1);
        const topK = parseInt(settings.topK ?? 40);
        const maxOutputTokens = parseInt(settings.maxOutputTokens ?? 8100);
        const modelName = settings.geminiModel || this.MODEL;

        const { student, target } = context;

        const defaultSystemPrompt = `
# [시스템 역할]
너는 대한민국 일반고 환경을 잘 이해하는 “고교 생활기록부(세특/창체) 전문 컨설턴트”야. 
제공되는 [지망학과]와 [이번 학기 수강과목]을 바탕으로 학생과 학부모가 바로 실행할 수 있는 현실적인 1~2장짜리 컨설팅 자료(JSON)를 작성해.

# [치명적 주의사항: 데이터 무결성 및 환각 방지]
**이 지침을 어길 시 심각한 사업적 손실이 발생할 수 있으므로 절대 준수할 것.**
1. **교과 개념 무결성**: 반드시 [2022 개정 교육과정] 교과서 목차에 명시된 개념만 사용하라. 존재하지 않는 교과 원리를 지어내는 것은 치명적인 오류다.
2. **확신이 없는 경우**: 정보의 사실 여부가 1%라도 의심된다면, 임의로 생성하지 말고 범용적이고 안전한 대안을 제시하라.
3. **할루시네이션 금지**: 존재하지 않는 책, 저자, ISBN을 창조하지 마라.
4. **검증된 도서**: 출판된 지 오래되어 절판된 책보다는, 현재 서점에서 구할 수 있는 '스테디셀러'나 '베스트셀러', 혹은 분야의 '교과서적 개론서' 위주로 추천하라.
5. **불확실 시 대체**: 특정 세부 주제의 책이 확실치 않다면, 해당 주제를 포괄하는 광범위한 명저를 추천하라.
6. **ISBN 정확성**: ISBN은 틀리기 쉬운 정보이므로, 확실히 아는 경우에만 기재하고 조금이라도 헷갈리면 "ISBN 확인 필요"라고 적어라.

[작성 대원칙: 현실성(Feasibility)]
1. 난이도 조절: 전문적인 코딩(파이썬, C언어), 하드웨어 제작(아두이노, 3D프린터), 대학 수준의 논문 읽기는 제안하지 마. 대신 '개념 설계', '엑셀 데이터 분석', '제안서 작성', '기사 스크랩 및 비교', '유튜브 콘티 제작 혹은 촬영' 등 일반고 학생이 교실에서 할 수 있는 활동을 제안해.
2. 동아리 환경: 특정 동아리명(예: 로봇제작반)을 단정 짓지 말고, “과학 관련 동아리라면”, “인문/토론 동아리라면” 처럼 성격을 가정해서 제안해.
3. 선행 금지: 아직 배우지 않은 심화 개념보다는, 교과서 목차나 기초 개념을 실생활 문제와 연결하는 것에 집중해.

[입력 데이터]
지망학과: {{target_major}}
기수강 과목: {{completed_subjects}}
현재 이수 중 과목: {{inprogress_subjects}}
향후 이수 예정 과목: {{planned_subjects}}
학과의 전체 권장 과목: {{target_recommended}}

[출력 구조 및 작성 가이드 (JSON 필드별 작성 지침)]

[Page 1: Summary]
- profile_summary: 학생 프로필 요약 (지망학과와 수강과목을 한 줄로 요약).
- anchor_theme: 이번 학기 컨셉. 어려운 주제어 대신, 학생이 보여줘야 할 '구체적인 모습/강점'을 한 문장으로 정의.
- sub_keywords: anchor_theme과 관련된 쉬운 핵심 키워드 3개 (#해시태그).
- representative_outputs:
  1) 세특용: (계기→교과/활동→구체적 방법→결과물) 구조. 학생이 '할 수 있는' 수준으로 제안.
  2) 창체용: (계기→활동→구체적 방법→결과물) 구조.
- teacher_record_guide: 교사가 생기부에 그대로 참고할 수 있는 문장 (트리거 → 교과원리 적용 → 탐구활동 → 성장/변화).
- checklist: 이번 주 바로 할 일 3가지 (진입장벽 낮게: 유튜브 영상 키워드, 도서관 목차 훑기, 교과서 펼쳐보기).

[Page 2: Execution Plan]
- subject_table: 과목별 세특 설계. (주력 3개 + 보조 2~3개)
  * 주의: 22개정 교과서에 나온 실제 개념만 활용. 활동은 '제안서 작성'처럼 기획/탐구 단계로 설정.
  * 컬럼: 과목 | 교과개념(교과서 수준) | 전공연결질문(호기심) | 활동(조사/발표/에세이/문제풀이) | 결과물(증거)
- creative_experience: 창체 활동 추천 (선택형 옵션 제공)
  * club_options: 동아리 ([OO 성격의 동아리라면] 가정). (주제/실행3단계/증거물).
  * career_options: 진로 (뉴스 스크랩, 롤모델 탐구 등 혼자 할 수 있는 활동). (주제/실행3단계/증거물).
  * autonomous_options: 자율 (학급 기여, 환경 개선 등). (주제/실행3단계/증거물).
- consulting_questions: 학생의 관심사를 이끌어내고 활동 가능 여부를 체크하는 질문 리스트 6~8개.

[Trigger Bank (2025)]
- books: 추천 도서 3권. 컨셉과 세특 활동을 지원할 수 있는 자료.
  * title: "도서명 (저자 / 출판사 / ISBN)" 형식으로 작성. ISBN 필수(불확실하면 '확인필요').
  * desc: "핵심 내용 요약 (책의 줄거리 및 주요 논점)"
  * connection: "활용: 과목/활동 연결 (구체적 적용 방안)"
- keywords: 트렌드 키워드 3개. 공신력 있는 용어.
  * keyword: "키워드명"
  * desc: "정의 및 핵심 설명"
  * connection: "활용: 탐구 주제 연결 (구체적 적용 방안)"

[필수 출력 형식]
반드시 아래 JSON 포맷을 엄격히 준수하여 응답하세요. 마크다운이나 추가 설명 없이 JSON만 반환합니다. Note: 'representative_outputs'는 배열이어야 합니다.

[IMPORTANT] Output strictly in JSON format as defined:
{
  "page1": {
    "summary": {
      "profile_summary": "학생 프로필 요약 (지망학과 / 수강과목 요약)",
      "anchor_theme": "이번 학기 컨셉 (구체적인 모습/강점)",
      "sub_keywords": ["키워드1", "키워드2", "키워드3"],
      "representative_outputs": [
        { "title": "세특 중심 대표 산출물 제목", "detail": "(WHY 계기) ... → (WHAT 교과/활동) ... → (HOW 방법) ... → (RESULT 결과물) ..." },
        { "title": "창체 중심 대표 산출물 제목", "detail": "(WHY 계기) ... → (WHAT 활동) ... → (HOW 방법) ... → (RESULT 결과물) ..." }
      ],
      "teacher_record_guide": "교사 기록용 한 문장 뼈대 (트리거→교과원리→탐구→성장)",
      "checklist": ["이번 주 할 일 1", "이번 주 할 일 2", "이번 주 할 일 3"]
    }
  },
  "page2": {
    "execution_plan": {
      "subject_table": [
        { "subject": "과목명", "concept": "연계 교과 개념", "question": "탐구 질문", "activity": "구체적 활동", "evidence": "증거물" },
        { "subject": "과목명", "concept": "연계 교과 개념", "question": "탐구 질문", "activity": "구체적 활동", "evidence": "증거물" }
      ],
      "creative_experience": {
        "club_options": [
            { "topic": "동아리 활동 주제", "steps": "실행 3단계 상세 기술 (구체적 활동 내용 포함)", "evidence": "결과물" }
        ],
        "career_options": [
            { "topic": "진로 활동 주제", "steps": "실행 3단계 상세 기술 (구체적 활동 내용 포함)", "evidence": "결과물" }
        ],
        "autonomous_options": [
            { "topic": "자율 활동 주제", "steps": "실행 3단계 상세 기술 (구체적 활동 내용 포함)", "evidence": "결과물" }
        ]
      },
      "consulting_questions": [
        "질문 1", "질문 2", "질문 3", "질문 4", "질문 5", "질문 6"
      ]
    }
  },
  "trigger_bank": {
    "books": [
      { "title": "도서명", "author": "저자", "desc": "핵심 내용 상세 서술 (줄거리 및 주요 논점 포함)", "connection": "활용: 과목/활동 연결" }
    ],
    "keywords": [
      { "keyword": "키워드명", "desc": "정의 및 상세 설명", "connection": "활용: 탐구 주제 연결" }
    ]
  }
}`;

        // [Priority Logic] 1. Settings (User Override) -> 2. DB (Official) -> 3. Code (Hardcoded Default)

        // 1. System Prompt
        let systemPrompt = '';
        let sysSource = '';

        if (settings.systemPrompt && settings.systemPrompt.trim().length > 10) {
            systemPrompt = settings.systemPrompt;
            sysSource = 'SETTINGS (User Input)';
        } else {
            systemPrompt = await this.getPrompt('탐구보고서 가이드', 'system', defaultSystemPrompt);
            sysSource = (systemPrompt === defaultSystemPrompt) ? 'HARDCODED DEFAULT (Code)' : 'DATABASE (Supabase)';
        }

        // [Smart Override] Detect Legacy Schema (String-based page1) and specific "Summary Card" headers
        // The legacy prompt had "page1": "..." string definition OR outputted "=== (Page 1)" headers.
        if (systemPrompt.includes('"page1": "') || systemPrompt.includes('=== (Page 1)')) {
            console.warn('[System Prompt Override] Legacy Text-Mode Prompt detected. Forcing Rich-Mode Default.');
            systemPrompt = defaultSystemPrompt;
            sysSource = 'FORCED DEFAULT (Legacy Protection)';
        }

        // [Debug] Verify System Prompt Source
        console.log(`%c 🔧 [System Prompt Source] Using ${sysSource}`, 'background: #222; color: #bada55; font-size: 12px; padding: 4px;');

        const defaultUserPromptTemplate = `[학생 데이터]
- 목표 학과: {{target_major}}
- 기수강 완료 과목: {{completed_subjects}}
- 현재 이수 중 과목: {{inprogress_subjects}}
- 향후 이수 예정 과목: {{planned_subjects}}
- 대상 학과 전체 권장 과목 리스트: {{target_recommended}}
- 내신 성적: {{gpa}}

위 데이터를 바탕으로 탐구 가이드를 생성해 주세요.
(참고: 기수강 과목은 이미 배운 심화연계, 이수 중 과목은 현재 진행할 수 있는 프로젝트, 이수 예정 과목은 앞으로의 학업계획(동기부여) 위주로 세특과 활동을 구성하면 더욱 좋습니다.)`;

        // 2. User Prompt
        let userPrompt = '';
        if (settings.userPromptTemplate && settings.userPromptTemplate.trim().length > 10) {
            userPrompt = settings.userPromptTemplate;
        } else {
            userPrompt = await this.getPrompt('탐구보고서 가이드', 'user', defaultUserPromptTemplate);
        }

        // Dynamic Injection
        console.log('AI Context for Prompt:', context);

        const safeReplace = (text, key, value) => {
            const val = value || '(정보 없음)';
            // simple replaceAll equivalent
            return text.split(key).join(val);
        };

        userPrompt = safeReplace(userPrompt, '{{gpa}}', student.gpa);

        // [New] 세분화된 상태별 과목 주입
        userPrompt = safeReplace(userPrompt, '{{completed_subjects}}', (student.completedSubjects || []).join(', '));
        userPrompt = safeReplace(userPrompt, '{{inprogress_subjects}}', (student.inprogressSubjects || []).join(', '));
        userPrompt = safeReplace(userPrompt, '{{planned_subjects}}', (student.plannedSubjects || []).join(', '));

        // 기존 DB 프롬프트(이전 버전)와의 하위 호환성을 위해 통합 subjects 치환도 유지
        const allStudentSubjects = [
            ...(student.completedSubjects || []),
            ...(student.inprogressSubjects || []), // [New] Include in-progress subjects
            ...(student.plannedSubjects || []) // Ensure planned subjects are also sent to AI
        ];
        userPrompt = safeReplace(userPrompt, '{{subjects}}', allStudentSubjects.join(', '));

        userPrompt = safeReplace(userPrompt, '{{target_univ}}', target.univ);
        userPrompt = safeReplace(userPrompt, '{{target_major}}', target.major);
        // Legacy template might use {{course}} for planned subjects
        const legacyCourseValue = student.plannedSubjects && student.plannedSubjects.length > 0 
            ? student.plannedSubjects.join(', ') 
            : (target.futureSubjects || []).join(', ');
        userPrompt = safeReplace(userPrompt, '{{course}}', legacyCourseValue);
        userPrompt = safeReplace(userPrompt, '{{target_recommended}}', target.recommendedSubjects.join(', '));

        // Legacy / User Template Support
        userPrompt = safeReplace(userPrompt, '{{univ}}', target.univ);
        userPrompt = safeReplace(userPrompt, '{{major}}', target.major);

        // Force JSON structure in system prompt if not present
        if (!systemPrompt.includes('[IMPORTANT]')) {
            if (systemPrompt.includes('page1')) {
                // User provided a custom schema (likely the Text-Block one), but needs the enforcement header
                systemPrompt += `\n\n[IMPORTANT] Output strictly in JSON format as defined in the prompt above. Return ONLY the JSON object.`;
            } else {
                // No schema detected, append the default Full Schema
                const schemaPart = defaultSystemPrompt.split('[필수 출력 형식]')[1];
                if (schemaPart) {
                    systemPrompt += `\n\n[IMPORTANT] Output strictly in JSON format as defined:\n` + schemaPart;
                }
            }
        }

        console.group('🤖 Gemini AI Request');
        console.log('%c Model:', 'color: #10B981; font-weight: bold;', modelName);
        console.log('System Prompt:', systemPrompt);
        console.log('User Prompt:', userPrompt);
        console.groupEnd();

        try {
            // [Security Update] Use Proxy API
            const url = '/api/generate';

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    contents: [{ parts: [{ text: userPrompt }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    generationConfig: {
                        temperature: temperature,
                        topP: topP,
                        topK: topK,
                        maxOutputTokens: maxOutputTokens,
                        responseMimeType: "application/json"
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Gemini API 호출에 실패했습니다.');
            }

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            // [DEV] Local Mock Server Support
            // If the response is already the parsed data (has page1/page2), return it directly.
            if (data.page1 || data.page2) {
                console.log('Using Mock Data from Local Server');
                return data;
            }

            if (!data.candidates || data.candidates.length === 0) {
                console.error('Gemini API Error: No candidates returned', data);
                throw new Error('AI 모델이 응답을 생성하지 못했습니다. (No candidates)');
            }

            const text = data.candidates[0].content.parts[0].text;

            // --- Robust JSON Extraction ---
            let parsedData = null;

            const tryParse = (str) => {
                try { return JSON.parse(str); } catch (e) { return null; }
            };

            // Strategy 1: Markdown Code Block
            const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (mdMatch) {
                parsedData = tryParse(mdMatch[1]);
            }

            // Strategy 2: Direct Regex (Greedy) -> Retry with Backtracking
            if (!parsedData) {
                const firstOpen = text.indexOf('{');
                let lastClose = text.lastIndexOf('}');

                if (firstOpen !== -1 && lastClose !== -1) {
                    // Try longest match first
                    let candidate = text.substring(firstOpen, lastClose + 1);
                    parsedData = tryParse(candidate);

                    // Backtracking: If failed, try finding previous '}' (Handle trailing text with braces)
                    while (!parsedData && lastClose > firstOpen) {
                        lastClose = text.lastIndexOf('}', lastClose - 1);
                        if (lastClose === -1) break;
                        candidate = te# [출력 구조 및 작성 가이드]
1. diagnosis (진단)
  - match_score: 전공 적합도 점수 (1~100 사이의 정수. 100이 가장 완벽한 적합도).
  - overall_evaluation: 전체적인 평가 코멘트 (3~4문장). 잘된 점과 부족한 점을 총평해줘.
  - academic_feasibility: 주요 교과 성적(내신 등급 등)과 선택 과목 이수 현황을 바탕으로, 해당 전공 지원 시 학업적 유불리 및 정량적 합격 가능성을 냉철하게 진단하는 코멘트 (3~4문장).
2. analysis (학업 성취 및 교과/비교과 분석)
  - grade_trend: 전체 학기 성적 추이(상승/하락/유지)를 분석하고, 이 학업 곡선을 향후 자소서/면접에서 어떤 강점 스토리텔링으로 풀어낼지 제안 (2~3문장).
  - elective_subject_evaluation: 전공 관련 진로/심화 선택 과목 이수 여부 및 성취도 평가. 학과 특성을 고려해 부족한 과목이 있다면 지적 (2~3문장).
  - weak_subject_strategy: 현재 가장 성적이 저조하거나 취약한 전공 관련 주요 과목을 짚고, 이를 다음 학기 '세특'이나 '창체' 보고서 주제로 어떻게 방어하고 극복할 수 있을지 구체적 가이드 제시 (2~3문장).
  - strengths: 기재된 생기부 내용 중 전공과 잘 맞는 활동이나 과목 세특 (2개). (주의: 단순 요약 금지. 증거 기반으로 입학 사정관 관점에서 3~4문장 심층 서술)
  - weaknesses: 전공 대비 부족하거나 아쉬운 부분 혹은 내용이 부실한 활동 (2개). (주의: 증거 기반으로 입시에 끼치는 영향을 3~4문장 심층 서술)
3. improvement_guide (보강 가이드)
  - 다음 학기에 전공 적합성을 높이기 위해 반드시 수행해야 할 심화 탐구 주제 제안 (3개).
  - subject_or_activity: "어떤 과목" 혹은 "어떤 동아리/진로활동" 연계인지 구체적 명시.
  - suggested_action: 단순 조사를 넘어 "1) 탐구 가설/목표, 2) 구체적 학술 논문/서적 매체, 3) 분석 방법론, 4) 도출할 결과물"의 4단계를 반드시 포함하여 4~5문장 이상 아주 촘촘하고 상세히 작성하라.

[필수 출력 형식]
JSON 형식으로만 반환해. 포맷은 아래와 같아야 해.

{
  "diagnosis": {
    "match_score": 85,
    "overall_evaluation": "종합 평가...",
    "academic_feasibility": "교과 성적 기반 정량적 합격 가능성 진단..."
  },
  "analysis": {
    "grade_trend": "성적 추이 및 스토리텔링 방안...",
    "elective_subject_evaluation": "진로 선택 과목 평가...",
    "weak_subject_strategy": "취약 과목 세특 방어 전략...",
    "strengths": [
      { "point": "강점 요약", "detail": "상세 분석 내용" }
    ],
    "weaknesses": [
      { "point": "약점 요약", "detail": "상세 분석 내용" }
    ]
  },
  "improvement_guide": [
    { "subject_or_activity": "과목명 또는 창체명", "suggested_action": "구체적인 심화 탐구 제안 내용" }
  ]
}
\`;��싱 서버로 파일을 전송 중입니다...');
        
        const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'raw',
                'X-Goog-Upload-Command': 'start, upload, finalize',
                'X-Goog-Upload-Header-Content-Length': file.size.toString(),
                'X-Goog-Upload-Header-Content-Type': file.type,
                'Content-Type': file.type
            },
            body: file
        });
        
        if (!uploadRes.ok) {
            const err = await uploadRes.json();
            throw new Error(err.error?.message || 'Gemini 서버로 문서를 업로드하는데 실패했습니다.');
        }
        
        const uploadData = await uploadRes.json();
        const geminiFile = uploadData.file;
        
        // Polling loop for PDF processing
        if (progressCallback) progressCallback('안전한 보안 환경에서 문서 처리 및 OCR을 진행 중입니다. (파일 크기에 따라 수십 초 소요될 수 있습니다)');
        
        let state = geminiFile.state;
        while (state === 'PROCESSING') {
            await new Promise(r => setTimeout(r, 5000)); // wait 5 seconds
            
            // Extract the simple name from the file (e.g. "files/xyz")
            const checkUrl = `https://generativelanguage.googleapis.com/v1beta/${geminiFile.name}?key=${apiKey}`;
            const checkRes = await fetch(checkUrl);
            if (!checkRes.ok) {
                 const err = await checkRes.json();
                 throw new Error(err.error?.message || '파일 상태 확인 실패');
            }
            const checkData = await checkRes.json();
            state = checkData.state;
            
            if (state === 'FAILED') {
                throw new Error('Gemini API에서 문서 처리를 실패했습니다.');
            }
        }
        
        return geminiFile;
    }

    /**
     * [NEW] 생기부 첨삭 컨설팅 전용 AI 분석
     */
    async analyzeStudentRecord(context, recordText, geminiFile = null) {
        const settings = dataManager.getData().appSettings || {};
        let apiKey = settings.geminiApiKey;
        if (!apiKey && window.dbService) {
            apiKey = await dbService.getApiKey('llm_api');
        }
        
        if (!apiKey) {
            throw new Error('API 키가 설정되지 않았습니다. 관리자 설정이나 데이터베이스를 확인하세요.');
        }

        const modelName = settings.geminiModel || this.MODEL;
        const { student, target } = context;

        const systemPrompt = `
# [시스템 역할]
너는 대한민국 일반고 생기부 분석 및 입시 전문 컨설턴트야. 
제공된 [학생 생기부 텍스트 또는 문서]를 꼼꼼히 읽고, 학생이 설정한 [목표 전공]과의 적합도를 냉철하게 분석해.

# [입력 데이터]
- 목표 대학: ${target.univ}
- 목표 학과: ${target.major}
- 기수강 과목: ${(student.completedSubjects || []).join(', ')}

# [출력 구조 및 작성 가이드]
1. diagnosis (진단)
  - match_score: 전공 적합도 점수 (1~100 사이의 정수. 100이 가장 완벽한 적합도).
  - overall_evaluation: 전체적인 평가 코멘트 (3~4문장). 잘된 점과 부족한 점을 총평해줘.
  - academic_feasibility: 주요 교과 성적(내신 등급 등)과 선택 과목 이수 현황을 바탕으로, 해당 전공 지원 시 학업적 유불리 및 정량적 합격 가능성을 냉철하게 진단하는 코멘트 (3~4문장).
2. analysis (학업 성취 및 교과/비교과 분석)
  - grade_trend: 전체 학기 성적 추이(상승/하락/유지)를 분석하고, 이 학업 곡선을 향후 자소서/면접에서 어떤 강점 스토리텔링으로 풀어낼지 제안 (2~3문장).
  - elective_subject_evaluation: 전공 관련 진로/심화 선택 과목 이수 여부 및 성취도 평가. 학과 특성을 고려해 부족한 과목이 있다면 지적 (2~3문장).
  - weak_subject_strategy: 현재 가장 성적이 저조하거나 취약한 전공 관련 주요 교과목을 짚고, 이를 다음 학기 '세특'이나 '창체' 심화 탐구로 어떻게 방어하고 극복할 수 있을지 구체적 가이드 제시 (2~3문장).
  - strengths: 기재된 생기부 내용 중 전공과 잘 맞는 활동이나 과목 세특 (2개). (주의: 단순 요약 금지. 증거 기반으로 입학 사정관 관점에서 3~4문장 심층 서술)
  - weaknesses: 전공 대비 부족하거나 아쉬운 부분 혹은 내용이 부실한 활동 (2개). (주의: 위와 동일하게 구체적인 부족 사유와 입시에 끼치는 영향을 3~4문장 심층 서술)
3. improvement_guide (보강 가이드)
  - 다음 학기에 전공 적합성을 높이기 위해 반드시 수행해야 할 활동이나 심화 탐구 주제 제안 (3개).
  - subject_or_activity: "어떤 과목" 혹은 "어떤 동아리/진로활동" 연계인지 구체적 명시.
  - suggested_action: 학생이 수행할 심화 탐구 주제 제안. 단순 조사를 넘어 "1) 탐구 가설/목표, 2) 구체적 학술 논문/서적 활용 매체, 3) 심화 탐구(분석) 방법론, 4) 도출할 결과물"의 4단계를 반드시 포함하여 4~5문장 이상 아주 상세히 작성하라.

[필수 출력 형식]
JSON 형식으로만 반환해. 포맷은 아래와 같아야 해.

{
  "diagnosis": {
    "match_score": 85,
    "overall_evaluation": "종합 평가...",
    "academic_feasibility": "교과 성적 기반 정량적 합격 가능성 진단 코멘트..."
  },
  "analysis": {
    "grade_trend": "성적 추이 서사 전략...",
    "elective_subject_evaluation": "진로 심화 선택 과목 이수 평가...",
    "weak_subject_strategy": "취약 교과목 세특 방어 전략...",
    "strengths": [
      { "point": "강점 요약", "detail": "상세 분석 내용" }
    ],
    "weaknesses": [
      { "point": "약점 요약", "detail": "상세 분석 내용" }
    ]
  },
  "improvement_guide": [
    { "subject_or_activity": "과목명 또는 창체명", "suggested_action": "구체적인 심화 탐구 제안 내용" }
  ]
}
`;

        let finalRecordText = recordText;

        if (geminiFile) {
            console.log('Executing Two-Track LLM: Step 1 - Smart Extraction (gemini-3.1-pro-preview)...');
            const ocrPrompt = `[스마트 추출 지시 지침]
이 첨부된 생기부 문서(PDF/스캔본)에서 입시 컨설팅에 필요한 핵심 정보만 텍스트로 구조화하여 추출하라.
1. 교과 성적표(내신 등급, 원점수, 성취도 평가 등) 데이터는 가장 핵심이므로 절대 삭제하거나 요약하지 말고, 전체 학기 성적 추이와 선택 과목(진로/탐구) 이수 내역을 낱낱이 추출할 것.
2. 행정적 서론 등 불필요한 부분은 과감히 버릴 것.
3. '세부능력 및 특기사항', '창체활동' 등에서 학생의 [구체적인 탐구 내용, 지적 호기심, 역량] 위주로 철저히 발췌할 것.
4. (중요) 본문 추출 전 상단에 [역량 요약] 섹션을 별도로 만들고, 입학 사정관 관점에서 파악된 학생의:
   가) 뚜렷한 전공 관심사
   나) 학업적 강점 (성적 우수 과목 및 우수 세특 포함)
   다) 부족하거나 보완이 필요한 부분 (성적 취약 과목 및 미흡 세특 포함)
   위 3가지를 명확히 분류하여 3~4줄로 요약 작성할 것.
5. 이후 마크다운으로 깔끔하게 본문 요약을 반환할 것.`;

            const ocrBody = {
                contents: [{
                    role: 'user',
                    parts: [
                        { text: ocrPrompt },
                        { fileData: { fileUri: geminiFile.uri, mimeType: geminiFile.mimeType } }
                    ]
                }],
                generationConfig: { maxOutputTokens: 8192, temperature: 0.2 }
            };

            const ocrResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ocrBody)
            });

            if (!ocrResponse.ok) {
                const errData = await ocrResponse.json();
                throw new Error(errData.error?.message || '스마트 텍스트 추출 중 OCR API 호출에 실패했습니다.');
            }

            const ocrData = await ocrResponse.json();
            
            const ocrCandidate = ocrData.candidates?.[0];
            if (!ocrCandidate || !ocrCandidate.content || !ocrCandidate.content.parts) {
                let reason = 'AI 모델(추출)의 응답 형식이 올바르지 않습니다.';
                if (ocrCandidate?.finishReason === 'MAX_TOKENS') reason = '생기부가 너무 방대하여 스마트 파싱 한도를 초과했습니다. 일부 페이지만 시도해주세요.';
                else if (ocrCandidate?.finishReason === 'SAFETY') reason = '안전성 필터로 인해 문서 파싱이 차단되었습니다.';
                throw new Error(reason);
            }

            finalRecordText = ocrCandidate.content.parts[0].text;
            console.log('Step 1 (Smart Extraction) 완료. 추출된 텍스트 변환:', finalRecordText.substring(0, 100) + '...');
        }

        const userPrompt = `[학생의 요약/추출된 생활기록부 문서 텍스트]\n\n${finalRecordText}\n\n위 생기부의 핵심 요약본을 바탕으로 진단 및 컨설팅 세부 JSON을 생성해줘.`;
        const contentParts = [
            { text: systemPrompt + '\n\n' + userPrompt }
        ];
        
        console.log(`Executing Two-Track LLM: Step 2 - Main JSON Analysis (${modelName})...`);

        try {
            const requestBody = {
                contents: [
                    {
                        role: 'user',
                        parts: contentParts
                    }
                ],
                generationConfig: {
                    temperature: 0.7, // Increased slightly for better multi-page reasoning
                    maxOutputTokens: 8192, // Increased significantly from 2048 to prevent cutoff
                }
            };

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Gemini API Error details:", JSON.stringify(errorData, null, 2));
                throw new Error(errorData.error?.message || 'Gemini API 호출에 실패했습니다.');
            }

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            if (!data.candidates || data.candidates.length === 0) {
                console.error("Gemini Response Missing Candidates:", data);
                throw new Error('AI 모델이 응답을 생성하지 못했습니다.');
            }

            const candidate = data.candidates[0];
            if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                console.error("Gemini Response Missing Content Parts:", data);
                let reasonMsg = 'AI 모델의 응답 형식이 올바르지 않습니다.';
                if (candidate.finishReason === 'MAX_TOKENS') {
                    reasonMsg = '생기부 문서가 너무 길어 AI 분석 토큰 한도를 초과했습니다. 문서를 요약하거나 일부만 올려주세요.';
                } else if (candidate.finishReason === 'SAFETY') {
                    reasonMsg = 'AI 모델 안전성 필터에 의해 분석이 차단되었습니다. 문서 내용이 검증 정책에 위배될 수 있습니다.';
                } else if (candidate.finishReason === 'RECITATION') {
                    reasonMsg = 'AI 모델이 다른 저작물을 너무 많이 인용하여 분석이 차단되었습니다.';
                }
                throw new Error(reasonMsg);
            }

            const text = candidate.content.parts[0].text;
            let parsedData = null;
            const tryParse = (str) => { try { return JSON.parse(str); } catch (e) { return null; } };

            const mdMatch = text.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/);
            if (mdMatch) parsedData = tryParse(mdMatch[1]);

            if (!parsedData) {
                const firstOpen = text.indexOf('{');
                let lastClose = text.lastIndexOf('}');
                if (firstOpen !== -1 && lastClose !== -1) {
                    let candidate = text.substring(firstOpen, lastClose + 1);
                    parsedData = tryParse(candidate);
                }
            }

            if (!parsedData || !parsedData.diagnosis) {
                console.error('Failed to parse JSON. Raw Text:', text);
                throw new Error('AI 응답에서 유효한 JSON 데이터를 추출할 수 없습니다.');
            }

            console.log('AI Record Review Response:', parsedData);
            return parsedData;

        } catch (error) {
            console.error('Record Review AI Service Error:', error);
            throw error;
        }
    }
}

const aiService = new AIService();
window.aiService = aiService;
