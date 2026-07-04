// ========================================================
// 🛰️ SERVER STATION (index.js) - PACKAGES PATH REPAIR 🛰️ (Part 1)
// ========================================================

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// 🛠️ الإصلاح الحاسم والأخير: إجبار الـ EXE على قراءة مجلد الـ data الخارجي وتجاهل الـ Temp
const customModulesPath = path.join(process.cwd(), 'data', 'node_modules');
if (fs.existsSync(customModulesPath)) {
  // حقن المسار الجديد في ذاكرة النظام الحية للبرنامج لمنع التعليق
  module.paths.unshift(customModulesPath);
  process.env.NODE_PATH = customModulesPath;
  require('module').Module._initPaths();
}

// استدعاء مكتبة السكرين شوت بعد تحويل المسار بأمان وضمان استقرارها
const screenshot = require('screenshot-desktop');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// كائنات التخزين المحدثة لحفظ الحالات النشطة وقوائم المستخدمين
let appConfig = {
  telegram: { token: '', admin: '', active: false, allowedUsers: [] },
  discord: { token: '', channelId: '', admin: '', active: false, allowedUsers: [] }
};

let initTelegramBot = null;
let initDiscordBot = null;

console.log("🟢 تم تحويل وتثبيت مسار الحزم المشفرة بجسم الـ data بنجاح باهر...");
// ========================================================
// 🛰️ SERVER STATION (index.js) - PACKAGES PATH REPAIR 🛰️ (Part 2)
// ========================================================

// فحص وجود الملفات البرمجية الحيوية من مجلد التشغيل الفعلي للـ EXE
const checkTGFile = () => fs.existsSync(path.join(process.cwd(), 'telegramBot.js'));
const checkDCFile = () => fs.existsSync(path.join(process.cwd(), 'discordBot.js'));

app.get('/api/status', (req, res) => {
  res.json({
    telegram: checkTGFile() ? appConfig.telegram.active : false,
    discord: checkDCFile() ? appConfig.discord.active : false,
    tgUsers: appConfig.telegram.allowedUsers,
    dcUsers: appConfig.discord.allowedUsers
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
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
 * 🎯 مسار النقر وتحريك الماوس المطور حيوياً لـ إحداثيات البكسل المطلق وطباعة النقرة بالكونسل
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

  console.log(`[👉 WEB CONSOLE CLICK] User: ${user} executed a click at coordinates -> X: ${x} | Y: ${y}`);

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

  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const langCode = hasArabic ? "00000401" : "00000409";

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

app.post('/api/config/telegram', async (req, res) => {
  const { token, admin, users, action } = req.body;

  if (action === 'stop') {
    try {
      const tgModule = require(path.join(process.cwd(), 'telegramBot.js'));
      if (tgModule.telegramStation && tgModule.telegramStation.bot) {
        tgModule.telegramStation.bot.stop();
      }
    } catch (e) { }
    appConfig.telegram.active = false;
    return res.json({ success: true, message: "تم إيقاف محطة تليجرام وتصفير العمليات بنجاح! 🛑" });
  }

  if (!checkTGFile()) {
    return res.status(400).json({ success: false, error: "أنت لم تقم بشراء هذا البوت يرجى شرائه من المالك @mmx10d" });
  }

  appConfig.telegram.allowedUsers = Array.isArray(users) ? users : [];

  try {
    const tgFilePath = path.join(process.cwd(), 'telegramBot.js');
    delete require.cache[require.resolve(tgFilePath)];
    const tgModule = require(tgFilePath);
    initTelegramBot = tgModule.initTelegramBot;

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

app.post('/api/config/discord', async (req, res) => {
  const { token, channelId, admin, users, action } = req.body;

  if (action === 'stop') {
    try {
      const dcModule = require(path.join(process.cwd(), 'discordBot.js'));
      if (dcModule.discordStation && dcModule.discordStation.client) {
        dcModule.discordStation.client.destroy();
      }
    } catch (e) { }
    appConfig.discord.active = false;
    return res.json({ success: true, message: "تم إيقاف محطة ديسكورد وتدمير جلسة الاتصال بنجاح! 🛑" });
  }

  if (!checkDCFile()) {
    return res.status(400).json({ success: false, error: "أنت لم تقم بشراء هذا البوت يرجى شرائه من المالك @mmx10d" });
  }

  appConfig.discord.allowedUsers = Array.isArray(users) ? users : [];

  try {
    const dcFilePath = path.join(process.cwd(), 'discordBot.js');
    delete require.cache[require.resolve(dcFilePath)];
    const dcModule = require(dcFilePath);
    initDiscordBot = dcModule.initDiscordBot;

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

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`📡 CORE HUB STATION ACTIVE ON: http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  const targetUrl = `http://localhost:${PORT}`;
  exec(`start chrome --app="${targetUrl}"`, function (err) {
    if (err) exec(`start msedge --app="${targetUrl}"`);
  });
});
