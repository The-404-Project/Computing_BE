const sequelize = require('../../config/database');
const { initModels } = require('./model');

const { Mahasiswa, Document } = initModels(sequelize)

async function findMahasiswaByNim(nim) {
  return Mahasiswa.findByPk(nim);
}

async function findDokumenByNomor(nomor) {
  try {
    return await Document.findOne({ where: { doc_number: nomor } })
  } catch {
    return null
  }
}

async function createDokumen({ nomor_registrasi, nim, jenis_surat, file_name, template_id = null, created_by = null, status = 'sent' }) {
  try {
    return await Document.create({
      doc_number: nomor_registrasi,
      doc_type: jenis_surat,
      template_id,
      created_by,
      status,
      file_path: file_name,
      metadata: { nim },
    })
  } catch {
    return null
  }
}

module.exports = { findMahasiswaByNim, findDokumenByNomor, createDokumen }
