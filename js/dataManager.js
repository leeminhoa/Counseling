/**
 * DataManager
 * Local Storage를 기반으로 데이터 영속성을 관리하는 클래스
 */
class DataManager {
    constructor() {
        this.STORAGE_KEY = 'counseling_v2_data';
        this.init();
    }

    // 초기 데이터 구조 정의 (Schema)
    init() {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
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
                    lastSelectedUniv: null // { id, univ_name, raw_major_name, ... }
                },
                consultingResults: [], // History of AI generated reports
                appSettings: {
                    supabaseUrl: 'https://ytpycfenjtmvzjsvjwds.supabase.co',
                    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cHljZmVuanRtdnpqc3Zqd2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzAxMTgsImV4cCI6MjA4NTI0NjExOH0.-k0r-Ct3mof9I0iQHOiCptgCkiiVXksgH2q3Be79620',
                    geminiKey: '',
                    temperature: 0.7,
                    theme: 'light',
                    lastActiveTab: 'stage1'
                }
            };
            this.saveData(initialSchema);
        }
    }

    getData() {
        const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY));

        if (!data) return null;

        // Migrate old apiKey to geminiKey for backward compatibility
        if (data.appSettings && data.appSettings.apiKey && !data.appSettings.geminiKey) {
            data.appSettings.geminiKey = data.appSettings.apiKey;
        }

        // Migrate studentProfile to have new subject arrays
        if (data.studentProfile) {
            if (!data.studentProfile.completedSubjects) data.studentProfile.completedSubjects = [];
            if (!data.studentProfile.inprogressSubjects) data.studentProfile.inprogressSubjects = [];

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
    }

    saveData(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    // --- Student Profile Methods ---

    updateProfile(profileData) {
        const data = this.getData();
        data.studentProfile = { ...data.studentProfile, ...profileData };
        this.saveData(data);
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
        const newResult = {
            id: Date.now(),
            createdAt: new Date().toISOString(),
            ...result
        };
        data.consultingResults.push(newResult);
        this.saveData(data);
    }
}

// Global Instance
const dataManager = new DataManager();
