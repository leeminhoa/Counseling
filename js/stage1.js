/**
 * stage1.js
 * Stage 1: 대학 분석 및 과목 이수 매칭 뷰 렌더링
 */

const stage1State = {
    selectedUnivId: null,
    searchResults: []
};

async function renderStage1(container) {
    container.innerHTML = `
        <div class="stage1-container">
            <!-- Left Panel: Search & List (Master) -->
            <div class="panel master-panel">
                <div class="search-box">
                    <label for="univSearchInput" class="sr-only">대학 또는 학과 검색</label>
                    <input type="text" id="univSearchInput" placeholder="대학명 또는 학과명 검색..." autocomplete="off">
                    <i class="fa-solid fa-search search-icon"></i>
                </div>
                <div id="univList" class="univ-list">
                    <!-- List Items Injected Here -->
                    <div class="empty-state">검색어를 입력하세요.</div>
                </div>
            </div>

            <!-- Right Panel: Detail & Roadmap (Detail) -->
            <div class="panel detail-panel" id="univDetailPanel">
                <div class="empty-placeholder">
                    <i class="fa-solid fa-school-flag" style="font-size: 3rem; margin-bottom: 1rem; color: var(--border-color);"></i>
                    <p>좌측 목록에서 대학/학과를 선택하세요.</p>
                </div>
            </div>
        </div>
    `;

    // Event Listeners
    const searchInput = document.getElementById('univSearchInput');
    searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Load initial empty or recent selection
    const profile = dataManager.getProfile();

    // Auto-Search if targetMajor exists and NO specific university is selected (Stage 1-2 flow)
    if (profile && profile.targetMajor && !profile.lastSelectedUniv) {
        // Clear any stale local state
        stage1State.selectedUnivId = null;

        searchInput.value = profile.targetMajor;
        // Trigger search logic manually
        await handleSearch({ target: { value: profile.targetMajor } });
    }
    // Restore state if lastSelectedUniv exists (and not overridden by new major selection flow if we wanted priority)
    else if (profile && profile.lastSelectedUniv) {
        // Restore state
        stage1State.selectedUnivId = profile.lastSelectedUniv.id;
        // Search results need to contain the selected univ for renderUnivDetail to work
        stage1State.searchResults = [profile.lastSelectedUniv];

        // Render Detail View
        renderUnivDetail(profile.lastSelectedUniv.id);
    }
}

// --- Event Handlers ---

async function handleSearch(e) {
    const query = (e.target ? e.target.value : e).trim(); // Handle both Event and direct string/object
    const listContainer = document.getElementById('univList');

    if (query.length < 2) {
        listContainer.innerHTML = '<div class="empty-state">2글자 이상 입력하세요.</div>';
        return;
    }

    // Call DB Service
    const results = await dbService.searchUniversities(query);
    stage1State.searchResults = results;

    renderUnivList(results, listContainer);
}

function handleUnivSelect(univId) {
    const univData = stage1State.searchResults.find(u => u.id === univId);
    if (!univData) return;

    stage1State.selectedUnivId = univId;

    // Save selection to DataManager for persistence
    dataManager.updateProfile({ lastSelectedUniv: univData });

    // Update List UI (Active State)
    document.querySelectorAll('.univ-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.id) === univId) item.classList.add('active');
    });

    // Render Detail View
    renderUnivDetail(univId);
}

// --- Render Functions ---

function renderUnivList(data, container) {
    if (data.length === 0) {
        container.innerHTML = '<div class="empty-state">검색 결과가 없습니다.</div>';
        return;
    }

    container.innerHTML = data.map(univ => `
        <div class="univ-item" data-id="${univ.id}" onclick="handleUnivSelect(${univ.id})">
            <div class="univ-item-header">
                <div class="univ-name" style="margin:0;">${univ.univ_name}</div>
            </div>
            <div class="major-name" style="text-align: left;">${univ.raw_major_name}</div>
            <div class="category-badge">${univ.top_category} > ${univ.canonical_major}</div>
        </div>
    `).join('');
}

async function renderUnivDetail(univId) {
    const detailPanel = document.getElementById('univDetailPanel');
    const univData = stage1State.searchResults.find(u => u.id === univId);

    if (!univData) return;

    // Fetch related data
    // Fetch related data
    // [MODIFIED] Use the View `v_univ_major_with_recommend` instead of raw join
    const recData = await dbService.getUnivMajorRecommendation(univData.univ_name, univData.raw_major_name);
    let subjects = [];
    if (recData) {
        // Adapt View format to existing UI format: { course_name, bucket }
        const core = (recData.core_subjects || []).map(name => ({ course_name: name, bucket: 'core' }));
        const rec = (recData.recommended_subjects || []).map(name => ({ course_name: name, bucket: 'recommended' }));
        const suggested = (recData.extra_recommend_subjects || []).map(name => ({ course_name: name, bucket: 'suggested' }));
        subjects = [...core, ...rec, ...suggested];
    } else {
        // Fallback for universities not in the view (should be rare if view covers all)
        subjects = await dbService.getMajorSubjects(univId);
    }

    const stats = await dbService.getAdmissionStats(univId);
    console.log('Full Admission Stats for ID', univId, ':', stats);

    const profile = dataManager.getProfile() || { gpa: 0, subjects: [] };
    const matchedCount = (subjects || []).filter(s => (profile.subjects || []).includes(s.course_name)).length;

    // Template
    detailPanel.innerHTML = `
        <div class="detail-header">
            <div class="detail-header-left">
                <h2 class="detail-title">${univData.univ_name} ${univData.raw_major_name}</h2>
                <div class="detail-tags">
                    <span class="badge" style="background: #E0E7FF; color: #4338CA;">${univData.top_category}</span>
                    <span class="badge" style="background: #DCFCE7; color: #15803D;">${univData.canonical_major} 계열</span>
                </div>
            </div>
            
            <div class="student-match-status card clickable" onclick="openProfileModal()">
                <div class="match-info">
                    <span class="label">나의 합격 가능성 분석</span>
                    <div class="match-values">
                        <span class="v-gpa">내신 ${profile.gpa || '-.-'}등급</span>
                        <span class="v-subj">매칭과목 ${matchedCount}개</span>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-right"></i>
            </div>
        </div>

        <div class="stats-row" style="margin-top: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem;">
                <h3 style="font-size: 1.1rem; font-weight: 800; color: #1E293B; margin: 0; display: flex; align-items: center; gap: 0.6rem;">
                    <i class="fa-solid fa-chart-line" style="color: var(--primary-color);"></i> 
                    입시 결과 상세 분석
                </h3>
                <span style="font-size: 0.8rem; color: #94A3B8;">*최근 1개년 입결 기준</span>
            </div>

            ${stats ? `
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="stat-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.25rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <span style="display: block; font-size: 0.7rem; font-weight: 700; color: #64748B; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">전형 유형</span>
                    <span style="font-size: 1rem; font-weight: 800; color: #0F172A;">${stats.admission_type || '-'}</span>
                </div>
                <div class="stat-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.25rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <span style="display: block; font-size: 0.7rem; font-weight: 700; color: #64748B; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">경쟁률</span>
                    <span style="font-size: 1.1rem; font-weight: 800; color: #E11D48;">${stats.competition_rate ? stats.competition_rate + ':1' : '-'}</span>
                </div>
                <div class="stat-card" style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 12px; padding: 1.25rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <span style="display: block; font-size: 0.7rem; font-weight: 700; color: #0369A1; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">백분위 합(컷)</span>
                    <span style="font-size: 1.1rem; font-weight: 800; color: #0284C7;">${stats.kor_math_sci_pct || '-'}</span>
                </div>
                <div class="stat-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.25rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <span style="display: block; font-size: 0.7rem; font-weight: 700; color: #64748B; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">영어 등급</span>
                    <span style="font-size: 1.1rem; font-weight: 800; color: #0F172A;">${stats.eng_grade ? stats.eng_grade + '등급' : '-'}</span>
                </div>
            </div>

            <!-- Stability Analysis Widget -->
            ${(profile.totalPercentile && stats.kor_math_sci_pct) ? `
                <div class="stability-widget" style="background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%); border: 1px solid #E2E8F0; border-radius: 16px; padding: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 1.2rem;">
                         <div class="analysis-indicator" style="width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: ${(() => {
                    const diff = profile.totalPercentile - stats.kor_math_sci_pct;
                    if (diff >= 5) return '#DCFCE7';
                    if (diff >= -2) return '#FEF9C3';
                    return '#FEE2E2';
                })()};">
                            <i class="fa-solid ${(() => {
                    const diff = profile.totalPercentile - stats.kor_math_sci_pct;
                    if (diff >= 5) return 'fa-shield-check';
                    if (diff >= -2) return 'fa-person-running';
                    return 'fa-triangle-exclamation';
                })()}" style="color: ${(() => {
                    const diff = profile.totalPercentile - stats.kor_math_sci_pct;
                    if (diff >= 5) return '#166534';
                    if (diff >= -2) return '#854d0e';
                    return '#991b1b';
                })()};"></i>
                         </div>
                         <div>
                            <span style="display: block; font-size: 0.8rem; font-weight: 600; color: #64748B; margin-bottom: 0.2rem;">합격 안정성 분석 결과</span>
                            <h4 style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin: 0;">
                                ${(() => {
                    const diff = profile.totalPercentile - stats.kor_math_sci_pct;
                    const diffText = (diff > 0 ? '+' : '') + diff.toFixed(1);
                    if (diff >= 5) return `<span style="color: #15803D;">안성 맞춤 (안정)</span> <span style="font-size: 0.9rem; font-weight: 600; color: #64748B; margin-left: 0.5rem;">[${diffText}점]</span>`;
                    if (diff >= -2) return `<span style="color: #A16207;">소신 지원 (적정)</span> <span style="font-size: 0.9rem; font-weight: 600; color: #64748B; margin-left: 0.5rem;">[${diffText}점]</span>`;
                    return `<span style="color: #B91C1C;">도전 지원 (상향)</span> <span style="font-size: 0.9rem; font-weight: 600; color: #64748B; margin-left: 0.5rem;">[${diffText}점]</span>`;
                })()}
                            </h4>
                         </div>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: block; font-size: 0.75rem; color: #94A3B8; margin-bottom: 0.3rem;">나의 점수 : ${profile.totalPercentile}점</span>
                        <div style="width: 120px; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${Math.min(100, (profile.totalPercentile / 300) * 100)}%; height: 100%; background: var(--primary-color);"></div>
                        </div>
                    </div>
                </div>
            ` : `
                <div class="analysis-placeholder" style="background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 12px; padding: 1.5rem; text-align: center; color: #64748B; font-size: 0.9rem;">
                    <i class="fa-solid fa-circle-info" style="margin-right:0.4rem;"></i> 프로필에서 나의 **백분위 합**을 입력하면 합격 안정성을 분석해 드립니다.
                </div>
            `}

            ` : '<div class="stats-placeholder" style="color: #94A3B8; font-size: 0.9rem; padding: 2rem; text-align: center; background: #F8FAFC; border-radius: 12px; border: 1px dashed #E2E8F0;">입시 결과 데이터 정보가 등록되지 않았습니다.</div>'}
        </div>

        <!-- [NEW] Basic Subjects Section (Hardcoded) -->
        <div class="subject-category" style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px; font-weight:800; font-size:1.1rem; color:#1E293B;">
                <i class="fa-solid fa-list-check" style="color:var(--primary-color);"></i> 기본 과목
            </h4>
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; background: #fff;">
                <h5 style="margin: 0 0 1rem 0; font-size: 0.95rem; font-weight: 700; color: #dc2626; display: flex; align-items: center; gap: 8px;">
                    <span style="display:inline-block; width:8px; height:8px; background-color:#dc2626; border-radius:50%;"></span>
                    수능 시험 과목
                </h5>
                <div style="border-top: 2px solid #fee2e2; padding-top: 1rem; display: flex; flex-wrap: wrap; gap: 8px;">
                    ${['영어 1', '영어 2', '대수', '미적분1', '독서와 작문', '문학', '화법과 언어'].map(sub => `
                        <span class="subject-chip" style="background-color: #f8fafc; color: #475569; border: 1px solid #e2e8f0; cursor: default; padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.9rem; font-weight: 500;">
                            ${sub}
                        </span>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="roadmap-section">
            <h3 class="section-title"><i class="fa-solid fa-list-check"></i> 권장 이수 과목</h3>
            <div class="subject-grid">
                ${renderSubjectList(subjects, 'core')}
                ${renderSubjectList(subjects, 'recommended')}
                ${renderSubjectList(subjects, 'suggested')}
            </div>
        </div>
        
        <div class="action-bar_bottom">
            <button class="btn-primary" onclick="proceedToStage2()">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                AI 탐구 가이드 생성하기
            </button>
        </div>
    `;
}

function renderSubjectList(subjects, type) {
    const profile = dataManager.getProfile();
    const studentSubjects = (profile && profile.subjects) ? profile.subjects : [];

    const filtered = subjects.filter(s => s.bucket === type);

    let title = '';
    let colorClass = '';

    switch (type) {
        case 'core':
            title = '핵심 과목 (필수)';
            colorClass = 'core-group';
            break;
        case 'recommended':
            title = '권장 과목';
            colorClass = 'rec-group';
            break;
        case 'suggested':
            title = '추천 과목';
            colorClass = 'suggested-group'; // New CSS class needed or inline style
            break;
    }

    if (filtered.length === 0) return '';

    return `
        <div class="subject-group ${colorClass}">
            <h4 class="group-title">${title}</h4>
            <div class="subject-chips">
                ${filtered.map(s => {
        // [Fix] Normalize strings (trim) to handle DB whitespace inconsistencies
        const cleanCourseName = s.course_name.trim();
        const isMatched = studentSubjects.some(sub => sub.trim() === cleanCourseName);

        return `
                        <button type="button" 
                                class="subject-chip ${isMatched ? 'matched' : 'not-matched'}" 
                                onclick="toggleMySubject('${cleanCourseName}')"
                                title="${isMatched ? '이수 취소하기' : '이수 완료로 표시하기'}">
                            ${isMatched ? '<i class="fa-solid fa-check"></i> ' : ''}${cleanCourseName}
                        </button>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}

function toggleMySubject(courseName) {
    const profile = dataManager.getProfile() || { subjects: [] };
    if (!profile.subjects) profile.subjects = [];

    const index = profile.subjects.indexOf(courseName);
    if (index > -1) {
        // 이미 있으면 제거 (토글)
        profile.subjects.splice(index, 1);
    } else {
        // 없으면 추가
        profile.subjects.push(courseName);
    }

    dataManager.saveProfile(profile);

    // UI 즉시 업데이트
    if (stage1State.selectedUnivId) {
        renderUnivDetail(stage1State.selectedUnivId);
    }

    // 상단바는 과목수를 표시하지 않기로 했으므로 업데이트 불필요하지만, 
    // AI 가이드 생성 시 데이터 정합성을 위해 호출은 유지
    updateUserStatusUI();
}

// Utility: Debounce
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function proceedToStage2() {
    const profile = dataManager.getProfile();

    // Check if essential info is missing
    if (!profile || !profile.gpa || !profile.subjects || profile.subjects.length === 0) {
        alert('AI 가이드를 생성하려면 먼저 나의 내신과 이수 과목을 입력해야 합니다.');
        if (typeof openProfileModal === 'function') openProfileModal();
        return;
    }

    // Call Global proceedToStage2 in app.js
    if (typeof window.proceedToStage2Action === 'function') {
        window.proceedToStage2Action();
    } else {
        alert('Stage 2 전환 기능 연결 중입니다.');
    }
}
