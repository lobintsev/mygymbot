import TelegramBot from "node-telegram-bot-api";
import { Sequelize, Model, DataTypes } from "sequelize";
import dotenv from "dotenv";
import toggleDevice from "./togleDevice.js";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const targetLatitude = process.env.MYGYM_LATITUDE; // Replace with the target latitude
const targetLongitude = process.env.MYGYM_LONGITUDE; // Replace with the target longitude
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

sequelize
  .sync()
  .then(() => {
    console.log("Database synchronized successfully.");
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });

bot.setMyCommands([
  { command: "/start", description: "Запуск!" },
  // Add more commands here as necessary
]);

const replyMarkupRegular = {
  keyboard: [["📋 Услуги", "🚪 Вход"], ["👤 Личный кабинет"]],
  resize_keyboard: true,
};

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

      bot.sendMessage(
        msg.chat.id,
        `Привет ${user.first_name}! `,
        { reply_markup: replyMarkupRegular }
      );
    } else {
      // User is not registered, request contact information
      const options = {
        reply_markup: {
          keyboard: [
            [{ text: "Поделиться контактами", request_contact: true }],
          ],
          one_time_keyboard: false,
          resize_keyboard: true,
        },
      };

      bot.sendMessage(
        msg.chat.id,
        "Вы не зарегистрированы. Пожалуйста, поделитесь своими контактами, чтобы зарегистрироваться",
        options
      );
    }
  } catch (err) {
    console.error(err);
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  switch (msg.text) {
    case "🚪 Вход":
      try {
        const user = await User.findOne({
          where: { telegram_id: msg.from.id },
        });
        if (user) {
          const currentTime = new Date().toLocaleString("en-US", {
            timeZone: "Europe/Moscow",
            hour: "numeric",
            hour12: false,
          });
          const currentHour = parseInt(currentTime, 10);
          const isNightTime = currentHour >= 22 || currentHour < 7;

          if (!isNightTime) {
            const replyMarkupInline = {
              inline_keyboard: [
                [{ text: "Открыть дверь", callback_data: "opendoor" }],
              
              ],
            };

            bot.sendMessage(
              chatId,
              "Нажмите кнопку ниже, чтобы открыть дверь:",
              {
                reply_markup: replyMarkupInline,
              }
            );
          } else {
            bot.sendMessage(
              chatId,
              "Сейчас ночное время. Пожалуйста, приходите с 7:00 до 22:00.",
              { reply_markup: replyMarkupRegular }
            );
          }
        }
      } catch (err) {
        console.error(err);
      }
      break;

    case "📋 Услуги":
      const replyMarkupInlineStore = {
        inline_keyboard: [[{ text: "Разовое посещение", callback_data: "oneTimeVisit" }], [{ text: "Абонемент", callback_data: "continiousVisit" }]],
      };

      bot.sendMessage(
        chatId,

        "Выберете услуги для приобретения:",
        { reply_markup: replyMarkupInlineStore }
      );
      break;

    case "👤 Личный кабинет":
      const replyMarkupInlineProfile = {
        inline_keyboard: [[{ text: "Мои данные", callback_data: "mydata" }], [{ text: "Платежная информация", callback_data: "paymentdata" }]],
      };

      bot.sendMessage(
        chatId,

        "Выберете раздел для просмотра:",
        { reply_markup: replyMarkupInlineProfile }
      );
      break;

    case "Trainings":
      // Implement your logic for the Trainings button
      break;
  }
});

bot.on("contact", async (msg) => {
  try {
    const contact = msg.contact;
    const newUser = await User.create({
      telegram_id: contact.user_id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      phone_number: contact.phone_number,
    });

    // Registration successful
    bot.sendMessage(msg.chat.id, "Регистрация прошла успешно!", {
      reply_markup: replyMarkupRegular,
    });
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
        "Ваши данные:\n" +
        "Имя: " +
        user.first_name +
        "\n" +
        "Фамилия: " +
        user.last_name +
        "\n" +
        "Telegram ID: " +
        user.telegram_id +
        "\n" +
        "Номер телефона: " +
        user.phone_number;

      bot.sendMessage(msg.chat.id, message);
    } else {
      bot.sendMessage(
        msg.chat.id,
        "Вы не зарегистрированы. Пожалуйста, пройдите регистрацию."
      );
    }
  } else if (data === "opendoor") {
    if (user) {
      const options = {
        reply_markup: {
          keyboard: [
            [{ text: "Поделиться геопозицией", request_location: true }],
          ],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      };
      bot.sendMessage(
        msg.chat.id,
        "Поделитесь геопозицией, чтобы открыть дверь.",
        options
      );
    } else {
      bot.sendMessage(
        msg.chat.id,
        "Вы должны быть зарегистрированы, чтобы открыть дверь."
      );
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
          message = "Дверь открыта! Не забудьте закрыть ее после входа.";
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
        bot.sendMessage(msg.chat.id, "Вы слишком далеко, чтобы открыть дверь.", {
          reply_markup: replyMarkupRegular,
        });
        
      }
    } else {
      console.log(`Unregistered user ${msg.from.id} attempted to open door.`);
      bot.sendMessage(msg.chat.id, "You must be registered to open the door.", {
        reply_markup: replyMarkupRegular,
      });
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
