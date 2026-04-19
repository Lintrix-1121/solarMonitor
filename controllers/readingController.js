const { SensorReading, LdrReading, Device } = require('../models');
const { Op } = require('sequelize');
const logger = require('../services/loggerService');
const { evaluatedRules } = require('./alertController')

const readingController = {
  // Create new reading (from ESP32)
  async createReading(req, res, next) {
    try {
      const data = req.body;
      
      // Validate required fields
      if (!data.device_id) {
        return res.status(400).json({
          success: false,
          message: 'device_id is required'
        });
      }

      // Start transaction
      const transaction = await SensorReading.sequelize.transaction();

      try {
        // Update or create device
        await Device.findOrCreate({
          where: { device_id: data.device_id },
          defaults: {
            location: data.location || null,
            mac_address: data.mac_address || null,
            last_seen: new Date()
          },
          transaction
        });

        // Create main sensor reading
        const reading = await SensorReading.create({
          device_id: data.device_id,
          panel_irradiance: data.panel_irradiance,
          space_irradiance: data.space_irradiance,
          dust_factor: data.dust_factor,
          full_spectrum_panel: data.full_spectrum_panel,
          full_spectrum_space: data.full_spectrum_space,
          ir_panel: data.ir_panel,
          ir_space: data.ir_space,
          current: data.current,
          voltage: data.voltage,
          power: data.power,
          crack_indicator: data.crack_indicator,
          shading_variation: data.shading_variation,
          efficiency: data.efficiency,
          rssi: data.rssi,
          uptime_hours: data.uptime_hours,
          device_timestamp: data.timestamp_ms
        }, { transaction });

        // Create LDR readings if provided
        if (data.ldr_readings && Array.isArray(data.ldr_readings)) {
          await Promise.all(data.ldr_readings.map(ldr => 
            LdrReading.create({
              reading_id: reading.id,
              position: ldr.position,
              value: ldr.value
            }, { transaction })
          ));
        }

        await transaction.commit();

        //trigger alert evaluation in background
        evaluatedRules(reading).catch(err =>
          logger.error('Alert evaluation failed:', err)
        );

        res.status(201).json({ success: true});
        
        logger.info(`Reading created for device ${data.device_id}`);

        res.status(201).json({
          success: true,
          message: 'Reading created successfully',
          data: {
            reading_id: reading.id,
            timestamp: reading.timestamp
          }
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },

// controllers/readingController.js - Update this method
    async getLatestReading(req, res, next) {
    try {
        const { deviceId } = req.params; // This will be undefined if no deviceId provided

        const where = deviceId ? { device_id: deviceId } : {};

        const reading = await SensorReading.findOne({
        where,
        include: [
            {
            model: LdrReading,
            attributes: ['position', 'value']
            },
            {
            model: Device,
            attributes: ['location', 'mac_address', 'status']
            }
        ],
        order: [['timestamp', 'DESC']]
        });

        if (!reading) {
        return res.status(404).json({
            success: false,
            message: deviceId ? `No readings found for device ${deviceId}` : 'No readings found'
        });
        }

        res.json({
        success: true,
        data: reading
        });
    } catch (error) {
        next(error);
    }
    },

  // Get readings with filters
  async getReadings(req, res, next) {
    try {
      const {
        deviceId,
        startDate,
        endDate,
        minDust,
        maxDust,
        minPower,
        maxPower,
        limit = 100,
        offset = 0,
        orderBy = 'timestamp',
        orderDir = 'DESC'
      } = req.query;

      const where = {};

      if (deviceId) where.device_id = deviceId;
      
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp[Op.gte] = new Date(startDate);
        if (endDate) where.timestamp[Op.lte] = new Date(endDate);
      }

      if (minDust || maxDust) {
        where.dust_factor = {};
        if (minDust) where.dust_factor[Op.gte] = parseFloat(minDust);
        if (maxDust) where.dust_factor[Op.lte] = parseFloat(maxDust);
      }

      if (minPower || maxPower) {
        where.power = {};
        if (minPower) where.power[Op.gte] = parseFloat(minPower);
        if (maxPower) where.power[Op.lte] = parseFloat(maxPower);
      }

      const readings = await SensorReading.findAndCountAll({
        where,
        include: [
          {
            model: LdrReading,
            attributes: ['position', 'value']
          },
          {
            model: Device,
            attributes: ['location', 'mac_address']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[orderBy, orderDir]]
      });

      res.json({
        success: true,
        data: readings.rows,
        total: readings.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      next(error);
    }
  },

  // Get reading by ID
  async getReadingById(req, res, next) {
    try {
      const { id } = req.params;

      const reading = await SensorReading.findByPk(id, {
        include: [
          {
            model: LdrReading,
            attributes: ['position', 'value']
          },
          {
            model: Device,
            attributes: ['location', 'mac_address', 'status']
          }
        ]
      });

      if (!reading) {
        return res.status(404).json({
          success: false,
          message: 'Reading not found'
        });
      }

      res.json({
        success: true,
        data: reading
      });
    } catch (error) {
      next(error);
    }
  },

  // Get aggregated statistics
  async getStatistics(req, res, next) {
    try {
      const { deviceId, period = 'day' } = req.query;

      let groupBy;
      let dateFormat;

      switch (period) {
        case 'hour':
          groupBy = 'HOUR';
          dateFormat = '%Y-%m-%d %H:00:00';
          break;
        case 'day':
          groupBy = 'DAY';
          dateFormat = '%Y-%m-%d';
          break;
        case 'week':
          groupBy = 'WEEK';
          dateFormat = '%Y-%u';
          break;
        case 'month':
          groupBy = 'MONTH';
          dateFormat = '%Y-%m';
          break;
        default:
          groupBy = 'DAY';
          dateFormat = '%Y-%m-%d';
      }

      const where = {};
      if (deviceId) where.device_id = deviceId;

      const stats = await SensorReading.findAll({
        where,
        attributes: [
          [SensorReading.sequelize.fn('DATE_FORMAT', 
            SensorReading.sequelize.col('timestamp'), dateFormat), 'period'],
          [SensorReading.sequelize.fn('AVG', SensorReading.sequelize.col('dust_factor')), 'avg_dust'],
          [SensorReading.sequelize.fn('MAX', SensorReading.sequelize.col('dust_factor')), 'max_dust'],
          [SensorReading.sequelize.fn('AVG', SensorReading.sequelize.col('power')), 'avg_power'],
          [SensorReading.sequelize.fn('MAX', SensorReading.sequelize.col('power')), 'max_power'],
          [SensorReading.sequelize.fn('AVG', SensorReading.sequelize.col('crack_indicator')), 'avg_crack'],
          [SensorReading.sequelize.fn('MAX', SensorReading.sequelize.col('crack_indicator')), 'max_crack'],
          [SensorReading.sequelize.fn('AVG', SensorReading.sequelize.col('efficiency')), 'avg_efficiency'],
          [SensorReading.sequelize.fn('COUNT', SensorReading.sequelize.col('id')), 'reading_count']
        ],
        group: ['period'],
        order: [[SensorReading.sequelize.literal('period'), 'DESC']],
        limit: 30
      });

      res.json({
        success: true,
        data: stats,
        period
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete old readings (maintenance)
  async deleteOldReadings(req, res, next) {
    try {
      const { days = 30 } = req.query;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const deleted = await SensorReading.destroy({
        where: {
          timestamp: {
            [Op.lt]: cutoffDate
          }
        }
      });

      logger.info(`Deleted ${deleted} readings older than ${days} days`);

      res.json({
        success: true,
        message: `Deleted ${deleted} old readings`,
        data: { deleted_count: deleted }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = readingController;


