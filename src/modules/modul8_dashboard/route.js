const express = require('express');
const router = express.Router();
const controller = require('./controller');

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

module.exports = router;
