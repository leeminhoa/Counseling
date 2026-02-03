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
                                <textarea id="sysPrompt" class="prompt-editor">당신은 대한민국 대입 입시 컨설턴트입니다. 학생의 목표 학과와 교과 이수 현황을 바탕으로, 생활기록부에 기재할 수 있는 깊이 있는 탐구 주제와 활동 방향을 제시하는 것이 당신의 역할입니다. 

[지침]
- 전문적이고 신뢰감 있는 어조를 유지하세요.
- 구체적인 탐구 방법론과 추천 도서를 포함하세요.
- 답변은 반드시 정해진 JSON 형식을 따르세요.</textarea>
                            </div>
                            <div class="form-group">
                                <label>User Prompt Template (Data Injection)</label>
                                <textarea id="userPrompt" class="prompt-editor">[학생 데이터]
- 목표 학과: {{major}}
- 관련 이수 과목: {{subjects}}
- 내신 성적: {{gpa}}

위 데이터를 바탕으로 탐구 가이드를 생성해 주세요.</textarea>
                            </div>
                        </div>

                        <!-- Right: Parameters -->
                        <div class="admin-col props-col">
                            <div class="card param-card">
                                <h3>Parameters</h3>
                                <div class="param-item">
                                    <div class="param-info">
                                        <label>Temperature</label>
                                        <span id="tempVal">0.7</span>
                                    </div>
                                    <input type="range" id="tempSlider" min="0" max="1" step="0.1" value="0.7">
                                    <p class="param-desc">높을수록 창의적이고, 낮을수록 정교한 결과가 나옵니다.</p>
                                </div>

                                <div class="param-separator"></div>

                                <div class="form-group">
                                    <label>Supabase Project URL</label>
                                    <input type="text" id="sbUrlInput" value="${settings.supabaseUrl || ''}" placeholder="https://xyz.supabase.co">
                                </div>

                                <div class="form-group">
                                    <label>Supabase Anon Key</label>
                                    <input type="password" id="sbKeyInput" value="${settings.supabaseKey || ''}" placeholder="eyJhbGciOiJIUzI1NiI...">
                                </div>

                                <div class="param-separator"></div>

                                <div class="form-group">
                                    <label>Gemini API Key</label>
                                    <input type="password" id="apiKeyInput" value="${settings.apiKey || ''}" placeholder="sk-...">
                                    <p class="param-desc">입력하신 키는 브라우저 로컬 스토리지에만 보관됩니다.</p>
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
}

function saveAdminSettings() {
    const sbUrl = document.getElementById('sbUrlInput').value;
    const sbKey = document.getElementById('sbKeyInput').value;
    const apiKey = document.getElementById('apiKeyInput').value;
    const temp = document.getElementById('tempSlider').value;

    // Update Services
    aiService.setApiKey(apiKey);

    // Update LocalStorage
    const data = dataManager.getData();
    data.appSettings = {
        ...data.appSettings,
        supabaseUrl: sbUrl,
        supabaseKey: sbKey,
        apiKey: apiKey,
        temperature: temp
    };
    dataManager.saveData(data);

    // Re-init DB Client
    dbService.initClient();

    alert('설정이 성공적으로 저장되었습니다.');
}
