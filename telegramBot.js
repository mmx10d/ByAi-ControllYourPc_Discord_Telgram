// ==========================================
// محطة بوت التليجرام الذكية - الجزء الأول 🤖✈️
// ==========================================

const { Telegraf } = require('telegraf');
const screenshot = require('screenshot-desktop');

// إعداد كائن المحطة لتخزين البيانات الحية أثناء التشغيل
const telegramStation = {
  bot: null,
  token: '',
  admin: '',
  allowedUsers: [], // قائمة المستخدمين الإضافيين المسموح لهم بالتحكم
};

/**
 * دالة التحقق من الهوية والأمان لبوت تليجرام
 * تتأكد إن كان الشخص الذي يرسل الأمر هو الأدمن أو مستخدم مسموح له
 */
function isUserAuthorized(ctx) {
  // جلب اسم المستخدم من التليجرام (أو الآيدي إذا لم يكن لديه يوزر نيم)
  const authorUsername = ctx.from.username || ctx.from.id.toString();

  // 1. إذا كان هو الأدمن الرئيسي للمحطة
  const isMainAdmin = (authorUsername === telegramStation.admin);

  // 2. إذا كان من قائمة المستخدمين الإضافيين المسموح لهم
  const isAllowed = telegramStation.allowedUsers.includes(authorUsername);

  return isMainAdmin || isAllowed;
}

console.log("⚡ تم تحميل الجزء الأول من محطة تليجرام بنجاح وجاهز لبدء الربط...");
// ==========================================
// محطة بوت التليجرام الذكية - الجزء الثاني 🤖✈️
// ==========================================
const { exec } = require('child_process');

/**
 * دالة تشغيل البوت وإدارة أوامر التليجرام الحية
 */
function initTelegramBot(config, globalAllowedUsers) {
  telegramStation.token = config.token;
  telegramStation.admin = config.admin;
  telegramStation.allowedUsers = globalAllowedUsers;

  // إيقاف البوت القديم إذا كان يعمل لتفادي تداخل العمليات
  if (telegramStation.bot) {
    try { telegramStation.bot.stop(); } catch (e) { }
  }

  // إنشاء اتصال جديد مع البوت
  telegramStation.bot = new Telegraf(telegramStation.token);

  // رسالة الترحيب عند بدء المحادثة
  telegramStation.bot.start((ctx) => {
    if (!isUserAuthorized(ctx)) {
      return ctx.reply('❌ عذراً، أنت غير مسجل في قائمة التحكم المحمية لهذه المحطة!');
    }
    ctx.reply('مرحباً بك في محطة تليجرام الذكية للتحكم بالكمبيوتر! 🖥️\n\n' +
      'الأوامر المتاحة:\n' +
      '/screen - لالتقاط صورة شاشة حية\n' +
      '/click X Y - للنقر على مكان معين (مثال: /click 500 400)');
  });

  // 1. معالجة أمر التقاط الشاشة: /screen
  telegramStation.bot.command('screen', async (ctx) => {
    if (!isUserAuthorized(ctx)) return ctx.reply('❌ غير مصرح لك بالوصول!');

    try {
      await ctx.reply('جاري سحب لقطة الشاشة... 🔄');
      const imgBuffer = await screenshot({ format: 'png' });

      // إرسال الصورة مباشرة للمستخدم كملف بافر
      await ctx.replyWithPhoto({ source: imgBuffer });
    } catch (error) {
      console.error("خطأ تليجرام في السكرين شوت:", error);
      ctx.reply("❌ فشل التقاط صورة الشاشة الحالية.");
    }
  });

  // 2. معالجة أمر النقر وتحريك الماوس: /click X Y
  telegramStation.bot.command('click', (ctx) => {
    if (!isUserAuthorized(ctx)) return ctx.reply('❌ غير مصرح لك بالوصول!');

    // تقسيم النص لاستخراج الإحداثيات (مثال النص: /click 100 200)
    const msgText = ctx.message.text;
    const args = msgText.split(' ').slice(1);
    const x = parseInt(args[0]);
    const y = parseInt(args[1]);

    if (isNaN(x) || isNaN(y)) {
      return ctx.reply("⚠️ صيغة الأمر خاطئة! الاستخدام الصحيح:\n`/click X Y`\n\nمثال: `/click 500 400`", { parse_mode: 'Markdown' });
    }

    // تشغيل أمر الـ PowerShell الأصلي والآمن للويندوز لعمل النقرة
    const psCommand = `powershell -command "$c = '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int info); [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y);'; $type = Add-Type -MemberDefinition $c -Name 'Win32' -Namespace 'Win32Functions' -PassThru; $type::SetCursorPos(${x}, ${y}); $type::mouse_event(0x0002, 0, 0, 0, 0); $type::mouse_event(0x0004, 0, 0, 0, 0);"`;

    exec(psCommand, (err) => {
      if (err) {
        console.error("خطأ PowerShell تليجرام:", err);
        return ctx.reply("❌ فشل تنفيذ نقرة الماوس.");
      }
      ctx.reply(`🎯 تم النقر بنجاح عند الإحداثيات X: ${x} | Y: ${y}`);
    });
  });

  // تشغيل البوت والبدء في استقبال البيانات
  telegramStation.bot.launch().then(() => {
    console.log("✈️ بوت التليجرام يعمل الآن بنجاح ويستقبل الأوامر...");
  }).catch(err => {
    console.error("فشل تشغيل بوت التليجرام:", err.message);
  });
}

// تصدير دالة المحطة وكائن البيانات لتشغيلها من السيرفر الرئيسي server.js
module.exports = { initTelegramBot, telegramStation };
