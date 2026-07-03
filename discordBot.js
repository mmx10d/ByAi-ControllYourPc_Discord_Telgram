// ========================================================
// 🛰️ محطة بوت الديسكورد الذكية - نسخة أوامر السلاش المحدثة 🤖💬 (الجزء 1 من 2)
// ========================================================

const { Client, GatewayIntentBits, AttachmentBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const screenshot = require('screenshot-desktop');
const { exec } = require('child_process');
const { createCanvas, loadImage } = require('canvas'); // محرك الرسم الرقمي للمقاييس والأبعاد

const discordStation = {
  client: null,
  token: '',
  channelId: '',
  admin: '',
  allowedUsers: [],
};

// دالة التحقق من الهوية والأمان (متوافقة بالكامل مع الـ Interaction)
function isUserAuthorized(interaction) {
  const authorUsername = interaction.user.username;
  const isMainAdmin = (authorUsername === discordStation.admin);
  const isAllowed = discordStation.allowedUsers.includes(authorUsername);
  return isMainAdmin || isAllowed;
}

// دالة فحص القناة المخصصة لحماية المحطة وقفل قراءة الأوامر
function isCorrectChannel(interaction) {
  if (!discordStation.channelId) return true; // يعمل في كل القنوات لو ترك الحقل فارغاً
  return interaction.channelId === discordStation.channelId;
}

/**
 * 📏 دالة الرادار المتطورة: تلتقط شاشة الكمبيوتر وترسم مساطر القياس الرقمية
 * على حواف وأطراف الصورة الأربعة فقط لحماية المحتوى الفعلي للمستخدم من التغطية
 */
async function generateEdgeGridScreen() {
  const rawImgBuffer = await screenshot({ format: 'png' });
  const image = await loadImage(rawImgBuffer);

  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  // 1. رسم الشاشة الأصلية النظيفة بالكامل في الخلفية بدقتها الأصلية
  ctx.drawImage(image, 0, 0);

  // 2. إعدادات خطوط مسطرة القياس الجانبية (لون أخضر نيون ناصع وعالي التباين)
  ctx.strokeStyle = '#00ffaa';
  ctx.fillStyle = '#00ffaa';
  ctx.font = 'bold 14px Arial';
  ctx.lineWidth = 2;

  const tickSize = 12; // طول خط العلامة الصغير المرسوم عند الحافة
  const step = 100;    // المسافة الثابتة بين العلامات (كل 100 بكسل خط ورقم)

  // 🟢 أولاً: رسم المسطرة الأفقية الرياضية (الحافة العلوية والسفلية للشاشة)
  for (let x = step; x < image.width; x += step) {
    const label = (x / step).toString(); // تحويل الترقيم الهندسي (100 تصبح مؤشر 1، 200 تصبح 2...)

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

  // 🔵 ثانياً: رسم المسطرة العمودية الرياضية (الحافة اليسرى واليمنى للشاشة)
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

console.log("⚡ تم تحميل الهيكل ورادار مساطر الأطراف الحوافي لأوامر السلاش ديسكورد...");
// ========================================================
// 🛰️ محطة بوت الديسكورد الذكية - نسخة أوامر السلاش المحدثة 🤖💬 (الجزء 2 من 2)
// ========================================================

async function initDiscordBot(config, globalAllowedUsers) {
  discordStation.token = config.token;
  discordStation.admin = config.admin;
  discordStation.channelId = config.channelId;
  discordStation.allowedUsers = globalAllowedUsers;

  // إنهاء أي اتصال نشط سابق للبوت لتفادي تكرار العمليات البرمجية
  if (discordStation.client) {
    try { discordStation.client.destroy(); } catch (e) { }
  }

  // بناء العميل مع صلاحيات قراءة السيرفرات وقوائمها
  const temporaryClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });

  // بناء الأوامر وتسجيلها بهيكلية السلاش المتوافقة مع الـ Global Commands
  const commands = [
    new SlashCommandBuilder()
      .setName('screen')
      .setDescription('📸 التقاط صورة حية لشاشة الكمبيوتر الحالية وإرسالها مع مساطر الحواف'),
    new SlashCommandBuilder()
      .setName('click')
      .setDescription('🎯 النقر وتحريك الماوس الفعلي لجهاز الكمبيوتر مع تحديث فوري للصورة')
      .addIntegerOption(option =>
        option.setName('x')
          .setDescription('الإحداثي الأفقي للشاشة X')
          .setRequired(true))
      .addIntegerOption(option =>
        option.setName('y')
          .setDescription('الإحداثي العمودي للشاشة Y')
          .setRequired(true))
  ].map(command => command.toJSON());

  // وعد (Promise) ذكي لفحص التوكن حيوياً وتمرير نص الخطأ الفعلي الصادر من ديسكورد
  const loginResult = await new Promise((resolve) => {
    temporaryClient.once('ready', async (c) => {
      console.log(`🤖 Discord bot active with Slash Commands: ${c.user.tag}`);
      try {
        const rest = new REST({ version: '10' }).setToken(discordStation.token);
        await rest.put(
          Routes.applicationCommands(c.user.id),
          { body: commands }
        );
        console.log('✅ تم تسجيل وتحديث أوامر السلاش بنجاح!');
        resolve({ success: true });
      } catch (error) {
        console.error('❌ خطأ في تسجيل أوامر السلاش:', error.message);
        resolve({ success: true }); // نعتبر الدخول ناجحاً حتى لو تأخر تحديث الأوامر بالـ API
      }
    });

    temporaryClient.login(discordStation.token).catch((err) => {
      console.error("❌ Discord login failure:", err.message);
      // ترحيل الخطأ الفعلي إلى السيرفر ليعرضه المودال النيون أمام العميل
      resolve({ success: false, error: err });
    });
  });

  // في حال فشل التوكن، نطلق استثناء صريح ليلتقطه catch في ملف index.js
  if (!loginResult.success) {
    throw loginResult.error;
  }

  discordStation.client = temporaryClient;

  // 3. محرك معالجة وقراءة أوامر السلاش الحية (Interaction Creator)
  discordStation.client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // فحص حماية الروم والهوية المصرح لها بالتحكم
    if (!isCorrectChannel(interaction)) {
      return interaction.reply({ content: "⚠️ لا يمكن تنفيذ الأوامر خارج القناة المخصصة للمحطة.", ephemeral: true });
    }
    if (!isUserAuthorized(interaction)) {
      return interaction.reply({ content: "❌ عذراً، اسم المستخدم الخاص بك غير مصرح له بالتحكم!", ephemeral: true });
    }

    // 🟢 1. تنفيذ أمر السلاش المطور: /screen
    if (interaction.commandName === 'screen') {
      // تمديد وقت الرد لمنع تعليق الأمر بالديسكورد أثناء توليد بافر الرسم
      await interaction.deferReply();
      try {
        const gridImgBuffer = await generateEdgeGridScreen();
        const attachment = new AttachmentBuilder(gridImgBuffer, { name: 'screenshot.png' });
        await interaction.editReply({ 
          content: `📊 الشاشة الحالية بدقتها الأصلية.\n📏 انظر للمسطرة على الحواف لمعرفة أرقام الـ X والـ Y بدقة (الرقم 1 يعني 100 بكسل...)`,
          files: [attachment] 
        });
      } catch (error) {
        console.error("خطأ سحب الصورة:", error);
        await interaction.editReply("❌ فشل التقاط صورة الشاشة الحالية وتوليد الرادار.");
      }
    }

    // 🟢 2. تنفيذ أمر السلاش المحدث بمهلة تجميد الاستجابة: /click
    else if (interaction.commandName === 'click') {
      const x = interaction.options.getInteger('x');
      const y = interaction.options.getInteger('y');

      // إخبار ديسكورد بالانتظار (Defer) لكي نكسب وقتاً كافياً لتنفيذ المهلة الزمنية الذكية
      await interaction.deferReply();

      const psCommand = `powershell -command "$c = '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int info); [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y);'; $type = Add-Type -MemberDefinition $c -Name 'Win32' -Namespace 'Win32Functions' -PassThru; $type::SetCursorPos(${x}, ${y}); $type::mouse_event(0x0002, 0, 0, 0, 0); $type::mouse_event(0x0004, 0, 0, 0, 0);"`;

      exec(psCommand, async (err) => {
        if (err) {
          console.error("خطأ PowerShell ديسكورد:", err);
          return interaction.editReply("❌ فشل تنفيذ نقرة الماوس على جهاز الكمبيوتر.");
        }

        // ⏱️ التحديث الاحترافي المشرط:
        // ننتظر 400 ملي ثانية لكي تفتح نوافذ الويندوز الفعلية، ومن ثم نأخذ اللقطة المحدثة لنرسلها فوراً
        setTimeout(async () => {
          try {
            const freshGridImg = await generateEdgeGridScreen();
            const attachment = new AttachmentBuilder(freshGridImg, { name: 'screenshot.png' });
            
            await interaction.editReply({
              content: `🎯 تم تنفيذ النقرة بنجاح عند X: ${x} | Y: ${y}\nالصورة أعلاه تحدّثت فوراً لتعرض لك النتيجة المحدثة على الشاشة بعد الضغط مباشرة!`,
              files: [attachment]
            });
          } catch (error) {
            await interaction.editReply(`🎯 تم النقر بنجاح عند X: ${x} | Y: ${y}، لكن تعذر توليد الصورة التلقائية المحدثة.`);
          }
        }, 400); // مهلة الـ 400ms لتأمين ثبات التحديث البصري
      });
    }
  });

  return true; // إرجاع تفعيل اللمبة الخضراء للسيرفر
}

module.exports = { initDiscordBot, discordStation };
