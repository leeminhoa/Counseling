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
                    <div class="admin-nav-item active" onclick="switchAdminTab('general')"><i class="fa-solid fa-code"></i> Prompt Control</div>
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
                        <button class="btn-primary" onclick="handleCreateCounselor()" style="width: 100%;">
                            <i class="fa-solid fa-user-plus"></i> 계정 생성
                        </button>
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
        const items = document.querySelectorAll('.admin-nav-item');
        if (tabName === 'general' && items[0]) items[0].classList.add('active');
        if (tabName === 'api' && items[1]) items[1].classList.add('active');
        if (tabName === 'counselors' && items[2]) items[2].classList.add('active');

        // Content switching
        document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');

        // 'general' is the default view with Prompt & Params
        if (tabName === 'general') {
            document.querySelector('.admin-main .admin-section').style.display = 'block';
            // Hide others? Wait, my DOM structure is a bit shared.
            // The original code had everything inside .admin-main > .admin-section
            // I need to structure it so I can toggle.
            // Let's wrap the original content in a tab div if possible, OR just hide/show what we added.

            // Re-reading original structure:
            // .admin-main > .admin-section > .section-header + .admin-grid

            // So for 'general', show the original .admin-section
            const originalSection = document.querySelector('.admin-main > .admin-section:not(#adminTab_counselors)');
            if (originalSection) originalSection.style.display = 'block';

            const counselorTab = document.getElementById('adminTab_counselors');
            if (counselorTab) counselorTab.style.display = 'none';

        } else if (tabName === 'counselors') {
            const originalSection = document.querySelector('.admin-main > .admin-section:not(#adminTab_counselors)');
            if (originalSection) originalSection.style.display = 'none';

            const counselorTab = document.getElementById('adminTab_counselors');
            if (counselorTab) counselorTab.style.display = 'block';
        } else if (tabName === 'api') {
            alert('API Key 관리는 준비 중입니다.');
        }
    };

    window.handleCreateCounselor = async () => {
        const name = document.getElementById('new_counselor_name').value;
        const email = document.getElementById('new_counselor_email').value;
        const password = document.getElementById('new_counselor_password').value;

        if (!name || !email || !password) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        if (!confirm(`\${name} 상담사 계정을 생성하시겠습니까?`)) return;

        const btn = document.querySelector('button[onclick="handleCreateCounselor()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 생성 중...';
        btn.disabled = true;

        const result = await dbService.createCounselor(email, password, name);

        btn.innerHTML = originalText;
        btn.disabled = false;

        if (result.success) {
            alert(`계정이 성공적으로 생성되었습니다.\n이메일: ${email}`);
            document.getElementById('new_counselor_name').value = '';
            document.getElementById('new_counselor_email').value = '';
            document.getElementById('new_counselor_password').value = '';
        } else {
            alert('계정 생성 실패: ' + result.message);
        }
    };

    // Initialize UI from Settings
    if (settings) {
        if (document.getElementById('tempSlider')) {
            document.getElementById('tempSlider').value = settings.temperature || 0.7;
            document.getElementById('tempVal').innerText = settings.temperature || 0.7;
        }
        if (document.getElementById('topPInput')) {
            document.getElementById('topPInput').value = settings.topP || 0.95;
            document.getElementById('topPValue').innerText = settings.topP || 0.95;
        }
        if (document.getElementById('topKInput')) {
            document.getElementById('topKInput').value = settings.topK || 40;
        }
        if (document.getElementById('maxTokensInput')) {
            document.getElementById('maxTokensInput').value = settings.maxOutputTokens || 2048;
            document.getElementById('maxTokensValue').innerText = settings.maxOutputTokens || 2048;
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
                    if (m.name === (settings.geminiModel || 'gemini-3-pro-preview')) opt.selected = true;
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
    // Safely get values, defaulting to existing or empty if not found in DOM
    const data = dataManager.getData();
    const existingSettings = data.appSettings || {};

    const sbUrlInput = document.getElementById('sbUrlInput');
    const sbKeyInput = document.getElementById('sbKeyInput');
    const apiKeyInput = document.getElementById('apiKeyInput');
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
        geminiKey: apiKeyInput ? apiKeyInput.value : existingSettings.geminiKey,
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
    dbService.initClient();

    alert('설정이 성공적으로 저장되었습니다.');
}
