/**
 * profile.js
 * 학생 프로필(내신, 이수 과목) 입력 및 관리
 */

function openProfileModal() {
    // Create Modal if not exists
    let modal = document.getElementById('profileModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'profileModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const profile = dataManager.getProfile() || { name: '', schoolName: '', gpa: 0, subjects: [] };

    modal.innerHTML = `
        <div class="modal-content profile-editor" style="max-width: 600px; padding: 1rem;">
            <div class="modal-header" style="border-bottom: none; padding-bottom: 0.5rem;">
                <h2 style="font-size: 1.5rem; letter-spacing: -0.5px;"><i class="fa-solid fa-user-graduate" style="color: var(--primary);"></i> 학생 정보 입력</h2>
                <button class="close-btn" onclick="closeProfileModal()" aria-label="닫기">&times;</button>
            </div>
            <p style="padding: 0 1.5rem; color: #64748B; font-size: 0.95rem; margin-bottom: 1rem;">정확한 입시 분석을 위해 학생의 기본 정보를 입력해주세요.</p>
            
            <div class="modal-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div class="form-section" style="grid-column: span 2; margin-bottom: 0.5rem;">
                    <label for="profileName" style="font-size: 0.85rem; font-weight: 700; color: #475569;">학생 이름</label>
                    <input type="text" id="profileName" value="${profile.name || ''}" placeholder="예: 홍길동" 
                        style="width: 100%; border: 1px solid #E2E8F0; background: #F8FAFC; padding: 1rem; border-radius: 12px; font-size: 1rem;">
                </div>

                <div class="form-section" style="margin-bottom: 0.5rem;">
                    <label for="profileSchool" style="font-size: 0.85rem; font-weight: 700; color: #475569;">소속 학교명</label>
                    <input type="text" id="profileSchool" value="${profile.schoolName || ''}" placeholder="예: 서울고등학교"
                        style="width: 100%; border: 1px solid #E2E8F0; background: #F8FAFC; padding: 1rem; border-radius: 12px; font-size: 1rem;">
                </div>

                <div class="form-section" style="margin-bottom: 0.5rem;">
                    <label for="profileGpa" style="font-size: 0.85rem; font-weight: 700; color: #475569;">평균 내신 성적</label>
                    <div class="gpa-input-group" style="position: relative;">
                        <input type="number" id="profileGpa" value="${profile.gpa || ''}" step="0.01" min="1" max="9" placeholder="1.00"
                            style="width: 100%; border: 1px solid #E2E8F0; background: #F8FAFC; padding: 1rem 3rem 1rem 1rem; border-radius: 12px; font-size: 1.1rem; font-weight: 700; color: var(--primary);">
                        <span style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); font-weight: 600; color: #94A3B8;">등급</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer" style="background: none; border-top: none; padding: 1.5rem; gap: 1rem;">
                <button class="btn-secondary" onclick="closeProfileModal()" style="flex: 1; height: 50px; border-radius: 12px;">취소</button>
                <button class="btn-primary" onclick="saveProfileData()" style="flex: 2; height: 50px; border-radius: 12px; font-size: 1rem; font-weight: 700;">분석 시작하기</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

function saveProfileData() {
    const name = document.getElementById('profileName').value.trim();
    const schoolName = document.getElementById('profileSchool').value.trim();
    const gpa = document.getElementById('profileGpa').value;

    if (!name || !schoolName || !gpa) {
        alert('모든 정보를 입력해주세요.');
        return;
    }

    const currentProfile = dataManager.getProfile() || { subjects: [] };

    dataManager.saveProfile({
        name: name,
        schoolName: schoolName,
        gpa: parseFloat(gpa),
        subjects: currentProfile.subjects || []
    });

    closeProfileModal();
    updateUserStatusUI();

    // 현재 Stage 1이면 다시 렌더링하여 매칭 결과 반영
    const activeTab = document.querySelector('.nav-item.active');
    if (activeTab && activeTab.dataset.tab === 'stage1' && stage1State.selectedUnivId) {
        renderUnivDetail(stage1State.selectedUnivId);
    }
}

function updateUserStatusUI() {
    if (typeof loadUserStatus === 'function') {
        loadUserStatus();
    }
}
