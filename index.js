// ========================================================
// 🛰️ SERVER STATION (index.js) - OFFICIAL FINAL VERSION 🛰️ (Part 1)
// ========================================================

const express = require('express');
const screenshot = require('screenshot-desktop');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let appConfig = {
  telegram: { token: '', admin: '', active: false, allowedUsers: [] },
  discord: { token: '', channelId: '', admin: '', active: false, allowedUsers: [] }
};

let initTelegramBot = null;
let initDiscordBot = null;

const checkTGFile = () => fs.existsSync(path.join(__dirname, 'telegramBot.js'));
const checkDCFile = () => fs.existsSync(path.join(__dirname, 'discordBot.js'));

app.get('/api/status', (req, res) => {
  res.json({
    telegram: checkTGFile() ? appConfig.telegram.active : false,
    discord: checkDCFile() ? appConfig.discord.active : false,
    tgUsers: appConfig.telegram.allowedUsers,
    dcUsers: appConfig.discord.allowedUsers
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/screenshot', async (req, res) => {
  try {
    const imgBuffer = await screenshot({ format: 'png' });
    res.json({ success: true, image: `data:image/png;base64,${imgBuffer.toString('base64')}` });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

/**
 * 🎯 مسار النقر وتحريك الماوس المطور حيوياً لـ إحداثيات البكسل المطلق
 */
app.post('/api/click', (req, res) => {
  const { x, y, user } = req.body;

  const isAuthorized = (
    user === "WebConsole_Admin" ||
    user === appConfig.telegram.admin ||
    user === appConfig.discord.admin ||
    appConfig.telegram.allowedUsers.includes(user) ||
    appConfig.discord.allowedUsers.includes(user)
  );

  if (!isAuthorized) return res.status(403).json({ error: "Access Denied" });

  const command = `powershell -command "$c = '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int info); [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y);'; $type = Add-Type -MemberDefinition $c -Name 'Win32' -Namespace 'Win32Functions' -PassThru; $type::SetCursorPos(${x}, ${y}); $type::mouse_event(0x0002, 0, 0, 0, 0); $type::mouse_event(0x0004, 0, 0, 0, 0);"`;

  exec(command, (err) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});

/**
 * ⌨️ مسار الكتابة البرمجية المطور وحل معضلة اللغات تلقائياً في الويندوز الفعلي
 */
app.post('/api/write', (req, res) => {
  const { text, user } = req.body;

  const isAuthorized = (
    user === "WebConsole_Admin" ||
    user === appConfig.telegram.admin ||
    user === appConfig.discord.admin ||
    appConfig.telegram.allowedUsers.includes(user) ||
    appConfig.discord.allowedUsers.includes(user)
  );

  if (!isAuthorized) return res.status(403).json({ error: "Access Denied" });

  // فحص حركي: هل يحتوي النص المرسل على حروف عربية؟
  const hasArabic = /[\u0600-\u06FF]/.test(text);

  // تحديد كود اللغة المطلوب حقنه في الويندوز (عربي أو إنجليزي)
  const langCode = hasArabic ? "00000401" : "00000409";

  // أمر PowerShell المزدوج: يغير لغة الكيبورد فوراً، ثم يحاكي ضغطات الحروف بدقة بالغة
  const psCommand = `powershell -command "
    $w = Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")] public static extern long LoadKeyboardLayout(string pwszKLID, uint Flags);' -Name 'Win32' -Namespace 'Win32Functions' -PassThru;
    $w::LoadKeyboardLayout('${langCode}', 1) | Out-Null;
    Add-Type -AssemblyName System.Windows.Forms;
    [System.Windows.Forms.SendKeys]::SendWait('${text.replace(/[\n\r]/g, "{ENTER}").replace(/'/g, "''")}');
  "`;

  exec(psCommand, (err) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});

console.log("⚡ تم بناء مسارات الكيبورد والماوس الذكية للقسم الأول بنجاح ومزامنتها...");
// ========================================================
// 🛰️ SERVER STATION (index.js) - OFFICIAL FINAL VERSION 🛰️ (Part 2)
// ========================================================

/**
 * ✈️ تفعيل وإيقاف محطة تليجرام حيوياً ومزامنة قلب حالة الزر والنصوص والألوان
 */
app.post('/api/config/telegram', async (req, res) => {
  const { token, admin, users, action } = req.body;

  // 🟥 في حالة طلب العميل إيقاف البوت فوراً وتصفير حالته
  if (action === 'stop') {
    if (telegramStation && telegramStation.bot) {
      try { telegramStation.bot.stop(); } catch (e) { }
    }
    appConfig.telegram.active = false;
    return res.json({ success: true, message: "تم إيقاف محطة تليجرام وتصفير العمليات بنجاح! 🛑" });
  }

  // الفحص الصريح الأضمن للتراخيص: هل ملف البوت محذوف؟
  if (!checkTGFile()) {
    return res.status(400).json({ success: false, error: "أنت لم تقم بشراء هذا البوت يرجى شرائه من المالك @mmx10d" });
  }

  appConfig.telegram.allowedUsers = Array.isArray(users) ? users : [];

  try {
    delete require.cache[require.resolve('./telegramBot.js')];
    const tgModule = require('./telegramBot.js');
    initTelegramBot = tgModule.initTelegramBot;

    // تشغيل البوت وتمرير إعداداته وقائمته المحفوظة
    const success = await initTelegramBot({ token, admin }, appConfig.telegram.allowedUsers);
    if (success) {
      appConfig.telegram.token = token;
      appConfig.telegram.admin = admin;
      appConfig.telegram.active = true;
      res.json({ success: true, message: "تم تشغيل محطة تليجرام بنجاح واتصل البوت بالخوادم! 🚀" });
    } else {
      appConfig.telegram.active = false;
      res.status(400).json({ success: false, error: "التوكين فيه خطا أو البوت معلق، ولم يتم الاتصال بالسيرفر بشكل صحيح." });
    }
  } catch (error) {
    appConfig.telegram.active = false;
    res.status(400).json({ success: false, error: `فشل الاتصال! التفاصيل: ${error.message || "خطأ مجهول في خوادم تليجرام"}` });
  }
});

/**
 * 💬 تفعيل وإيقاف محطة ديسكورد حيوياً ومزامنة قلب حالة الزر والنصوص والألوان
 */
app.post('/api/config/discord', async (req, res) => {
  const { token, channelId, admin, users, action } = req.body;

  // 🟥 في حالة طلب العميل إيقاف البوت فوراً وتصفير حالته
  if (action === 'stop') {
    if (discordStation && discordStation.client) {
      try { discordStation.client.destroy(); } catch (e) { }
    }
    appConfig.discord.active = false;
    return res.json({ success: true, message: "تم إيقاف محطة ديسكورد وتدمير جلسة الاتصال بنجاح! 🛑" });
  }

  // الفحص الصريح الأضمن للتراخيص: هل ملف البوت محذوف؟
  if (!checkDCFile()) {
    return res.status(400).json({ success: false, error: "أنت لم تقم بشراء هذا البوت يرجى شرائه من المالك @mmx10d" });
  }

  appConfig.discord.allowedUsers = Array.isArray(users) ? users : [];

  try {
    delete require.cache[require.resolve('./discordBot.js')];
    const dcModule = require('./discordBot.js');
    initDiscordBot = dcModule.initDiscordBot;

    // تشغيل البوت وتمرير إعداداته وقائمته المحفوظة
    const success = await initDiscordBot({ token, channelId, admin }, appConfig.discord.allowedUsers);
    if (success) {
      appConfig.discord.token = token;
      appConfig.discord.channelId = channelId;
      appConfig.discord.admin = admin;
      appConfig.discord.active = true;
      res.json({ success: true, message: "تم تشغيل محطة ديسكورد بنجاح واتصل البوت بالخوادم! 🚀" });
    } else {
      appConfig.discord.active = false;
      res.status(400).json({ success: false, error: "التوكين فيه خطا أو البوت معلق، ولم يتم الاتصال بالسيرفر بشكل صحيح." });
    }
  } catch (error) {
    appConfig.discord.active = false;
    res.status(400).json({ success: false, error: `فشل الاتصال! التفاصيل: ${error.message || "خطأ مجهول في خوادم ديسكورد"}` });
  }
});

/**
 * 👥 إضافة مستخدم مصرح له وتحديث الذاكرة الحية لكل منصة بشكل مستقل ومحفوظ
 */
app.post('/api/users/add', (req, res) => {
  const { username, platform } = req.body;
  const cleanUser = username ? username.trim().replace('@', '') : '';

  if (!cleanUser) return res.status(400).json({ success: false });

  if (platform === 'tg') {
    if (!appConfig.telegram.allowedUsers.includes(cleanUser)) {
      appConfig.telegram.allowedUsers.push(cleanUser);
    }
    return res.json({ success: true, users: appConfig.telegram.allowedUsers });
  } else if (platform === 'dc') {
    if (!appConfig.discord.allowedUsers.includes(cleanUser)) {
      appConfig.discord.allowedUsers.push(cleanUser);
    }
    return res.json({ success: true, users: appConfig.discord.allowedUsers });
  }

  res.status(400).json({ success: false });
});

/**
 * 🗑️ حذف مستخدم مصرح له حيوياً وتحديث مصفوفات البوتات الحية فور ضغط زر الحذف X
 */
app.post('/api/users/remove', (req, res) => {
  const { username, platform } = req.body;

  if (platform === 'tg') {
    appConfig.telegram.allowedUsers = appConfig.telegram.allowedUsers.filter(u => u !== username);
    return res.json({ success: true, users: appConfig.telegram.allowedUsers });
  } else if (platform === 'dc') {
    appConfig.discord.allowedUsers = appConfig.discord.allowedUsers.filter(u => u !== username);
    return res.json({ success: true, users: appConfig.discord.allowedUsers });
  }

  res.status(400).json({ success: false });
});

// إقلاع خادم السيرفر التلقائي المخفي للويندوز الأصلي بوضعية التطبيق المستقل الآمن
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`📡 CORE HUB STATION ACTIVE ON: http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  const targetUrl = `http://localhost:${PORT}`;
  exec(`start chrome --app="${targetUrl}"`, function (err) {
    if (err) exec(`start msedge --app="${targetUrl}"`);
  });
});
