const express = require('express');
const router = express.Router();
const suratTugasController = require('./controller');

// Safety check: pastikan controller berhasil di-load
if (!suratTugasController) {
    console.error("❌ Module 1 Controller failed to load.");
}

/**
 * Route: POST /create
 * Endpoint: http://localhost:4000/api/surat-tugas/create
 * (Disesuaikan agar COCOK dengan Frontend)
 */
// Perhatikan: Frontend menembak '/create', jadi disini harus '/create' juga.
// Fungsi controller yang dipanggil adalah .generate (sesuai controller.js kamu)
router.post('/create', suratTugasController.generate); 

module.exports = router;