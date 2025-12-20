const express = require('express');
const router = express.Router();
const controller = require('./controller');
const multer = require('multer');
const path = require('path');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept .docx files
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.docx') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file .docx yang diperbolehkan'), false);
    }
  },
});

// Auth Routes
router.post('/login', controller.login);

// User Management Routes (hanya admin)
router.get('/users', controller.getAllUsers);
router.get('/users/:id', controller.getUserById);
router.post('/users', controller.createUser);
router.put('/users/:id', controller.updateUser);
router.delete('/users/:id', controller.deleteUser);

// Document Search and Filter Routes
router.get('/documents/search', controller.searchDocuments);
router.get('/documents/stats', controller.getDocumentStats);
router.get('/documents/:id/download', controller.downloadDocument);
router.get('/documents/export', controller.exportHistory);

// Template Management Routes (hanya admin)
// IMPORTANT: Route yang lebih spesifik harus diletakkan SEBELUM route yang lebih umum
router.get('/templates', controller.getAllTemplates);
router.get('/templates/by-type/:type', controller.getTemplatesByType); // Get templates by type
router.get('/templates/download/:filename', controller.downloadTemplateFile); // Harus sebelum /templates/:id
router.get('/templates/:id/preview', controller.previewTemplate);
router.get('/templates/:id', controller.getTemplateById);
router.post('/templates', upload.single('file'), controller.createTemplate);
router.put('/templates/:id', upload.single('file'), controller.updateTemplate);
router.delete('/templates/:id', controller.deleteTemplate);
router.patch('/templates/:id/toggle-active', controller.toggleTemplateActive);

module.exports = router;
