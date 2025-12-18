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

module.exports = router;
