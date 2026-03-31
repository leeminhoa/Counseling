const fs = require('fs');
let text = fs.readFileSync('/tmp/aiService_backup.js', 'utf-8');

// The backup file /tmp/aiService_backup.js has the corrupted lines 426~466. 
// Let's replace the string cleanly.

const corruptedPart = `                        candidate = te# [출력 구조 및 작성 가이드]
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
\`;싱 서버로 파일을 전송 중입니다...');`;

const replacement = `                        candidate = text.substring(firstOpen, lastClose + 1);
                        parsedData = tryParse(candidate);
                    }
                }
            }

            if (!parsedData || (!parsedData.page1 && !parsedData.page2)) {
                console.error("Failed to parse JSON directly or required fields missing:", text);
                throw new Error('AI 모델의 응답 형식이 올바르지 않습니다.');
            }

            return parsedData;

        } catch (error) {
            console.error('Exploration Guide AI Service Error:', error);
            throw error;
        }
    }

    /**
     * PDF 파싱 후 텍스트 추출 (Gemini 파일 업로드)
     */
    async extractTextFromPDF(file, progressCallback = null) {
        const settings = dataManager.getData().appSettings || {};
        let apiKey = settings.geminiApiKey;
        if (!apiKey && window.dbService) {
            apiKey = await dbService.getApiKey('llm_api');
        }

        if (!apiKey) {
            throw new Error('API 키가 설정되지 않았습니다. 관리자 설정이나 데이터베이스를 확인해 주세요.');
        }

        if (progressCallback) progressCallback('안전한 보안 환경에서 파싱 서버로 파일을 전송 중입니다...');`;

text = text.replace(corruptedPart, replacement);

// Also we need to add the defense instruction to analyzeStudentRecord:
const oldSysPromptInit = `1. diagnosis (진단)`;
const newSysPromptInit = `(주의사항: 만약 제공된 생기부에 교과 성적표 데이터가 심각하게 누락되어 있거나 1학년이라 데이터가 부족하다면, 절대 임의로 지어내지 말고 해당 필드는 '생기부 내 성적/이수 데이터가 충분하지 않아 진단할 수 없습니다.' 와 같은 식으로 솔직하게 답변할 것.)

1. diagnosis (진단)`;

text = text.replace(oldSysPromptInit, newSysPromptInit);

fs.writeFileSync('js/aiService.js', text);
console.log('Done');
