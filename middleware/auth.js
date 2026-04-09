require('dotenv').config();

const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  
  // Skip authentication if no API key is configured in production
  if (!process.env.API_KEY ) {
    console.warn('Warning: API authentication is disabled');
    return next();
  }
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is required'
    });
  }
  
  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({
      success: false,
      message: 'Invalid API key'
    });
  }
  
  next();
};

module.exports = { authenticateAPIKey };


