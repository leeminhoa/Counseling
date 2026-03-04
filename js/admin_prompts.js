/**
 * admin_prompts.js
 * LLM 프롬프트 관리 UI 로직
 */

const promptManager = {
    currentGroup: null,

    async init() {
        console.log('Prompt Manager Initialized');
        await this.ensureDefaultGroups(); // [NEW] Auto-seed
        await this.loadPromptGroups();
        this.bindEvents();
    },

    async ensureDefaultGroups() {
        const defaultGroups = ['탐구보고서 가이드'];
        try {
            // Check existing
            const { data: existing } = await dbService.client.from('prompt_group').select('title');
            const existingTitles = new Set(existing ? existing.map(g => g.title) : []);

            for (const title of defaultGroups) {
                if (!existingTitles.has(title)) {
                    await dbService.client.from('prompt_group').insert([{ title, description: '기본 탐구 가이드 프롬프트 그룹' }]);
                    console.log(`Created default group: ${title}`);
                }
            }
        } catch (e) {
            console.error('Failed to ensure default groups:', e);
        }
    },

    bindEvents() {
        // Group Selection
        document.getElementById('promptGroupSelect')?.addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadPromptsByGroup(e.target.value);
            } else {
                this.renderPromptList([]);
            }
        });

        // Add New Version Button
        document.getElementById('btnAddPromptVersion')?.addEventListener('click', () => {
            this.openPromptModal();
        });

        // Save Prompt (Modal)
        document.getElementById('btnSavePrompt')?.addEventListener('click', () => {
            this.savePromptVersion();
        });
    },

    async loadPromptGroups() {
        const select = document.getElementById('promptGroupSelect');
        if (!select) return;

        select.innerHTML = '<option value="">프롬프트 그룹 선택...</option>';

        try {
            const { data, error } = await dbService.client
                .from('prompt_group')
                .select('*')
                .order('title');

            if (error) throw error;

            data.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.title;
                select.appendChild(option);
            });
        } catch (err) {
            console.error('Failed to load prompt groups:', err);
            showCustomAlert('프롬프트 그룹을 불러오는데 실패했습니다.');
        }
    },

    async loadPromptsByGroup(groupId) {
        this.currentGroup = groupId;
        try {
            const loading = document.getElementById('promptLoading');
            if (loading) loading.style.display = 'block';

            const { data, error } = await dbService.client
                .from('prompt')
                .select('*')
                .eq('prompt_group_id', groupId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.renderPromptList(data);
        } catch (err) {
            console.error('Failed to load prompts:', err);
            showCustomAlert('프롬프트 목록을 불러오는데 실패했습니다.');
        } finally {
            const loading = document.getElementById('promptLoading');
            if (loading) loading.style.display = 'none';
        }
    },

    renderPromptList(prompts) {
        const container = document.getElementById('promptListContainer');
        if (!container) return;

        if (prompts.length === 0) {
            container.innerHTML = '<p style="color:#64748B; text-align:center; padding:2rem;">등록된 프롬프트 버전이 없습니다.</p>';
            return;
        }

        container.innerHTML = prompts.map(prompt => `
            <div class="card" style="margin-bottom: 1rem; border: 1px solid ${prompt.valid ? '#3B82F6' : '#E2E8F0'}; transition: all 0.2s;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                    <div>
                        <span class="badge" style="background:${prompt.type === 'system' ? '#DBEAFE' : '#F3E8FF'}; color:${prompt.type === 'system' ? '#1E40AF' : '#6B21A8'}; margin-right:0.5rem;">
                            ${prompt.type.toUpperCase()}
                        </span>
                        <span style="font-weight:600; font-size:1.1rem; vertical-align:middle;">${prompt.title}</span>
                        ${prompt.valid ? '<span class="badge" style="background:#EFF6FF; color:#1D4ED8; margin-left:0.5rem;"><i class="fa-regular fa-eye"></i> 리스트 노출 중</span>' : ''}
                    </div>
                    <div style="font-size:0.85rem; color:#64748B;">
                        ${new Date(prompt.created_at).toLocaleString()}
                    </div>
                </div>
                
                <div style="background:#F8FAFC; padding:1rem; border-radius:0.5rem; font-family:monospace; font-size:0.9rem; white-space:pre-wrap; max-height:200px; overflow-y:auto; margin-bottom:1rem; color:#334155;">
                    ${this.escapeHtml(prompt.contents)}
                </div>

                <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
                    <button class="btn-secondary btn-sm" onclick="promptManager.togglePromptVisibility('${prompt.id}', ${prompt.valid}, '${prompt.type}')">
                        ${prompt.valid ? '<i class="fa-regular fa-eye-slash"></i> 숨기기' : '<i class="fa-regular fa-eye"></i> 노출 설정'}
                    </button>
                    
                    <button class="btn-secondary btn-sm" onclick="promptManager.copyToEdit('${prompt.id}')">
                        <i class="fa-solid fa-copy"></i> 복사하여 수정
                    </button>
                </div>
            </div>
        `).join('');

        // Expose helper methods to global scope for inline onclicks
        window.promptManager.togglePromptVisibility = this.togglePromptVisibility.bind(this);
        window.promptManager.copyToEdit = this.copyToEdit.bind(this);
    },

    async togglePromptVisibility(promptId, currentStatus, type) {
        // currentStatus: true (Active/Visible) -> false (Hidden)
        // currentStatus: false (Hidden) -> true (Visible)
        const newStatus = !currentStatus;

        try {
            if (newStatus) {
                // If activating, deactivate others first to avoid constraint violation
                const { error: deactivateError } = await dbService.client
                    .from('prompt')
                    .update({ valid: false })
                    .eq('prompt_group_id', this.currentGroup)
                    .eq('type', type);

                if (deactivateError) throw deactivateError;
            }

            const { error } = await dbService.client
                .from('prompt')
                .update({ valid: newStatus })
                .eq('id', promptId);

            if (error) throw error;

            // Reload list
            this.loadPromptsByGroup(this.currentGroup);
            // showCustomAlert(newStatus ? '프롬프트가 불러오기 목록에 노출됩니다.' : '프롬프트가 불러오기 목록에서 숨겨졌습니다.');

        } catch (err) {
            console.error('Toggle failed:', err);
            showCustomAlert('설정 변경 실패: ' + err.message);
        }
    },

    copyToEdit(promptId) {
        // Find prompt data from simple cache or DOM is tricky, better reuse the load function logic or store in memory
        // For simplicity, let's fetch it or grab from textContent if simple.
        // Actually, we can fetch single item.
        dbService.client.from('prompt').select('*').eq('id', promptId).single().then(({ data }) => {
            if (data) {
                document.getElementById('promptTitle').value = data.title + ' (Copy)';
                document.getElementById('promptType').value = data.type;
                document.getElementById('promptContent').value = data.contents;
                document.getElementById('promptDesc').value = data.description || '';
                this.openPromptModal();
            }
        });
    },

    openPromptModal() {
        const modal = document.getElementById('promptModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
        }
    },

    closePromptModal() {
        const modal = document.getElementById('promptModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            // Reset form
            document.getElementById('promptForm').reset();
        }
    },

    async savePromptVersion() {
        if (!this.currentGroup) {
            showCustomAlert('프롬프트 그룹이 선택되지 않았습니다.');
            return;
        }

        const title = document.getElementById('promptTitle').value;
        const type = document.getElementById('promptType').value;
        const contents = document.getElementById('promptContent').value;
        const description = document.getElementById('promptDesc').value;

        if (!title || !contents) {
            showCustomAlert('제목과 내용은 필수입니다.');
            return;
        }

        try {
            const { error } = await dbService.client
                .from('prompt')
                .insert([{
                    prompt_group_id: this.currentGroup,
                    title,
                    type,
                    contents,
                    valid: false // Default to inactive
                }]);

            if (error) throw error;

            this.closePromptModal();
            this.loadPromptsByGroup(this.currentGroup);
            showCustomAlert('새 프롬프트 버전이 저장되었습니다.');

        } catch (err) {
            console.error('Save failed:', err);
            showCustomAlert('저장 실패: ' + err.message);
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// Global export
window.promptManager = promptManager;
