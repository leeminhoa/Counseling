/**
 * aiService.js
 * Gemini 3.0 Flash API 연동 및 프롬프트 관리
 */
class AIService {
    constructor() {
        this.API_KEY = ''; // User should provide this in Admin panel
        this.MODEL = 'gemini-3.0-flash';
    }

    setApiKey(key) {
        this.API_KEY = key;
    }

    /**
     * 탐구 주제 및 가이드 생성 (Stage 2)
     * @param {Object} context { studentProfile, selectedUniv, majorSubjects }
     */
    async generateExplorationGuide(context) {
        const { studentProfile, selectedUniv, majorSubjects } = context;

        const systemPrompt = `당신은 대한민국 대입 입시 컨설턴트입니다. 
학생의 희망 전공(${selectedUniv.raw_major_name})과 관련하여 생기부에 기재할 수 있는 깊이 있는 탐구 주제를 생성하세요.`;

        const userPrompt = `
[학생 정보]
- 내신 성적: ${studentProfile.gpa}
- 희망 대학/학과: ${selectedUniv.univ_name} / ${selectedUniv.raw_major_name}

[관련 교과 정보]
- 권장 과목 리스트: ${majorSubjects.map(s => s.course_name).join(', ')}

[요청 사항]
1. 탐구 주제 1가지를 제안하세요.
2. 해당 주제를 선정하게 된 배경(이유)을 구체적으로 설명하세요.
3. 구체적인 탐구 방향(실험, 조사, 분석 등)을 제시하세요.
4. 탐구에 도움이 될 만한 추천 도서 1권을 포함하세요.
5. 핵심 키워드 3개를 추출하세요.

답변은 반드시 JSON 형식으로 반환하세요.
{
  "topic": "주제명",
  "background": "배경 설명",
  "direction": "탐구 방향 상세",
  "book": "도서명 (저자)",
  "keywords": ["키워드1", "키워드2", "키워드3"]
}`;

        console.log('Gemini Requesting with Context:', context);

        // Simulation for now (Wait 2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock result for UI development
        return {
            topic: `${selectedUniv.raw_major_name} 역량 강화를 위한 ${majorSubjects[0]?.course_name || '진로'} 기반 심화 탐구`,
            background: `학생의 목표 학과인 ${selectedUniv.raw_major_name}에서 요구하는 분석적 사고력을 ${majorSubjects[0]?.course_name || '교과'} 지식과 연결하여 증명하기 위함입니다.`,
            direction: `1. 관련 통계 자료 수집\n2. 알고리즘 모델링 및 검증\n3. 기대 효과 분석 및 보고서 작성`,
            book: "AI 시대의 인간 (홍길동)",
            keywords: ["데이터 분석", "수학적 모델링", "미래 기술"]
        };
    }
}

const aiService = new AIService();
