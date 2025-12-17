const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
  // --- INI KOLOM YANG HILANG & MENYEBABKAN ERROR ---
  doc_type: {
    type: DataTypes.STRING, // 'surat_tugas', 'surat_undangan', 'surat_pengantar'
    allowNull: false,
    defaultValue: 'general' 
  },
  // -------------------------------------------------
  status: {
    type: DataTypes.STRING, // 'draft', 'pending', 'approved', 'rejected'
    defaultValue: 'draft'
  },
  metadata: {
    type: DataTypes.JSON, // Menyimpan detail dinamis (nama, tanggal, dll)
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
  tableName: 'documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Document;