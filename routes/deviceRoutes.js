const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticateAPIKey } = require('../middleware/auth');
const { validateDevice } = require('../middleware/validation');

// All device routes require authentication
router.use(authenticateAPIKey);

// Device management
router.post('/register', validateDevice, deviceController.registerDevice);
router.get('/', deviceController.getAllDevices);
router.get('/:deviceId', deviceController.getDeviceById);
router.patch('/:deviceId/status', deviceController.updateDeviceStatus);
router.delete('/:deviceId', deviceController.deleteDevice);
router.get('/:deviceId/stats', deviceController.getDeviceStats);

module.exports = router;