import ewelink from 'ewelink-api';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  /* instantiate class */
  const connection = new ewelink({
    email: process.env.EWELINK_EMAIL,
    password: process.env.EWELINK_PASSWORD,
    region: process.env.EWELINK_REGION,
  });

  /* get all devices */
  const auth = await connection.getCredentials();

  // Log the entire response object
  console.log('Auth Response:', auth);

  if (auth && auth.user) {
    console.log('access token: ', auth.at);
    console.log('api key: ', auth.user.apikey);
    console.log('region: ', auth.region);
  } else {
    console.log('Unexpected auth structure:', auth);
  }
})();
