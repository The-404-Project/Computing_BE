const sequelize = require('../../config/database');
const { initModels } = require('./model');
const Document = require('../../models/Document'); // Gunakan model global untuk konsistensi

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

async function createDokumen({ nomor_registrasi, nim, jenis_surat, file_name, template_id = null, created_by = null, status = 'generated' }) {
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
