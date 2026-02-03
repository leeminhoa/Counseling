/**
 * stage2.js
 * Stage 2: AI 탐구 가이드 생성 및 결과 표시
 */

async function renderStage2(container, autoStart = false) {
    const profile = dataManager.getProfile();
    const selectedUnivId = stage1State.selectedUnivId;

    if (!selectedUnivId) {
        container.innerHTML = `
            <div class="empty-placeholder">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; margin-bottom: 1rem; color: #F59E0B;"></i>
                <p>먼저 Stage 1에서 대학과 학과를 선택해야 가이드를 생성할 수 있습니다.</p>
                <button class="btn-primary" style="margin-top:1rem;" onclick="handleTabChange('stage1')">1단계로 이동</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="stage2-wrapper">
            <div id="aiLoading" class="ai-loading-box" style="display: none;">
                <div class="spinner"></div>
                <p>Gemini 3.0 Flash가 학생의 데이터를 분석하여<br>최적의 탐구 주제를 생성하고 있습니다...</p>
            </div>

            <div id="aiResult" class="ai-result-grid" style="display: none;">
                <!-- Result cards will be injected here -->
            </div>

            <div id="aiInitial" class="ai-initial-view">
                 <div class="card" style="max-width: 600px; margin: auto; text-align: center;">
                    <h2 style="margin-bottom: 1rem;">AI 탐구 가이드 생성</h2>
                    <p style="color: var(--text-sub); margin-bottom: 2rem;">선택하신 대학과 학과의 정보를 바탕으로, 학생부 세특에 활용 가능한 심화 탐구 가이드를 생성합니다.</p>
                    <button class="btn-primary btn-lg" id="generateBtn">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> 가이드 생성 시작
                    </button>
                 </div>
            </div>
        </div>
    `;

    document.getElementById('generateBtn').addEventListener('click', () => startAIGeneration(container));

    if (autoStart) {
        startAIGeneration(container);
    }
}

async function startAIGeneration(container) {
    const initialView = document.getElementById('aiInitial');
    const loadingView = document.getElementById('aiLoading');
    const resultView = document.getElementById('aiResult');

    initialView.style.display = 'none';
    loadingView.style.display = 'flex';

    try {
        // 2. Prepare Data for AI
        const profile = dataManager.getProfile();
        const univData = stage1State.searchResults.find(u => u.id === stage1State.selectedUnivId);

        // Fetch subjects again or use from state if available
        const univSubjects = await dbService.getMajorSubjects(stage1State.selectedUnivId);

        const context = {
            student: {
                gpa: profile.gpa,
                completedSubjects: profile.subjects || []
            },
            target: {
                univ: univData.univ_name,
                major: univData.raw_major_name,
                recommendedSubjects: univSubjects.map(s => `${s.course_name}(${s.bucket === 'core' ? '핵심' : '권장'})`)
            }
        };

        const result = await aiService.generateExplorationGuide(context);

        displayAIResult(result, resultView);
        loadingView.style.display = 'none';
        resultView.style.display = 'grid';

        // Save to dataManager
        dataManager.saveConsultingResult({
            univ: univData,
            aiResult: result
        });

    } catch (error) {
        console.error('AI Generation Failed:', error);
        alert('AI 생성 도중 오류가 발생했습니다.');
        loadingView.style.display = 'none';
        initialView.style.display = 'block';
    }
}

function displayAIResult(data, container) {
    container.innerHTML = `
        <div class="card result-card topic-card">
            <span class="label">최종 선정 탐구 주제</span>
            <h2 class="res-topic">${data.topic}</h2>
            <div class="res-keywords">
                ${data.keywords.map(k => `<span class="k-badge">#${k}</span>`).join('')}
            </div>
        </div>

        <div class="card result-card detail-card">
            <h3 class="res-title">1. 탐구 배경 및 필요성</h3>
            <p class="res-content">${data.background}</p>
        </div>

        <div class="card result-card detail-card">
            <h3 class="res-title">2. 구체적 탐구 방향</h3>
            <div class="res-content res-list">${data.direction.split('\n').map(l => `<p>${l}</p>`).join('')}</div>
        </div>

        <div class="card result-card book-card">
            <h3 class="res-title"><i class="fa-solid fa-book"></i> 추천 도서</h3>
            <div class="book-info">
                <div class="book-cover"></div>
                <div>
                    <p class="book-name">${data.book}</p>
                    <p class="book-desc">학과 관련 소양을 쌓기에 적합한 필독서입니다.</p>
                </div>
            </div>
        </div>
    `;
}
