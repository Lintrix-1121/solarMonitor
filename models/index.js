const Device = require('./device');
const SensorReading = require('./sensorReading');
const LdrReading = require('./ldrReading');

// Define associations
Device.hasMany(SensorReading, { foreignKey: 'device_id', sourceKey: 'device_id' });
SensorReading.belongsTo(Device, { foreignKey: 'device_id', targetKey: 'device_id' });

SensorReading.hasMany(LdrReading, { foreignKey: 'reading_id' });
LdrReading.belongsTo(SensorReading, { foreignKey: 'reading_id' });

module.exports = {
  Device,
  SensorReading,
  LdrReading
};