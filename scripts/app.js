/**
 * scripts/app.js
 * Mengelola Data Global Siswa (Multi-User) dan Konten Dinamis (CMS Ready).
 * Membutuhkan fungsi getActiveSession() dari auth.js.
 */

// =======================================================
// DEKLARASI KONSTANTA DAN VARIABEL DEFAULT
// =======================================================

// Kunci penyimpanan utama untuk SEMUA data siswa (Multi-User)
const STUDENTS_DATA_KEY = 'ppknStudentsData';
// Kunci penyimpanan untuk konten yang di-manage oleh Guru (CMS)
const CMS_CONTENT_KEY = 'ppknCMSContent';

// Struktur data default untuk siswa BARU
const DEFAULT_STUDENT_STATE = {
    points: 0,
    overallProgress: 0, 
    // Modul di sini mencerminkan ID modul yang harus dilalui siswa.
    // Dibiarkan kosong. Logika initStudentData akan mengecek CMS untuk Modul yang ada.
    modules: {
        // "norma": { status: "not_started", progress: 0, score: 0 },
        // "ham": { status: "not_started", progress: 0, score: 0 }
    },
    badges: ["Pahlawan Baru"], 
    totalModules: 0, // Awalnya nol
    challenges: {
        quick_challenge: { attempted: false, lastScore: 0, timeTaken: 0 }
    },
    arenaPoints: 0 // Poin khusus untuk Arena Pancasila
};

// Struktur default untuk konten yang dikelola Guru (CMS)
const DEFAULT_CMS_CONTENT = {
    // Daftar semua modul yang tersedia (kunci utama)
    modules: {
        // "norma": { /* ... KOSONG ... */ },
        // "ham": { /* ... KOSONG ... */ }
    },
    
    // Semua soal kuis dikumpulkan di sini
    quizzes: {
        // "norma_quiz": [ /* ... KOSONG ... */ ]
    },
    
    // Data arena/leaderboard (kosong, diisi otomatis)
    leaderboard: [],
    
    // Daftar link/key aktivitas spesifik
    activities: {
        // "drag_drop_norma": { /* ... */ }
    },
    
    // Data forum diskusi
    forumTopics: [],
    
    // Data dilema etika
    dilemmas: {
        current: null,
        votes: {}
    }
};

const MAX_POINTS_PER_MODULE = 100;

// =======================================================
// I. FUNGSI UTAMA PENGELOLAAN DATA GLOBAL (Multi-User)
// =======================================================

/**
 * Memuat semua data murid dari Local Storage.
 * @returns {object} Objek berisi data dari semua murid { 'id_murid_1': {...}, 'id_murid_2': {...} }
 */
function loadAllStudentsData() {
    const dataString = localStorage.getItem(STUDENTS_DATA_KEY);
    return dataString ? JSON.parse(dataString) : {};
}

/**
 * Menyimpan semua data murid ke Local Storage.
 * @param {object} allData - Data semua murid yang diperbarui
 */
function saveAllStudentsData(allData) {
    localStorage.setItem(STUDENTS_DATA_KEY, JSON.stringify(allData));
}

/**
 * Memuat data CMS (Konten Materi & Soal)
 * @returns {object} Data konten CMS
 */
function loadCMSContent() {
    const dataString = localStorage.getItem(CMS_CONTENT_KEY);
    return dataString ? JSON.parse(dataString) : DEFAULT_CMS_CONTENT;
}

/**
 * Menyimpan data CMS.
 * @param {object} content - Data CMS yang diperbarui
 */
function saveCMSContent(content) {
    localStorage.setItem(CMS_CONTENT_KEY, JSON.stringify(content));
}

// =======================================================
// II. FUNGSI DATA MURID AKTIF
// =======================================================

/**
 * Memuat data dari murid yang sedang aktif.
 * @returns {object|null} Data murid aktif atau null jika tidak ada sesi murid
 */
function loadActiveStudentData() {
    if (typeof window.getActiveSession !== 'function') {
        console.error("auth.js belum dimuat atau fungsi getActiveSession tidak ada.");
        return null;
    }
    
    const session = window.getActiveSession();
    if (!session || session.role !== 'murid') {
        return null; // Hanya muat data jika peran adalah murid
    }
    
    const allData = loadAllStudentsData();
    const studentData = allData[session.id] || {};
    
    // Gabungkan data tersimpan dengan default state (untuk memastikan semua field ada)
    return { ...DEFAULT_STUDENT_STATE, ...studentData, 
             userName: session.username, 
             id: session.id };
}

/**
 * Menyimpan data murid aktif.
 * @param {object} data - Data murid aktif yang diperbarui
 */
function saveActiveStudentData(data) {
    if (!data || !data.id) return;
    
    const allData = loadAllStudentsData();
    // Simpan data murid aktif ke objek global menggunakan ID sebagai kunci
    allData[data.id] = data; 
    saveAllStudentsData(allData);
}

/**
 * Menginisialisasi data progres siswa baru.
 * @param {string} userId - ID murid yang baru terdaftar
 * @param {string} userName - Nama pengguna dari akun yang baru didaftarkan
 */
function initStudentData(userId, userName) {
    const allData = loadAllStudentsData();
    
    if (!allData[userId]) {
        // 1. Ambil list Modul yang telah dibuat oleh Guru dari CMS
        const cms = loadCMSContent();
        const availableModules = cms.modules || {};
        const studentModules = {};
        
        // 2. Buat kerangka progres untuk setiap modul yang tersedia
        for (const moduleId in availableModules) {
            studentModules[moduleId] = {
                status: "not_started", 
                progress: 0, 
                score: 0 
            };
        }

        allData[userId] = { 
            ...DEFAULT_STUDENT_STATE, 
            id: userId,
            userName: userName || 'Siswa Baru',
            modules: studentModules, // Isi dengan kerangka Modul dari CMS
            totalModules: Object.keys(studentModules).length // Hitung total modul
        };
        saveAllStudentsData(allData);
        return allData[userId];
    }
    return allData[userId];
}

// =======================================================
// III. LOGIKA PROGRESS & SCORE (Dipanggil dari Quiz/Modul)
// =======================================================

/**
 * Menghitung dan memperbarui progress keseluruhan (0-100%).
 * Dipanggil setiap kali ada perubahan skor modul.
 * @param {object} data - Data murid saat ini
 */
function recalculateOverallProgress(data) {
    let completedModules = 0;
    
    for (const moduleId in data.modules) {
        if (data.modules[moduleId].status === 'completed') {
            completedModules++;
        }
    }
    
    const newOverallProgress = Math.floor((completedModules / data.totalModules) * 100);
    data.overallProgress = newOverallProgress;
}

/**
 * Fungsi utama yang dipanggil setelah kuis/aktivitas selesai.
 * @param {string} moduleId - ID modul yang baru selesai (misalnya: 'norma')
 * @param {number} gainedPoints - Poin yang diperoleh dari kuis
 */
function updateModuleScore(moduleId, gainedPoints) {
    const data = loadActiveStudentData();
    if (!data) return alert("Anda harus login sebagai murid untuk menyimpan progres.");
    
    const module = data.modules[moduleId];

    if (!module) {
        console.error("Modul ID tidak valid:", moduleId);
        return;
    }

    // 1. Update skor dan status modul
    module.score = Math.min(MAX_POINTS_PER_MODULE, module.score + gainedPoints);
    module.progress = 100; 
    module.status = 'completed';

    // 2. Update total poin siswa
    data.points += gainedPoints;

    // 3. Recalculate progress keseluruhan
    recalculateOverallProgress(data);
    
    // 4. Periksa Badge baru
    checkForNewBadges(data);

    // 5. Simpan data
    saveActiveStudentData(data);
    
    // Jika di dashboard, render ulang
    if (window.location.pathname.endsWith('index.html')) {
        renderDashboard();
    }
}

/**
 * Memperbarui progress parsial modul (bukan menyelesaikan)
 * @param {string} moduleId - ID modul
 * @param {number} newProgress - Progress baru (0-100)
 */
function updateModuleProgress(moduleId, newProgress) {
    const data = loadActiveStudentData();
    if (!data || !data.modules[moduleId]) return;
    
    data.modules[moduleId].progress = Math.min(100, newProgress);
    
    // Update status berdasarkan progress
    if (newProgress >= 100) {
        data.modules[moduleId].status = 'completed';
    } else if (newProgress > 0) {
        data.modules[moduleId].status = 'in_progress';
    }
    
    saveActiveStudentData(data);
}

/**
 * Menambahkan badge jika kriteria tertentu terpenuhi.
 * @param {object} data - Data murid saat ini
 */
function checkForNewBadges(data) {
    // Kriteria 1: Poin total mencapai 100
    if (data.points >= 100 && !data.badges.includes("Warga Aktif")) {
        data.badges.push("Warga Aktif");
        alert("🎉 SELAMAT! Anda mendapatkan badge baru: Warga Aktif!");
    }
    
    // Kriteria 2: Selesaikan Modul pertama yang terdaftar (kriteria fleksibel)
    const firstModuleId = Object.keys(data.modules)[0];
    if (firstModuleId && data.modules[firstModuleId].status === 'completed' && !data.badges.includes("Pakar Modul Awal")) {
        data.badges.push("Pakar Modul Awal");
        alert("🎉 SELAMAT! Anda mendapatkan badge baru: Pakar Modul Awal!");
    }
    
    // Kriteria 3: Poin Arena mencapai 200
    if (data.arenaPoints >= 200 && !data.badges.includes("Juara Arena")) {
        data.badges.push("Juara Arena");
        alert("🎉 SELAMAT! Anda mendapatkan badge baru: Juara Arena!");
    }
}

// =======================================================
// IV. FUNGSI UNTUK UPDATE TAMPILAN DASHBOARD
// =======================================================

/**
 * Mengupdate semua elemen HTML di Dashboard dengan data murid aktif terbaru.
 */
function renderDashboard() {
    const data = loadActiveStudentData();
    if (!data) {
        // Jika tidak login sebagai murid, redirect ke login
        window.location.href = 'pages/login.html'; 
        return;
    }
    
    // 1. Update Nama dan Poin
    const userNameElement = document.getElementById('userName');
    if (userNameElement) userNameElement.textContent = data.userName;
    
    const userPointsElement = document.getElementById('userPoints');
    if (userPointsElement) userPointsElement.textContent = data.points;
    
    // 2. Update Progress Bar Utama (SVG Ring)
    const overallProgress = data.overallProgress;
    const progressRing = document.getElementById('overallProgressRing');
    const progressText = document.getElementById('progressText');
    
    if (progressRing && progressText) {
        const circumference = 2 * Math.PI * 50; 
        const offset = circumference - (overallProgress / 100) * circumference;
        progressRing.style.strokeDashoffset = offset;
        progressText.textContent = `${overallProgress}%`;
    }

    // 3. Update Status Modul Selesai
    const modulesCompletedElement = document.getElementById('modulesCompleted');
    if (modulesCompletedElement) {
        let completedCount = 0;
        for (const moduleId in data.modules) {
            if (data.modules[moduleId].status === 'completed') {
                completedCount++;
            }
        }
        modulesCompletedElement.textContent = `${completedCount}`;
    }

    // 4. Update Badge Display
    const badgeContainer = document.getElementById('badgeContainer');
    if (badgeContainer) {
        badgeContainer.innerHTML = ''; 
        data.badges.slice(0, 3).forEach(badge => {
            const badgeItem = document.createElement('div');
            badgeItem.classList.add('badge-item');
            badgeItem.textContent = badge;
            badgeContainer.appendChild(badgeItem);
        });
        
        while (badgeContainer.children.length < 3) {
            const emptyBadge = document.createElement('div');
            emptyBadge.classList.add('badge-item', 'empty');
            emptyBadge.textContent = '...';
            badgeContainer.appendChild(emptyBadge);
        }
    }
    
    // 5. Update Rekomendasi Modul & Papan Peringkat
    renderRecommendations(data);
    renderLeaderboard(data);
}

// Fungsi bantu untuk merender Rekomendasi Modul
function renderRecommendations(data) {
    const currentModuleTitle = document.getElementById('currentModuleTitle');
    const moduleRecommendationLink = document.querySelector('.module-recommendation .btn-primary');
    
    let nextModuleId = null;
    let moduleProgress = 0;

    // 🔥 PERBAIKAN KRUSIAL: Pastikan ada modul yang tersedia
    if (data.totalModules > 0) {
        for (const moduleId in data.modules) {
            const module = data.modules[moduleId];
            if (module.status !== 'completed') {
                nextModuleId = moduleId;
                moduleProgress = module.progress;
                break; 
            }
        }
    }
    
    if (currentModuleTitle) {
        // Load CMS untuk mendapatkan judul modul resmi
        const cms = loadCMSContent(); 
        
        if (nextModuleId) {
            // Ambil Judul dari struktur CMS yang baru
            const moduleTitle = cms.modules[nextModuleId] ? cms.modules[nextModuleId].title : `Modul ${nextModuleId.toUpperCase()}`;
            
            currentModuleTitle.textContent = `${moduleTitle} (${moduleProgress}%)`;
            
            // 🔥 PERBAIKAN: Link ke template dinamis module.html dengan path yang benar
            moduleRecommendationLink.href = `pages/module.html?id=${nextModuleId}`; 
            
            document.querySelector('.module-recommendation p').textContent = `Anda telah menyelesaikan ${moduleProgress}% dari modul ini.`;
        } else {
            // Logika Modul Selesai
            currentModuleTitle.textContent = "Semua Modul Selesai!";
            moduleRecommendationLink.textContent = "Lihat Peringkat Akhir →";
            document.querySelector('.module-recommendation p').textContent = "Selamat! Anda telah menyelesaikan semua modul yang tersedia.";
            moduleRecommendationLink.href = 'pages/arena-pancasila.html';
        }
    }
}

// Fungsi bantu untuk merender Papan Peringkat
function renderLeaderboard(data) {
    const allStudentsData = loadAllStudentsData();
    const allUsers = Object.values(allStudentsData);

    // Ambil nama dan poin dari SEMUA murid
    const combinedData = allUsers.map(student => ({
        username: student.userName,
        score: student.points,
        isCurrentUser: student.id === data.id 
    }));
    
    // Urutkan berdasarkan skor
    combinedData.sort((a, b) => b.score - a.score); 
    
    const listElement = document.querySelector('.leaderboard-list');
    if (!listElement) return;

    listElement.innerHTML = '';
    combinedData.slice(0, 5).forEach((item, index) => {
        let rank = index + 1;
        let badge = '';
        if (rank === 1) badge = '🥇';
        else if (rank === 2) badge = '🥈';
        else if (rank === 3) badge = '🥉';
        
        const listItem = document.createElement('li');
        
        // Cek apakah item adalah pengguna aktif untuk penandaan "Anda"
        const isCurrentUser = item.isCurrentUser;
        const userNameDisplay = isCurrentUser ? 'Anda' : item.username;
        
        // Render item leaderboard
        const rankDisplay = (rank <= 3) ? badge : `${rank}.`;
        
        // Render final: Menggabungkan rank/badge, nama, dan skor
        listItem.innerHTML = `${rankDisplay} ${userNameDisplay} (${item.score} Poin)`;
        
        listElement.appendChild(listItem);
    });
}

// =======================================================
// V. FUNGSI UTILITAS TAMBAHAN
// =======================================================

/**
 * Menambahkan poin arena untuk siswa aktif
 * @param {number} points - Poin yang akan ditambahkan
 */
function addArenaPoints(points) {
    const data = loadActiveStudentData();
    if (!data) return;
    
    data.arenaPoints = (data.arenaPoints || 0) + points;
    saveActiveStudentData(data);
    
    // Update tampilan jika di halaman arena
    if (window.location.pathname.includes('arena-pancasila.html')) {
        const arenaPointsElement = document.getElementById('arenaPoints');
        if (arenaPointsElement) {
            arenaPointsElement.textContent = data.arenaPoints;
        }
    }
}

/**
 * Mendapatkan statistik progress siswa
 * @returns {object} Statistik progress
 */
function getProgressStats() {
    const data = loadActiveStudentData();
    if (!data) return null;
    
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;
    
    for (const moduleId in data.modules) {
        const module = data.modules[moduleId];
        if (module.status === 'completed') completed++;
        else if (module.status === 'in_progress') inProgress++;
        else notStarted++;
    }
    
    return {
        completed,
        inProgress,
        notStarted,
        total: data.totalModules,
        overallProgress: data.overallProgress
    };
}

// =======================================================
// VI. INITIALIZATION & EXPORT
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil Sesi Aktif
    const session = window.getActiveSession && window.getActiveSession(); 
    
    if (session && session.role === 'murid') {
        // 2. Render Dashboard jika sudah login sebagai murid
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
            renderDashboard();
        }
    } else if (!session && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/')) {
        // Fallback jika tidak ada sesi di halaman dashboard
        window.location.href = 'pages/login.html'; 
    }
});

// Expose fungsi-fungsi penting ke global window

// 1. DATA SISWA AKTIF (Untuk Dashboard, Modul, Arena)
window.loadActiveStudentData = loadActiveStudentData;
window.saveActiveStudentData = saveActiveStudentData;
// Menambahkan alias untuk kompatibilitas dengan module-progress.js, quiz.js, dll.
window.loadStudentData = loadActiveStudentData; 
window.saveStudentData = saveActiveStudentData;

// 2. DATA GLOBAL & CMS (Untuk Admin & Global Logic)
window.loadAllStudentsData = loadAllStudentsData; 
window.saveAllStudentsData = saveAllStudentsData; 
window.loadCMSContent = loadCMSContent;
window.saveCMSContent = saveCMSContent;
window.DEFAULT_CMS_CONTENT = DEFAULT_CMS_CONTENT; 

// 3. FUNGSI INTI LOGIKA & PROGRES
window.updateModuleScore = updateModuleScore;
window.updateModuleProgress = updateModuleProgress;
window.initStudentData = initStudentData;

// 4. FUNGSI UTILITAS TAMBAHAN
window.addArenaPoints = addArenaPoints;
window.getProgressStats = getProgressStats;
window.recalculateOverallProgress = recalculateOverallProgress;
window.checkForNewBadges = checkForNewBadges;
