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
        // Robust check for dataManager
        const settings = (typeof dataManager !== 'undefined' && dataManager.getData)
            ? (dataManager.getData()?.appSettings || {})
            : {};

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
     * Stage 1-1: 계열 추천 로직 (DB-driven Refactor)
     * studentSubjects: 학생이 이수한 과목 리스트 (Array of Strings)
     * Returns: Array of { category: string, totalScore: number, coreMatches: number, recMatches: number, matchedSubjects: [] }
     */
    async getFieldRecommendations(studentSubjects) {
        if (!this.client) return [];

        try {
            // Step 1: Resolve Subject Keys (Fuzzy Match)
            // Fetch all subjects (cached) to map input names to keys
            const allSubjects = await this.getAllSubjects();
            const subjectKeys = [];
            const matchedSubjectNames = new Set(); // For result display

            const normalize = (str) => str.replace(/\s+/g, '').replace(/I/g, '1').replace(/II/g, '2').toLowerCase();

            studentSubjects.forEach(sName => {
                const sNorm = normalize(sName);
                const found = allSubjects.find(dbSub => {
                    const dbNorm = normalize(dbSub.course_name);
                    return dbNorm === sNorm || dbNorm.includes(sNorm) || sNorm.includes(dbNorm);
                });
                if (found) {
                    subjectKeys.push(found.course_key);
                    matchedSubjectNames.add(found.course_name); // Use DB name
                }
            });



            // Step 2: Fetch Mapping Hits
            // Find which departments use these subjects
            let hits = [];
            if (subjectKeys.length > 0) {
                const { data: dbHits, error: hitError } = await this.client
                    .from('univ_dept_subjects_map')
                    .select('univ_map_id, bucket, course_key')
                    .in('course_key', subjectKeys);

                if (hitError) throw hitError;
                hits = dbHits || [];
            }

            // Step 3: Fetch Category Map (cached)
            // Map univ_map_id -> top_category
            const categoryMap = await this.getCategoryMap();

            // Step 4: Aggregation
            const scores = {}; // { 'Engineering': { core: 0, rec: 0, subjects: Set() } }

            hits.forEach(hit => {
                let category = categoryMap[hit.univ_map_id];
                if (!category) return;

                if (!scores[category]) {
                    scores[category] = { core: 0, rec: 0, subjects: new Set(), totalScore: 0 };
                }

                // Identify Subject Name from Key
                const subjectName = allSubjects.find(s => s.course_key === hit.course_key)?.course_name || hit.course_key;

                // Add unique subject match marker check to avoid double counting same subject for same category?
                // Actually, if multiple depts in same category require it, it SHOULD boost the score.
                // So we just increment counts.
                if (hit.bucket === 'core') scores[category].core++;
                else scores[category].rec++;

                scores[category].subjects.add(JSON.stringify({ name: subjectName, type: hit.bucket }));
            });

            // Convert to Array and Normalize Scores
            // Since there are many depts, raw counts will be huge. We need to normalize or rank.
            // A simple ranking is sufficient for recommendation.

            const results = Object.entries(scores).map(([cat, stat]) => {
                // Parse subjects back
                const uniqueSubjects = Array.from(stat.subjects).map(JSON.parse);
                // Deduplicate by name/type preference? 
                // Let's just list distinct subjects that contributed.
                const subjectList = Array.from(new Set(uniqueSubjects.map(s => s.name))).map(name => {
                    const types = uniqueSubjects.filter(u => u.name === name).map(u => u.type);
                    return { name, type: types.includes('core') ? 'core' : 'recommended' };
                });

                // Fix: Match counts should reflect DISTINCT subjects, not total DB hits.
                const distinctCoreCount = subjectList.filter(s => s.type === 'core').length;
                const distinctRecCount = subjectList.filter(s => s.type === 'recommended').length;

                return {
                    category: cat,
                    coreMatches: distinctCoreCount,
                    recMatches: distinctRecCount,
                    totalScore: (stat.core * 2) + (stat.rec * 1), // Keep ranking based on prevalence intensity
                    matchedSubjects: subjectList,
                    allSubjectsCount: studentSubjects.length // [NEW] 전체 수강 과목 수량 파편화 UI용
                };
            });

            // Step 5: Sort & Filter
            // [NEW] Dynamic Categories to support new DB additions automatically
            const validCategories = Array.from(new Set(Object.values(categoryMap))).filter(Boolean);

            // Ensure all valid categories are present even if score is 0
            validCategories.forEach(cat => {
                if (!results.find(r => r.category === cat)) {
                    results.push({
                        category: cat,
                        coreMatches: 0,
                        recMatches: 0,
                        totalScore: 0,
                        matchedSubjects: [],
                        allSubjectsCount: studentSubjects.length
                    });
                }
            });

            return results
                .filter(r => validCategories.includes(r.category))
                .sort((a, b) => {
                    // 1순위: 일치하는 과목 수 (matchedSubjects.length)
                    const countDiff = b.matchedSubjects.length - a.matchedSubjects.length;
                    if (countDiff !== 0) return countDiff;
                    // 2순위: 기존 totalScore (가중치 기반 점수)
                    const scoreDiff = b.totalScore - a.totalScore;
                    if (scoreDiff !== 0) return scoreDiff;
                    // 3순위: 가나다 순 정렬 (점이 모두 0일 때)
                    return a.category.localeCompare(b.category, 'ko');
                })
                .slice(0, 15); // Increased from 10 to 15 to accommodate new sub-categories

        } catch (err) {
            console.error('Field Recommendation Error:', err);
            return [];
        }
    }

    /**
     * Helper: Fetch and Cache All Subjects
     */
    async getAllSubjects() {
        if (this._cachedSubjects) return this._cachedSubjects;

        const { data, error } = await this.client
            .from('subjects')
            .select('course_key, course_name');

        if (error) {
            console.error('Failed to cache subjects:', error);
            return [];
        }

        this._cachedSubjects = data;
        return data;
    }

    /**
     * Helper: Fetch and Cache Univ-Category Map
     */
    async getCategoryMap() {
        if (this._cachedCategoryMap) return this._cachedCategoryMap;

        // Fetch just ID and Category
        const { data, error } = await this.client
            .from('v_univ_dept_subjects')
            .select('univ_map_id, top_category');

        if (error) {
            console.error('Failed to cache category map:', error);
            return {};
        }

        this._cachedCategoryMap = data.reduce((acc, row) => {
            acc[row.univ_map_id] = row.top_category;
            return acc;
        }, {});

        return this._cachedCategoryMap;
    }
    /**
     * Stage 1-2: 학부(소계열) 조회
     * category: Stage 1-1에서 선택한 대계열 (top_category)
     */
    async getMajorsByCategory(category) {
        if (!this.client) return [];

        const { data, error } = await this.client
            .from('v_univ_dept_subjects') // Updated to use the correct view
            .select('canonical_major')
            .like('top_category', `${category}%`); // Match '인문계열(공공기획)' etc.

        if (error) {
            console.warn('DB Major Fetch Error:', error);
            return [];
        }

        // Return unique list
        const uniqueMajors = [...new Set(data.map(item => item.canonical_major))];
        return uniqueMajors.sort();
    }

    /**
     * Stage 1-2 (완성형): [NEW] 학부(소계열) 조회 및 과목 이반 세부 적합도 연산
     * category: Stage 1-1에서 선택한 대계열
     * studentSubjects: 학생이 이수한 과목 리스트 
     * Return: Array of { name: '컴퓨터공학과', percent: 85 } rank sorted
     */
    async getMajorsWithFitness(category, studentSubjects) {
        if (!this.client || !studentSubjects || studentSubjects.length === 0) {
            // 입력 과목이 없으면 기존처럼 이름만 반환 (percent = 0)
            const fallback = await this.getMajorsByCategory(category);
            return fallback.map(name => ({ name, percent: 0 }));
        }

        try {
            // 1. Fetch mapping table for the category
            const { data: majorMap, error } = await this.client
                .from('v_univ_dept_subjects')
                .select('canonical_major, core_subjects, recommended_subjects, raw_major_name')
                .like('top_category', `${category}%`);

            if (error || !majorMap) throw error || new Error('No data');

            // 2. Fetch & Resolve subject keys
            const allSubjectsData = await this.getAllSubjects();
            const normalize = (str) => str.replace(/\s+/g, '').replace(/I/g, '1').replace(/II/g, '2').toLowerCase();
            const studentKeys = new Set();

            studentSubjects.forEach(sName => {
                const sNorm = normalize(sName);
                const found = allSubjectsData.find(dbSub => {
                    const dbNorm = normalize(dbSub.course_name);
                    return dbNorm === sNorm || dbNorm.includes(sNorm) || sNorm.includes(dbNorm);
                });
                studentKeys.add(found ? found.course_key : sName);
            });

            // 3. Deduplicate Major Requirements
            const uniqueMajors = {};
            majorMap.forEach(m => {
                const major = m.canonical_major;
                if (!uniqueMajors[major]) {
                    uniqueMajors[major] = {
                        name: major,
                        core: new Set(m.core_subjects || []),
                        rec: new Set(m.recommended_subjects || []),
                        examples: new Set()
                    };
                } else {
                    (m.core_subjects || []).forEach(c => uniqueMajors[major].core.add(c));
                    (m.recommended_subjects || []).forEach(r => uniqueMajors[major].rec.add(r));
                }
                if (m.raw_major_name) uniqueMajors[major].examples.add(m.raw_major_name);
            });

            // 4. Calculate Match Score and Capped Percentage
            let majorResults = Object.values(uniqueMajors).map(m => {
                let maxScore = (m.core.size * 2) + (m.rec.size * 1);
                let stuScore = 0;

                m.core.forEach(sub => { if (studentKeys.has(sub)) stuScore += 2; });
                m.rec.forEach(sub => { if (studentKeys.has(sub)) stuScore += 1; });

                let percent = maxScore > 0 ? Math.floor((stuScore / maxScore) * 100) : 0;

                // 가독성을 위해 가장 짧은 이름의 학과를 예시로 추출
                let exampleList = Array.from(m.examples);
                exampleList.sort((a, b) => a.length - b.length);
                let bestExample = exampleList.length > 0 ? exampleList[0] : "";

                return {
                    name: m.name,
                    percent: Math.min(100, percent),
                    score: stuScore,
                    max: maxScore,
                    example: bestExample
                };
            });

            // 5. Sort by Percent(DESC) then by Raw Score(DESC)
            return majorResults.sort((a, b) => b.percent - a.percent || b.score - a.score);

        } catch (err) {
            console.warn('DB getMajorsWithFitness Error:', err);
            // Fallback
            const fallback = await this.getMajorsByCategory(category);
            return fallback.map(name => ({ name, percent: 0 }));
        }
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
                    school_id,
                    memo,
                    consulting_status
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

            // 3. Merge & include newly added Memo info
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

    // --- Counselor Login Methods ---

    async loginCounselor(email, password) {
        try {
            const { data, error } = await this.client
                .from('counselor')
                .select('*')
                .eq('email', email)
                .eq('password', password) // Note: In production, use hashed passwords!
                .single();

            if (error) throw error;
            if (!data) throw new Error('이메일 또는 비밀번호가 잘못되었습니다.');

            // Save session
            localStorage.setItem('counselor_session', JSON.stringify({
                id: data.id,
                name: data.name,
                email: data.email,
                permission: data.permission || 'counselor', // Default to counselor
                loginTime: new Date().toISOString()
            }));

            return { success: true, user: data };
        } catch (err) {
            console.error('Login failed:', err);
            return { success: false, message: err.message };
        }
    }

    async createCounselor(email, password, name) {
        try {
            // check current session permission
            const session = this.checkSession();
            if (!session || (session.permission !== 'master' && session.permission !== 1)) {
                throw new Error('권한이 없습니다 (Master Only).');
            }

            // Check if email already exists
            const { data: existing } = await this.client
                .from('counselor')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (existing) throw new Error('이미 존재하는 이메일입니다.');

            const { data, error } = await this.client
                .from('counselor')
                .insert([{
                    email,
                    password, // In production, hash this!
                    name,
                    permission: 2 // 2 = Counselor (1 = Master)
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (err) {
            console.error('Create Counselor failed:', err);
            return { success: false, message: err.message };
        }
    }

    /**
     * [NEW] 생기부 업로드 기능 (Supabase Storage)
     * @param {File} file - 업로드할 PDF 파일 객체
     * @param {string|number} studentId - 학생 고유 ID
     * @returns {string|null} - 업로드된 파일의 Public URL (또는 File Path)
     */
    async uploadStudentRecordPDF(file, studentId) {
        if (!this.client || !file || !studentId) return null;

        try {
            const timestamp = new Date().getTime();
            // path format: {student_id}/{timestamp}_{filename}
            const filePath = `${studentId}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

            const { data, error } = await this.client.storage
                .from('student_records')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.warn('Storage Upload Error (Bucket may be missing or permissions denied):', error);
                return null; // Don't crash the whole process just because history save failed
            }

            // Get Public URL
            const { data: publicUrlData } = this.client.storage
                .from('student_records')
                .getPublicUrl(filePath);

            return publicUrlData.publicUrl;
        } catch (err) {
            console.error('Failed to upload student record PDF:', err);
            return null; // Return null gracefully so analysis can still proceed without history if storage fails
        }
    }

    /**
     * 상담 이력(리포트) 저장 - 기존 로직 유지, url 저장 지원
     */
    async saveCounselingResult(studentId, resultData) {
        try {
            const session = this.checkSession();
            // If no session, we might skip saving to DB or save as anonymous? 
            // For now, let's assume session is required for DB save, or at least counselor_id is null.
            const counselorId = session ? session.id : null;

            if (!studentId) throw new Error('Student ID is required');

            // Insert into counseling table
            // Extract University Data Robustly
            // Extract University Data Robustly
            const univ = resultData.univ || {};

            // Check for existing active session to close
            const { data: activeSession } = await this.client
                .from('counseling')
                .select('id')
                .eq('student_id', studentId)
                .in('status', ['draft', 'in_progress'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const payload = {
                student_id: studentId,
                counselor_id: counselorId,
                desired_univ: univ.univ_name || '미정',
                desired_major: univ.raw_major_name || '미정',
                recommend_notes: [resultData.aiResult], // Store as array to match schema
                status: 'completed',
                completed_at: new Date().toISOString(),
                // Copy other fields if needed, e.g. from profile
                // Copy other fields if needed, e.g. from profile
                desired_category: univ.category || univ.canonical_major || '미정',
                rec_date: new Date().toISOString().split('T')[0] // Required field (Date only is cleaner)
            };

            let error; // Declare error variable

            if (activeSession) {
                // Update existing session to completed
                const { error: updateError } = await this.client
                    .from('counseling')
                    .update(payload)
                    .eq('id', activeSession.id);
                error = updateError;
                console.log(`✅ Updated Session ${activeSession.id} to Completed`);
            } else {
                // Insert new completed session
                const { error: insertError } = await this.client
                    .from('counseling')
                    .insert([payload]);
                error = insertError;
                console.log('✅ Created New Completed Session');
            }

            if (error) throw error;
            console.log('✅ Counseling Result Saved to DB');
            return true;
        } catch (err) {
            console.error('❌ Save Counseling Result Failed:', err);
            return false;
        }
    }

    logout() {
        localStorage.removeItem('counselor_session');
        window.location.href = 'login.html';
    }

    checkSession() {
        const session = localStorage.getItem('counselor_session');
        if (!session) return null;
        try {
            return JSON.parse(session);
        } catch (e) {
            this.logout();
            return null;
        }
    }

    // --- End Login Methods ---

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
            console.warn('School ID missing, attempting to use fallback school...');
            if (!profile.schoolName) {
                schoolId = await this.ensureSchool('기타 고등학교');
            }
        }

        const { data: existing, error: searchError } = await query.maybeSingle();

        if (searchError) {
            console.error('Student search error:', searchError);
            throw searchError;
        }

        const studentPayload = {
            student_name: profile.name,
            grade: grade,
            school_id: schoolId,
            memo: profile.memo || '', // [NEW] 상담 메모 동기화
            consulting_status: profile.consultingStatus || '보통' // [NEW] 상담 상태 동기화
        };

        if (existing) {
            console.log('Student found:', existing.id);
            // [NEW] Update memo and status even if student exists
            const { error: updateError } = await this.client
                .from('students')
                .update({
                    memo: studentPayload.memo,
                    consulting_status: studentPayload.consulting_status
                })
                .eq('id', existing.id);

            if (updateError) console.error('Failed to update student memo:', updateError);

            return existing.id;
        }

        // 2. Create new student
        const newMildangId = crypto.randomUUID();
        const newStudent = {
            ...studentPayload,
            mildang_id: newMildangId
        };

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
        try {
            const { data, error } = await this.client
                .from('common_info')
                .select('contents')
                .eq('type', type)
                .single();
            if (error) throw error;
            return data.contents;
        } catch (error) {
            console.error('Failed to fetch API key from common_info:', error);
            return null;
        }
    }
    /**
     * 특정 학과와 동일한 학과명을 가진 다른 대학들의 입시 결과 조회 (비교 분석용)
     * majorName: 대상 학과명 (raw_major_name)
     * excludeUnivName: 현재 보고 있는 대학명 (결과에서 제외)
     */
    async getSimilarMajorUniversities(majorName, excludeUnivName, canonicalMajor) {
        if (!this.client) return [];

        try {
            // Step 1: Find all univ_map_ids with the same major name
            let query = this.client
                .from('v_univ_dept_subjects')
                .select('univ_map_id, univ_name, raw_major_name, top_category, canonical_major');

            if (canonicalMajor) {
                query = query.eq('canonical_major', canonicalMajor);
            } else {
                query = query.eq('raw_major_name', majorName);
            }

            query = query.neq('univ_name', excludeUnivName) // Exclude current univ
                .limit(40); // Increased limit as we will filter further

            const { data: deptData, error: deptError } = await query;

            if (deptError) {
                console.warn('Similar Major Fetch Error (Step 1):', deptError);
                return [];
            }
            if (!deptData || deptData.length === 0) return [];

            // Get target top_category from the current university to ensure strict faculty matching
            const { data: currentUnivData } = await this.client
                .from('v_univ_dept_subjects')
                .select('top_category')
                .eq('univ_name', excludeUnivName)
                .eq('raw_major_name', majorName)
                .maybeSingle();

            const targetCategory = currentUnivData ? currentUnivData.top_category : null;

            // Filter out departments that do not match the target category
            const filteredDeptData = targetCategory 
                ? deptData.filter(d => d.top_category === targetCategory)
                : deptData;

            if (filteredDeptData.length === 0) return [];

            const mapIds = filteredDeptData.map(d => d.univ_map_id);

            // Step 2: Fetch stats for these IDs
            const { data: statsData, error: statsError } = await this.client
                .from('univ_dept_admission_stats')
                .select('univ_map_id, kor_math_sci_pct, eng_grade, admission_type')
                .in('univ_map_id', mapIds)
                .order('year', { ascending: false });

            if (statsError) {
                console.warn('Similar Major Stats Error (Step 2):', statsError);
                return [];
            }

            // [New] Name Similarity Helper (2-gram intersection)
            // Ensures "Physical Astronomy" matches "Physics" but not "Chemistry" if canonical is broad
            const checkNameSimilarity = (source, target) => {
                if (!source || !target) return false;
                const s = source.replace(/\s+/g, '');
                const t = target.replace(/\s+/g, '');

                // If one contains the other, it's a match
                if (s.includes(t) || t.includes(s)) return true;

                // 2-gram Check for Korean
                for (let i = 0; i < s.length - 1; i++) {
                    const gram = s.substring(i, i + 2);
                    if (t.includes(gram)) return true;
                }
                return false;
            };

            // Step 3: Merge & Filter
            const result = [];
            const processedIds = new Set();

            console.log(`[UnivComparison] Comparing '${majorName}' (Canonical: ${canonicalMajor || 'N/A'})`);

            for (const stat of statsData) {
                if (processedIds.has(stat.univ_map_id)) continue;

                const deptInfo = filteredDeptData.find(d => d.univ_map_id === stat.univ_map_id);
                if (deptInfo) {
                    // Filter: Must accept if canonical match IS strict, OR if names are similar
                    // If canonical is provided, we trust it mostly, but add a similarity check 
                    // to prevent "Natural Science" bucket returning "Biology" for "Physics" query.
                    // However, we must be careful not to filter out valid "Physics"(Source) vs "Applied Physics"(Target).

                    const isSimilar = checkNameSimilarity(deptInfo.raw_major_name, majorName);

                    // IF canonical_major is present, it *should* strongly imply similarity. 
                    // But if user complains, we enforce name similarity strictly.
                    // Let's enforce it: "Similar Major" implies name similarity usually.

                    if (isSimilar) {
                        result.push({
                            univName: deptInfo.univ_name,
                            majorName: deptInfo.raw_major_name,
                            category: deptInfo.top_category,
                            cutoff: stat.kor_math_sci_pct,
                            engGrade: stat.eng_grade,
                            admissionType: stat.admission_type
                        });
                        processedIds.add(stat.univ_map_id);
                    } else {
                        // console.log(`[Filter] Excluding ${deptInfo.raw_major_name} (Not similar to ${majorName})`);
                    }
                }
            }

            return result;
        } catch (err) {
            console.error('getSimilarMajorUniversities Exception:', err);
            return [];
        }
    }

    async getUnivMajorRecommendation(univName, majorName) {
        if (!this.client || !univName || !majorName) return null;

        try {
            const { data, error } = await this.client
                .from('v_univ_major_with_recommend')
                .select('*')
                .eq('univ_name', univName)
                .eq('raw_major_name', majorName)
                .maybeSingle();

            if (error) {
                console.error('Recommended Subjects Fetch Error:', error);
                return null;
            }
            return data;
        } catch (err) {
            console.error('getUnivMajorRecommendation Exception:', err);
            return null;
        }
    }
}

// Global Instance
const dbService = new DBService();
window.dbService = dbService;
