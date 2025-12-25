const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

/**
 * Model untuk Modul 6: Surat Program Studi
 * Menggunakan struktur schema yang sudah ada (documents table dengan metadata JSON)
 * Tidak membuat tabel baru, semua data disimpan di metadata JSON
 */
function initModels(sequelize) {
  // Tidak perlu membuat model baru
  // Menggunakan Document model yang sudah ada
  // Approval workflow dan history log disimpan di metadata JSON
  
  return {};
}

module.exports = { initModels };
