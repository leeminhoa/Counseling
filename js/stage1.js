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
    const profile = dataManager.getProfile();
    let categoryFilter = null;
    if (profile && profile.targetMajor === query) {
        categoryFilter = profile.selectedCategory;
    }
    const results = await dbService.searchUniversities(query, categoryFilter);
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

    // [NEW] Fetch comparison data
    // Pass canonical_major (e.g., '수의과') to find similar depts even if raw name differs ('수의예과' vs '수의학과')
    const similarUnivs = await dbService.getSimilarMajorUniversities(
        univData.raw_major_name,
        univData.univ_name,
        univData.canonical_major
    );

    // [Feature Change] Ensure CURRENT university is ALWAYS in the list
    let currentUnivObj = null;
    if (stats) {
        currentUnivObj = {
            univName: univData.univ_name,
            majorName: univData.raw_major_name,
            category: univData.top_category,
            cutoff: stats.kor_math_sci_pct,
            engGrade: stats.eng_grade,
            admissionType: stats.admission_type,
            isCurrent: true
        };
    }

    // Sort ONLY the similar universities first
    if (similarUnivs.length > 0) {
        if (profile.totalPercentile) {
            similarUnivs.sort((a, b) => {
                const diffA = Math.abs(profile.totalPercentile - (a.cutoff || 0));
                const diffB = Math.abs(profile.totalPercentile - (b.cutoff || 0));
                return diffA - diffB;
            });
        } else {
            similarUnivs.sort((a, b) => (b.cutoff || 0) - (a.cutoff || 0));
        }
    }

    // Take top 4 from similar univs
    let top4Similar = similarUnivs.slice(0, 4);

    // Combine: Current + Top 4
    let finalComparisonList = [];
    if (currentUnivObj) {
        finalComparisonList.push(currentUnivObj);
    }
    finalComparisonList = finalComparisonList.concat(top4Similar);

    // Optional: Re-sort the final 5 items for better readability (e.g. by cutoff descending or similarity)
    // Let's sort by cutoff descending for a clean look, or keep the user's focus (current) at top?
    // User requirement: "1개는 무조건 나와야 해". Doesn't specify order.
    // Standard table behavior: Sort by cutoff desc usually looks best.
    finalComparisonList.sort((a, b) => (b.cutoff || 0) - (a.cutoff || 0));

    const top5Similar = finalComparisonList;
    const matchedCount = (subjects || []).filter(s => (profile.subjects || []).includes(s.course_name)).length;

    // Template
    detailPanel.innerHTML = `
        <div class="detail-actions no-pdf" style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
            <button onclick="downloadUnivDetailImage()" style="padding: 0.5rem 0.8rem; background: white; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 0.85rem; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 0.4rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <i class="fa-solid fa-image" style="color: #3B82F6;"></i> 분석 결과 이미지 저장
            </button>
        </div>
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

        <!-- [NEW] University Comparison Table -->
        ${top5Similar.length > 0 ? `
        <div class="comparison-section" style="margin-top: 2rem; margin-bottom: 2rem;">
            <h3 style="font-size: 1.1rem; font-weight: 800; color: #1E293B; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.6rem;">
                <i class="fa-solid fa-scale-balanced" style="color: var(--primary-color);"></i> 
                동일 학과 대학 비교 (${univData.canonical_major} 계열)
            </h3>
            <div class="table-container" style="overflow-x: auto; border: 1px solid #E2E8F0; border-radius: 12px; background: #fff;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead style="background: #F8FAFC; color: #64748B; font-weight: 600;">
                        <tr>
                            <th style="padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #E2E8F0;">대학명</th>
                            <th style="padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #E2E8F0;">학과명</th>
                            <th style="padding: 0.75rem 1rem; text-align: center; border-bottom: 1px solid #E2E8F0;">전형</th>
                            <th style="padding: 0.75rem 1rem; text-align: center; border-bottom: 1px solid #E2E8F0;">컷라인 (백분위/영어)</th>
                            <th style="padding: 0.75rem 1rem; text-align: center; border-bottom: 1px solid #E2E8F0;">나의 위치</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${top5Similar.map(univ => {
        const diff = profile.totalPercentile ? (profile.totalPercentile - univ.cutoff).toFixed(1) : null;
        let badge = '-';
        let badgeColor = '#94A3B8';
        let badgeBg = '#F1F5F9';

        if (diff !== null) {
            if (diff >= 5) { badge = '안정'; badgeColor = '#166534'; badgeBg = '#DCFCE7'; }
            else if (diff >= -2) { badge = '적정'; badgeColor = '#854d0e'; badgeBg = '#FEF9C3'; }
            else { badge = '상향'; badgeColor = '#991b1b'; badgeBg = '#FEE2E2'; }
        }

        // Highlighting style
        const rowStyle = univ.isCurrent ? "background-color: #F0F9FF; font-weight: bold;" : "";
        const nameStyle = univ.isCurrent ? "color: var(--primary-color);" : "color: #334155;";

        return `
                            <tr style="border-bottom: 1px solid #F1F5F9; ${rowStyle}">
                                <td style="padding: 0.75rem 1rem; font-weight: 600; ${nameStyle}">
                                    ${univ.univName} ${univ.isCurrent ? '<i class="fa-solid fa-check" style="font-size:0.8em; margin-left:4px;"></i>' : ''}
                                </td>
                                <td style="padding: 0.75rem 1rem; color: #475569;">
                                    ${univ.majorName}
                                </td>
                                <td style="padding: 0.75rem 1rem; text-align: center; color: #64748B;">${univ.admissionType || '-'}</td>
                                <td style="padding: 0.75rem 1rem; text-align: center; font-weight: 700; color: #0F172A;">
                                    ${univ.cutoff || '-'} <span style="font-size: 0.8em; color: #64748B; font-weight: 400;">(영 ${univ.engGrade || '-'}등급)</span>
                                </td>
                                <td style="padding: 0.75rem 1rem; text-align: center;">
                                    ${diff !== null ? `
                                        <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 700;">${badge}</span>
                                    ` : '<span style="color: #94A3B8;">-</span>'}
                                </td>
                            </tr>
                            `;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

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
    const inprogressSubjects = (profile && profile.inprogressSubjects) ? profile.inprogressSubjects : [];
    const plannedSubjects = (profile && profile.plannedSubjects) ? profile.plannedSubjects : [];

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
        const isCompleted = studentSubjects.some(sub => sub.trim() === cleanCourseName);
        const isInProgress = inprogressSubjects.some(sub => sub.trim() === cleanCourseName);
        const isPlanned = plannedSubjects.some(sub => sub.trim() === cleanCourseName);

        // Decide CSS class and Icon based on state
        let chipClass = 'not-matched';
        let iconHtml = '';
        let tooltip = '추가 이수(예정)로 표시하기';

        if (isCompleted) {
            chipClass = 'matched completed';
            iconHtml = '<i class="fa-solid fa-check-double"></i> ';
            tooltip = '기수강 완료 과목 (프로필에서 관리)';
        } else if (isInProgress) {
            chipClass = 'matched inprogress';
            iconHtml = '<i class="fa-solid fa-spinner fa-spin-pulse"></i> ';
            tooltip = '현재 이수 중인 과목 (프로필에서 관리)';
        } else if (isPlanned) {
            chipClass = 'matched planned';
            iconHtml = '<i class="fa-solid fa-calendar-check"></i> ';
            tooltip = '이수 예정 취소하기';
        }

        return `
                        <button type="button" 
                                class="subject-chip ${chipClass}" 
                                onclick="toggleMySubject('${cleanCourseName}', ${isCompleted}, ${isInProgress})"
                                title="${tooltip}">
                            ${iconHtml}${cleanCourseName}
                        </button>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}

function toggleMySubject(courseName, isCompleted, isInProgress) {
    // Prevent toggling of subjects already set as completed or inprogress in profile modal
    if (isCompleted || isInProgress) {
        showCustomAlert('프로필에 설정된 기수강/이수중 과목입니다. 수정은 프로필 설정 메뉴를 이용해주세요.');
        return;
    }

    const profile = dataManager.getProfile() || { subjects: [] };
    if (!profile.subjects) profile.subjects = [];
    if (!profile.plannedSubjects) profile.plannedSubjects = [];

    const index = profile.plannedSubjects.indexOf(courseName);
    if (index > -1) {
        // 이미 예정 리스트에 있으면 제거 (토글)
        profile.plannedSubjects.splice(index, 1);
    } else {
        // 없으면 추가 (이수 예정으로)
        profile.plannedSubjects.push(courseName);
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
        showCustomAlert('AI 가이드를 생성하려면 먼저 나의 내신과 이수 과목을 입력해야 합니다.');
        if (typeof openProfileModal === 'function') openProfileModal();
        return;
    }

    // Call Global proceedToStage2 in app.js
    if (typeof window.proceedToStage2Action === 'function') {
        window.proceedToStage2Action();
    } else {
        showCustomAlert('Stage 2 전환 기능 연결 중입니다.');
    }
}

// [NEW] 대학 상세 분석 영역만 캡처하여 이미지 다운로드
window.downloadUnivDetailImage = function() {
    const element = document.getElementById('univDetailPanel');
    const profile = dataManager.getProfile();
    const fileName = `${profile.name || '학생'}_대학분석.png`;

    // 일시적으로 pdf 캡처에서 숨겨야 할 요소들 가리기
    const actions = element.querySelectorAll('.no-pdf');
    actions.forEach(el => el.style.display = 'none');

    // 캡처용 푸터 이미지 동적 추가
    const footer = document.createElement('img');
    footer.src = 'assets/footer_logo.png';
    footer.style.width = '100%';
    footer.style.display = 'block';
    footer.style.marginTop = '2rem';
    footer.style.borderRadius = '0 0 12px 12px';
    element.appendChild(footer);

    footer.onload = () => {
        setTimeout(() => {
            html2canvas(element, { scale: 2, useCORS: true, logging: false }).then(canvas => {
                const link = document.createElement('a');
                link.download = fileName;
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                // 다시 보이기 빛 뒷정리
                actions.forEach(el => el.style.display = '');
                if (footer && footer.parentNode) footer.parentNode.removeChild(footer);
            }).catch(err => {
                console.error('Image capture failed:', err);
                actions.forEach(el => el.style.display = '');
                if (footer && footer.parentNode) footer.parentNode.removeChild(footer);
                showCustomAlert('이미지 생성 중 오류가 발생했습니다.');
            });
        }, 100);
    };
    
    // 혹시라도 이미지가 즉시 로드 안되거나 에러날 경우 대비
    footer.onerror = () => {
        if (footer && footer.parentNode) footer.parentNode.removeChild(footer);
        actions.forEach(el => el.style.display = '');
        showCustomAlert('푸터 이미지를 불러오지 못했습니다. 다시 시도해주세요.');
    }
};
