/**
 * aiService.js
 * Gemini 3.0 Flash API 연동 및 프롬프트 관리
 */
class AIService {
    constructor() {
        this.MODEL = 'gemini-1.5-flash';
        this.API_KEY = 'AIzaSyC72AlExrv9dA7Om0iGXlU_dUuJ3rs2zjg'; // Hardcoded for immediate use
    }

    /**
     * 탐구 주제 및 가이드 생성 (Stage 2)
     * @param {Object} context { student, target }
     */
    async generateExplorationGuide(context) {
        const settings = dataManager.getData().appSettings || {};
        const apiKey = this.API_KEY || settings.apiKey;

        if (!apiKey) {
            throw new Error('API Key가 설정되지 않았습니다.');
        }

        const { student, target } = context;

        const systemPrompt = "당신은 대한민국 대학 입시 전문 컨설턴트입니다. 학생의 생활기록부 '세부능력 및 특기사항(세특)'에 기재할 수 있는 수준 높고 창의적인 심화 탐구 주제를 제안하는 것이 임무입니다.";

        const userPrompt = `
[학생 정보]
- 내신 성적: ${student.gpa}등급
- 이수한 과목: ${student.completedSubjects.join(', ') || '정보 없음'}

[희망 대학 및 학과]
- 목표 대학: ${target.univ}
- 목표 학과: ${target.major}
- 학과 권장 과목: ${target.recommendedSubjects.join(', ')}

[요청 사항]
1. 학생의 목표 학과와 연계된 심화 탐구 주제 1가지를 제안하세요.
2. 학생이 이수한 과목 또는 권장 과목의 개념을 활용하여 주제를 도출하세요.
3. 다음 JSON 형식을 엄격히 지켜 답변하세요. (마크다운 기호 없이 순수 JSON만 반환)

{
  "topic": "주제 명칭",
  "background": "주제 선정 배경 및 연관성 (2~3문장)",
  "direction": "1. 탐구 단계 1\\n2. 탐구 단계 2\\n3. 탐구 단계 3",
  "book": "도서명 (저자)",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}`;

        console.log('🚀 Gemini API call initiated...');

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
                console.error('API Response Error:', errorData);
                throw new Error(errorData.error?.message || 'Gemini API 호출에 실패했습니다.');
            }

            const data = await response.json();
            let text = data.candidates[0].content.parts[0].text;

            // Extract JSON from potential code blocks
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                text = jsonMatch[0];
            }

            return JSON.parse(text);

        } catch (error) {
            console.error('AI Service Error:', error);
            throw error;
        }
    }
}

const aiService = new AIService();
