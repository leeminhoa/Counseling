/**
 * aiService.js
 * Gemini 3.0 Flash API 연동 및 프롬프트 관리
 */
class AIService {
    constructor() {
        this.MODEL = 'gemini-2.5-pro'; // Default to Stable 2.5 Pro
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
            { name: 'gemini-3-pro-preview', displayName: 'Gemini 3 Pro (Preview)', description: 'Reasoning-focused experimental model', version: '3.0.0-prev' },
            { name: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', description: 'Enhanced performance model', version: '2.5.0' },
            { name: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', description: 'High-speed, cost-effective model', version: '2.5.0' }
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
            const modelName = settings.geminiModel || this.MODEL;
            const systemPrompt = settings.systemPrompt || "당신은 입시 컨설팅 AI 챗봇입니다. 학생의 질문에 친절하고 전문적으로 답변하세요.";

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
        const temperature = parseFloat(settings.temperature) || 0.7;
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
이번 학기 수강과목: {{target_recommended}}

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

        const defaultUserPromptTemplate = `
[학생 프로필]
- 내신 등급: {{gpa}}
- 수강 과목: {{subjects}}

[목표]
- 대학: {{target_univ}}
- 학과: {{target_major}}
- 이번 학기 수강예정 과목: {{course}}
- 권장 과목: {{target_recommended}}

위 학생이 "학업 역량"과 "전공 적합성"을 모두 입증할 수 있는 최적의 생기부 컨설팅 보고서를 작성해주세요.
반드시 System Prompt에 정의된 JSON 형식을 따라야 합니다.`;

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
        userPrompt = safeReplace(userPrompt, '{{subjects}}', student.completedSubjects.join(', '));

        userPrompt = safeReplace(userPrompt, '{{target_univ}}', target.univ);
        userPrompt = safeReplace(userPrompt, '{{target_major}}', target.major);
        userPrompt = safeReplace(userPrompt, '{{course}}', (target.futureSubjects || []).join(', '));
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
                        candidate = text.substring(firstOpen, lastClose + 1);
                        parsedData = tryParse(candidate);
                    }
                }
            }

            if (!parsedData) {
                console.error('Failed to parse JSON. Raw Text:', text);
                throw new Error('AI 응답에서 유효한 JSON 데이터를 추출할 수 없습니다.');
            }

            console.log('AI Response:', parsedData);
            return parsedData;

        } catch (error) {
            console.error('AI Service Error:', error);
            throw error;
        }
    }
}

const aiService = new AIService();
window.aiService = aiService;
