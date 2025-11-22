/**
 * scripts/admin-cms.js
 * Logika CMS (Content Management System) untuk Dashboard Guru.
 * Mengelola: Data Siswa, Konten Modul, dan Soal Kuis (semua dinamis).
 * Membutuhkan: app.js (load/save data) dan auth.js (logout).
 */

// =======================================================
// I. FUNGSI MANAJEMEN DATA SISWA (Tab 1)
// =======================================================

/**
 * Merender daftar semua murid dan progres mereka ke tabel.
 */
function renderStudentManagement() {
    // Pastikan fungsi utama tersedia
    if (typeof window.loadAllStudentsData !== 'function' || typeof window.loadUserAccounts !== 'function') {
        document.querySelector('#studentListTable tbody').innerHTML = '<tr><td colspan="5">Error: Fungsi data inti belum termuat.</td></tr>';
        return;
    }
    
    const allStudentProgress = window.loadAllStudentsData();
    const allUserAccounts = window.loadUserAccounts(); // Membutuhkan fungsi loadUserAccounts dari auth.js
    const tableBody = document.querySelector('#studentListTable tbody');
    const totalCountElement = document.getElementById('totalStudentsCount');
    
    if (!tableBody || !totalCountElement) return;

    tableBody.innerHTML = ''; // Kosongkan tabel lama
    const studentsArray = [];

    // Gabungkan data akun (username, kelas) dengan data progres
    allUserAccounts.forEach(user => {
        if (user.role === 'murid') {
            // Menggunakan struktur data siswa yang sudah diinisialisasi
            const progress = allStudentProgress[user.id] || { 
                points: 0, 
                modules: {}, 
                totalModules: 0 
            }; 
            studentsArray.push({
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                grade: user.grade,
                points: progress.points,
                overallProgress: progress.overallProgress,
                modules: progress.modules
            });
        }
    });

    totalCountElement.textContent = studentsArray.length;

    if (studentsArray.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Belum ada murid yang terdaftar.</td></tr>';
        return;
    }

    studentsArray.forEach(student => {
        let completedModulesCount = 0;
        const totalModules = Object.keys(student.modules).length;

        for (const moduleId in student.modules) {
            if (student.modules[moduleId].status === 'completed') {
                completedModulesCount++;
            }
        }

        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${student.fullName} (${student.username})</td>
            <td>${student.grade}</td>
            <td>${student.points}</td>
            <td>${completedModulesCount} / ${totalModules}</td>
            <td>
                <button onclick="resetSingleStudentProgress('${student.id}')" class="btn btn-secondary btn-small" style="background-color: #ff9800; color: white; margin: 0;">Reset Poin</button>
            </td>
        `;
    });
}

/**
 * Mereset poin dan progres untuk satu murid tertentu. (Membutuhkan fungsi di app.js)
 */
function resetSingleStudentProgress(studentId) {
    if (!confirm("Yakin ingin mereset poin dan progres murid ini?")) {
        return;
    }
    // TODO: Implementasi reset yang sesungguhnya harus ada di app.js
    alert(`Progres murid ID: ${studentId} berhasil direset (Placeholder).`);
    renderStudentManagement(); // Render ulang tabel
}

/**
 * Mereset poin dan progres SEMUA murid. (Aksi Resiko Tinggi)
 */
function resetAllStudentProgress() {
    if (!confirm("⚠️ PERINGATAN! Anda akan menghapus poin dan progres SEMUA murid. Lanjutkan?")) {
        return;
    }
    // TODO: Implementasi reset yang sesungguhnya harus ada di app.js
    alert("Semua progres dan poin murid berhasil direset ke status awal (Placeholder).");
    renderStudentManagement();
}

/**
 * Mereset SEMUA konten CMS ke nilai default.
 */
function resetCMSContent() {
     if (!confirm("⚠️ PERINGATAN! Tindakan ini akan menghapus SEMUA MATERI, SOAL KUIS, DAN AKTIVITAS yang sudah Anda input dan mengembalikannya ke default. Lanjutkan?")) {
        return;
    }
    
    // Asumsikan window.DEFAULT_CMS_CONTENT tersedia dari app.js
    window.saveCMSContent(window.DEFAULT_CMS_CONTENT);
    alert("Konten CMS berhasil direset ke default.");
    
    // Render ulang tampilan setelah reset (menggunakan string kosong karena tidak ada dropdown)
    renderModuleManagement('');
    renderQuizManagement('');
}


// =======================================================
// II. FUNGSI MANAJEMEN MATERI MODUL (Tab 2)
// =======================================================

/**
 * Merender konten modul yang tersimpan saat ini dan form tambah konten.
 * @param {string} moduleId - ID modul yang akan dikelola (misalnya: 'norma')
 */
function renderModuleManagement(moduleId) {
    const cms = window.loadCMSContent();
    const module = cms.modules[moduleId];
    const previewDiv = document.getElementById('activeContentPreview');
    const titleInput = document.getElementById('moduleTitle');
    
    // KODE BARU: Tangani jika ID Modul kosong
    if (!moduleId || moduleId.trim() === '') {
        titleInput.value = '';
        previewDiv.innerHTML = '<p style="font-style: italic; text-align: center;">Masukkan ID Modul di atas untuk memulai atau mengelola.</p>';
        return;
    }
    
    // Menghapus elemen modul yang tidak terdaftar saat ini agar tidak membingungkan guru
    if (!module) {
        titleInput.value = ''; // Kosongkan input judul agar guru mengisinya
        previewDiv.innerHTML = `<p style="font-style: italic; color: #ff9800; text-align: center;">ID Modul: <strong>${moduleId.toUpperCase()}</strong> BELUM TERDAFTAR. Isi Judul di atas dan klik "Tambah Konten" untuk mendaftarkannya.</p>`;
        return;
    }

    // Jika Modul ada:
    titleInput.value = module.title;
    previewDiv.innerHTML = ''; // Kosongkan pratinjau

    if (!module.materi || module.materi.length === 0) {
        previewDiv.innerHTML = '<p style="font-style: italic; text-align: center;">Modul ini belum memiliki konten materi. Silakan tambahkan.</p>';
        return;
    }

    // Render daftar konten aktif
    module.materi.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.style.border = '1px solid #ccc';
        itemDiv.style.padding = '15px';
        itemDiv.style.marginBottom = '10px';
        itemDiv.style.borderRadius = '6px';
        
        // Tampilkan Tipe Konten
        let contentHTML = `<strong>${index + 1}. [${item.type.toUpperCase()}] - ${item.title}</strong>`;

        if (item.type === 'text' || item.type === 'image') {
            contentHTML += `<p>${item.content || item.url}</p>`;
        } else if (item.type === 'video') {
            contentHTML += `<p>URL Video: <a href="${item.url}" target="_blank">${item.url}</a></p>`;
        } else if (item.type === 'activity' || item.type === 'quiz') {
            const key = item.activity_key || item.quiz_key;
            contentHTML += `<p>KEY: <code>${key}</code> (Link Cerdas)</p>`;
        }
        
        contentHTML += `<button onclick="removeModuleContent('${moduleId}', '${item.id}')" class="btn btn-secondary btn-small" style="float:right; background-color: #f44336; color: white;">Hapus</button>`;
        itemDiv.innerHTML = contentHTML;
        previewDiv.appendChild(itemDiv);
    });
}

/**
 * Menambahkan item konten baru ke modul.
 */
function addModuleContent() {
    // KODE BARU: Ambil ID dari input field 'moduleIdInput'
    const moduleId = document.getElementById('moduleIdInput').value.trim().toLowerCase(); 
    
    const moduleTitle = document.getElementById('moduleTitle').value.trim();
    const itemTitle = document.getElementById('contentItemTitle').value.trim();
    const type = document.getElementById('contentType').value;
    
    // KODE BARU: Validasi ID Modul
    if (!moduleId || moduleId.trim() === '') {
        alert("ID Modul tidak boleh kosong. Mohon masukkan ID di bagian atas.");
        return;
    }
    
    if (!moduleTitle || !itemTitle) {
        alert("Judul Modul dan Judul Sub-Bagian tidak boleh kosong.");
        return;
    }
    
    let inputContent = '';
    let activityKey = '';

    // Ambil input sesuai tipe konten
    if (type === 'activity' || type === 'quiz') {
        // Karena dropdown selector dihapus, kita butuh input key di admin.html
        // ASUMSI: Key sudah dibuat, atau guru mengetiknya langsung di input text
        const keyInput = document.getElementById('contentKey'); 
        if (!keyInput || !keyInput.value) {
            alert(`Mohon masukkan Key ${type.toUpperCase()} (misal: norma_quiz_final).`);
            return;
        }
        activityKey = keyInput.value.trim();
    } else {
        const inputArea = document.getElementById('contentInput');
        inputContent = inputArea.value.trim();
        if (!inputContent) {
            alert("Isi konten tidak boleh kosong.");
            return;
        }
    }
    
    const cms = window.loadCMSContent();
    
    // Inisialisasi Modul jika belum ada
    if (!cms.modules[moduleId]) {
        cms.modules[moduleId] = { title: moduleTitle, materi: [] };
    } else {
        // Update judul modul jika sudah ada
        cms.modules[moduleId].title = moduleTitle;
    }

    // Buat item konten baru
    const newItem = {
        type: type,
        title: itemTitle,
        id: 'c' + Date.now().toString(), // ID unik konten
    };

    if (type === 'text') {
        newItem.content = inputContent;
    } else if (type === 'video' || type === 'image') {
        newItem.url = inputContent;
    } else if (type === 'activity') {
        newItem.activity_key = activityKey;
    } else if (type === 'quiz') {
        newItem.quiz_key = activityKey;
    }
    
    cms.modules[moduleId].materi.push(newItem);
    window.saveCMSContent(cms);
    alert(`Konten baru (${type.toUpperCase()}) berhasil ditambahkan ke Modul ${moduleId.toUpperCase()}!`);
    
    // Render ulang dan bersihkan form input konten
    document.getElementById('contentItemTitle').value = '';
    const contentInput = document.getElementById('contentInput');
    if (contentInput) contentInput.value = '';
    renderModuleManagement(moduleId);
}

/**
 * Menghapus item konten dari modul.
 */
function removeModuleContent(moduleId, contentId) {
    if (!confirm("Yakin ingin menghapus item konten ini?")) {
        return;
    }
    
    const cms = window.loadCMSContent();
    const module = cms.modules[moduleId];
    
    if (module && module.materi) {
        // Filter array materi
        module.materi = module.materi.filter(item => item.id !== contentId);
        window.saveCMSContent(cms);
        alert("Konten berhasil dihapus.");
        renderModuleManagement(moduleId);
    }
}


// =======================================================
// III. FUNGSI MANAJEMEN SOAL KUIS (Tab 3)
// =======================================================

/**
 * Merender daftar soal kuis aktif.
 * @param {string} quizKey - Kunci kuis di CMS (misalnya: 'norma_quiz')
 */
function renderQuizManagement(quizKey) {
    const cms = window.loadCMSContent();
    // KODE BARU: Tangani jika KEY Kuis kosong
    if (!quizKey || quizKey.trim() === '') {
        document.getElementById('totalQuizQuestions').textContent = '0';
        document.querySelector('#quizQuestionTable tbody').innerHTML = '<tr><td colspan="4" style="text-align: center;">Masukkan KEY Kuis di atas untuk memulai atau mengelola.</td></tr>';
        return;
    }
    
    const questions = cms.quizzes[quizKey] || [];
    const tableBody = document.querySelector('#quizQuestionTable tbody');
    const totalCountElement = document.getElementById('totalQuizQuestions');
    
    if (!tableBody || !totalCountElement) return;

    tableBody.innerHTML = ''; 
    totalCountElement.textContent = questions.length;

    if (questions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Belum ada soal kuis yang ditambahkan untuk KEY ini.</td></tr>';
        return;
    }
    
    questions.forEach((q, index) => {
        const row = tableBody.insertRow();
        const optionsText = q.options ? q.options.join('; ') : '';
        
        row.innerHTML = `
            <td>Q${index + 1}</td>
            <td title="${optionsText}">${q.q}</td>
            <td>${q.a}</td>
            <td>
                <button onclick="removeQuizQuestion('${quizKey}', '${q.id}')" class="btn btn-secondary btn-small" style="background-color: #f44336; color: white; margin: 0;">Hapus</button>
            </td>
        `;
    });
}

/**
 * Menambahkan soal kuis baru ke KEY yang sedang dipilih.
 */
function addQuizQuestion() {
    // KODE BARU: Ambil KEY dari input field 'quizKeyInput' (sesuai perubahan di admin.html)
    const quizKey = document.getElementById('quizKeyInput').value.trim().toLowerCase();
    
    const questionText = document.getElementById('questionText').value.trim();
    const correctAnswer = document.getElementById('correctAnswer').value.trim().toUpperCase();
    const optionInputs = document.querySelectorAll('.quiz-option');
    
    // KODE BARU: Validasi KEY Kuis
    if (!quizKey || !questionText || !correctAnswer) {
        alert("KEY Kuis, Pertanyaan, dan Jawaban Benar tidak boleh kosong.");
        return;
    }
    
    const options = [];
    optionInputs.forEach(input => {
        if (input.value.trim()) {
            options.push(input.value.trim());
        }
    });

    if (options.length < 2) {
        alert("Minimal harus ada 2 pilihan jawaban.");
        return;
    }
    
    const cms = window.loadCMSContent();
    // Inisialisasi array kuis jika belum ada untuk key ini (untuk KEY baru)
    cms.quizzes = cms.quizzes || {}; 
    const quizQuestions = cms.quizzes[quizKey] || [];
    
    // Buat soal baru
    const newQuestion = {
        q: questionText,
        a: correctAnswer, // Jawaban benar (A/B/C/D)
        options: options, // Array Pilihan Jawaban
        id: 'q-' + (quizQuestions.length + 1) + '-' + Date.now().toString().slice(-4) // ID unik
    };
    
    quizQuestions.push(newQuestion);
    cms.quizzes[quizKey] = quizQuestions; // Simpan kembali array yang diperbarui
    
    window.saveCMSContent(cms);
    alert(`Soal kuis baru berhasil ditambahkan ke KEY: ${quizKey}!`);
    
    // Reset form dan render ulang
    document.getElementById('formKelolaKuis').reset();
    renderQuizManagement(quizKey);
}

/**
 * Menghapus soal kuis berdasarkan ID.
 */
function removeQuizQuestion(quizKey, questionId) {
    if (!confirm("Yakin ingin menghapus soal kuis ini?")) {
        return;
    }
    
    const cms = window.loadCMSContent();
    let questions = cms.quizzes[quizKey] || [];
    
    // Filter soal yang tidak sesuai ID
    questions = questions.filter(q => q.id !== questionId);
    cms.quizzes[quizKey] = questions;
    
    window.saveCMSContent(cms);
    alert("Soal kuis berhasil dihapus.");
    renderQuizManagement(quizKey);
}


// =======================================================
// IV. INISIALISASI
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    // Expose fungsi ke window untuk diakses oleh admin.html
    window.renderStudentManagement = renderStudentManagement;
    window.resetSingleStudentProgress = resetSingleStudentProgress;
    window.resetAllStudentProgress = resetAllStudentProgress;
    window.resetCMSContent = resetCMSContent;
    
    window.renderModuleManagement = renderModuleManagement;
    window.addModuleContent = addModuleContent;
    window.removeModuleContent = removeModuleContent;
    
    window.renderQuizManagement = renderQuizManagement;
    window.addQuizQuestion = addQuizQuestion;
    window.removeQuizQuestion = removeQuizQuestion;
    
    // KODE BARU: Mengganti fungsi dropdown lama.
    // Memanggil fungsi manajemen dengan string kosong untuk menampilkan tampilan default/kosong
    // dan mengarahkan guru untuk mengetik ID/KEY.
    window.renderModuleManagement(''); 
    window.renderQuizManagement('');
});
