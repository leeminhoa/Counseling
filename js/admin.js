/**
 * admin.js
 * Admin: 프롬프트 센터 및 API 설정 관리
 */

function renderAdmin(container) {
    const profile = dataManager.getData();
    const settings = profile.appSettings || {};

    container.innerHTML = `
        <div class="admin-container">
            <div class="admin-sidebar">
                <h3 class="admin-title">Settings</h3>
                <div class="admin-nav">
                    <div class="admin-nav-item active"><i class="fa-solid fa-code"></i> Prompt Control</div>
                    <div class="admin-nav-item"><i class="fa-solid fa-key"></i> API Keys</div>
                </div>
            </div>

            <div class="admin-main">
                <div class="admin-section">
                    <div class="section-header">
                        <h2><i class="fa-solid fa-robot"></i> AI Prompt Engine</h2>
                        <button class="btn-primary" id="saveAdminBtn"><i class="fa-solid fa-save"></i> 설정 저장</button>
                    </div>

                    <div class="admin-grid">
                        <!-- Left: Prompt Editors -->
                        <div class="admin-col">
                            <div class="form-group">
                                <label>System Prompt (Persona & Instructions)</label>
                                <textarea id="sysPrompt" class="prompt-editor">${settings.systemPrompt || `당신은 대한민국 대입 입시 컨설턴트입니다. 학생의 목표 학과와 교과 이수 현황을 바탕으로, 생활기록부에 기재할 수 있는 깊이 있는 탐구 주제와 활동 방향을 제시하는 것이 당신의 역할입니다. 

[지침]
- 전문적이고 신뢰감 있는 어조를 유지하세요.
- 구체적인 탐구 방법론과 추천 도서를 포함하세요.
- 답변은 반드시 정해진 JSON 형식을 따르세요.`}</textarea>
                            </div>
                            <div class="form-group">
                                <label>User Prompt Template (Data Injection)</label>
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
                                        <button id="fetchModelsBtn" class="btn-text" style="font-size: 0.8rem; color: var(--primary-color);">
                                            <i class="fa-solid fa-rotate"></i> 갱신
                                        </button>
                                    </div>
                                    <div style="position: relative;">
                                        <select id="modelSelect" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-app); appearance: none;">
                                            <option value="${settings.geminiModel || 'gemini-3-pro-preview'}">${settings.geminiModel || 'Gemini 3 Pro Preview (Default)'}</option>
                                        </select>
                                        <div style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-sub);">
                                            <i class="fa-solid fa-chevron-down"></i>
                                        </div>
                                    </div>
                                    <p class="param-desc">사용할 생성형 AI 모델 엔진을 선택합니다. (Gemini 3.0 권장)</p>
                                </div>

                                <!-- Temperature -->
                                <div class="form-group">
                                    <div style="display: flex; justify-content: space-between;">
                                        <label>Temperature</label>
                                        <span id="tempVal" style="color: var(--primary-color); font-weight: 600;">${settings.temperature || 0.7}</span>
                                    </div>
                                    <input type="range" id="tempSlider" min="0" max="1" step="0.1" value="${settings.temperature || 0.7}">
                                    <p class="param-desc">
                                        답변의 <b>창의성</b>을 조절합니다.<br>
                                        (0.0: 정적/논리적 분석 <-> 1.0: 다양/창의적 아이디어)
                                    </p>
                                </div>

                                <!-- Top P -->
                                <div class="form-group">
                                    <div style="display: flex; justify-content: space-between;">
                                        <label>Top P (Nucleus)</label>
                                        <span id="topPValue" style="color: var(--primary-color); font-weight: 600;">${settings.topP || 0.95}</span>
                                    </div>
                                    <input type="range" id="topPInput" min="0" max="1" step="0.05" value="${settings.topP || 0.95}">
                                    <p class="param-desc">
                                        확률 분포의 상위 <b>P%</b> 토큰만 고려합니다.<br>
                                        높을수록 더 다양한 어휘와 표현을 사용합니다.
                                    </p>
                                </div>

                                <!-- Top K -->
                                <div class="form-group">
                                    <label style="display: flex; justify-content: space-between;">
                                        Top K <span style="font-size: 0.8rem; color: #999;">(1-100)</span>
                                    </label>
                                    <input type="number" id="topKInput" class="form-input" style="width: 100%; padding: 0.5rem;" value="${settings.topK || 40}" min="1" max="100">
                                    <p class="param-desc">
                                        확률 상위 <b>K개</b>의 후보 단어 중에서 선택합니다.<br>
                                        낮을수록 일관성 있고 안정적인 답변이 나옵니다.
                                    </p>
                                </div>

                                <!-- Max Tokens -->
                                <div class="form-group">
                                    <div style="display: flex; justify-content: space-between;">
                                        <label>Max Output Tokens</label>
                                        <span id="maxTokensValue" style="color: var(--primary-color); font-weight: 600;">${settings.maxOutputTokens || 2048}</span>
                                    </div>
                                    <input type="range" id="maxTokensInput" min="100" max="8192" step="100" value="${settings.maxOutputTokens || 2048}">
                                    <p class="param-desc">
                                        한 번의 응답에서 생성할 <b>최대 길이</b>를 제한합니다.<br>
                                        (입시 컨설팅은 긴 호흡이 필요하므로 2048 이상 권장)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Event Listeners
    const tempSlider = document.getElementById('tempSlider');
    const tempVal = document.getElementById('tempVal');
    tempSlider.addEventListener('input', (e) => {
        tempVal.innerText = e.target.value;
    });

    document.getElementById('saveAdminBtn').addEventListener('click', saveAdminSettings);

    // Model Fetch Logic
    const fetchBtn = document.getElementById('fetchModelsBtn');
    if (fetchBtn) {
        fetchBtn.addEventListener('click', async () => {
            const select = document.getElementById('modelSelect');
            const originalText = fetchBtn.innerHTML;
            fetchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            try {
                const models = await aiService.getAvailableModels();
                select.innerHTML = ''; // Clear
                models.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.name;
                    opt.textContent = m.displayName;
                    opt.title = m.description;
                    if (m.name === (settings.geminiModel || 'gemini-2.5-pro')) opt.selected = true;
                    select.appendChild(opt);
                });
                alert('모델 목록을 성공적으로 가져왔습니다.');
            } catch (e) {
                alert('모델 목록 가져오기 실패: ' + e.message);
            } finally {
                fetchBtn.innerHTML = originalText;
            }
        });
    }
}

function saveAdminSettings() {
    const sbUrl = document.getElementById('sbUrlInput').value;
    const sbKey = document.getElementById('sbKeyInput').value;
    const apiKey = document.getElementById('apiKeyInput').value;
    const temp = document.getElementById('tempSlider').value;
    const model = document.getElementById('modelSelect').value;

    // Update LocalStorage (aiService will read from appSettings.geminiKey)
    const data = dataManager.getData();
    data.appSettings = {
        ...data.appSettings,
        supabaseUrl: sbUrl,
        supabaseKey: sbKey,
        geminiKey: apiKey,
        temperature: temp,
        geminiModel: model, // Save selected model
        systemPrompt: document.getElementById('sysPrompt').value,
        userPromptTemplate: document.getElementById('userPrompt').value
    };
    dataManager.saveData(data);

    // Re-init DB Client
    dbService.initClient();

    alert('설정이 성공적으로 저장되었습니다.');
}
