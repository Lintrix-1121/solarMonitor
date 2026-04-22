const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticateAPIKey } = require('../middleware/auth'); // optional

// Public endpoints (protected by API key)
router.get('/', authenticateAPIKey, alertController.getAlerts);
router.get('/:id', authenticateAPIKey, alertController.getAlertById);
router.put('/:id/acknowledge', authenticateAPIKey, alertController.acknowledgeAlert);
router.post('/mark-all-read', authenticateAPIKey, alertController.markAllRead);
router.delete('/:id', authenticateAPIKey, alertController.deleteAlert);
router.delete('/', authenticateAPIKey, alertController.clearAlerts);
router.get('/counts', authenticateAPIKey, alertController.getAlertCounts);

// Internal endpoints for alert generation
router.post('/evaluate', authenticateAPIKey, alertController.evaluateAlertsFromReading);
router.post('/check-offline', authenticateAPIKey, alertController.checkDeviceOffline);

module.exports = router;