const { Alert, Device, SensorReading } = require('../models');
const { Op } = require('sequelize');
const logger = require('../services/loggerService');

//Evaluate rules against a sensor reading and create alerts 
async function evaluateAlertRules(reading) {
  const deviceId = reading.device_id;
  const alertsCreated = [];

  // Critical rules
  if (reading.dust_factor > 50) {
    alertsCreated.push({
      device_id: deviceId,
      type: 'critical',
      title: 'Critical Dust Accumulation',
      message: `Dust factor is ${reading.dust_factor.toFixed(1)}% (>50%). Panel requires immediate cleaning.`,
      rule_triggered: 'dust_factor_critical',
      metric_value: reading.dust_factor
    });
  } else if (reading.dust_factor > 25 && reading.dust_factor <= 50) {
    alertsCreated.push({
      device_id: deviceId,
      type: 'warning',
      title: 'High Dust Level',
      message: `Dust factor is ${reading.dust_factor.toFixed(1)}% (>25%). Schedule cleaning soon.`,
      rule_triggered: 'dust_factor_warning',
      metric_value: reading.dust_factor
    });
  }

  if (reading.crack_indicator > 30) {
    alertsCreated.push({
      device_id: deviceId,
      type: 'critical',
      title: 'Potential Panel Cracks',
      message: `Crack indicator is ${reading.crack_indicator.toFixed(1)}% (>30%). Power output severely reduced.`,
      rule_triggered: 'crack_indicator_critical',
      metric_value: reading.crack_indicator
    });
  } else if (reading.crack_indicator > 20) {
    alertsCreated.push({
      device_id: deviceId,
      type: 'warning',
      title: 'Crack Indicator Elevated',
      message: `Crack indicator is ${reading.crack_indicator.toFixed(1)}% (>20%). Investigate possible micro-cracks.`,
      rule_triggered: 'crack_indicator_warning',
      metric_value: reading.crack_indicator
    });
  }

  // Power loss = (expectedPower - actualPower)/expectedPower; we don't have expectedPower directly.
  // Approximate using space_irradiance and nominal power.
  if (reading.space_irradiance > 0) {
    const expectedPower = 100 * (reading.space_irradiance / 1000); // 100W at 1000 lux
    const powerLossPercent = ((expectedPower - reading.power) / expectedPower) * 100;
    if (powerLossPercent > 40) {
      alertsCreated.push({
        device_id: deviceId,
        type: 'critical',
        title: 'Severe Power Loss',
        message: `Power loss is ${powerLossPercent.toFixed(1)}% (>40%). Check for cracks, shading, or electrical issues.`,
        rule_triggered: 'power_loss_critical',
        metric_value: powerLossPercent
      });
    } else if (powerLossPercent > 25) {
      alertsCreated.push({
        device_id: deviceId,
        type: 'warning',
        title: 'Moderate Power Loss',
        message: `Power loss is ${powerLossPercent.toFixed(1)}% (>25%). Investigate cause.`,
        rule_triggered: 'power_loss_warning',
        metric_value: powerLossPercent
      });
    }
  }

  // Shading variation (warning only)
  if (reading.shading_variation > 30) {
    alertsCreated.push({
      device_id: deviceId,
      type: 'warning',
      title: 'Uneven Shading Detected',
      message: `Shading variation is ${reading.shading_variation.toFixed(1)}% (>30%). Partial shading affecting output.`,
      rule_triggered: 'shading_variation_warning',
      metric_value: reading.shading_variation
    });
  }

  // Efficiency low (info)
  if (reading.efficiency !== null && reading.efficiency < 10) {
    alertsCreated.push({
      device_id: deviceId,
      type: 'info',
      title: 'Low Efficiency',
      message: `Efficiency is ${reading.efficiency.toFixed(1)}% (<10%). Possible dust, aging, or mismatch.`,
      rule_triggered: 'efficiency_low',
      metric_value: reading.efficiency
    });
  }

  // Voltage fluctuation (simple: compare with previous reading for same device)
  const prevReading = await SensorReading.findOne({
    where: { device_id: deviceId },
    order: [['timestamp', 'DESC']],
    offset: 1
  });
  if (prevReading && Math.abs(reading.voltage - prevReading.voltage) > 5) {
    alertsCreated.push({
      device_id: deviceId,
      type: 'warning',
      title: 'Voltage Fluctuation',
      message: `Voltage changed from ${prevReading.voltage.toFixed(1)}V to ${reading.voltage.toFixed(1)}V. Check connections.`,
      rule_triggered: 'voltage_fluctuation',
      metric_value: Math.abs(reading.voltage - prevReading.voltage)
    });
  }

  // For each potential alert, check if an active (non-resolved) alert already exists for same rule and device
  for (const alertData of alertsCreated) {
    const existing = await Alert.findOne({
      where: {
        device_id: deviceId,
        rule_triggered: alertData.rule_triggered,
        status: { [Op.ne]: 'resolved' }
      }
    });
    if (!existing) {
      const newAlert = await Alert.create(alertData);
      logger.info(`Alert created for device ${deviceId}: ${alertData.title}`);
    }
  }
}

const alertController = {
  // GET /alerts
  async getAlerts(req, res, next) {
    try {
      const {
        deviceId,
        type,
        status = 'active',   // default to active alerts only
        limit = 50,
        offset = 0,
        orderBy = 'created_at',
        orderDir = 'DESC'
      } = req.query;

      const where = {};
      if (deviceId) where.device_id = deviceId;
      if (type && type !== 'all') where.type = type;
      if (status && status !== 'all') where.status = status;

      const alerts = await Alert.findAndCountAll({
        where,
        include: [{ model: Device, attributes: ['location', 'mac_address'] }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[orderBy, orderDir]]
      });

      res.json({
        success: true,
        data: alerts.rows,
        total: alerts.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      next(error);
    }
  },

  async getAlertById(req, res, next) {
    try {
      const alert = await Alert.findByPk(req.params.id, {
        include: [{ model: Device, attributes: ['location', 'mac_address'] }]
      });
      if (!alert) {
        return res.status(404).json({ success: false, message: 'Alert not found' });
      }
      res.json({ success: true, data: alert });
    } catch (error) {
      next(error);
    }
  },

  // alert acknowledge
  async acknowledgeAlert(req, res, next) {
    try {
      const { id } = req.params;
      const { acknowledged_by = 'system' } = req.body;

      const alert = await Alert.findByPk(id);
      if (!alert) {
        return res.status(404).json({ success: false, message: 'Alert not found' });
      }

      if (alert.status === 'resolved') {
        return res.status(400).json({ success: false, message: 'Cannot acknowledge a resolved alert' });
      }

      alert.status = 'acknowledged';
      alert.acknowledged_by = acknowledged_by;
      alert.acknowledged_at = new Date();
      await alert.save();

      logger.info(`Alert ${id} acknowledged by ${acknowledged_by}`);
      res.json({ success: true, message: 'Alert acknowledged', data: alert });
    } catch (error) {
      next(error);
    }
  },

  //mark-all-read
  async markAllRead(req, res, next) {
    try {
      const { deviceId, acknowledged_by = 'system' } = req.body;
      const where = { status: 'active' };
      if (deviceId) where.device_id = deviceId;

      const [updatedCount] = await Alert.update(
        {
          status: 'acknowledged',
          acknowledged_by,
          acknowledged_at: new Date()
        },
        { where }
      );

      logger.info(`Marked ${updatedCount} alerts as acknowledged`);
      res.json({ success: true, message: `${updatedCount} alerts acknowledged` });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /alerts/:id
  async deleteAlert(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await Alert.destroy({ where: { id } });
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Alert not found' });
      }
      res.json({ success: true, message: 'Alert deleted' });
    } catch (error) {
      next(error);
    }
  },

  // clear all or by device
  async clearAlerts(req, res, next) {
    try {
      const { deviceId, status = 'active' } = req.query;
      const where = {};
      if (deviceId) where.device_id = deviceId;
      if (status) where.status = status;

      const deleted = await Alert.destroy({ where });
      logger.info(`Cleared ${deleted} alerts`);
      res.json({ success: true, message: `Cleared ${deleted} alerts` });
    } catch (error) {
      next(error);
    }
  },

  // called after a new reading is created
  async evaluateAlertsFromReading(req, res, next) {
    try {
      const { readingId } = req.body;
      const reading = await SensorReading.findByPk(readingId);
      if (!reading) {
        return res.status(404).json({ success: false, message: 'Reading not found' });
      }
      await evaluateAlertRules(reading);
      res.json({ success: true, message: 'Alert evaluation completed' });
    } catch (error) {
      next(error);
    }
  },

  //endpoint to check device offline alerts (called by cron)
  async checkDeviceOffline(req, res, next) {
    try {
      const offlineThresholdMinutes = 10;
      const cutoff = new Date(Date.now() - offlineThresholdMinutes * 60 * 1000);

      const devices = await Device.findAll({
        where: {
          last_seen: { [Op.lt]: cutoff },
          status: 'active'   // assume tracking status on device
        }
      });

      for (const device of devices) {
        const existingAlert = await Alert.findOne({
          where: {
            device_id: device.device_id,
            rule_triggered: 'device_offline',
            status: { [Op.ne]: 'resolved' }
          }
        });
        if (!existingAlert) {
          await Alert.create({
            device_id: device.device_id,
            type: 'info',
            title: 'Device Offline',
            message: `Device has not reported for more than ${offlineThresholdMinutes} minutes.`,
            rule_triggered: 'device_offline',
            metric_value: offlineThresholdMinutes
          });
          logger.info(`Offline alert created for device ${device.device_id}`);
        }
      }
      res.json({ success: true, message: 'Offline check completed' });
    } catch (error) {
      next(error);
    }
  },

  async getAlertCounts(req, res, next) {
    try {
        const counts = await Alert.findAll({
        where: { status: 'active' },
        attributes: ['type', [Alert.sequelize.fn('COUNT', Alert.sequelize.col('id')), 'count']],
        group: ['type']
        });
        const result = { critical: 0, warning: 0, info: 0 };
        counts.forEach(c => { result[c.type] = parseInt(c.count); });
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
    }
  
};

module.exports = alertController;

