const { generateWordFile, generatePdfFile } = require('../../utils/doc_Generator');

/**
 * Helper: Mengubah string tanggal (YYYY-MM-DD) menjadi format Indonesia
 * Contoh: 2025-10-20 -> 20 Oktober 2025
 */
const formatTanggalIndo = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Helper: Menghitung selisih hari (inklusif)
 */
const hitungLamaHari = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    // Dibagi (ms * detik * menit * jam)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays + 1; // +1 supaya hari pertama dihitung
};

/**
 * Orchestrates the Surat Tugas generation process.
 */
const processSuratTugasGeneration = async (data, format = 'docx') => {
    // 1. Destructure Data (Sesuaikan dengan Form Input Modul 1)
    const { 
        jenis_surat, // 'surat_tugas_dosen', 'surat_tugas_staf', 'sppd'
        nomorSurat, 
        namaPegawai, 
        nip, 
        pangkat, 
        jabatan, 
        tujuanTugas, 
        keperluan, 
        tanggalMulai, 
        tanggalSelesai, 
        biaya, 
        kendaraan 
    } = data;

    // 2. Pilih Template berdasarkan jenis surat
    let templateName = 'template_surat_tugas.docx'; // Default
    if (jenis_surat === 'sppd') {
        templateName = 'template_sppd.docx';
    }

    // 3. Hitung Logika Bisnis (Tanggal & Durasi)
    const lama_hari = hitungLamaHari(tanggalMulai, tanggalSelesai);
    const tgl_mulai_indo = formatTanggalIndo(tanggalMulai);
    const tgl_selesai_indo = formatTanggalIndo(tanggalSelesai);
    const today_indo = formatTanggalIndo(new Date());

    // 4. Mapping Data ke Context (Placeholder di Word: {nama}, {nip}, dll)
    const context = {
        nomor_surat: nomorSurat || "XXX/ST/FI/2025", // Default jika auto-generate belum di-save ke DB
        nama: namaPegawai,
        nip: nip,
        pangkat: pangkat || '-',
        jabatan: jabatan || '-',
        tujuan: tujuanTugas,
        keperluan: keperluan,
        tanggal_mulai: tgl_mulai_indo,
        tanggal_selesai: tgl_selesai_indo,
        lama_hari: `${lama_hari} Hari`,
        biaya: biaya || "DIPA Fakultas",
        kendaraan: kendaraan || "Umum",
        tanggal_surat: today_indo
    };

    // 5. Generate DOCX Buffer (Pakai fungsi utils yang sama dengan Modul 4)
    const docxBuffer = generateWordFile(templateName, context);
    
    // 6. Handle PDF Conversion
    let finalBuffer = docxBuffer;
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let ext = 'docx';

    if (format === 'pdf') {
        finalBuffer = await generatePdfFile(docxBuffer);
        mimeType = 'application/pdf';
        ext = 'pdf';
    }

    // 7. Buat Nama File yang Bersih
    const cleanNama = (namaPegawai || 'Surat').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `SuratTugas_${cleanNama}_${Date.now()}.${ext}`;

    return { buffer: finalBuffer, fileName, mimeType };
};

module.exports = { processSuratTugasGeneration };