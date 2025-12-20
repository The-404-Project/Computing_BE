// File: src/modules/modul2_surat_undangan/service.js

const { generateWordFile, generatePdfFile } = require('../../utils/doc_generator');
const fs = require('fs');
const path = require('path');

// --- HELPER FUNCTIONS ---

// Helper 1: Ubah tanggal "2025-10-20" jadi nama hari "Senin"
const getNamaHari = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { weekday: 'long' });
};

// Helper 2: Ubah tanggal "2025-10-20" jadi "20 Oktober 2025"
const formatTanggalIndo = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// --- MAIN SERVICE FUNCTION ---

const processSuratUndangan = async (data, format = 'docx') => {
    // 1. Ambil Data dari Controller
    const { 
        jenis_surat,    // <--- Dropdown dari FE (undangan_rapat/seminar/kegiatan)
        nomorSurat, 
        lampiran, 
        tanggalAcara, 
        tempat, 
        agenda,
        list_tamu, 
        waktuMulai, waktuAcara, waktuSelesai 
    } = data;

    // 2. Logic Format Tanggal & Waktu
    const hari_acara = getNamaHari(tanggalAcara);
    const tgl_acara = formatTanggalIndo(tanggalAcara);
    const today_indo = formatTanggalIndo(new Date());
    
    // Logic Gabung Waktu (Mulai - Selesai)
    const jamMulai = waktuMulai || waktuAcara; 
    let waktu_fix = "-";
    if (jamMulai) {
         waktu_fix = waktuSelesai ? `${jamMulai} - ${waktuSelesai} WIB` : `${jamMulai} WIB`;
    }

    // 3. LOGIC PERIHAL OTOMATIS (Sesuai Request)
    // Mengubah kode dropdown menjadi teks Perihal yang rapi
    let perihal_otomatis = "Undangan"; // Default

    if (jenis_surat === 'undangan_rapat') {
        perihal_otomatis = "Undangan Rapat";
    } else if (jenis_surat === 'undangan_seminar') {
        perihal_otomatis = "Undangan Seminar";
    } else if (jenis_surat === 'undangan_kegiatan') {
        perihal_otomatis = "Undangan Kegiatan";
    }

    // 4. LOGIC MAIL MERGE (Page Break Aman)
    // Kita pakai Boolean: showPageBreak = true (jika bukan terakhir)
    let listTamuReady = [];
    if (list_tamu && Array.isArray(list_tamu)) {
        listTamuReady = list_tamu.map((tamu, index) => {
            // Tamu sekarang bentuknya object { nama, jabatan }
            // Tapi kita jaga-jaga kalau input string lama masih masuk
            const namaTamu = typeof tamu === 'string' ? tamu : tamu.nama;
            
            // Ambil jabatan (Kalau kosong/undefined, jadi null biar logic template jalan)
            const jabatanTamu = (typeof tamu === 'object' && tamu.jabatan) ? tamu.jabatan : null;

            const isLastItem = index === list_tamu.length - 1;

            return { 
                nama: namaTamu,
                
                // MAPPING JABATAN KE SINI
                jabatan: jabatanTamu, 

                showPageBreak: !isLastItem 
            };
        });
    }

    // 5. Masukkan Data ke Context (Siap dirender ke Word)
    const context = {
        nomor_surat: nomorSurat || "XXX/UND/FI/2025",
        lampiran: lampiran || "-",
        
        // Perihal otomatis terisi sesuai jenis surat
        perihal: perihal_otomatis, 

        hari: hari_acara,
        tanggal: tgl_acara,
        waktu: waktu_fix,
        tempat: tempat || "-",
        agenda: agenda || "-",
        tanggal_surat: today_indo,
        
        // Data Loop Tamu
        list_tamu: listTamuReady 
    };

    // 6. Generate File Word
    const templateName = 'template_undangan.docx'; 
    // Memanggil fungsi dari doc_generator.js
    const docxBuffer = generateWordFile(templateName, context);

    // Setup Variable Hasil
    let finalBuffer = docxBuffer;
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let ext = 'docx';

    // 7. Handle PDF Conversion (Jika user minta format=pdf)
    if (format === 'pdf') {
        // Memanggil fungsi PDF dari doc_generator.js (versi CLI)
        finalBuffer = await generatePdfFile(docxBuffer);
        mimeType = 'application/pdf';
        ext = 'pdf';
    }

    // 8. Penamaan File & Penyimpanan Lokal
    // Nama file: Undangan_Rapat_17099283.docx
    const safeName = perihal_otomatis.replace(/\s+/g, '_'); 
    const fileName = `${safeName}_${Date.now()}.${ext}`;

    // Tentukan Folder Output: Computing_BE/output/generated_documents/
    const outputDir = path.resolve(__dirname, '../../../output/generated_documents');

    // Buat folder jika belum ada
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    

    // Path Lengkap File
    const fullPath = path.join(outputDir, fileName);

    // Simpan File Fisik
    try {
        fs.writeFileSync(fullPath, finalBuffer);
        console.log(`[Service] File berhasil disimpan di: ${fullPath}`);
    } catch (err) {
        console.error('[Service] Gagal menyimpan file lokal:', err);
    }

    // 9. Return Data ke Controller
    return { 
        buffer: finalBuffer, 
        fileName: fileName, 
        mimeType: mimeType, 
        filePath: fullPath 
    };
};

module.exports = { processSuratUndangan };