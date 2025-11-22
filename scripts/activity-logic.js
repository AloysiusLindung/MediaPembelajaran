/**
 * scripts/activity-logic.js
 * Logika JavaScript untuk Aktivitas Drag-and-Drop Klasifikasi (Dinamis).
 * Terhubung ke CMS: items, zona drop, dan jawaban diatur oleh guru.
 * Mengintegrasikan data multi-user dan progress modul (70% Maks).
 */

const PASSING_SCORE_THRESHOLD = 70; // Akurasi minimal untuk dianggap "Lulus Aktivitas"

// Diambil dari URL
let currentModuleId = '';
let currentActivityKey = '';

// Variabel untuk menyimpan data aktivitas dari CMS
let activityData = {};
let correctAnswers = {}; // { itemId: dropZoneId }

// Variabel global untuk drag & drop
let draggedItemId = null;
let itemPlacementStatus = {}; // { itemId: dropZoneId }
let totalItems = 0;
const basePointsPerItem = 5;

// =======================================================
// FUNGSI DASAR DRAG-AND-DROP API
// =======================================================

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    const checkAnswersBtn = document.getElementById('checkAnswersBtn');
    if (checkAnswersBtn && checkAnswersBtn.disabled) return;

    draggedItemId = ev.target.id;
    ev.target.classList.add('dragging');
}

function dragEnter(ev) {
    ev.preventDefault();
    if (ev.target.classList.contains('drop-zone')) {
        ev.target.classList.add('hovered');
    }
}

function dragLeave(ev) {
    if (ev.target.classList.contains('drop-zone')) {
        ev.target.classList.remove('hovered');
    }
}

function drop(ev) {
    ev.preventDefault();
    const dropZone = ev.currentTarget;
    const item = document.getElementById(draggedItemId);

    if (!item) return;
    if (dropZone.contains(item)) return;

    dropZone.classList.remove('hovered');

    dropZone.appendChild(item);
    item.classList.remove('dragging');

    itemPlacementStatus[draggedItemId] = dropZone.id;
    draggedItemId = null;
}

// =======================================================
// FUNGSI LOGIKA AKTIVITAS (DINAMIS)
// =======================================================

/**
 * Inisialisasi: ambil module & key dari URL, load data dari CMS, render UI.
 */
function initActivity() {
    const params = new URLSearchParams(window.location.search);
    currentModuleId = params.get('module');
    currentActivityKey = params.get('key');

    const dragList = document.getElementById('dragItemList');
    const titleEl = document.getElementById('activityTitle');
    const descEl = document.getElementById('activityDescription');
    const checkBtn = document.getElementById('checkAnswersBtn');

    if (!currentModuleId || !currentActivityKey) {
        if (dragList) {
            dragList.innerHTML = '<p style="color:red; text-align:center;">Parameter <strong>module</strong> atau <strong>key</strong> tidak ditemukan di URL.</p>';
        }
        if (checkBtn) checkBtn.disabled = true;
        return;
    }

    if (typeof window.loadCMSContent !== 'function') {
        if (dragList) {
            dragList.innerHTML = '<p style="color:red; text-align:center;">Fungsi CMS tidak tersedia. Pastikan admin-cms.js sudah terload.</p>';
        }
        if (checkBtn) checkBtn.disabled = true;
        return;
    }

    const cms = window.loadCMSContent();
    // Asumsi guru menyimpan aktivitas di cms.activities[key]
    activityData = cms.activities?.[currentActivityKey];

    if (!activityData || !activityData.items || !activityData.zones || !activityData.answers) {
        if (titleEl) {
            titleEl.textContent = activityData?.title || `Aktivitas: ${currentActivityKey.toUpperCase()}`;
        }
        if (dragList) {
            dragList.innerHTML = '<p style="text-align:center;">Guru belum mengisi konten untuk aktivitas ini di CMS.</p>';
        }
        if (checkBtn) checkBtn.disabled = true;
        return;
    }

    // 1. Load jawaban & hitung total item
    correctAnswers = activityData.answers; // { itemId: dropZoneId }
    totalItems = Object.keys(correctAnswers).length;

    // 2. Set judul & deskripsi
    if (titleEl) {
        titleEl.textContent = activityData.title || 'Aktivitas Klasifikasi';
    }
    if (descEl) {
        descEl.textContent =
            activityData.description ||
            'Seret contoh perilaku di bawah ini, lalu letakkan pada kolom yang paling tepat.';
    }

    // 3. Render item dan zona drop
    renderDragItems(activityData.items);
    renderDropZones(activityData.zones);

    // 4. Pasang event listener untuk drop zone
    const dropZones = document.querySelectorAll('.drop-zone');
    dropZones.forEach(zone => {
        zone.addEventListener('dragenter', dragEnter);
        zone.addEventListener('dragleave', dragLeave);
        zone.addEventListener('dragover', allowDrop);
        zone.addEventListener('drop', drop);
    });

    // 5. Tombol cek jawaban
    if (checkBtn) {
        checkBtn.disabled = false;
        checkBtn.onclick = checkAnswers;
    }
}

/**
 * Render item yang bisa di-drag, berdasarkan data CMS.
 * items: [{ id: 'item-X', text: '...', ... }, ...]
 */
function renderDragItems(items) {
    const container = document.getElementById('dragItemList');
    if (!container) return;

    container.innerHTML = '';

    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('drag-item');
        itemDiv.setAttribute('draggable', true);
        itemDiv.setAttribute('ondragstart', 'drag(event)');
        itemDiv.id = item.id;
        itemDiv.textContent = item.text;
        container.appendChild(itemDiv);
    });
}

/**
 * Render zona drop, berdasarkan data CMS.
 * zones: [{ id: 'drop-agama', name: 'Norma Agama' }, ...]
 */
function renderDropZones(zones) {
    const container = document.getElementById('dropZoneContainer');
    if (!container) return;

    container.innerHTML = '';

    zones.forEach(zone => {
        const zoneDiv = document.createElement('div');
        zoneDiv.classList.add('drop-zone');
        zoneDiv.id = zone.id;
        zoneDiv.innerHTML = `<h3>${zone.name}</h3>`;
        container.appendChild(zoneDiv);
    });
}

/**
 * Memeriksa jawaban, menampilkan hasil, dan menyimpan progres.
 */
function checkAnswers() {
    const checkAnswersBtn = document.getElementById('checkAnswersBtn');
    if (!checkAnswersBtn || checkAnswersBtn.disabled) return;

    // 1. Pastikan semua item sudah ditempatkan
    if (Object.keys(itemPlacementStatus).length !== totalItems) {
        alert('Mohon tempatkan semua contoh perilaku ke dalam kolom klasifikasi sebelum memeriksa jawaban!');
        return;
    }

    let correctCount = 0;
    let finalScore = 0;

    checkAnswersBtn.disabled = true;

    // Loop semua item yang punya jawaban benar
    for (const itemId in correctAnswers) {
        const itemElement = document.getElementById(itemId);
        const correctZoneId = correctAnswers[itemId];
        const currentZoneId = itemPlacementStatus[itemId];

        if (!itemElement) continue;

        if (currentZoneId === correctZoneId) {
            correctCount++;
            finalScore += basePointsPerItem;
            itemElement.style.backgroundColor = 'var(--color-accent)';
            itemElement.style.color = 'white';
        } else {
            itemElement.style.backgroundColor = '#f44336';
            itemElement.style.color = 'white';
        }
        itemElement.style.cursor = 'default';
        itemElement.draggable = false;
    }

    const accuracy = (correctCount / totalItems) * 100;
    displayResult(correctCount, finalScore, accuracy);

    // 3. Simpan progres kalau lulus
    if (window.loadActiveStudentData && accuracy >= PASSING_SCORE_THRESHOLD) {
        const data = window.loadActiveStudentData();
        const initialPoints = finalScore;
        const PROGRESS_ACTIVITY = 70; // progress modul sampai aktivitas

        if (!data.modules) data.modules = {};
        if (!data.modules[currentModuleId]) {
            data.modules[currentModuleId] = {
                progress: 0,
                status: 'not_started'
            };
        }

        data.points += initialPoints;

        if (data.modules[currentModuleId].progress < 100) {
            data.modules[currentModuleId].progress = PROGRESS_ACTIVITY;
            data.modules[currentModuleId].status = 'in_progress';
        }

        if (window.checkForNewBadges) window.checkForNewBadges(data);
        window.saveActiveStudentData(data);

        // Ganti tombol jadi "Lanjut Kuis Akhir" (dinamis)
        checkAnswersBtn.textContent = 'Aktivitas Selesai, Lanjut Kuis Akhir →';
        checkAnswersBtn.classList.remove('btn-primary', 'btn-secondary');
        checkAnswersBtn.classList.add('btn-accent');
        checkAnswersBtn.disabled = false;

        // Cari kuis akhir modul dari CMS
        const cms = window.loadCMSContent && window.loadCMSContent();
        let nextQuizKey = '';

        if (cms && cms.modules && cms.modules[currentModuleId] && Array.isArray(cms.modules[currentModuleId].materi)) {
            const module = cms.modules[currentModuleId];
            const quizStep = module.materi.find(m => m.type === 'quiz');
            if (quizStep && quizStep.quiz_key) {
                nextQuizKey = quizStep.quiz_key;
            }
        }

        // Fallback jika guru belum set quiz_key
        if (!nextQuizKey) {
            nextQuizKey = 'final';
        }

        checkAnswersBtn.onclick = () => {
            window.location.href = `quiz.html?module=${encodeURIComponent(currentModuleId)}&key=${encodeURIComponent(nextQuizKey)}`;
        };
    } else {
        // Gagal: boleh coba lagi
        checkAnswersBtn.textContent = 'Coba Lagi (Reset Aktivitas)';
        checkAnswersBtn.classList.remove('btn-primary', 'btn-accent');
        checkAnswersBtn.classList.add('btn-secondary');
        checkAnswersBtn.disabled = false;
        checkAnswersBtn.onclick = resetActivity;
    }
}

/**
 * Reset semua item dan status aktivitas.
 */
function resetActivity() {
    if (!confirm('Yakin ingin mereset aktivitas? Semua jawaban akan dihapus.')) {
        return;
    }

    const dragItemList = document.getElementById('dragItemList');
    const dropZones = document.querySelectorAll('.drop-zone');

    if (!dragItemList) return;

    dropZones.forEach(zone => {
        const items = Array.from(zone.children).filter(child =>
            child.classList && child.classList.contains('drag-item')
        );
        items.forEach(item => {
            dragItemList.appendChild(item);
            item.style.backgroundColor = 'var(--color-secondary)';
            item.style.color = 'var(--color-primary)';
            item.style.cursor = 'grab';
            item.draggable = true;
        });
    });

    itemPlacementStatus = {};

    const checkAnswersBtn = document.getElementById('checkAnswersBtn');
    if (checkAnswersBtn) {
        checkAnswersBtn.textContent = 'Periksa Jawaban dan Dapatkan Poin!';
        checkAnswersBtn.classList.remove('btn-accent', 'btn-secondary');
        checkAnswersBtn.classList.add('btn-primary');
        checkAnswersBtn.disabled = false;
        checkAnswersBtn.onclick = checkAnswers;
    }
}

// =======================================================
// FUNGSI BANTU (ALERT HASIL)
// =======================================================

function displayResult(correctCount, finalScore, accuracy) {
    const totalMaxPoints = totalItems * basePointsPerItem;

    let message = '';
    if (accuracy === 100) {
        message = '🎉 SELAMAT! Jawaban Sempurna! 🎉 Anda mendapatkan poin penuh.';
    } else if (accuracy >= PASSING_SCORE_THRESHOLD) {
        message = '👍 Bagus Sekali! Akurasi Anda mencukupi. Progres disimpan.';
    } else {
        message = `😔 Anda perlu meninjau kembali konsep ini. Akurasi di bawah ${PASSING_SCORE_THRESHOLD}%.`;
    }

    alert(
        message +
        `\n\nTotal Jawaban Benar: ${correctCount} dari ${totalItems}` +
        `\nNilai Akurasi: ${accuracy.toFixed(0)}%` +
        `\nTotal Poin Didapat: ${finalScore}/${totalMaxPoints} Poin`
    );
}

// =======================================================
// INISIALISASI
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    // Pastikan tombol punya id konsisten
    const checkAnswersBtn = document.querySelector('.activity-actions button');
    if (checkAnswersBtn) {
        checkAnswersBtn.id = 'checkAnswersBtn';
    }

    // Load data aktivitas dari CMS dan render
    initActivity();
});
