const ewelink = require('ewelink-api');
const express = require('express');
require('dotenv').config();

(async () => {
  const connection = new ewelink({
    at: process.env.EWELINK_TOKEN,
    region: process.env.EWELINK_REGION,
  });

  const deviceId = process.argv[2]; // Get the device ID from the command-line argument

  const device = await connection.getDevice(deviceId);
  console.log(device);
})();