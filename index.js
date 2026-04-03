
import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import fs from 'fs';
import path from 'path';

// ضع توكن البوت هنا
const TELEGRAM_TOKEN = '8676421761:AAGq0OmLJfAZH8mQDvtlHgYUeuXGs7D9ESc';

// إنشاء البوت
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// قراءة بيانات المواقع من الملف JSON
const dataPath = path.join(process.cwd(), 'saudi_heliports.json');
const heliports = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// دالة لحساب المسافة بين نقطتين (كيلومتر)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
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

// استقبال الموقع من المستخدم
bot.on('location', async (msg) => {
  const chatId = msg.chat.id;
  const { latitude, longitude } = msg.location;

  // فلترة جميع المواقع التي تبعد أقل من 50 كم
  const nearbyHeliports = heliports
    .map(h => ({ ...h, distance: getDistance(latitude, longitude, h.lat, h.lon) }))
    .filter(h => h.distance <= 50)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5); // أقرب 5 فقط

  if (nearbyHeliports.length === 0) {
    await bot.sendMessage(chatId, 'No nearby helipads found in your area.');
    return;
  }

  // إعداد الرسالة النصية
  let reply = `Closest helipads near you:\n`;
  nearbyHeliports.forEach((h, i) => {
    reply += `${i + 1}- ${h.name} (${h.city}) — ${h.distance.toFixed(2)} km\n`;
  });

  // إعداد أزرار لفتح المواقع على OpenStreetMap
  const inlineKeyboard = nearbyHeliports.map(h => ([{
    text: `Open ${h.name}`,
    url: `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}&zoom=16`
  }]));

  // إرسال النص + الأزرار
  await bot.sendMessage(chatId, reply, {
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
});

// ويب سيرفر للتجارب أو Render
const app = express();
app.get('/', (req, res) => res.send('Helicopter Telegram Bot Running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
