const { generateWordFile, generatePdfFile } = require('../../utils/doc_Generator');

// Helper: Ubah tanggal "2025-10-20" jadi "Senin"
const getNamaHari = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { weekday: 'long' });
};

// Helper: Ubah tanggal "2025-10-20" jadi "20 Oktober 2025"
const formatTanggalIndo = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const processSuratUndangan = async (data, format = 'docx') => {
    const { 
        jenis_surat, nomorSurat, lampiran, perihal, kepada, 
        tanggalAcara, waktuMulai, waktuSelesai, tempat, agenda 
    } = data;

    // --- BAGIAN PENTING: FORCE TEMPLATE ---
    // Kita paksa backend menggunakan file ini, apapun jenis suratnya.
    // Pastikan file 'template_undangan.docx' ada di folder templates.
    let templateName = 'template_undangan.docx'; 

    // 2. Format Data Waktu
    const hari_acara = getNamaHari(tanggalAcara);
    const tgl_acara = formatTanggalIndo(tanggalAcara);
    const today_indo = formatTanggalIndo(new Date());
    
    // Format Jam
    let waktu_fix = `${waktuMulai} WIB - Selesai`;
    if (waktuSelesai) {
        waktu_fix = `${waktuMulai} - ${waktuSelesai} WIB`;
    }

    // 3. Masukkan Data ke Word
    const context = {
        nomor_surat: nomorSurat || "XXX/UND/FI/2025",
        lampiran: lampiran || "-",
        perihal: perihal || "Undangan",
        kepada: kepada, 
        hari: hari_acara,
        tanggal: tgl_acara,
        waktu: waktu_fix,
        tempat: tempat,
        agenda: agenda,
        tanggal_surat: today_indo
    };

    // 4. Generate File
    const docxBuffer = generateWordFile(templateName, context);

    let finalBuffer = docxBuffer;
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let ext = 'docx';

    if (format === 'pdf') {
        finalBuffer = await generatePdfFile(docxBuffer);
        mimeType = 'application/pdf';
        ext = 'pdf';
    }

    const cleanPerihal = (perihal || 'Surat').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const fileName = `Undangan_${cleanPerihal}_${Date.now()}.${ext}`;

    return { buffer: finalBuffer, fileName, mimeType };
};

module.exports = { processSuratUndangan };