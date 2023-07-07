const ewelink = require('ewelink-api');
const express = require('express');
require('dotenv').config();

(async () => {
/* instantiate class */
const connection = new ewelink({
  email: process.env.EWELINK_EMAIL,
  password: process.env.EWELINK_PASSWORD,
  region: process.env.EWELINK_REGION,
});

/* get all devices */
const devices =  await connection.getRegion();
console.log(devices);
})();