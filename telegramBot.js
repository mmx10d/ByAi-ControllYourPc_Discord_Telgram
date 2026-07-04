// ========================================================
// 🛰️ محطة بوت التليجرام الذكية (telegramBot.js) - النسخة الاحترافية السلسة 🤖✈️ (الجزء 1 من 2)
// ========================================================

const { Telegraf, Input } = require('telegraf');
const screenshot = require('screenshot-desktop');
const { exec } = require('child_process');
const { createCanvas, loadImage } = require('canvas');

const telegramStation = {
  bot: null,
  token: '',
  admin: '',
  allowedUsers: [],
};

// متغيرات التحكم البرمجية بالبث الحي السلس وتعديل الصور
let liveStreamInterval = null;
let currentFpsRate = 10; // الفريمات الافتراضية المستقرة هي 10 فريم في الثانية
let lastStreamMessageId = null; // حفظ معرف الرسالة لتعديل وتحديث نفس الصورة حيوياً
let currentChatId = null; // حفظ آي دي الشات الفعال لبث التعديلات

function isUserAuthorized(ctx) {
  const authorUsername = ctx.from.username || ctx.from.id.toString();
  return (authorUsername === telegramStation.admin || telegramStation.allowedUsers.includes(authorUsername));
}

/**
 * 📏 دالة الرادار المتطورة: ترسم مقاييس البكسل الأصلية الصافية كل 100 بكسل حقيقي
 * وتطبع الأرقام واضحة وكبيرة جداً (100, 200, 300...) لمطابقة إحداثيات الويندوز الفعلي بدقة
 */
async function generateEdgeGridScreen() {
  const rawImgBuffer = await screenshot({ format: 'png' });
  const image = await loadImage(rawImgBuffer);

  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  // 1. رسم شاشة الكمبيوتر الفعلي بدقتها الكاملة الأصلية في الخلفية
  ctx.drawImage(image, 0, 0);

  // 2. إعدادات خطوط مسطرة القياس (خطوط عريضة وأرقام ضخمة جداً نيون)
  ctx.strokeStyle = '#00ffaa';
  ctx.fillStyle = '#00ffaa';
  ctx.font = 'bold 24px Arial'; // أرقام ضخمة وواضحة جداً للعين
  ctx.lineWidth = 3;

  const tickSize = 20; // طول شرطة المسطرة لتكون واضحة بعد ضغط الصور في التليجرام
  const step = 100;    // المسافة الثابتة (كل 100 بكسل حقيقي دقيق)

  // 🟢 أولاً: رسم المسطرة الأفقية (الحافة العلوية والسفلية لشاشة العميل)
  for (let x = step; x < image.width; x += step) {
    const label = x.toString(); // طباعة الرقم بالبكسل الصريح (100, 200, 300...)

    // الحافة العلوية
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, tickSize);
    ctx.stroke();
    ctx.fillText(label, x - 15, tickSize + 25);

    // الحافة السفلية
    ctx.beginPath();
    ctx.moveTo(x, image.height);
    ctx.lineTo(x, image.height - tickSize);
    ctx.stroke();
    ctx.fillText(label, x - 15, image.height - tickSize - 10);
  }

  // 🔵 ثانياً: رسم المسطرة العمودية (الحافة اليسرى واليمنى لشاشة العميل)
  for (let y = step; y < image.height; y += step) {
    const label = y.toString(); // طباعة البكسل الصريح عمودياً

    // الحافة اليسرى
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(tickSize, y);
    ctx.stroke();
    ctx.fillText(label, tickSize + 10, y + 8);

    // الحافة اليمنى
    ctx.beginPath();
    ctx.moveTo(image.width, y);
    ctx.lineTo(image.width - tickSize, y);
    ctx.stroke();
    ctx.fillText(label, image.width - tickSize - 65, y + 8);
  }

  return canvas.toBuffer('image/png');
}

console.log("⚡ تم تشغيل محرك الرادار وبكسلات الحواف لملف تليجرام باللغة العربية...");
// ========================================================
// 🛰️ محطة بوت التليجرام الذكية (telegramBot.js) - النسخة الاحترافية السلسة 🤖✈️ (الجزء 2 من 2)
// ========================================================

async function initTelegramBot(config, globalAllowedUsers) {
  telegramStation.token = config.token;
  telegramStation.admin = config.admin;
  telegramStation.allowedUsers = globalAllowedUsers;

  // إيقاف أي بث سابق للبوت لتفادي تكرار الأحداث وتجميد الذاكرة العشوائية
  if (telegramStation.bot) {
    try {
      clearInterval(liveStreamInterval);
      telegramStation.bot.stop();
    } catch (e) { }
  }

  const temporaryBot = new Telegraf(telegramStation.token);
  try {
    await temporaryBot.telegram.getMe();
    telegramStation.bot = temporaryBot;
  } catch (error) {
    console.error("❌ فشل التحقق من توكن التليجرام:", error.message);
    return false;
  }

  // 📝 تحديث قائمة الترحيب والشرح البرمجي عند إرسال /start باللغة العربية الكاملة
  telegramStation.bot.start((ctx) => {
    if (!isUserAuthorized(ctx)) return ctx.reply('❌ عذراً، أنت غير مسجل في قائمة التحكم المحمية لهذه المحطة!');
    ctx.reply(
      `🛰️ **مرحباً بك في مركز التحكم وإدارة المحطات المتطور عن بعد** 🖥️📏\n\n` +
      `💡 **الأوامر النصية المباشرة (اكتبها في الشات مباشرة بدون علامة / ) :**\n` +
      `• اكتب **screen** 👈 لالتقاط صورة واحدة للشاشة محاطة برادار البكسلات الأصلي الدقيق.\n` +
      `• اكتب **click X Y** 👈 للنقر الفوري بالماوس عند إحداثيات البكسل المطلق (مثال: click 500 400).\n` +
      `• اكتب **write [النص]** 👈 لكتابة الكلمات على الكمبيوتر مع قلب لغة الكيبورد تلقائياً (مثال: write هلا عواد).\n\n` +
      `🎬 **نظام البث الحي الاحترافي والسلس (فيديو حي عبر تحديث وتعديل الصورة القديمة) :**\n` +
      `• اكتب **frame [العدد]** 👈 لتحديد فريمات البث للثانية (الافتراضي: 10، مثال: frame 5).\n` +
      `• اكتب **start** 👈 لإطلاق بث الشاشة المتتابع والذكي، حيث يتم تحديث نفس الصورة بانتظام.\n` +
      `• اكتب **stop** 👈 لإيقاف وتجميد البث الحي فوراً وتوفير استهلاك السيرفر.`
    );
  });

  // محرك الاستماع الذكي وقراءة الأوامر النصية المباشرة باللغة العربية
  telegramStation.bot.on('text', async (ctx) => {
    if (!isUserAuthorized(ctx)) return;
    const text = ctx.message.text.trim();
    const lowerText = text.toLowerCase();

    currentChatId = ctx.chat.id; // حفظ آي دي الشات الحالي لإرسال التحديثات الحية

    // 🟢 1. أمر سحب لقطة شاشة واحدة برادار البكسلات الصريحة الكبير
    if (lowerText === 'screen') {
      try {
        const gridImgBuffer = await generateEdgeGridScreen();
        await ctx.replyWithPhoto({ source: gridImgBuffer });
      } catch (error) { ctx.reply("❌ فشل التقاط صورة الشاشة الحالية وتوليد الرادار."); }
    }

    // 🟢 2. أمر التحكم بالنقر الحركي المطلق مع طباعة تفاصيل العملية بالكونسل فوراً
    else if (lowerText.startsWith('click ')) {
      const args = text.split(' ').slice(1);
      const x = parseInt(args[0]);
      const y = parseInt(args[1]);

      if (isNaN(x) || isNaN(y)) return ctx.reply("⚠️ صيغة الإحداثيات خاطئة! الاستخدام الصحيح: click 500 400");

      console.log(`[👉 TELEGRAM CLICK] المستخدم @${ctx.from.username || ctx.from.id} نفذ نقرة ماوس عن بعد عند البكسل المطلق -> X: ${x} | Y: ${y}`);

      const psCommand = `powershell -command "$c = '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int info); [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y);'; $type = Add-Type -MemberDefinition $c -Name 'Win32' -Namespace 'Win32Functions' -PassThru; $type::SetCursorPos(${x}, ${y}); $type::mouse_event(0x0002, 0, 0, 0, 0); $type::mouse_event(0x0004, 0, 0, 0, 0);"`;

      exec(psCommand, async (err) => {
        if (err) return ctx.reply("❌ فشل تنفيذ نقرة الماوس على جهاز الكمبيوتر الفعلي.");
        setTimeout(async () => {
          try {
            const freshGridImg = await generateEdgeGridScreen();
            await ctx.replyWithPhoto({ source: freshGridImg }, { caption: `🎯 تم تنفيذ النقرة بنجاح عند الإحداثيات الصريحة X: ${x} | Y: ${y}` });
          } catch (error) { }
        }, 400);
      });
    }

    // 🟢 3. أمر محاكاة كتابة النصوص مع تفعيل ميزة قلب لغة كيبورد الويندوز تلقائياً
    else if (lowerText.startsWith('write ')) {
      const inputText = text.substring(6); // جلب الجملة بالكامل بعد كلمة write
      if (!inputText) return ctx.reply("⚠️ يرجى كتابة النص المراد طباعته (مثال: write Hello)");

      console.log(`[⌨️ TELEGRAM WRITE] المستخدم @${ctx.from.username || ctx.from.id} أطلق أمر كتابة نصية -> "${inputText}"`);

      const hasArabic = /[\u0600-\u06FF]/.test(inputText);
      const langCode = hasArabic ? "00000401" : "00000409";

      const psCommand = `powershell -command "
        $w = Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")] public static extern long LoadKeyboardLayout(string pwszKLID, uint Flags);' -Name 'Win32' -Namespace 'Win32Functions' -PassThru;
        $w::LoadKeyboardLayout('${langCode}', 1) | Out-Null;
        Add-Type -AssemblyName System.Windows.Forms;
        [System.Windows.Forms.SendKeys]::SendWait('${inputText.replace(/[\n\r]/g, "{ENTER}").replace(/'/g, "''")}');
      "`;

      exec(psCommand, (err) => {
        if (err) return ctx.reply("❌ فشل محاكاة الكيبورد الفعلي للكمبيوتر.");
        setTimeout(async () => {
          try {
            const freshGridImg = await generateEdgeGridScreen();
            await ctx.replyWithPhoto({ source: freshGridImg }, { caption: `⌨️ تم كتابة النص بنجاح وتحويل لغة الإدخال حيوياً وتحديث اللقطة.` });
          } catch (error) { }
        }, 400);
      });
    }

    // 🟢 4. أمر تحديد وتعديل فريمات ومعدل بث الإطارات حيوياً
    else if (lowerText.startsWith('frame ')) {
      const fpsArg = parseInt(text.split(' ')[1]);
      if (isNaN(fpsArg) || fpsArg < 1 || fpsArg > 30) {
        return ctx.reply("⚠️ معدل إطارات خاطئ! يرجى اختيار رقم بين 1 و 30 فريم للثانية (مثال: frame 10)");
      }
      currentFpsRate = fpsArg;
      ctx.reply(`⚙️ تم تعديل وضبط معدل بث الإطارات للمحطة بنجاح ليصبح: **${currentFpsRate} إطار في الثانية**.`);

      // إذا كان البث السلس يعمل حالياً، نقوم بإعادة إطلاقه بالمعدل المحدث فوراً دون توقف
      if (liveStreamInterval) {
        clearInterval(liveStreamInterval);
        const loopMs = 1000 / currentFpsRate;
        liveStreamInterval = setInterval(async () => {
          try {
            const streamImgBuffer = await generateEdgeGridScreen();
            if (lastStreamMessageId) {
              await ctx.telegram.editMessageMedia(currentChatId, lastStreamMessageId, null, {
                type: 'photo',
                media: { source: streamImgBuffer },
                caption: `🎬 بث حي سلس ومستمر بمعدل الحيازة الفعلي: ${currentFpsRate} إطار/ثانية.\nاكتب stop لإيقاف البث وتجميده.`
              });
            }
          } catch (e) { }
        }, loopMs);
      }
    }

    // 🟢 5. 🛠️ التحديث الجوهري والأعظم: أمر إطلاق البث السلس المتتابع عبر "تعديل الصورة القديمة" بدون سبام
    else if (lowerText === 'start') {
      if (liveStreamInterval) return ctx.reply("🎬 البث الحي السلس يعمل بالفعل ويقوم بتحديث الصورة الحالية حالياً!");

      ctx.reply(`🚀 جاري إطلاق حلقة البث الحي الاحترافي بمعدل ${currentFpsRate} فريم في الثانية... يرجى الانتظار لتوليد الإطار الأول.`);

      try {
        // توليد وإرسال أول صورة حية لحفظ معرف الرسالة Message ID
        const initialImgBuffer = await generateEdgeGridScreen();
        const initialMsg = await ctx.replyWithPhoto({ source: initialImgBuffer }, {
          caption: `🎬 بث حي سلس ومستمر بمعدل الحيازة الفعلي: ${currentFpsRate} إطار/ثانية.\nاكتب stop لإيقاف البث وتجميده.`
        });

        lastStreamMessageId = initialMsg.message_id; // حفظ آي دي الرسالة الأولى لنقوم بتعديلها لاحقاً

        const loopMs = 1000 / currentFpsRate; // حساب أجزاء الثانية تزامناً مع الفريمات المطلوبة
        liveStreamInterval = setInterval(async () => {
          try {
            const streamImgBuffer = await generateEdgeGridScreen();

            // 💥 كود التعديل السحرى: نقوم بتحديث الـ Media الخاص بنفس الرسالة بدلاً من إرسال رسائل جديدة
            await ctx.telegram.editMessageMedia(currentChatId, lastStreamMessageId, null, {
              type: 'photo',
              media: { source: streamImgBuffer },
              caption: `🎬 بث حي سلس ومستمر بمعدل الحيازة الفعلي: ${currentFpsRate} إطار/ثانية.\nاكتب stop لإيقاف البث وتجميده.`
            });
          } catch (e) {
            // في حال قام المستخدم بحذف الرسالة يدوياً، نوقف البث لمنع تكرار الأخطاء
            clearInterval(liveStreamInterval);
            liveStreamInterval = null;
          }
        }, loopMs);

      } catch (error) {
        ctx.reply("❌ تعذر بدء حلقة البث الحي السلس للمحطة.");
      }
    }

    // 🟢 6. أمر إيقاف وتجميد حلقة البث المباشر فوراً وتصفير المؤشرات لإراحة السيرفر
    else if (lowerText === 'stop') {
      if (!liveStreamInterval) return ctx.reply("🛑 البث المباشر السلس متوقف بالفعل والمحطة في وضع الخمول الحركي.");
      clearInterval(liveStreamInterval);
      liveStreamInterval = null;
      lastStreamMessageId = null;
      ctx.reply("🛑 تم إيقاف وتجميد بث الإطارات السلس بنجاح. تحول النظام التلقائي لوضع الاستعلام العادي.");
    }
  });

  // إطلاق عمليات استقبال الأوامر عبر السيرفر
  telegramStation.bot.launch().then(() => {
    console.log("✈️ Telegram Station bot is polling and running successfully with Smooth Edit Media Stream...");
  }).catch(err => console.error(err.message));

  return true;
}

module.exports = { initTelegramBot, telegramStation };
