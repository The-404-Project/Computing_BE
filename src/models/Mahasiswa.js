const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Mahasiswa = sequelize.define('Mahasiswa', {
    nim: { type: DataTypes.STRING(20), primaryKey: true },
    nama: { type: DataTypes.STRING(100) },
    prodi: { type: DataTypes.STRING(50) },
    angkatan: { type: DataTypes.INTEGER },
    status: { type: DataTypes.ENUM('aktif', 'cuti', 'lulus', 'keluar') },
    email: { type: DataTypes.STRING(100) }
}, {
    tableName: 'mahasiswa', // Wajib sama persis dengan di schema.sql
    timestamps: false
});

module.exports = Mahasiswa;