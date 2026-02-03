/**
 * DBService.js
 * Supabase DB(Read-Only)와 통신하여 대학/과목 데이터를 조회하는 서비스
 * 현재는 API Key 없이 Mock Data를 반환하도록 구성됨 (Schema 기반)
 */
class DBService {
    constructor() {
        this.client = null;
        this.initClient();
    }

    initClient() {
        const settings = dataManager.getData().appSettings || {};
        // Use provided keys directly to ensure connection recovery
        const url = settings.supabaseUrl || 'https://ytpycfenjtmvzjsvjwds.supabase.co';
        const key = settings.supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cHljZmVuanRtdnpqc3Zqd2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzAxMTgsImV4cCI6MjA4NTI0NjExOH0.-k0r-Ct3mof9I0iQHOiCptgCkiiVXksgH2q3Be79620';

        if (url && key && window.supabase) {
            this.client = window.supabase.createClient(url, key);
            console.log('✅ Supabase Client Initialized with fixed key');
        } else {
            console.warn('⚠️ Supabase URL or Key missing. Running in Mock Mode.');
        }
    }

    /**
     * 대학/학과 목록 검색
     * Table: univ_major_map (실제 테이블명에 맞춰 조정 가능)
     */
    async searchUniversities(query) {
        if (!this.client) return this.mockSearchUniversities(query);

        const { data, error } = await this.client
            .from('univ_major_map')
            .select('*')
            .or(`univ_name.ilike.%${query}%,raw_major_name.ilike.%${query}%,canonical_major.ilike.%${query}%`)
            .limit(20);

        if (error) {
            console.warn('DB Search Error (falling back to mock):', error);
            return this.mockSearchUniversities(query);
        }
        return data;
    }

    mockSearchUniversities(query) {
        console.log(`Searching universities for: ${query}`);
        const lowerQuery = query.toLowerCase();

        // Mock Implementation based on provided schema
        const mockData = [
            { id: 1, univ_name: '서울대학교', raw_major_name: '컴퓨터공학부', top_category: '공학', canonical_major: '컴퓨터' },
            { id: 2, univ_name: '연세대학교', raw_major_name: '인공지능학과', top_category: '공학', canonical_major: 'AI' },
            { id: 3, univ_name: '고려대학교', raw_major_name: '데이터과학과', top_category: '공학', canonical_major: '데이터' },
            { id: 4, univ_name: '성균관대학교', raw_major_name: '소프트웨어학과', top_category: '공학', canonical_major: '컴퓨터' },
            { id: 5, univ_name: '한양대학교', raw_major_name: '미디어커뮤니케이션학과', top_category: '사회발전', canonical_major: '언론정보' }
        ];

        return mockData.filter(u =>
            u.univ_name.toLowerCase().includes(lowerQuery) ||
            u.raw_major_name.toLowerCase().includes(lowerQuery) ||
            u.top_category.toLowerCase().includes(lowerQuery) ||
            u.canonical_major.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * 특정 학과의 권장/핵심 과목 조회
     * Join: univ_dept_subject_map + subjects (via course_key)
     */
    async getMajorSubjects(univMapId) {
        if (!this.client) return this.mockGetMajorSubjects(univMapId);

        // Step 1: univ_dept_subject_map에서 course_key와 bucket 조회
        const { data: mappingData, error: mappingError } = await this.client
            .from('univ_dept_subjects_map')
            .select('course_key, bucket')
            .eq('univ_map_id', univMapId);

        if (mappingError) {
            console.warn('DB Fetch Subject Mapping Error (falling back to mock):', mappingError);
            return this.mockGetMajorSubjects(univMapId);
        }

        if (!mappingData || mappingData.length === 0) {
            return [];
        }

        // Step 2: subjects 테이블에서 과목 정보 조회
        const courseKeys = mappingData.map(m => m.course_key);
        const { data: subjectsData, error: subjectsError } = await this.client
            .from('subjects')
            .select('course_key, course_name, course_type')
            .in('course_key', courseKeys);

        if (subjectsError) {
            console.warn('DB Fetch Subjects Error (falling back to mock):', subjectsError);
            return this.mockGetMajorSubjects(univMapId);
        }

        // Step 3: 두 결과를 course_key로 조인
        const subjectsMap = new Map(subjectsData.map(s => [s.course_key, s]));
        return mappingData
            .filter(m => subjectsMap.has(m.course_key))
            .map(m => {
                const subject = subjectsMap.get(m.course_key);
                return {
                    course_name: subject.course_name,
                    course_type: subject.course_type,
                    bucket: m.bucket
                };
            });
    }

    mockGetMajorSubjects(univMapId) {
        const mockMap = {
            1: [
                { course_name: '미적분', bucket: 'core', course_type: 'GENERAL' },
                { course_name: '기하', bucket: 'core', course_type: 'GENERAL' },
                { course_name: '인공지능 수학', bucket: 'recommended', course_type: 'CAREER' }
            ],
            2: [
                { course_name: '확률과 통계', bucket: 'core', course_type: 'GENERAL' },
                { course_name: '정보과학', bucket: 'recommended', course_type: 'CAREER' }
            ]
        };
        return mockMap[univMapId] || [];
    }

    /**
     * 입시 결과(경쟁률, 컷라인) 조회
     * Table: univ_dept_admission_stats
     */
    async getAdmissionStats(univMapId) {
        if (!this.client) return null;

        const { data, error } = await this.client
            .from('univ_dept_admission_stats')
            .select('*')
            .eq('univ_map_id', univMapId)
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.warn('DB Stats Error:', error);
            return null;
        }
        return data;
    }
}

// Global Instance
const dbService = new DBService();
