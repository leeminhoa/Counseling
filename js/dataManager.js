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
                    targetMajor: '',
                    selectedUniversities: [], // { id, name, major }
                    subjects: [] // Array of strings for matching
                },
                consultingResults: [], // History of AI generated reports
                appSettings: {
                    supabaseUrl: 'https://ytpycfenjtmvzjsvjwds.supabase.co',
                    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cHljZmVuanRtdnpqc3Zqd2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzAxMTgsImV4cCI6MjA4NTI0NjExOH0.-k0r-Ct3mof9I0iQHOiCptgCkiiVXksgH2q3Be79620',
                    apiKey: 'AIzaSyC72AlExrv9dA7Om0iGXlU_dUuJ3rs2zjg',
                    temperature: 0.7,
                    theme: 'light',
                    lastActiveTab: 'stage1'
                }
            };
            this.saveData(initialSchema);
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY));
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
