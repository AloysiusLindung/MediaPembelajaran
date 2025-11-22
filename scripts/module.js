/**
 * scripts/module.js
 * Controller Universal untuk Halaman Modul (pages/module.html).
 * Bertugas membaca ID Modul dari URL dan merender konten secara dinamis dari CMS.
 * Membutuhkan: auth.js, app.js (loadCMSContent, loadActiveStudentData), module-progress.js.
 */

let CURRENT_MODULE_ID = '';
let MODULE_DATA = null;

// =======================================================
// I. FUNGSI UTAMA
// =======================================================

/**
 * Mendapatkan ID modul dari parameter URL (?id=...).
 * @returns {string|null} ID modul atau null jika tidak ditemukan.
 */
function getModuleIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

/**
 * Fungsi utama untuk inisialisasi dan rendering halaman modul.
 */
function initModulePage() {
    // 1. Pengecekan Otentikasi
    if (typeof window.checkAuthentication === 'function') {
        window.checkAuthentication('murid');
    }

    CURRENT_MODULE_ID = getModuleIdFromURL();

    if (!CURRENT_MODULE_ID) {
        displayError("Modul tidak ditemukan. ID Modul tidak tersedia di URL.");
        return;
    }

    // 2. Muat Data
    const cms = window.loadCMSContent();
    MODULE_DATA = cms.modules[CURRENT_MODULE_ID];

    if (!MODULE_DATA || !MODULE_DATA.materi || MODULE_DATA.materi.length === 0) {
        displayError(`Konten untuk Modul "${CURRENT_MODULE_ID.toUpperCase()}" belum diinput oleh Guru.`, true);
        return;
    }
    
    // 3. Render Komponen Utama
    document.getElementById('pageTitle').textContent = MODULE_DATA.title || 'Modul Pembelajaran';
    document.getElementById('contentHeader').textContent = MODULE_DATA.title;
    document.getElementById('moduleTitle').textContent = MODULE_DATA.title || 'Modul Pembelajaran';

    // 4. Render Sidebar dan Konten Utama
    const STEPS = renderStepsList(MODULE_DATA.materi); // Render Sidebar
    renderModuleContent(MODULE_DATA.materi);           // Render Konten

    // 5. Inisialisasi Status Progres
    if (window.renderModuleProgress && STEPS.length > 0) {
        // PERBAIKAN: Hanya perlu mengirim ID modul, karena logika progres ada di module-progress.js
        window.renderModuleProgress(CURRENT_MODULE_ID); 
        
        // Auto-scroll ke konten pertama secara default
        setTimeout(() => {
            const firstStepId = STEPS[0].id;
            const firstStepElement = document.getElementById(firstStepId);
            if (firstStepElement) {
                firstStepElement.scrollIntoView({ behavior: 'smooth' });
            }
        }, 500);
    }
}

// =======================================================
// II. FUNGSI RENDERING KOMPONEN
// =======================================================

/**
 * Merender daftar langkah di Sidebar.
 * @param {Array} materi - Array materi dari CMS.
 * @returns {Array} Daftar langkah (STEPS) untuk digunakan oleh module-progress.js.
 */
function renderStepsList(materi) {
    const listContainer = document.getElementById('moduleStepsList');
    listContainer.innerHTML = '';
    const STEPS = [];

    materi.forEach((item, index) => {
        const listItem = document.createElement('li');
        const stepId = item.id || `step-${index + 1}`;
        
        // Cek apakah item adalah Kuis atau Aktivitas untuk link ke halaman berbeda
        const isActivityOrQuiz = (item.type === 'activity' || item.type === 'quiz');
        
        let linkTarget = isActivityOrQuiz 
                         ? buildSmartLink(item)
                         : `#${stepId}`;
        
        listItem.id = `step-${stepId}`;
        listItem.innerHTML = `
            <a href="${linkTarget}" class="${isActivityOrQuiz ? 'external-link' : 'content-link'}" data-step-id="${stepId}">
                <span class="step-indicator">${index + 1}</span> ${item.title}
            </a>
        `;
        listContainer.appendChild(listItem);
        
        // Tambahkan ke array STEPS untuk digunakan oleh module-progress.js
        STEPS.push({ id: stepId, title: item.title, type: item.type });
    });
    
    // Pasang event listener untuk link internal (scrolling)
    document.querySelectorAll('.content-link').forEach(anchor => {
        anchor.addEventListener('click', handleStepClick);
    });
    
    return STEPS;
}

/**
 * Merender konten dinamis (Teks, Video, dll.) ke area utama modul.
 * @param {Array} materi - Array materi dari CMS.
 */
function renderModuleContent(materi) {
    const contentContainer = document.getElementById('dynamicContentContainer');
    contentContainer.innerHTML = ''; 

    materi.forEach((item, index) => {
        const section = document.createElement('section');
        const stepId = item.id || `step-${index + 1}`;
        section.id = stepId;
        section.classList.add('content-section');
        
        let html = '';
        
        // Tambahkan Judul Sub-Bagian
        html += `<h3>${item.title || 'Sub-Topik'}</h3>`;

        // Logika Konten Berdasarkan Tipe
        if (item.type === 'text') {
            html += `<div class="text-content">${item.content}</div>`;
        } else if (item.type === 'video') {
            html += `
                <div class="video-wrapper">
                    <iframe src="${item.url}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
            `;
        } else if (item.type === 'image') {
            html += `
                <div class="infographic-box">
                    <img src="${item.url}" alt="${item.title || 'Infografis'}" loading="lazy" />
                    ${item.caption ? `<p class="image-caption">${item.caption}</p>` : ''}
                </div>
            `;
        } else if (item.type === 'activity' || item.type === 'quiz') {
            // Tampilan untuk Link Cerdas
            const link = buildSmartLink(item);
            const buttonText = (item.type === 'quiz') ? 'Mulai Kuis Akhir →' : 'Mulai Aktivitas →';
            const description = item.description || `Langkah Wajib: ${item.title}`;
            
            html += `
                <div class="interactive-section" style="text-align: center; margin: 30px 0; padding: 20px; border: 2px dashed var(--color-primary); border-radius: 8px; background-color: #f8f9fa;">
                    <p style="font-weight: 600; margin-bottom: 15px;">${description}</p>
                    <a href="${link}" class="btn btn-primary btn-large" style="margin-top: 10px;">${buttonText}</a>
                </div>
            `;
        }

        section.innerHTML = html;
        contentContainer.appendChild(section);
    });
}

// =======================================================
// III. LOGIKA NAVIGASI & LINK CERDAS
// =======================================================

/**
 * Membuat Tautan Cerdas ke halaman Activity/Quiz Universal.
 * @param {object} item - Item materi dari CMS (dengan type, activity_key, atau quiz_key).
 * @returns {string} URL yang benar.
 */
function buildSmartLink(item) {
    if (item.type === 'activity' && item.activity_key) {
        return `activity.html?module=${CURRENT_MODULE_ID}&key=${item.activity_key}`;
    } else if (item.type === 'quiz' && item.quiz_key) {
        return `quiz.html?module=${CURRENT_MODULE_ID}&key=${item.quiz_key}`;
    }
    return '#'; // Fallback
}

/**
 * Menangani klik pada langkah (step) di sidebar untuk scrolling dan update progress.
 */
function handleStepClick(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href').substring(1);
    const stepId = this.getAttribute('data-step-id');
    
    // Scroll ke bagian konten utama
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
        targetElement.scrollIntoView({
            behavior: 'smooth'
        });

        // Update status 'current' visual
        document.querySelectorAll('.step-list li').forEach(li => {
            li.classList.remove('current');
        });
        this.parentElement.classList.add('current');
        
        // Panggil updateStepProgress untuk mencatat bahwa materi ini telah dilihat.
        if (window.updateStepProgress && stepId) {
            window.updateStepProgress(stepId, CURRENT_MODULE_ID); 
        }
        
        // PENTING: Panggil renderModuleProgress lagi setelah update, agar sidebar ter-refresh
        if (window.renderModuleProgress) {
            setTimeout(() => {
                window.renderModuleProgress(CURRENT_MODULE_ID);
            }, 300);
        }
    }
}

/**
 * Menampilkan pesan error jika modul tidak ditemukan atau kosong.
 */
function displayError(message, isContentError = false) {
    document.getElementById('contentHeader').textContent = "Kesalahan Modul";
    const container = document.getElementById('dynamicContentContainer');
    
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #666;">
                <img src="https://placehold.co/100x100/ccc/white?text=⚠️" alt="Error" style="display: block; margin: 0 auto 20px;">
                <h3 style="color: #d32f2f; margin-bottom: 15px;">Modul Tidak Dapat Dimuat</h3>
                <p>${message}</p>
                <a href="../index.html" class="btn btn-secondary" style="margin-top: 20px;">Kembali ke Dashboard</a>
            </div>
        `;
    }
    
    // Update Judul halaman jika ini bukan error konten
    if (!isContentError) {
        document.getElementById('moduleTitle').textContent = "Modul Tidak Ditemukan";
    }
}

/**
 * Navigasi ke langkah berikutnya
 */
function navigateToNextStep() {
    const currentStep = document.querySelector('.step-list li.current');
    if (currentStep) {
        const nextStep = currentStep.nextElementSibling;
        if (nextStep) {
            const nextLink = nextStep.querySelector('a');
            if (nextLink) {
                nextLink.click();
            }
        }
    }
}

/**
 * Navigasi ke langkah sebelumnya
 */
function navigateToPrevStep() {
    const currentStep = document.querySelector('.step-list li.current');
    if (currentStep) {
        const prevStep = currentStep.previousElementSibling;
        if (prevStep) {
            const prevLink = prevStep.querySelector('a');
            if (prevLink) {
                prevLink.click();
            }
        }
    }
}

// =======================================================
// IV. INITIALIZATION
// =======================================================

document.addEventListener('DOMContentLoaded', initModulePage);

// Expose fungsi ke global scope untuk akses dari HTML
window.navigateToNextStep = navigateToNextStep;
window.navigateToPrevStep = navigateToPrevStep;
window.CURRENT_MODULE_ID = CURRENT_MODULE_ID;