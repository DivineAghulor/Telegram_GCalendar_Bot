import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv';
import axios from 'axios';


dotenv.config();
// Create a single supabase client for interacting with your database
const supabase_url = process.env.SUPABASE_URL
const supabase_anon_key = process.env.SUPABASE_ANON_KEY
const cred_storage_url = process.env.CRED_STORAGE_URL
const cred_storage_table = process.env.CRED_STORAGE_TABLE
const supabase = createClient(supabase_url, supabase_anon_key)

const table = cred_storage_table

async function fetchToken(userid) {
    const { data, error } = await supabase
        .from(table)
        .select('token')
        .eq('user_id', userid)
    
        if (data){console.log(data[0].token)}
        if(error){console.log(error)}

    return data[0].token
    
}

async function createToken(userid, auth_token){
    const { error } = await supabase
        .from(table)
        .insert({ user_id : userid, token: auth_token })

    console.log(`Token created ${userid}` )
    return fetchToken(userid)
}

async function updateToken(userid, auth_token){     
    const { error } = await supabase
        .from(table)
        .update({ token: auth_token })
        .eq('user_id', userid)
        
    console.log(`Token updated ${userid}` )
    return fetchToken(userid)
}

async function deleteToken(userid){     
    
    const response = await supabase
        .from(table)
        .delete()
        .eq('user_id', userid)
        
    if (response.status == 204) console.log(`Token deleted ${userid}` )
        else console.log(`Error deleting token ${userid}`)
}


 // Variable to store the JSON data
 async function fetchData(url) {
    try {
      const response = await axios.get(url);
      const data = response.data;
      return data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error; 
   // Or handle the error as needed
    }
  }


//REMOVE THIS AND UNCOMMENT THE ONE BELOW WHEN DEPLOYING!!!
const credData = ""
// const credData = await fetchData(cred_storage_url)

export { fetchToken, createToken, updateToken, deleteToken, credData};