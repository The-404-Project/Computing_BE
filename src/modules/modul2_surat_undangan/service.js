// File: src/modules/modul2_surat_undangan/service.js

// Import watermark juga
const { generateWordFile, generatePdfFile, addWatermarkToPdf } = require('../../utils/doc_generator');
const fs = require('fs');
const path = require('path');

// --- HELPER FUNCTIONS ---
const getNamaHari = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { weekday: 'long' });
};

const formatTanggalIndo = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// --- MAIN SERVICE FUNCTION ---
const processSuratUndangan = async (data, format = 'docx', isPreview = false) => {
    
    // 1. Destructure Data
    // PERBAIKAN: Ambil 'lokasi' dari data yang dikirim controller (bukan 'tempat')
    const { 
        jenis_surat, nomorSurat, lampiran, 
        tanggalAcara, lokasi, agenda, 
        list_tamu, waktuMulai, waktuAcara, waktuSelesai 
    } = data;

    // 2. Logic Format Tanggal & Waktu
    const hari_acara = getNamaHari(tanggalAcara);
    const tgl_acara = formatTanggalIndo(tanggalAcara);
    const today_indo = formatTanggalIndo(new Date());
    
    const jamMulai = waktuMulai || waktuAcara; 
    let waktu_fix = "-";
    if (jamMulai) {
         waktu_fix = waktuSelesai ? `${jamMulai} - ${waktuSelesai} WIB` : `${jamMulai} WIB`;
    }

    // 3. Logic Perihal Otomatis
    let perihal_otomatis = "Undangan"; 
    if (jenis_surat === 'undangan_rapat') perihal_otomatis = "Undangan Rapat";
    else if (jenis_surat === 'undangan_seminar') perihal_otomatis = "Undangan Seminar";
    else if (jenis_surat === 'undangan_kegiatan') perihal_otomatis = "Undangan Kegiatan";

    // 4. Logic Mail Merge (Jabatan & Page Break)
    let listTamuReady = [];
    if (list_tamu && Array.isArray(list_tamu)) {
        listTamuReady = list_tamu.map((tamu, index) => {
            const namaTamu = typeof tamu === 'string' ? tamu : tamu.nama;
            const jabatanTamu = (typeof tamu === 'object' && tamu.jabatan) ? tamu.jabatan : null;
            const isLastItem = index === list_tamu.length - 1;

            return { 
                nama: namaTamu,
                jabatan: jabatanTamu,
                showPageBreak: !isLastItem 
            };
        });
    }

    // 5. Masukkan Data ke Context
    const context = {
        nomor_surat: nomorSurat || "XXX/UND/FI/2025",
        lampiran: lampiran || "-",
        perihal: perihal_otomatis, 
        hari: hari_acara,
        tanggal: tgl_acara,
        waktu: waktu_fix,
        
        // PERBAIKAN: Isi tag {tempat} di Word dengan variabel 'lokasi' dari frontend
        tempat: lokasi || "-", 
        
        agenda: agenda || "-",
        tanggal_surat: today_indo,
        list_tamu: listTamuReady 
    };

    // 6. Generate Word Buffer
    const templateName = 'template_undangan.docx'; 
    const docxBuffer = generateWordFile(templateName, context);

    let finalBuffer = docxBuffer;
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let ext = 'docx';

    // 7. Logic PDF & Preview
    if (format === 'pdf' || isPreview) {
        // Generate PDF bersih via LibreOffice
        finalBuffer = await generatePdfFile(docxBuffer);
        mimeType = 'application/pdf';
        ext = 'pdf';

        // --- CEK APAKAH INI PREVIEW? JIKA YA, TAMBAH WATERMARK ---
        if (isPreview) {
            finalBuffer = await addWatermarkToPdf(finalBuffer);
        }
        // ---------------------------------------------------------
    }

    // 8. Penamaan File
    const safeName = perihal_otomatis.replace(/\s+/g, '_'); 
    const fileName = `${safeName}_${Date.now()}.${ext}`;

    let fullPath = null;

    // --- 9. SAVE LOGIC: HANYA SIMPAN JIKA BUKAN PREVIEW ---
    if (!isPreview) {
        // Simpan ke folder permanent jika bukan preview
        const outputDir = path.resolve(__dirname, '../../../output/generated_documents');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fullPath = path.join(outputDir, fileName);

        try {
            fs.writeFileSync(fullPath, finalBuffer);
            console.log(`[Service] File disimpan permanen: ${fullPath}`);
        } catch (err) {
            console.error('[Service] Gagal menyimpan file:', err);
        }
    } else {
        console.log('[Service] Mode Preview: File TIDAK disimpan ke storage.');
    }

    // 10. Return Data
    return { 
        buffer: finalBuffer, 
        fileName: fileName, 
        mimeType: mimeType, 
        filePath: fullPath 
    };
};

module.exports = { processSuratUndangan };