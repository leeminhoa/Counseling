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
        <div class="modal-content profile-editor" style="max-width: 600px; padding: 1.5rem; position: relative; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
            <button class="close-btn" onclick="closeProfileModal()" aria-label="닫기" 
                style="position: absolute; top: 1.25rem; right: 1.25rem; border: none; background: none; font-size: 1.75rem; cursor: pointer; color: #94A3B8; line-height: 1; padding: 0.5rem; transition: color 0.2s;">&times;</button>
            
            <div class="modal-header" style="border-bottom: none; padding: 0.5rem 0 1rem 0;">
                <h2 style="font-size: 1.5rem; letter-spacing: -0.5px; margin: 0; display: flex; align-items: center; gap: 0.75rem;">
                    <i class="fa-solid fa-user-graduate" style="color: var(--primary-color);"></i> 
                    학생 정보 입력
                </h2>
            </div>
            <p style="color: #64748B; font-size: 0.95rem; margin-bottom: 2rem; margin-top: 0;">정확한 입시 분석을 위해 학생의 기본 정보를 입력해주세요.</p>
            
            <div class="modal-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div class="form-section" style="grid-column: span 2;">
                    <label for="profileName" style="font-size: 0.85rem; font-weight: 700; color: #475569; display: block; margin-bottom: 0.6rem;">학생 이름</label>
                    <input type="text" id="profileName" value="${profile.name || ''}" placeholder="예: 홍길동" 
                        style="width: 100%; border: 1px solid #E2E8F0; background: #F8FAFC; padding: 1rem 1.25rem; border-radius: 12px; font-size: 1rem; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                </div>

                <div class="form-section">
                    <label for="profileSchool" style="font-size: 0.85rem; font-weight: 700; color: #475569; display: block; margin-bottom: 0.6rem;">소속 학교명</label>
                    <input type="text" id="profileSchool" value="${profile.schoolName || ''}" placeholder="예: 서울고등학교"
                        style="width: 100%; border: 1px solid #E2E8F0; background: #F8FAFC; padding: 1rem 1.25rem; border-radius: 12px; font-size: 1rem; box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                </div>

                <div class="form-section">
                    <label for="profileGpa" style="font-size: 0.85rem; font-weight: 700; color: #475569; display: block; margin-bottom: 0.6rem;">평균 내신 성적</label>
                    <div class="gpa-input-group" style="position: relative;">
                        <input type="number" id="profileGpa" value="${profile.gpa || ''}" step="0.01" min="1" max="9" placeholder="1.00"
                            style="width: 100%; border: 1px solid #E2E8F0; background: #F8FAFC; padding: 1rem 3.5rem 1rem 1.25rem; border-radius: 12px; font-size: 1.1rem; font-weight: 700; color: var(--primary-color); box-sizing: border-box; outline: none; transition: border-color 0.2s;">
                        <span style="position: absolute; right: 1.25rem; top: 50%; transform: translateY(-50%); font-weight: 600; color: #94A3B8;">등급</span>
                    </div>
                </div>
            </div>
            
            <div class="modal-footer" style="margin-top: 2.5rem; display: flex; gap: 1rem;">
                <button class="btn-secondary" onclick="closeProfileModal()" 
                    style="flex: 1; height: 56px; border-radius: 14px; border: 1px solid #E2E8F0; background: #F8FAFC; color: #64748B; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s;">취소</button>
                <button class="btn-primary" onclick="saveProfileData()" 
                    style="flex: 2; height: 56px; border-radius: 14px; border: none; background: var(--primary-color); color: #FFFFFF; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">분석 시작하기</button>
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
