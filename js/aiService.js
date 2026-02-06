/**
 * aiService.js
 * Gemini 3.0 Flash API 연동 및 프롬프트 관리
 */
class AIService {
    constructor() {
        this.MODEL = 'gemini-3-pro-preview'; // Default updated to 3 Pro
        this.apiKey = null; // Cache key
    }

    async ensureApiKey() {
        if (this.apiKey) return this.apiKey;

        const settings = dataManager.getData().appSettings || {};

        // 1. Try DB first (Primary)
        try {
            const dbKey = await dbService.getApiKey('llm_api');
            if (dbKey) {
                this.apiKey = dbKey;
                console.log('✅ API Key fetched from DB');
                return this.apiKey;
            }
        } catch (e) {
            console.warn('Failed to fetch key from DB:', e);
        }

        // 2. Fallback to Local Settings (Secondary - Dev/Override)
        if (settings.geminiKey) {
            this.apiKey = settings.geminiKey;
            console.log('⚠️ API Key used from Local Settings (Fallback)');
            return this.apiKey;
        }

        throw new Error('Google Gemini API Key가 설정되지 않았습니다. (DB common_info[llm_api] 또는 설정 확인 필요)');
    }

    /**
     * Get Available Gemini Models
     * Returns all models containing "gemini" in their name, sorted by version (descending).
     */
    async getAvailableModels() {
        try {
            const apiKey = await this.ensureApiKey();
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }

            const data = await response.json();

            // Filter: Show Gemini 2.5/3.x and Gemma 3 models
            // Exclude internal/noise models (Nano, Banana, TTS, Audio)
            const models = data.models.filter(m => {
                const name = m.name.toLowerCase();
                const displayName = (m.displayName || '').toLowerCase();

                const isFamilyMatch = name.includes('gemini') || name.includes('gemma');
                const isVersionMatch = name.includes('2.5') || name.includes('3'); // Matches "3.0", "3", "3-pro"

                // Strict Exclusion List
                const isExcluded = name.includes('banana') || name.includes('nano') ||
                    name.includes('tts') || name.includes('audio') ||
                    displayName.includes('banana') || displayName.includes('nano') ||
                    displayName.includes('tts') || displayName.includes('audio');

                return isFamilyMatch && isVersionMatch && !isExcluded;
            }).map(m => ({
                name: m.name.replace('models/', ''),
                displayName: m.displayName,
                description: m.description,
                version: m.version || ''
            }));

            // Sort: Newest versions first (Descending)
            models.sort((a, b) => {
                const getVer = (name) => {
                    const match = name.match(/(\d+\.\d+)/);
                    return match ? parseFloat(match[1]) : 0;
                };
                return getVer(b.name) - getVer(a.name);
            });

            return models;

        } catch (error) {
            console.error('Error fetching models:', error);
            // Fallback
            return [
                { name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
                { name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' }
            ];
        }
    }

    /**
     * Chatbot API Call
     */
    async chat(userMessage, history = []) {
        const apiKey = await this.ensureApiKey();
        const settings = dataManager.getData().appSettings || {};
        const temperature = parseFloat(settings.temperature) || 0.7;
        const systemPrompt = settings.systemPrompt || "당신은 입시 컨설팅 AI 챗봇입니다. 학생의 질문에 친절하고 전문적으로 답변하세요.";

        console.group('🤖 Gemini AI Chat Request');
        console.log('Model:', this.MODEL);
        console.log('Message:', userMessage);
        console.groupEnd();

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
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
                console.error('Gemini Chat Error:', errorData);
                throw new Error(errorData.error?.message || 'Chat API 호출 실패');
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            console.error('Chat Service Error:', error);
            throw error;
        }
    }

    /**
     * 탐구 주제 및 가이드 생성 (Stage 2)
     */
    async generateExplorationGuide(context) {
        const apiKey = await this.ensureApiKey();
        const settings = dataManager.getData().appSettings || {};
        const temperature = parseFloat(settings.temperature) || 0.7;

        const { student, target } = context;

        const defaultSystemPrompt = "당신은 대한민국 대학 입시 전문 컨설턴트입니다. 학생의 생활기록부 '세부능력 및 특기사항(세특)'에 기재할 수 있는 수준 높고 창의적인 심화 탐구 주제를 제안하는 것이 임무입니다.";
        const systemPrompt = settings.systemPrompt || defaultSystemPrompt;

        const defaultUserPromptTemplate = `
[학생 정보]
- 내신 성적: {{gpa}}등급
- 이수한 과목: {{subjects}}

[희망 대학 및 학과]
- 목표 대학: {{target_univ}}
- 목표 학과: {{target_major}}
- 학과 권장 과목: {{target_recommended}}

[요청 사항]
1. 학생의 목표 학과와 연계된 [심화 탐구 주제]를 1가지 선정하세요. 창의적이고 학술적인 깊이가 있어야 합니다.
2. [주제 선정 논리(Chain-of-Thought)]를 통해, 왜 이 주제가 학생의 이수 과목 및 목표 학과와 연결되는지 논리적으로 설명하세요.
3. 주제와 관련된 [전문가 추천 도서]를 2권 이상 선정하고, 추천 이유를 간략히 덧붙이세요.
4. 다음 JSON 형식을 엄격히 지켜 답변하세요. (마크다운 기호 없이 순수 JSON만 반환)

{{json_format}}`;

        let userPrompt = settings.userPromptTemplate || defaultUserPromptTemplate;

        // Dynamic Injection
        userPrompt = userPrompt
            .replace('{{gpa}}', student.gpa)
            .replace('{{subjects}}', student.completedSubjects.join(', ') || '정보 없음')
            .replace('{{target_univ}}', target.univ)
            .replace('{{major}}', target.major) // Legacy support
            .replace('{{target_major}}', target.major)
            .replace('{{target_recommended}}', target.recommendedSubjects.join(', '));

        const jsonFormatStructure = `{
  "topic": "주제 명칭",
  "rationale": "주제 선정 논리",
  "background": "탐구 배경",
  "direction": "탐구 방향",
  "books": [
    { "title": "도서명", "author": "저자", "desc": "추천 이유" }
  ],
  "keywords": ["키워드"]
}`;
        userPrompt = userPrompt.replace('{{json_format}}', jsonFormatStructure);

        console.group('🤖 Gemini AI Request');
        console.log('%c Model:', 'color: #10B981; font-weight: bold;', modelName); // Highlighted Log
        console.log('Prompt:', userPrompt);
        console.groupEnd();

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
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
            let text = data.candidates[0].content.parts[0].text;

            // Extract JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) text = jsonMatch[0];

            const parsedData = JSON.parse(text);
            console.log('AI Response:', parsedData);
            return parsedData;

        } catch (error) {
            console.error('AI Service Error:', error);
            throw error;
        }
    }
}

const aiService = new AIService();
