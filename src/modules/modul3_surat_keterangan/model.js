const { DataTypes } = require('sequelize')

function initModels(sequelize) {
  const Mahasiswa = sequelize.define(
    'mahasiswa',
    {
      nim: { type: DataTypes.STRING(20), primaryKey: true },
      nama: { type: DataTypes.STRING(100), allowNull: false },
      prodi: { type: DataTypes.STRING(50), allowNull: false },
      angkatan: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.ENUM('aktif', 'cuti', 'lulus', 'keluar'),
        allowNull: false,
      },
      email: { type: DataTypes.STRING(100) },
    },
    {
      tableName: 'mahasiswa',
      timestamps: false,
    }
  )

  return { Mahasiswa }
}

module.exports = { initModels }
