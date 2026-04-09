require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/db.config');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./services/loggerService');

// Import routes
const healthRoutes = require('./routes/healthRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const readingRoutes = require('./routes/readingRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') 
    : '*'
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// ==================== ROUTES ====================

// Health check routes (public)
app.use('/health', healthRoutes);

// API routes
app.use('/api/devices', deviceRoutes);
app.use('/api/readings', readingRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Solar Panel Monitoring API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      devices: '/api/devices',
      readings: '/api/readings'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// ==================== DATABASE SYNC AND START SERVER ====================

const startServer = async () => {
  try {
    // Authenticate database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // Sync database models (in development only)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized.');
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  sequelize.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  sequelize.close();
  process.exit(0);
});

module.exports = app; // For testing