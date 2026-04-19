const Device = require('./device');
const SensorReading = require('./sensorReading');
const LdrReading = require('./ldrReading');
const Alert = require('./alerts');

// Define associations
Device.hasMany(SensorReading, { foreignKey: 'device_id', sourceKey: 'device_id' });
SensorReading.belongsTo(Device, { foreignKey: 'device_id', targetKey: 'device_id' });

SensorReading.hasMany(LdrReading, { foreignKey: 'reading_id' });
LdrReading.belongsTo(SensorReading, { foreignKey: 'reading_id' });
Alert.belongsTo(Device, { foreignKey: 'device_id', targetKey: 'device_id'

});
Device.hasMany(Alert, { foreignKey: 'device_id' });

module.exports = {
  Device,
  SensorReading,
  LdrReading
};