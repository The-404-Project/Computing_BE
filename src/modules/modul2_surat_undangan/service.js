const { generateWordFile, generatePdfFile } = require('../../utils/doc_generator');

// Helper: Format Nama Hari (Senin, Selasa...)
const getNamaHari = (dateString) => {
    if (!dateString) return '-';
    // Pastikan valid date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-'; // Return strip jika format tanggal salah
    return date.toLocaleDateString('id-ID', { weekday: 'long' });
};

// Helper: Format Tanggal Indo (20 Oktober 2025)
const formatTanggalIndo = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const processSuratUndangan = async (data, format = 'docx') => {
    // 1. Destructure Data
    const { 
        nomorSurat, lampiran, perihal, 
        tanggalAcara, tempat, agenda,
        list_tamu,
        // Ambil waktuMulai, tapi kalau kosong coba ambil waktuAcara (Fallback)
        waktuMulai, waktuAcara, waktuSelesai 
    } = data;

    // 2. Logic Format Tanggal
    // Cek apakah tanggalAcara ada?
    const hari_acara = getNamaHari(tanggalAcara);
    const tgl_acara = formatTanggalIndo(tanggalAcara);
    const today_indo = formatTanggalIndo(new Date());

    // 3. Logic Format Waktu (Perbaikan)
    // Kita prioritaskan waktuMulai, kalau ga ada pakai waktuAcara
    const jamMulai = waktuMulai || waktuAcara; 
    let waktu_fix = "-";

    if (jamMulai) {
        if (waktuSelesai) {
             waktu_fix = `${jamMulai} - ${waktuSelesai} WIB`;
        } else {
             // Hilangkan kata "Selesai" sesuai request
             waktu_fix = `${jamMulai} WIB`; 
        }
    }

    // ... Logic List Tamu (Biarkan seperti sebelumnya) ...
    let listTamuReady = [];
    if (list_tamu && Array.isArray(list_tamu)) {
        listTamuReady = list_tamu.map(tamu => 
            typeof tamu === 'string' ? { nama: tamu } : tamu
        );
    }

    // 4. Masukkan ke Context
    const context = {
        nomor_surat: nomorSurat || "XXX/UND/FI/2025",
        lampiran: lampiran || "-",
        perihal: perihal || "Undangan",
        
        hari: hari_acara,     // Cek hasil ini di file output
        tanggal: tgl_acara,   // Cek hasil ini di file output
        waktu: waktu_fix,     // Cek hasil ini di file output
        
        tempat: tempat || "-",
        agenda: agenda || "-",
        tanggal_surat: today_indo,
        list_tamu: listTamuReady
    };

    // ... Generate File (Generate Docx/PDF) ...
    // Copy bagian bawah service.js kamu yang lama ke sini
    const templateName = 'template_undangan.docx'; 
    const docxBuffer = generateWordFile(templateName, context);
    
    // ... Logic return PDF/DOCX ...
    let finalBuffer = docxBuffer;
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let ext = 'docx';
    let fileName = `Undangan_${Date.now()}.${ext}`;

    if (format === 'pdf') {
        finalBuffer = await generatePdfFile(docxBuffer);
        mimeType = 'application/pdf';
        ext = 'pdf';
    }

    return { buffer: finalBuffer, fileName, mimeType };
};

module.exports = { processSuratUndangan };