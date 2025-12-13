const sequelize = require('../../config/settings')
const { initModels } = require('./model')

const { Mahasiswa } = initModels(sequelize)

async function findMahasiswaByNim(nim) {
  return Mahasiswa.findByPk(nim)
}

module.exports = { findMahasiswaByNim }
