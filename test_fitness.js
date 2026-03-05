const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ytpycfenjtmvzjsvjwds.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cHljZmVuanRtdnpqc3Zqd2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzAxMTgsImV4cCI6MjA4NTI0NjExOH0.-k0r-Ct3mof9I0iQHOiCptgCkiiVXksgH2q3Be79620';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const personas = [
    { name: "1. 전형적인 공대생", subjects: ["국어", "수학1", "수학2", "미적분1", "기하", "물리학1", "물리학2", "화학1", "영어", "통합사회"] },
    { name: "2. 자연과학/의약학", subjects: ["국어", "수학1", "수학2", "미적분1", "생명과학1", "생명과학2", "화학1", "화학2", "영어", "통합사회"] },
    { name: "3. 일반적인 문과", subjects: ["국어", "대수", "확률과통계", "사회문화", "생활과윤리", "정치와법", "영어", "통합사회", "통합과학1"] },
    { name: "4. 소프트웨어 특화", subjects: ["국어", "대수", "미적분1", "물리학1", "정보", "프로그래밍", "영어", "통합사회", "수학1", "통합과학1"] },
    { name: "5. 상경계열 희망", subjects: ["국어", "대수", "미적분1", "확률과통계", "경제", "사회문화", "영어", "정치와법", "통합사회"] },
    { name: "6. 어문학/교육계열", subjects: ["국어", "심화국어", "영어", "심화영어", "대수", "확률과통계", "교육학", "윤리와사상", "통합사회", "세계사"] },
    { name: "7. 보건/간호계열", subjects: ["국어", "대수", "확률과통계", "생명과학1", "보건", "심리학", "영어", "사회문화", "화학1"] },
    { name: "8. 문이과 융합(AI)", subjects: ["국어", "대수", "확률과통계", "물리학1", "생명과학1", "사회문화", "데이터과학", "영어", "통합사회"] },
    { name: "9. 최소 이수형(성적 하위)", subjects: ["국어", "공통수학1", "영어", "통합사회1", "통합과학1"] },
    { name: "10. 예체능계열", subjects: ["국어", "공통수학1", "영어", "미술창작", "디자인일반", "통합사회1", "생활과윤리", "음악이해"] }
];

async function runSimulation() {
    console.log("=== DB 기반 세부 적합도 로직 페르소나 10종 검증 ===\n");

    const { data: allSubjectsData } = await supabase.from('subjects').select('course_name, course_key');
    const { data: majorMap } = await supabase.from('v_univ_dept_subjects').select('top_category, canonical_major, core_subjects, recommended_subjects');

    const normalize = (str) => str.replace(/\s+/g, '').replace(/I/g, '1').replace(/II/g, '2').toLowerCase();

    // Deduplicate major definitions (since there are multiple universities)
    const uniqueMajors = {};
    majorMap.forEach(m => {
        const key = `${m.top_category}-${m.canonical_major}`;
        if (!uniqueMajors[key]) {
            uniqueMajors[key] = {
                category: m.top_category,
                major: m.canonical_major,
                core: new Set(m.core_subjects || []),
                rec: new Set(m.recommended_subjects || [])
            };
        } else {
            (m.core_subjects || []).forEach(c => uniqueMajors[key].core.add(c));
            (m.recommended_subjects || []).forEach(r => uniqueMajors[key].rec.add(r));
        }
    });

    for (const p of personas) {
        console.log(`\n👨‍🎓 [${p.name}] 수강과목: ${p.subjects.join(', ')} (총 ${p.subjects.length}개)`);

        const studentKeys = new Set();
        p.subjects.forEach(sName => {
            const sNorm = normalize(sName);
            const found = allSubjectsData.find(dbSub => {
                const dbNorm = normalize(dbSub.course_name);
                return dbNorm === sNorm || dbNorm.includes(sNorm) || sNorm.includes(dbNorm);
            });
            // If mapping exists use it, else fallback to name itself
            studentKeys.add(found ? found.course_key : sName);
        });

        // 1. Stage 1-1 계산
        const categoryScores = {};
        Object.values(uniqueMajors).forEach(m => {
            if (!categoryScores[m.category]) {
                categoryScores[m.category] = { req: new Set(), matched: new Set(), score: 0 };
            }
            m.core.forEach(sub => {
                categoryScores[m.category].req.add(sub);
                if (studentKeys.has(sub)) {
                    categoryScores[m.category].matched.add(sub);
                    categoryScores[m.category].score += 2;
                }
            });
            m.rec.forEach(sub => {
                categoryScores[m.category].req.add(sub);
                if (studentKeys.has(sub)) {
                    categoryScores[m.category].matched.add(sub);
                    categoryScores[m.category].score += 1;
                }
            });
        });

        // 결과는 가장 점수가 높은 카테고리
        const sortedCategories = Object.entries(categoryScores)
            .sort((a, b) => b[1].score - a[1].score)
            .filter(c => c[1].score > 0);

        if (sortedCategories.length === 0) {
            console.log("  -> (추천 계열 매칭 없음)");
            continue;
        }

        const topCatName = sortedCategories[0][0];
        const topCatData = sortedCategories[0][1];
        console.log(`  🏆 [예상 1순위 계열] ${topCatName}`);
        console.log(`     - UI 수량 텍스트 (Stage 1-1): ${topCatData.matched.size} / ${p.subjects.length} 개 (본인 과목 중 해당 계열 관련 과목 수)`);

        // 2. Stage 1-2 계산 (해당 카테고리 내 학부별 적합도)
        console.log(`  📊 [해당 계열 세부 학부 적합도 TOP 3]`);
        const catMajors = Object.values(uniqueMajors).filter(m => m.category === topCatName);

        let majorResults = catMajors.map(m => {
            let maxScore = (m.core.size * 2) + (m.rec.size * 1);
            let stuScore = 0;
            m.core.forEach(sub => { if (studentKeys.has(sub)) stuScore += 2; });
            m.rec.forEach(sub => { if (studentKeys.has(sub)) stuScore += 1; });

            let percent = maxScore > 0 ? Math.floor((stuScore / maxScore) * 100) : 0;
            return { name: m.major, percent: Math.min(100, percent), score: stuScore, max: maxScore };
        });

        majorResults.sort((a, b) => b.percent - a.percent || b.score - a.score);

        majorResults.slice(0, 3).forEach((m, idx) => {
            console.log(`     ${idx + 1}위: [${m.name}] 적합도 ${m.percent}% (획득: ${m.score}점 / 만점: ${m.max}점)`);
        });
    }
}

runSimulation().catch(console.error);
