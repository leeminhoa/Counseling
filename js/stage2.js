/**
 * stage2.js
 * Stage 2: AI 탐구 가이드 생성 및 결과 표시
 */

async function renderStage2(container, autoStart = false) {
    const profile = dataManager.getProfile();
    // [FIX] Use persisted selection if global state is empty (e.g. after reload)
    const selectedUnivId = stage1State.selectedUnivId || (profile.lastSelectedUniv ? profile.lastSelectedUniv.id : null);

    // Sync global state if restored from profile
    if (!stage1State.selectedUnivId && selectedUnivId) {
        stage1State.selectedUnivId = selectedUnivId;
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
                completedSubjects: profile.subjects || [],
                inprogressSubjects: profile.inprogressSubjects || [],
                plannedSubjects: profile.plannedSubjects || []
            },
            target: {
                univ: univData.univ_name,
                major: univData.raw_major_name,
                recommendedSubjects: univSubjects.map(s => `${s.course_name}(${s.bucket === 'core' ? '핵심' : '권장'})`),
                futureSubjects: univSubjects
                    .filter(s => {
                        const allStudentSubjects = [
                            ...(profile.subjects || []),
                            ...(profile.inprogressSubjects || []),
                            ...(profile.plannedSubjects || [])
                        ];
                        return !allStudentSubjects.includes(s.course_name);
                    })
                    .map(s => `${s.course_name}(${s.bucket === 'core' ? '핵심' : '권장'})`)
            }
        };

        const result = await aiService.generateExplorationGuide(context);

        // [NEW] Fetch Recommended Subjects
        const recSubjectsData = await dbService.getUnivMajorRecommendation(univData.univ_name, univData.raw_major_name);
        if (recSubjectsData) {
            result.recommendedSubjects = recSubjectsData;
        }

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
        showCustomAlert('AI 생성 실패: ' + (error.message || '알 수 없는 오류'));
        loadingView.style.display = 'none';
        initialView.style.display = 'block';
    }
}

function displayAIResult(data, container) {
    // [NEW] Inject Context into Chatbot API
    if (window.injectContextToChatbot) {
        window.injectContextToChatbot(data);
    }
    // [NEW] Schema Detection for Text-Block Mode
    if (typeof data.page1 === 'string') {
        renderTextModeReport(data, container);
        return;
    }

    // [NEW] Schema D: Refactored Consulting Report (2025 Standard)
    if (data.page1 && data.page2) {
        renderNewReportLayout(data, container);
        return;
    }

    // --- Legacy Adapters (Schema A, B, C) ---
    console.warn('Rendering Legacy AI Result Format');

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
                    <button class="btn-secondary btn-sm" onclick="downloadImage()" style="padding: 0.5rem 0.8rem;">
                        <i class="fa-solid fa-image"></i> 이미지 저장
                    </button>
                    <button class="btn-secondary btn-sm" onclick="resetAIResult(event)" style="padding: 0.5rem 0.8rem; color: #EF4444; border-color: #FEE2E2;">
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

/**
 * [NEW] Text Mode Report Renderer (for "Text-Block JSON" schema)
 */
function renderTextModeReport(data, container) {
    // [Updated] schema keys: page2_creative_experience is now an object
    const { page1, page2_sepec_table, page2_creative_experience, page2_question_script, triggers_2025 } = data;

    // Helper for safe list access
    const getList = (arr) => Array.isArray(arr) ? arr : [];

    container.innerHTML = `
        <div class="report-wrapper" id="pdf-area" style="grid-column: 1 / -1; font-family: 'Pretendard', sans-serif;">
            
            <!-- Floating Actions -->
            <div class="report-actions no-pdf" style="display:flex; justify-content: flex-end; gap: 0.5rem; margin-bottom: 1rem;">
                 <button class="btn-secondary btn-sm" onclick="downloadImage()">
                    <i class="fa-solid fa-image"></i> 이미지 저장
                </button>
                <button class="btn-secondary btn-sm" onclick="resetAIResult(event)" style="color: #EF4444; border-color: #FEE2E2;">
                    <i class="fa-solid fa-rotate-right"></i> 초기화
                </button>
            </div>

            <!-- [PAGE 1] Summary (Text Block) -->
            <div class="report-page page-1" style="background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); padding: 2.5rem; margin-bottom: 2rem;">
                <!-- Header -->
                <div class="report-header" style="border-bottom: 2px solid #1E293B; padding-bottom: 1.5rem; margin-bottom: 2rem;">
                    <span style="background: #E0F2FE; color: #0284C7; font-weight:700; font-size: 0.85rem; padding: 4px 12px; border-radius: 20px;">생기부 디자인 컨설팅 리포트</span>
                    <h1 style="font-size: 2.2rem; font-weight: 800; color: #0F172A; margin-top: 0.8rem; margin-bottom: 0.5rem;">
                        탐구 컨설팅 요약
                    </h1>
                </div>

                <div style="font-size: 1.05rem; line-height: 1.8; color: #334155; white-space: pre-wrap;">${page1 || ''}</div>
            </div>

            <!-- [PAGE 2] Execution Plan (Text Blocks + Structured Cards) -->
            <div class="report-page page-2" style="background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); padding: 2.5rem; margin-bottom: 2rem;">
                
                <h2 style="font-size: 1.5rem; font-weight: 800; color: #0F172A; margin-bottom: 1.5rem; border-left: 5px solid #8B5CF6; padding-left: 1rem;">
                    세특 및 창체 실행 가이드
                </h2>

                <!-- Subject Table (Text) -->
                <h3 style="font-size: 1.2rem; font-weight: 700; color: #1E293B; margin-top: 1.5rem; margin-bottom: 1rem;">과목별 세특 설계</h3>
                <div style="background: #F8FAFC; padding: 1.5rem; border-radius: 12px; border: 1px solid #E2E8F0; font-family: monospace; font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap; overflow-x: auto;">${page2_sepec_table || ''}</div>

                <!-- Changche Cards (Structured) -->
                <h3 style="font-size: 1.2rem; font-weight: 700; color: #1E293B; margin-top: 2rem; margin-bottom: 1rem;">창의적 체험활동 추천</h3>
                <div class="creative-list" style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2.5rem;">
                    ${['club', 'career', 'autonomous'].map((type) => {
        const maps = { club: { title: '동아리', icon: 'users', color: '#3B82F6', bg: '#EFF6FF' }, career: { title: '진로', icon: 'compass', color: '#8B5CF6', bg: '#F3E8FF' }, autonomous: { title: '자율', icon: 'hand-sparkles', color: '#10B981', bg: '#ECFDF5' } };
        const map = maps[type];
        // Robustly check for the options array. It might be null if AI failed to parse well.
        const options = (page2_creative_experience && page2_creative_experience[`${type}_options`])
            ? getList(page2_creative_experience[`${type}_options`])
            : [];

        if (options.length === 0) return '';

        // Render all options or just the first? Usually 1-2 per type.
        return options.map(item => `
                        <div style="background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #E2E8F0; display: flex; flex-direction: column; gap: 0.8rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 1rem;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: #1E293B; font-size: 1.1rem;">
                                    <div style="width: 32px; height: 32px; border-radius: 8px; background: ${map.bg}; color: ${map.color}; display: flex; align-items: center; justify-content: center;">
                                        <i class="fa-solid fa-${map.icon}"></i>
                                    </div>
                                    ${map.title} 활동
                                </div>
                                <span style="background: #F1F5F9; color: #64748B; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem;">추천 주제</span>
                            </div>
                            
                            <div>
                                <div style="font-weight: 700; color: #0F172A; font-size: 1.15rem; margin-bottom: 0.5rem;">${item.topic}</div>
                                <div style="font-size: 0.95rem; color: #475569; line-height: 1.6; background: #F8FAFC; padding: 1rem; border-radius: 8px;">
                                    <strong><i class="fa-solid fa-shoe-prints" style="color: #94A3B8; margin-right: 0.3rem;"></i> 실행 단계:</strong> ${item.steps}
                                </div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem;">
                                <span style="font-size: 0.85rem; font-weight: 600; color: #059669;">
                                    <i class="fa-solid fa-file-circle-check"></i> 예상 결과물:
                                </span>
                                <span style="font-size: 0.9rem; color: #334155;">${item.evidence}</span>
                            </div>
                        </div>
                        `).join('');
    }).join('')}
                </div>

                <!-- Questions -->
                 <h3 style="font-size: 1.2rem; font-weight: 700; color: #1E293B; margin-top: 2rem; margin-bottom: 1rem;">상담 질문 스크립트</h3>
                <div style="background: #FFFBEB; padding: 1.5rem; border-radius: 12px; border: 1px dashed #F59E0B; line-height: 1.7; color: #92400E; white-space: pre-wrap;">${page2_question_script || ''}</div>

            </div>

             <!-- [Triggers 2025] -->
            <div style="background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); border-radius: 16px; padding: 2.5rem; color: white; margin-bottom: 2rem;">
                <h2 style="font-size: 1.5rem; font-weight: 800; color: #F8FAFC; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-fire" style="color: #F59E0B;"></i> 동기 트리거 뱅크 (2025)
                </h2>
                <div style="font-size: 1rem; line-height: 1.8; color: #E2E8F0; white-space: pre-wrap;">${triggers_2025 || ''}</div>
            </div>
        </div>
    `;
}

function renderNewReportLayout(data, container) {
    const { page1, page2, trigger_bank, checklist } = data;
    const summary = page1.summary;
    const execution = page2.execution_plan;

    // Robust access helpers
    const getList = (arr) => Array.isArray(arr) ? arr : [];

    container.innerHTML = `
        <div class="report-wrapper" id="pdf-area" style="grid-column: 1 / -1; font-family: 'Pretendard', sans-serif;">
            
            <!-- Floating Actions -->
            <div class="report-actions no-pdf" style="display:flex; justify-content: flex-end; gap: 0.5rem; margin-bottom: 1rem;">
                 <button class="btn-secondary btn-sm" onclick="downloadImage()">
                    <i class="fa-solid fa-image"></i> 이미지 저장
                </button>
                <button class="btn-secondary btn-sm" onclick="resetAIResult(event)" style="color: #EF4444; border-color: #FEE2E2;">
                    <i class="fa-solid fa-rotate-right"></i> 초기화
                </button>
            </div>

            <!-- [PAGE 1] Summary Card -->
            <div class="report-page page-1" style="background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); padding: 2.5rem; margin-bottom: 2rem;">
                
                <!-- Header -->
                <!-- [Header: Anchor Theme & Sub Keywords] -->
                <div class="report-header" style="border-bottom: 2px solid #1E293B; padding-bottom: 1.5rem; margin-bottom: 2rem;">
                    <span style="background: #E0F2FE; color: #0284C7; font-weight:700; font-size: 0.85rem; padding: 4px 12px; border-radius: 20px;">생기부 디자인 컨설팅 리포트</span>
                    <h1 style="font-size: 2.2rem; font-weight: 800; color: #0F172A; margin-top: 0.8rem; margin-bottom: 0.5rem;">
                        ${summary.anchor_theme}
                    </h1>
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                        ${getList(summary.sub_keywords).map(k => `<span style="border: 1px solid #CBD5E1; padding: 4px 12px; border-radius: 15px; font-size: 0.85rem; color: #475569;">#${k}</span>`).join('')}
                    </div>
                </div>

                <!-- [Card] Profile Summary -->
                <div style="background: #F8FAFC; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; border: 1px solid #E2E8F0;">
                     <h3 style="font-size: 1.1rem; font-weight: 700; color: #1E293B; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-user-graduate" style="color: #64748B;"></i> 학생 프로필 요약
                     </h3>
                    <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0;">${summary.profile_summary}</p>
                </div>

                <!-- Representative Outputs (Full Width) -->
                <div class="report-section">
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: #1E293B; margin-bottom: 1rem; display: flex; align-items: center;">
                        <i class="fa-solid fa-star" style="color: #F59E0B; margin-right: 0.5rem;"></i> 대표 산출물 (Signature Outputs)
                    </h3>

                    <!-- [NEW] Top Summary Grid (Image 1 style) -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                        ${getList(summary.representative_outputs).map((item, idx) => {
        const isSetuk = idx === 0;
        const themeColor = isSetuk ? '#0284C7' : '#C026D3';
        const bgColor = isSetuk ? '#F0F9FF' : '#FDF4FF';
        const borderColor = isSetuk ? '#BAE6FD' : '#F5D0FE';

        const rawParts = item.detail.split(/→|->/).map(s => s.trim()).filter(s => s.length > 0);
        let summaryDesc = item.detail;

        const cleanContent = (str) => {
            let s = str.trim();
            const m = s.match(/(?:WHY|WHAT|HOW|RESULT|계기|활동|방법|결과|교과활동|교과|결과물)[^a-zA-Z0-9가-힣]*(.*)/i);
            if (m && m[1]) {
                s = m[1].trim();
                if (s.endsWith(')')) s = s.substring(0, s.length - 1).trim();
            } else {
                if (s.startsWith('(') && s.endsWith(')')) s = s.substring(1, s.length - 1).trim();
            }
            return s;
        };

        if (rawParts.length >= 4) {
            const what = cleanContent(rawParts[1]);
            const how = cleanContent(rawParts[2]);
            const result = cleanContent(rawParts[3]);
            summaryDesc = what + " " + how + " " + result;
        } else {
            summaryDesc = cleanContent(item.detail);
        }

        return `
                        <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.8rem;">
                            <div style="font-size: 0.9rem; font-weight: 700; color: ${themeColor};">
                                ${isSetuk ? '세특 중심' : '창체 중심'}
                            </div>
                            <h4 style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin: 0; line-height: 1.4;">${item.title.replace(/^\[.*?\]\s*/, '')}</h4>
                            <p style="font-size: 0.95rem; color: #475569; line-height: 1.6; margin: 0;">${summaryDesc}</p>
                        </div>
        `;
    }).join('')}
                    </div>

                    <!-- [EXISTING] Detailed List (Image 2 style) -->
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        ${getList(summary.representative_outputs).map((item, idx) => {
        const isSetuk = idx === 0;
        const themeColor = isSetuk ? '#0284C7' : '#C026D3';
        const bgColor = isSetuk ? '#F0F9FF' : '#FDF4FF';
        const borderColor = isSetuk ? '#BAE6FD' : '#F5D0FE';

        // [Parser] Split by arrow (→ or ->)
        // Expected: (WHY ...) → (WHAT ...) → (HOW ...) → (RESULT ...)
        const rawParts = item.detail.split(/→|->/).map(s => s.trim()).filter(s => s.length > 0);

        const cleanContentDetailed = (str) => {
            let s = str.trim();
            const m = s.match(/(?:WHY|WHAT|HOW|RESULT|계기|활동|방법|결과|교과활동|교과|결과물)[^a-zA-Z0-9가-힣]*(.*)/i);
            if (m && m[1]) {
                s = m[1].trim();
                if (s.endsWith(')')) s = s.substring(0, s.length - 1).trim();
            } else {
                if (s.startsWith('(') && s.endsWith(')')) s = s.substring(1, s.length - 1).trim();
            }
            return s;
        };

        // Map parts to labels if they match the 4-step structure
        let steps = [];
        if (rawParts.length >= 4) {
            steps = [
                { label: 'WHY (계기)', icon: 'fa-regular fa-lightbulb', content: cleanContentDetailed(rawParts[0]) },
                { label: 'WHAT (활동)', icon: 'fa-solid fa-book-open', content: cleanContentDetailed(rawParts[1]) },
                { label: 'HOW (방법)', icon: 'fa-solid fa-magnifying-glass-chart', content: cleanContentDetailed(rawParts[2]) },
                { label: 'RESULT (결과)', icon: 'fa-solid fa-file-lines', content: cleanContentDetailed(rawParts[3]) }
            ];
        } else {
            // Fallback for unstructured text
            steps = [{ label: '내용', icon: 'fa-solid fa-align-left', content: cleanContentDetailed(item.detail) }];
        }

        return `
                            <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 1.5rem;">
                                <div style="font-size: 0.9rem; font-weight: 600; color: ${themeColor}; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fa-solid fa-${isSetuk ? 'pen-nib' : 'lightbulb'}"></i>
                                    ${isSetuk ? '세특 중심' : '창체 중심'}
                                </div>
                                <h4 style="font-size: 1.15rem; font-weight: 700; color: #0F172A; margin-bottom: 1.2rem; line-height: 1.4;">${item.title}</h4>
                                
                                <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                                    ${steps.map(step => `
                                    <div style="display: flex; gap: 0.8rem; align-items: flex-start; background: rgba(255,255,255,0.6); padding: 0.8rem; border-radius: 8px; border: 1px solid ${borderColor};">
                                        <div style="flex-shrink: 0; width: 60px; font-size: 0.8rem; font-weight: 700; color: ${themeColor}; text-align: right; padding-top: 2px;">
                                            ${step.label.split(' ')[0]}
                                        </div>
                                        <div style="font-size: 0.95rem; color: #334155; line-height: 1.6; flex-grow: 1;">
                                            ${step.content}
                                        </div>
                                    </div>
                                    `).join('')}
                                </div>
                            </div>
                            `;
    }).join('')}
                    </div>
                </div>
                
                <!-- Teacher Record Guide -->
                <div style="margin-top: 2rem; background: #FFFBEB; border: 1px dashed #F59E0B; padding: 1.2rem; border-radius: 8px; margin-bottom: 2rem;">
                    <span style="display: block; font-weight: 700; color: #B45309; font-size: 0.9rem; margin-bottom: 0.3rem;">[교사 기록용 가이드]</span>
                    <p style="margin: 0; color: #78350F; font-weight: 500;">${summary.teacher_record_guide}</p>
                </div>

                <!-- Checklist (Moved Here) -->
                ${(() => {
            const checklistItems = getList(summary.checklist || checklist); // Support new location (summary.checklist) and fallback
            if (!checklistItems || checklistItems.length === 0) return '';
            return `
                    <div style="background: #111827; border-radius: 12px; padding: 1.5rem; color: white;">
                        <h4 style="font-weight: 700; color: #F3F4F6; margin-bottom: 1rem;">✅ Action Checklist</h4>
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            ${checklistItems.map(item => `
                            <li style="margin-bottom: 1rem; display: flex; gap: 0.8rem;">
                                <input type="checkbox" style="margin-top: 4px; accent-color: #3B82F6;">
                                <span style="color: #D1D5DB; font-size: 0.9rem; line-height: 1.5;">${item}</span>
                            </li>
                            `).join('')}
                        </ul>
                    </div>
                    `;
        })()}
            </div>

            <!-- [PAGE 2] Execution Card -->
            <div class="report-page page-2" style="background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); padding: 2.5rem; margin-bottom: 2rem;">
                
                <h2 style="font-size: 1.5rem; font-weight: 800; color: #0F172A; margin-bottom: 1.5rem; border-left: 5px solid #3B82F6; padding-left: 1rem;">
                    탐구 실행 계획 (Execution Plan)
                </h2>

                <!-- Subject Table -->
                <div style="margin-bottom: 2.5rem; overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                        <thead>
                            <tr style="background: #F8FAFC; border-bottom: 2px solid #E2E8F0;">
                                <th style="padding: 12px; text-align: left; color: #475569; font-weight: 600; font-size: 0.9rem; width: 15%;">과목</th>
                                <th style="padding: 12px; text-align: left; color: #475569; font-weight: 600; font-size: 0.9rem; width: 15%;">연계 개념</th>
                                <th style="padding: 12px; text-align: left; color: #475569; font-weight: 600; font-size: 0.9rem; width: 30%;">탐구 질문</th>
                                <th style="padding: 12px; text-align: left; color: #475569; font-weight: 600; font-size: 0.9rem;">활동 및 증거물</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${getList(execution.subject_table).map(row => `
                            <tr style="border-bottom: 1px solid #E2E8F0;">
                                <td style="padding: 12px; color: #0F172A; font-weight: 600;">${row.subject}</td>
                                <td style="padding: 12px; color: #334155;">${row.concept}</td>
                                <td style="padding: 12px; color: #0F172A; line-height: 1.5;">Q. ${row.question}</td>
                                <td style="padding: 12px; color: #334155;">
                                    <div style="margin-bottom: 4px;">🎯 ${row.activity}</div>
                                    <div style="font-size: 0.85rem; color: #64748B;">📂 ${row.evidence}</div>
                                </td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Creative Experience (Full Width Cards) -->
                <h3 style="font-size: 1.2rem; font-weight: 700; color: #1E293B; margin-bottom: 1rem;">창의적 체험활동 추천</h3>
                <div class="creative-list" style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2.5rem;">
                    ${['club', 'career', 'autonomous'].map((type, idx) => {
            const maps = { club: { title: '동아리', icon: 'users', color: '#3B82F6', bg: '#EFF6FF' }, career: { title: '진로', icon: 'compass', color: '#8B5CF6', bg: '#F3E8FF' }, autonomous: { title: '자율', icon: 'hand-sparkles', color: '#10B981', bg: '#ECFDF5' } };
            const map = maps[type];
            const options = getList(execution.creative_experience[`${type}_options`]);
            if (options.length === 0) return '';
            const item = options[0]; // Take top 1

            // [Parser] Split steps by number (1., 2., 3.)
            // Regex: lookahead for digit followed by dot
            const rawSteps = item.steps.split(/(?=\d\.\s)/).map(s => s.trim()).filter(s => s.length > 0);

            return `
                        <div style="background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #E2E8F0; display: flex; flex-direction: column; gap: 0.8rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: #1E293B; font-size: 1.1rem;">
                                    <div style="width: 32px; height: 32px; border-radius: 8px; background: ${map.bg}; color: ${map.color}; display: flex; align-items: center; justify-content: center;">
                                        <i class="fa-solid fa-${map.icon}"></i>
                                    </div>
                                    ${map.title} 활동
                                </div>
                                <span style="background: #F1F5F9; color: #64748B; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem;">추천 주제</span>
                            </div>
                            
                            <div>
                                <div style="font-weight: 700; color: #0F172A; font-size: 1.15rem; margin-bottom: 0.8rem;">${item.topic}</div>
                                <div style="font-size: 0.95rem; color: #475569; line-height: 1.6; background: #F8FAFC; padding: 1rem; border-radius: 8px;">
                                    <div style="font-weight: 600; color: #64748B; margin-bottom: 0.5rem; display:flex; align-items:center;">
                                        <i class="fa-solid fa-shoe-prints" style="color: #94A3B8; margin-right: 0.3rem;"></i> 실행 단계
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                        ${rawSteps.length > 1 ? rawSteps.map(step => `
                                            <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
                                                <span style="background: #E2E8F0; color: #475569; font-size: 0.75rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-top: 3px;">${step.charAt(0)}</span>
                                                <span>${step.substring(2).trim()}</span>
                                            </div>
                                        `).join('') : `<div>${item.steps}</div>`}
                                    </div>
                                </div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem;">
                                <span style="font-size: 0.85rem; font-weight: 600; color: #059669;">
                                    <i class="fa-solid fa-file-circle-check"></i> 예상 결과물:
                                </span>
                                <span style="font-size: 0.9rem; color: #334155;">${item.evidence}</span>
                            </div>
                        </div>
                        `;
        }).join('')}
                </div>

                <!-- Consulting Questions -->
                <div style="background: #E0E7FF; border-radius: 12px; padding: 1.5rem;">
                    <h3 style="font-size: 1.1rem; font-weight: 700; color: #3730A3; margin-bottom: 1rem;">
                         <i class="fa-solid fa-comments"></i> 심화 컨설팅 질문 (Self-Check)
                    </h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${getList(execution.consulting_questions).map(q => `
                        <div style="background: white; color: #4338CA; padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            ${q}
                        </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- [Part 3] Trigger Bank (Checklist moved to Page 1) -->
            <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem;">
                
                <!-- Trigger Bank -->
                <div style="background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #E2E8F0;">
                    <h4 style="font-weight: 700; color: #1E293B; margin-bottom: 1rem;">🔥 Motivation Trigger Bank (2025)</h4>
                    
                    <!-- Books -->
                    <div style="margin-bottom: 1.5rem;">
                        <span style="font-size: 0.9rem; font-weight: 700; color: #475569; display: block; margin-bottom: 0.8rem; border-bottom: 2px solid #F1F5F9; padding-bottom: 0.5rem;">📚 추천 도서</span>
                        ${getList(trigger_bank.books).map(b => `
                        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; align-items: flex-start; background: #F8FAFC; padding: 1rem; border-radius: 8px;">
                            <div style="background: white; width: 44px; height: 58px; border: 1px solid #E2E8F0; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #94A3B8; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                                <i class="fa-solid fa-book" style="font-size: 1.2rem;"></i>
                            </div>
                            <div style="flex-grow: 1;">
                                <div style="font-weight: 700; color: #0F172A; font-size: 1rem; margin-bottom: 0.3rem;">${b.title}</div>
                                <div style="font-size: 0.9rem; color: #334155; margin-bottom: 0.4rem; line-height: 1.5;">${b.desc || ''}</div>
                                <div style="font-size: 0.85rem; color: #059669; background: #ECFDF5; padding: 4px 8px; border-radius: 4px; display: inline-block;">
                                    <i class="fa-solid fa-link" style="margin-right: 4px;"></i>${b.connection}
                                </div>
                            </div>
                        </div>
                        `).join('')}
                    </div>

                    <!-- Keywords -->
                    <div>
                        <span style="font-size: 0.9rem; font-weight: 700; color: #475569; display: block; margin-bottom: 0.8rem; border-bottom: 2px solid #F1F5F9; padding-bottom: 0.5rem;">🔑 트렌드 키워드</span>
                        <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                            ${getList(trigger_bank.keywords).map(k => `
                            <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 1rem; background: white;">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                                    <span style="font-weight: 700; color: #2563EB; font-size: 1rem;">#${k.keyword}</span>
                                </div>
                                <div style="font-size: 0.9rem; color: #334155; margin-bottom: 0.5rem; line-height: 1.5;">
                                    ${k.desc || ''}
                                </div>
                                <div style="font-size: 0.85rem; color: #64748B; background: #F1F5F9; padding: 6px 10px; border-radius: 6px;">
                                    <i class="fa-solid fa-lightbulb" style="color: #F59E0B; margin-right: 5px;"></i> ${k.connection}
                                </div>
                            </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;
}

async function resetAIResult(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    showCustomConfirm(
        '현재 생성된 가이드 데이터를 초기화하고 다시 생성하시겠습니까?',
        () => {
            const profile = dataManager.getProfile();
            const selectedUnivId = (typeof stage1State !== 'undefined' ? stage1State.selectedUnivId : null) || (profile.lastSelectedUniv ? profile.lastSelectedUniv.id : null);
            const data = dataManager.getData();

            // Filter out results for the current university
            data.consultingResults = data.consultingResults.filter(r => r.univ && String(r.univ.id) !== String(selectedUnivId));
            dataManager.saveData(data);

            // Refresh view
            const content = document.getElementById('contentContainer');
            renderStage2(content);
        }
    );
}

function downloadImage() {
    const element = document.getElementById('pdf-area');
    const profile = dataManager.getProfile();
    const fileName = `${profile.name || '학생'}_AI_탐구가이드.png`;

    // Temporarily hide buttons for image capture
    const actions = element.querySelectorAll('.no-pdf');
    actions.forEach(el => el.style.display = 'none');

    setTimeout(() => {
        html2canvas(element, { scale: 2, useCORS: true, logging: false }).then(canvas => {
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();
            actions.forEach(el => el.style.display = '');
        }).catch(err => {
            console.error('Save failed:', err);
            actions.forEach(el => el.style.display = '');
            alert('이미지 생성 중 오류가 발생했습니다.');
        });
    }, 100);
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
