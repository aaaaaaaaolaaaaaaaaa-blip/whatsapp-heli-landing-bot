import TelegramBot from 'node-telegram-bot-api';
import express from 'express';

// ضع التوكن هنا أو استخدم Environment Variable على Render
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8676421761:AAGq0OmLJfAZH8mQDvtlHgYUeuXGs7D9ESc';

// إنشاء البوت
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// قاعدة بيانات بسيطة لمواقع الهبوط
const heliports = [
  { name: "King Abdulaziz Hospital", lat: 21.565, lon: 39.172 },
  { name: "Jeddah Port Helipad", lat: 21.527, lon: 39.173 },
  { name: "Private Helipad", lat: 21.555, lon: 39.180 },
];

// دالة لحساب المسافة بين نقطتين
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
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

  // ترتيب أقرب 3 مواقع
  const sorted = heliports.map(h => ({
    ...h,
    distance: getDistance(latitude, longitude, h.lat, h.lon)
  }))
  .sort((a,b) => a.distance - b.distance)
  .slice(0,3);

  // رسالة نصية مع أسماء المواقع والمسافة + روابط
  let reply = 'أقرب 3 مواقع هبوط:\n';
  const inlineKeyboard = [];

  sorted.forEach((h, i) => {
    reply += `${i+1}- ${h.name} (المسافة: ${h.distance.toFixed(2)} كم)\n`;
    inlineKeyboard.push([{
      text: `افتح ${h.name}`,
      url: `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}&zoom=16`
    }]);
  });

  // إرسال النص + أزرار فقط (بدون صورة)
  await bot.sendMessage(chatId, reply, {
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
});

// ويب سيرفر للتجارب أو Render
const app = express();
app.get('/', (req,res) => res.send('Helicopter Telegram Bot Running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
