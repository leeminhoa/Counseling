/**
 * stage1_2.js
 * Stage 1-2: 학부 선택 (Major Selection)
 */

async function renderStage1_2(container) {
    const profile = dataManager.getProfile();
    const selectedCategory = profile?.selectedCategory;

    // Validation: Category must be selected in Stage 1-1
    if (!selectedCategory) {
        container.innerHTML = `
            <div class="empty-state-card" style="text-align: center; padding: 4rem 2rem;">
                <i class="fa-solid fa-compass" style="font-size: 3rem; color: #CBD5E1; margin-bottom: 1.5rem;"></i>
                <h3 style="font-size: 1.25rem; font-weight: 700; color: #475569; margin-bottom: 0.75rem;">선택된 계열이 없습니다</h3>
                <p style="color: #64748B; margin-bottom: 2rem;">[계열 추천] 단계에서 먼저 진로 계열을 선택해주세요.</p>
                <button class="btn-primary" onclick="loadView('stage1_1')">계열 추천으로 이동</button>
            </div>
        `;
        // Also update tab UI to reflect we are essentially back at 1-1 physically or just directing existing tab
        return;
    }

    container.innerHTML = `
        <div class="stage-header" style="margin-bottom: 2rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <span class="badge" style="background: #E0F2FE; color:var(--primary-color);">${selectedCategory}</span>
                <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem; color: #94A3B8;"></i>
            </div>
            <h2 style="font-size: 1.75rem; font-weight: 800; color: #1E293B; margin-bottom: 0.5rem;">
                <i class="fa-solid fa-layer-group" style="color: var(--primary-color); margin-right: 0.5rem;"></i>
                희망 학부 선택
            </h2>
            <p style="color: #64748B; font-size: 1rem;">
                선택하신 <strong>${selectedCategory}</strong> 내에서 관심 있는 세부 전공(학부)을 선택해주세요.
                <br>선택 시 해당 전공이 개설된 주요 대학을 분석해드립니다.
            </p>
        </div>

        <div id="majorGrid" class="major-grid-fixed">
             <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
                <p style="margin-top: 1rem; color: #64748B;">전공 리스트를 불러오는 중입니다...</p>
            </div>
        </div>
    `;

    const majorGridRef = container.querySelector('#majorGrid') || document.getElementById('majorGrid');

    try {
        const majors = await dbService.getMajorsByCategory(selectedCategory);
        renderMajors(majors, majorGridRef);
    } catch (error) {
        console.error('Major Fetch Error:', error);
        if (majorGridRef) {
            majorGridRef.innerHTML = `
             <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #EF4444;">
                <i class="fa-solid fa-triangle-exclamation"></i> 목록을 불러오는 중 오류가 발생했습니다.
            </div>
            `;
        }
    }
}

function renderMajors(majors, gridElement) {
    const grid = gridElement || document.getElementById('majorGrid');

    if (!grid) {
        console.error('Major Grid Element Not Found');
        return;
    }

    if (!majors || majors.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: #64748B;">해당 계열에 등록된 학부 데이터가 없습니다.</div>';
        return;
    }

    grid.innerHTML = majors.map(major => {
        const safeMajor = major.replace(/'/g, "\\'");
        return `
        <div class="major-card" onclick="selectMajor('${safeMajor}')">
            <div class="major-icon">
                <i class="fa-solid fa-book-open"></i>
            </div>
            <span class="major-name">${major}</span>
        </div>
        `;
    }).join('');
}

function selectMajor(majorName) {
    // 1. Save to profile
    const profile = dataManager.getProfile();
    dataManager.saveProfile({
        ...profile,
        targetMajor: majorName, // Update targetMajor
        lastSelectedUniv: null  // Clear specific university selection to trigger fresh search
    });

    // 2. Alert and Navigate
    // We notify user and move to Stage 1 (University Analysis) which acts as Stage 1-3
    // We might need to implement a 'filter' in Stage 1 to auto-search this major
    // For now, let's just navigate.

    // Pass a ephemeral 'autoSearch' flag via sessionStorage or logic? 
    // Or just let dataManager hold the state. Stage 1 should check `targetMajor` on load.

    alert(`'${majorName}' 전공이 선택되었습니다.\n대학 분석 단계로 이동합니다.`);

    // Navigate to Stage 1
    const stage1_tab = document.querySelector('.nav-item[data-tab="stage1"]');
    if (stage1_tab) {
        stage1_tab.click();
    }
}
