/**
 * DataManager
 * Local Storage를 기반으로 데이터 영속성을 관리하는 클래스
 */
class DataManager {
    constructor() {
        this.STORAGE_KEY = 'counseling_v2_data';
        this.init();
    }

    init() {
        const data = this.getData();
        if (!data) {
            const initialSchema = {
                studentProfile: {
                    name: '',
                    schoolName: '',
                    gpa: 0.0,
                    totalPercentile: 0.0, // 국수탐 백분위 합
                    targetMajor: '',
                    selectedUniversities: [], // { id, name, major }
                    subjects: [], // Legacy: kept for backward compatibility
                    completedSubjects: [], // [NEW] 이수 완료 과목
                    inprogressSubjects: [], // [NEW] 이수 중 과목
                    lastSelectedUniv: null, // { id, univ_name, raw_major_name, ... }
                    memo: '', // [NEW] 상담 메모
                    consultingStatus: '보통' // [NEW] 상담 상태 (좋음/보통/나쁨)
                },
                consultingResults: [], // History of AI generated reports
                appSettings: {
                    supabaseUrl: 'https://ytpycfenjtmvzjsvjwds.supabase.co',
                    geminiKey: '',
                    temperature: 0.7, // Changed default to 0.7 
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 8192,
                    geminiModel: 'gemini-3.1-pro',
                    theme: 'light',
                    lastActiveTab: 'stage1'
                }
            };
            this.saveData(initialSchema);
        }
    }

    resetData() {
        const currentData = this.getData();
        const initialSchema = {
            studentProfile: {
                name: '',
                schoolName: '',
                gpa: 0.0,
                totalPercentile: 0.0,
                targetMajor: '',
                selectedUniversities: [],
                subjects: [],
                completedSubjects: [],
                inprogressSubjects: [],
                lastSelectedUniv: null,
                memo: '',
                consultingStatus: '보통'
            },
            consultingResults: [], // Reset history for new student session
            appSettings: currentData.appSettings || {} // Keep settings
        };
        this.saveData(initialSchema);
        console.log('Use Data Reset Complete');
    }

    getData() {
        const dataStr = localStorage.getItem(this.STORAGE_KEY);
        if (!dataStr) return null;

        try {
            const data = JSON.parse(dataStr);

            // Migrate old apiKey to geminiKey for backward compatibility
            if (data.appSettings && data.appSettings.apiKey && !data.appSettings.geminiKey) {
                data.appSettings.geminiKey = data.appSettings.apiKey;
            }

            // Migrate studentProfile to have new subject arrays and memo
            if (data.studentProfile) {
                if (!data.studentProfile.completedSubjects) data.studentProfile.completedSubjects = [];
                if (!data.studentProfile.inprogressSubjects) data.studentProfile.inprogressSubjects = [];

                // [NEW] Memo Migration
                if (data.studentProfile.memo === undefined) data.studentProfile.memo = '';
                if (!data.studentProfile.consultingStatus) data.studentProfile.consultingStatus = '보통';

                // If legacy subjects exist but new ones don't, migrate them to completed
                if (data.studentProfile.subjects && data.studentProfile.subjects.length > 0 && data.studentProfile.completedSubjects.length === 0) {
                    data.studentProfile.completedSubjects = [...data.studentProfile.subjects];
                }
            }

            // Ensure consultingResults array exists
            if (!data.consultingResults) {
                data.consultingResults = [];
            }

            this.saveData(data); // Save the migrated structure
            return data;
        } catch (e) {
            console.error('Error parsing data:', e);
            return null;
        }
    }

    saveData(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    // --- Student Profile Methods ---

    updateProfile(profileData) {
        const data = this.getData();
        if (data) {
            data.studentProfile = { ...data.studentProfile, ...profileData };
            this.saveData(data);
        }
    }

    getProfile() {
        const data = this.getData();
        return data ? data.studentProfile : null;
    }

    saveProfile(profileData) {
        this.updateProfile(profileData);
    }

    // --- AI Results Methods ---

    saveConsultingResult(result) {
        const data = this.getData();
        if (!data) return;

        const newResult = {
            id: Date.now(),
            createdAt: new Date().toISOString(),
            ...result
        };
        data.consultingResults.push(newResult);
        this.saveData(data);

        // [NEW] Sync/Save to Database
        if (window.dbService && result.univ) {
            const profile = this.getProfile();
            // Ensure we have a studentId. If not, try to create one.
            if (profile) {
                if (profile.studentId) {
                    dbService.saveCounselingResult(profile.studentId, result);
                } else {
                    console.warn('Student ID missing during result save. Attempting to get it...');
                    dbService.upsertStudent(profile).then(id => {
                        if (id) {
                            this.updateProfile({ studentId: id });
                            dbService.saveCounselingResult(id, result);
                        }
                    });
                }
            }
        }
    }
}

// Global Instance
const dataManager = new DataManager();
