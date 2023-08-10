import eWeLink from 'ewelink-api';
import { config } from 'dotenv';

config();

const fetchDevices = async () => {
  /* instantiate class */
  const connection = new eWeLink({
    email: process.env.EWELINK_EMAIL,
    password: process.env.EWELINK_PASSWORD,
    region: process.env.EWELINK_REGION,
  });

  /* get all devices */
  const devices = await connection.getRegion();
  console.log(devices);
};

fetchDevices();
