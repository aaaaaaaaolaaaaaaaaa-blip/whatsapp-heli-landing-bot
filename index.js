

import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import fs from 'fs';
import path from 'path';
import NodeGeocoder from 'node-geocoder';

// توكن البوت
const TELEGRAM_TOKEN = '8676421761:AAGq0OmLJfAZH8mQDvtlHgYUeuXGs7D9ESc';

// إنشاء البوت
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// قراءة بيانات المواقع
const dataPath = path.join(process.cwd(), 'saudi_heliports.json');
const heliports = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// إعداد الجيوكودر لتحويل الإحداثيات إلى المدينة
const geocoder = NodeGeocoder({ provider: 'openstreetmap' });

// دالة لحساب المسافة بالكيلومتر
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// استقبال الموقع من المستخدم
bot.on('location', async (msg) => {
  const chatId = msg.chat.id;
  const { latitude, longitude } = msg.location;

  // تحويل الإحداثيات إلى المدينة
  const res = await geocoder.reverse({ lat: latitude, lon: longitude });
  const city = res[0]?.city || res[0]?.state || 'Unknown';

  // فلترة المواقع داخل نفس المدينة
  const cityHeliports = heliports.filter(h => h.city.toLowerCase() === city.toLowerCase());

  if(cityHeliports.length === 0) {
    await bot.sendMessage(chatId, `لم يتم العثور على أماكن هبوط في ${city}`);
    return;
  }

  // ترتيب أقرب 5 مواقع
  const sorted = cityHeliports.map(h => ({
    ...h,
    distance: getDistance(latitude, longitude, h.lat, h.lon)
  }))
  .sort((a, b) => a.distance - b.distance)
  .slice(0, 5);

  // رسالة نصية مع أسماء المواقع والمسافة
  let reply = `أقرب 5 مواقع هبوط في ${city}:\n`;
  sorted.forEach((h, i) => {
    reply += `${i+1}- ${h.name} — المسافة: ${h.distance.toFixed(2)} كم\n`;
  });

  // أزرار لفتح المواقع على OpenStreetMap
  const inlineKeyboard = sorted.map(h => ([{
    text: `افتح ${h.name}`,
    url: `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}&zoom=16`
  }]));

  // إرسال النص + الأزرار
  await bot.sendMessage(chatId, reply, {
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
});

// ويب سيرفر للتجارب أو Render
const app = express();
app.get('/', (req,res) => res.send('Helicopter Telegram Bot Running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
