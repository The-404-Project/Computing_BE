const express = require('express');
const router = express.Router();

// Import controller yang baru saja kamu perbaiki
const controller = require('./controller'); 

// Debugging: Cek apakah fungsi login terbaca?
// Kalau muncul 'undefined' di terminal, berarti file controller belum ke-save
if (!controller.login) {
    console.error("❌ FATAL ERROR: Fungsi 'login' tidak ditemukan di controller Modul 8!");
}

// Definisikan Route
// POST http://localhost:4000/api/auth/login
router.post('/login', controller.login);

module.exports = router;