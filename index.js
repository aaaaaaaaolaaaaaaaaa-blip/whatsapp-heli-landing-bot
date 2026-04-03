
import TelegramBot from 'node-telegram-bot-api';
const TELEGRAM_TOKEN = '8728515147:AAEtQF4pFV4E0jlrGebWgCvDpOA058kF-7A';
import express from 'express';

// ضع هنا التوكن اللي حصلت عليه من BotFather
const TELEGRAM_TOKEN = 'ضع_هنا_API_Token_من_BotFather';

// إنشاء البوت
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// مثال قاعدة بيانات بسيطة لأقرب الهيليباد (تقدر توسعها لاحقًا)
const heliports = [
  { name: "King Abdulaziz Hospital", lat: 21.565, lon: 39.172 },
  { name: "Jeddah Port Helipad", lat: 21.527, lon: 39.173 },
  { name: "Private Helipad", lat: 21.555, lon: 39.180 },
];

// دالة لحساب المسافة بين موقعين (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c;
}

// استقبال الرسائل من المستخدم
bot.onText(/(.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];

  // هنا نفترض المستخدم يرسل: "21.56,39.17"
  const parts = text.split(',');
  if (parts.length !== 2) {
    bot.sendMessage(chatId, 'أرسل الإحداثيات بهذا الشكل: lat,lon');
    return;
  }

  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);

  // حساب أقرب 3 هيليبادات
  const sorted = heliports.map(h => ({
    ...h,
    distance: getDistance(lat, lon, h.lat, h.lon)
  }))
  .sort((a,b) => a.distance - b.distance)
  .slice(0,3);

  // بناء رسالة الرد
  let reply = 'أقرب 3 مواقع هبوط:\n';
  sorted.forEach((h, i) => {
    reply += `${i+1}- ${h.name} (المسافة: ${h.distance.toFixed(2)} كم)\n`;
  });

  bot.sendMessage(chatId, reply);
});

// ويب سيرفر للتجارب أو نشره على Render
const app = express();
app.get('/', (req,res)=> res.send('Helicopter Telegram Bot Running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server running on port '+PORT));
