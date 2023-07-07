const ewelink = require('ewelink-api');
require('dotenv').config();

(async () => {
/* instantiate class */
const connection = new ewelink({
  email: process.env.EWELINK_EMAIL,
  password: process.env.EWELINK_PASSWORD,
  region: process.env.EWELINK_REGION,
});

/* get all devices */
const auth = await connection.getCredentials();

console.log('access token: ', auth.at);
console.log('api key: ', auth.user.apikey);
console.log('region: ', auth.region);
})();