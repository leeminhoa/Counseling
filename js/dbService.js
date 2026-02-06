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

        // Fixed Connection Details (Hidden from UI)
        const url = 'https://ytpycfenjtmvzjsvjwds.supabase.co';
        const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cHljZmVuanRtdnpqc3Zqd2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzAxMTgsImV4cCI6MjA4NTI0NjExOH0.-k0r-Ct3mof9I0iQHOiCptgCkiiVXksgH2q3Be79620';

        if (url && key && window.supabase) {
            this.client = window.supabase.createClient(url, key);
            console.log('✅ Supabase Client Initialized (Fixed Credentials)');
        } else {
            console.warn('⚠️ Supabase URL or Key missing. Running in Mock Mode.');
        }
    }

    /**
     * 대학/학과 목록 검색
     * Table: univ_major_map (실제 테이블명에 맞춰 조정 가능)
     */
    async searchUniversities(query) {
        if (!this.client) return [];

        const { data, error } = await this.client
            .from('v_univ_dept_subjects')
            .select('*')
            .or(`univ_name.ilike.%${query}%,raw_major_name.ilike.%${query}%,canonical_major.ilike.%${query}%`)
            .limit(20);

        if (error) {
            console.warn('DB Search Error:', error);
            return [];
        }
        return data.map(item => ({
            ...item,
            id: item.univ_map_id // Alias for frontend compatibility
        }));
    }



    /**
     * 특정 학과의 권장/핵심 과목 조회
     * Join: univ_dept_subject_map + subjects (via course_key)
     */
    async getMajorSubjects(univMapId) {
        if (!this.client) return [];

        // Step 1: univ_dept_subject_map에서 course_key와 bucket 조회
        const { data: mappingData, error: mappingError } = await this.client
            .from('univ_dept_subjects_map')
            .select('course_key, bucket')
            .eq('univ_map_id', univMapId);

        if (mappingError) {
            console.warn('DB Fetch Subject Mapping Error:', mappingError);
            return [];
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
            console.warn('DB Fetch Subjects Error:', subjectsError);
            return [];
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

    /**
     * 과목 검색
     * Table: subjects
     */
    async searchSubjects(query) {
        if (!this.client) return [];

        const { data, error } = await this.client
            .from('subjects')
            .select('*')
            .ilike('course_name', `%${query}%`)
            .limit(10);

        if (error) {
            console.warn('DB Subject Search Error:', error);
            return [];
        }
        return data;
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
        // Valid Categories available in DB (v_univ_dept_subjects.top_category)
        const validCategories = new Set(['공학계열', '인문계열', '자연과학계열', '사회과학계열', '보건의료계열', '교육계열', '정보컴퓨팅계열']);

        // Mock Mapping Rules (This logic acts as a heuristic to calculate scores, but output will be filtered)
        // Note: Some categories below (e.g. '상경 계열', '예술/체육 계열') might not exist in DB, so they will be filtered out.
        // We map our logic categories to DB categories: 
        // - '공학 계열' -> '공학계열'
        // - '자연과학 계열' -> '자연과학계열'
        // - '인문/사회 계열' -> '인문계열' or '사회과학계열' (Split logic needed?)
        // - For prototype simple fix, we just rename keys to match DB where possible or allow mismatch but filter result.

        const mockRules = [
            {
                category: '공학계열', // Matches DB
                core: ['미적분', '기하', '물리학I', '물리학II'],
                recommended: ['화학I', '지구과학I', '정보', '인공지능 수학']
            },
            {
                category: '자연과학계열', // Matches DB
                core: ['미적분', '화학I', '화학II', '생명과학I'],
                recommended: ['기하', '물리학I', '확률과 통계']
            },
            {
                category: '보건의료계열', // Matches DB
                core: ['화학I', '생명과학I', '생명과학II'],
                recommended: ['미적분', '확률과 통계', '윤리와 사상']
            },
            {
                category: '인문계열', // Matches DB
                core: ['생활과 윤리', '사회·문화', '한국지리'],
                recommended: ['세계사', '윤리와 사상', '국어']
            },
            {
                category: '사회과학계열', // Matches DB (New heuristic)
                core: ['사회·문화', '정치와 법', '경제', '확률과 통계'],
                recommended: ['세계지리', '생활과 윤리']
            },
            {
                category: '교육계열', // Matches DB
                core: ['교육학', '심리학'],
                recommended: ['생활과 윤리', '철학']
            },
            {
                category: '정보컴퓨팅계열', // Matches DB
                core: ['정보', '수학I', '수학II', '미적분'],
                recommended: ['인공지능 수학', '확률과 통계']
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

        // Return Top 10, filtered by Valid DB Categories
        return results
            .filter(r => validCategories.has(r.category))
            .slice(0, 10);
    }
    /**
     * Stage 1-2: 학부(소계열) 조회
     * category: Stage 1-1에서 선택한 대계열 (top_category)
     */
    async getMajorsByCategory(category) {
        if (!this.client) return [];

        const { data, error } = await this.client
            .from('univ_dept_subjects') // or univ_major_map depending on schema design
            .select('canonical_major')
            .eq('top_category', category); // Assuming top_category matches

        if (error) {
            console.warn('DB Major Fetch Error:', error);
            return [];
        }

        // Return unique list
        const uniqueMajors = [...new Set(data.map(item => item.canonical_major))];
        return uniqueMajors.sort();
    }

    // --- Student Management (Counselor Mode) ---

    async getAllStudents(query = '') {
        try {
            // 1. Fetch Students
            let dbQuery = this.client
                .from('students')
                .select(`
                    id, 
                    student_name, 
                    grade, 
                    mildang_id,
                    created_at,
                    school_id
                `)
                .order('created_at', { ascending: false });

            if (query) {
                dbQuery = dbQuery.or(`student_name.ilike.%${query}%,mildang_id.ilike.%${query}%`);
            }

            const { data: students, error } = await dbQuery;
            if (error) throw error;
            if (!students || students.length === 0) return [];

            // 2. Fetch Schools (Manual Join to avoid PGRST200 Schema Cache issues)
            const schoolIds = [...new Set(students.map(s => s.school_id).filter(id => id))];

            let schoolsMap = {};
            if (schoolIds.length > 0) {
                const { data: schools, error: schoolError } = await this.client
                    .from('school')
                    .select('id, school_name')
                    .in('id', schoolIds);

                if (!schoolError && schools) {
                    schools.forEach(s => {
                        schoolsMap[s.id] = s.school_name;
                    });
                }
            }

            // 3. Merge
            return students.map(s => ({
                ...s,
                school: {
                    school_name: schoolsMap[s.school_id] || '학교 미지정'
                }
            }));

        } catch (error) {
            console.error('Error fetching students:', error);
            return [];
        }
    }

    // --- DB Migration Methods ---

    /**
     * 학교 정보 조회 (없으면 null 반환)
     */
    /**
     * 학교 정보 조회 및 생성 (Upsert-like)
     */
    async ensureSchool(schoolName) {
        if (!this.client || !schoolName) return null;

        // 1. Try to find existing school
        const { data, error } = await this.client
            .from('school')
            .select('id')
            .eq('school_name', schoolName)
            .maybeSingle();

        if (error) {
            console.warn('School lookup error:', error);
            return null;
        }

        if (data) return data.id;

        // 2. Create new school if not found
        const { data: inserted, error: insertError } = await this.client
            .from('school')
            .insert({
                school_name: schoolName,
                region: '미정',
                type: 'general' // Default to 'general' to satisfy NOT NULL 'school_type' enum
            })
            .select('id')
            .single();

        if (insertError) {
            console.error('School creation error:', insertError);
            return null;
        }

        return inserted.id;
    }

    /**
     * 학생 정보 Upsert (이름 + 학교 + 학년 기준)
     */
    async upsertStudent(profile) {
        if (!this.client) {
            console.warn('DB not connected. Skipping student sync.');
            return null;
        }

        let schoolId = await this.ensureSchool(profile.schoolName);
        const grade = profile.grade || 'HIGH1';

        // 1. Check if student exists
        let query = this.client
            .from('students')
            .select('id, mildang_id')
            .eq('student_name', profile.name)
            .eq('grade', grade);

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        } else {
            // Cannot save without school_id due to NOT NULL constraint
            // We must have a schoolId. If ensureSchool failed, we can't proceed or need a fallback "Unknown School"
            console.warn('School ID missing, attempting to use fallback school...');
            // Try to use a fallback or create a placeholder? 
            // For now, let's try to pass null and see if we can fix the constraint later, 
            // but user said constraint violation. 
            // Better strategy: Create a "기타 고등학교" if schoolName was empty?
            if (!profile.schoolName) {
                schoolId = await this.ensureSchool('기타 고등학교');
            }
        }

        const { data: existing, error: searchError } = await query.maybeSingle();

        if (searchError) {
            console.error('Student search error:', searchError);
            throw searchError;
        }

        if (existing) {
            console.log('Student found:', existing.id);
            return existing.id;
        }

        // 2. Create new student
        const newMildangId = crypto.randomUUID();
        const newStudent = {
            student_name: profile.name,
            grade: grade,
            school_id: schoolId, // Now hopefully valid
            mildang_id: newMildangId
        };

        // If school_id is still null here, it will fail. ensureSchool handles creation.

        const { data: created, error: createError } = await this.client
            .from('students')
            .insert(newStudent)
            .select()
            .single();

        if (createError) {
            console.error('Student create error:', createError);
            throw createError;
        }

        console.log('Student created:', created.id);
        return created.id;
    }

    /**
     * 상담 세션 저장 (JSON 직렬화)
     */
    async saveCounselingSession(studentId, profile) {
        if (!this.client || !studentId) return;

        // Check for existing active session
        const { data: activeSession, error: searchError } = await this.client
            .from('counseling')
            .select('id')
            .eq('student_id', studentId)
            .in('status', ['draft', 'in_progress'])
            .maybeSingle();

        const activityNotes = JSON.stringify({
            gpa: profile.gpa,
            totalPercentile: profile.totalPercentile,
            completedSubjects: profile.completedSubjects,
            inprogressSubjects: profile.inprogressSubjects,
            updatedAt: new Date().toISOString()
        });

        const payload = {
            student_id: studentId,
            status: 'in_progress',
            rec_date: new Date().toISOString(),
            activity_notes: [activityNotes],
            desired_category: profile.desiredCategory || '미정',
            desired_univ: profile.targetUniv || '미정',
            desired_major: profile.targetMajor || '미정'
        };

        if (activeSession) {
            const { error } = await this.client
                .from('counseling')
                .update(payload)
                .eq('id', activeSession.id);
            if (error) console.error('Counseling update error:', error);
            else console.log('Counseling session updated:', activeSession.id);
        } else {
            const { error } = await this.client
                .from('counseling')
                .insert(payload);
            if (error) console.error('Counseling insert error:', error);
            else console.log('New Counseling session created');
        }
    }

    /**
     * 상담 이력 조회
     * Switch to 'counseling' table directly as 'counseling_archive' seems to be deprecated or viewless
     */
    async getCounselingHistory(studentId) {
        if (!this.client || !studentId) return [];

        const { data, error } = await this.client
            .from('counseling')
            .select('*')
            .eq('student_id', studentId)
            .order('rec_date', { ascending: false });

        if (error) {
            console.error('History fetch error:', error);
            return [];
        }

        return data;
    }

    /**
     * API Key 조회 (common_info 테이블)
     * type: 'llm_api' 등
     */
    async getApiKey(type) {
        if (!this.client) return null;

        const { data, error } = await this.client
            .from('common_info')
            .select('contents')
            .eq('type', type)
            .maybeSingle();

        if (error) {
            console.error(`API Key fetch error (${type}):`, error);
            return null;
        }

        return data ? data.contents : null;
    }
}

// Global Instance
const dbService = new DBService();
