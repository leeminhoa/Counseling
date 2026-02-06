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
            .from('v_univ_dept_subjects')
            .select('*')
            .or(`univ_name.ilike.%${query}%,raw_major_name.ilike.%${query}%,canonical_major.ilike.%${query}%`)
            .limit(20);

        if (error) {
            console.warn('DB Search Error (falling back to mock):', error);
            return this.mockSearchUniversities(query);
        }
        return data.map(item => ({
            ...item,
            id: item.univ_map_id // Alias for frontend compatibility
        }));
    }

    mockSearchUniversities(query) {
        console.log(`Searching universities for: ${query}`);
        // Handle composite queries like "수학/통계" -> ["수학", "통계"]
        const queries = query.split('/').map(q => q.trim().toLowerCase()).filter(q => q.length > 0);

        // Mock Implementation based on provided schema
        const mockData = [
            { id: 1, univ_name: '서울대학교', raw_major_name: '컴퓨터공학부', top_category: '공학', canonical_major: '컴퓨터' },
            { id: 2, univ_name: '연세대학교', raw_major_name: '인공지능학과', top_category: '공학', canonical_major: 'AI' },
            { id: 3, univ_name: '고려대학교', raw_major_name: '데이터과학과', top_category: '공학', canonical_major: '데이터' },
            { id: 4, univ_name: '성균관대학교', raw_major_name: '소프트웨어학과', top_category: '공학', canonical_major: '컴퓨터' },
            { id: 5, univ_name: '한양대학교', raw_major_name: '미디어커뮤니케이션학과', top_category: '사회발전', canonical_major: '언론정보' },
            // Added Mock Data for Natural Sciences
            { id: 6, univ_name: '서울대학교', raw_major_name: '수리과학부', top_category: '자연과학', canonical_major: '수학' },
            { id: 7, univ_name: '연세대학교', raw_major_name: '응용통계학과', top_category: '자연과학', canonical_major: '통계' },
            { id: 8, univ_name: '고려대학교', raw_major_name: '수학과', top_category: '자연과학', canonical_major: '수학' },
            { id: 9, univ_name: '카이스트', raw_major_name: '물리학과', top_category: '자연과학', canonical_major: '물리' },
            { id: 10, univ_name: '포항공대', raw_major_name: '화학과', top_category: '자연과학', canonical_major: '화학' },
            { id: 11, univ_name: '서강대학교', raw_major_name: '생명과학과', top_category: '자연과학', canonical_major: '생명' }
        ];

        return mockData.filter(u => {
            const uName = u.univ_name.toLowerCase();
            const rMajor = u.raw_major_name.toLowerCase();
            const cMajor = u.canonical_major.toLowerCase();

            // Check if ANY of the split queries match ANY of the fields
            return queries.some(q =>
                uName.includes(q) ||
                rMajor.includes(q) ||
                cMajor.includes(q)
            );
        });
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
     * 과목 검색
     * Table: subjects
     */
    async searchSubjects(query) {
        if (!this.client) return this.mockSearchSubjects(query);

        const { data, error } = await this.client
            .from('subjects')
            .select('*')
            .ilike('course_name', `%${query}%`)
            .limit(10);

        if (error) {
            console.warn('DB Subject Search Error (falling back to mock):', error);
            return this.mockSearchSubjects(query);
        }
        return data;
    }

    mockSearchSubjects(query) {
        const mockSubjects = [
            { course_name: '국어', course_type: 'COMMON' },
            { course_name: '수학', course_type: 'COMMON' },
            { course_name: '영어', course_type: 'COMMON' },
            { course_name: '한국사', course_type: 'COMMON' },
            { course_name: '통합사회', course_type: 'COMMON' },
            { course_name: '통합과학', course_type: 'COMMON' },
            { course_name: '과학탐구실험', course_type: 'COMMON' },
            { course_name: '독서', course_type: 'GENERAL' },
            { course_name: '문학', course_type: 'GENERAL' },
            { course_name: '화법과 작문', course_type: 'GENERAL' },
            { course_name: '언어와 매체', course_type: 'GENERAL' },
            { course_name: '수학I', course_type: 'GENERAL' },
            { course_name: '수학II', course_type: 'GENERAL' },
            { course_name: '미적분', course_type: 'GENERAL' },
            { course_name: '확률과 통계', course_type: 'GENERAL' },
            { course_name: '영어I', course_type: 'GENERAL' },
            { course_name: '영어II', course_type: 'GENERAL' },
            { course_name: '한국지리', course_type: 'GENERAL' },
            { course_name: '세계지리', course_type: 'GENERAL' },
            { course_name: '물리학I', course_type: 'GENERAL' },
            { course_name: '화학I', course_type: 'GENERAL' },
            { course_name: '생명과학I', course_type: 'GENERAL' },
            { course_name: '지구과학I', course_type: 'GENERAL' },
            { course_name: '물리학II', course_type: 'GENERAL' },
            { course_name: '화학II', course_type: 'GENERAL' },
            { course_name: '생명과학II', course_type: 'GENERAL' },
            { course_name: '지구과학II', course_type: 'GENERAL' },
            { course_name: '인공지능 수학', course_type: 'CAREER' },
            { course_name: '심화수학I', course_type: 'CAREER' }
        ];

        return mockSubjects.filter(s => s.course_name.includes(query));
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

    /**
     * Stage 1-1: 계열 추천 로직
     * studentSubjects: 학생이 이수한 과목 리스트 (Array of Strings)
     * Returns: Array of { category: string, score: number, coreMatches: number, recMatches: number, matchedSubjects: [] }
     */
    async getFieldRecommendations(studentSubjects) {
        // In a real Supabase setup, this might be a complex join or RPC. 
        // For Prototype, we will use a robust Mock implementation that reflects the logic.
        // We simulate fetching all mapping rules and calculating scores client-side.

        // Mock Mapping Rules (This represents univ_dept_subjects_map + univ_major_map joined)
        // Grouped by Top Category
        const mockRules = [
            {
                category: '공학 계열',
                core: ['미적분', '기하', '물리학I', '물리학II'],
                recommended: ['화학I', '지구과학I', '정보', '인공지능 수학']
            },
            {
                category: '자연과학 계열',
                core: ['미적분', '화학I', '화학II', '생명과학I'],
                recommended: ['기하', '물리학I', '확률과 통계']
            },
            {
                category: '의학/보건 계열',
                core: ['화학I', '생명과학I', '생명과학II'],
                recommended: ['미적분', '확률과 통계', '윤리와 사상']
            },
            {
                category: '인문/사회 계열',
                core: ['생활과 윤리', '사회·문화', '한국지리'],
                recommended: ['세계사', '정치와 법', '경제']
            },
            {
                category: '교육 계열',
                core: ['교육학', '심리학'],
                recommended: ['생활과 윤리', '철학']
            },
            {
                category: '상경 계열',
                core: ['경제', '수학I', '수학II', '확률과 통계'],
                recommended: ['미적분', '정치와 법', '세계지리']
            },
            {
                category: '예술/체육 계열',
                core: ['음악', '미술', '체육'],
                recommended: ['문학', '독서']
            }
        ];

        // Helper for Flexible Matching
        const checkSubjectMatch = (ruleSubj, studentSubjs) => {
            const normalize = (str) => str.replace(/\s+/g, '').replace(/I/g, '1').replace(/II/g, '2').toLowerCase();
            const ruleNorm = normalize(ruleSubj);

            return studentSubjs.some(studentSubj => {
                const studentNorm = normalize(studentSubj);

                // 1. Exact Normalized Match
                if (ruleNorm === studentNorm) return true;

                // 2. Alias Handling (Specific known variations)
                if (ruleSubj === '미적분' && (studentNorm === '미적분1' || studentNorm === '미적분2')) return true;
                if (ruleSubj === '수학I' && studentNorm === '수학') return true; // Loose matching for Math

                // 3. Containment (Caution: can be broad, but useful for prototypes)
                // e.g. "심화수학I" contains "수학I" -> true
                if (studentNorm.includes(ruleNorm) && ruleNorm.length > 1) return true;

                return false;
            });
        };

        // Calculation Logic
        const results = mockRules.map(rule => {
            let coreCount = 0;
            let recCount = 0;
            let matchedItems = [];

            rule.core.forEach(subj => {
                if (checkSubjectMatch(subj, studentSubjects)) {
                    coreCount++;
                    matchedItems.push({ name: subj, type: 'core' });
                }
            });

            rule.recommended.forEach(subj => {
                if (checkSubjectMatch(subj, studentSubjects)) {
                    recCount++;
                    matchedItems.push({ name: subj, type: 'recommended' });
                }
            });

            return {
                category: rule.category,
                coreMatches: coreCount,
                recMatches: recCount,
                totalScore: (coreCount * 2) + (recCount * 1), // Weight: Core=2, Rec=1
                matchedSubjects: matchedItems
            };
        });

        // Sort: Core Desc > Rec Desc > Name Asc
        results.sort((a, b) => {
            if (b.coreMatches !== a.coreMatches) return b.coreMatches - a.coreMatches;
            if (b.recMatches !== a.recMatches) return b.recMatches - a.recMatches;
            return a.category.localeCompare(b.category);
        });

        // Return Top 10
        return results.slice(0, 10);
    }
    /**
     * Stage 1-2: 학부(소계열) 조회
     * category: Stage 1-1에서 선택한 대계열 (top_category)
     */
    async getMajorsByCategory(category) {
        if (!this.client) return this.mockGetMajorsByCategory(category);

        const { data, error } = await this.client
            .from('univ_dept_subjects') // or univ_major_map depending on schema design
            .select('canonical_major')
            .eq('top_category', category); // Assuming top_category matches

        if (error) {
            console.warn('DB Major Fetch Error:', error);
            return this.mockGetMajorsByCategory(category);
        }

        // Return unique list
        const uniqueMajors = [...new Set(data.map(item => item.canonical_major))];
        return uniqueMajors.sort();
    }

    mockGetMajorsByCategory(category) {
        // Mock Data based on mapping with examples
        const mapping = {
            '공학 계열': [
                { name: '컴퓨터', examples: '컴퓨터공학, 소프트웨어학과' },
                { name: 'AI', examples: '인공지능학과, 데이터사이언스학과' },
                { name: '소프트웨어', examples: '응용소프트웨어학과, 웹공학과' },
                { name: '기계공학', examples: '기계시스템공학, 로봇공학과' },
                { name: '전자공학', examples: '반도체공학과, 전자전기공학' },
                { name: '화학공학', examples: '화공생명공학, 고분자공학' },
                { name: '신소재공학', examples: '재료공학, 금속공학과' },
                { name: '산업공학', examples: '시스템경영공학, 산업정보공학' },
                { name: '건축학', examples: '건축공학, 실내건축학과' }
            ],
            '자연과학 계열': [
                { name: '수학/통계', examples: '수학과, 응용통계학과' },
                { name: '물리학', examples: '물리반도체과학부, 응용물리학과' },
                { name: '화학', examples: '화학과, 응용화학과' },
                { name: '생명과학', examples: '생물학과, 유전공학과' },
                { name: '지구환경과학', examples: '지구시스템과학과, 대기과학과' },
                { name: '천문우주', examples: '천문우주학과, 우주과학과' }
            ],
            '의학/보건 계열': [
                { name: '의예', examples: '의학과' },
                { name: '치의예', examples: '치의학과' },
                { name: '한의예', examples: '한의학과' },
                { name: '약학', examples: '약학과, 제약학과' },
                { name: '간호', examples: '간호학과' },
                { name: '보건행정', examples: '보건관리학과, 의료경영학과' }
            ],
            '인문/사회 계열': [
                { name: '국어국문', examples: '국어국문학과, 문예창작과' },
                { name: '영어영문', examples: '영어영문학과, 통번역학과' },
                { name: '사학', examples: '사학과, 역사문화학과' },
                { name: '철학', examples: '철학과, 윤리문화학과' },
                { name: '심리', examples: '심리학과, 상담심리학과' },
                { name: '사회학', examples: '사회학과, 도시사회학과' },
                { name: '정치외교', examples: '정치외교학과, 외교통상학과' },
                { name: '미디어/언론', examples: '신문방송학과, 미디어커뮤니케이션' },
                { name: '경제/경영', examples: '경제학과, 경영학과' }
            ],
            '교육 계열': [
                { name: '국어교육', examples: '국어교육과' },
                { name: '영어교육', examples: '영어교육과' },
                { name: '수학교육', examples: '수학교육과' },
                { name: '초등교육', examples: '초등교육과' },
                { name: '유아교육', examples: '유아교육과' }
            ],
            '상경 계열': [
                { name: '경영', examples: '경영학과, 글로벌경영학과' },
                { name: '경제', examples: '경제학과, 금융경제학과' },
                { name: '무역', examples: '국제무역학과, 무역유통학과' },
                { name: '금융', examples: '금융부동산학과, 파이낸스경영' },
                { name: '회계', examples: '회계세무학과, 경영회계학부' }
            ],
            '예술/체육 계열': [
                { name: '디자인', examples: '시각디자인, 산업디자인' },
                { name: '음악', examples: '피아노과, 관현악과' },
                { name: '미술', examples: '서양화과, 동양화과' },
                { name: '체육', examples: '체육교육과, 스포츠과학과' },
                { name: '스포츠산업', examples: '스포츠마케팅학과, 스포츠레저학과' }
            ]
        };

        return mapping[category] || [];
    }
}

// Global Instance
const dbService = new DBService();
