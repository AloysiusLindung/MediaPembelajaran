/**
 * scripts/quiz.js
 * Controller Generik untuk Kuis Multi-Choice (MC) Dinamis.
 * - Memuat soal dari cms.quizzes[KEY] berdasarkan parameter URL.
 * - Menangani rendering, submission, scoring, dan penyimpanan skor/progres.
 * Membutuhkan: auth.js, app.js (loadCMSContent, loadActiveStudentData, updateModuleScore).
 */

const POINTS_PER_QUESTION = 10;
const PASSING_GRADE = 75; // Nilai kelulusan minimum dalam persen

let currentQuizKey = '';
let currentModuleId = '';
let quizQuestions = [];
let quizSubmitted = false;

// =======================================================
// I. FUNGSI UTAMA
// =======================================================

/**
 * Mendapatkan parameter URL untuk menentukan kuis yang akan dimuat.
 * Memuat soal, dan memulai rendering.
 */
function initQuizController() {
    // 1. Dapatkan Kunci Kuis dari URL
    const params = new URLSearchParams(window.location.search);
    currentQuizKey = params.get('key');
    currentModuleId = params.get('module') || 'default';
    
    if (!currentQuizKey || !currentModuleId) {
        displayError("Parameter kuis tidak lengkap. Pastikan URL mengandung parameter 'key' dan 'module'.");
        return;
    }
    
    // Pastikan user adalah murid yang terautentikasi
    if (typeof window.checkAuthentication === 'function') {
        const session = window.checkAuthentication('murid');
        if (!session) return;
    }
    
    // Pastikan CMS tersedia
    if (!window.loadCMSContent) {
        displayError("Sistem data CMS belum termuat. Mohon refresh.");
        return;
    }

    // 2. Muat Data Soal
    const cmsContent = window.loadCMSContent();
    quizQuestions = cmsContent.quizzes?.[currentQuizKey] || [];
    
    // Update judul halaman dan kuis
    document.getElementById('pageTitle').textContent = `Kuis: ${currentQuizKey}`;
    document.getElementById('quizTitle').textContent = `Kuis Akhir: ${formatQuizTitle(currentQuizKey)}`;
    document.getElementById('quizDescription').textContent = `Uji pemahaman Anda tentang materi yang telah dipelajari.`;
    document.getElementById('questionCount').textContent = quizQuestions.length;
    document.getElementById('timeLimit').textContent = 'Tidak Terbatas'; // Bisa ditambahkan fitur timer nanti

    // 3. Render Soal
    if (quizQuestions.length === 0) {
        displayError("Soal kuis untuk kunci ini belum diinput oleh Guru/Administrator.", true);
        return;
    }

    renderQuizQuestions();
    
    // 4. Pasang Event Listener Form
    const submitBtn = document.getElementById('submitQuizBtn');
    const quizForm = document.getElementById('quizForm');
    
    if (quizForm) {
        quizForm.addEventListener('submit', handleQuizSubmit);
    }
    
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = `Selesaikan Kuis & Dapatkan Poin! (${quizQuestions.length} Soal)`;
    }
    
    // 5. Setup form validation
    setupFormValidation();
}

/**
 * Menangani submit form kuis.
 */
function handleQuizSubmit(event) {
    event.preventDefault();
    
    if (quizSubmitted) {
        alert("Kuis sudah disubmit. Tidak dapat mengirim lagi.");
        return;
    }
    
    submitQuiz();
}

/**
 * Menghitung dan menyimpan skor kuis.
 */
function submitQuiz() {
    let correctCount = 0;
    const totalQuestions = quizQuestions.length;
    const unansweredQuestions = [];
    
    // 1. Loop melalui semua pertanyaan dan verifikasi jawaban
    quizQuestions.forEach((qItem, index) => {
        const qId = qItem.id || `q${index + 1}`;
        const selectedAnswer = document.querySelector(`input[name="${qId}"]:checked`);
        
        if (!selectedAnswer) {
            unansweredQuestions.push(index + 1);
            return;
        }
        
        // qItem.a (Jawaban Benar) adalah KEY opsi (A, B, C, D)
        if (selectedAnswer.value === qItem.a) {
            correctCount++;
        }
    });
    
    // 2. Validasi semua soal terjawab
    if (unansweredQuestions.length > 0) {
        const confirmSubmit = confirm(`Anda belum menjawab soal nomor: ${unansweredQuestions.join(', ')}.\n\nApakah Anda yakin ingin mengirim kuis?`);
        if (!confirmSubmit) {
            return;
        }
    }
    
    // 3. Hitung skor
    const maxScore = totalQuestions * POINTS_PER_QUESTION;
    const finalScore = correctCount * POINTS_PER_QUESTION;
    const finalGrade = (finalScore / maxScore) * 100;

    // 4. Tampilkan hasil
    displayQuizResult(finalScore, finalGrade, maxScore, correctCount, totalQuestions);
    
    // 5. Kirim skor ke sistem (app.js) - FINALISASI MODUL
    if (window.updateModuleScore && finalGrade >= PASSING_GRADE) {
        window.updateModuleScore(currentModuleId, finalScore);
    }
    
    // 6. Nonaktifkan form setelah submit
    quizSubmitted = true;
    document.getElementById('submitQuizBtn').disabled = true;
    document.getElementById('submitQuizBtn').textContent = 'Kuis Telah Disubmit';
    
    // Nonaktifkan semua radio buttons
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.disabled = true;
    });
}

// =======================================================
// II. FUNGSI UNTUK MERENDER SOAL
// =======================================================

/**
 * Merender soal kuis dari data CMS ke elemen HTML.
 */
function renderQuizQuestions() {
    const questionsContainer = document.getElementById('questionsContainer');
    if (!questionsContainer) return;
    
    questionsContainer.innerHTML = ''; 

    quizQuestions.forEach((qItem, index) => {
        const qId = qItem.id || `q${index + 1}`;
        const questionCard = document.createElement('div');
        questionCard.classList.add('question-card');
        questionCard.dataset.questionId = qId;
        
        let optionsHTML = '';
        qItem.options.forEach((optionText, optIndex) => {
            const optionKey = String.fromCharCode(65 + optIndex); // A, B, C, D, dst.
            optionsHTML += `
                <label>
                    <input type="radio" name="${qId}" value="${optionKey}" required>
                    <span class="option-text">${optionKey}. ${optionText}</span>
                </label>
            `;
        });

        questionCard.innerHTML = `
            <div class="question-header">
                <span class="question-number">Soal ${index + 1}</span>
                <span class="question-points">${POINTS_PER_QUESTION} Poin</span>
            </div>
            <p class="question-text">${qItem.q}</p>
            <div class="options-container">
                ${optionsHTML}
            </div>
        `;
        questionsContainer.appendChild(questionCard);
    });
}

/**
 * Menampilkan hasil kuis dan memberikan feedback.
 */
function displayQuizResult(finalScore, finalGrade, maxScore, correctCount, totalQuestions) {
    const resultHTML = `
        <div class="quiz-result-overlay">
            <div class="result-content">
                <h2>${finalGrade >= PASSING_GRADE ? '🎉 SELAMAT!' : '📝 Hasil Kuis'}</h2>
                <div class="result-stats">
                    <div class="stat-item">
                        <span class="stat-label">Nilai Akhir</span>
                        <span class="stat-value ${finalGrade >= PASSING_GRADE ? 'pass' : 'fail'}">${finalGrade.toFixed(1)}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Jawaban Benar</span>
                        <span class="stat-value">${correctCount}/${totalQuestions}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Poin Diperoleh</span>
                        <span class="stat-value">${finalScore}/${maxScore}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Status</span>
                        <span class="stat-value ${finalGrade >= PASSING_GRADE ? 'pass' : 'fail'}">${finalGrade >= PASSING_GRADE ? 'LULUS' : 'TIDAK LULUS'}</span>
                    </div>
                </div>
                <p class="result-message">
                    ${finalGrade >= PASSING_GRADE 
                        ? `Anda telah berhasil menyelesaikan kuis dengan nilai di atas ${PASSING_GRADE}%. Poin telah ditambahkan ke profil Anda!` 
                        : `Nilai Anda belum mencapai batas kelulusan (${PASSING_GRADE}%). Silakan pelajari materi kembali dan coba lagi.`}
                </p>
                <div class="result-actions">
                    <button onclick="window.location.href='../index.html'" class="btn btn-primary">Kembali ke Dashboard</button>
                    <button onclick="window.location.href='module.html?id=${currentModuleId}'" class="btn btn-secondary">Lihat Materi Kembali</button>
                </div>
            </div>
        </div>
    `;
    
    // Tambahkan styling untuk result overlay
    const style = document.createElement('style');
    style.textContent = `
        .quiz-result-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .result-content {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            text-align: center;
        }
        .result-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin: 1.5rem 0;
        }
        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .stat-label {
            font-size: 0.9rem;
            color: #666;
            margin-bottom: 0.5rem;
        }
        .stat-value {
            font-size: 1.2rem;
            font-weight: bold;
        }
        .stat-value.pass { color: var(--color-accent); }
        .stat-value.fail { color: #f44336; }
        .result-message {
            margin: 1.5rem 0;
            line-height: 1.5;
        }
        .result-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
        }
    `;
    document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend', resultHTML);
}

/**
 * Format judul kuis untuk ditampilkan
 */
function formatQuizTitle(quizKey) {
    return quizKey
        .replace('_quiz', '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Setup form validation
 */
function setupFormValidation() {
    const form = document.getElementById('quizForm');
    const inputs = form.querySelectorAll('input[type="radio"]');
    
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            const questionCard = this.closest('.question-card');
            if (questionCard) {
                questionCard.classList.add('answered');
            }
        });
    });
}

/**
 * Menampilkan pesan error atau konten kosong.
 */
function displayError(message, showPlaceholder = false) {
    document.getElementById('quizTitle').textContent = "Kesalahan/Kuis Kosong";
    const container = document.getElementById('questionsContainer');
    
    if (container) {
        if (showPlaceholder) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📝</div>
                    <h3 style="margin-bottom: 1rem;">Kuis Belum Tersedia</h3>
                    <p>${message}</p>
                    <a href="../index.html" class="btn btn-secondary" style="margin-top: 1rem;">Kembali ke Dashboard</a>
                </div>
            `;
        } else {
            container.innerHTML = `<p style="color: red; text-align: center; padding: 30px;">${message}</p>`;
        }
    }
    
    const submitBtn = document.getElementById('submitQuizBtn');
    if (submitBtn) submitBtn.disabled = true;
}

// =======================================================
// III. INITIALIZATION
// =======================================================

document.addEventListener('DOMContentLoaded', initQuizController);

// Expose functions untuk akses global
window.quizController = {
    init: initQuizController,
    submitQuiz: submitQuiz
};