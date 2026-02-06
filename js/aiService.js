/**
 * aiService.js
 * Gemini 3.0 Flash API 연동 및 프롬프트 관리
 */
class AIService {
    constructor() {
        this.MODEL = 'gemini-3-flash-preview';
        this.API_KEY = ''; // Removed hardcoded key for security
    }

    /**
     * 탐구 주제 및 가이드 생성 (Stage 2)
     * @param {Object} context { student, target }
     */
    async generateExplorationGuide(context) {
        const settings = dataManager.getData().appSettings || {};
        const apiKey = settings.geminiKey || this.API_KEY;

        if (!apiKey) {
            throw new Error('Google Gemini API Key가 설정되지 않았습니다. 설정에서 키를 입력해주세요.');
        }

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
            .replace('{{major}}', target.major) // Legacy support for admin template
            .replace('{{target_major}}', target.major)
            .replace('{{target_recommended}}', target.recommendedSubjects.join(', '));

        // Ensure JSON format instructions exist if user deleted them
        if (!userPrompt.includes('JSON')) {
            userPrompt += `\n\n[답변 형식]\n다음 JSON 형식을 반드시 지켜주세요:\n{\n  "topic": "...",\n  "rationale": "...",\n  "background": "...",\n  "direction": "...",\n  "books": [{"title": "...", "author": "...", "desc": "..."}],\n  "keywords": [...]\n}`;
        }

        // Final fallback for json_format variable if it exists in template
        const jsonFormatStructure = `{
  "topic": "주제 명칭 (구체적이고 학술적인 제목)",
  "rationale": "주제 선정 논리 (과목과 학과를 연결하는 CoT)",
  "background": "탐구 배경 및 필요성 (2~3문장)",
  "direction": "1. [기초 조사] ...\\n2. [심화 분석] ...\\n3. [결론 도출] ...",
  "books": [
    { "title": "도서명", "author": "저자", "desc": "추천 이유(한 줄)" },
    { "title": "도서명", "author": "저자", "desc": "추천 이유(한 줄)" }
  ],
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4"]
}`;
        userPrompt = userPrompt.replace('{{json_format}}', jsonFormatStructure);

        console.group('🤖 Gemini AI Request');
        console.log('Model:', this.MODEL);
        console.log('System Prompt:', systemPrompt);
        console.log('User Prompt:', userPrompt);
        console.groupEnd();

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: systemPrompt + "\n" + userPrompt }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.group('❌ Gemini API Error');
                console.error('Status:', response.status);
                console.error('Error Data:', errorData);
                console.groupEnd();
                throw new Error(errorData.error?.message || 'Gemini API 호출에 실패했습니다.');
            }

            const data = await response.json();
            let text = data.candidates[0].content.parts[0].text;

            console.group('✅ Gemini AI Response');
            console.log('Raw Text:', text);

            // Extract JSON from potential code blocks
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                text = jsonMatch[0];
            }

            const parsedData = JSON.parse(text);
            console.log('Parsed Data:', parsedData);
            console.groupEnd();

            return parsedData;

        } catch (error) {
            console.error('AI Service Error:', error);
            throw error;
        }
    }
}

const aiService = new AIService();
