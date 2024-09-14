import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import { fetchToken, createToken, updateToken, deleteToken, credData } from './supabase.js';
import dayjs from 'dayjs';


const SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/tasks'];

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');


                  
function getPaths(userId) {
  const basePath = process.cwd();
  return {
    tokenPath: path.join(basePath, `${userId}_token.json`),
  };
  //this should be useless later so you can comment it out when deploying
}

async function loadSavedCredentialsIfExist(userId) {
  const { tokenPath } = getPaths(userId);
  try {
    const content = await fs.readFile(tokenPath);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }

  /* this is my version using supabase
  try{
  const token = await fetchToken(userId);
  const credentials = JSON.parse(token)
  return google.auth.fromJSON(credentials);
  } catch (err) {
   console.log(err);
   return null;
  }
  */
}

async function saveCredentials(userId, client) {
  const { tokenPath } = getPaths(userId);
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(tokenPath, payload);

  /* this is my version using supabase
  const keys = JSON.parse(credData);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  const token = await createToken(userId, payload);
  return token;

  */
}

async function authorize(userId) {
  let client = await loadSavedCredentialsIfExist(userId);
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(userId, client);
  }
  return client;
}

async function listEvents(auth) {
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = res.data.items;
  if (!events || events.length === 0) {
    console.log('No upcoming events found.');
    return;
  }
  console.log('Upcoming 10 events:');
  let text = "Your upcoming events"
  events.map((event, i) => {
    const start = event.start.dateTime || event.start.date;
    console.log(`${start} - ${event.summary}`);
    text += `\n${start} - ${event.summary}`;
  });
  return text;
}

async function listTasks(auth, max = 10) {
  const tasks = google.tasks({ version: 'v1', auth });
  const res = await tasks.tasks.list({
    tasklist: '@default',
    maxResults: max,
  });
  const tasksList = res.data.items;
  if (!tasksList || tasksList.length === 0) {
    console.log('No tasks found.');
    return;
  }
  console.log('Upcoming tasks:');
  let text = "Your upcoming tasks";
  tasksList.forEach((task, i) => {
    const due = task.due || 'No due date';
    console.log(`${due} - ${task.title}`);
    text += `\n${due} - ${task.title}`;
  });
  return text;
}

async function createTask(auth, request) {
  const tasks = google.tasks({ version: 'v1', auth });
  const res = await tasks.tasks.insert({
    tasklist: '@default',
    requestBody: request,
  });
  console.log('Task created:', res.data);
  return res.data;
}

//send the taskid as a part of the message, so if they click the 
//update or delete button under it, the bot can just query the 
//last line of the message to retrieve the task id

async function updateTask(auth, taskId, updates) {
  const tasks = google.tasks({ version: 'v1', auth });
  const res = await tasks.tasks.patch({
    tasklist: '@default',
    task: taskId,
    requestBody: updates,
  });
  console.log('Task updated:', res.data);
  return res.data;
}

async function deleteTask(auth, taskId) {
  const tasks = google.tasks({ version: 'v1', auth });
  await tasks.tasks.delete({
    tasklist: '@default',
    task: taskId,
  });
  console.log('Task deleted');
}


//From here below is for testing only
// Example usage in a bot
// Replace '123456789' with the actual user ID from the bot context
const userId = '123456789';


const newrequest = {
  title: "Task code 2",
  notes: "This was created from VS code 3 again",
  due: dayjs("2024-09-04").format('YYYY-MM-DDTHH:mm:ssZ'),
}

const newrequest2 =  {
  title: "Task code 3",
  notes: "This was created from VS code 3 again",
  due: dayjs("2024-09-05").format('YYYY-MM-DDTHH:mm:ssZ'),
}
// authorize(userId).then(listTasks).catch(console.error); It works, but I wanna do something different

// try{
//   const token = await authorize(userId);
//   await listTasks(token);
//   const res = await createTask(token, newrequest)
//   updateTask(token, res.id, newrequest2);
// } catch (error) {
//   console.error(error)
// }




  

export { getPaths, loadSavedCredentialsIfExist, saveCredentials, authorize, listEvents, listTasks, createTask, updateTask, deleteTask };


//This isn't a real function. The body is what the former code was i.e. the code from google quickstart
// function formerCode(){
//   import fs from 'fs/promises';
// import path from 'path';
// import process from 'process';
// import { authenticate } from '@google-cloud/local-auth';
// import { google } from 'googleapis';

// // If modifying these scopes, delete token.json.
// const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// // The file token.json stores the user's access and refresh tokens, and is
// // created automatically when the authorization flow completes for the first
// // time.
// const TOKEN_PATH = path.join(process.cwd(), 'token.json');
// const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// /**
//  * Reads previously authorized credentials from the save file.
//  *
//  * @return {Promise<OAuth2Client|null>}
//  */
// async function loadSavedCredentialsIfExist() {
//   try {
//     const content = await fs.readFile(TOKEN_PATH);
//     const credentials = JSON.parse(content);
//     return google.auth.fromJSON(credentials);
//   } catch (err) {
//     return null;
//   }
// }

// /**
//  * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
//  *
//  * @param {OAuth2Client} client
//  * @return {Promise<void>}
//  */
// async function saveCredentials(client) {
//   const content = await fs.readFile(CREDENTIALS_PATH);
//   const keys = JSON.parse(content);
//   const key = keys.installed || keys.web;
//   const payload = JSON.stringify({
//     type: 'authorized_user',
//     client_id: key.client_id,
//     client_secret: key.client_secret,
//     refresh_token: client.credentials.refresh_token,
//   });
//   await fs.writeFile(TOKEN_PATH, payload);
// }

// /**
//  * Load or request or authorization to call APIs.
//  *
//  */
// async function authorize() {
//   let client = await loadSavedCredentialsIfExist();
//   if (client) {
//     return client;
//   }
//   client = await authenticate({
//     scopes: SCOPES,
//     keyfilePath: CREDENTIALS_PATH,
//   });
//   if (client.credentials) {
//     await saveCredentials(client);
//   }
//   return client;
// }

// /**
//  * Lists the next 10 events on the user's primary calendar.
//  * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
//  */
// async function listEvents(auth) {
//   const calendar = google.calendar({version: 'v3', auth});
//   const res = await calendar.events.list({
//     calendarId: 'primary',
//     timeMin: new Date().toISOString(),
//     maxResults: 10,
//     singleEvents: true,
//     orderBy: 'startTime',
//   });
//   const events = res.data.items;
//   if (!events || events.length === 0) {
//     console.log('No upcoming events found.');
//     return;
//   }
//   console.log('Upcoming 10 events:');
//   events.map((event, i) => {
//     const start = event.start.dateTime || event.start.date;
//     console.log(`${start} - ${event.summary}`);
//   });
// }

// authorize().then(listEvents).catch(console.error);


// //So now how do I make this code work for multiple users

// }