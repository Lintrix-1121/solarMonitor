const express = require('express');
const router = express.Router();
const readingController = require('../controllers/readingController');
const { authenticateAPIKey } = require('../middleware/auth');
const { validateReading } = require('../middleware/validation');

// ==================== PUBLIC ENDPOINTS ====================
// Endpoint for ESP32 to post readings (requires API key)
router.post('/', authenticateAPIKey, validateReading, readingController.createReading);

// ==================== PROTECTED ENDPOINTS ====================
// All routes below require API key authentication

// Get latest reading (with or without device ID)
router.get('/latest', authenticateAPIKey, readingController.getLatestReading);
router.get('/latest/:deviceId', authenticateAPIKey, readingController.getLatestReading);

// Get statistics
router.get('/stats', authenticateAPIKey, readingController.getStatistics);

// Get specific reading by ID
router.get('/:id', authenticateAPIKey, readingController.getReadingById);

// Get readings with filters (query parameters)
router.get('/', authenticateAPIKey, readingController.getReadings);

// Maintenance endpoint - delete old readings
router.delete('/old', authenticateAPIKey, readingController.deleteOldReadings);

module.exports = router;




// const express = require('express');
// const router = express.Router();
// const readingController = require('../controllers/readingController');
// const { authenticateAPIKey } = require('../middleware/auth');
// const { validateReading } = require('../middleware/validation');

// // Public endpoint for ESP32 to post readings (with API key)
// router.post('/', authenticateAPIKey, validateReading, readingController.createReading);

// // Protected endpoints (also require API key)
// router.get('/latest/:deviceId?', authenticateAPIKey, readingController.getLatestReading);
// router.get('/stats', authenticateAPIKey, readingController.getStatistics);
// router.get('/:id', authenticateAPIKey, readingController.getReadingById);
// router.get('/', authenticateAPIKey, readingController.getReadings);

// // Maintenance endpoint (admin only)
// router.delete('/old', authenticateAPIKey, readingController.deleteOldReadings);

// module.exports = router;