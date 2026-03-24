const fs = require('fs');

// 1. aiService.js 수정
let aiHtml = fs.readFileSync('js/aiService.js', 'utf-8');

const oldAiSysPrompt = `1. diagnosis (진단)
  - match_score: 전공 적합도 점수 (1~100 사이의 정수. 100이 가장 완벽한 적합도).
  - overall_evaluation: 전체적인 평가 코멘트 (3~4문장). 잘된 점과 부족한 점을 총평해줘.
2. analysis (강점 및 약점 분석)
  - strengths: 기재된 생기부 내용 중 전공과 잘 맞는 활동이나 과목 세특 (2개). (주의: 단순 요약 금지. 생기부 텍스트 기반 증거와 입학 사정관 관점에서 우수한 이유를 논리적으로 3~4문장 서술)
  - weaknesses: 전공 대비 부족하거나 아쉬운 부분, 혹은 내용이 부실한 활동 (2개). (주의: 위와 동일하게 구체적인 부족 사유와 입시에 끼치는 영향을 3~4문장 심층 서술)
3. improvement_guide (보강 가이드)
  - 다음 학기에 전공 적합성을 높이기 위해 반드시 수행해야 할 활동이나 심화 탐구 주제 제안 (3개).
  - subject_or_activity: "어떤 과목" 혹은 "어떤 동아리/진로활동" 연계인지 구체적 명시.
  - suggested_action: 학생이 수행할 심화 탐구 주제 제안. 단순 조사를 넘어 "1) 탐구 가설/목표, 2) 구체적 학술 논문/서적/데이터셋 매체, 3) 심화 탐구(실험/분석) 방법론, 4) 도출할 구체적 결과물"의 [가설-탐구-결론] 4단계를 반드시 포함하여 4~5문장 이상 아주 촘촘하고 상세히 작성하라. (전문 입시 컨설턴트 수준의 퀄리티 요구)`;

const newAiSysPrompt = `1. diagnosis (진단)
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
  - suggested_action: 학생이 수행할 심화 탐구 주제 제안. 단순 조사를 넘어 "1) 탐구 가설/목표, 2) 구체적 학술 논문/서적 활용 매체, 3) 심화 탐구(분석) 방법론, 4) 도출할 결과물"의 4단계를 반드시 포함하여 4~5문장 이상 아주 상세히 작성하라.`;

const oldAiSysJson = `{
  "diagnosis": {
    "match_score": 85,
    "overall_evaluation": "종합 평가..."
  },
  "analysis": {
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
}`;

const newAiSysJson = `{
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
}`;

const oldOcrPrompt = `1. 일반적인 인사말, 단순 점수, 행정적 서론 등 불필요한 부분은 과감히 버릴 것.
2. '세부능력 및 특기사항', '창체활동' 등에서 학생의 [구체적인 탐구 내용, 지적 호기심, 역량] 위주로 철저히 발췌할 것.
3. (중요) 본문 추출 전 상단에 [역량 요약] 섹션을 별도로 만들고, 입학 사정관 관점에서 파악된 학생의:
   가) 뚜렷한 전공 관심사
   나) 학업적 강점
   다) 부족하거나 보완이 필요한 부분
   위 3가지를 명확히 분류하여 3~4줄로 요약 작성할 것.
4. 이후 마크다운으로 깔끔하게 본문 요약을 반환할 것.`;

const newOcrPrompt = `1. 교과 성적표(내신 등급, 원점수, 성취도 평가 등) 데이터는 가장 핵심이므로 절대 삭제하거나 요약하지 말고, 전체 학기 성적 추이와 선택 과목(진로/탐구) 이수 내역을 낱낱이 추출할 것.
2. 행정적 서론 등 불필요한 부분은 과감히 버릴 것.
3. '세부능력 및 특기사항', '창체활동' 등에서 학생의 [구체적인 탐구 내용, 지적 호기심, 역량] 위주로 철저히 발췌할 것.
4. (중요) 본문 추출 전 상단에 [역량 요약] 섹션을 별도로 만들고, 입학 사정관 관점에서 파악된 학생의:
   가) 뚜렷한 전공 관심사
   나) 학업적 강점 (성적 우수 과목 및 우수 세특 포함)
   다) 부족하거나 보완이 필요한 부분 (성적 취약 과목 및 미흡 세특 포함)
   위 3가지를 명확히 분류하여 3~4줄로 요약 작성할 것.
5. 이후 마크다운으로 깔끔하게 본문 요약을 반환할 것.`;

aiHtml = aiHtml.replace(oldAiSysPrompt, newAiSysPrompt);
aiHtml = aiHtml.replace(oldAiSysJson, newAiSysJson);
aiHtml = aiHtml.replace(oldOcrPrompt, newOcrPrompt);
fs.writeFileSync('js/aiService.js', aiHtml);

console.log("aiService.js updated.");
