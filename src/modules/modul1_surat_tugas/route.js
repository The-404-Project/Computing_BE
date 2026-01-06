const express = require('express');
const router = express.Router();
const suratTugasController = require('./controller');

if (!suratTugasController) {
    console.error("❌ Module 1 Controller failed to load.");
}

// Endpoint Generate Final
router.post('/create', suratTugasController.generate); 

// Endpoint Preview (BARU)
router.post('/preview', suratTugasController.preview);

module.exports = router;