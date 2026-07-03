// ========================================================
// 🛰️ محطة بوت التليجرام الذكية (telegramBot.js) - الجزء الأول 🤖✈️
// ========================================================

const { Telegraf } = require('telegraf');
const screenshot = require('screenshot-desktop');
const { exec } = require('child_process');
const { createCanvas, loadImage } = require('canvas'); // محرك الرسم الرقمي للمقاييس

const telegramStation = {
  bot: null,
  token: '',
  admin: '',
  allowedUsers: [],
};

// دالة التحقق الأمنية من هوية الحسابات المصرح لها بالتحكم
function isUserAuthorized(ctx) {
  const authorUsername = ctx.from.username || ctx.from.id.toString();
  return (authorUsername === telegramStation.admin || telegramStation.allowedUsers.includes(authorUsername));
}

/**
 * 📏 دالة الرادار: تلتقط شاشة الكمبيوتر وترسم مساطر القياس الرقمية 
 * على حواف وأطراف الصورة الأربعة فقط لحماية المحتوى الفعلي من التغطية
 */
async function generateEdgeGridScreen() {
  const rawImgBuffer = await screenshot({ format: 'png' });
  const image = await loadImage(rawImgBuffer);

  // إنشاء لوحة رسم مطابقة تماماً لأبعاد شاشة العميل الأصلية
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  // 1. رسم صورة شاشة الكمبيوتر الأصلية النظيفة بالخلفية
  ctx.drawImage(image, 0, 0);

  // 2. إعدادات خطوط القياس (لون نيون واضح وعالي التباين)
  ctx.strokeStyle = '#00ffaa';
  ctx.fillStyle = '#00ffaa';
  ctx.font = 'bold 14px Arial';
  ctx.lineWidth = 2;

  const tickSize = 12; // طول خط المسطرة الصغير عند الحافة
  const step = 100;    // المسافة بين الخطوط (كل 100 بكسل خط ورقمه)

  // 🟢 أولاً: رسم المسطرة الأفقية (الحافة العلوية والسفلية للشاشة)
  for (let x = step; x < image.width; x += step) {
    const label = (x / step).toString(); // تحويل الرقم (100 تصبح 1، 200 تصبح 2)

    // الحافة العلوية (Top Edge)
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, tickSize);
    ctx.stroke();
    ctx.fillText(label, x - 4, tickSize + 14);

    // الحافة السفلية (Bottom Edge)
    ctx.beginPath();
    ctx.moveTo(x, image.height);
    ctx.lineTo(x, image.height - tickSize);
    ctx.stroke();
    ctx.fillText(label, x - 4, image.height - tickSize - 6);
  }

  // 🔵 ثانياً: رسم المسطرة العمودية (الحافة اليسرى واليمنى للشاشة)
  for (let y = step; y < image.height; y += step) {
    const label = (y / step).toString();

    // الحافة اليسرى (Left Edge)
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(tickSize, y);
    ctx.stroke();
    ctx.fillText(label, tickSize + 6, y + 5);

    // الحافة اليمنى (Right Edge)
    ctx.beginPath();
    ctx.moveTo(image.width, y);
    ctx.lineTo(image.width - tickSize, y);
    ctx.stroke();
    ctx.fillText(label, image.width - tickSize - 18, y + 5);
  }

  return canvas.toBuffer('image/png');
}

console.log("⚡ تم تحميل الجزء الأول من رادار تليجرام وجاهز للاستدعاء الفوري...");
// ========================================================
// 🛰️ محطة بوت التليجرام الذكية (telegramBot.js) - الجزء الثاني 🤖✈️
// ========================================================

/**
 * دالة تشغيل البوت وإدارة محطة تليجرام حيوياً
 * تدعم التحقق من صحة التوكن وإرجاع النتيجة للسيرفر قبل تفعيل الـ Polling
 */
async function initTelegramBot(config, globalAllowedUsers) {
  telegramStation.token = config.token;
  telegramStation.admin = config.admin;
  telegramStation.allowedUsers = globalAllowedUsers;

  // إيقاف أي اتصال نشط سابق للبوت لتفادي التكرار وتداخل العمليات
  if (telegramStation.bot) {
    try { telegramStation.bot.stop(); } catch (e) { }
  }

  // بناء كائن البوت الجديد
  const temporaryBot = new Telegraf(telegramStation.token);

  try {
    // 🔒 فحص حيوي وحاسم لسلامة التوكن عبر خوادم تليجرام الرسمية
    await temporaryBot.telegram.getMe();
    telegramStation.bot = temporaryBot; // اعتماد البوت بعد نجاح الفحص
  } catch (error) {
    console.error("❌ Telegram token verification failed:", error.message);
    return false; // إرجاع فشل للسيرفر ليعرض رسالة الخطأ للعميل
  }

  // رسالة الترحيب والشرح عند إرسال /start
  telegramStation.bot.start((ctx) => {
    if (!isUserAuthorized(ctx)) return ctx.reply('❌ عذراً، أنت غير مسجل في قائمة التحكم المحمية لهذه المحطة!');
    ctx.reply(
      `👋 مرحباً بك في محطة تليجرام المطورة بنظام رادار مساطر القياس الحوافي المحدثة! 🖥️📏\n\n` +
      `💡 **الأوامر المتاحة بدون علامة / :**\n` +
      `• اكتب **screen** 👈 لسحب صورة حية للكمبيوتر ومحاطة بمسطرة قياس الأطراف (كل 100 بكسل خط ورقمه).\n` +
      `• اكتب **click X Y** 👈 للنقر الفوري وتحديث الصورة بلحظتها (مثال: click 500 400).`
    );
  });

  // محرك الاستماع للكتابة النصية المباشرة (بدون علامة / )
  telegramStation.bot.on('text', async (ctx) => {
    if (!isUserAuthorized(ctx)) return;

    // تنظيف النص البرمجي وتحويله لأحرف صغيرة
    const text = ctx.message.text.trim().toLowerCase();

    // 🟢 1. أمر طلب الشاشة المحدث برادار القياس الحوافي (screen)
    if (text === 'screen') {
      try {
        await ctx.reply('🔍 جاري التقاط شاشة الكمبيوتر الفعلي وتوليد مسطرة القياس الحوافي...');
        const gridImgBuffer = await generateEdgeGridScreen();

        await ctx.replyWithPhoto({ source: gridImgBuffer }, {
          caption: `📊 الشاشة الحالية بدقتها الأصلية.\n📏 انظر للمسطرة على الحواف لمعرفة أرقام الـ X والـ Y بدقة (الرقم 1 يعني 100 بكسل، 2 يعني 200...)`
        });
      } catch (error) {
        console.error("خطأ تليجرام في السكرين شوت المطور:", error);
        ctx.reply("❌ فشل التقاط صورة الشاشة الحالية وتوليد الرادار.");
      }
    }

    // 🟢 2. أمر التحكم بالنقر التلقائي الفوري المحدث بمهلة تجميد (click X Y)
    else if (text.startsWith('click ')) {
      const args = text.split(' ').slice(1);
      const x = parseInt(args[0]);
      const y = parseInt(args[1]);

      if (isNaN(x) || isNaN(y)) {
        return ctx.reply("⚠️ صيغة الأمر خاطئة! الاستخدام الصحيح بدون علامات: `click X Y` (مثال: `click 500 400`) ");
      }

      // تشغيل الكوماند عبر الـ PowerShell الداخلي للنظام لإرسال إشارة الضغط الفعلي
      const psCommand = `powershell -command "$c = '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int info); [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y);'; $type = Add-Type -MemberDefinition $c -Name 'Win32' -Namespace 'Win32Functions' -PassThru; $type::SetCursorPos(${x}, ${y}); $type::mouse_event(0x0002, 0, 0, 0, 0); $type::mouse_event(0x0004, 0, 0, 0, 0);"`;

      exec(psCommand, async (err) => {
        if (err) {
          console.error("خطأ PowerShell تليجرام:", err);
          return ctx.reply("❌ فشل تنفيذ نقرة الماوس على جهاز الكمبيوتر.");
        }

        // 🛠️ الإصلاح الحاسم والتحديث الفوري المشرط:
        // ننتظر 400 ملي ثانية (Delay) لكي يفتح نظام الويندوز القائمة والزر الفعلي، ومن ثم نأخذ اللقطة المحدثة
        setTimeout(async () => {
          try {
            const freshGridImg = await generateEdgeGridScreen();
            await ctx.replyWithPhoto({ source: freshGridImg }, {
              caption: `🎯 تم تنفيذ النقرة بنجاح عند X: ${x} | Y: ${y}\nالصورة أعلاه تحدّثت فوراً لتعرض لك النتيجة المحدثة على الشاشة بعد الضغط مباشرة!`
            });
          } catch (error) {
            ctx.reply(`🎯 تم النقر بنجاح عند X: ${x} | Y: ${y}، لكن تعذر توليد الصورة التلقائية المحدثة.`);
          }
        }, 400); // ⏱️ مهلة الـ 400 ملي ثانية لمنع التقاط الصور القديمة
      });
    }
  });

  // إطلاق البوت والبدء الفعلي في استقبال ومعالجة البيانات
  telegramStation.bot.launch().then(() => {
    console.log("✈️ Telegram Station bot is polling and running successfully...");
  }).catch(err => {
    console.error("Failed launching Telegram engine:", err.message);
  });

  return true; // إرجاع نجاح للسيرفر لتأكيد جودة التوكن وإضاءة المصباح الأخضر
}

// تصدير دوال ومكونات المحطة لربطها بالسيرفر الرئيسي index.js
module.exports = { initTelegramBot, telegramStation };
