const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// Public health check endpoints
router.get('/', healthController.checkHealth);
router.get('/info', healthController.getSystemInfo);

module.exports = router;