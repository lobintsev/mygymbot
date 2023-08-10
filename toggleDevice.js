const ewelink = require('ewelink-api');
const dotenv = require('dotenv');
dotenv.config();

async function toggleDevice(deviceId) {
  const connection = new ewelink({
    at: process.env.EWELINK_TOKEN,
    region: process.env.EWELINK_REGION,
  });

  const status = await connection.toggleDevice(deviceId);
  return status;
}

module.exports = toggleDevice;