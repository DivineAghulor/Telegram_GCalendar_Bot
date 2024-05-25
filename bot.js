import TelegramBot from 'node-telegram-bot-api';
import { data } from './config.js';

const token = data.token; // Replace with your actual bot token

const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  if (messageText === '/start') {
    bot.sendMessage(chatId, 'Welcome to the bot!');
  }

  if (messageText.toLowerCase().includes('hello')) {
    bot.sendMessage(chatId, 'Hello\nWhat can I do fo ryou');
  }

  var bye = "bye";
  const photourl = "C:/Users/DELL/Documents/Coding Projects/Telegram_GCalendar_Bot/photo_2024-05-03_04-36-18.jpg"
  if (messageText.includes(bye)){
    bot.sendPhoto(chatId, photourl);

  }
});
