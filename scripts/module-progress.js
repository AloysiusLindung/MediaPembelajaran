/**
 * scripts/module-progress.js
 * Controller untuk mengelola dan merender progres parsial (langkah demi langkah)
 * pada halaman modul (pages/module.html) secara dinamis.
 * Membutuhkan: 
 * - window.loadActiveStudentData() dan window.saveActiveStudentData() dari app.js
 * - window.updateModuleProgress() dari app.js (untuk mencatat progres persentase)
 * - window.loadCMSContent() dari app.js (untuk mengambil data modul dinamis)
 */

// Total progres yang dialokasikan untuk semua langkah materi sebelum kuis akhir
const MAX_MATERI_PROGRESS = 70;

// =======================================================
// I. LOGIKA UPDATE PROGRESS STEP
// =======================================================

/**
 * Menghitung dan menyimpan progres parsial saat murid menyelesaikan satu langkah/seksi materi.
 * @param {string} stepId - ID langkah yang baru selesai
 * @param {string} moduleId - ID modul saat ini
 */
function updateStepProgress(stepId, moduleId) {
    const data = window.loadActiveStudentData();
    const cms = window.loadCMSContent();
    
    if (!data || !data.modules[moduleId] || !cms.modules[moduleId]) {
        console.error(`Gagal memuat data modul ${moduleId}.`);
        return;
    }

    const moduleData = cms.modules[moduleId];
    
    // Filter hanya langkah materi (bukan aktivitas atau kuis)
    const materiSteps = moduleData.materi.filter(item => 
        item.type === 'text' || item.type === 'video' || item.type === 'image'
    );
    
    const stepsCount = materiSteps.length;
    
    // Hitung bobot per langkah dinamis
    const weightPerStep = stepsCount > 0 ? Math.floor(MAX_MATERI_PROGRESS / stepsCount) : 0;
    
    const studentModule = data.modules[moduleId];
    studentModule.progressStatus = studentModule.progressStatus || {};
    
    // Pastikan langkah yang diupdate belum pernah dihitung sebelumnya
    if (studentModule.progressStatus[stepId] !== 'completed') {
        
        // Hitung progres baru berdasarkan bobot dinamis
        const newProgress = Math.min(studentModule.progress + weightPerStep, MAX_MATERI_PROGRESS);
        
        // Catat bahwa langkah ini sudah selesai
        studentModule.progressStatus[stepId] = 'completed';
        
        // Update progres modul
        if (typeof window.updateModuleProgress === 'function') {
            window.updateModuleProgress(moduleId, newProgress);
        }

        console.log(`Progress updated: ${stepId} -> ${newProgress}%`);
    }

    // Perbarui Tampilan Sidebar
    renderModuleProgress(moduleId);
}

/**
 * Menandai langkah sebagai dilihat (viewed) tanpa menambah progress
 * @param {string} stepId - ID langkah yang dilihat
 * @param {string} moduleId - ID modul saat ini
 */
function markStepAsViewed(stepId, moduleId) {
    const data = window.loadActiveStudentData();
    
    if (!data || !data.modules[moduleId]) {
        console.error(`Gagal memuat data modul ${moduleId}.`);
        return;
    }

    const studentModule = data.modules[moduleId];
    studentModule.progressStatus = studentModule.progressStatus || {};
    
    // Tandai sebagai dilihat jika belum completed
    if (studentModule.progressStatus[stepId] !== 'completed') {
        studentModule.progressStatus[stepId] = 'viewed';
        window.saveActiveStudentData(data);
        
        // Perbarui tampilan
        renderModuleProgress(moduleId);
    }
}

// =======================================================
// II. RENDER SIDEBAR BERDASARKAN STATUS
// =======================================================

/**
 * Merender sidebar modul (progress bar dan status langkah) berdasarkan data murid aktif.
 * @param {string} moduleId - ID modul saat ini
 */
function renderModuleProgress(moduleId) {
    const data = window.loadActiveStudentData();
    const cms = window.loadCMSContent();
    
    if (!data || !data.modules[moduleId] || !cms.modules[moduleId]) return;
    
    const studentModule = data.modules[moduleId];
    const progressStatus = studentModule.progressStatus || {};
    
    // 1. Update Persentase di Sidebar
    const progressElement = document.getElementById('moduleProgress');
    const progressBarElement = document.getElementById('moduleProgressBar');
    
    if (progressElement) {
        progressElement.textContent = `${studentModule.progress}% Selesai`;
    }
    
    if (progressBarElement) {
        progressBarElement.style.width = `${studentModule.progress}%`;
    }
    
    // 2. Tandai Langkah di Step List
    const stepList = document.getElementById('moduleStepsList');
    if (!stepList) return;

    let currentStepFound = false;
    let stepIndex = 0;
    
    Array.from(stepList.children).forEach((li) => {
        const link = li.querySelector('a');
        if (!link) return;

        const stepId = link.getAttribute('data-step-id');
        const isExternalLink = link.classList.contains('external-link');
        
        if (!stepId) return;
        
        stepIndex++;
        
        // Simpan index step untuk referensi
        if (!li.dataset.stepIndex) {
            li.dataset.stepIndex = stepIndex;
        }

        const stepIndicator = li.querySelector('.step-indicator');
        
        // Reset kelas dan konten
        li.classList.remove('completed', 'current', 'viewed');
        
        // Tandai sebagai completed jika:
        // a. Tercatat di progressStatus sebagai completed, ATAU
        // b. Status modul sudah completed (kuis akhir selesai)
        if (progressStatus[stepId] === 'completed' || studentModule.status === 'completed') {
            li.classList.add('completed');
            stepIndicator.textContent = '✓';
            stepIndicator.style.backgroundColor = 'var(--color-accent)';
        } 
        // Tandai sebagai viewed (hanya dilihat)
        else if (progressStatus[stepId] === 'viewed') {
            li.classList.add('viewed');
            stepIndicator.textContent = stepIndex;
            stepIndicator.style.backgroundColor = '#90caf9';
        }
        // Tandai sebagai current (langkah aktif)
        else if (!currentStepFound && !isExternalLink) {
            li.classList.add('current');
            stepIndicator.textContent = '⬤';
            stepIndicator.style.backgroundColor = 'var(--color-primary)';
            currentStepFound = true;
        }
        // Langkah belum dikerjakan
        else {
            stepIndicator.textContent = stepIndex;
            stepIndicator.style.backgroundColor = '#ccc';
        }
    });
}

/**
 * Menghitung statistik progress untuk modul tertentu
 * @param {string} moduleId - ID modul
 * @returns {object} Statistik progress
 */
function getModuleProgressStats(moduleId) {
    const data = window.loadActiveStudentData();
    const cms = window.loadCMSContent();
    
    if (!data || !data.modules[moduleId] || !cms.modules[moduleId]) {
        return null;
    }

    const studentModule = data.modules[moduleId];
    const progressStatus = studentModule.progressStatus || {};
    const moduleData = cms.modules[moduleId];
    
    const materiSteps = moduleData.materi.filter(item => 
        item.type === 'text' || item.type === 'video' || item.type === 'image'
    );
    
    let completed = 0;
    let viewed = 0;
    let total = materiSteps.length;
    
    materiSteps.forEach(step => {
        const stepId = step.id;
        if (progressStatus[stepId] === 'completed') {
            completed++;
        } else if (progressStatus[stepId] === 'viewed') {
            viewed++;
        }
    });
    
    return {
        completed,
        viewed,
        total,
        progress: studentModule.progress,
        status: studentModule.status
    };
}

// =======================================================
// III. OBSERVER UNTUK AUTO-TRACKING SCROLL
// =======================================================

/**
 * Mengatur Intersection Observer untuk melacak langkah mana yang sedang dilihat
 * @param {string} moduleId - ID modul saat ini
 */
function setupScrollObserver(moduleId) {
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.6 // 60% dari elemen terlihat
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const stepId = entry.target.id;
                if (stepId) {
                    // Tandai sebagai dilihat saat scroll
                    markStepAsViewed(stepId, moduleId);
                }
            }
        });
    }, options);
    
    // Observe semua section konten
    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach(section => {
        observer.observe(section);
    });
    
    return observer;
}

// =======================================================
// IV. INITIALIZATION & EXPORT
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    // Expose fungsi ke window
    window.updateStepProgress = updateStepProgress;
    window.renderModuleProgress = renderModuleProgress;
    window.markStepAsViewed = markStepAsViewed;
    window.getModuleProgressStats = getModuleProgressStats;
    window.setupScrollObserver = setupScrollObserver;
    
    // Auto-initialize jika di halaman module
    if (window.location.pathname.includes('module.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const moduleId = urlParams.get('id');
        
        if (moduleId) {
            // Setup scroll observer setelah konten dimuat
            setTimeout(() => {
                setupScrollObserver(moduleId);
            }, 1000);
        }
    }
});