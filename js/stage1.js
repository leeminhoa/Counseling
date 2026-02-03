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

    // Load initial empty or recent search if needed
}

// --- Event Handlers ---

async function handleSearch(e) {
    const query = e.target.value.trim();
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
    stage1State.selectedUnivId = univId;

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
            <div class="univ-name">${univ.univ_name}</div>
            <div class="major-name">${univ.raw_major_name}</div>
            <div class="category-badge">${univ.top_category} > ${univ.canonical_major}</div>
        </div>
    `).join('');
}

async function renderUnivDetail(univId) {
    const detailPanel = document.getElementById('univDetailPanel');
    const univData = stage1State.searchResults.find(u => u.id === univId);

    if (!univData) return;

    // Fetch related data
    const subjects = await dbService.getMajorSubjects(univId);
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

        <div class="stats-row" style="margin-top: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; color: #1E293B; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-chart-simple" style="color: var(--primary); font-size: 0.9rem;"></i> 
                전년도 입시 결과 통계
            </h3>
            ${stats ? `
            <div class="stats-box" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.25rem;">
                ${stats.admission_type ? `
                <div class="stat-item">
                    <span class="stat-label" style="color: #64748B; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">전형</span>
                    <span class="stat-value" style="font-size: 1rem; font-weight: 700; color: #0F172A;">${stats.admission_type}</span>
                </div>
                ` : ''}
                ${stats.competition_rate ? `
                <div class="stat-item">
                    <span class="stat-label" style="color: #64748B; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">경쟁률</span>
                    <span class="stat-value" style="font-size: 1rem; font-weight: 700; color: #0F172A;">${stats.competition_rate}:1</span>
                </div>
                ` : ''}
                ${stats.kor_math_sci_pct ? `
                <div class="stat-item">
                    <span class="stat-label" style="color: #64748B; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">백분위 합</span>
                    <span class="stat-value" style="font-size: 1rem; font-weight: 700; color: #0F172A;">${stats.kor_math_sci_pct}</span>
                </div>
                ` : ''}
                ${stats.eng_grade ? `
                <div class="stat-item">
                    <span class="stat-label" style="color: #64748B; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">영어</span>
                    <span class="stat-value" style="font-size: 1rem; font-weight: 700; color: #0F172A;">${stats.eng_grade}등급</span>
                </div>
                ` : ''}
            </div>
            ` : '<div class="stats-placeholder" style="color: #94A3B8; font-size: 0.9rem; padding: 2rem; text-align: center; background: #F8FAFC; border-radius: 12px; border: 1px dashed #E2E8F0;">입시 결과 데이터(전형, 경쟁률 등) 정보가 아직 등록되지 않았습니다.</div>'}
        </div>

        <div class="roadmap-section">
            <h3 class="section-title"><i class="fa-solid fa-list-check"></i> 권장 이수 과목</h3>
            <div class="subject-grid">
                ${renderSubjectList(subjects, 'core')}
                ${renderSubjectList(subjects, 'recommended')}
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
    const title = type === 'core' ? '핵심 과목 (필수)' : '권장 과목';
    const colorClass = type === 'core' ? 'core-group' : 'rec-group';

    if (filtered.length === 0) return '';

    return `
        <div class="subject-group ${colorClass}">
            <h4 class="group-title">${title}</h4>
            <div class="subject-chips">
                ${filtered.map(s => {
        const isMatched = studentSubjects.includes(s.course_name);
        return `
                        <button type="button" 
                                class="subject-chip ${isMatched ? 'matched' : 'not-matched'}" 
                                onclick="toggleMySubject('${s.course_name}')"
                                title="${isMatched ? '이수 취소하기' : '이수 완료로 표시하기'}">
                            ${isMatched ? '<i class="fa-solid fa-check"></i> ' : ''}${s.course_name}
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
