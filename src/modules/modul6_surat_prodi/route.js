const express = require('express');
const router = express.Router();
const controller = require('./controller');
const path = require('path');

// GET endpoints
router.get('/mahasiswa', controller.getMahasiswaByNim);
router.get('/dosen', controller.getDosenByNip);
router.get('/next-number', controller.getNextNumber);
router.get('/history/:doc_id', controller.getHistory);
router.get('/approval/:doc_id', controller.getApproval);

// POST endpoints
router.post('/create', controller.createDraft);
router.post('/submit', controller.submitForApproval);
router.post('/approve', controller.approveSurat);
router.post('/reject', controller.rejectSurat);
router.post('/preview', controller.previewSurat);
router.post('/generate', controller.generateSurat);

// Static files
router.use('/files', express.static(path.join(__dirname, '../../../output/generated_documents')));

module.exports = router;

