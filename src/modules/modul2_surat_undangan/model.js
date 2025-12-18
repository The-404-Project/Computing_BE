const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database'); // Pastikan path ini mengarah ke koneksi Sequelize kamu

const Document = sequelize.define('Document', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    doc_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    doc_type: {
        type: DataTypes.STRING,
        defaultValue: 'surat_undangan' // Default type untuk modul ini
    },
    status: {
        type: DataTypes.STRING, // Di schema tipe VARCHAR
        defaultValue: 'draft'
    },
    metadata: {
        type: DataTypes.JSON, // Kita simpan detail surat & list tamu di sini
        allowNull: true
    },
    file_path: {
        type: DataTypes.STRING,
        allowNull: true
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'documents', // Sesuai nama tabel di schema.sql
    timestamps: true,       // Sesuai schema (created_at, updated_at)
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Document;