const { generateWordFile, generatePdfFile, addWatermarkToPdf } = require('../../utils/doc_generator');
const fs = require('fs');
const path = require('path');

// Helper: Format Tanggal Indo
const formatTanggalIndo = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Helper: Hitung Lama Hari
const hitungLamaHari = (startDate, endDate) => {
  if (!startDate || !endDate) return '-';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; 
};

// --- MAIN SERVICE ---
const processSuratTugasGeneration = async (data, format = 'docx', isPreview = false) => {
  // 1. Destructure Data
  const {
    jenis_surat, nomorSurat, tanggalSurat,
    namaPegawai, nip, jabatan, pangkat,
    tujuanTugas, keperluan,
    tanggalMulai, tanggalSelesai,
    biaya, kendaraan
  } = data;

  // 2. Logic Tanggal & Lama Hari
  const tgl_surat = formatTanggalIndo(tanggalSurat || new Date());
  const tgl_mulai = formatTanggalIndo(tanggalMulai);
  const tgl_selesai = formatTanggalIndo(tanggalSelesai);
  const lama_hari = hitungLamaHari(tanggalMulai, tanggalSelesai);

  // 3. Masukkan Data ke Context
  const context = {
    nomor_surat: nomorSurat || "XXX/ST/FI/XX/2025",
    tanggal_surat: tgl_surat,
    
    nama: namaPegawai || "-",
    nip: nip || "-",
    jabatan: jabatan || "-",
    pangkat: pangkat || "-",
    
    tujuan: tujuanTugas || "-",
    keperluan: keperluan || "-",
    
    tanggal_mulai: tgl_mulai,
    tanggal_selesai: tgl_selesai,
    lama_hari: `${lama_hari} Hari`,
    
    biaya: biaya || "DIPA Fakultas Informatika",
    kendaraan: kendaraan || "Umum"
  };

  // 4. Generate Word Buffer
  // Tentukan nama template berdasarkan jenis_surat (bisa dikembangkan)
  const templateName = 'template_surat_tugas.docx'; 
  const docxBuffer = generateWordFile(templateName, context);

  let finalBuffer = docxBuffer;
  let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  let ext = 'docx';

  // 5. Logic PDF & Preview
  if (format === 'pdf' || isPreview) {
      finalBuffer = await generatePdfFile(docxBuffer);
      mimeType = 'application/pdf';
      ext = 'pdf';

      // Jika Preview, tambah Watermark
      if (isPreview) {
          finalBuffer = await addWatermarkToPdf(finalBuffer);
      }
  }

  // 6. Penamaan & Penyimpanan
  const safeName = (namaPegawai || 'Surat_Tugas').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  const fileName = `Surat_Tugas_${safeName}_${Date.now()}.${ext}`;
  let fullPath = null;

  // Cuma simpan jika BUKAN preview
  if (!isPreview) {
      const outputDir = path.resolve(__dirname, '../../../output/generated_documents');
      if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
      }
      fullPath = path.join(outputDir, fileName);
      
      try {
          fs.writeFileSync(fullPath, finalBuffer);
          console.log(`[Modul 1] File disimpan: ${fullPath}`);
      } catch (err) {
          console.error('[Modul 1] Gagal simpan file:', err);
      }
  } else {
      console.log('[Modul 1] Mode Preview: File tidak disimpan.');
  }

  return { 
      buffer: finalBuffer, 
      fileName: fileName, 
      mimeType: mimeType, 
      filePath: fullPath 
  };
};

module.exports = { processSuratTugasGeneration };