import TelegramBot from "node-telegram-bot-api";
import { Sequelize, Model, DataTypes } from "sequelize";
import dotenv from "dotenv";
import toggleDevice from "./togleDevice.js";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || "localhost",
  dialect: process.env.DB_DIALECT || "mysql",
  port: parseInt(process.env.DB_PORT) || 3306,
});

class User extends Model {}
User.init(
  {
    telegram_id: DataTypes.INTEGER,
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    phone_number: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: "user",
  }
);

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");

    await sequelize.sync();
    console.log("Database synchronized successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
})();

bot.setMyCommands([
  { command: "/start", description: "Start the bot" },
  // Add more commands here as necessary
]);

bot.onText(/\/start/, async (msg) => {
  try {
    const user = await User.findOne({ where: { telegram_id: msg.from.id } });
    if (user) {
      // User is already registered
      const currentTime = new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow', hour: 'numeric' });
      const currentHour = parseInt(currentTime, 10);
      const isNightTime = currentHour >= 22 || currentHour < 7;

      const replyMarkup = {
        inline_keyboard: [
          isNightTime
            ? []
            : [{ text: "Open the door", callback_data: "opendoor" }],
          [{ text: "My Data", callback_data: "mydata" }]
        ],
      };

      bot.sendMessage(
        msg.chat.id,
        isNightTime
          ? `Hi ${user.first_name}! It's night time, you can't open the door now.`
          : `Hi ${user.first_name}! Now you can open the door by clicking the button below:`,
        {
          reply_markup: replyMarkup,
        }
      );
    } else {
      // User is not registered, request contact information
      const options = {
        reply_markup: {
          keyboard: [[{ text: "Share Contact", request_contact: true }]],
          one_time_keyboard: true,
        },
      };

      bot.sendMessage(msg.chat.id, "You are not registered. Please provide your contact information.", options);
    }
  } catch (err) {
    console.error(err);
  }
});

bot.on("contact", async (msg) => {
  try {
    const user = await User.findOne({ where: { telegram_id: msg.from.id } });
    if (user) {
      // User is already registered, no need to handle contact information
      // ...
    } else {
      // User is not registered, register the user with the contact information
      const contact = msg.contact;
      const newUser = await User.create({
        telegram_id: contact.user_id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        phone_number: contact.phone_number,
      });

      // Registration successful
      bot.sendMessage(msg.chat.id, "You have been registered successfully.");
    }
  } catch (err) {
    console.error(err);
  }
});
bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const { data } = callbackQuery;
  const user = await User.findOne({ where: { telegram_id: msg.chat.id } });

  if (data === "mydata") {
    if (user) {
      const message = `Your Data:\nFirst Name: ${user.first_name}\nLast Name: ${user.last_name}\nTelegram ID: ${user.telegram_id}\nPhone Number: ${user.phone_number}`;
      bot.sendMessage(msg.chat.id, message);
      // Request the user's location
      const locationOptions = {
        reply_markup: {
          keyboard: [
            [
              {
                text: "Send My Location",
                request_location: true,
              },
            ],
          ],
          one_time_keyboard: true,
        },
      };

      bot.sendMessage(msg.chat.id, "Please send your location.", locationOptions);
    } else {
      bot.sendMessage(msg.chat.id, "You are not registered. Please register to view your data.");
    }
    bot.sendMessage(msg.chat.id, "To interact with the bot, please use the /start command.");
  }

   else if (data === "opendoor") {
    if (user) {
      const response = await toggleDevice(process.env.DOOR_SENSOR_ID);
      let message;
      if (response.status === "ok") {
        message = `The door has been opened. Response: ${JSON.stringify(response)}`;
      } else {
        message = `An error occurred while opening the door. Response: ${JSON.stringify(response)}`;
      }
      bot.sendMessage(msg.chat.id, message);
    } else {
      bot.sendMessage(msg.chat.id, "You must be registered to open the door.");
    }
  }
});

bot.on("location", async (msg) => {
  try {
    const user = await User.findOne({ where: { telegram_id: msg.from.id } });
    if (user) {
      const location = msg.location;
      const message = `Your Location:\nLatitude: ${location.latitude}\nLongitude: ${location.longitude}`;
      bot.sendMessage(msg.chat.id, message);
    } else {
      bot.sendMessage(msg.chat.id, "You are not registered. Please register to view your data.");
    }
    bot.sendMessage(msg.chat.id, "To interact with the bot, please use the /start command.");
  } catch (err) {
    console.error(err);
  }
});
