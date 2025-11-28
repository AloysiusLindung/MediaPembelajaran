/**
 * PANCASILA DIGITAL - MAIN APPLICATION LOGIC
 * ==========================================
 * Mengatur interaksi halaman, manajemen data JSON, logika Kuis,
 * dan fitur interaktif (Studi Kasus, Video & Sertifikat).
 */

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// --- VARIABEL GLOBAL ---
let appData = null; // Menyimpan data dari JSON
let currentMateriIndex = 0; // Untuk navigasi sub-bab di halaman materi
let activeBabId = null;

// --- SISTEM PENYIMPANAN PROGRESS ---
// Simpan progress membaca & nilai kuis ke LocalStorage
function saveProgress(babId, type, value) {
    // Struktur data: { bab1: { lastPage: 2, quizScore: 80, isDone: true } }
    let progressData = JSON.parse(localStorage.getItem('pancasila_progress')) || {};
    
    if (!progressData[babId]) {
        progressData[babId] = { lastPage: 0, maxPage: 0, quizScore: null };
    }

    if (type === 'reading') {
        // Hanya update jika halaman yang dibaca lebih jauh dari sebelumnya
        if (value > progressData[babId].lastPage) {
            progressData[babId].lastPage = value;
        }
        // Simpan total halaman bab ini
        progressData[babId].maxPage = appData.bab.find(b => b.id == babId).materi.length;
    } 
    else if (type === 'quiz') {
        progressData[babId].quizScore = value;
    }

    localStorage.setItem('pancasila_progress', JSON.stringify(progressData));
}

// Hitung persentase untuk ditampilkan di Dashboard
function calculatePercentage(babId) {
    let progressData = JSON.parse(localStorage.getItem('pancasila_progress')) || {};
    let data = progressData[babId];

    if (!data) return 0; // Belum pernah dibuka

    // ATURAN: Jika sudah ngerjain kuis, anggap 100%
    if (data.quizScore !== null) {
        return 100; 
    }

    // Jika belum kuis, hitung berdasarkan halaman bacaan (Maksimal 90%)
    if (data.maxPage > 0) {
        let readPercent = Math.round(((data.lastPage + 1) / data.maxPage) * 90);
        return readPercent;
    }
    
    return 0;
}

// ==========================================================
// 1. INISIALISASI & DATA FETCHING
// ==========================================================

async function initApp() {
    // A. Atur Tema (Dark/Light)
    initThemeSystem();

    // B. Ambil Data JSON
    try {
        const response = await fetch('assets/js/data.json');
        if (!response.ok) throw new Error("Gagal mengambil data");
        appData = await response.json();
        
        console.log("Data Berhasil Dimuat:", appData);
        
        // C. Router Sederhana (Cek kita ada di halaman mana)
        const page = window.location.pathname;

        if (document.getElementById('materi-container')) {
            // Halaman: Index / Beranda
            renderDashboardIndex();
            initPasalSearch('search-pasal', 'hasil-pencarian');
        } 
        else if (document.getElementById('materi-content')) {
            // Halaman: Materi (Reading Mode)
            initMateriPage();
            initPasalSearch('side-search-input', 'side-search-results'); // Search di sidebar
        } 
        else if (document.getElementById('quiz-intro')) {
            // Halaman: Kuis
            initQuizPage();
        }

    } catch (error) {
        console.error("Error Loading Data:", error);
        alert("Maaf, gagal memuat data materi. Pastikan file data.json tersedia dan dijalankan di Localhost.");
    }
}

// ==========================================================
// 2. SISTEM TEMA & AKSESIBILITAS
// ==========================================================

function initThemeSystem() {
    const btnLight = document.getElementById('btn-theme-light');
    const btnDark = document.getElementById('btn-theme-dark');
    const body = document.body;

    // Cek LocalStorage
    const savedTheme = localStorage.getItem('pancasila_theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        updateThemeBtns(true);
    }

    // Event Listener
    if(btnLight && btnDark) {
        btnLight.addEventListener('click', () => {
            body.classList.remove('dark-mode');
            localStorage.setItem('pancasila_theme', 'light');
            updateThemeBtns(false);
        });

        btnDark.addEventListener('click', () => {
            body.classList.add('dark-mode');
            localStorage.setItem('pancasila_theme', 'dark');
            updateThemeBtns(true);
        });
    }

    function updateThemeBtns(isDark) {
        if(isDark) {
            btnDark.classList.add('active', 'btn-white', 'shadow-sm');
            btnDark.classList.remove('btn-transparent');
            btnLight.classList.remove('active', 'btn-white', 'shadow-sm');
            btnLight.classList.add('btn-transparent');
        } else {
            btnLight.classList.add('active', 'btn-white', 'shadow-sm');
            btnLight.classList.remove('btn-transparent');
            btnDark.classList.remove('active', 'btn-white', 'shadow-sm');
            btnDark.classList.add('btn-transparent');
        }
    }
}

// ==========================================================
// 3. LOGIKA HALAMAN BERANDA (INDEX.HTML)
// ==========================================================

function renderDashboardIndex() {
    const container = document.getElementById('materi-container');
    container.innerHTML = ''; 

    appData.bab.forEach(bab => {
        const progress = calculatePercentage(bab.id); 
        
        let barColor = progress === 100 ? 'bg-success' : 'bg-primary';
        let textStatus = progress === 100 ? 'Selesai <i class="bi bi-check-circle-fill"></i>' : `${progress}%`;

        const cardHTML = `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 border-0 shadow-sm hover-scale">
                    <div class="card-body p-4">
                        <div class="d-flex align-items-center gap-3 mb-4">
                            <img src="${bab.icon}" alt="Icon" style="width: 50px; height: 50px;">
                            <div>
                                <small class="text-muted fw-bold text-uppercase">BAB ${bab.id}</small>
                                <h5 class="fw-bold mb-0 text-dark">${bab.judul}</h5>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <div class="d-flex justify-content-between small mb-1">
                                <span class="text-muted">Progres Belajar</span>
                                <span class="fw-bold ${progress === 100 ? 'text-success' : 'text-primary'}">${textStatus}</span>
                            </div>
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar rounded-pill ${barColor}" role="progressbar" style="width: ${progress}%"></div>
                            </div>
                        </div>

                        <div class="d-flex gap-2 mt-3">
                            <a href="materi.html?id=${bab.id}" class="btn btn-primary flex-fill rounded-pill fw-bold btn-sm">
                                ${progress === 100 ? 'Baca Ulang' : 'Lanjut Belajar'}
                            </a>
                            <a href="kuis.html" class="btn btn-outline-warning flex-fill rounded-pill fw-bold btn-sm text-dark" title="Uji Kompetensi">
                                <i class="bi bi-trophy"></i> Kuis
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

// ==========================================================
// 4. LOGIKA PENCARIAN PASAL (SMART SEARCH)
// ==========================================================

function initPasalSearch(inputId, resultId) {
    const input = document.getElementById(inputId);
    const resultBox = document.getElementById(resultId);

    if (!input || !resultBox) return;

    input.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();
        resultBox.innerHTML = '';

        if (keyword.length < 2) {
            resultBox.innerHTML = '<div class="text-center py-4 opacity-50"><small>Ketik minimal 2 huruf...</small></div>';
            return;
        }

        const filtered = appData.referensi_hukum.filter(item => {
            const matchPasal = item.pasal.toLowerCase().includes(keyword);
            const matchIsi = item.isi.toLowerCase().includes(keyword);
            const matchTags = item.kata_kunci.some(tag => tag.toLowerCase().includes(keyword));
            return matchPasal || matchIsi || matchTags;
        });

        if (filtered.length === 0) {
            resultBox.innerHTML = '<div class="text-center py-3 text-warning">Tidak ditemukan pasal yang cocok.</div>';
        } else {
            filtered.forEach(item => {
                const itemHTML = `
                    <div class="mb-3 p-3 bg-white bg-opacity-10 border border-light border-opacity-25 rounded-3">
                        <strong class="text-warning d-block mb-1">${item.pasal}</strong>
                        <p class="mb-0 small text-white opacity-75 fst-italic">"${item.isi}"</p>
                    </div>
                `;
                resultBox.innerHTML += itemHTML;
            });
        }
    });
}

// ==========================================================
// 5. LOGIKA HALAMAN MATERI (MATERI.HTML)
// ==========================================================

function initMateriPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const babId = parseInt(urlParams.get('id'));

    if (!babId) {
        alert("Bab tidak ditemukan. Kembali ke beranda.");
        window.location.href = 'index.html';
        return;
    }

    activeBabId = babId;
    const babData = appData.bab.find(b => b.id === babId);
    
    // Render Header Info
    document.getElementById('navbar-judul-bab').innerText = babData.judul;
    document.getElementById('breadcrumb-bab').innerText = `Bab ${babData.id}`;
    document.getElementById('materi-title').innerText = babData.judul;
    document.getElementById('materi-kd').innerText = babData.kompetensi_dasar;

    // Render Sidebar Navigation
    const sidebar = document.getElementById('daftar-isi-sidebar');
    sidebar.innerHTML = '';
    
    babData.materi.forEach((item, index) => {
        const isActive = index === 0 ? 'active' : '';
        const btnHTML = `
            <a href="#" class="list-group-item list-group-item-action py-3 ${isActive}" onclick="loadSubMateri(${index}); return false;" id="sidebar-link-${index}">
                <small class="fw-bold text-muted me-2">${babData.id}.${index + 1}</small> ${item.judul_sub}
            </a>
        `;
        sidebar.innerHTML += btnHTML;
    });

    // Load Materi Pertama
    loadSubMateri(0);

    // Setup Tombol Next/Prev
    document.getElementById('btn-next-materi').addEventListener('click', () => {
        const babData = appData.bab.find(b => b.id === activeBabId);
        
        if(currentMateriIndex === babData.materi.length - 1) {
            window.location.href = 'index.html';
        } else {
            loadSubMateri(currentMateriIndex + 1);
        }
    });
    
    document.getElementById('btn-prev-materi').addEventListener('click', () => {
        if(currentMateriIndex > 0) loadSubMateri(currentMateriIndex - 1);
    });
}

// PERBAIKAN: Fungsi ekstrak Youtube ID yang lebih aman
function extractYouTubeId(url) {
    if (!url) return null;
    
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/,
        /youtube\.com\/watch\?.*v=([^&?#]+)/,
        /youtu\.be\/([^&?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    // Jika tidak valid, kembalikan null agar bisa dideteksi errornya
    return null; 
}

// PERBAIKAN: Fungsi Render Konten (Sudah support Link & Semua Tipe Data)
window.loadSubMateri = function(index) {
    currentMateriIndex = index;
    const babData = appData.bab.find(b => b.id === activeBabId);
    const data = babData.materi[index];
    const contentArea = document.getElementById('materi-content');

    // Update Sidebar Active State
    document.querySelectorAll('#daftar-isi-sidebar a').forEach(el => el.classList.remove('active'));
    const activeLink = document.getElementById(`sidebar-link-${index}`);
    if(activeLink) activeLink.classList.add('active');

    // Update Tombol Navigasi
    document.getElementById('btn-prev-materi').disabled = (index === 0);
    
    // Simpan Progress Membaca
    saveProgress(activeBabId, 'reading', index);

    // Update Tombol Next/Selesai
    const btnNext = document.getElementById('btn-next-materi');
    if (index === babData.materi.length - 1) {
        btnNext.innerHTML = 'Selesai Baca <i class="bi bi-house-door-fill ms-2"></i>';
        btnNext.classList.remove('btn-primary');
        btnNext.classList.add('btn-success'); 
    } else {
        btnNext.innerHTML = 'Selanjutnya <i class="bi bi-arrow-right ms-2"></i>';
        btnNext.classList.add('btn-primary');
        btnNext.classList.remove('btn-success');
    }

    // --- LOGIKA RENDERING KONTEN BARU ---
    contentArea.style.opacity = 0; 
    setTimeout(() => {
        let htmlContent = `<h3 class="mb-4 text-primary">${data.judul_sub}</h3>`;

        // 1. TIPE TEKS & INTRO (Paragraf Biasa)
        if (data.tipe === 'teks' || data.tipe === 'intro') {
            htmlContent += `<div class="content-text">${data.isi}</div>`;
        } 
        
        // 2. TIPE QUOTE (Untuk Definisi/Kutipan - PERBAIKAN: Sudah Ditambahkan)
        else if (data.tipe === 'quote') {
            htmlContent += `
                <figure class="text-center p-4 bg-light border-start border-4 border-warning rounded shadow-sm">
                    <blockquote class="blockquote">
                        <p class="fst-italic">"${data.isi}"</p>
                    </blockquote>
                    ${data.sumber ? `<figcaption class="blockquote-footer mt-2">${data.sumber}</figcaption>` : ''}
                </figure>
            `;
        }

        // 3. TIPE LIST (Untuk Ciri-Ciri - PERBAIKAN: Sudah Ditambahkan)
        else if (data.tipe === 'list') {
            if(data.deskripsi) htmlContent += `<p>${data.deskripsi}</p>`;
            htmlContent += `<ul class="list-group list-group-flush shadow-sm rounded-3 mb-3">`;
            data.poin.forEach(poin => {
                htmlContent += `<li class="list-group-item bg-transparent"><i class="bi bi-check-circle-fill text-success me-2"></i> ${poin}</li>`;
            });
            htmlContent += `</ul>`;
        }

        // 4. TIPE TABEL KONSEP (Untuk Sila Pancasila - PERBAIKAN: Sudah Ditambahkan)
        else if (data.tipe === 'tabel_konsep') {
            if(data.deskripsi) htmlContent += `<p>${data.deskripsi}</p>`;
            htmlContent += `<div class="table-responsive"><table class="table table-hover table-bordered shadow-sm">`;
            htmlContent += `<thead class="table-primary"><tr><th>Sila / Konsep</th><th>Implementasi & Makna</th></tr></thead><tbody>`;
            
            data.data.forEach(row => {
                // Menyesuaikan key data JSON (sila & isi, atau tahun & isi)
                let col1 = row.sila || row.tahun || row.key; 
                let col2 = row.isi || row.value;
                htmlContent += `<tr><td class="fw-bold text-nowrap">${col1}</td><td>${col2}</td></tr>`;
            });
            htmlContent += `</tbody></table></div>`;
        }

        // 5. TIPE TEKS HIGHLIGHT (Info Penting - PERBAIKAN: Sudah Ditambahkan)
        else if (data.tipe === 'teks_highlight') {
            htmlContent += `
                <div class="alert alert-info border-0 shadow-sm d-flex align-items-center" role="alert">
                    <i class="bi bi-info-circle-fill fs-4 me-3"></i>
                    <div>${data.isi}</div>
                </div>
            `;
        }
        
        // 6. TIPE VIDEO (PERBAIKAN: Menggunakan URL Penuh & Error Handling)
        else if (data.tipe === 'video') {
            // Mengambil ID dari youtube_url (sesuai JSON baru)
            const youtubeId = extractYouTubeId(data.youtube_url);
            
            if (youtubeId) {
                htmlContent += `
                    <div class="ratio ratio-16x9 mb-3 rounded-4 overflow-hidden shadow-sm">
                        <iframe 
                            src="https://www.youtube.com/embed/${youtubeId}" 
                            title="Video Pembelajaran" 
                            allowfullscreen 
                            style="border:0;">
                        </iframe>
                    </div>
                    <div class="p-3 bg-light border-start border-4 border-danger rounded-end">
                        <strong class="text-danger"><i class="bi bi-youtube me-2"></i>Video Pembelajaran</strong>
                        <p class="mb-0 text-muted mt-1 small">${data.deskripsi}</p>
                    </div>
                `;
            } else {
                htmlContent += `
                    <div class="alert alert-warning d-flex align-items-center" role="alert">
                        <i class="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
                        <div>
                            <strong>Video tidak dapat dimuat.</strong><br>
                            <small>Link video di database tampaknya salah atau rusak.</small>
                        </div>
                    </div>
                `;
            }
        }

        // 7. TIPE KASUS (Studi Kasus)
        else if (data.tipe === 'kasus') {
            htmlContent += `
                <div class="case-study-box">
                    <div class="d-flex align-items-center gap-2 mb-3 text-warning">
                        <i class="bi bi-exclamation-triangle-fill fs-5"></i>
                        <span class="fw-bold text-uppercase ls-1">Studi Kasus: Analisis</span>
                    </div>
                    <p class="lead mb-4 fw-bold text-dark">"${data.skenario}"</p>
                    
                    <p class="small text-muted mb-3">Pertanyaan Kritis: ${data.pertanyaan_kritis}</p>
                    <div class="d-grid gap-2">
            `;

            data.opsi_keputusan.forEach((opsi, i) => {
                htmlContent += `
                    <button class="btn btn-outline-dark text-start p-3 rounded-3" onclick="showCaseFeedback(${i})">
                        <span class="badge bg-secondary me-2">${String.fromCharCode(65+i)}</span> ${opsi}
                    </button>
                    <div id="feedback-case-${i}" class="alert mt-2 d-none" role="alert">
                        <strong>Analisis:</strong> ${data.feedback[i]}
                    </div>
                `;
            });

            htmlContent += `</div></div>`;
        }

        // Shortcut ke Kuis di halaman terakhir
        if (index === babData.materi.length - 1) {
            htmlContent += `
                <div class="alert alert-info mt-5 text-center shadow-sm border-0">
                    <h4 class="fw-bold"><i class="bi bi-trophy-fill text-warning me-2"></i>Tantangan Menanti!</h4>
                    <p>Kamu sudah membaca semua materi bab ini. Yuk uji pemahamanmu.</p>
                    <a href="kuis.html" class="btn btn-warning fw-bold rounded-pill px-4 hover-scale">
                        Kerjakan Uji Kompetensi Bab ${activeBabId}
                    </a>
                </div>
            `;
        }

        contentArea.innerHTML = htmlContent;
        contentArea.style.opacity = 1;
    }, 200);
}

// Logika Feedback Studi Kasus
window.showCaseFeedback = function(index) {
    document.querySelectorAll('[id^="feedback-case-"]').forEach(el => el.classList.add('d-none'));
    const el = document.getElementById(`feedback-case-${index}`);
    el.classList.remove('d-none');
    el.classList.add('alert-info'); 
}

// ==========================================================
// 6. LOGIKA HALAMAN KUIS (KUIS.HTML)
// ==========================================================

let quizState = {
    questions: [],
    currentIdx: 0,
    score: 0,
    correctCount: 0,
    timer: null,
    timeLeft: 0,
    studentName: ""
};

function initQuizPage() {
    const selectBab = document.getElementById('select-bab');
    const startBtn = document.getElementById('btn-start');
    const nameInput = document.getElementById('input-nama');

    appData.bab.forEach(bab => {
        const option = document.createElement('option');
        option.value = bab.id;
        option.innerText = `Bab ${bab.id}: ${bab.judul}`;
        selectBab.appendChild(option);
    });

    function checkForm() {
        startBtn.disabled = !(nameInput.value.trim() !== "" && selectBab.value !== "");
    }
    nameInput.addEventListener('input', checkForm);
    selectBab.addEventListener('change', checkForm);

    startBtn.addEventListener('click', () => {
        const babId = parseInt(selectBab.value);
        const babData = appData.bab.find(b => b.id === babId);
        
        quizState.questions = babData.kuis; 
        quizState.studentName = nameInput.value;
        quizState.currentIdx = 0;
        quizState.score = 0;
        quizState.correctCount = 0;
        quizState.timeLeft = quizState.questions.length * 30; 

        document.getElementById('quiz-intro').classList.add('d-none');
        document.getElementById('quiz-gameplay').classList.remove('d-none');
        document.getElementById('bab-badge').innerText = `Bab ${babId}`;
        
        startTimer();
        renderQuestion();
    });

    document.getElementById('btn-next').addEventListener('click', () => {
        quizState.currentIdx++;
        if (quizState.currentIdx < quizState.questions.length) {
            renderQuestion();
        } else {
            finishQuiz();
        }
    });

    const btnDownload = document.getElementById('btn-download-cert');
    if (btnDownload) {
        btnDownload.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.ReportSystem) {
                window.ReportSystem.downloadCertificate(quizState.studentName);
            } else {
                alert("Sistem sertifikat belum siap.");
            }
        });
    }
}

function startTimer() {
    const display = document.getElementById('timer-display');
    quizState.timer = setInterval(() => {
        quizState.timeLeft--;
        
        const minutes = Math.floor(quizState.timeLeft / 60);
        const seconds = quizState.timeLeft % 60;
        display.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        if (quizState.timeLeft <= 0) {
            clearInterval(quizState.timer);
            alert("Waktu Habis!");
            finishQuiz();
        }
    }, 1000);
}

function renderQuestion() {
    const q = quizState.questions[quizState.currentIdx];
    
    document.getElementById('current-soal-num').innerText = quizState.currentIdx + 1;
    document.getElementById('total-soal-num').innerText = quizState.questions.length;
    
    const percent = ((quizState.currentIdx) / quizState.questions.length) * 100;
    document.getElementById('progress-bar').style.width = `${percent}%`;

    document.getElementById('feedback-area').classList.add('d-none');
    document.getElementById('question-text').innerText = q.pertanyaan;
    
    const optContainer = document.getElementById('options-container');
    optContainer.innerHTML = '';

    q.opsi.forEach((optText, i) => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline-primary text-start p-3 rounded-3 option-btn w-100 mb-2';
        btn.innerHTML = `<span class="fw-bold me-2">${String.fromCharCode(65+i)}.</span> ${optText}`;
        btn.onclick = () => checkAnswer(i, q.jawaban_benar, btn);
        optContainer.appendChild(btn);
    });
}

function checkAnswer(selectedIdx, correctIdx, btnElement) {
    const allBtns = document.querySelectorAll('.option-btn');
    allBtns.forEach(b => b.disabled = true);

    const feedbackArea = document.getElementById('feedback-area');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackDesc = document.getElementById('feedback-desc');
    const feedbackIcon = document.getElementById('feedback-icon');

    feedbackArea.classList.remove('d-none');

    if (selectedIdx === correctIdx) {
        quizState.score += 100; 
        quizState.correctCount++;
        
        btnElement.classList.remove('btn-outline-primary');
        btnElement.classList.add('correct-answer');
        
        feedbackIcon.className = 'rounded-circle bg-success text-white p-2 d-flex align-items-center justify-content-center';
        feedbackIcon.innerHTML = '<i class="bi bi-check-lg fs-4"></i>';
        feedbackTitle.innerText = "Jawaban Benar!";
        feedbackDesc.innerText = "Hebat! Pemahamanmu sangat baik.";
    } else {
        btnElement.classList.remove('btn-outline-primary');
        btnElement.classList.add('wrong-answer');
        allBtns[correctIdx].classList.add('correct-answer');

        feedbackIcon.className = 'rounded-circle bg-danger text-white p-2 d-flex align-items-center justify-content-center';
        feedbackIcon.innerHTML = '<i class="bi bi-x-lg fs-4"></i>';
        feedbackTitle.innerText = "Kurang Tepat";
        feedbackDesc.innerText = "Jawaban yang benar sudah ditandai hijau.";
    }
}

function finishQuiz() {
    clearInterval(quizState.timer);
    
    const finalScore = Math.round((quizState.correctCount / quizState.questions.length) * 100);

    const babId = document.getElementById('select-bab').value;
    saveProgress(babId, 'quiz', finalScore); 

    document.getElementById('quiz-gameplay').classList.add('d-none');
    document.getElementById('quiz-result').classList.remove('d-none');
    
    document.getElementById('final-score').innerText = finalScore;
    document.getElementById('correct-count').innerText = quizState.correctCount;
    document.getElementById('wrong-count').innerText = quizState.questions.length - quizState.correctCount;

    const babData = appData.bab.find(b => b.id == babId);
    
    if (window.ReportSystem) {
        window.ReportSystem.prepareCertificate(
            quizState.studentName, 
            `Bab ${babId}: ${babData.judul}`, 
            finalScore
        );
    } else {
        console.error("ERROR: report.js belum dimuat di kuis.html!");
    }
}