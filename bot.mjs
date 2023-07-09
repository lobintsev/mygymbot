import TelegramBot from "node-telegram-bot-api";
import { Sequelize, Model, DataTypes } from "sequelize";
import dotenv from "dotenv";
import toggleDevice from "./togleDevice.js";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const targetLatitude = 47.2681; // Replace with the target latitude
const targetLongitude = 39.789777; // Replace with the target longitude
const maxDistance = 100; // Maximum distance in meters

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
      const currentTime = new Date().toLocaleString("en-US", {
        timeZone: "Europe/Moscow",
        hour: "numeric",
        hour12: false,
      });
      const currentHour = parseInt(currentTime, 10);
      const isNightTime = currentHour >= 22 || currentHour < 7;

      const replyMarkup = {
        inline_keyboard: [
          isNightTime
            ? []
            : [{ text: "Open the door", callback_data: "opendoor" }],
          [{ text: "My Data", callback_data: "mydata" }],
        ],
      };

      bot.sendMessage(
        msg.chat.id,
        isNightTime
          ? `Hi ${user.first_name}! It's ${currentHour}, you can't open the door now.`
          : `Hi ${user.first_name}! It's ${currentHour}. Now you can open the door by clicking the button below:`,
        {
          reply_markup: replyMarkup,
        }
      );
    } else {
      // User is not registered, request contact information
      const options = {
        reply_markup: {
          keyboard: [
            [{ text: "Share Contact", request_contact: true }],
            [{ text: "Share My Location", request_location: true }],
          ],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      };

      bot.sendMessage(
        msg.chat.id,
        "You are not registered. Please provide your contact information.",
        options
      );
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
  const data = callbackQuery.data;
  const user = await User.findOne({ where: { telegram_id: msg.chat.id } });

  if (data === "mydata") {
    if (user) {
      const message =
        "Your Data:\n" +
        "First Name: " +
        user.first_name +
        "\n" +
        "Last Name: " +
        user.last_name +
        "\n" +
        "Telegram ID: " +
        user.telegram_id +
        "\n" +
        "Phone Number: " +
        user.phone_number;

      bot.sendMessage(msg.chat.id, message);
    } else {
      bot.sendMessage(
        msg.chat.id,
        "You are not registered. Please register to view your data."
      );
    }
  } else if (data === "opendoor") {
    if (user) {
      const options = {
        reply_markup: {
          keyboard: [[{ text: "Share My Location", request_location: true }]],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      };
      bot.sendMessage(
        msg.chat.id,
        "Please share your location to open the door.",
        options
      );
    } else {
      bot.sendMessage(msg.chat.id, "You must be registered to open the door.");
    }
  }
});

bot.on("location", async (msg) => {
  try {
    const user = await User.findOne({ where: { telegram_id: msg.from.id } });
    if (user) {
      const userLatitude = msg.location.latitude;
      const userLongitude = msg.location.longitude;

      console.log(
        `Received location from user ${msg.from.id}: latitude ${userLatitude}, longitude ${userLongitude}`
      );

      const distance = calculateDistance(
        userLatitude,
        userLongitude,
        targetLatitude,
        targetLongitude
      );

      console.log(
        `Calculated distance from target location: ${distance} meters`
      );

      if (distance <= maxDistance) {
        console.log(
          `User ${msg.from.id} is within range, attempting to open door...`
        );
        const response = await toggleDevice(process.env.DOOR_SENSOR_ID);
        let message;
        let replyMarkup;
        if (response.status === "ok") {
          message = "The door has been opened";
          replyMarkup = {
            reply_markup: {
              remove_keyboard: true,
            },
          };
        } else {
          message = "An error occurred while opening the door.";
        }
        bot.sendMessage(msg.chat.id, message, replyMarkup);
      } else {
        console.log(`User ${msg.from.id} is not within range.`);
        bot.sendMessage(
          msg.chat.id,
          "Sorry, you are not within range to open the door."
        );
      }
    } else {
      console.log(`Unregistered user ${msg.from.id} attempted to open door.`);
      bot.sendMessage(msg.chat.id, "You must be registered to open the door.");
    }
  } catch (err) {
    console.error(err);
  }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadius * c;
  return distance;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
