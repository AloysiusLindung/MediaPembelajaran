/**
 * scripts/arena.js
 * Mengelola Otentikasi, Tab Navigasi, Data Dilema, Forum, dan Leaderboard
 * untuk halaman Arena Pancasila (pages/arena-pancasila.html).
 */

const DILEMMA_KEY = 'arenaDilemmaVotes';

// =======================================================
// I. FUNGSI DATA LOKAL (Dilema)
// =======================================================

/**
 * Memuat status voting dilema dari localStorage.
 */
function loadDilemmaData() {
    const dataString = localStorage.getItem(DILEMMA_KEY);
    // Data default simulasi jika belum ada
    return dataString ? JSON.parse(dataString) : {
        votes: { 'A': 45, 'B': 55, 'total': 100 },
        hasVoted: false // Status voting per sesi, akan diisi saat inisialisasi
    };
}

/**
 * Menyimpan status voting dilema.
 */
function saveDilemmaData(data) {
    localStorage.setItem(DILEMMA_KEY, JSON.stringify(data));
}

// =======================================================
// II. MANAJEMEN TAB & RENDER UTAMA
// =======================================================

/**
 * Mengelola perpindahan Tab (Forum, Dilema, Tantangan, Leaderboard).
 */
function openTab(evt, tabId) {
    // 1. Sembunyikan semua tab-content
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));

    // 2. Hilangkan status 'active' dari semua tab-link
    const links = document.querySelectorAll('.tab-link');
    links.forEach(link => link.classList.remove('active'));

    // 3. Tampilkan konten tab yang dipilih
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
    }

    // 4. Set tombol tab yang dipilih menjadi aktif
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add('active');
    } else {
        // Jika dipanggil dari DOMContentLoaded
        const linkToActivate = document.querySelector(`.tab-link[onclick*="'${tabId}'"]`);
        if (linkToActivate) linkToActivate.classList.add('active');
    }
    
    // 5. Render konten spesifik
    if (tabId === 'leaderboard') {
        renderLeaderboard();
    } else if (tabId === 'dilemma') {
        renderDilemmaSection();
    } else if (tabId === 'forum') {
        renderForumTopics();
    }
}

/**
 * Merender data poin murid aktif ke sidebar.
 */
function renderSidebar(session) {
    const data = window.loadActiveStudentData();
    const isGuru = session && session.role === 'guru';

    const pointsElement = document.getElementById('arenaPoints');
    const userNameElement = document.getElementById('userName');

    if (pointsElement) {
        pointsElement.textContent = isGuru ? 'ADMIN' : data.points;
    }
    if (userNameElement) {
        userNameElement.textContent = isGuru ? session.username : data.userName;
    }
    
    // Kontrol tombol Mulai Topik Baru (Hanya untuk Guru)
    const btnMulaiTopik = document.getElementById('btnMulaiTopik');
    if (btnMulaiTopik) {
        btnMulaiTopik.style.display = isGuru ? 'block' : 'none';
        if (isGuru) {
            btnMulaiTopik.addEventListener('click', () => {
                window.location.href = 'buat-topik.html'; 
            });
        }
    }
}

/**
 * Merender status Tantangan Cepat.
 */
function renderChallengeStatus() {
    const data = window.loadActiveStudentData();
    const statusSpan = document.getElementById('userChallengeStatus');
    const btn = document.getElementById('btnStartChallenge');

    if (!data || !statusSpan || !btn) return;

    const challengeData = data.challenges?.quick_challenge;

    if (challengeData && challengeData.attempted) {
        statusSpan.textContent = `Selesai (${challengeData.lastScore} Poin dalam ${challengeData.timeTaken} detik)`;
        btn.textContent = 'Lihat Skor (Selesai)';
        btn.disabled = true;
    } else {
        statusSpan.textContent = 'Belum berpartisipasi';
        btn.textContent = 'Mulai Tantangan Sekarang!';
        btn.disabled = false;
        // Hanya tambahkan event listener jika belum mencoba
        btn.addEventListener('click', () => {
            alert("Waktu mulai dihitung setelah Anda menekan OK!");
            window.location.href = 'tantangan-cepat.html';
        });
    }
}

// =======================================================
// III. FUNGSI MANAJEMEN FORUM (CMS)
// =======================================================

/**
 * Fungsi bantu untuk membuat ID unik Topik
 */
function createUniqueId() {
    return 't' + Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

/**
 * Merender daftar topik di arena-pancasila.html (Tab Forum).
 */
function renderForumTopics() {
    if (typeof window.loadCMSContent !== 'function') return;

    const cms = window.loadCMSContent();
    const topicListDiv = document.getElementById('forumTopicList'); // ID kontainer di arena-pancasila.html
    
    if (!topicListDiv) return;
    
    const topics = cms.topics || []; // Asumsi Guru menyimpan topik di cms.topics
    topicListDiv.innerHTML = '';
    
    if (topics.length === 0) {
        topicListDiv.innerHTML = '<p style="text-align: center; font-style: italic;">Belum ada topik diskusi. Guru dapat membuatnya melalui tombol di atas.</p>';
        return;
    }
    
    topics.forEach(topic => {
        const commentCount = topic.comments ? topic.comments.length : 0;
        
        const topicHTML = `
            <div class="forum-post">
                <h4><a href="diskusi-topik.html?id=${topic.id}">${topic.title}</a></h4>
                <p class="post-meta">
                    Sila Terkait: <strong>${topic.sila}</strong> | Komentar: ${commentCount}
                </p>
                <a href="diskusi-topik.html?id=${topic.id}" class="btn btn-secondary btn-small">Lihat Diskusi →</a>
            </div>
        `;
        topicListDiv.insertAdjacentHTML('beforeend', topicHTML);
    });
}

/**
 * Dipanggil dari buat-topik.html: Menangani submit form topik baru.
 */
function handleNewTopicSubmission(e) {
    e.preventDefault();
    
    // Ambil data dari form buat-topik.html
    const titleElement = document.getElementById('topicTitle');
    const silaElement = document.getElementById('topicSila');
    const descElement = document.getElementById('topicDescription');

    if (!titleElement || !silaElement || !descElement) {
        alert('Form tidak lengkap atau elemen tidak ditemukan.');
        return;
    }

    const title = titleElement.value.trim();
    const sila = silaElement.value;
    const description = descElement.value.trim();
    
    if (!title || !description) {
        alert('Judul dan deskripsi topik tidak boleh kosong.');
        return;
    }
    
    const session = window.getActiveSession && window.getActiveSession();
    const authorName = session ? session.username : 'GURU_PPKN';

    const newTopic = {
        id: createUniqueId(),
        title: title,
        sila: sila,
        description: description,
        author: authorName,
        date: new Date().toLocaleDateString('id-ID'),
        comments: []
    };
    
    // Simpan ke CMS
    if (typeof window.loadCMSContent !== 'function' || typeof window.saveCMSContent !== 'function') {
        alert('Fungsi CMS belum tersedia.');
        return;
    }

    const cms = window.loadCMSContent();
    cms.topics = cms.topics || [];
    cms.topics.unshift(newTopic);
    window.saveCMSContent(cms);
    
    alert(`Topik baru: "${title}" berhasil dibuat!`);
    window.location.href = 'arena-pancasila.html';
}

/**
 * Dipanggil dari diskusi-topik.html: Memuat detail topik dan merender komentarnya.
 */
function loadTopicAndRenderComments() {
    if (typeof window.loadCMSContent !== 'function') return;

    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('id');
    if (!topicId) return;

    const cms = window.loadCMSContent();
    const topics = cms.topics || [];
    const topic = topics.find(t => t.id === topicId);

    const titleEl = document.getElementById('topicTitle'); // Ganti dari topicTitleDisplay
    const silaEl = document.getElementById('topicSila'); // Tambahkan Sila
    const authorEl = document.getElementById('topicAuthor'); // Tambahkan Author
    const dateEl = document.getElementById('topicDate'); // Tambahkan Date
    const descEl = document.getElementById('topicDescription'); // Ganti dari topicDescriptionDisplay
    const commentCountHeaderEl = document.getElementById('commentCountHeader'); // Tambahkan hitungan komentar
    const commentListEl = document.getElementById('commentList'); 
    
    // ... (Logika di bawahnya harus menggunakan variabel baru ini) ...

    if (!topic) {
        if (titleEl) titleEl.textContent = 'Topik tidak ditemukan';
        if (descEl) descEl.textContent = 'Topik yang Anda cari mungkin telah dihapus atau tidak tersedia.';
        if (commentListEl) commentListEl.innerHTML = '';
        return;
    }

    if (titleEl) titleEl.textContent = topic.title;
    if (metaEl) {
        metaEl.textContent = `Sila Terkait: ${topic.sila} | Dibuat oleh: ${topic.author} pada ${topic.date}`;
    }
    if (descEl) descEl.textContent = topic.description;

    if (!commentListEl) return;

    // Render komentar
    commentListEl.innerHTML = '';
    const comments = topic.comments || [];
    if (comments.length === 0) {
        commentListEl.innerHTML = '<p style="font-style: italic;">Belum ada komentar. Jadilah yang pertama memberikan tanggapan!</p>';
        return;
    }

    comments.forEach(comment => {
        const item = document.createElement('div');
        item.className = 'comment-item';
        item.innerHTML = `
            <p class="comment-author"><strong>${comment.author}</strong> <span style="font-size: 0.85em; opacity: 0.7;">(${comment.date})</span></p>
            <p class="comment-text">${comment.text}</p>
        `;
        commentListEl.appendChild(item);
    });
}

/**
 * Dipanggil dari diskusi-topik.html: Menyimpan komentar baru.
 */
function submitCommentToTopic(e) {
    if (e) e.preventDefault(); // Mencegah form refresh

    if (typeof window.loadCMSContent !== 'function' || typeof window.saveCMSContent !== 'function') {
        alert('Fungsi CMS belum tersedia.');
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('id');
    if (!topicId) {
        alert('Topik tidak ditemukan.');
        return;
    }

    // PERBAIKAN: Gunakan ID 'commentInput' yang benar dari diskusi-topik.html
    const commentInput = document.getElementById('commentInput'); 
    if (!commentInput) {
        alert('Input komentar (ID: commentInput) tidak ditemukan.');
        return;
    }

    const text = commentInput.value.trim();
    if (text.length < 5) { // Tambahkan validasi panjang
        alert('Komentar tidak boleh kosong dan minimal 5 karakter.');
        return;
    }
    
    // --- LOGIKA PENYIMPANAN BARU DITAMBAHKAN DI SINI ---
    
    // 1. Dapatkan data penulis
    const session = window.getActiveSession && window.getActiveSession();
    const authorName = session ? (session.fullName || session.username) : 'Anonim (Guest)';

    const cms = window.loadCMSContent();
    cms.topics = cms.topics || [];
    const topicIndex = cms.topics.findIndex(t => t.id === topicId);

    if (topicIndex === -1) {
        alert('Gagal menyimpan: Topik tidak ditemukan di data CMS.');
        return;
    }

    // 2. Buat objek komentar baru
    const newComment = {
        author: authorName,
        text: text,
        date: new Date().toLocaleDateString('id-ID'),
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    // 3. Simpan komentar ke CMS
    cms.topics[topicIndex].comments = cms.topics[topicIndex].comments || [];
    cms.topics[topicIndex].comments.push(newComment); // Simpan
    window.saveCMSContent(cms);

    // 4. Bersihkan input dan render ulang
    commentInput.value = '';
    
    // Panggil rendering ulang untuk menampilkan komentar baru
    loadTopicAndRenderComments(); 
}

// =======================================================
// IV. LOGIKA POJOK DILEMA
// =======================================================

/**
 * Merender bagian Pojok Dilema, menampilkan polling atau hasil.
 */
function renderDilemmaSection() {
    const dilemaData = loadDilemmaData();
    const session = window.getActiveSession && window.getActiveSession();
    if (!session || session.role === 'guru') return; // Guru tidak voting

    const resultContainer = document.getElementById('dilemmaResult');
    const btnA = document.getElementById('actionA');
    const btnB = document.getElementById('actionB');
    
    if (!resultContainer || !btnA || !btnB) return;

    if (dilemaData.hasVoted) {
        displayDilemmaResult(dilemaData);
    } else {
        // Reset tampilan tombol jika belum voting
        btnA.textContent = 'A. Melaporkan (Menegakkan Keadilan)';
        btnB.textContent = 'B. Membantu Teman (Menjaga Kemanusiaan)';
        btnA.disabled = false;
        btnB.disabled = false;
        resultContainer.innerHTML = '<p style="font-style: italic;">Pilih tindakan di atas untuk melihat bagaimana mayoritas temanmu memilih!</p>';
    }
}


/**
 * Menangani voting dilema.
 * @param {string} action - 'A' atau 'B'
 */
function castVote(action) {
    const session = window.getActiveSession && window.getActiveSession();
    if (!session || session.role === 'guru') {
        return alert("Anda harus login sebagai Murid untuk berpartisipasi.");
    }
    
    const dilemaData = loadDilemmaData();
    if (dilemaData.hasVoted) {
        alert("Anda sudah memilih pada dilema ini.");
        return;
    }

    // 1. Update data simulasi
    dilemaData.votes[action]++;
    dilemaData.votes.total++;
    dilemaData.hasVoted = true;
    saveDilemmaData(dilemaData);

    // 2. Tampilkan hasil dan nonaktifkan tombol
    displayDilemmaResult(dilemaData);
    
    // 3. Tambahkan poin ke murid aktif
    const pointsGained = 5;
    if (window.loadActiveStudentData && window.saveActiveStudentData) {
        const data = window.loadActiveStudentData();
        data.points += pointsGained;
        window.saveActiveStudentData(data);
        alert(`Terima kasih atas partisipasinya! Anda mendapatkan ${pointsGained} Poin Arena.`);
        renderSidebar(session); // Update poin di sidebar
    }
}

/**
 * Menampilkan hasil polling dilema setelah voting.
 * @param {object} dilemaData - Data dilema yang terbaru
 */
function displayDilemmaResult(dilemaData) {
    const resultContainer = document.getElementById('dilemmaResult');
    const btnA = document.getElementById('actionA');
    const btnB = document.getElementById('actionB');

    if (!resultContainer || !btnA || !btnB) return;

    const votesA = dilemaData.votes.A;
    const votesB = dilemaData.votes.B;
    const total = dilemaData.votes.total;
    
    const percentA = ((votesA / total) * 100).toFixed(1);
    const percentB = ((votesB / total) * 100).toFixed(1);

    // Nonaktifkan tombol setelah hasil ditampilkan
    btnA.disabled = true;
    btnB.disabled = true;
    btnA.textContent = `A. Melaporkan (${percentA}%)`;
    btnB.textContent = `B. Membantu Teman (${percentB}%)`;
    
    // Tampilan Hasil
    resultContainer.innerHTML = `
        <p><strong>Hasil Polling Sementara:</strong></p>
        <div style="background: #f0f0f0; border-radius: 4px; overflow: hidden; margin-bottom: 10px;">
            <div style="background-color: ${percentA > percentB ? 'var(--color-secondary)' : 'var(--color-primary)'}; height: 20px; width: ${percentA}%;"></div>
        </div>
        <p style="font-weight: bold;">Melaporkan: ${percentA}% | Membantu Teman: ${percentB}%</p>
        <p style="margin-top: 10px;">Mayoritas memilih: <strong>${percentA > percentB ? 'Melaporkan' : 'Membantu Teman'}</strong>.</p>
    `;
}


// =======================================================
// V. LOGIKA LEADERBOARD
// =======================================================

/**
 * Merender Papan Peringkat (Leaderboard) dari data CMS.
 */
function renderLeaderboard() {
    // Pastikan fungsi CMS tersedia
    if (typeof window.loadCMSContent !== 'function') return;

    const cms = window.loadCMSContent();
    const leaderboardData = cms.leaderboard || []; 

    // Sorting: Skor tertinggi (descending)
    leaderboardData.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        // Jika skor sama, waktu tempuh tercepat (hanya berlaku untuk Tantangan Cepat)
        return (a.time || 9999) - (b.time || 9999);
    });

    const listElement = document.getElementById('challengeLeaderboardList');
    if (!listElement) return;
    
    listElement.innerHTML = ''; // Kosongkan daftar lama
    
    leaderboardData.slice(0, 10).forEach((item, index) => { // Tampilkan 10 teratas
        let rank = index + 1;
        let badge = '';
        if (rank === 1) badge = '🥇';
        else if (rank === 2) badge = '🥈';
        else if (rank === 3) badge = '🥉';

        const timeDisplay = item.time ? ` - ${item.time.toFixed(1)} detik` : '';

        const listItem = document.createElement('li');
        listItem.innerHTML = `${badge} ${item.username} <span class="leaderboard-score">${item.score} Poin</span>${timeDisplay}`;
        listElement.appendChild(listItem);
    });

    if (leaderboardData.length === 0) {
        listElement.innerHTML = '<li>Belum ada data skor yang tersedia.</li>';
    }
}


// =======================================================
// VI. INITIALIZATION
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.checkAuthentication !== 'function') {
        return;
    }

    // Ambil session, arena utamanya untuk murid,
    // tapi guru juga bisa akses buat-topik.html
    let requiredRole = 'murid';
    if (window.location.pathname.includes('buat-topik.html')) {
        requiredRole = 'guru';
    }

    const session = window.checkAuthentication(requiredRole);
    if (!session) return;

    // Render sidebar kalau di halaman arena
    if (window.location.pathname.includes('arena-pancasila.html')) {
        renderSidebar(session);
        renderChallengeStatus();
        openTab(null, 'forum'); // default ke tab forum
    }

    // Inisialisasi Buat Topik
    if (window.location.pathname.includes('buat-topik.html')) {
        const newTopicForm = document.getElementById('newTopicForm');
        if (newTopicForm) {
            newTopicForm.addEventListener('submit', handleNewTopicSubmission);
        }
    }

    // Inisialisasi Diskusi Topik
    if (window.location.pathname.includes('diskusi-topik.html')) {
        renderSidebar(session); // masih boleh tampilkan info user/poin
        loadTopicAndRenderComments();
        const commentForm = document.getElementById('commentForm');
        if (commentForm) {
            commentForm.addEventListener('submit', submitCommentToTopic);
        }
    }

    // Expose fungsi ke window
    window.openTab = openTab;
    window.castVote = castVote;
    window.handleNewTopicSubmission = handleNewTopicSubmission;
    window.submitCommentToTopic = submitCommentToTopic;
    window.renderForumTopics = renderForumTopics;
});
