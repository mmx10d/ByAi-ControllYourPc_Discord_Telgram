// ========================================================
// 🛰️ محطة بوت الديسكورد الذكية - نسخة أوامر السلاش المحدثة 🤖💬
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
 * 📏 دالة الرادار المتطورة: ترسم مقاييس البكسل الأصلية الصافية كل 100 بكسل حقيقي
 * وتطبع الأرقام واضحة وكبيرة جداً (100, 200, 300...) لمطابقة إحداثيات الويندوز الفعلي
 */
async function generateEdgeGridScreen() {
  const rawImgBuffer = await screenshot({ format: 'png' });
  const image = await loadImage(rawImgBuffer);

  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  // 1. رسم الشاشة بدقتها الحقيقية الكاملة في الخلفية
  ctx.drawImage(image, 0, 0);

  // 2. إعدادات خطوط مسطرة القياس الجانبية (خطوط عريضة وأرقام ضخمة جداً نيون)
  ctx.strokeStyle = '#00ffaa';
  ctx.fillStyle = '#00ffaa';
  ctx.font = 'bold 24px Arial'; // 💥 تكبير حجم خط الأرقام بناءً على طلبك
  ctx.lineWidth = 3;

  const tickSize = 20; // زيادة طول شرطة المسطرة لتكون واضحة بعد ضغط الصور
  const step = 100;    // المسافة الثابتة (كل 100 بكسل حقيقي دقيق)

  // 🟢 أولاً: رسم المسطرة الأفقية الرياضية (الحافة العلوية والسفلية للشاشة)
  for (let x = step; x < image.width; x += step) {
    const label = x.toString(); // 💥 تعديل جوهري: طباعة الرقم بالبكسل الصريح (100, 200...) بدلاً من 1، 2

    // الحافة العلوية (Top Edge)
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, tickSize);
    ctx.stroke();
    ctx.fillText(label, x - 15, tickSize + 25);

    // الحافة السفلية (Bottom Edge)
    ctx.beginPath();
    ctx.moveTo(x, image.height);
    ctx.lineTo(x, image.height - tickSize);
    ctx.stroke();
    ctx.fillText(label, x - 15, image.height - tickSize - 10);
  }

  // 🔵 ثانياً: رسم المسطرة العمودية الرياضية (الحافة اليسرى واليمنى للشاشة)
  for (let y = step; y < image.height; y += step) {
    const label = y.toString(); // طباعة البكسل الصريح عمودياً

    // الحافة اليسرى (Left Edge)
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(tickSize, y);
    ctx.stroke();
    ctx.fillText(label, tickSize + 10, y + 8);

    // الحافة اليمنى (Right Edge)
    ctx.beginPath();
    ctx.moveTo(image.width, y);
    ctx.lineTo(image.width - tickSize, y);
    ctx.stroke();
    ctx.fillText(label, image.width - tickSize - 65, y + 8);
  }

  return canvas.toBuffer('image/png');
}

async function initDiscordBot(config, globalAllowedUsers) {
  discordStation.token = config.token;
  discordStation.admin = config.admin;
  discordStation.channelId = config.channelId;
  discordStation.allowedUsers = globalAllowedUsers;

  if (discordStation.client) {
    try { discordStation.client.destroy(); } catch (e) { }
  }

  const temporaryClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });

  const commands = [
    new SlashCommandBuilder()
      .setName('screen')
      .setDescription('📸 التقاط صورة حية للشاشة الحالية وإرسالها مع مساطر الحواف بالبكسل الصريح'),
    new SlashCommandBuilder()
      .setName('click')
      .setDescription('🎯 النقر وتحريك الماوس الفعلي لجهاز الكمبيوتر مع تحديث فوري للصورة')
      .addIntegerOption(option =>
        option.setName('x')
          .setDescription('الإحداثي الأفقي للشاشة X بالبكسل')
          .setRequired(true))
      .addIntegerOption(option =>
        option.setName('y')
          .setDescription('الإحداثي العمودي للشاشة Y بالبكسل')
          .setRequired(true))
  ].map(command => command.toJSON());

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
        resolve({ success: true });
      }
    });

    temporaryClient.login(discordStation.token).catch((err) => {
      console.error("❌ Discord login failure:", err.message);
      resolve({ success: false, error: err });
    });
  });

  if (!loginResult.success) {
    throw loginResult.error;
  }

  discordStation.client = temporaryClient;

  discordStation.client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (!isCorrectChannel(interaction)) {
      return interaction.reply({ content: "⚠️ لا يمكن تنفيذ الأوامر خارج القناة المخصصة.", ephemeral: true });
    }
    if (!isUserAuthorized(interaction)) {
      return interaction.reply({ content: "❌ عذراً، اسم المستخدم الخاص بك غير مصرح له بالتحكم!", ephemeral: true });
    }

    if (interaction.commandName === 'screen') {
      await interaction.deferReply();
      try {
        const gridImgBuffer = await generateEdgeGridScreen();
        const attachment = new AttachmentBuilder(gridImgBuffer, { name: 'screenshot.png' });
        await interaction.editReply({
          content: `📊 الشاشة الحالية بدقتها الأصلية.\n📏 انظر للمسطرة على الحواف لمعرفة أرقام الـ X والـ Y بدقة بالبكسل الصريح (100, 200, 300...)`,
          files: [attachment]
        });
      } catch (error) {
        await interaction.editReply("❌ فشل التقاط صورة الشاشة وتوليد الرادار.");
      }
    }

    else if (interaction.commandName === 'click') {
      const x = interaction.options.getInteger('x');
      const y = interaction.options.getInteger('y');

      await interaction.deferReply();

      // 💻 طباعة تفاصيل النقرة بالكونسل فوراً بناءً على طلبك
      console.log(`[👉 DISCORD CLICK] User: @${interaction.user.username} executed a click at coordinates -> X: ${x} | Y: ${y}`);

      const psCommand = `powershell -command "$c = '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int info); [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y);'; $type = Add-Type -MemberDefinition $c -Name 'Win32' -Namespace 'Win32Functions' -PassThru; $type::SetCursorPos(${x}, ${y}); $type::mouse_event(0x0002, 0, 0, 0, 0); $type::mouse_event(0x0004, 0, 0, 0, 0);"`;

      exec(psCommand, async (err) => {
        if (err) return interaction.editReply("❌ فشل تنفيذ نقرة الماوس على جهاز الكمبيوتر.");

        setTimeout(async () => {
          try {
            const freshGridImg = await generateEdgeGridScreen();
            const attachment = new AttachmentBuilder(freshGridImg, { name: 'screenshot.png' });

            await interaction.editReply({
              content: `🎯 تم تنفيذ النقرة بنجاح عند X: ${x} | Y: ${y}\nالصورة أعلاه تحدّثت فوراً لتعرض لك النتيجة المحدثة على الشاشة!`,
              files: [attachment]
            });
          } catch (error) {
            await interaction.editReply(`🎯 تم النقر بنجاح عند X: ${x} | Y: ${y}، لكن تعذر توليد الصورة التلقائية.`);
          }
        }, 400);
      });
    }
  });

  return true;
}

module.exports = { initDiscordBot, discordStation };
