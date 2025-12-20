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

module.exports = { findMahasiswaByNim, findDokumenByNomor, createDokumen };
