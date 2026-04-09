const { Device, SensorReading } = require('../models');
const { Op } = require('sequelize');
const logger = require('../services/loggerService');

const deviceController = {
  // Register or update a device
  async registerDevice(req, res, next) {
    try {
      const { device_id, location, mac_address, firmware_version, metadata } = req.body;

      const [device, created] = await Device.findOrCreate({
        where: { device_id },
        defaults: {
          location,
          mac_address,
          firmware_version,
          metadata,
          last_seen: new Date()
        }
      });

      if (!created) {
        await device.update({
          location: location || device.location,
          mac_address: mac_address || device.mac_address,
          firmware_version: firmware_version || device.firmware_version,
          metadata: metadata || device.metadata,
          last_seen: new Date(),
          status: 'active'
        });
      }

      logger.info(`Device ${device_id} ${created ? 'registered' : 'updated'}`);

      res.status(created ? 201 : 200).json({
        success: true,
        message: `Device ${created ? 'registered' : 'updated'} successfully`,
        data: device
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all devices
  async getAllDevices(req, res, next) {
    try {
      const { status, limit = 100, offset = 0 } = req.query;

      const where = {};
      if (status) where.status = status;

      const devices = await Device.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['last_seen', 'DESC']]
      });

      res.json({
        success: true,
        data: devices.rows,
        total: devices.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      next(error);
    }
  },

  // Get device by ID
  async getDeviceById(req, res, next) {
    try {
      const { deviceId } = req.params;

      const device = await Device.findOne({
        where: { device_id: deviceId },
        include: [{
          model: SensorReading,
          limit: 5,
          order: [['timestamp', 'DESC']],
          separate: true
        }]
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      res.json({
        success: true,
        data: device
      });
    } catch (error) {
      next(error);
    }
  },

  // Update device status
  async updateDeviceStatus(req, res, next) {
    try {
      const { deviceId } = req.params;
      const { status } = req.body;

      const device = await Device.findOne({
        where: { device_id: deviceId }
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      await device.update({ status });

      logger.info(`Device ${deviceId} status updated to ${status}`);

      res.json({
        success: true,
        message: 'Device status updated',
        data: device
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete device
  async deleteDevice(req, res, next) {
    try {
      const { deviceId } = req.params;

      const device = await Device.findOne({
        where: { device_id: deviceId }
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      await device.destroy();

      logger.info(`Device ${deviceId} deleted`);

      res.json({
        success: true,
        message: 'Device deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Get device statistics
  async getDeviceStats(req, res, next) {
    try {
      const { deviceId } = req.params;
      const { days = 7 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const readings = await SensorReading.findAll({
        where: {
          device_id: deviceId,
          timestamp: {
            [Op.gte]: startDate
          }
        },
        order: [['timestamp', 'ASC']]
      });

      if (readings.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No readings found for this device'
        });
      }

      // Calculate statistics
      const stats = {
        avg_power: readings.reduce((sum, r) => sum + (r.power || 0), 0) / readings.length,
        max_power: Math.max(...readings.map(r => r.power || 0)),
        min_power: Math.min(...readings.map(r => r.power || 0)),
        avg_dust: readings.reduce((sum, r) => sum + (r.dust_factor || 0), 0) / readings.length,
        max_dust: Math.max(...readings.map(r => r.dust_factor || 0)),
        avg_efficiency: readings.reduce((sum, r) => sum + (r.efficiency || 0), 0) / readings.length,
        total_readings: readings.length,
        period_days: parseInt(days)
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = deviceController;