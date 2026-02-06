/**
 * profile.js
 * 학생 프로필(내신, 이수 과목) 입력 및 관리 - V3.0 Enhanced
 */

// Local state for the modal interaction
let modalState = {
    completedSubjects: [],
    inprogressSubjects: []
};

function openProfileModal() {
    // Create Modal if not exists
    let modal = document.getElementById('profileModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'profileModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const profile = dataManager.getProfile() || { name: '', schoolName: '', gpa: 0, totalPercentile: 0 };

    // Initialize local state
    modalState.completedSubjects = [...(profile.completedSubjects || [])];
    modalState.inprogressSubjects = [...(profile.inprogressSubjects || [])];

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h3 style="margin: 0; font-size: 1.25rem;">학생 정보 입력</h3>
                <button class="close-btn" onclick="closeProfileModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <div class="modal-body" style="padding: 1.5rem;">
                <div class="input-group">
                    <label>이름</label>
                    <input type="text" id="profileName" value="${profile.name || ''}" placeholder="이름을 입력하세요">
                </div>
                <div class="input-group">
                    <label>학교</label>
                    <input type="text" id="profileSchool" value="${profile.schoolName || ''}" placeholder="학교명을 입력하세요">
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <div class="input-group" style="flex: 1;">
                        <label>평균 내신</label>
                        <input type="number" id="profileGpa" value="${profile.gpa || ''}" step="0.01" placeholder="1.00">
                    </div>
                    <div class="input-group" style="flex: 1;">
                        <label>수능 백분위 합</label>
                        <input type="number" id="profileTp" value="${profile.totalPercentile || ''}" step="1" placeholder="0">
                    </div>
                </div>

                <hr style="margin: 1.5rem 0; border: 0; border-top: 1px solid #E2E8F0;">

                <!-- Subjects (Completed) -->
                <div style="margin-bottom: 1.5rem;">
                     <label style="display:block; font-weight:600; margin-bottom:0.5rem; color:#475569;">이수 완료 과목</label>
                     <div class="subject-search-container">
                        <input type="text" class="subject-search-input" id="searchCompleted" placeholder="과목명 검색 (예: 수학I)" onkeyup="handleSubjectSearch(event, 'completed')" style="width: 100%; padding: 0.8rem; border: 1px solid #E2E8F0; border-radius: 0.5rem;">
                        <div id="listCompleted" class="search-results-dropdown"></div>
                     </div>
                     <div id="chipsCompleted" class="subject-chips-container" style="margin-top: 0.5rem;">
                        ${renderSubjectChipsStr(modalState.completedSubjects, 'completed')}
                     </div>
                </div>

                <!-- Subjects (In-Progress) -->
                <div>
                     <label style="display:block; font-weight:600; margin-bottom:0.5rem; color:#475569;">이수 중 과목</label>
                     <div class="subject-search-container">
                        <input type="text" class="subject-search-input" id="searchInprogress" placeholder="과목명 검색 (예: 미적분)" onkeyup="handleSubjectSearch(event, 'inprogress')" style="width: 100%; padding: 0.8rem; border: 1px solid #E2E8F0; border-radius: 0.5rem;">
                        <div id="listInprogress" class="search-results-dropdown"></div>
                     </div>
                     <div id="chipsInprogress" class="subject-chips-container" style="margin-top: 0.5rem;">
                        ${renderSubjectChipsStr(modalState.inprogressSubjects, 'inprogress')}
                     </div>
                </div>
            </div>
            
            <div class="modal-footer" style="padding: 1rem 1.5rem; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 0.5rem;">
                <button class="btn-secondary" onclick="closeProfileModal()" style="padding: 0.6rem 1.2rem; border-radius: 0.5rem; background: #F1F5F9; border: 1px solid #E2E8F0; cursor: pointer;">취소</button>
                <button class="btn-primary" onclick="saveProfileData()" style="padding: 0.6rem 1.2rem; border-radius: 0.5rem; background: var(--primary-color); color: white; border: none; cursor: pointer;">저장</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function renderSubjectChipsStr(subjects, type) {
    if (!subjects || subjects.length === 0) return '<div style="width:100%; text-align:center; color:#CBD5E1; font-size:0.9rem; padding:1rem;">선택된 과목이 없습니다.</div>';
    return subjects.map((sub, index) => `
        <div class="subject-chip ${type}">
            <span>${sub}</span>
            <button class="chip-remove" onclick="removeSubject(${index}, '${type}')"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `).join('');
}

// Re-render chips in DOM
function updateChipsUI(type) {
    const container = document.getElementById(type === 'completed' ? 'chipsCompleted' : 'chipsInprogress');
    const list = type === 'completed' ? modalState.completedSubjects : modalState.inprogressSubjects;

    container.innerHTML = renderSubjectChipsStr(list, type);
}

// Search Handler
let searchDebounceTimer;
async function handleSubjectSearch(event, type) {
    clearTimeout(searchDebounceTimer); // Clear immediately to prevent race conditions
    const query = event.target.value.trim();
    const resultBox = document.getElementById(type === 'completed' ? 'listCompleted' : 'listInprogress');

    if (query.length < 1) {
        resultBox.style.display = 'none';
        return;
    }

    searchDebounceTimer = setTimeout(async () => {
        const results = await dbService.searchSubjects(query);

        if (results && results.length > 0) {
            resultBox.innerHTML = results.map(s => `
                <div class="search-item" onclick="addSubject('${s.course_name}', '${type}')">
                    ${s.course_name} <span class="type-badge">${s.course_type}</span>
                </div>
            `).join('');
            resultBox.style.display = 'block';
        } else {
            resultBox.innerHTML = '<div class="search-item no-result">검색 결과 없음</div>';
            resultBox.style.display = 'block';
        }
    }, 300);
}

function addSubject(subjectName, type) {
    const list = type === 'completed' ? modalState.completedSubjects : modalState.inprogressSubjects;

    if (!list.includes(subjectName)) {
        list.push(subjectName);
        updateChipsUI(type);
    }

    // Clear Input and Hide List
    const input = document.getElementById(type === 'completed' ? 'searchCompleted' : 'searchInprogress');
    const resultBox = document.getElementById(type === 'completed' ? 'listCompleted' : 'listInprogress');

    input.value = '';
    resultBox.style.display = 'none';
    input.focus();
}

function removeSubject(index, type) {
    const list = type === 'completed' ? modalState.completedSubjects : modalState.inprogressSubjects;
    list.splice(index, 1);
    updateChipsUI(type);
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.style.display = 'none';
}

function saveProfileData() {
    const name = document.getElementById('profileName').value.trim();
    const schoolName = document.getElementById('profileSchool').value.trim();
    const gpa = document.getElementById('profileGpa').value;
    const tp = document.getElementById('profileTp').value;

    if (!name && !gpa) {
        alert('최소한 이름과 내신 성적은 입력해주세요.');
        return;
    }

    const currentProfile = dataManager.getProfile() || {};

    dataManager.saveProfile({
        name: name,
        schoolName: schoolName,
        gpa: gpa ? parseFloat(gpa) : 0,
        totalPercentile: tp ? parseFloat(tp) : 0,
        completedSubjects: modalState.completedSubjects,
        inprogressSubjects: modalState.inprogressSubjects,
        subjects: [...modalState.completedSubjects, ...modalState.inprogressSubjects] // Backup for compatibility
    });

    closeProfileModal();
    updateUserStatusUI();

    // Refresh Stage 1 if active
    const activeTab = document.querySelector('.nav-item.active');
    if (activeTab && activeTab.dataset.tab === 'stage1' && typeof renderStage1 === 'function') {
        const container = document.getElementById('contentContainer');
        // Simple refresh logic: re-render stage 1
        // Ideally we might just update the components, but full re-render is safer for now
        // But renderStage1 creates a fresh UI, so it might reset selection. 
        // Let's just try to update the detail view if a univ is selected.
        if (stage1State && stage1State.selectedUnivId) {
            renderUnivDetail(stage1State.selectedUnivId);
        }
    }

    alert('프로필이 저장되었습니다.');
}

function updateUserStatusUI() {
    // This function can be implemented in app.js or here
    // Currently app.js doesn't seem to export it, so we check if global exists
    if (window.loadUserStatus) {
        window.loadUserStatus();
    }
}
