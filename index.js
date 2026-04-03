import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import fs from 'fs';
import path from 'path';

// ضع توكن البوت هنا
const TELEGRAM_TOKEN = '8676421761:AAGq0OmLJfAZH8mQDvtlHgYUeuXGs7D9ESc';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// قراءة ملف المواقع
const dataPath = path.join(process.cwd(), 'saudi_heliports.json');
const heliports = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// حساب المسافة
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// استقبال الموقع
bot.on('location', async (msg) => {
  const chatId = msg.chat.id;
  const { latitude, longitude } = msg.location;

  // نحسب المسافة لكل المواقع
  const nearby = heliports
    .map(h => ({
      ...h,
      distance: getDistance(latitude, longitude, h.lat, h.lon)
    }))
    .filter(h => h.distance <= 50) // فقط داخل 50 كم
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  if (nearby.length === 0) {
    await bot.sendMessage(chatId, 'No nearby helipads found in your area.');
    return;
  }

  let reply = `Closest helipads near you:\n`;
  nearby.forEach((h, i) => {
    reply += `${i + 1}- ${h.name} (${h.city}) — ${h.distance.toFixed(2)} km\n`;
  });

  const inlineKeyboard = nearby.map(h => ([
    {
      text: `Open ${h.name}`,
      url: `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}&zoom=16`
    }
  ]));

  await bot.sendMessage(chatId, reply, {
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
});

// Express لـ Render
const app = express();
app.get('/', (req, res) => res.send('Bot is running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT);
