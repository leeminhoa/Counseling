/**
 * stage1_1.js
 * Stage 1-1: 계열 추천 (Field Recommendation)
 */

async function renderStage1_1(container) {
    const profile = dataManager.getProfile();

    // Check if profile exists and has subjects
    if (!profile || (!profile.completedSubjects?.length && !profile.inprogressSubjects?.length)) {
        container.innerHTML = `
            <div class="empty-state-card" style="text-align: center; padding: 4rem 2rem;">
                <i class="fa-solid fa-clipboard-list" style="font-size: 3rem; color: #CBD5E1; margin-bottom: 1.5rem;"></i>
                <h3 style="font-size: 1.25rem; font-weight: 700; color: #475569; margin-bottom: 0.75rem;">분석할 데이터가 부족합니다</h3>
                <p style="color: #64748B; margin-bottom: 2rem;">정확한 계열 추천을 위해 [정보 입력하기]에서<br>이수 과목 정보를 입력해주세요.</p>
                <button class="btn-primary" onclick="openProfileModal()">정보 입력하기</button>
            </div>
        `;
        return;
    }

    // Combine subjects for analysis
    const allSubjects = [
        ...(profile.completedSubjects || []),
        ...(profile.inprogressSubjects || [])
    ];

    container.innerHTML = `
        <div class="stage-header" style="margin-bottom: 2rem;">
            <h2 style="font-size: 1.75rem; font-weight: 800; color: #1E293B; margin-bottom: 0.5rem;">
                <i class="fa-solid fa-compass" style="color: var(--primary-color); margin-right: 0.5rem;"></i>
                맞춤형 계열 추천
            </h2>
            <p style="color: #64748B; font-size: 1rem;">
                ${profile.name}님이 이수한 과목 데이터를 분석하여, 가장 적합한 전공 계열을 추천해드립니다.
            </p>
        </div>
        <div id="recommendationGrid" class="recommendation-grid">
            <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
                <p style="margin-top: 1rem; color: #64748B;">분석 중입니다...</p>
            </div>
        </div>
    `;

    // Fetch Logic
    try {
        const recommendations = await dbService.getFieldRecommendations(allSubjects);
        renderRecommendations(recommendations);
    } catch (error) {
        console.error('Recommendation Error:', error);
        document.getElementById('recommendationGrid').innerHTML = `
            <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #EF4444;">
                <i class="fa-solid fa-triangle-exclamation"></i> 분석 중 오류가 발생했습니다.
            </div>
        `;
    }
}

function renderRecommendations(list) {
    const grid = document.getElementById('recommendationGrid');

    if (!list || list.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: #64748B;">추천 결과가 없습니다.</div>';
        return;
    }

    grid.innerHTML = list.map((item, index) => {
        const rankBadge = index < 3
            ? `<span class="rank-badge rank-${index + 1}" style="background: ${index === 0 ? '#0EA5E9' : (index === 1 ? '#38BDF8' : '#7DD3FC')}; color: white; padding: 0.25rem 0.75rem; border-radius: 99px; font-weight: 700; font-size: 0.8rem;">${index + 1}위</span>`
            : `<span class="rank-badge" style="background: #F1F5F9; color: #64748B; padding: 0.25rem 0.75rem; border-radius: 99px; font-weight: 600; font-size: 0.8rem;">${index + 1}위</span>`;

        return `
        <div class="card recommendation-card" onclick="selectCategory('${item.category}')" 
            style="cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; position: relative; border: 1px solid ${index === 0 ? '#BAE6FD' : '#E2E8F0'}; ${index === 0 ? 'box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.1);' : ''}">
            
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <div>
                    ${rankBadge}
                    <h3 style="margin: 0.75rem 0 0 0; font-size: 1.25rem; font-weight: 800; color: #0F172A;">${item.category}</h3>
                </div>
                <div class="match-score" style="text-align: right;">
                    <div style="font-size: 0.75rem; color: #64748B; font-weight: 600;">적합도 분석</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary-color);">${Math.min(100, item.totalScore * 10)}<span style="font-size: 0.9rem;">%</span></div>
                </div>
            </div>

            <div class="match-details" style="background: #F8FAFC; border-radius: 0.75rem; padding: 1rem;">
                <div class="match-row" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="font-size: 0.85rem; color: #475569; font-weight: 600;"><i class="fa-solid fa-check-circle" style="color: #0EA5E9;"></i> 핵심 과목</span>
                    <span style="font-size: 0.9rem; font-weight: 700; color: #0F172A;">${item.coreMatches}개 일치</span>
                </div>
                <!-- Matched Chips -->
                <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.8rem;">
                    ${item.matchedSubjects.filter(m => m.type === 'core').map(m =>
            `<span style="font-size: 0.75rem; background: #E0F2FE; color: #0369A1; padding: 0.15rem 0.5rem; border-radius: 4px;">${m.name}</span>`
        ).join('') || '<span style="font-size: 0.75rem; color: #94A3B8;">-</span>'}
                </div>

                <div class="match-row" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; border-top: 1px dashed #E2E8F0; padding-top: 0.5rem;">
                    <span style="font-size: 0.85rem; color: #475569; font-weight: 600;"><i class="fa-solid fa-circle-check" style="color: #22C55E;"></i> 권장 과목</span>
                    <span style="font-size: 0.9rem; font-weight: 700; color: #0F172A;">${item.recMatches}개 일치</span>
                </div>
                 <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
                    ${item.matchedSubjects.filter(m => m.type === 'recommended').map(m =>
            `<span style="font-size: 0.75rem; background: #DCFCE7; color: #15803D; padding: 0.15rem 0.5rem; border-radius: 4px;">${m.name}</span>`
        ).join('') || '<span style="font-size: 0.75rem; color: #94A3B8;">-</span>'}
                </div>
            </div>

            <div class="card-footer" style="margin-top: 1.5rem; text-align: center;">
                <button class="btn-select" style="width: 100%; padding: 0.8rem; border-radius: 0.5rem; background: white; border: 1px solid var(--primary-color); color: var(--primary-color); font-weight: 700; transition: all 0.2s;">
                    이 계열 선택하기 <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
            
            <style>
                .recommendation-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    border-color: var(--primary-color) !important;
                }
                .recommendation-card:hover .btn-select {
                    background: var(--primary-color);
                    color: white;
                }
            </style>
        </div>
        `;
    }).join('');
}

function selectCategory(categoryName) {
    // Save Selection
    const profile = dataManager.getProfile();
    dataManager.saveProfile({
        ...profile,
        selectedCategory: categoryName
    });

    showCustomAlert(`'${categoryName}'이(가) 선택되었습니다.\n다음 단계(학부 선택)로 이동합니다.`);

    // Auto Navigate to Stage 1-2 (To be implemented)
    // For now, if Stage 1-2 tab exists, click it. If not, just log.
    const stage1_2_tab = document.querySelector('.nav-item[data-tab="stage1_2"]');
    if (stage1_2_tab) {
        stage1_2_tab.click();
    } else {
        console.warn('Stage 1-2 Tab not found');
    }
}
