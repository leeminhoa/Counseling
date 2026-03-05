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

    // 기본 탭 로드시 마지막 분석 대학 캐시 복원 (NR-03 픽스)
    const profile = dataManager.getProfile();
    if (profile && profile.lastSelectedUniv) {
        loadView('stage1');
        setTimeout(() => {
            if (window.stage1 && typeof window.stage1.loadUniversityDetails === 'function') {
                window.stage1.loadUniversityDetails(profile.lastSelectedUniv);
            }
        }, 100);
    } else {
        loadView('stage1_1'); // 캐시 없을 때만 기본 추천 탭
    }

    // 프로필 정보가 없으면 모달 띄우기 (지연 실행)
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

// [NEW] Custom Modal Helpers (Alert/Confirm Replacement)
window.showCustomModal = function (options) {
    const modal = document.getElementById('customModal');
    const titleEl = document.getElementById('customModalTitle');
    const msgEl = document.getElementById('customModalMessage');
    const okBtn = document.getElementById('customModalOkBtn');
    const cancelBtn = document.getElementById('customModalCancelBtn');
    const iconEl = document.getElementById('customModalIcon');

    if (!modal || !msgEl || !okBtn || !cancelBtn) {
        console.warn('Custom Modal elements missing. Falling back to native.');
        if (options.type === 'confirm') {
            if (confirm(options.message)) if (options.onConfirm) options.onConfirm();
        } else {
            showCustomAlert(options.message);
            if (options.onConfirm) options.onConfirm();
        }
        return;
    }

    titleEl.textContent = options.title || '알림';
    msgEl.innerHTML = options.message.replace(/\n/g, '<br>');

    // Icon Logic
    iconEl.className = options.iconClass || 'fa-solid fa-circle-info';
    iconEl.parentElement.style.color = options.type === 'confirm' ? '#F59E0B' : 'var(--primary-color)';

    // Buttons Logic
    if (options.type === 'alert') {
        cancelBtn.style.display = 'none';
        okBtn.textContent = '확인';
        okBtn.style.background = 'var(--primary-color, #3B82F6)';
        okBtn.style.boxShadow = '0 4px 6px -1px rgba(59, 130, 246, 0.3)';
    } else {
        cancelBtn.style.display = 'block';
        okBtn.textContent = options.okText || '확인';
        okBtn.style.background = options.danger ? '#EF4444' : 'var(--primary-color, #3B82F6)';
        okBtn.style.boxShadow = options.danger ? '0 4px 6px -1px rgba(239, 68, 68, 0.3)' : '0 4px 6px -1px rgba(59, 130, 246, 0.3)';
    }

    modal.style.display = 'flex';

    // Event Cleanup via Cloning
    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newOkBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        if (options.onConfirm) options.onConfirm();
    });

    newCancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
};

window.showCustomAlert = function (message, title = '알림') {
    showCustomModal({ type: 'alert', message, title });
};

window.showCustomConfirm = function (message, onConfirm, options = {}) {
    showCustomModal({
        type: 'confirm',
        message,
        onConfirm,
        title: options.title || '잠깐! 확인해주세요',
        okText: options.okText || '확인',
        danger: options.danger || false,
        iconClass: options.iconClass || 'fa-solid fa-circle-exclamation'
    });
};

// [NEW] Reset Counseling Session
window.resetCounselingSession = () => {
    showConfirmModal(
        '현재 상담 내용을 모두 초기화하시겠습니까?\\n입력된 학생 정보와 모든 상담 내역이 삭제됩니다.',
        () => {
            dataManager.resetData();
            loadUserStatus(); // [DH-04 Fix] 명시적 상단 UI 갱신 호출
            window.location.reload();
        }
    );
};

// --- [NEW] Memo Modal Controls ---
window.openMemoModal = function () {
    const profile = dataManager.getProfile();
    if (!profile || !profile.name) {
        showCustomAlert('먼저 대상을 지정하기 위해 학생 정보를 입력하거나 불러와주세요.');
        return;
    }

    document.getElementById('memoStudentName').value = profile.name;
    document.getElementById('memoConsultingStatus').value = profile.consultingStatus || '보통';
    document.getElementById('memoContentText').value = profile.memo || '';

    document.getElementById('memoModal').style.display = 'flex';
};

window.closeMemoModal = function () {
    document.getElementById('memoModal').style.display = 'none';
};

window.saveMemoCommand = async function () {
    const status = document.getElementById('memoConsultingStatus').value;
    const content = document.getElementById('memoContentText').value;

    // 1. Local Storage 업데이트
    dataManager.updateProfile({
        memo: content,
        consultingStatus: status
    });

    const profile = dataManager.getProfile();

    // 2. Supabase DB Sync (if session exists and profile is loaded)
    if (profile && profile.name && window.dbService) {
        try {
            await dbService.upsertStudent(profile);
            console.log('Memo synced with Supabase DB.');

            // 학생 관리 화면이 띄워져 있다면 Data Reload
            if (document.querySelector('.nav-item[data-tab="manager"]').classList.contains('active')) {
                if (typeof loadStudentList === 'function') loadStudentList();
            }
        } catch (e) {
            console.warn('DB Sync failed during memo save, but saved locally.', e);
        }
    }

    closeMemoModal();
    showCustomAlert('메모가 저장되었습니다.');
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
            <span class="status-gpa badge">영어 ${profile.gpa || '-.-'}등급</span>
            <span class="status-tp badge" style="background-color: #FFF1F2; color: #E11D48;">백분위(국수탐) ${profile.totalPercentile || '0.0'}점</span>
        `;
    } else {
        statusEl.innerHTML = `
            <span class="status-placeholder" style="font-size: 0.85rem; color: #94A3B8;" onclick="openProfileModal()">분석을 위해 정보를 입력해주세요</span>
        `;
    }
}
