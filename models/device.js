const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  device_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  mac_address: {
    type: DataTypes.STRING(17),
    allowNull: true,
    validate: {
      is: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
    }
  },
  firmware_version: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
    defaultValue: 'active'
  },
  last_seen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  first_seen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'devices',
  timestamps: true,
  updatedAt: 'updated_at',
  createdAt: 'created_at',
  indexes: [
    {
      fields: ['device_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['last_seen']
    }
  ]
});

module.exports = Device;