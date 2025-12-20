const sequelize = require('../../config/database');
const { initModels } = require('./model');
const Document = require('../../models/Document'); // Gunakan model global untuk konsistensi
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { generatePdfFile } = require('../../utils/doc_generator');

const { Mahasiswa } = initModels(sequelize);

async function findMahasiswaByNim(nim) {
  return Mahasiswa.findByPk(nim);
}

async function findDokumenByNomor(nomor) {
  try {
    return await Document.findOne({ where: { doc_number: nomor } });
  } catch {
    return null;
  }
}

async function createDokumen({ 
  nomor_registrasi, 
  nim, 
  jenis_surat, 
  file_name, 
  template_id = null, 
  created_by = null, 
  status = 'generated',
  // Data tambahan untuk metadata
  nama = null,
  program_studi = null,
  tahun_akademik = null,
  status_mahasiswa = null,
  keperluan = null,
  kota = null,
  tanggal = null,
  nama_dekan = null,
  nip_dekan = null
}) {
  try {
    return await Document.create({
      doc_number: nomor_registrasi,
      doc_type: 'surat_keterangan', // Konsisten dengan modul lain
      created_by,
      status,
      file_path: file_name,
      metadata: {
        nim,
        jenis_surat, // Simpan jenis surat detail di metadata
        template_id, // Simpan template_id di metadata karena model global tidak punya kolom template_id
        // Simpan semua data yang diperlukan untuk regenerate
        nama,
        program_studi,
        tahun_akademik,
        status: status_mahasiswa,
        keperluan,
        kota,
        tanggal,
        nama_dekan,
        nip_dekan,
      },
    });
  } catch (error) {
    console.error('Error creating document in modul3:', error);
    throw error; // Throw error agar bisa di-handle di controller
  }
}

async function getNextDocNumber() {
  try {
    const lastDoc = await Document.findOne({
      where: { doc_type: 'surat_keterangan' },
      order: [['created_at', 'DESC']],
    });

    if (!lastDoc || !lastDoc.doc_number) {
      return '001';
    }

    const lastNumber = lastDoc.doc_number;
    
    // 1. Try to match starting number (e.g., "001/SK/2023")
    const startMatch = lastNumber.match(/^(\d+)(.*)$/);
    if (startMatch) {
      const numberPart = startMatch[1];
      const suffixPart = startMatch[2];
      const nextNum = parseInt(numberPart, 10) + 1;
      const paddedNextNum = String(nextNum).padStart(numberPart.length, '0');
      return paddedNextNum + suffixPart;
    }

    // 2. Try to match ending number (e.g., "SK/2023/001")
    const endMatch = lastNumber.match(/^(.*?)(\d+)$/);
    if (endMatch) {
        const prefixPart = endMatch[1];
        const numberPart = endMatch[2];
        const nextNum = parseInt(numberPart, 10) + 1;
        const paddedNextNum = String(nextNum).padStart(numberPart.length, '0');
        return prefixPart + paddedNextNum;
    }

    // 3. Fallback: Append a number
    return lastNumber + '-1';
  } catch (error) {
    console.error('Error getting next number:', error);
    return '001';
  }
}

module.exports = { findMahasiswaByNim, findDokumenByNomor, createDokumen, getNextDocNumber };

/**
 * Regenerate surat keterangan document from metadata
 * @param {object} data - Data object containing document metadata
 * @param {string} format - Output format: 'docx' or 'pdf'
 * @returns {Promise<{buffer: Buffer, fileName: string, mimeType: string}>}
 */
async function processSuratKeteranganGeneration(data, format = 'docx') {
  try {
    const {
      nomorSurat,
      nim,
      jenis_surat,
      keperluan,
      kota,
      tanggal,
      nama_dekan,
      nip_dekan,
      // Data mahasiswa (jika sudah ada di metadata)
      nama,
      program_studi,
      tahun_akademik,
      status
    } = data;

    console.log('[Surat Keterangan] Process generation - Data:', JSON.stringify(data));
    console.log('[Surat Keterangan] Format:', format);

    // Mapping jenis surat ke template
    const map = {
      'surat keterangan aktif kuliah': 'template_surat_keterangan_mahasiswa_aktif.docx',
      'surat keterangan lulus': 'template_surat_keterangan_lulus.docx',
      'surat keterangan bebas pinjaman': 'template_surat_keterangan_bebas_pinjaman.docx',
      'surat keterangan kelakuan baik': 'template_surat_keterangan_kelakuan_baik.docx',
    };

    const key = String(jenis_surat || '').toLowerCase().trim();
    const filenameTemplate = map[key];
    
    console.log('[Surat Keterangan] Jenis surat key:', key);
    console.log('[Surat Keterangan] Template file:', filenameTemplate);
    
    if (!filenameTemplate) {
      throw new Error(`Jenis surat tidak dikenali: "${jenis_surat}". Jenis yang didukung: ${Object.keys(map).join(', ')}`);
    }

    // Jika data mahasiswa belum ada, ambil dari database
    let mahasiswaData = {
      nama: nama || '',
      nim: nim || '',
      program_studi: program_studi || '',
      tahun_akademik: tahun_akademik || '',
      status: status || ''
    };

    if (nim && !nama) {
      console.log('[Surat Keterangan] Fetching mahasiswa data for NIM:', nim);
      const m = await findMahasiswaByNim(String(nim));
      if (m) {
        const tahunAkademik = m.angkatan ? `${m.angkatan}/${m.angkatan + 1}` : '';
        const statusFormatted = m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : '';
        mahasiswaData = {
          nama: m.nama,
          nim: m.nim,
          program_studi: m.prodi,
          tahun_akademik: tahunAkademik,
          status: statusFormatted
        };
        console.log('[Surat Keterangan] Mahasiswa data fetched:', mahasiswaData);
      } else {
        console.warn('[Surat Keterangan] Mahasiswa dengan NIM', nim, 'tidak ditemukan');
      }
    }

    // Path template
    const templatePath = path.join(__dirname, '../../templates/surat_templates/', filenameTemplate);
    
    console.log('[Surat Keterangan] Template path:', templatePath);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template tidak ditemukan: ${filenameTemplate} di path: ${templatePath}`);
    }

    // Generate DOCX
    console.log('[Surat Keterangan] Reading template file...');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { 
      delimiters: { start: '<<<', end: '>>>' }, 
      paragraphLoop: true, 
      linebreaks: true 
    });

    const renderData = {
      nomor_surat: nomorSurat || '',
      nama: mahasiswaData.nama,
      nim: mahasiswaData.nim,
      program_studi: mahasiswaData.program_studi,
      tahun_akademik: mahasiswaData.tahun_akademik,
      status: mahasiswaData.status,
      keperluan: keperluan || '',
      kota: kota || '',
      tanggal: tanggal || '',
      nama_dekan: nama_dekan || '',
      nip_dekan: nip_dekan || '',
    };

    console.log('[Surat Keterangan] Render data:', JSON.stringify(renderData));

    try {
      doc.render(renderData);
    } catch (err) {
      console.error('[Surat Keterangan] Render error:', err);
      throw new Error('Template gagal dirender: ' + err.message);
    }

    console.log('[Surat Keterangan] Generating DOCX buffer...');
    const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' });

    // Handle PDF conversion
    let finalBuffer = docxBuffer;
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let ext = 'docx';

    if (format === 'pdf') {
      console.log('[Surat Keterangan] Converting to PDF...');
      finalBuffer = await generatePdfFile(docxBuffer);
      mimeType = 'application/pdf';
      ext = 'pdf';
      console.log('[Surat Keterangan] PDF conversion completed');
    }

    const fileName = `surat_keterangan_${nomorSurat || Date.now()}.${ext}`;
    console.log('[Surat Keterangan] File generated:', fileName, 'Size:', finalBuffer.length);

    return { buffer: finalBuffer, fileName, mimeType };
  } catch (error) {
    console.error('[Surat Keterangan] Error in processSuratKeteranganGeneration:', error);
    console.error('[Surat Keterangan] Error stack:', error.stack);
    throw error;
  }
}

module.exports = { findMahasiswaByNim, findDokumenByNomor, createDokumen, processSuratKeteranganGeneration, getNextDocNumber };
