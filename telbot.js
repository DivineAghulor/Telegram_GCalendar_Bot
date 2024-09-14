//TELEGRAM BOT FROM TELEGRAF NODE LIBRARY
import{ Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import dotenv from 'dotenv';
import { getPaths, loadSavedCredentialsIfExist, saveCredentials, authorize, listEvents, listTasks, createTask, updateTask, deleteTask } from './start.js';


dotenv.config()

const bot = new Telegraf(process.env.BOT_TOKEN)
//Bot processes and commands
bot.start((ctx) => ctx.reply('Welcome\nType \\signin to get started '))
bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.on(message('sticker'), (ctx) => ctx.reply('👍'))
bot.hears('hi', (ctx) => ctx.reply('Hey there'))

bot.command('signin', async (ctx) => ctx.reply(await signIn(ctx.chat.id)));

// bot.on('text', (ctx) => {
//     const receivedText = ctx.message.text; // Full text of the message
//     const [command, ...args] = receivedText.split(' '); // Splitting by space
    
//     console.log(`Command: ${command}`); // "/list"
//     console.log(`Arguments: ${args.join(' ')}`); // "50 items"
    
//     ctx.reply(`Command: ${command}, Arguments: ${args.join(' ')}`);
//   });
  
bot.command('listTasks', async (ctx) => {
    const receivedText = ctx.message.text;
    const [command, ...args] = receivedText.split(' ');
    ctx.reply(await tasksList(ctx.chat.id, args[0]));
})

bot.command('create', (ctx) => {
    ctx.reply('Please enter your text. The first line will be the title, and the rest will be the body.');
    
    // Listen for the next message to get the text input
    bot.on('text', async (ctx) => {
      const text = ctx.message.text;
      const lines = text.split('\n'); // Split the input text by new line
      
      const title = lines[0]; // First line is the title
      const body = lines.slice(1).join('\n'); // Remaining lines are the body
      
      // Save title and body in the session state
      ctx.session = { title, body };
      console.log("step 1")
      // Step 2: Prompt for Date Input
      await ctx.reply('Please enter a date (YYYY-MM-DD):');
      console.log("step 2")
      // Listen for the next message to get the date input
      bot.on('text', async (ctx) => {
        console.log("step 3")
        const date = ctx.message.text; // User input date
        console.log(date)
        // Validate date format (optional)
        if (!/\d{4}-\d{2}-\d{2}/.test(date)) {
          return ctx.reply('Invalid date format. Please use YYYY-MM-DD format.');
        }
        
        // Step 3: Store Title, Body, and Date in a JSON Object
        const result = {
          title: ctx.session.title,
          body: ctx.session.body,
          date,
        };
        
        console.log(result)
        // Output the JSON object
        ctx.reply(`Stored Data:\n${JSON.stringify(result, null, 2)}`);
      });
    });
  });
  

bot.command('update', async(ctx)=>{
    return null
})

bot.command('delete', async (ctx) => {
    return null
})

//Command functions definition
//use functions for every single thing please
async function signIn(userId){
    const res = await authorize(userId).then(listTasks).catch(console.error);
    return "Sign-in success!\nHere's your next ten tasks\n\n\n" + res;
}

async function tasksList(userId, maxRes) {
    const res = await listTasks(userId, parseInt(maxRes)).catch(console.error);
    return res
}




bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))