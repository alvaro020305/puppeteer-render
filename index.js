require('dotenv/config');
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const puppeteer = require('puppeteer');


const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const app = express();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.mentions.has(client.user)) {
    return;
  }

  const content = message.content.replace(`<@!${client.user.id}>`, '').trim();

  if (!content) {
    return;
  }

  try {
    const response = await getChatbotResponse(content);
    message.reply(response);
  } catch (error) {
    console.error('Error in Puppeteer:', error.message);
    message.reply('¡Oops! Hubo un problema al obtener la respuesta del chatbot.');
  }
});

async function getChatbotResponse(userInput) {
  try {
    const browser = await puppeteer.launch({
      headless: "new"
    });

    const page = await browser.newPage();
    await page.goto('https://chat-app-d64538.zapier.app/');

    const textBoxSelector = 'textarea[aria-label="chatbot-user-prompt"]';
    await page.waitForSelector(textBoxSelector);
    await page.type(textBoxSelector, userInput);
    await page.keyboard.press('Enter');

    await page.waitForSelector('[data-testid="final-bot-response"] p');

    const value = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-testid="final-bot-response"] p');
      return Array.from(elements, element => element.textContent);
    });

    await browser.close();

    return value.length === 0 ? 'Estoy ocupado...' : value.join('\n\n\n\n');
  } catch (error) {
    console.error('Error in Puppeteer:', error.message);
    throw error;
  }
}

app.get("/", async (req, res) => {
  const content = req.query.content;

  if (!content) {
    return res.status(400).send('¡El contenido no puede estar vacío!');
  }

  try {
    const response = await getChatbotResponse(content);
    res.send(response);
  } catch (error) {
    console.error('Error in Puppeteer:', error.message);
    res.status(500).send('¡Oops! Hubo un problema al obtener la respuesta del chatbot.');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Express server is running on port ${PORT}`);
});

client.login(process.env.TOKEN);
