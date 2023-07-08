const ewelink = require('ewelink-api');
require('dotenv').config();

(async () => {

  const newConnection = new ewelink({
    at: process.env.EWELINK_TOKEN,
    region: process.env.EWELINK_REGION,
  });

  const devices = await newConnection.getDevices();
  console.log(devices);

})();