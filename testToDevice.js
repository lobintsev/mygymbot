const toggleDevice = require('./toggleDevice.js'); // Обратите внимание на правильное написание имени файла

const deviceId = process.env.DOOR_SENSOR_ID;

toggleDevice(deviceId, false)
  .then((status) => {
    console.log('Toggle status:', status);
  })
  .catch((error) => {
    console.error('An error occurred:', error);
  });