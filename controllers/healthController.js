const { Device, SensorReading } = require('../models');
const { sequelize } = require('../config/db.config');
const packageJson = require('../package.json');

const healthController = {
  async checkHealth(req, res) {
    try {
      // Check database connection
      await sequelize.authenticate();
      
      // Get system stats
      const deviceCount = await Device.count();
      const readingCount = await SensorReading.count();
      const todayReadings = await SensorReading.count({
        where: {
          timestamp: {
            [Op.gte]: new Date().setHours(0, 0, 0, 0)
          }
        }
      });

      res.json({
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        version: packageJson.version,
        environment: process.env.NODE_ENV,
        database: {
          connected: true,
          device_count: deviceCount,
          total_readings: readingCount,
          today_readings: todayReadings
        },
        memory: process.memoryUsage()
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message
      });
    }
  },

  async getSystemInfo(req, res) {
    res.json({
      name: 'Solar Panel Monitoring API',
      version: packageJson.version,
      description: packageJson.description,
      author: packageJson.author,
      license: packageJson.license,
      dependencies: packageJson.dependencies,
      node_version: process.version,
      platform: process.platform
    });
  }
};

module.exports = healthController;