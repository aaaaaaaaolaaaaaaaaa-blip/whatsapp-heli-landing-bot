import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import fs from 'fs';
import path from 'path';
import NodeGeocoder from 'node-geocoder';

// توكن البوت
const TELEGRAM_TOKEN = '8676421761:AAGq0OmLJfAZH8mQDvtlHgYUeuXGs7D9ESc';
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// قراءة بيانات المواقع من الملف
const dataPath = path.join(process.cwd(), 'saudi_heliports.json');
const heliports = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// خريطة المدن العربي ↔ الإنجليزي للتأكد من فلترة صحيحة
const cityMap = {
  "جدة": ["Jeddah", "جدة"],
  "مكة": ["Makkah", "مكة"],
  "الرياض": ["Riyadh", "الرياض"],
  "الدمام": ["Dammam", "الدمام"],
  "المدينة المنورة": ["Medina", "المدينة المنورة"],
  "الطايف": ["Taif", "الطايف"],
  // أضف باقي المدن هنا بنفس الأسلوب
};

// إعداد الجيوكودر
const geocoder = NodeGeocoder({ provider: 'openstreetmap' });

// دالة لحساب المسافة بين نقطتين (كيلومتر)
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
  let res;
  try {
    res = await geocoder.reverse({ lat: latitude, lon: longitude });
  } catch (err) {
    await bot.sendMessage(chatId, 'حدث خطأ أثناء تحديد موقعك، حاول مرة أخرى.');
    return;
  }

  const rawCity = res[0]?.city || res[0]?.state || 'Unknown';

  // نبحث عن اسم المدينة الصحيح باستخدام الخريطة
  let matchedCity = null;
  for (const [key, variants] of Object.entries(cityMap)) {
    if (variants.map(v => v.toLowerCase()).includes(rawCity.toLowerCase())) {
      matchedCity = key;
      break;
    }
  }

  if (!matchedCity) {
    await bot.sendMessage(chatId, `لم نتمكن من التعرف على مدينتك (${rawCity}).`);
    return;
  }

  // فلترة المواقع حسب المدينة فقط
  const cityHeliports = heliports.filter(h => h.city === matchedCity);

  if(cityHeliports.length === 0) {
    await bot.sendMessage(chatId, `لم يتم العثور على أماكن هبوط في ${matchedCity}.`);
    return;
  }

  // ترتيب أقرب 5 مواقع داخل نفس المدينة
  const sorted = cityHeliports.map(h => ({
    ...h,
    distance: getDistance(latitude, longitude, h.lat, h.lon)
  }))
  .sort((a, b) => a.distance - b.distance)
  .slice(0, 5);

  // رسالة نصية مع أسماء المواقع والمسافة
  let reply = `أقرب مواقع الهبوط في ${matchedCity}:\n`;
  sorted.forEach((h, i) => {
    reply += `${i+1}- ${h.name} — المسافة: ${h.distance.toFixed(2)} كم\n`;
  });

  // أزرار لفتح المواقع على OpenStreetMap
  const inlineKeyboard = sorted.map(h => ([{
    text: `افتح ${h.name}`,
    url: `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}&zoom=16`
  }]));

  await bot.sendMessage(chatId, reply, { reply_markup: { inline_keyboard: inlineKeyboard } });
});

// ويب سيرفر للتجارب أو Render
const app = express();
app.get('/', (req,res) => res.send('Helicopter Telegram Bot Running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
