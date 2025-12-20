const express = require('express');
const controller = require('./controller');
const auth = require('../../utils/auth');

const router = express.Router();

/* 
 * NOTE:
 * Ensure file upload middleware is active in app.js
 * e.g., app.use(fileUpload());
 */

/* =========================================================
   TEMPLATE MANAGEMENT
   ========================================================= */

// Upload DOCX template (FR-02)
router.post('/templates/upload', controller.uploadTemplate);

// Delete DOCX template (FR-02)
router.post('/templates/delete', controller.deleteTemplate);

// List available templates
router.get('/templates', controller.listTemplates);

/* =========================================================
   DOCUMENT GENERATION
   ========================================================= */

// Generate DOCX (download)
router.post('/generate-docx', controller.generateDocx);

// Generate PDF (download)
router.post('/generate-pdf', controller.generatePdf);

/* =========================================================
   VERSIONING
   ========================================================= */

// List saved versions
router.get('/versions', controller.listVersions);

// Download specific version DOCX by ID
router.get('/versions/:id/download', controller.downloadVersion);

module.exports = router;
