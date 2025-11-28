/**
 * PANCASILA DIGITAL - REPORT SYSTEM (THE GOLDEN GARUDA EDITION)
 * =============================================================
 * Modul ini menangani logika pembuatan sertifikat secara otomatis.
 * Fitur: Validasi Nilai (KKM), Generasi ID Unik, dan Ekspor Gambar HD.
 */

const ReportSystem = {
    /**
     * 1. MEMBUAT ID SERTIFIKAT UNIK
     * Format: PAN-[TAHUN]-[KODE_ACAK] (Contoh: PAN-2025-X7B9)
     */
    generateCertificateID: function() {
        const year = new Date().getFullYear();
        // Membuat 4 karakter acak (angka/huruf)
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `PAN-${year}-${randomStr}`;
    },

    /**
     * 2. MENGISI DATA KE TEMPLATE HTML
     * Fungsi ini dipanggil oleh app.js saat kuis selesai.
     * @param {string} studentName - Nama dari input siswa
     * @param {string} babTitle - Judul Bab yang dikerjakan
     * @param {number} score - Nilai akhir (0-100)
     */
    prepareCertificate: function(studentName, babTitle, score) {
        // --- A. ISI DATA DASAR ---
        const nameEl = document.getElementById('cert-name');
        if (nameEl) nameEl.innerText = studentName || "Siswa Tanpa Nama";

        const babEl = document.getElementById('cert-bab');
        if (babEl) babEl.innerText = babTitle || "Materi Umum";

        const scoreEl = document.getElementById('cert-score');
        if (scoreEl) scoreEl.innerText = score;

        const idEl = document.getElementById('cert-id');
        if (idEl) idEl.innerText = this.generateCertificateID();

        // --- B. ATUR TANGGAL OTOMATIS (BAHASA INDONESIA) ---
        const now = new Date();
        
        // Format Lengkap (Contoh: Kamis, 28 November 2025) - Untuk Info Kiri Bawah
        const optionsFull = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateEl = document.getElementById('cert-date');
        if (dateEl) dateEl.innerText = now.toLocaleDateString('id-ID', optionsFull);

        // Format Simpel (Contoh: 28 November 2025) - Untuk Tanda Tangan Guru
        const optionsSimple = { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        };
        const dateSimpleEl = document.getElementById('cert-date-simple');
        if (dateSimpleEl) dateSimpleEl.innerText = now.toLocaleDateString('id-ID', optionsSimple);

        // --- C. LOGIKA PREDIKAT & WARNA (KKM = 70) ---
        // Jika nilai < 70, sertifikat berubah status menjadi sekadar "Bukti Pengerjaan"
        const titleEl = document.getElementById('cert-title');
        
        if (score >= 70) {
            // LULUS (KOMPETEN)
            if (titleEl) {
                titleEl.innerText = "SERTIFIKAT KOMPETENSI";
                titleEl.className = "cert-title font-poppins fw-bold text-danger display-4 mb-0"; // Merah Modern
            }
            // Warna Nilai: Emas jika 100, Hijau jika 70-99
            if (scoreEl) scoreEl.style.color = (score == 100) ? "#FFB703" : "#2A9D8F"; 
        } else {
            // BELUM LULUS (REMEDIAL)
            if (titleEl) {
                titleEl.innerText = "BUKTI PENGERJAAN";
                titleEl.className = "cert-title font-poppins fw-bold text-warning display-4 mb-0"; // Oranye/Kuning
            }
            // Warna Nilai: Merah
            if (scoreEl) scoreEl.style.color = "#E63946"; 
        }
    },

    /**
     * 3. FUNGSI DOWNLOAD GAMBAR
     * Mengubah HTML menjadi PNG dan memicu download/share
     */
    downloadCertificate: function(studentName) {
        const certNode = document.getElementById('sertifikat-node');
        const btn = document.getElementById('btn-download-cert'); // Pastikan ID tombol di HTML sesuai ini
        
        // Cek jika elemen tidak ada
        if (!certNode) {
            console.error("Template sertifikat (ID: sertifikat-node) tidak ditemukan!");
            alert("Terjadi kesalahan sistem. Hubungi administrator.");
            return;
        }

        // UX: Ubah tombol jadi status loading
        const originalBtnContent = btn ? btn.innerHTML : "Download";
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mencetak...`;
        }

        /**
         * [cite_start]KONFIGURASI PENTING AGAR TIDAK TERPOTONG [cite: 1]
         * Kita memaksa width/height sesuai CSS (1200x800)
         */
        const options = {
            scale: 2,           // Resolusi 2x (HD/Retina)
            width: 1200,        // Paksa Lebar Canvas
            height: 800,        // Paksa Tinggi Canvas
            windowWidth: 1200,  // Simulasikan layar lebar
            windowHeight: 800,  // Simulasikan layar tinggi
            useCORS: true,      // Izinkan aset eksternal
            backgroundColor: null, // Transparan (ikut CSS)
            scrollX: 0,         // Abaikan posisi scroll user
            scrollY: 0,
            x: 0,               // Mulai render dari koordinat 0 elemen
            y: 0
        };

        // Proses Rendering
        html2canvas(certNode, options).then(canvas => {
            // Bersihkan nama file dari karakter aneh (Hanya huruf angka)
            const safeName = (studentName || "Siswa").replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `Sertifikat_PPKN_${safeName}.png`;

            // Konversi Canvas ke Blob (File Object)
            canvas.toBlob(async (blob) => {
                const file = new File([blob], fileName, { type: 'image/png' });

                // Cek Fitur Web Share API (Khusus HP/Tablet)
                // Agar siswa bisa langsung share ke WA tanpa nyari file di folder download
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: 'Sertifikat Pancasila Digital',
                            text: `Halo Pak Parlindungan, ini sertifikat hasil belajar saya (${studentName}).`,
                            files: [file]
                        });
                        console.log('Berhasil dibagikan via Native Share');
                    } catch (err) {
                        // Jika user membatalkan share, fallback ke download biasa
                        console.warn('Share dibatalkan/gagal, melakukan download manual.');
                        this.triggerDownload(canvas, fileName);
                    }
                } else {
                    // Fallback: Download Biasa (Desktop / Browser Lama)
                    this.triggerDownload(canvas, fileName);
                }

                // Kembalikan tombol seperti semula
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalBtnContent;
                }
            });
        }).catch(err => {
            console.error("Gagal render sertifikat:", err);
            alert("Gagal membuat gambar. Pastikan koneksi lancar (untuk font).");
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalBtnContent;
            }
        });
    },

    /**
     * Helper internal untuk memicu download file otomatis
     */
    triggerDownload: function(canvas, fileName) {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link); // Perlu append ke body di Firefox
        link.click();
        document.body.removeChild(link);
    }
};

// Ekspos ke global scope agar bisa dipanggil dari app.js
window.ReportSystem = ReportSystem;