const express = require('express');
const router = express.Router();
const controller = require('./controller');

// URL: http://localhost:4000/api/surat-pengantar/create
router.post('/create', controller.create);

// URL: http://localhost:4000/api/surat-pengantar/preview
router.post('/preview', controller.preview);

module.exports = router;