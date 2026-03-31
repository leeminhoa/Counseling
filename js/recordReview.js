/**
 * recordReview.js
 * Stage 3: 생기부 첨삭 및 과거 보강 컨설팅 기능
 * PDF.js를 활용하여 업로드된 문서를 파싱하고, AI가 분석 결과를 제공합니다.
 */

let selectedFile = null;
let parsedText = '';

async function renderRecordReview(container) {
    const profile = dataManager.getProfile();
    const selectedUnivId = stage1State.selectedUnivId || (profile.lastSelectedUniv ? profile.lastSelectedUniv.id : null);
    
    // 이전에 분석된 데이터가 있으면 바로 보여줌 (현재 세션)
    const savedResults = dataManager.getData().consultingResults || [];
    const existingResult = savedResults.reverse().find(r => r.type === 'recordReview' && r.univ && String(r.univ.id) === String(selectedUnivId));

    container.innerHTML = `
        <div class="stage3-wrapper" style="max-width: 900px; margin: 0 auto; padding: 2rem 0;">
            <div class="header-section" style="margin-bottom: 2rem;">
                <h2 style="font-size: 1.8rem; font-weight: 800; color: #0F172A; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-file-signature" style="color: var(--primary-color);"></i> 생기부 첨삭 컨설팅 (과거-현재 진단)
                </h2>
                <p style="color: #64748B; font-size: 0.95rem;">학생의 기존 생활기록부를 분석하여, 현재 지원하려는 학과(전공)와의 적합성 및 보강 가이드를 제공합니다.</p>
            </div>

            <!-- Loading View -->
            <div id="aiLoadingReview" class="ai-loading-box" style="display: none; background: white; border-radius: 12px; padding: 3rem; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div class="spinner-premium"></div>
                <div class="loading-steps" id="loadingStepsReview" style="margin-top: 2rem;">
                    <p class="loading-step-text" style="color: #334155; font-weight: 600; font-size: 1.1rem;">생기부 데이터를 파싱하고 있습니다...</p>
                </div>
            </div>

            <!-- Result View -->
            <div id="aiResultReview" style="display: ${existingResult ? 'block' : 'none'};"></div>

            <!-- Upload View -->
            <div id="aiInitialReview" class="card" style="display: ${existingResult ? 'none' : 'block'}; padding: 2.5rem;">
                ${selectedUnivId ? `
                    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <span style="display: block; font-size: 0.8rem; font-weight: 700; color: #64748B; margin-bottom: 0.3rem;">선택된 목표 대학/학과</span>
                            <div style="font-size: 1.2rem; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fa-solid fa-building-columns" style="color: #3B82F6;"></i> ${profile.lastSelectedUniv ? profile.lastSelectedUniv.univ_name : '로딩 중...'} <span style="color: #94A3B8; font-weight: 400;">|</span> ${profile.lastSelectedUniv ? profile.lastSelectedUniv.raw_major_name : ''}
                            </div>
                        </div>
                        <button class="btn-secondary btn-sm" onclick="handleTabChange('stage1_1')">변경하기</button>
                    </div>

                    <h3 style="font-size: 1.15rem; font-weight: 700; color: #1E293B; margin-bottom: 1rem;">생기부 원본 문서 업로드 (PDF)</h3>
                    
                    <div id="uploadArea" style="border: 2px dashed #CBD5E1; border-radius: 12px; padding: 3rem 2rem; text-align: center; background: #F8FAFC; transition: all 0.2s; cursor: pointer; position: relative; margin-bottom: 2rem;">
                        <input type="file" id="fileInput" accept="application/pdf" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; opacity: 0; cursor: pointer;">
                        
                        <div id="uploadStateIdle">
                            <div style="font-size: 3rem; color: #94A3B8; margin-bottom: 1rem;">
                                <i class="fa-solid fa-file-arrow-up"></i>
                            </div>
                            <h4 style="font-size: 1.2rem; font-weight: 700; color: #334155; margin-bottom: 0.5rem;">클릭 또는 파일을 여기로 드래그하세요</h4>
                            <p style="color: #64748B; font-size: 0.9rem;">학생부 종합 기록 PDF 파일만 업로드 가능합니다 (최대 50MB)</p>
                        </div>

                        <div id="uploadStateFilled" style="display: none;">
                            <div style="font-size: 3rem; color: #10B981; margin-bottom: 1rem;">
                                <i class="fa-solid fa-file-pdf"></i>
                            </div>
                            <h4 id="fileNameDisplay" style="font-size: 1.2rem; font-weight: 700; color: #10B981; margin-bottom: 0.5rem;">filename.pdf</h4>
                            <p id="fileSizeDisplay" style="color: #64748B; font-size: 0.9rem;">2.4 MB</p>
                            <button type="button" class="btn-secondary btn-sm" style="margin-top: 1rem;" onclick="resetFileInput(event)">다른 파일 선택하기</button>
                        </div>
                    </div>

                    <div style="text-align: center;">
                        <button id="analyzeRecordBtn" class="btn-primary btn-lg" style="width: 100%; max-width: 300px; opacity: 0.5; pointer-events: none;" onclick="startRecordReview()">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> 생기부 진단 및 컨설팅 시작
                        </button>
                    </div>
                ` : `
                    <div style="text-align: center; padding: 3rem 0;">
                        <div style="font-size: 3rem; color: #CBD5E1; margin-bottom: 1rem;"><i class="fa-solid fa-building-columns"></i></div>
                        <h3 style="font-size: 1.2rem; font-weight: 700; color: #475569; margin-bottom: 1rem;">목표 대학 및 학과가 선택되지 않았습니다.</h3>
                        <p style="color: #94A3B8; margin-bottom: 2rem;">정확한 생기부 진단을 위해 먼저 목표하는 학과를 선택해주세요.</p>
                        <button class="btn-primary" onclick="handleTabChange('stage1_1')">대학/학과 선택하러 가기</button>
                    </div>
                `}
            </div>
        </div>
    `;

    if (existingResult) {
        displayReviewResult(existingResult.aiResult, document.getElementById('aiResultReview'));
    }

    if (selectedUnivId) {
        setupFileUploadListeners();
    }
}

function setupFileUploadListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    // Drag events for styling
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary-color)';
            uploadArea.style.background = '#EFF6FF';
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#CBD5E1';
            uploadArea.style.background = '#F8FAFC';
        });
    });

    // Handle file drop
    uploadArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length) handleFileSelection(files[0]);
    });

    // Handle file input click
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFileSelection(e.target.files[0]);
    });
}

function resetFileInput(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    selectedFile = null;
    parsedText = '';
    
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadStateIdle').style.display = 'block';
    document.getElementById('uploadStateFilled').style.display = 'none';
    
    const analyzeBtn = document.getElementById('analyzeRecordBtn');
    analyzeBtn.style.opacity = '0.5';
    analyzeBtn.style.pointerEvents = 'none';
}

function handleFileSelection(file) {
    if (file.type !== 'application/pdf') {
        showCustomAlert('PDF 파일만 업로드 가능합니다.', '오류');
        resetFileInput();
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        showCustomAlert('파일 크기는 50MB를 초과할 수 없습니다.', '오류');
        resetFileInput();
        return;
    }

    selectedFile = file;

    // Update UI
    document.getElementById('uploadStateIdle').style.display = 'none';
    document.getElementById('uploadStateFilled').style.display = 'block';
    document.getElementById('fileNameDisplay').textContent = file.name;
    document.getElementById('fileSizeDisplay').textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    // Enable button
    const analyzeBtn = document.getElementById('analyzeRecordBtn');
    analyzeBtn.style.opacity = '1';
    analyzeBtn.style.pointerEvents = 'auto';
}

async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result);
                // pdfjsLib is loaded globally via CDN in index.html
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';
                
                // Read maximum 10 pages to avoid token limits
                const maxPages = Math.min(pdf.numPages, 10);
                
                for (let i = 1; i <= maxPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                
                resolve(fullText);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error("File read failed"));
        reader.readAsArrayBuffer(file);
    });
}

async function startRecordReview() {
    if (!selectedFile) return;

    const initialView = document.getElementById('aiInitialReview');
    const loadingView = document.getElementById('aiLoadingReview');
    const resultView = document.getElementById('aiResultReview');
    const stepsContainer = document.getElementById('loadingStepsReview');

    initialView.style.display = 'none';
    loadingView.style.display = 'block';

    try {
        // Step 1: Parse PDF
        let useFileApi = false;
        if (stepsContainer) stepsContainer.innerHTML = '<p class="loading-step-text">생기부 문서에서 텍스트를 추출하고 있습니다...</p>';
        try {
            parsedText = await extractTextFromPDF(selectedFile);
            if (!parsedText || parsedText.trim().length < 50) {
                console.log("Extracted text is too short. Assuming scanned PDF.");
                useFileApi = true;
            } else if (parsedText.length > 15000) {
                // Limit parsed text length to avoid token explosion (approx 15000 chars)
                parsedText = parsedText.substring(0, 15000) + '... (이하 생략)';
            }
        } catch (e) {
            console.warn("PDF extraction failed, falling back to Gemini OCR", e);
            useFileApi = true;
        }

        const profile = dataManager.getProfile();
        const univData = profile.lastSelectedUniv;

        // Step 1.5: Upload to Gemini API for OCR if needed
        let geminiFile = null;
        if (useFileApi) {
            geminiFile = await aiService.uploadAndWaitGeminiFile(selectedFile, (msg) => {
                if (stepsContainer) stepsContainer.innerHTML = `<p class="loading-step-text">${msg}</p>`;
            });
        }

        // Step 2: Supabase Storage Upload (History keeping)
        let pdfUrl = null;
        const settings = dataManager.getData().appSettings || {};
        if (window.dbService && settings.supabaseUrl) {
            if (stepsContainer) stepsContainer.innerHTML = '<p class="loading-step-text">생기부를 클라우드에 안전하게 보관 중입니다...</p>';
            try {
                // Ensure student exists and get ID
                const studentId = await dbService.upsertStudent(profile);
                if (studentId) {
                    pdfUrl = await dbService.uploadStudentRecordPDF(selectedFile, studentId);
                    console.log('PDF Uploaded to Supabase:', pdfUrl);
                }
            } catch (err) {
                console.warn('Failed to upload PDF history to Supabase:', err);
                // Continue with analysis even if storage fails
            }
        }

        // Step 3: AI Analysis
        if (stepsContainer) stepsContainer.innerHTML = '<p class="loading-step-text">생기부 내용과 목표 전공과의 일치도를 분석 중입니다...</p>';
        
        const context = {
            student: {
                completedSubjects: profile.subjects || []
            },
            target: {
                univ: univData.univ_name,
                major: univData.raw_major_name
            }
        };

        const result = await aiService.analyzeStudentRecord(context, parsedText, geminiFile);
        if (pdfUrl) {
            result.pdfUrl = pdfUrl; // Attach URL to result so it gets saved to DB
        }

        // Step 4: Render Result
        loadingView.style.display = 'none';
        displayReviewResult(result, resultView);
        resultView.style.display = 'block';

        // Save Result
        dataManager.saveConsultingResult({
            type: 'recordReview',
            univ: univData,
            aiResult: result
        });

    } catch (error) {
        console.error('Record Review Failed:', error);
        showCustomAlert('분석 실패: ' + (error.message || '알 수 없는 오류'));
        loadingView.style.display = 'none';
        initialView.style.display = 'block';
    }
}

function displayReviewResult(data, container) {
    if (!data || !data.diagnosis) {
        container.innerHTML = '<div class="card" style="padding: 2rem; text-align:center; color: #EF4444;">분석된 결과 포맷이 올바르지 않습니다. 다시 시도해주세요.</div>';
        return;
    }

    const { diagnosis, analysis, improvement_guide } = data;
    const score = diagnosis.match_score || 0;
    
    // Determine Color based on score
    let scoreColor = '#F59E0B'; // yellow
    let scoreText = '적정 수준';
    if (score >= 80) { scoreColor = '#10B981'; scoreText = '매우 우수'; }
    else if (score < 60) { scoreColor = '#EF4444'; scoreText = '보완 필요'; }

    container.innerHTML = `
        <div class="report-wrapper" id="pdf-area-review" style="font-family: 'Pretendard', sans-serif;">
            <!-- Floating Actions -->
            <div class="report-actions no-pdf" style="display:flex; justify-content: flex-end; gap: 0.5rem; margin-bottom: 1rem;">
                ${data.pdfUrl ? `
                <a href="${data.pdfUrl}" target="_blank" class="btn-secondary btn-sm" style="color: #3B82F6; border-color: #3B82F6; text-decoration: none; display: flex; align-items: center; gap: 0.4rem;">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> 원본 보기
                </a>
                ` : ''}
                <!-- Re-analyze button -->
                <button class="btn-secondary btn-sm" onclick="resetRecordReview(event)" style="color: #64748B;">
                    <i class="fa-solid fa-upload"></i> 다른 파일 등록
                </button>
                 <button class="btn-secondary btn-sm" onclick="downloadReviewImage()">
                    <i class="fa-solid fa-image"></i> 이미지 저장
                </button>
            </div>

            <!-- Page 1: Dashboard -->
            <div class="report-page" style="background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); padding: 2.5rem; margin-bottom: 2rem;">
                <div style="border-bottom: 2px solid #1E293B; padding-bottom: 1.5rem; margin-bottom: 2rem;">
                    <span style="background: #F3E8FF; color: #7E22CE; font-weight:700; font-size: 0.85rem; padding: 4px 12px; border-radius: 20px;">생기부 과거 진단 리포트</span>
                    <h1 style="font-size: 2.2rem; font-weight: 800; color: #0F172A; margin-top: 0.8rem; margin-bottom: 0px;">
                        전공 적합성 분석 결과
                    </h1>
                </div>

                <!-- Score Gauge Dashboard -->
                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 2rem; display: flex; align-items: center; gap: 3rem; margin-bottom: 2rem;">
                    
                    <!-- Circular Progress (Simple CSS Mock) -->
                    <div style="position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; background: conic-gradient(${scoreColor} ${score}%, #E2E8F0 ${score}% 100%); border-radius: 50%;">
                        <div style="position: absolute; width: 100px; height: 100px; background: #F8FAFC; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <span style="font-size: 2rem; font-weight: 800; color: #0F172A; line-height: 1;">${score}</span>
                            <span style="font-size: 0.8rem; color: #64748B; font-weight: 600;">점</span>
                        </div>
                    </div>

                    <div style="flex-grow: 1;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <h3 style="font-size: 1.4rem; font-weight: 800; color: #0F172A; margin: 0;">종합 전공 적합도</h3>
                            <span style="background: ${scoreColor}20; color: ${scoreColor}; font-weight: 700; font-size: 0.85rem; padding: 4px 10px; border-radius: 20px;">${scoreText}</span>
                        </div>
                        <p style="color: #334155; font-size: 1rem; line-height: 1.6; margin: 0; margin-bottom: 1rem;">
                            ${diagnosis.overall_evaluation}
                        </p>
                        ${diagnosis.academic_feasibility ? `
                        <div style="background: #EEF2FF; border-left: 4px solid #6366F1; padding: 1rem; border-radius: 0 8px 8px 0;">
                            <h4 style="font-size: 0.95rem; font-weight: 700; color: #4338CA; margin-bottom: 0.3rem;"><i class="fa-solid fa-chart-line"></i> 교과 성적 기반 정량적 진단</h4>
                            <p style="color: #3730A3; font-size: 0.95rem; margin: 0; line-height: 1.5;">${diagnosis.academic_feasibility}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- [NEW] Academic Performance Analysis -->
                ${(analysis.grade_trend || analysis.elective_subject_evaluation || analysis.weak_subject_strategy) ? `
                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-book-open-reader" style="color: #3B82F6;"></i> 교과 학업 성취 및 선택 과목 평가
                    </h3>
                    
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        ${analysis.grade_trend ? `
                        <div style="background: white; border: 1px solid #E2E8F0; border-radius: 8px; padding: 1rem;">
                            <div style="font-weight: 700; color: #1E293B; font-size: 0.95rem; margin-bottom: 0.6rem;"><i class="fa-solid fa-arrow-trend-up" style="color: #10B981; margin-right:4px;"></i> 성적 추이 분석 및 스토리텔링</div>
                            
                            ${typeof analysis.grade_trend === 'object' ? `
                                <div style="background: #F8FAFC; border: 1px dashed #CBD5E1; padding: 0.8rem 1rem; border-radius: 6px; font-size: 0.9rem; margin-bottom: 0.8rem;">
                                    <div style="font-weight: 700; color: #475569; margin-bottom: 0.3rem;"><i class="fa-regular fa-folder-open" style="margin-right:2px;"></i> 학년별 주요 성적 요약</div>
                                    <div style="color: #334155; line-height: 1.5;">${analysis.grade_trend.semester_grades}</div>
                                </div>
                                <div style="color: #475569; font-size: 0.95rem; line-height: 1.6; padding-left: 2px;">
                                    ${analysis.grade_trend.storytelling}
                                </div>
                            ` : `
                                <div style="color: #475569; font-size: 0.95rem; line-height: 1.6;">${analysis.grade_trend}</div>
                            `}
                        </div>
                        ` : ''}

                        ${analysis.elective_subject_evaluation ? `
                        <div style="background: white; border: 1px solid #E2E8F0; border-radius: 8px; padding: 1rem;">
                            <div style="font-weight: 700; color: #1E293B; font-size: 0.95rem; margin-bottom: 0.4rem;"><i class="fa-solid fa-list-check" style="color: #8B5CF6; margin-right:4px;"></i> 진로/심화 선택 과목 이수 평가</div>
                            <div style="color: #475569; font-size: 0.95rem; line-height: 1.6;">${analysis.elective_subject_evaluation}</div>
                        </div>
                        ` : ''}

                        ${analysis.weak_subject_strategy ? `
                        <div style="background: white; border: 1px solid #FECACA; border-radius: 8px; padding: 1rem; border-left: 4px solid #EF4444;">
                            <div style="font-weight: 700; color: #B91C1C; font-size: 0.95rem; margin-bottom: 0.4rem;"><i class="fa-solid fa-shield-halved" style="margin-right:4px;"></i> 취약 과목 세특 방어 전략</div>
                            <div style="color: #991B1B; font-size: 0.95rem; line-height: 1.6;">${analysis.weak_subject_strategy}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- Strengths & Weaknesses -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 0.5rem;">
                    <!-- Strengths -->
                    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 1.5rem;">
                        <h4 style="font-size: 1.15rem; font-weight: 800; color: #166534; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fa-solid fa-thumbs-up"></i> 우수한 점 (Strengths)
                        </h4>
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            ${(analysis.strengths || []).map(item => `
                                <div>
                                    <div style="font-weight: 700; color: #15803D; font-size: 0.95rem; margin-bottom: 0.3rem;">• ${item.point}</div>
                                    <div style="color: #166534; font-size: 0.9rem; line-height: 1.5; padding-left: 0.8rem;">${item.detail}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Weaknesses -->
                    <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 1.5rem;">
                        <h4 style="font-size: 1.15rem; font-weight: 800; color: #991B1B; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fa-solid fa-triangle-exclamation"></i> 아쉬운 점 (Weaknesses)
                        </h4>
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            ${(analysis.weaknesses || []).map(item => `
                                <div>
                                    <div style="font-weight: 700; color: #B91C1C; font-size: 0.95rem; margin-bottom: 0.3rem;">• ${item.point}</div>
                                    <div style="color: #991B1B; font-size: 0.9rem; line-height: 1.5; padding-left: 0.8rem;">${item.detail}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Page 2: Action Plan -->
            <div class="report-page" style="background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); padding: 2.5rem; margin-bottom: 2rem;">
                <h2 style="font-size: 1.5rem; font-weight: 800; color: #0F172A; margin-bottom: 1.5rem; border-left: 5px solid #3B82F6; padding-left: 1rem;">
                    다음 학기 보강 플랜 (Next Steps)
                </h2>
                
                <p style="color: #64748B; margin-bottom: 1.5rem;">아쉬운 점을 메우고 전공 적합성을 끌어올리기 위해 아래 활동들을 다가오는 학기에 반드시 포함시켜보세요.</p>

                ${(() => {
                    const isLegacy = Array.isArray(improvement_guide);
                    const activities = isLegacy ? (improvement_guide || []) : (improvement_guide?.activities || []);
                    const books = isLegacy ? [] : (improvement_guide?.recommended_books || []);
                    const concepts = isLegacy ? [] : (improvement_guide?.key_concepts || []);
                    
                    if (!activities.length && !books.length && !concepts.length) return '';
                    
                    let html = '<div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2.5rem;">';
                    
                    // 1. Activities
                    if (activities.length > 0) {
                        html += activities.map((guide, idx) => `
                            <div style="background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #E2E8F0; display: flex; gap: 1.5rem; align-items: flex-start;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: #EFF6FF; color: #3B82F6; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem; flex-shrink: 0;">
                                    ${idx + 1}
                                </div>
                                <div style="flex-grow: 1;">
                                    <div style="font-weight: 700; color: #1E293B; font-size: 1.1rem; margin-bottom: 0.5rem;">
                                        <span style="color: #3B82F6;">[${guide.subject_or_activity}]</span> 연계 활동
                                    </div>
                                    <div style="font-size: 0.95rem; color: #475569; line-height: 1.6; background: #F8FAFC; padding: 1.2rem; border-radius: 8px;">
                                        ${guide.action_details ? `
                                            <div style="display:flex; flex-direction:column; gap:0.8rem;">
                                                <div style="display:flex; gap:0.6rem; align-items: flex-start;">
                                                    <span style="background:#DBEAFE; color:#1E3A8A; font-weight:700; padding:3px 8px; border-radius:4px; font-size:0.8rem; white-space:nowrap; margin-top: 2px;">탐구 목표</span>
                                                    <span>${guide.action_details.goal}</span>
                                                </div>
                                                <div style="display:flex; gap:0.6rem; align-items: flex-start;">
                                                    <span style="background:#FCE7F3; color:#9D174D; font-weight:700; padding:3px 8px; border-radius:4px; font-size:0.8rem; white-space:nowrap; margin-top: 2px;">활용 매체</span>
                                                    <span>${guide.action_details.media}</span>
                                                </div>
                                                <div style="display:flex; gap:0.6rem; align-items: flex-start;">
                                                    <span style="background:#FEF3C7; color:#92400E; font-weight:700; padding:3px 8px; border-radius:4px; font-size:0.8rem; white-space:nowrap; margin-top: 2px;">방법론</span>
                                                    <span style="word-break: keep-all;">${guide.action_details.method}</span>
                                                </div>
                                                <div style="display:flex; gap:0.6rem; align-items: flex-start;">
                                                    <span style="background:#D1FAE5; color:#065F46; font-weight:700; padding:3px 8px; border-radius:4px; font-size:0.8rem; white-space:nowrap; margin-top: 2px;">기대 결과</span>
                                                    <span>${guide.action_details.result}</span>
                                                </div>
                                            </div>
                                        ` : `
                                            <div>${guide.suggested_action}</div>
                                        `}
                                    </div>
                                </div>
                            </div>
                        `).join('');
                    }
                    html += '</div>';

                    // 2. Recommended Books
                    if (books.length > 0) {
                        html += `
                        <div style="margin-bottom: 2.5rem;">
                            <h4 style="font-size: 1.15rem; font-weight: 800; color: #1E293B; margin-bottom: 1rem; display: flex; align-items: center;"><i class="fa-solid fa-book" style="color: #8B5CF6; margin-right: 0.5rem;"></i> 전공 심화 탐구 추천 도서</h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
                                ${books.map(b => `
                                    <div style="background: white; border: 1px solid #E2E8F0; padding: 1.5rem; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 0.8rem;">
                                        <div style="font-weight: 800; color: #4C1D95; font-size: 1.1rem; line-height: 1.4;"><i class="fa-solid fa-bookmark" style="color:#C4B5FD; margin-right:6px;"></i>${b.title}</div>
                                        <div style="font-size: 0.95rem; color: #475569; line-height: 1.6; background: #F8FAFC; padding: 1rem; border-radius: 8px; flex-grow: 1;">${b.reason}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        `;
                    }

                    // 3. Key Concepts
                    if (concepts.length > 0) {
                        html += `
                        <div style="margin-bottom: 1rem;">
                            <h4 style="font-size: 1.15rem; font-weight: 800; color: #1E293B; margin-bottom: 1rem; display: flex; align-items: center;"><i class="fa-solid fa-lightbulb" style="color: #F59E0B; margin-right: 0.5rem;"></i> 역전의 무기 - 전공 심화 키워드</h4>
                            <div style="display: flex; flex-direction: column; gap: 1rem;">
                                ${concepts.map(c => `
                                    <div style="background: white; border: 1px solid #E2E8F0; padding: 1.2rem 1.5rem; border-radius: 12px; display: flex; gap: 1.5rem; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                                        <span style="background: #FEF3C7; color: #B45309; font-weight: 800; padding: 6px 14px; border-radius: 8px; font-size: 1.05rem; white-space: nowrap;">${c.concept}</span>
                                        <div style="font-size: 0.95rem; color: #475569; line-height: 1.6; flex-grow: 1; border-left: 3px solid #FDE68A; padding-left: 1rem;">${c.explanation}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        `;
                    }
                    
                    return html;
                })()}


            </div>

        </div>
    `;
}

async function resetRecordReview() {
    showCustomConfirm(
        '새로운 생기부를 업로드하여 다시 분석하시겠습니까?\n이전 분석 결과는 덮어씌워집니다.',
        () => {
            const profile = dataManager.getProfile();
            const selectedUnivId = (typeof stage1State !== 'undefined' ? stage1State.selectedUnivId : null) || (profile.lastSelectedUniv ? profile.lastSelectedUniv.id : null);
            const data = dataManager.getData();

            data.consultingResults = data.consultingResults.filter(r => !(r.type === 'recordReview' && r.univ && String(r.univ.id) === String(selectedUnivId)));
            dataManager.saveData(data);

            const content = document.getElementById('contentContainer');
            resetFileInput(); // Clear previous file state
            renderRecordReview(content);
        }
    );
}

function downloadReviewImage() {
    const element = document.getElementById('pdf-area-review');
    const profile = dataManager.getProfile();
    const fileName = `${profile.name || '학생'}_생기부진단.png`;

    const actions = element.querySelectorAll('.no-pdf');
    actions.forEach(el => el.style.display = 'none');

    // [NEW] 캡처용 헤더 (표지) 동적 추가 - 옵션 A안 시안
    const coverHeader = document.createElement('div');
    const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    coverHeader.innerHTML = `
        <div style="background: white; border-radius: 12px 12px 0 0; overflow: hidden; margin-bottom: 2rem; border-bottom: 2px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <!-- Large Promotional Banner (학생 공유용) -->
            <img src="assets/header_banner.png" style="width: 100%; display: block;" onerror="this.style.display='none'" alt="밀당PT 배너">
            
            <!-- Professional Report Title Bar -->
            <div style="background: #0F172A; color: white; padding: 2.5rem 2.5rem; border-top: 5px solid #F59E0B; display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="font-size: 0.85rem; font-weight: 700; color: #FCD34D; letter-spacing: 2px;">MILDANG PT EDUCATION CONSULTING</div>
                <h1 style="font-size: 2.2rem; font-weight: 800; margin: 0 0 1rem 0; line-height: 1.3;">대입 맞춤형 AI 종합 컨설팅 리포트</h1>
                <div style="display: flex; gap: 3rem; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 1.5rem; margin-top: 0.5rem;">
                    <div>
                        <span style="font-size: 0.8rem; color: #94A3B8; display: block; margin-bottom: 0.2rem;">대상 학생</span>
                        <span style="font-size: 1.15rem; font-weight: 700;">${profile.name || '학생명 미상'} <span style="font-size:0.9rem; font-weight:400; color:#94A3B8">(${profile.schoolName || '고등학교'})</span></span>
                    </div>
                    <div>
                        <span style="font-size: 0.8rem; color: #94A3B8; display: block; margin-bottom: 0.2rem;">리포트 분과</span>
                        <span style="font-size: 1.15rem; font-weight: 700;">생기부 첨삭 (진단)</span>
                    </div>
                    <div>
                        <span style="font-size: 0.8rem; color: #94A3B8; display: block; margin-bottom: 0.2rem;">분석 일자</span>
                        <span style="font-size: 1.15rem; font-weight: 700;">${todayStr}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    element.insertBefore(coverHeader, element.firstChild);

    // 캡처용 푸터 이미지 동적 추가
    const footer = document.createElement('img');
    footer.src = 'assets/footer_logo.png';
    footer.style.width = '100%';
    footer.style.display = 'block';
    footer.style.marginTop = '2rem';
    footer.style.borderRadius = '0 0 12px 12px';
    element.appendChild(footer);

    footer.onload = () => {
        // Wait a brief moment to ensure UI updates before capture
        setTimeout(() => {
            html2canvas(element, { scale: 2, useCORS: true, logging: false }).then(canvas => {
                const link = document.createElement('a');
                link.download = fileName;
                link.href = canvas.toDataURL('image/png');
                link.click();
                actions.forEach(el => el.style.display = '');
                if (footer && footer.parentNode) footer.parentNode.removeChild(footer);
                if (coverHeader && coverHeader.parentNode) coverHeader.parentNode.removeChild(coverHeader);
            }).catch(err => {
                console.error('Save failed:', err);
                actions.forEach(el => el.style.display = '');
                if (footer && footer.parentNode) footer.parentNode.removeChild(footer);
                if (coverHeader && coverHeader.parentNode) coverHeader.parentNode.removeChild(coverHeader);
                alert('이미지 생성 중 오류가 발생했습니다.');
            });
        }, 100);
    };

    footer.onerror = () => {
        if (footer && footer.parentNode) footer.parentNode.removeChild(footer);
        actions.forEach(el => el.style.display = '');
        alert('푸터 이미지를 불러오지 못했습니다. 다시 시도해주세요.');
    }
}
