import http.server
import socketserver
import json
import os

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/generate':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # Mock Response Data (Schema D Compatible)
            mock_response = {
                "page1": {
                    "summary": {
                        "anchor_theme": "도시 데이터 기반의 스마트 에코 디자인",
                        "sub_keywords": ["건축학", "데이터분석", "환경공학"],
                        "profile_summary": "학생은 수학적 분석 능력과 환경에 대한 관심을 바탕으로, 도시 내 환경 문제를 데이터로 해결하려는 건축학적 접근을 보여줍니다.",
                        "representative_outputs": [
                            {
                                "title": "도시 열섬 현상 데이터 매핑 및 친환경 건축 솔루션 제안",
                                "detail": "(WHY 폭염 문제 심각) -> (WHAT 아두이노 온습도 센서로 학교 주변 열지도 작성) -> (HOW 옥상 녹화 유무에 따른 온도 차이 비교 분석) -> (RESULT 데이터 기반의 쿨루프 및 수직 정원 도입 효과 입증)"
                            },
                            {
                                "title": "교내 에너지 효율 최적화를 위한 IoT 센서 네트워크 설계",
                                "detail": "(WHY 에너지 낭비) -> (WHAT 교실별 조도 및 재실 감지 센서 프로토타입 제작) -> (HOW 시간대별 에너지 사용 패턴 머신러닝 분석) -> (RESULT 스마트 조명 제어 시스템 알고리즘 도출)"
                            }
                        ],
                        "teacher_record_guide": "위 학생은 '건축과 데이터의 융합'이라는 명확한 진로 동기를 가지고 있으며, 단순히 공간을 구성하는 것을 넘어 공학적 데이터를 근거로 환경 문제를 해결하려는 탐구 태도가 돋보임.",
                        "checklist": [
                            "학교 주변 열섬 현상 측정 데이터 수집 완료",
                            "건축학 관련 도서 '보이지 않는 도시' 독후감 작성",
                            "수학 동아리에서 통계적 분석 방법론 발표"
                        ]
                    }
                },
                "page2": {
                    "execution_plan": {
                        "subject_table": [
                            {
                                "subject": "수학II",
                                "concept": "미분과 변화율",
                                "question": "도시의 시간대별 온도 변화율을 미분을 통해 순간 변화율로 해석할 수 있는가?",
                                "activity": "온도 그래프 위목록/아래볼록 구간 분석을 통한 열축적 패턴 파악",
                                "evidence": "변화율 그래프 분석 보고서"
                            },
                            {
                                "subject": "물리학I",
                                "concept": "열역학 법칙",
                                "question": "건축 자재별 열전도율 차이가 실내 냉방 부하에 미치는 영향은 무엇인가?",
                                "activity": "단열재 종류에 따른 열평형 도달 시간 실험",
                                "evidence": "단열 효율 비교 실험 데이터 시트"
                            }
                        ],
                        "creative_experience": {
                            "club_options": [
                                {
                                    "topic": "친환경 건축 모델링 프로젝트",
                                    "steps": "1. SketchUp을 활용한 3D 모델링 2. 일조량 시뮬레이션 플러그인 활용 3. 최적의 창문 배치 도출",
                                    "evidence": "3D 모델링 렌더링 이미지 및 일조 분석 영상"
                                }
                            ],
                            "career_options": [],
                            "autonomous_options": [],
                            "consulting_questions": ["이 탐구를 통해 건축가가 갖춰야 할 공학적 소양은 무엇이라고 느꼈는가?"]
                        }
                    }
                },
                "trigger_bank": {
                    "books": [
                        { "title": "건축, 음악처럼 듣고 미술처럼 보다", "desc": "건축의 인문학적 해석", "connection": "건축의 사회적 가치 이해" }
                    ],
                    "keywords": [
                        { "keyword": "스마트시티", "desc": "ICT 기술을 융합한 도시", "connection": "미래 도시 건축 트렌드 파악" }
                    ]
                },
                "checklist": []
            }

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(mock_response).encode('utf-8'))
        else:
            super().do_POST()

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Serving QA Test Server at port {PORT}")
    httpd.serve_forever()
