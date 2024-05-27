import TelegramBot from 'node-telegram-bot-api';
import { data } from './config.js';
import * as utils from "./utills.js"

const token = data.token; // Replace with your actual bot token

const bot = new TelegramBot(token, { polling: true });

const reply = {
  "start": "Welcome to the bot",
  "hello": "Hello.\nWhat can I do for you",
  "calendar": `Send the details of the event in this format.\n
  Event title e.g CSC223 Assignment\n
  Location e.g Room, Library, H107\n
  Description e.g Do the assignment and submit as PDF to course rep\n
  Start day in DD-MM-YY format e.g 27-01-24\n
  Start time in hh-mm (24 hour) format e.g 17-50\n
  End day in DD-MM-YY format e.g 27-01-24\n
  End time in hh-mm (24 hour) format e.g 17-50\n`
}

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  if (messageText === '/start') {
    bot.sendMessage(chatId, reply.start);
  }

  if (messageText.toLowerCase().includes('hello')) {
    bot.sendMessage(chatId, reply.hello);
  }

  if(messageText === '/calendar') {
    bot.sendMessage(chatId, reply.calendar);
  }

  const photourl = "C:/Users/DELL/Documents/Coding Projects/Telegram_GCalendar_Bot/photo_2024-05-03_04-36-18.jpg"
  if (messageText.includes("bye")){
    bot.sendPhoto(chatId, photourl);
  }


  const input_list = messageText.split("\n");

  let start = utils.convertToDatetime(input_list[3], input_list[4]);
  let end = utils.convertToDatetime(input_list[5], input_list[6]);


  const event = {
    "summary" : input_list[0],
    "location" : input_list[1],
    "description" : input_list[2],
    "start" : {"dateTime" : `${start}`},
    "end" : {"dateTime" : `${end}`}
  }
  
  console.log(event);
});

