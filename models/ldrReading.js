const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const LdrReading = sequelize.define('LdrReading', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  reading_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sensor_readings',
      key: 'id'
    }
  },
  position: {
    type: DataTypes.ENUM('North', 'East', 'South', 'West'),
    allowNull: false
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
      max: 4095
    }
  }
}, {
  tableName: 'ldr_readings',
  timestamps: false,
  indexes: [
    {
      fields: ['reading_id']
    }
  ]
});

module.exports = LdrReading;


