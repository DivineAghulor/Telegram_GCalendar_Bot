//TELEGRAM BOT FROM TELEGRAF NODE LIBRARY
import{ Telegraf, Scenes, session } from 'telegraf';
import { message } from 'telegraf/filters';
import dotenv from 'dotenv';
import { getPaths, loadSavedCredentialsIfExist, saveCredentials, authorize, listEvents, listTasks, createTask, updateTask, deleteTask } from './start.js';
import dayjs from 'dayjs';
import { extractId } from './utils.js'

const { BaseScene, Stage } = Scenes;

dotenv.config()

const bot = new Telegraf(process.env.BOT_TOKEN)
//Bot processes and commands
bot.start((ctx) => ctx.reply('Welcome\nType \\signin to get started '));

bot.help((ctx) => ctx.reply('Send me a sticker'));

bot.on(message('sticker'), (ctx) => ctx.reply('👍'));

bot.hears('hi', (ctx) => ctx.reply('Hey there'));

//Sign In command - uses sign in function to authorize and return first 10 tasks
bot.command('signin', async (ctx) => ctx.reply(await signIn(ctx.chat.id)));

//List Tasks command (Read operation) - uses tasksList function which accepts chat id and an integer to return that number of tasks
bot.command('listTasks', async (ctx) => {
    const receivedText = ctx.message.text;
    const [command, ...args] = receivedText.split(' ');
    ctx.reply(await tasksList(ctx.chat.id, args[0]));
})

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
dateScene.enter((ctx) => ctx.reply('Select date. Or type in YYYY-MM-DD format'));
dateScene.on('text', async (ctx) => {
  console.log("step 3 - date scene")
  const date = ctx.message.text; // User input date
  console.log(date)
  // Validate date format (optional)
  if (!/\d{4}-\d{2}-\d{2}/.test(date)) {
    return ctx.reply('Invalid date format. Please use YYYY-MM-DD format.');
  }

  ctx.session.date = date
  const reply = `Title: ${ctx.session.title} \nDue date: ${ctx.session.date}`
  console.log(reply)
  ctx.reply(reply)

  const req = {//payload to be passed itno createTask function
    title: ctx.session.title,
    notes: ctx.session.body,
    due: dayjs(ctx.session.date).format('YYYY-MM-DDTHH:mm:ssZ')
  }

  const res = await taskCreate(ctx.chat.id, req);

  console.log("Task added successfully");

  ctx.reply(`Task added successfully.\nTask ID: ${res.id}`)

  ctx.scene.leave()
  //pass the data in to createTask and test
})


//DELETE SCENE
const deleteScene = new BaseScene('DELETE_SCENE');
deleteScene.enter((ctx) => ctx.reply("Copy and Paste the message I sent when you created the function.\nIt's in the format:\n\n\"Task added successfully.\nTask ID: NGJaZUVpdHZkb2VjV1pDbQ\""))
deleteScene.on('text', async (ctx) => {
  const taskId = extractId(ctx.message.text)
  const res = await taskDelete(ctx.chat.id, taskId)
  ctx.reply(res);
})


//MIDDLEWARE INITIALIZATION
const stage = new Stage([createScene, dateScene, deleteScene]);

bot.use(session()); // Enable session middleware
bot.use(stage.middleware()); // Enable scene middleware


bot.command('create', (ctx) => {
  ctx.scene.enter('CREATE_SCENE');
})

bot.command('update', (ctx)=>{
  let reply = "Copy and Paste the message I sent when you created the function.\nIt's in the format:\n\n\"Task added successfully.\nTask ID: NGJaZUVpdHZkb2VjV1pDbQ\""
  ctx.reply(reply)
  const taskId = extractId(ctx.message.text)



})

bot.command('delete', async (ctx) => {
  ctx.scene.enter('DELETE_SCENE');
})

//Command functions definition
//use functions for every single thing please
async function signIn(userId){
    const res = await authorize(userId).then(listTasks).catch(console.error);
    return "Sign-in success!\nHere's your next ten tasks\n\n\n" + res;
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



bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))