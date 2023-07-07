import TelegramBot from "node-telegram-bot-api";
import { Sequelize, Model, DataTypes } from "sequelize";
import dotenv from "dotenv";
import toggleDevice from "./togleDevice.js";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
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
    device_id: DataTypes.STRING,
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
      bot.sendMessage(
        msg.chat.id,
        `Hi ${user.first_name}! Now you can open the door by typing /opendoor or clicking the button below:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Open the door", callback_data: "opendoor" }],
            ],
          },
        }
      );
    } else {
      console.log("No user found in database, registering new user."); // log the condition where no user was found
      user = await User.create({
        telegram_id: msg.from.id,
        first_name: msg.from.first_name,
        last_name: msg.from.last_name,
      });
      console.log("User registered successfully:", user); // log the newly registered user
      bot.sendMessage(msg.chat.id, "You have been registered successfully.");
    }
  } catch (err) {
    console.error(err);
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  console.log(msg);
  const user = await User.findOne({ where: { telegram_id: msg.chat.id } });
  if (user) {
    if (callbackQuery.data === "opendoor") {
      toggleDevice(process.env.DOOR_SENSOR_ID);
      bot.sendMessage(msg.chat.id, "The door has been opened.");
    }
  } else {
    bot.sendMessage(msg.chat.id, "You must be registered to open the door.");
  }
});

bot.onText(/\/opendoor/, async (msg) => {
  try {
    const user = await User.findOne({ where: { telegram_id: msg.from.id } });
    if (user) {
      toggleDevice(process.env.DOOR_SENSOR_ID);
      bot.sendMessage(msg.chat.id, "The door has been opened.");
    } else {
      bot.sendMessage(msg.chat.id, "You must be registered to open the door.");
    }
  } catch (err) {
    console.error("An error occurred while processing /opendoor:", err);
    bot.sendMessage(msg.chat.id, "An error occurred. Please try again later.");
  }
});
