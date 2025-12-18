const sequelize = require('../../config/settings')
const { initModels } = require('./model')

const { Mahasiswa, Document } = initModels(sequelize)

async function findMahasiswaByNim(nim) {
  return Mahasiswa.findByPk(nim)
}

async function findDokumenByNomor(nomor) {
  return Document.findOne({ where: { doc_number: nomor } })
}

async function createDokumen({ nomor_registrasi, nim, jenis_surat, file_name, template_id = null, created_by = null, status = 'sent' }) {
  return Document.create({
    doc_number: nomor_registrasi,
    doc_type: jenis_surat,
    template_id,
    created_by,
    status,
    file_path: file_name,
    metadata: { nim },
  })
}

module.exports = { findMahasiswaByNim, findDokumenByNomor, createDokumen }
