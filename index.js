// ==========================================
// 🛰️ SERVER STATION (server.js) - PART 1 🛰️
// ==========================================

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

// In-memory data store for configurations and permitted users
let appConfig = {
  telegram: { token: '', admin: '', active: false },
  discord: { token: '', channelId: '', admin: '', active: false },
  allowedUsers: []
};

// Global variables to hold active bot initialization functions
let initTelegramBot = null;
let initDiscordBot = null;

// Check if bot module files exist in the project directory
const tgFileExists = fs.existsSync(path.join(__dirname, 'telegramBot.js'));
const dcFileExists = fs.existsSync(path.join(__dirname, 'discordBot.js'));

// Dynamically import the bot modules if they are present
if (tgFileExists) {
  try {
    const tgModule = require('./telegramBot');
    initTelegramBot = tgModule.initTelegramBot;
    console.log("✅ Telegram Station file detected and integrated successfully.");
  } catch (e) {
    console.error("⚠️ Error loading telegramBot.js module:", e.message);
  }
}

if (dcFileExists) {
  try {
    const dcModule = require('./discordBot');
    initDiscordBot = dcModule.initDiscordBot;
    console.log("✅ Discord Station file detected and integrated successfully.");
  } catch (e) {
    console.error("⚠️ Error loading discordBot.js module:", e.message);
  }
}

/**
 * 🔒 Licensing Web Route
 * Serves index.html if both modules exist, otherwise injects a dynamic purchase warning.
 */
app.get('/', (req, res) => {
  if (!tgFileExists || !dcFileExists) {
    return res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تنبيه الحماية والترخيص 🔒</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0b0f19; color: #fff; text-align: center; padding-top: 15vh; margin: 0; }
                .alert-card { background: #131a26; border: 2px solid #ff4d4d; border-radius: 12px; padding: 40px; display: inline-block; max-width: 500px; box-shadow: 0 0 25px rgba(255,77,77,0.2); }
                h1 { color: #ff4d4d; font-size: 28px; margin-bottom: 20px; }
                p { font-size: 18px; line-height: 1.6; color: #cddee8; }
                .owner-link { display: inline-block; margin-top: 20px; font-weight: bold; font-size: 20px; color: #00ffaa; text-decoration: none; border: 1px dashed #00ffaa; padding: 10px 20px; border-radius: 8px; transition: 0.2s; }
                .owner-link:hover { background: rgba(0,255,170,0.1); transform: scale(1.05); }
            </style>
        </head>
        <body>
            <div class="alert-card">
                <h1>🔒 تنبيه: ملفات المحطة غير مكتملة</h1>
                <p>أنت لم تقم بشراء هذا البوت، أو أن بعض ملفات النظام الأساسية مفقودة من المجلد الخاص بك!</p>
                <p>يرجى التواصل مع المالك المعتمد فوراً لتفعيل المحطة بالكامل:</p>
                <a href="https://t.me" target="_blank" class="owner-link">📬 مراسلة المالك: @mmx10d</a>
            </div>
        </body>
        </html>
        `);
  }

  // Serve index.html securely if files are intact
  res.sendFile(path.join(__dirname, 'index.html'));
});

console.log("⚡ Part 1 of the server station is operational. Ready for API endpoint definitions...");
// ==========================================
// 🛰️ SERVER STATION (server.js) - PART 2 🛰️
// ==========================================

/**
 * 🖥️ 1. Screenshot Capture API Route
 * Delivers local screen snapshots formatted into raw Base64 data strings.
 */
app.get('/api/screenshot', async (req, res) => {
  try {
    const imgBuffer = await screenshot({ format: 'png' });
    res.json({ success: true, image: `data:image/png;base64,${imgBuffer.toString('base64')}` });
  } catch (error) {
    console.error("Error capturing screen image:", error.message);
    res.status(500).json({ success: false, error: "System failed to extract screen snapshot" });
  }
});

/**
 * 🎯 2. Mouse Click API Route
 * Utilizes the internal system PowerShell framework to fire mouse pointer triggers.
 */
app.post('/api/click', (req, res) => {
  const { x, y, user } = req.body;

  // Safety check ensuring identity verification clearances pass
  const isMainAdmin = (user === appConfig.telegram.admin || user === appConfig.discord.admin || user === "WebConsole_Admin");
  const isAllowed = appConfig.allowedUsers.includes(user);

  if (!isMainAdmin && !isAllowed) {
    return res.status(403).json({ error: "Access Denied: Account not permitted to trigger controls!" });
  }

  // PowerShell win32 instruction execution string
  const command = `powershell -command "$c = '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int info); [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y);'; $type = Add-Type -MemberDefinition $c -Name 'Win32' -Namespace 'Win32Functions' -PassThru; $type::SetCursorPos(${x}, ${y}); $type::mouse_event(0x0002, 0, 0, 0, 0); $type::mouse_event(0x0004, 0, 0, 0, 0);"`;

  exec(command, (err) => {
    if (err) return res.status(500).json({ success: false, error: "PowerShell driver script issue" });
    res.json({ success: true });
  });
});

/**
 * ✈️ 3. Telegram Activation Endpoint
 * Dynamically provisions the Telegram Bot module if files are licensed.
 */
app.post('/api/config/telegram', (req, res) => {
  const { token, admin } = req.body;
  appConfig.telegram = { token, admin, active: true };

  if (!initTelegramBot) {
    return res.status(400).json({ success: false, error: "Telegram module missing or unlicensed. Purchase from @mmx10d" });
  }

  try {
    initTelegramBot({ token, admin }, appConfig.allowedUsers);
    res.json({ success: true, message: "Telegram Station bot process launched successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed initializing Telegram background service" });
  }
});

/**
 * 💬 4. Discord Activation Endpoint
 * Dynamically binds and executes the Discord bot workflow configurations.
 */
app.post('/api/config/discord', (req, res) => {
  const { token, channelId, admin } = req.body;
  appConfig.discord = { token, channelId, admin, active: true };

  if (!initDiscordBot) {
    return res.status(400).json({ success: false, error: "Discord module missing or unlicensed. Purchase from @mmx10d" });
  }

  try {
    initDiscordBot({ token, channelId, admin }, appConfig.allowedUsers);
    res.json({ success: true, message: "Discord Station bot process launched successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed initializing Discord background service" });
  }
});

/**
 * 👥 5. Team Controller Permission API
 * Appends safe identity flags authorizing shared access tags to handle hardware.
 */
app.post('/api/users/add', (req, res) => {
  const { username } = req.body;
  const cleanUser = username ? username.trim().replace('@', '') : '';

  if (cleanUser && !appConfig.allowedUsers.includes(cleanUser)) {
    appConfig.allowedUsers.push(cleanUser);
    return res.json({ success: true, users: appConfig.allowedUsers });
  }
  res.status(400).json({ success: false, message: "User handle invalid or already existing" });
});
// استدعاء مكتبة الواجهات المستقلة
const carlo = require('carlo');

const startIndependentApp = async () => {
  try {
    // 1. إنشاء نافذة التطبيق المستقلة (العنوان بالإنجليزية لتفادي تضارب الترميز)
    const cApp = await carlo.launch({
      width: 1150,
      height: 850,
      title: "Control Center Station"
    });

    // إنهاء السيرفر عند إغلاق النافذة
    cApp.on('exit', () => process.exit());

    // 2. إخبار النافذة بمكان المجلد الحالي لقراءة الملفات
    await cApp.serveFolder(__dirname);

    // 3. تحميل واجهة الـ HTML الرئيسية فوراً داخل البرنامج
    await cApp.load('index.html');

    console.log(`\n======================================================`);
    console.log(`📡 CORE HUB STATION ACTIVE - INDEPENDENT APP RUNNING`);
    console.log(`======================================================\n`);

  } catch (error) {
    console.error("❌ فشل إطلاق واجهة التطبيق:", error.message);
  }
};
// تشغيل السيرفر الفعلي والاستماع للمنفذ بثبات
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`📡 CORE HUB STATION ACTIVE - INDEPENDENT APP RUNNING`);
  console.log(`======================================================\n`);

  // استدعاء نافذة تطبيق مستقلة ونظيفة مجبرة على قراءة السيرفر المحلي عبر نظام التشغيل
  // الخيار --app يجبر الويندوز على إخفاء شريط المتصفح، والبحث، والإضافات ليظهر كبرنامج منفصل تماماً
  const targetUrl = `http://localhost:${PORT}`;
  const appWindowCommand = `start chrome --app="${targetUrl}"`;

  exec(appWindowCommand, function (err, stdout, stderr) {
    if (err) {
      // في حال عدم وجود متصفح كروم، يفتح عبر متصفح إيدج بنظام التطبيق المستقل أيضاً لضمان العمل
      const edgeWindowCommand = `start msedge --app="${targetUrl}"`;
      exec(edgeWindowCommand, function (edgeErr) {
        if (edgeErr) {
          console.log(`⚠️ لا يدعم جهازك الفتح التلقائي الافتراضي، الرابط: ${targetUrl}`);
        }
      });
    } else {
      console.log("🚀 تم إطلاق نافذة التطبيق المستقلة بنجاح باهر!");
    }
  });
});
