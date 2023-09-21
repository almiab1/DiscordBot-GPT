require('dotenv').config();
const { Client } = require('discord.js');
const { OpenAI } =  require("openai");

const intents = ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent'];

const client = new Client({ intents: intents });

client.once('ready', () => {
  console.log('Ready!');
});

const IGNORE_PREFIX = "!";
const CHANNELS = [process.env.CHANNEL_ID]

const openai = new OpenAI(process.env.OPENAI_API_KEY);

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith(IGNORE_PREFIX)) return;
    if (!CHANNELS.includes(message.channel.id) && !message.mentions.users.has(client.user.id)) return;

    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(async () => {
        await message.channel.sendTyping();
    }, 5000);

    let conversarion = [];

    conversarion.push({
        role: "system",
        content: "Chat GPT es un puto",
    });

    let preMessages = await message.channel.messages.fetch({ limit: 10 });

    preMessages.reverse()
    preMessages.forEach((preMessage) => {
        if (preMessage.author.bot && message.author.id !== client.user.id) return;
        if (preMessage.content.startsWith(IGNORE_PREFIX)) return;

        const username = preMessage.author.username.replace(/\s+/g, "_").replace(/[^\w\s]/gi, "");

        if(preMessage.author.id === client.user.id) {
            conversarion.push({
                role: "assistant",
                name: username,
                content: preMessage.content,
            });
            return;
        }

        conversarion.push({
            role: "user",
            name: username,
            content: preMessage.content,
        });
    })

    const response = await openai.chat.completions.create(
            {
                model: "gpt-3.5-turbo",
                messages: conversarion,
            }).catch((error) => console.log(error));

    clearInterval(sendTypingInterval);

    if(!response) {
        message.reply("No se pudo obtener respuesta del servidor");
        return;
    }

    message.reply(response.choices[0].message.content);
    console.log(message.content);
});

client.login(process.env.DISCORD_TOKEN);