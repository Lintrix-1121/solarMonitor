const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const SensorReading = sequelize.define('SensorReading', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  device_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'devices',
      key: 'device_id'
    }
  },
  // Dust monitoring
  panel_irradiance: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: -1,
      max: 200000
    }
  },
  space_irradiance: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: -1,
      max: 200000
    }
  },
  dust_factor: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  full_spectrum_panel: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  full_spectrum_space: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  ir_panel: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  ir_space: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  
  // Electrical readings
  current: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  voltage: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  power: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  crack_indicator: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  // Calculated metrics
  shading_variation: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  efficiency: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  // System info
  rssi: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  uptime_hours: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  
  // Timestamp from device
  device_timestamp: {
    type: DataTypes.BIGINT,
    allowNull: true
  }
}, {
  tableName: 'sensor_readings',
  timestamps: true,
  updatedAt: 'updated_at',
  createdAt: 'timestamp',
  indexes: [
    {
      fields: ['device_id']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['device_id', 'timestamp']
    },
    {
      fields: ['dust_factor']
    },
    {
      fields: ['crack_indicator']
    }
  ]
});

module.exports = SensorReading;


