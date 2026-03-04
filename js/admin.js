/**
 * admin.js
 * Admin: 프롬프트 센터 및 API 설정 관리
 */

const OFFICIAL_JSON_SCHEMA = `
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

// [New] Smart Merge Modal Logic
window.openSmartMergeModal = function () {
    const modal = document.getElementById('smartMergeModal');
    if (modal) modal.style.display = 'block';

    // Auto-fill from current System Prompt if empty
    const currentSys = document.getElementById('sysPrompt').value;
    const mergeInput = document.getElementById('mergeInputPrompt');
    if (mergeInput && !mergeInput.value.trim() && currentSys) {
        mergeInput.value = currentSys;
    }
};

window.closeSmartMergeModal = function () {
    const modal = document.getElementById('smartMergeModal');
    if (modal) modal.style.display = 'none';
};

window.executeSmartMerge = function () {
    const inputEl = document.getElementById('mergeInputPrompt');
    const outputEl = document.getElementById('mergeOutputPrompt');
    const statusEl = document.getElementById('mergeInputStatus');

    const input = inputEl.value;
    if (!input.trim()) {
        outputEl.value = '';
        statusEl.innerHTML = '입력 대기중';
        statusEl.style.background = '#FFFBEB';
        statusEl.style.color = '#D97706';
        return;
    }

    // [Logic] Detection
    const isLegacy = input.includes('"page1": "') || input.includes('=== (Page 1)');

    if (isLegacy) {
        // [Logic] Split & Merge
        statusEl.innerHTML = '⚡ 구버전 감지됨 -> 자동 병합 실행';
        statusEl.style.background = '#ECFDF5';
        statusEl.style.color = '#059669';

        const splitMarkers = ['[출력 구조', '[필수 출력 형식]', '=== (Page 1)'];
        let splitIndex = -1;

        for (const marker of splitMarkers) {
            const idx = input.indexOf(marker);
            if (idx !== -1) {
                if (splitIndex === -1 || idx < splitIndex) splitIndex = idx;
            }
        }

        if (splitIndex !== -1) {
            const userInstructions = input.substring(0, splitIndex).trim();
            const merged = userInstructions + "\n\n" + OFFICIAL_JSON_SCHEMA;
            outputEl.value = merged;
        } else {
            outputEl.value = input + "\n\n" + OFFICIAL_JSON_SCHEMA;
        }

    } else {
        statusEl.innerHTML = '✅ 정상/최신 형식';
        statusEl.style.background = '#ECFDF5';
        statusEl.style.color = '#059669';
        outputEl.value = input;
    }
};

window.copyMergeResult = function () {
    const outputEl = document.getElementById('mergeOutputPrompt');
    outputEl.select();
    document.execCommand('copy');
    showCustomAlert('복사되었습니다!');
};

function renderAdmin(container) {
    const profile = dataManager.getData();
    const settings = profile.appSettings || {};

    container.innerHTML = `
        <div class="admin-container">
            <div class="admin-sidebar">
                <h3 class="admin-title">Settings</h3>
                <div class="admin-nav">
                    <div class="admin-nav-item active" onclick="switchAdminTab('general')"><i class="fa-solid fa-sliders"></i> General Settings</div>
                    <div class="admin-nav-item" onclick="switchAdminTab('prompts')"><i class="fa-solid fa-comment-dots"></i> Prompt Management</div>
                    <div class="admin-nav-item" onclick="switchAdminTab('api')"><i class="fa-solid fa-key"></i> API Keys</div>
                     ${(settings.permission === 1 || settings.permission === 'master' || (profile.appSettings && profile.appSettings.permission === 'master') || (dataManager.currentCounselor && (dataManager.currentCounselor.permission === 1 || dataManager.currentCounselor.permission === 'master'))) ? `
                    <div class="admin-nav-item" onclick="switchAdminTab('counselors')"><i class="fa-solid fa-user-shield"></i> 계정 관리</div>
                    ` : ''}
                </div>
            </div>

            <div class="admin-main">
                <div class="admin-section">
                    <div class="section-header">
                        <h2><i class="fa-solid fa-robot"></i> AI Prompt Engine</h2>
                        <button type="button" class="btn-primary" id="saveAdminBtn"><i class="fa-solid fa-save"></i> 설정 저장</button>
                    </div>

                    <div class="admin-grid">
                        <!-- Left: Prompt Editors -->
                        <div class="admin-col">
                            <div class="form-group">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                                    <label>System Prompt (Persona & Instructions)</label>
                                    <div style="display:flex; gap:0.5rem;">
                                        <button type="button" onclick="openSmartMergeModal()" class="btn-secondary btn-sm" style="font-size:0.8rem; padding: 2px 8px; border-color: #3B82F6; color: #3B82F6;">
                                            <i class="fa-solid fa-wand-magic-sparkles"></i> 포맷 자동보정
                                        </button>
                                        <select id="sysPresetSelect" onchange="setTimeout(() => applyPreset('system', this.value), 50)" style="padding:0.3rem; border-radius:4px; border:1px solid #cbd5e1; font-size:0.8rem; width:180px; background-color: #f8fafc; cursor:pointer;">
                                            <option value="">📂 프리셋 불러오기</option>
                                        </select>
                                    </div>
                                </div>
                                <textarea id="sysPrompt" class="prompt-editor">${settings.systemPrompt || `당신은 대한민국 대입 입시 컨설턴트입니다. 학생의 목표 학과와 교과 이수 현황을 바탕으로, 생활기록부에 기재할 수 있는 깊이 있는 탐구 주제와 활동 방향을 제시하는 것이 당신의 역할입니다. 

[지침]
- 전문적이고 신뢰감 있는 어조를 유지하세요.
- 구체적인 탐구 방법론과 추천 도서를 포함하세요.
- 답변은 반드시 정해진 JSON 형식을 따르세요.`}</textarea>
                            </div>
                            <div class="form-group">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                                    <label>User Prompt Template (Data Injection)</label>
                                    <select id="userPresetSelect" onchange="setTimeout(() => applyPreset('user', this.value), 50)" style="padding:0.3rem; border-radius:4px; border:1px solid #cbd5e1; font-size:0.8rem; width:180px; background-color: #f8fafc; cursor:pointer;">
                                        <option value="">📂 프리셋 불러오기</option>
                                    </select>
                                </div>
                                <textarea id="userPrompt" class="prompt-editor">${settings.userPromptTemplate || `[학생 데이터]
- 목표 학과: {{major}}
- 관련 이수 과목: {{subjects}}
- 내신 성적: {{gpa}}

위 데이터를 바탕으로 탐구 가이드를 생성해 주세요.`}</textarea>
                            </div>
                        </div>

                        <!-- Right: Parameters -->
                        <div class="admin-col props-col">
                            <div class="card param-card" style="display: flex; flex-direction: column; gap: 1.5rem;">
                                <h3><i class="fa-solid fa-sliders"></i> Parameters</h3>
                                
                                <!-- AI Model -->
                                <div class="form-group">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                        <label style="font-weight: 600;"><i class="fa-solid fa-microchip"></i> AI Model</label>
                                    </div>
                                    <div style="position: relative;">
                                        <select id="modelSelect" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-app); appearance: none;">
                                            <option value="gemini-3-pro-preview" ${settings.geminiModel === 'gemini-3-pro-preview' ? 'selected' : ''}>Gemini 3 Pro (Preview)</option>
                                            <option value="gemini-2.5-pro" ${settings.geminiModel === 'gemini-2.5-pro' ? 'selected' : ''}>Gemini 2.5 Pro</option>
                                            <option value="gemini-2.5-flash" ${settings.geminiModel === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash</option>
                                        </select>
                                        <div style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-sub);">
                                            <i class="fa-solid fa-chevron-down"></i>
                                        </div>
                                    </div>
                                    <p class="param-desc">사용할 생성형 AI 모델 엔진을 선택합니다. (Gemini 2.5 Pro 권장)</p>
                                </div>

                                <!-- Temperature -->
                                <div class="form-group">
                                    <div style="display: flex; justify-content: space-between;">
                                        <label>Temperature</label>
                                        <span id="tempVal" style="color: var(--primary-color); font-weight: 600;">${settings.temperature ?? 0.5}</span>
                                    </div>
                                    <input type="range" id="tempSlider" min="0" max="1" step="0.1" value="${settings.temperature ?? 0.5}">
                                    <p class="param-desc">
                                        답변의 <b>창의성(Creativity)</b>을 조절합니다.<br>
                                        <span style="font-size:0.8rem; color:#64748B;">
                                        • 0.2: 논리적, 사실 기반 (분석용)<br>
                                        • 0.8: 창의적, 다양한 표현 (브레인스토밍)
                                        </span>
                                    </p>
                                </div>

                                <!-- Top P -->
                                <div class="form-group">
                                    <div style="display: flex; justify-content: space-between;">
                                        <label>Top P (Nucleus)</label>
                                        <span id="topPValue" style="color: var(--primary-color); font-weight: 600;">${settings.topP ?? 1}</span>
                                    </div>
                                    <input type="range" id="topPInput" min="0" max="1" step="0.05" value="${settings.topP ?? 1}">
                                    <p class="param-desc">
                                        확률 분포의 상위 <b>P%</b> 토큰만 고려합니다.<br>
                                        <span style="font-size:0.8rem; color:#64748B;">
                                        • 낮은 값: 뻔하고 안전한 단어 선택<br>
                                        • 높은 값: 더 다채로운 어휘 사용
                                        </span>
                                    </p>
                                </div>

                                <!-- Top K -->
                                <div class="form-group">
                                    <label style="display: flex; justify-content: space-between;">
                                        Top K <span style="font-size: 0.8rem; color: #999;">(1-100)</span>
                                    </label>
                                    <input type="number" id="topKInput" class="form-input" style="width: 100%; padding: 0.5rem;" value="${settings.topK ?? 40}" min="1" max="100">
                                    <p class="param-desc">
                                        확률 상위 <b>K개</b>의 후보 단어 중에서 선택합니다.<br>
                                        낮을수록 일관성 있고 안정적인 답변이 나옵니다.
                                    </p>
                                </div>

                                <!-- Max Tokens -->
                                <div class="form-group">
                                    <div style="display: flex; justify-content: space-between;">
                                        <label>Max Output Tokens</label>
                                        <span id="maxTokensValue" style="color: var(--primary-color); font-weight: 600;">${settings.maxOutputTokens ?? 8100}</span>
                                    </div>
                                    <input type="range" id="maxTokensInput" min="100" max="8192" step="100" value="${settings.maxOutputTokens ?? 8100}">
                                    <p class="param-desc">
                                        한 번의 응답에서 생성할 <b>최대 길이</b>를 제한합니다.<br>
                                        <span style="font-size:0.8rem; color:#64748B;">입시 컨설팅 리포트는 내용이 길 수 있으므로 <b>4096 이상</b>을 권장합니다.</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            
            <!-- Tab: Prompt Management -->
            <div id="adminTab_prompts" class="admin-tab-content" style="display:none;">
                <div class="admin-section">
                    <div class="section-header">
                        <h2><i class="fa-solid fa-robot"></i> LLM 프롬프트 관리</h2>
                        <button type="button" class="btn-primary" id="btnAddPromptVersion"><i class="fa-solid fa-plus"></i> 새 버전 추가</button>
                    </div>
                    
                    <div class="card" style="margin-bottom:1.5rem;">
                        <div class="form-group">
                            <label><i class="fa-solid fa-layer-group"></i> 프롬프트 그룹 선택</label>
                            <select id="promptGroupSelect" class="styled-input">
                                <option value="">로딩 중...</option>
                            </select>
                        </div>
                    </div>

                    <div id="promptLoading" style="display:none; text-align:center; padding:2rem; color:#64748B;">
                        <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
                    </div>

                    <div id="promptListContainer">
                        <div style="text-align:center; padding:2rem; color:#94A3B8;">그룹을 선택해주세요.</div>
                    </div>
                </div>

                <!-- Modal -->
                <div id="promptModal" class="modal">
                    <div class="modal-content modal-lg">
                        <div class="modal-header">
                            <h2 style="margin:0;">프롬프트 버전 편집</h2>
                            <span class="close" onclick="promptManager.closePromptModal()">&times;</span>
                        </div>
                        
                        <div class="modal-body" style="padding: 2rem;">
                            <form id="promptForm" onsubmit="return false;">
                                <div class="form-group">
                                    <label>제목</label>
                                    <input type="text" id="promptTitle" class="styled-input" placeholder="버전 제목 (예: v1.0 초기 버전)">
                                </div>
                                <div class="form-group">
                                    <label>유형</label>
                                    <select id="promptType" class="styled-input">
                                        <option value="system">System Prompt (페르소나/지침)</option>
                                        <option value="user">User Prompt (데이터 주입)</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>설명</label>
                                    <input type="text" id="promptDesc" class="styled-input" placeholder="변경 사항이나 특징 설명">
                                </div>
                                <div class="form-group">
                                    <label>내용</label>
                                    <textarea id="promptContent" class="prompt-editor" style="height:400px; font-family:monospace; line-height:1.5;"></textarea>
                                </div>
                            </form>
                        </div>

                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" onclick="promptManager.closePromptModal()">취소</button>
                            <button type="button" class="btn-primary" id="btnSavePrompt">저장</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tab: Counselors (Master Only) -->
            <div id="adminTab_counselors" class="admin-tab-content" style="display:none;">
                <div class="admin-section">
                    <div class="section-header">
                        <h2>상담사 계정 관리</h2>
                    </div>
                    
                    <div class="card" style="max-width: 500px;">
                        <h3 style="margin-bottom: 1.5rem;">새 상담사 등록</h3>
                        <div class="form-group">
                            <label>이름</label>
                            <input type="text" id="new_counselor_name" class="styled-input" placeholder="상담사 이름">
                        </div>
                        <div class="form-group">
                            <label>이메일</label>
                            <input type="email" id="new_counselor_email" class="styled-input" placeholder="이메일 주소">
                        </div>
                         <div class="form-group">
                            <label>비밀번호</label>
                            <input type="password" id="new_counselor_password" class="styled-input" placeholder="비밀번호">
                        </div>
                        <button type="button" class="btn-primary" onclick="handleCreateCounselor()" style="width: 100%;">
                            <i class="fa-solid fa-user-plus"></i> 계정 생성
                        </button>
                    </div>
                </div>
            </div>

        </div>

        <!-- Smart Merge Modal -->
        <div id="smartMergeModal" class="modal" style="z-index: 9999; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center;">
            <div class="modal-content modal-xl" style="width: 95%; max-width: 95vw; height: 95vh; display:flex; flex-direction:column;">
                <div class="modal-header">
                    <h2 style="margin:0;"><i class="fa-solid fa-wand-magic-sparkles" style="color: #3B82F6;"></i> 프롬프트 자동 병합 시뮬레이터</h2>
                    <span class="close" onclick="closeSmartMergeModal()">&times;</span>
                </div>
                <div class="modal-body" style="flex:1; padding: 1rem; background: #F1F5F9; display:flex; gap:1rem; overflow:hidden;">
                    <!-- Left Panel -->
                    <div style="flex:1; display:flex; flex-direction:column; background:white; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.05); overflow:hidden;">
                         <div style="background:#E2E8F0; padding:1rem; font-weight:700; color:#475569; display:flex; justify-content:space-between; align-items:center;">
                            📝 사용자 입력 (Settings)
                            <span class="status-badge" id="mergeInputStatus" style="padding:4px 12px; border-radius:20px; font-size:0.8rem; background:#FFFBEB; color:#D97706;">분석 대기중</span>
                         </div>
                         <textarea id="mergeInputPrompt" style="flex:1; padding:1rem; border:none; resize:none; outline:none; font-family:monospace;" placeholder="여기에 선생님의 프롬프트(텍스트 형식 포함)를 붙여넣으세요..."></textarea>
                    </div>

                    <!-- Arrow -->
                    <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; width:60px;">
                        <button onclick="executeSmartMerge()" style="background:#3B82F6; color:white; border:none; width:50px; height:50px; border-radius:50%; cursor:pointer; font-size:1.2rem; box-shadow:0 4px 10px rgba(59,130,246,0.3);"><i class="fa-solid fa-arrow-right"></i></button>
                    </div>

                    <!-- Right Panel -->
                    <div style="flex:1; display:flex; flex-direction:column; background:white; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.05); overflow:hidden;">
                         <div style="background:#E2E8F0; padding:1rem; font-weight:700; color:#475569; display:flex; justify-content:space-between; align-items:center;">
                            ✨ 최종 병합 결과 (To AI)
                            <button onclick="copyMergeResult()" style="background:white; border:1px solid #CBD5E1; padding:4px 8px; border-radius:4px; cursor:pointer;">복사</button>
                         </div>
                         <textarea id="mergeOutputPrompt" readonly style="flex:1; padding:1rem; border:none; resize:none; outline:none; background:#FAFAFA; font-family:monospace;"></textarea>
                    </div>
                </div>
            </div>
        </div>

    </div>
    `;

    // ... (rest of the code)

    window.switchAdminTab = (tabName) => {
        // Sidebar highlighting
        document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
        // This is a simple approximation. Better to use dataset or ids.
        // Let's assume order: general, api, counselors
        // Tab switching logic
        // Updated mapping: 0=General, 1=Prompts, 2=API, 3=Counselors
        const items = document.querySelectorAll('.admin-nav-item');
        if (tabName === 'general' && items[0]) items[0].classList.add('active');
        if (tabName === 'prompts' && items[1]) items[1].classList.add('active');
        if (tabName === 'api' && items[2]) items[2].classList.add('active');
        if (tabName === 'counselors' && items[3]) items[3].classList.add('active');

        // Content switching
        document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');
        const generalSection = document.querySelector('.admin-main > .admin-section:not(#adminTab_counselors):not(#adminTab_prompts)');
        if (generalSection) generalSection.style.display = 'none';

        if (tabName === 'general') {
            if (generalSection) generalSection.style.display = 'block';
        } else if (tabName === 'prompts') {
            const tab = document.getElementById('adminTab_prompts');
            if (tab) {
                tab.style.display = 'block';
                if (window.promptManager && typeof window.promptManager.init === 'function') {
                    // Initialize if mostly first time or reload groups
                    // To avoid flicker we could check a flag, but for now safe to call.
                    if (document.getElementById('promptGroupSelect').options.length <= 1) {
                        window.promptManager.init();
                    }
                }
            }
        } else if (tabName === 'counselors') {
            const tab = document.getElementById('adminTab_counselors');
            if (tab) tab.style.display = 'block';
        } else if (tabName === 'api') {
            showCustomAlert('API Key 관리는 준비 중입니다.');
        }
    };

    window.handleCreateCounselor = async () => {
        const name = document.getElementById('new_counselor_name').value;
        const email = document.getElementById('new_counselor_email').value;
        const password = document.getElementById('new_counselor_password').value;

        if (!name || !email || !password) {
            showCustomAlert('모든 필드를 입력해주세요.');
            return;
        }
        showCustomConfirm(`${name} 상담사 계정을 생성하시겠습니까?`, async () => {
            const btn = document.querySelector('button[onclick="handleCreateCounselor()"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 생성 중...';
            btn.disabled = true;

            const result = await dbService.createCounselor(email, password, name);

            btn.innerHTML = originalText;
            btn.disabled = false;

            if (result.success) {
                showCustomAlert(`계정이 성공적으로 생성되었습니다.\n이메일: ${email}`);
                document.getElementById('new_counselor_name').value = '';
                document.getElementById('new_counselor_email').value = '';
                document.getElementById('new_counselor_password').value = '';
            } else {
                showCustomAlert('계정 생성 실패: ' + result.message);
            }
        });
    };

    // Initialize UI from Settings
    if (settings) {
        if (document.getElementById('tempSlider')) {
            document.getElementById('tempSlider').value = settings.temperature ?? 0.5;
            document.getElementById('tempVal').innerText = settings.temperature ?? 0.5;
        }
        if (document.getElementById('topPInput')) {
            document.getElementById('topPInput').value = settings.topP ?? 1;
            document.getElementById('topPValue').innerText = settings.topP ?? 1;
        }
        if (document.getElementById('topKInput')) {
            document.getElementById('topKInput').value = settings.topK ?? 40;
        }
        if (document.getElementById('maxTokensInput')) {
            document.getElementById('maxTokensInput').value = settings.maxOutputTokens ?? 8100;
            document.getElementById('maxTokensValue').innerText = settings.maxOutputTokens ?? 8100;
        }
        // ... (Other initializations if any)
    }

    // Event Listeners
    const tempSlider = document.getElementById('tempSlider');
    const tempVal = document.getElementById('tempVal');
    if (tempSlider && tempVal) {
        tempSlider.addEventListener('input', (e) => {
            tempVal.innerText = e.target.value;
        });
    }

    const topPInput = document.getElementById('topPInput');
    const topPValue = document.getElementById('topPValue');
    if (topPInput && topPValue) {
        topPInput.addEventListener('input', (e) => {
            topPValue.innerText = e.target.value;
        });
    }

    const maxTokensInput = document.getElementById('maxTokensInput');
    const maxTokensValue = document.getElementById('maxTokensValue');
    if (maxTokensInput && maxTokensValue) {
        maxTokensInput.addEventListener('input', (e) => {
            maxTokensValue.innerText = e.target.value;
        });
    }

    document.getElementById('saveAdminBtn').addEventListener('click', saveAdminSettings);

    // Model Fetch Logic
    // Model Fetch Logic Removed as per user request
    // Initialize Presets
    loadPresets();
}

function saveAdminSettings() {
    // Safely get values, defaulting to existing or empty if not found in DOM
    const data = dataManager.getData();
    const existingSettings = data.appSettings || {};

    const sbUrlInput = document.getElementById('sbUrlInput');
    const sbKeyInput = document.getElementById('sbKeyInput');
    // const apiKeyInput = document.getElementById('apiKeyInput'); // Removed
    const tempInput = document.getElementById('tempSlider');
    const topPInput = document.getElementById('topPInput');
    const topKInput = document.getElementById('topKInput');
    const maxTokensInput = document.getElementById('maxTokensInput');
    const modelInput = document.getElementById('modelSelect');
    const sysPromptInput = document.getElementById('sysPrompt');
    const userPromptInput = document.getElementById('userPrompt');

    const newSettings = {
        ...existingSettings,
        supabaseUrl: sbUrlInput ? sbUrlInput.value : existingSettings.supabaseUrl,
        supabaseKey: sbKeyInput ? sbKeyInput.value : existingSettings.supabaseKey,
        // geminiKey: Removed for security (Server-side only)
        temperature: tempInput ? tempInput.value : existingSettings.temperature,
        topP: topPInput ? topPInput.value : existingSettings.topP,
        topK: topKInput ? topKInput.value : existingSettings.topK,
        maxOutputTokens: maxTokensInput ? maxTokensInput.value : existingSettings.maxOutputTokens,
        geminiModel: modelInput ? modelInput.value : existingSettings.geminiModel,
        systemPrompt: sysPromptInput ? sysPromptInput.value : existingSettings.systemPrompt,
        userPromptTemplate: userPromptInput ? userPromptInput.value : existingSettings.userPromptTemplate
    };

    data.appSettings = newSettings;
    dataManager.saveData(data);

    // Re-init DB Client if needed (though DB keys usually don't change here anymore)
    // dbService.initClient(); // [REMOVED] Causing multiple instance warnings. Credentials are fixed in dbService.

    showCustomAlert('설정이 성공적으로 저장되었습니다.');
}

// Prompt Preset Helpers
async function loadPresets() {
    // console.log('Loading presets...');
    try {
        const { data: prompts, error } = await dbService.client
            .from('prompt')
            .select('id, title, type, contents')
            .eq('valid', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Preset Load Error:', error);
            return;
        }

        const sysSelect = document.getElementById('sysPresetSelect');
        const userSelect = document.getElementById('userPresetSelect');

        // Reset
        if (sysSelect) sysSelect.innerHTML = '<option value="">📂 프리셋 불러오기</option>';
        if (userSelect) userSelect.innerHTML = '<option value="">📂 프리셋 불러오기</option>';

        // Store globally for access
        window.loadedPresets = prompts;

        prompts.forEach(p => {
            const option = `<option value="${p.id}">[${p.type.toUpperCase()}] ${p.title}</option>`;
            if (p.type === 'system' && sysSelect) sysSelect.innerHTML += option;
            if (p.type === 'user' && userSelect) userSelect.innerHTML += option;
        });

    } catch (err) {
        console.error('Failed to load presets:', err);
    }
}

window.applyPreset = function (type, id) {
    if (!id) return;

    const prompt = window.loadedPresets ? window.loadedPresets.find(p => p.id == id) : null;
    if (!prompt) return;

    showCustomConfirm(`[${prompt.title}] 내용을 불러오시겠습니까?\n현재 에디터의 내용은 덮어씌워집니다.`, () => {
        if (type === 'system') {
            document.getElementById('sysPrompt').value = prompt.contents;
        } else {
            document.getElementById('userPrompt').value = prompt.contents;
        }

        // Reset selection to allow re-selection
        document.getElementById(type === 'system' ? 'sysPresetSelect' : 'userPresetSelect').value = "";
    }, {
        okText: '불러오기'
    });
};
