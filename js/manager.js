/**
 * manager.js
 * 학생 관리 (상담사 모드) - 학생 목록 조회, 검색, 컨텍스트 전환
 */

async function renderManager(container) {
    container.innerHTML = `
        <div class="manager-container" style="max-width: 1000px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div>
                    <h2 style="margin-bottom: 0.5rem; font-size: 1.8rem; font-weight: 800; color: #1E293B;">학생 관리</h2>
                    <p style="color: #64748B;">등록된 학생 목록을 조회하고 상담을 진행할 학생을 선택하세요.</p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <div class="search-wrapper" style="position: relative;">
                        <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94A3B8;"></i>
                        <input type="text" id="studentSearch" placeholder="이름 또는 ID 검색" 
                            style="padding: 0.8rem 1rem 0.8rem 2.8rem; border: 1px solid #E2E8F0; border-radius: 0.75rem; width: 300px; outline: none;">
                    </div>
                    <button class="btn-primary" onclick="openProfileModal()">
                        <i class="fa-solid fa-plus"></i> 신규 학생 등록
                    </button>
                    <button class="btn-secondary" onclick="loadStudentList()" 
                        style="width: 42px; height: 40px; display: flex; align-items: center; justify-content: center; padding: 0; background: #E0F2FE; color: var(--primary-color); border: 1px solid #BAE6FD; border-radius: 0.375rem; cursor: pointer;">
                        <i class="fa-solid fa-rotate-right"></i>
                    </button>
                </div>
            </div>

            <div id="studentListContainer" class="student-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                <!-- Student Cards will be injected here -->
                <div class="loading-state" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
                </div>
            </div>
        </div>
    `;

    // Attach Search Listener
    const searchInput = document.getElementById('studentSearch');
    let debounceTimer;
    searchInput.addEventListener('keyup', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            loadStudentList(e.target.value);
        }, 300);
    });

    // Load Initial Data
    await loadStudentList();
}

async function loadStudentList(query = '') {
    const container = document.getElementById('studentListContainer');

    try {
        const students = await dbService.getAllStudents(query);

        if (!students || students.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem; background: #F8FAFC; border-radius: 1rem; border: 1px dashed #E2E8F0;">
                    <i class="fa-solid fa-user-slash" style="font-size: 2rem; color: #CBD5E1; margin-bottom: 1rem;"></i>
                    <p style="color: #64748B; font-weight: 500;">검색 결과가 없습니다.</p>
                    ${query ? `<button class="btn-secondary btn-sm" style="margin-top:1rem;" onclick="document.getElementById('studentSearch').value=''; loadStudentList();">검색 초기화</button>` : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = students.map(student => {
            const schoolName = student.school ? student.school.school_name : '학교 미지정';
            const date = new Date(student.created_at).toLocaleDateString();
            const gradeMap = { 'HIGH1': '1학년', 'HIGH2': '2학년', 'HIGH3': '3학년' };
            const gradeLabel = gradeMap[student.grade] || student.grade || '학년 미정';

            // [NEW] Status Map & Memo Indicator
            const hasMemo = student.memo && student.memo.trim().length > 0;
            const statusMap = {
                '좋음': { bg: '#ECFCCB', color: '#65A30D', icon: 'fa-face-smile-beam' },
                '보통': { bg: '#F1F5F9', color: '#64748B', icon: 'fa-face-meh' },
                '나쁨': { bg: '#FEE2E2', color: '#EF4444', icon: 'fa-face-frown' }
            };
            const sStyle = statusMap[student.consulting_status] || statusMap['보통'];
            const statusBadge = `<span style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:700; background:${sStyle.bg}; color:${sStyle.color};"><i class="fa-solid ${sStyle.icon}"></i> ${student.consulting_status || '상태 없음'}</span>`;
            const memoIcon = hasMemo ? `<span style="color:#0EA5E9; margin-left:6px;" title="메모 작성됨"><i class="fa-solid fa-note-sticky"></i></span>` : '';

            return `
                <div class="card student-card" onclick="selectStudent('${student.id}', '${student.student_name}', '${schoolName}', '${student.grade}', \`${student.memo || ''}\`, '${student.consulting_status || ''}')"
                    style="cursor: pointer; transition: all 0.2s; border: 1px solid #E2E8F0; hover: shadow-lg;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="student-avatar" style="width: 48px; height: 48px; background: #F1F5F9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #64748B;">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                ${statusBadge}
                            </div>
                        </div>
                        <span style="font-size: 0.8rem; color: #94A3B8;">${date} 등록</span>
                    </div>
                    
                    <h3 style="font-size: 1.1rem; font-weight: 700; color: #1E293B; margin-bottom: 0.3rem;">
                        ${student.student_name} ${memoIcon}
                    </h3>
                    <p style="color: #64748B; font-size: 0.9rem; margin-bottom: 1rem;">${schoolName} · ${gradeLabel}</p>
                    
                    <div style="border-top: 1px solid #F1F5F9; padding-top: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8rem; color: var(--primary-color); font-weight: 600;">상담 모드로 진입</span>
                        <i class="fa-solid fa-arrow-right" style="color: var(--primary-color); font-size: 0.9rem;"></i>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Failed to load students:', error);
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #EF4444;">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
    }
}

async function selectStudent(id, name, schoolName, grade, memo = '', consultingStatus = '보통') {
    // 1. Update Global Profile (Mocking the 'Load' process)
    // In a real app, we might want to fetch the FULL profile from DB again to get GPA/Subjects
    // For now, we'll try to fetch the latest session or just set the basics we have

    try {
        // Fetch full history to get the latest profile data if possible, 
        // OR simply set what we have and let the user fill the rest?
        // Better: Try to load the latest counseling session's activity_notes to popuplate GPA/Subjects

        const history = await dbService.getCounselingHistory(id);
        let profileData = {
            name: name,
            schoolName: schoolName,
            grade: grade,
            studentId: id,
            memo: memo,
            consultingStatus: consultingStatus,
            // Defaults
            gpa: 0,
            totalPercentile: 0,
            completedSubjects: [],
            inprogressSubjects: []
        };

        if (history && history.length > 0) {
            // Use the most recent session
            const latest = history[0]; // ordered by date desc in SQL usually
            if (latest.activity_notes) {
                // Parse activity_notes (It's an array of strings in DB, but we need to check how it comes back)
                // dbService.getCounselingHistory might return it as raw.
                // In profile.js we did: JSON.parse(Array.isArray(notes) ? notes[0] : notes)

                let notes = {};
                try {
                    const rawNotes = latest.activity_notes;
                    const jsonString = Array.isArray(rawNotes) ? rawNotes[0] : rawNotes;
                    notes = JSON.parse(jsonString);
                } catch (e) { console.warn('Failed to parse notes', e); }

                profileData = {
                    ...profileData,
                    gpa: notes.gpa || 0,
                    totalPercentile: notes.totalPercentile || 0,
                    completedSubjects: notes.completedSubjects || [],
                    inprogressSubjects: notes.inprogressSubjects || []
                };
            }
        }

        // Save to LocalStorage (Global Context)
        dataManager.saveProfile(profileData);

        // Update UI Status
        updateUserStatusUI();

        // Navigate to Stage 1 (or wherever appropriate)
        // Highlight that we switched context
        alert(`${name} 학생의 상담 모드로 전환되었습니다.`);

        // Trigger Tab Change to Stage 1
        const stage1Tab = document.querySelector('.nav-item[data-tab="stage1_1"]');
        if (stage1Tab) stage1Tab.click();

    } catch (error) {
        console.error('Context Switch Failed:', error);
        alert('학생 데이터를 불러오는 데 실패했습니다.');
    }
}
