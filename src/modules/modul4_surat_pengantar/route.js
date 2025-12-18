const express = require('express');
const router = express.Router();
const suratController = require('./controller');

// Safety check: ensure controller functions are loaded correctly
if (!suratController || !suratController.generate) {
    console.error("Module 4 Controller failed to load. Check controller.js");
}

/**
 * Route: POST /generate
 * Description: Generates the letter document (DOCX/PDF) based on client input.
 */
router.post('/generate', suratController.generate);

module.exports = router;