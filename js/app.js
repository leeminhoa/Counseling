/**
 * App.js
 * 메인 애플리케이션 진입점 및 UI 제어
 */
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    console.log('App Initialized');

    // 0. Check Session (Counselor Login)
    const session = dbService.checkSession();
    if (!session) {
        window.location.replace('login.html');
        return; // Stop initialization
    }


    // 탭 네비게이션 이벤트 연결
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            if (tab) handleTabChange(tab);
        });
    });

    // 초기 상태 로드 (from DataManager)
    loadUserStatus();

    // 기본 탭 로드 (Stage 1-1: 계열 추천)
    loadView('stage1_1');

    // 프로필 정보가 없으면 모달 띄우기 (지연 실행)
    // [Fix] Prevent double firing or conflict with other modals
    const profile = dataManager.getProfile();
    const hasProfile = profile && profile.name && profile.gpa;

    if (!hasProfile) {
        setTimeout(() => {
            // Check if modal is already open
            const modal = document.getElementById('profileModal');
            if (modal && modal.style.display === 'flex') return;

            if (typeof openProfileModal === 'function') {
                console.log('Auto-opening Profile Modal (No Data)');
                openProfileModal();
            }
        }, 800);
    }

    // [NEW] Display Counselor Info
    const counselorSession = dbService.checkSession();
    if (counselorSession) {
        const displayEl = document.getElementById('counselorProfileDisplay');
        if (displayEl) {
            displayEl.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-weight: 700; color: var(--text-main);">${counselorSession.name || '상담사'}</span>
                    <span style="font-size: 0.75rem; color: var(--text-sub);">${counselorSession.email}</span>
                </div>
            `;
        }
    }
}

// [NEW] Reset Counseling Session
window.resetCounselingSession = () => {
    if (confirm('현재 상담 내용을 모두 초기화하시겠습니까?\n입력된 학생 정보와 상담 내역이 초기화됩니다.')) {
        dataManager.resetData();
        window.location.reload();
    }
};

function handleTabChange(tabName) {
    // 1. Update Sidebar UI
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tabName) item.classList.add('active');
    });

    // 2. Load Content
    loadView(tabName);
}

function loadView(viewName) {
    const container = document.getElementById('contentContainer');
    container.innerHTML = `<div class="card" style="width: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-sub);">
        ${viewName} View Loading... (Prototype)
    </div>`;

    // TODO: 각 뷰별(Stage1, Stage2) 렌더링 함수 호출 로직 추가 예정
    if (viewName === 'stage1_1') {
        if (typeof renderStage1_1 === 'function') {
            renderStage1_1(container);
        } else {
            console.error('renderStage1_1 function is missing!');
            container.innerHTML = 'Stage 1-1 (Recommendation) Not Loaded';
        }
    } else if (viewName === 'stage1_2') {
        if (typeof renderStage1_2 === 'function') {
            renderStage1_2(container);
        } else {
            console.error('renderStage1_2 function is missing!');
            container.innerHTML = 'Stage 1-2 (Major Selection) Error';
        }
    } else if (viewName === 'stage1') {
        if (typeof renderStage1 === 'function') {
            renderStage1(container);
        } else {
            console.error('renderStage1 function is missing!');
        }
    } else if (viewName === 'stage2') {
        if (typeof renderStage2 === 'function') {
            renderStage2(container);
        } else {
            console.error('renderStage2 function is missing!');
        }
    } else if (viewName === 'chatbot') {
        if (typeof renderChatbot === 'function') {
            renderChatbot(container);
        } else {
            container.innerHTML = 'Chatbot Module Loading Error';
        }
    } else if (viewName === 'admin') {
        if (typeof renderAdmin === 'function') {
            renderAdmin(container);
        } else {
            console.error('renderAdmin function is missing!');
        }
    } else if (viewName === 'manager') {
        if (typeof renderManager === 'function') {
            renderManager(container);
        } else {
            container.innerHTML = 'Manager Module Loading Error';
        }
    }
}

function proceedToStage2() {
    handleTabChange('stage2');
    const container = document.getElementById('contentContainer');
    renderStage2(container, true); // Auto-start AI generation
}
window.proceedToStage2Action = proceedToStage2;

function loadUserStatus() {
    const profile = dataManager.getProfile();
    const statusEl = document.getElementById('userStatus');

    if (profile && profile.name) {
        statusEl.innerHTML = `
            <span class="status-name" onclick="openProfileModal()" style="cursor:pointer; font-weight:700;">${profile.name} 학생님</span>
            <span class="status-school badge" style="background-color: #F1F5F9; color: #475569;">${profile.schoolName || '학교 미설정'}</span>
            <span class="status-gpa badge">내신 ${profile.gpa || '-.-'}등급</span>
            <span class="status-tp badge" style="background-color: #FFF1F2; color: #E11D48;">백분위 ${profile.totalPercentile || '0.0'}점</span>
        `;
    } else {
        statusEl.innerHTML = `
            <span class="status-placeholder" style="font-size: 0.85rem; color: #94A3B8;" onclick="openProfileModal()">분석을 위해 정보를 입력해주세요</span>
        `;
    }
}
