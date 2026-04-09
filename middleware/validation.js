const Joi = require('joi');

const validateReading = (req, res, next) => {
  const schema = Joi.object({
    device_id: Joi.string().max(50).required(),
    location: Joi.string().max(100).optional(),
    mac_address: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).optional(),
    panel_irradiance: Joi.number().min(-1).max(200000).optional(),
    space_irradiance: Joi.number().min(-1).max(200000).optional(),
    dust_factor: Joi.number().min(0).max(100).optional(),
    full_spectrum_panel: Joi.number().optional(),
    full_spectrum_space: Joi.number().optional(),
    ir_panel: Joi.number().optional(),
    ir_space: Joi.number().optional(),
    current: Joi.number().optional(),
    voltage: Joi.number().optional(),
    power: Joi.number().optional(),
    crack_indicator: Joi.number().min(0).max(100).optional(),
    shading_variation: Joi.number().min(0).max(100).optional(),
    efficiency: Joi.number().min(0).max(100).optional(),
    rssi: Joi.number().optional(),
    uptime_hours: Joi.number().optional(),
    timestamp_ms: Joi.number().optional(),
    ldr_readings: Joi.array().items(
      Joi.object({
        position: Joi.string().valid('North', 'East', 'South', 'West').required(),
        value: Joi.number().min(0).max(4095).required()
      })
    ).optional()
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
  }
  
  next();
};

const validateDevice = (req, res, next) => {
  const schema = Joi.object({
    device_id: Joi.string().max(50).required(),
    location: Joi.string().max(100).optional(),
    mac_address: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).optional(),
    firmware_version: Joi.string().max(20).optional(),
    metadata: Joi.object().optional()
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
  }
  
  next();
};

module.exports = { validateReading, validateDevice };