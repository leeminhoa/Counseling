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

    // Check for existing result for this university from dataManager
    const savedResults = dataManager.getData().consultingResults || [];
    const existingResult = savedResults.reverse().find(r => r.univ && r.univ.id === selectedUnivId);

    container.innerHTML = `
        <div class="stage2-wrapper">
            <div id="aiLoading" class="ai-loading-box" style="display: none;">
                <div class="spinner-premium"></div>
                <div class="loading-steps" id="loadingSteps">
                    <p class="loading-step-text">학생 데이터를 분석하고 있습니다...</p>
                </div>
                
                <div class="skeleton-wrapper" style="margin-top: 3rem; opacity: 0.6;">
                    <div class="skeleton-card">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-line"></div>
                        <div class="skeleton skeleton-line"></div>
                        <div class="skeleton skeleton-line short"></div>
                    </div>
                </div>
            </div>

            <div id="aiResult" class="ai-result-grid" style="${existingResult ? 'display: grid;' : 'display: none;'}">
                <!-- Result cards will be injected here -->
            </div>

            <div id="aiInitial" class="ai-initial-view" style="${existingResult ? 'display: none;' : 'display: block;'}">
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

    const resultView = document.getElementById('aiResult');
    if (existingResult) {
        displayAIResult(existingResult.aiResult, resultView);
    }

    document.getElementById('generateBtn').addEventListener('click', () => startAIGeneration(container));

    if (autoStart && !existingResult) {
        startAIGeneration(container);
    }
}

async function startAIGeneration(container) {
    const initialView = document.getElementById('aiInitial');
    const loadingView = document.getElementById('aiLoading');
    const resultView = document.getElementById('aiResult');
    const stepsContainer = document.getElementById('loadingSteps');

    initialView.style.display = 'none';
    loadingView.style.display = 'flex';

    // Loading steps animation
    const steps = [
        "학생 데이터를 분석하고 있습니다...",
        "목표 대학 및 학과 연계성을 검토 중입니다...",
        "최적의 심화 탐구 주제를 도출하고 있습니다...",
        "관련 교과 개념을 매칭하는 중입니다...",
        "전문가 추천 도서를 선정하고 있습니다...",
        "최종 리포트를 구성하고 있습니다..."
    ];
    let stepIdx = 0;
    const stepInterval = setInterval(() => {
        stepIdx = (stepIdx + 1) % steps.length;
        if (stepsContainer) {
            stepsContainer.innerHTML = `<p class="loading-step-text" style="animation: slide-up 0.5s ease-out forwards;">${steps[stepIdx]}</p>`;
        }
    }, 2800);

    try {
        const profile = dataManager.getProfile();
        // Use lastSelectedUniv for consistency if searchResults is empty on refresh
        const univData = profile.lastSelectedUniv;

        if (!univData) throw new Error('대학을 먼저 선택해주세요.');

        const univSubjects = await dbService.getMajorSubjects(univData.id);

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

        clearInterval(stepInterval);
        displayAIResult(result, resultView);
        loadingView.style.display = 'none';
        resultView.style.display = 'grid';

        // Save to dataManager
        dataManager.saveConsultingResult({
            univ: univData,
            aiResult: result
        });

    } catch (error) {
        clearInterval(stepInterval);
        console.error('AI Generation Failed:', error);
        alert('AI 생성 실패: ' + (error.message || '알 수 없는 오류'));
        loadingView.style.display = 'none';
        initialView.style.display = 'block';
    }
}

function displayAIResult(data, container) {
    // --- Data Adapter (Schema A vs Schema B) ---
    let topic = data.topic;
    let rationale = data.rationale;
    let background = data.background;
    let direction = data.direction;
    let books = data.books;
    let keywords = data.keywords;

    // Detect Schema B (Complex Report)
    if (!topic && data.exploration_guides && data.exploration_guides.length > 0) {
        const guide = data.exploration_guides[0];
        topic = guide.topic;
        rationale = data.consultant_comment || guide.explanation; // Fallback

        // Background fallback from student analysis
        if (!background && data.student_analysis) {
            background = `[강점] ${data.student_analysis.strength}\n[약점] ${data.student_analysis.weakness}`;
        }

        if (!direction) {
            direction = `관련 교과: ${guide.related_subject}\n세부 내용: ${guide.content || guide.description || '내용 없음'}`;
        }
    }

    // Detect Schema C (Flat with different keys: motive, methodology)
    if (!topic && (data.exploration_motive || data.methodology)) {
        topic = data.topic || 'AI 추천 탐구 주제'; // Fallback title
        rationale = data.exploration_motive || data.rationale || '';

        // Background defaults
        if (!background) background = data.exploration_motive || '';

        // Direction from methodology array
        if (!direction && data.methodology) {
            direction = Array.isArray(data.methodology) ? data.methodology.join('\n') : data.methodology;
        }
    }

    // Book Adapter (Object vs String)
    if (data.recommended_books && (!books || books.length === 0)) {
        books = data.recommended_books.map(b => {
            if (typeof b === 'string') {
                return { title: b, author: '', desc: '추천 도서' };
            }
            return b;
        });
    }

    // Final Robust Defaults
    keywords = Array.isArray(keywords) ? keywords : (keywords ? [keywords] : []);
    books = Array.isArray(books) ? books : [];
    direction = direction || '탐구 방향에 대한 내용이 없습니다.';
    background = background || '탐구 배경에 대한 내용이 없습니다.';
    rationale = rationale || '';
    topic = topic || '주제 생성 실패';

    // UI Rendering
    container.innerHTML = `
        <div class="card result-card topic-card" id="pdf-area" style="grid-column: 1 / -1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
                <div>
                     <span class="label" style="display: block; margin-bottom: 0.5rem;">최종 선정 탐구 주제</span>
                     <h2 class="res-topic" style="font-size: 1.8rem; margin: 0;">${topic}</h2>
                </div>
                <div class="result-actions no-pdf" style="display: flex; gap: 0.5rem;">
                    <button class="btn-secondary btn-sm" onclick="downloadPDF()" style="padding: 0.5rem 0.8rem;">
                        <i class="fa-solid fa-file-pdf"></i> PDF 다운로드
                    </button>
                    <button class="btn-secondary btn-sm" onclick="resetAIResult()" style="padding: 0.5rem 0.8rem; color: #EF4444; border-color: #FEE2E2;">
                        <i class="fa-solid fa-rotate-right"></i> 초기화
                    </button>
                </div>
            </div>
            
            <div class="res-keywords" style="margin-bottom: 2rem;">
                ${keywords.map(k => `<span class="k-badge" style="background: rgba(235, 244, 255, 1); color: #1E40AF; padding: 0.3rem 0.7rem; border-radius: 20px; font-size: 0.85rem; margin-right: 0.5rem;">#${k}</span>`).join('')}
            </div>

            <!-- Chain of Thought (Rationale) -->
            ${rationale ? `
            <div class="detail-section" style="margin-bottom: 2rem; background: #F0F9FF; border-left: 4px solid #0EA5E9; padding: 1rem 1.25rem; border-radius: 0 0.5rem 0.5rem 0;">
                <h3 class="res-title" style="font-size: 1rem; color: #0369A1; margin-bottom: 0.5rem; display:flex; align-items:center; gap:0.5rem;">
                    <i class="fa-solid fa-lightbulb"></i> 주제 선정 논리
                </h3>
                <p class="res-content" style="font-size: 0.95rem; color: #0C4A6E; line-height: 1.6; margin:0;">${rationale}</p>
            </div>
            ` : ''}
            
            <hr style="margin: 2rem 0; border: none; border-top: 1px solid #E2E8F0;">

            <!-- Background & Direction -->
            <div class="detail-section" style="margin-bottom: 2.5rem;">
                <h3 class="res-title" style="font-size: 1.2rem; color: #1E293B; margin-bottom: 1rem;">1. 탐구 배경 및 필요성</h3>
                <p class="res-content" style="line-height: 1.7; color: #475569;">${background}</p>
            </div>

            <div class="detail-section" style="margin-bottom: 2.5rem;">
                <h3 class="res-title" style="font-size: 1.2rem; color: #1E293B; margin-bottom: 1rem;">2. 구체적 탐구 방향</h3>
                <div class="res-content res-list" style="line-height: 1.7; color: #475569;">
                    ${direction.split('\n').map(l => `<p style="margin-bottom: 0.5rem;">${l}</p>`).join('')}
                </div>
            </div>

            <!-- Recommended Books -->
            <div class="detail-section">
                <h3 class="res-title" style="font-size: 1.2rem; color: #1E293B; margin-bottom: 1rem;"><i class="fa-solid fa-book"></i> 전문가 추천 도서</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                    ${books.map(book => `
                    <div class="book-info" style="background: #F8FAFC; padding: 1.2rem; border-radius: 12px; border: 1px solid #E2E8F0;">
                        <p class="book-name" style="font-weight: 700; color: #0F172A; margin-bottom: 0.3rem;">${book.title} <span style="font-weight:400; font-size:0.85rem; color:#64748B;">${book.author ? `- ${book.author}` : ''}</span></p>
                        <p class="book-desc" style="font-size: 0.9rem; color: #475569;">${book.desc || ''}</p>
                    </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

async function resetAIResult() {
    if (!confirm('현재 생성된 가이드 데이터를 초기화하고 다시 생성하시겠습니까?')) return;

    const selectedUnivId = stage1State.selectedUnivId;
    const data = dataManager.getData();

    // Filter out results for the current university
    data.consultingResults = data.consultingResults.filter(r => r.univ && r.univ.id !== selectedUnivId);
    dataManager.saveData(data);

    // Refresh view
    const content = document.getElementById('contentContainer');
    renderStage2(content);
}

function downloadPDF() {
    const element = document.getElementById('pdf-area');
    const profile = dataManager.getProfile();
    const fileName = `${profile.name || '학생'}_AI_탐구가이드.pdf`;

    // Temporarily hide buttons for PDF
    const actions = element.querySelector('.no-pdf');
    if (actions) actions.style.display = 'none';

    const opt = {
        margin: [15, 15, 15, 15],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        // Restore buttons
        if (actions) actions.style.display = 'flex';
    });
}

/**
 * [NEW] Load History Result directly
 */
window.loadHistoryToStage2 = function (historyItem) {
    handleTabChange('stage2');

    // Slight delay to ensure DOM is ready if tab switching takes time
    setTimeout(() => {
        const container = document.getElementById('contentContainer');
        if (!container) return;

        // Force render Stage 2 layout without checks
        container.innerHTML = `
        <div class="stage2-wrapper">
            <div id="aiLoading" class="ai-loading-box" style="display: none;"></div>
            <div id="aiResult" class="ai-result-grid" style="display: grid;">
                <!-- Result injected below -->
            </div>
            <div id="aiInitial" class="ai-initial-view" style="display: none;"></div>
        </div>
        `;

        const resultView = document.getElementById('aiResult');

        // Extract data
        // Check if recommend_notes is array or string or object
        let resultData = historyItem.activity_notes || historyItem.recommend_notes;

        if (Array.isArray(resultData)) resultData = resultData[0];
        if (typeof resultData === 'string') {
            try { resultData = JSON.parse(resultData); } catch (e) { }
        }

        // Render
        displayAIResult(resultData, resultView);

        // Add a banner indicating this is history
        const banner = document.createElement('div');
        banner.style.gridColumn = '1 / -1';
        banner.style.background = '#FEF3C7';
        banner.style.color = '#B45309';
        banner.style.padding = '1rem';
        banner.style.borderRadius = '0.5rem';
        banner.style.marginBottom = '1rem';
        banner.style.textAlign = 'center';
        banner.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> <b>과거 상담 이력 조회 모드</b> (${new Date(historyItem.rec_date || historyItem.created_at).toLocaleDateString()})`;

        resultView.insertBefore(banner, resultView.firstChild);

    }, 100);
};
