const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticateAPIKey } = require('../middleware/auth'); // optional

// Public endpoints (protected by API key)
router.get('/', alertController.getAlerts);
router.get('/:id', alertController.getAlertById);
router.put('/:id/acknowledge', alertController.acknowledgeAlert);
router.post('/mark-all-read', alertController.markAllRead);
router.delete('/:id', alertController.deleteAlert);
router.delete('/', alertController.clearAlerts);
router.get('/counts', alertController.getAlertCounts);

// Internal endpoints for alert generation
router.post('/evaluate', alertController.evaluateAlertsFromReading);
router.post('/check-offline', alertController.checkDeviceOffline);

module.exports = router;