import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import express from 'express';

// توكن البوت
const TELEGRAM_TOKEN = '8676421761:AAGq0OmLJfAZH8mQDvtlHgYUeuXGs7D9ESc';

// إنشاء البوت
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// قراءة بيانات مواقع الهبوط الكبيرة
const heliports = JSON.parse(fs.readFileSync('saudi_heliports.json', 'utf-8'));

// دالة لحساب المسافة بين نقطتين (كيلومتر)
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

// استقبال الموقع من المستخدم
bot.on('location', async (msg) => {
  const chatId = msg.chat.id;
  const { latitude, longitude } = msg.location;

  // ترتيب أقرب 5 مواقع (يمكن تغيير الرقم)
  const sorted = heliports.map(h => ({
    ...h,
    distance: getDistance(latitude, longitude, h.lat, h.lon)
  }))
  .sort((a, b) => a.distance - b.distance)
  .slice(0, 5);

  // رسالة نصية مع أسماء المواقع والمسافة
  let reply = 'أقرب مواقع هبوط:\n';
  sorted.forEach((h, i) => {
    reply += `${i+1}- ${h.name} (المسافة: ${h.distance.toFixed(2)} كم)\n`;
  });

  // أزرار لفتح المواقع على OpenStreetMap
  const inlineKeyboard = sorted.map(h => ([{
    text: `افتح ${h.name}`,
    url: `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}&zoom=16`
  }]));

  // إرسال النص + الأزرار فقط (بدون صورة)
  await bot.sendMessage(chatId, reply, {
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
});

// ويب سيرفر للتجارب أو Render
const app = express();
app.get('/', (req, res) => res.send('Helicopter Telegram Bot Running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
