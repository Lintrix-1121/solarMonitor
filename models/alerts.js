const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Alert = sequelize.define('Alert', {
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
  type: {
    type: DataTypes.ENUM('critical', 'warning', 'info'),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  rule_triggered: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g., dust_factor_high, crack_indicator_high, shading_variation_high, device_offline, efficiency_low, voltage_fluctuation'
  },
  metric_value: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'The value that triggered the alert (e.g., dust_factor = 65.2)'
  },
  status: {
    type: DataTypes.ENUM('active', 'acknowledged', 'resolved'),
    defaultValue: 'active'
  },
  acknowledged_by: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  acknowledged_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'alerts',
  timestamps: true,
  updatedAt: 'updated_at',
  createdAt: 'created_at',
  indexes: [
    { fields: ['device_id'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['created_at'] },
    { fields: ['device_id', 'status'] }
  ]
});

module.exports = Alert;