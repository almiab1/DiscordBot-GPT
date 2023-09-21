// ------------------------------------------------------------------
// Imports
// ------------------------------------------------------------------
require('dotenv').config();
const { Client } = require('discord.js');
const openai = require('./module/openai');
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Discord configuration
// ------------------------------------------------------------------

// Declare intents
const intents = ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent'];

// Create a new client instance
const client = new Client({ intents: intents });
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Auxiliary functions
// ------------------------------------------------------------------
const isMsgValid = (message, prefixMsg, channels) => {
    if (
        message.author.bot || 
        !message.content.startsWith(prefixMsg) || 
        !channels.includes(message.channel.id) && !message.mentions.users.has(client.user.id)
    ) return false;
    return true;
}

const getContext = async (message, maxMsgContext, prefixMsg) => {
    let context = [];

    context.push({
        role: "system",
        content: "",
    });

    let preMessages = await message.channel.messages.fetch({ limit: maxMsgContext });

    preMessages.reverse()
    preMessages.forEach((preMessage) => {
        if (preMessage.author.bot && message.author.id !== client.user.id) return;
        if (!preMessage.content.startsWith(prefixMsg)) return;

        const username = preMessage.author.username.replace(/\s+/g, "_").replace(/[^\w\s]/gi, "");

        if(preMessage.author.id === client.user.id) {
            context.push({
                role: "assistant",
                name: username,
                content: preMessage.content,
            });
            return;
        }

        context.push({
            role: "user",
            name: username,
            content: preMessage.content,
        });
    })

    return context;
}
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Discord events
// ------------------------------------------------------------------

// When the client is ready, run this code (only once)
client.once('ready', () => {
  console.log('Ready!');
});

// Parameters for the bot
const PREFIX = "!ai";
const CHANNELS = [process.env.CHANNEL_ID]
const MAX_MSG_CONTEXT = 10;
const GRADE_LIBERTY = 0.85;



client.on('messageCreate', async (message) => {
    // Check if message is valid
    if (!isMsgValid(message, PREFIX, CHANNELS)) return;

    // Send typing
    await message.channel.sendTyping();
    // Send typing every 5 seconds
    const sendTypingInterval = setInterval(async () => {
        await message.channel.sendTyping();
    }, 5000);

    // Conversation context
    const conversarion = await getContext(message, MAX_MSG_CONTEXT, PREFIX);

    // Get response from openai api
    const response = await openai.getResponse(conversarion, GRADE_LIBERTY);

    // Stop typing
    clearInterval(sendTypingInterval);

    // Check if response is valid
    if(!response) {
        message.reply("No se pudo obtener respuesta del servidor");
        return;
    }
    
    // Send response
    message.reply(response.choices[0].message.content);

    // Log response
    console.log(message.content);
});

// Discord login
client.login(process.env.DISCORD_TOKEN);
// ------------------------------------------------------------------