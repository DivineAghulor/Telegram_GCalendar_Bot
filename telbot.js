//TELEGRAM BOT FROM TELEGRAF NODE LIBRARY
import{ Telegraf, Scenes, session, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import dotenv from 'dotenv';
import { getPaths, loadSavedCredentialsIfExist, saveCredentials, authorize, listEvents, listTasks, createTask, updateTask, deleteTask } from './start.js';
import dayjs from 'dayjs';
import { extractId } from './utils.js'
import {Calendar} from 'telegram-inline-calendar';

const { BaseScene, Stage } = Scenes;



dotenv.config()

const bot = new Telegraf(process.env.BOT_TOKEN)
const calendar = new Calendar(bot, {
  date_format: 'YYYY-MM-DD',
  language: 'en',
  bot_api: 'telegraf'
});



//Bot processes and commands
bot.start((ctx) => {
  ctx.reply('Welcome\nPlease Sign-In with your google account to get started\nType \\signin or use the button below\n\ndisclaimer: this bot is not run by google inc.', 
    Markup.inlineKeyboard([
      [Markup.button.callback('Sign-in with Google', 'SIGNIN')],
    ]), 
  )
  });

bot.help((ctx) => ctx.reply("Restart the bot and sign in to google account by sending '\\start'"));

// bot.on(message('sticker'), (ctx) => ctx.reply('👍'));

bot.hears('hi', (ctx) => ctx.reply('Hey there. Type \\start to get started'));

//Sign In command - uses sign in function to authorize and return first 10 tasks
bot.command('signin', async (ctx) => {
  ctx.reply(await signIn(ctx.chat.id));
  defaultReply(ctx)
});

//List Tasks command (Read operation) - uses tasksList function which accepts chat id and an integer to return that number of tasks
bot.command('listTasks', async (ctx) => {
    const receivedText = ctx.message.text;
    const [command, ...args] = receivedText.split(' ');
    ctx.reply(await tasksList(ctx.chat.id, args[0]));
    defaultReply(ctx)
})


//SCENES DEFINITION

//CREATE SCENE. This is the entry point for the createTask command. It enters into the DATE SCENE
const createScene = new BaseScene('CREATE_SCENE');
createScene.enter((ctx) => ctx.reply('Add a Task\nPlease enter your text. The first line will be the title, and the rest will be the body.'));
createScene.on('text', (ctx) =>{
  // Listen for the next message to get the text input
  
  const text = ctx.message.text;
  const lines = text.split('\n'); // Split the input text by new line
    
  const title = lines[0]; // First line is the title
  const body = lines.slice(1).join('\n'); // Remaining lines are the body
    
    // Save title and body in the session state
  ctx.session.title = title;
  ctx.session.body = body;

  console.log("step 1")

  ctx.scene.enter('DATE_SCENE')
   // Step 2: Prompt for Date Input
  console.log("step 2")
   // Listen for the next message to get the date input
    
});


//DATE SCENE. This holds the data and calls the taskCreate function which returns the created task in JSON
const dateScene = new BaseScene('DATE_SCENE');
dateScene.enter((ctx) => {
  calendar.startNavCalendar(ctx);
  ctx.reply('Select date. Or type in YYYY-MM-DD format')
}
); 
dateScene.on('text', async (ctx) => {
  console.log("step 3 - date scene")
  const date = ctx.message.text; // User input date
  console.log(date)
  const currentDate = dayjs()
  const dueDate = dayjs(date)
  // Validate date format (optional)
  if (!/\d{4}-\d{2}-\d{2}/.test(date)) {
    return ctx.reply('Invalid date format. Please use YYYY-MM-DD format.');
  }

  if (dueDate.isBefore(currentDate, 'day')) {
    // ctx.scene.enter('DATE_SCENE')
    return ctx.reply('Invalid date entered. Please try the command again with a current or future date');
  }


  ctx.session.date = date
  const reply = `Title: ${ctx.session.title} \nDue date: ${ctx.session.date}`
  console.log(reply)
  ctx.reply(reply)

  const req = {//payload to be passed into createTask function
    title: ctx.session.title,
    notes: ctx.session.body,
    due: dayjs(ctx.session.date).format('YYYY-MM-DDTHH:mm:ssZ')
  }

  const res = await taskCreate(ctx.chat.id, req);

  console.log("Task added successfully");

  ctx.reply(`Task added successfully.\nTask ID: ${res.id}`,
    Markup.inlineKeyboard([
      [Markup.button.callback('Update', 'UPDATE_BUTTON'),
      Markup.button.callback('Delete', 'DELETE_BUTTON')],
    ])
  )

  defaultReply(ctx)
  ctx.scene.leave()
  //pass the data in to createTask and test
})

dateScene.on("callback_query", async (ctx) => {
  if (ctx.callbackQuery.message.message_id == calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
      let date;
      date = calendar.clickButtonCalendar(ctx);

      const currentDate = dayjs()
      const dueDate = dayjs(date)
      if (dueDate.isBefore(currentDate, 'day')) {
        return ctx.reply('Invalid date entered. Please try the command again with a current or future date');
      }

      if (date !== -1) {
          ctx.session.date = date;
          const reply = `Title: ${ctx.session.title} \nDue date: ${ctx.session.date}`
          console.log(reply)
          ctx.reply(reply)
      }
  }
  const req = {//payload to be passed into createTask function
    title: ctx.session.title,
    notes: ctx.session.body,
    due: dayjs(ctx.session.date).format('YYYY-MM-DDTHH:mm:ssZ')
  }

  const res = await taskCreate(ctx.chat.id, req);

  console.log("Task added successfully");

  ctx.reply(`Task added successfully.\nTask ID: ${res.id}`, 
    Markup.inlineKeyboard([
    [Markup.button.callback('Update', 'UPDATE_BUTTON'),
      Markup.button.callback('Delete', 'DELETE_BUTTON')],
  ]))

  defaultReply(ctx)
  ctx.scene.leave()
  //pass the data in to createTask and test
});


//UPDATE SCENE
const updateScene = new BaseScene('UPDATE_SCENE');
updateScene.enter(async (ctx) => {
  ctx.reply(`Updating\n\n${ctx.session.args.join(": ")}`);
  if (ctx.session.args[0] === 'title'){
    const req = {title: ctx.session.args[1]}
    try{
      const res = await taskUpdate(ctx.chat.id, ctx.session.taskId, req)

      console.log("Task updated successfully");

      ctx.reply(`Task updated successfully.\nTask ID: ${res.id}`, 
        Markup.inlineKeyboard([
        [Markup.button.callback('Update', 'UPDATE_BUTTON'), Markup.button.callback('Delete', 'DELETE_BUTTON')],
      ]))
    } catch {
      console.error();
      ctx.reply("Failed to update task. Try again")
    }
  } else if (ctx.session.args[0] === 'notes'){
    const req = {notes: ctx.session.args[1]}
    try{
      const res = await taskUpdate(ctx.chat.id, ctx.session.taskId, req)

      console.log("Task updated successfully");

      ctx.reply(`Task updated successfully.\nTask ID: ${res.id}`, 
        Markup.inlineKeyboard([
        [Markup.button.callback('Update', 'UPDATE_BUTTON'), Markup.button.callback('Delete', 'DELETE_BUTTON')],
      ]))
    } catch {
      console.error();
      ctx.reply("Failed to update task. Try again")
    }
  } else if (ctx.session.args[0] === 'due'){
    const req = {due: ctx.session.args[1]}
    try{
      const res = await taskUpdate(ctx.chat.id, ctx.session.taskId, req)

      console.log("Task updated successfully");

      ctx.reply(`Task updated successfully.\nTask ID: ${res.id}`, 
        Markup.inlineKeyboard([
        [Markup.button.callback('Update', 'UPDATE_BUTTON'), Markup.button.callback('Delete', 'DELETE_BUTTON')],
      ]))
    } catch {
      console.error();
      ctx.reply("Failed to update task. Try again")
    }
  } 

  defaultReply(ctx)
  ctx.scene.leave()
})



//DELETE SCENE
const deleteScene = new BaseScene('DELETE_SCENE');
deleteScene.enter((ctx) => ctx.reply("Copy and Paste the message I sent when you created the function.\nIt's in the format:\n\n\"Task added successfully.\nTask ID: NGJaZUVpdHZkb2VjV1pDbQ\""))
deleteScene.on('text', async (ctx) => {
  const taskId = extractId(ctx.message.text)
  const res = await taskDelete(ctx.chat.id, taskId)
  ctx.reply(res);
  defaultReply(ctx)
  ctx.scene.leave()
})


//MIDDLEWARE INITIALIZATION
const stage = new Stage([createScene, dateScene, deleteScene, updateScene]);

bot.use(session()); // Enable session middleware
bot.use(stage.middleware()); // Enable scene middleware


//BOT COMMAND HANDLERS
bot.command('create', (ctx) => {
  ctx.scene.enter('CREATE_SCENE');
})

bot.command('update', (ctx)=>{
  let reply = "Copy and Paste the message I sent when you created the function.\nIt's in the format:\n\n\"Task added successfully.\nTask ID: NGJaZUVpdHZkb2VjV1pDbQ\""
  ctx.reply(reply)
})

bot.command('delete', async (ctx) => {
  ctx.scene.enter('DELETE_SCENE');
})


//BUTTON PRESS HANDLERS
bot.action('SIGNIN', async (ctx) => {
  ctx.reply(await signIn(ctx.chat.id))
  defaultReply(ctx)
})

bot.action('CREATE_BUTTON', async (ctx) => {
  ctx.scene.enter('CREATE_SCENE');
})

bot.action('LIST_TASKS', async (ctx) => {
  ctx.reply(await tasksList(ctx.chat.id, 5));
  defaultReply(ctx)
})

bot.action('UPDATE_BUTTON', (ctx) => {
  ctx.reply('What would you like to Update',
    Markup.inlineKeyboard([
    [Markup.button.callback('Title', 'TITLE_UPDATE')],
    [Markup.button.callback('Description', 'DESC_UPDATE')],
    [Markup.button.callback('Date', 'DATE_UPDATE')],
  ]))
  ctx.session.taskId = extractId(ctx.callbackQuery.message.text)
  console.log(ctx.session.taskId)
  // ctx.session.args = []
})

bot.action('TITLE_UPDATE', (ctx) => {
  ctx.reply('What would you like to update the title to?')
  bot.on('text', (ctx) => {
    // ctx.session.args.push(`title:${ctx.message.text}`)
    ctx.session.args = ['title', `${ctx.message.text}`]
    ctx.scene.enter('UPDATE_SCENE')
  })
})

bot.action('DESC_UPDATE', (ctx) => {
  ctx.reply('What would you like to update the description body to?')
  bot.on('text', (ctx) => {
    // ctx.session.args.push(`notes:${ctx.message.text}`)
    ctx.session.args = ['notes', `${ctx.message.text}`]
    ctx.scene.enter('UPDATE_SCENE')
  })
})

bot.action('DATE_UPDATE', (ctx) => {
  calendar.startNavCalendar(ctx);
  ctx.reply('Select date or type in YYYY-MM-DD')

  bot.on('text', (ctx) => {
    if (!/\d{4}-\d{2}-\d{2}/.test(date)) {
      return ctx.reply('Invalid date format. Please use YYYY-MM-DD format.');
    }

    const currentDate = dayjs()
    const dueDate = dayjs(date)
    if (dueDate.isBefore(currentDate, 'day')) {
      return ctx.reply('Invalid date entered. Please try the command again with a current or future date');
    }
    // ctx.session.args.push(`due:${dayjs(ctx.message.text).format('YYYY-MM-DDTHH:mm:ssZ')}`)
    ctx.session.args = ['due', `${dayjs(ctx.message.text).format('YYYY-MM-DDTHH:mm:ssZ')}`]
    ctx.scene.enter('UPDATE_SCENE')
  })

  bot.on("callback_query", async(ctx) => {
    if (ctx.callbackQuery.message.message_id == calendar.chats.get(ctx.callbackQuery.message.chat.id)) {
      let date;
      date = calendar.clickButtonCalendar(ctx);
      const currentDate = dayjs()
      const dueDate = dayjs(date)
      if (dueDate.isBefore(currentDate, 'day')) {
        return ctx.reply('Invalid date entered. Please try the command again with a current or future date');
      }
      if (date !== -1) {
        // let datestr = `due:${dayjs(date).format('YYYY-MM-DDTHH:mm:ssZ')}`
        ctx.session.args = ['due', `${dayjs(date).format('YYYY-MM-DDTHH:mm:ssZ')}`]
      }
    }
    ctx.scene.enter('UPDATE_SCENE')
  })
})

bot.action('DELETE_BUTTON', (ctx) => {
  ctx.reply('Are you sure you want to delete this task?', 
    Markup.inlineKeyboard([
      [Markup.button.callback('Yes✅', 'DELETE_YES'), Markup.button.callback('No❌', 'DELETE_NO')],
    ]))
  ctx.session.taskId = extractId(ctx.callbackQuery.message.text)
})

bot.action('DELETE_YES', (ctx) => {
  taskDelete(ctx.chat.id, taskId)
    .then(() => ctx.reply('Task successfully deleted.'))
    .catch(() => {
      ctx.reply('Failed to delete task. Try again')
      console.error()
      }
      );
  
  defaultReply(ctx)
})

bot.action('DELETE_NO', (ctx) => {
  ctx.reply('Your task is safe ;)')

  defaultReply(ctx)
})


//Command functions definition
//use functions for every single thing please
async function signIn(userId){
    // const res = await authorize(userId).then(listTasks).catch(console.error);
    try{
      const res = await authorize(userId).then(listTasks)
      return "Sign-in success!\nHere's your next ten tasks\n\n\n" + res;
    } catch(err) {
      console.log(err)
      return "Sign-in failed. Please try again"
    }
    
}

async function tasksList(userId, maxRes) {
    //wtf am I passing in userId instead of the actual auth object from the authorize() function
    //How on earth was it even working before. Cos I know I typed this myself.
    const token = await authorize(userId);
    const maxResInt = parseInt(maxRes);
    const res = await listTasks(token, !isNaN(maxResInt) ? maxResInt : 10).catch(console.error);
    return res
}

async function taskCreate(userId, payload){
  const token = await authorize(userId)
  const res = await createTask(token, payload).catch(console.error);
  return res;
}

//THIS IS NOT COMPLETE
async function taskUpdate(userId, taskId, payload){
  const token = await authorize(userId)
  const res = await updateTask(token, taskId, payload).catch(console.error);
  return res;
}

async function taskDelete(userId, taskId){
  const token = await authorize(userId);
  try {
    const res = await deleteTask(token, taskId);
    return res;
  } catch (error) {
    return "Problem encountered while deleting task";
  }
}

function defaultReply(ctx){
  ctx.reply("What would you like to do?\nType command to see all the text commands", 
    Markup.inlineKeyboard([
      [Markup.button.callback('Add Task', 'CREATE_BUTTON'), Markup.button.callback('See your next 5 tasks', 'LIST_TASKS')],
    ])
  )
}



bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))