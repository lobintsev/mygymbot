import toggleDevice from './togleDevice.js';

const deviceId = process.env.DOOR_SENSOR_ID;

toggleDevice(deviceId)
  .then((status) => {
    console.log('Toggle status:', status);
  })
  .catch((error) => {
    console.error('An error occurred:', error);
  });
