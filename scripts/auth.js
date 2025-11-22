/**
 * scripts/auth.js
 * Mengelola Otentikasi (Register, Login Murid, Login Guru) dan Sesi Pengguna.
 * * Kunci: 
 * - Menyimpan akun di localStorage (USER_ACCOUNTS_KEY).
 * - Menyimpan sesi aktif di localStorage (ACTIVE_SESSION_KEY).
 * - Membutuhkan window.initStudentData() dari app.js saat registrasi.
 */

// =======================================================
// KONSTANTA & KUNCI PENYIMPANAN
// =======================================================

const USER_ACCOUNTS_KEY = 'ppknUserAccounts';
const ACTIVE_SESSION_KEY = 'ppknActiveSession';

// Sandi Guru Sederhana (sesuai permintaan, tanpa enkripsi di sini)
const GURU_PASSWORD = 'GuruPancasila2025'; 

// =======================================================
// FUNGIONALITAS DASAR SESSIONS & DATA
// =======================================================

/**
 * Memuat semua akun murid yang tersimpan.
 * @returns {Array} Daftar akun murid
 */
function loadUserAccounts() {
    const dataString = localStorage.getItem(USER_ACCOUNTS_KEY);
    return dataString ? JSON.parse(dataString) : [];
}

/**
 * Menyimpan daftar akun murid.
 * @param {Array} accounts - Daftar akun yang diperbarui
 */
function saveUserAccounts(accounts) {
    localStorage.setItem(USER_ACCOUNTS_KEY, JSON.stringify(accounts));
}

/**
 * Menyimpan data sesi pengguna yang sedang aktif.
 * @param {object} sessionData - { id: 'uniqueId', username: 'nama', role: 'murid'/'guru' }
 */
function setActiveSession(sessionData) {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(sessionData));
}

/**
 * Memuat data sesi aktif.
 * @returns {object|null} Data sesi atau null jika tidak ada sesi aktif
 */
function getActiveSession() {
    const dataString = localStorage.getItem(ACTIVE_SESSION_KEY);
    return dataString ? JSON.parse(dataString) : null;
}

/**
 * Menghapus sesi aktif (Logout).
 */
function logout() {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    alert("Anda telah keluar dari sesi.");
    
    // Perbaikan navigasi: Mengarahkan ke halaman login yang relatif aman
    // Asumsi file ini dipanggil dari folder 'scripts', sehingga 'login.html' ada di ../pages/login.html
    const currentPath = window.location.pathname;
    if (currentPath.includes('/pages/')) {
        window.location.href = 'login.html'; // Jika dipanggil dari admin.html atau modul
    } else {
        window.location.href = 'pages/login.html'; // Jika dipanggil dari index.html
    }
}

/**
 * Memastikan pengguna memiliki peran tertentu atau diarahkan ke login.
 * @param {string} requiredRole - 'murid', 'guru', atau 'any'
 */
function checkAuthentication(requiredRole = 'any') {
    const session = getActiveSession();
    const currentPage = window.location.pathname.split('/').pop();

    // 1. Jika tidak ada sesi (Perlu Login)
    if (requiredRole !== 'none' && !session) {
        if (currentPage !== 'login.html' && currentPage !== 'register.html') {
            // Asumsi login.html ada di pages/
            window.location.href = '../pages/login.html'; 
        }
    } 
    
    // 2. Jika pengguna login tetapi mencoba mengakses halaman login/register
    else if (session && (currentPage === 'login.html' || currentPage === 'register.html')) {
        // Arahkan ke dashboard yang sesuai
        window.location.href = session.role === 'guru' ? 'admin.html' : '../index.html';
    } 
    
    // 3. Jika peran tidak sesuai (misalnya murid mencoba akses admin.html)
    else if (session && requiredRole !== 'any' && session.role !== requiredRole) {
        window.location.href = session.role === 'guru' ? 'admin.html' : '../index.html';
    }
    
    return session;
}


// =======================================================
// FUNGSI PENANGANAN FORM (Events)
// =======================================================

/**
 * Menangani pendaftaran akun murid baru.
 */
function handleRegister(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('registerFullname').value.trim();
    const username = document.getElementById('registerUsername').value.trim().toLowerCase();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const classGrade = document.getElementById('classGrade').value;

    if (password !== confirmPassword) {
        alert("Konfirmasi kata sandi tidak cocok!");
        return;
    }
    if (password.length < 6) {
        alert("Kata sandi minimal 6 karakter.");
        return;
    }
    if (!classGrade) {
        alert("Mohon pilih kelas.");
        return;
    }

    let accounts = loadUserAccounts();
    
    // Cek apakah username sudah terdaftar
    if (accounts.some(account => account.username === username)) {
        alert("Username ini sudah digunakan. Mohon pilih yang lain.");
        return;
    }
    
    // Buat akun baru (Simpan sandi sebagai plain text untuk simulasi)
    const newAccount = {
        id: Date.now().toString(), // ID unik
        username: username,
        password: password, 
        fullName: fullName,
        grade: classGrade,
        role: 'murid'
    };
    
    accounts.push(newAccount);
    saveUserAccounts(accounts);

    // Otomatis login setelah pendaftaran berhasil
    setActiveSession({ id: newAccount.id, username: username, role: 'murid' });
    
    alert("Pendaftaran berhasil! Selamat datang, " + fullName + ".");
    
    // Panggil fungsi untuk inisialisasi data progres siswa di app.js
    if (window.initStudentData) {
        window.initStudentData(newAccount.id);
    }

    // Redirect ke dashboard murid (index.html ada di root)
    window.location.href = '../index.html'; 
}

/**
 * Menangani login akun murid.
 */
function handleMuridLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('muridUsername').value.trim().toLowerCase();
    const password = document.getElementById('muridPassword').value;

    const accounts = loadUserAccounts();
    const user = accounts.find(acc => acc.username === username && acc.password === password);

    if (user && user.role === 'murid') {
        setActiveSession({ id: user.id, username: user.username, role: 'murid' });
        alert("Login Murid berhasil!");
        window.location.href = '../index.html'; 
    } else {
        alert("Username atau kata sandi murid salah.");
    }
}

/**
 * Menangani login akun guru (hanya sandi).
 */
function handleGuruLogin(event) {
    event.preventDefault();
    
    const password = document.getElementById('guruPassword').value;

    if (password === GURU_PASSWORD) {
        // ID unik untuk guru
        const guruId = 'ADMIN-GURU-1'; 
        setActiveSession({ id: guruId, username: 'GURU_PPKN', role: 'guru' });
        alert("Login Guru berhasil! Selamat datang di Dashboard Admin.");
        window.location.href = 'admin.html'; // Redirect ke dashboard guru
    } else {
        alert("Kata Sandi Guru salah.");
    }
}


// =======================================================
// INITIALIZATION (MEMASANG EVENT LISTENER)
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    // ⚠️ Perbaikan: Memasang semua event listener form di sini
    
    // A. Pendaftaran
    const registerForm = document.getElementById('formMuridRegister');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // B. Login Murid
    const muridLoginForm = document.getElementById('formMuridLogin');
    if (muridLoginForm) {
        muridLoginForm.addEventListener('submit', handleMuridLogin);
    }

    // C. Login Guru
    const guruLoginForm = document.getElementById('formGuruLogin');
    if (guruLoginForm) {
        guruLoginForm.addEventListener('submit', handleGuruLogin);
    }
    
    // D. Expose fungsi sesi dan logout ke window
    window.logout = logout;
    window.getActiveSession = getActiveSession;
    window.loadUserAccounts = loadUserAccounts; // untuk digunakan admin-cms.js
});

// Expose fungsi autentikasi untuk digunakan di halaman lain
window.checkAuthentication = checkAuthentication;