/**
 * profile.js
 * 학생 프로필(내신, 이수 과목) 입력 및 관리 - V3.0 Enhanced
 */

// Local state for the modal interaction
let modalState = {
    completedSubjects: [],
    inprogressSubjects: [],
    currentTab: 'info' // 'info' or 'history'
};

function openProfileModal(initialTab = 'info') {
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
    modalState.currentTab = initialTab;

    modal.innerHTML = `
        <div class="modal-content profile-editor" style="max-width: 550px; height: 80vh;">
            <div class="modal-header" style="padding-bottom: 0;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 1rem;">
                    <h3 style="margin: 0; font-size: 1.25rem;">학생 정보 관리</h3>
                    <button class="close-btn" onclick="closeProfileModal()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="modal-tabs">
                    <div class="modal-tab ${modalState.currentTab === 'info' ? 'active' : ''}" onclick="switchProfileTab('info')">기본 정보</div>
                    <div class="modal-tab ${modalState.currentTab === 'history' ? 'active' : ''}" onclick="switchProfileTab('history')">상담 이력</div>
                </div>
            </div>
            
            <div class="modal-body-scroll">
                
                <!-- TAB: INFO -->
                <div id="tabContent_info" class="tab-content ${modalState.currentTab === 'info' ? 'active' : ''}">
                    
                    <div class="input-group">
                        <label>이름</label>
                        <input type="text" id="profileName" class="styled-input" value="${profile.name || ''}" placeholder="이름을 입력하세요">
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <div class="input-group" style="flex: 2;">
                            <label>학교</label>
                            <input type="text" id="profileSchool" class="styled-input" value="${profile.schoolName || ''}" placeholder="학교명을 입력하세요">
                        </div>
                        <div class="input-group" style="flex: 1;">
                            <label>학년</label>
                            <select id="profileGrade" class="styled-input" style="padding: 0.9rem 0.5rem;">
                                <option value="HIGH1" ${profile.grade === 'HIGH1' ? 'selected' : ''}>1학년</option>
                                <option value="HIGH2" ${profile.grade === 'HIGH2' ? 'selected' : ''}>2학년</option>
                                <option value="HIGH3" ${profile.grade === 'HIGH3' ? 'selected' : ''}>3학년</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 1rem;">
                        <div class="input-group" style="flex: 1;">
                            <label>영어 등급</label>
                            <input type="number" id="profileGpa" class="styled-input" value="${profile.gpa || ''}" step="0.01" placeholder="1.00">
                        </div>
                        <div class="input-group" style="flex: 1;">
                            <label>백분위 합(국,수,탐)</label>
                            <input type="number" id="profileTp" class="styled-input" value="${profile.totalPercentile || ''}" step="1" placeholder="0">
                        </div>
                    </div>

                    <hr style="margin: 1.5rem 0; border: 0; border-top: 1px solid #E2E8F0;">

                     <!-- Subjects (Completed) -->
                    <div style="margin-bottom: 1.5rem;">
                         <label style="display:block; font-weight:600; margin-bottom:0.5rem; color:#475569;">이수 완료 과목</label>
                         <div class="subject-search-container">
                            <input type="text" class="subject-search-input" id="searchCompleted" placeholder="과목명 검색 (예: 수학I)" oninput="handleSubjectSearch(event, 'completed')">
                            <i class="fa-solid fa-magnifying-glass search-icon-inside"></i>
                            <div id="listCompleted" class="search-results-dropdown"></div>
                         </div>
                         <div id="chipsCompleted" class="chips-area" style="min-height: 40px;">
                            ${renderSubjectChipsStr(modalState.completedSubjects, 'completed')}
                         </div>
                    </div>

                    <!-- Subjects (In-Progress) -->
                    <div>
                         <label style="display:block; font-weight:600; margin-bottom:0.5rem; color:#475569;">이수 중 과목</label>
                         <div class="subject-search-container">
                            <input type="text" class="subject-search-input" id="searchInprogress" placeholder="과목명 검색 (예: 미적분)" oninput="handleSubjectSearch(event, 'inprogress')">
                            <i class="fa-solid fa-magnifying-glass search-icon-inside"></i>
                            <div id="listInprogress" class="search-results-dropdown"></div>
                         </div>
                         <div id="chipsInprogress" class="chips-area" style="min-height: 40px;">
                            ${renderSubjectChipsStr(modalState.inprogressSubjects, 'inprogress')}
                         </div>
                    </div>
                </div>

                <!-- TAB: HISTORY -->
                <div id="tabContent_history" class="tab-content ${modalState.currentTab === 'history' ? 'active' : ''}">
                    <div id="historyListContainer">
                        <div class="empty-history"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>
                    </div>
                </div>

            </div>
            
            <div id="modalFooter" class="modal-footer" style="${modalState.currentTab === 'history' ? 'display:none;' : 'display:flex;'}">
                <button class="btn-cancel" onclick="closeProfileModal()">취소</button>
                <button class="btn-save" onclick="saveProfileData()">저장</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';

    if (initialTab === 'history') {
        loadHistoryTab();
    }
}

function switchProfileTab(tab) {
    modalState.currentTab = tab;

    // Update Tab UI
    document.querySelectorAll('.modal-tab').forEach(el => el.classList.remove('active'));
    document.querySelector(`.modal-tab[onclick="switchProfileTab('${tab}')"]`).classList.add('active');

    // Update Content Visibility
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tabContent_${tab}`).classList.add('active');

    // Toggle Footer (Hide save button in history view)
    const footer = document.getElementById('modalFooter');
    if (tab === 'history') {
        footer.style.display = 'none';
        loadHistoryTab();
    } else {
        footer.style.display = 'flex';
    }
}

async function loadHistoryTab() {
    const container = document.getElementById('historyListContainer');
    const profile = dataManager.getProfile();

    if (!profile || !profile.studentId) {
        container.innerHTML = '<div class="empty-history">상담 이력이 없습니다.<br>먼저 프로필을 저장하여 등록해주세요.</div>';
        return;
    }

    try {
        const history = await dbService.getCounselingHistory(profile.studentId);

        if (!history || history.length === 0) {
            container.innerHTML = '<div class="empty-history">아직 상담 기록이 없습니다.</div>';
            return;
        }

        container.innerHTML = history.map(item => {
            const date = new Date(item.rec_date || item.created_at).toLocaleDateString();
            const notes = item.activity_notes ? JSON.parse(Array.isArray(item.activity_notes) ? item.activity_notes[0] : item.activity_notes) : {};
            // Handle array unwrap if needed (since we store it as array now)

            let statusBadge = '';
            if (item.status === 'completed') statusBadge = '<span class="history-status done">완료</span>';
            else statusBadge = '<span class="history-status">진행중</span>';

            // Store data temporarily for click handler
            if (!window._historyCache) window._historyCache = {};
            window._historyCache[item.id] = item;

            return `
            <div class="history-item" onclick="onHistoryClick('${item.id}')" style="cursor: pointer; transition: background 0.2s;">
                <div class="history-header">
                    <span class="history-date">${date}</span>
                    ${statusBadge}
                </div>
                <div class="history-detail">
                    <div><strong>계열:</strong> ${item.desired_category || '-'}</div>
                    <div><strong>대학:</strong> ${item.desired_univ || '-'}</div>
                    <div style="margin-top:0.3rem; font-size:0.85rem; color:#64748B;">
                        내신: ${notes.gpa || '-'} / 백분위: ${notes.totalPercentile || '-'}
                    </div>
                </div>
                <div style="margin-top: 0.5rem; text-align: right; font-size: 0.8rem; color: var(--primary-color);">
                    <i class="fa-solid fa-arrow-right-to-bracket"></i> 불러오기
                </div>
            </div>
            `;
        }).join('');

    } catch (e) {
        console.error("History Fetch Error:", e);
        container.innerHTML = '<div class="empty-history">이력을 불러오는 중 오류가 발생했습니다.</div>';
    }
}

function renderSubjectChipsStr(subjects, type) {
    if (!subjects || subjects.length === 0) return '';
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
    // Toggle container border style based on items
    container.classList.toggle('has-items', list.length > 0);
}

// Search Handler
let searchDebounceTimer;
async function handleSubjectSearch(event, type) {
    clearTimeout(searchDebounceTimer);
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
    const cleanName = subjectName.trim(); // [Fix] Normalize input

    if (!list.includes(cleanName)) {
        list.push(cleanName);
        updateChipsUI(type);
    }

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
    console.log('Closing Profile Modal... (Trace)');
    // console.trace(); // Optional for detailed debugging
    const modal = document.getElementById('profileModal');
    if (modal) modal.style.display = 'none';
}

function saveProfileData() {
    const name = document.getElementById('profileName').value.trim();
    const schoolName = document.getElementById('profileSchool').value.trim();
    const grade = document.getElementById('profileGrade').value;
    const gpa = document.getElementById('profileGpa').value;
    const tp = document.getElementById('profileTp').value;

    if (!name && !gpa) {
        alert('최소한 이름과 내신 성적은 입력해주세요.');
        return;
    }

    const currentProfile = dataManager.getProfile() || {};

    const newProfile = {
        name: name,
        schoolName: schoolName,
        grade: grade,
        gpa: gpa ? parseFloat(gpa) : 0,
        totalPercentile: tp ? parseFloat(tp) : 0,
        completedSubjects: modalState.completedSubjects,
        inprogressSubjects: modalState.inprogressSubjects,
        subjects: [...modalState.completedSubjects, ...modalState.inprogressSubjects]
    };

    // 1. Save Locally
    dataManager.saveProfile(newProfile);

    // 2. Sync to DB (Background)
    (async () => {
        try {
            const studentId = await dbService.upsertStudent(newProfile);
            if (studentId) {
                await dbService.saveCounselingSession(studentId, newProfile);
                console.log('✅ DB Sync Complete');

                // 3. Update Local Storage with Student ID
                const updatedProfile = { ...newProfile, studentId: studentId };
                dataManager.saveProfile(updatedProfile);
            }
        } catch (err) {
            console.error('❌ DB Sync Failed:', err);
            // alert('프로필은 로컬에 저장되었으나, 서버 동기화에 실패했습니다.'); // Optional: suppress to avoid annoying user
        }
    })();

    // Immediate UI Update
    updateUserStatusUI();

    // Refresh Stage 1 if active
    const activeTab = document.querySelector('.nav-item.active');
    if (activeTab && activeTab.dataset.tab === 'stage1' && typeof renderStage1 === 'function') {
        const container = document.getElementById('contentContainer');
        if (stage1State && stage1State.selectedUnivId) {
            renderUnivDetail(stage1State.selectedUnivId);
        }
    }

    // Show temporary success feedback on the save button instead of blocking alert
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) {
        const originalText = saveBtn.innerText;
        saveBtn.innerText = '저장 완료';
        saveBtn.style.backgroundColor = '#10B981'; // Green
        setTimeout(() => {
            saveBtn.innerText = originalText;
            saveBtn.style.backgroundColor = '';
            closeProfileModal();
        }, 800);
    } else {
        closeProfileModal();
    }
}

function updateUserStatusUI() {
    if (window.loadUserStatus) {
        window.loadUserStatus();
    }
}

/**
 * Handle History Click
 */
window.onHistoryClick = function (id) {
    if (!window._historyCache || !window._historyCache[id]) {
        alert('이력 데이터를 찾을 수 없습니다.');
        return;
    }
    const item = window._historyCache[id];

    // Only load if completed
    if (item.status !== 'completed') {
        alert('아직 진행 중인 상담입니다. 이어서 진행하시겠습니까? (기능 준비중)');
        return;
    }

    if (confirm('선택하신 과거 상담 결과를 불러오시겠습니까?')) {
        closeProfileModal();

        // Wait for modal close transition
        setTimeout(() => {
            if (window.loadHistoryToStage2) {
                window.loadHistoryToStage2(item);
            } else {
                alert('해당 기능을 실행할 수 없습니다. (Stage 2 모듈 로드 필요)');
            }
        }, 300);
    }
};
