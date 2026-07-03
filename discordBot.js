// ==========================================
// 🛰️ محطة بوت الديسكورد الذكية - نسخة أوامر السلاش 🤖💬
// ==========================================

const { Client, GatewayIntentBits, AttachmentBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const screenshot = require('screenshot-desktop');
const { exec } = require('child_process');

const discordStation = {
  client: null,
  token: '',
  channelId: '',
  admin: '',
  allowedUsers: [],
};

// دالة التحقق من الهوية والأمان (تعديل ليتوافق مع الـ Interaction)
function isUserAuthorized(interaction) {
  const authorUsername = interaction.user.username;
  const isMainAdmin = (authorUsername === discordStation.admin);
  const isAllowed = discordStation.allowedUsers.includes(authorUsername);
  return isMainAdmin || isAllowed;
}

// دالة فحص القناة المخصصة لحماية المحطة
function isCorrectChannel(interaction) {
  if (!discordStation.channelId) return true;
  return interaction.channelId === discordStation.channelId;
}

function initDiscordBot(config, globalAllowedUsers) {
  discordStation.token = config.token;
  discordStation.admin = config.admin;
  discordStation.channelId = config.channelId;
  discordStation.allowedUsers = globalAllowedUsers;

  if (discordStation.client) {
    try { discordStation.client.destroy(); } catch (e) { }
  }

  discordStation.client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });

  // 1. بناء وهيكلة أوامر السلاش ليقرأها ديسكورد تلقائياً
  const commands = [
    new SlashCommandBuilder()
      .setName('screen')
      .setDescription('📸 التقاط صورة حية لشاشة الكمبيوتر الحالية وإرسالها'),
    new SlashCommandBuilder()
      .setName('click')
      .setDescription('🎯 النقر وتحريك الماوس الفعلي لجهاز الكمبيوتر عن بعد')
      .addIntegerOption(option =>
        option.setName('x')
          .setDescription('الإحداثي الأفقي للشاشة X')
          .setRequired(true))
      .addIntegerOption(option =>
        option.setName('y')
          .setDescription('الإحداثي العمودي للشاشة Y')
          .setRequired(true))
  ].map(command => command.toJSON());

  // 2. تسجيل الأوامر عند تشغيل البوت
  discordStation.client.once('clientReady', async (c) => {
    console.log(`🤖 Discord bot active with Slash Commands: ${c.user.tag}`);
    try {
      const rest = new REST({ version: '10' }).setToken(discordStation.token);
      await rest.put(
        Routes.applicationCommands(c.user.id),
        { body: commands }
      );
      console.log('✅ تم تسجيل وتحديث أوامر السلاش بنجاح!');
    } catch (error) {
      console.error('❌ خطأ في تسجيل أوامر السلاش:', error.message);
    }
  });

  // 3. محرك معالجة وقراءة أوامر السلاش الحية (Interaction Creator)
  discordStation.client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // فحص حماية الروم والهوية
    if (!isCorrectChannel(interaction)) {
      return interaction.reply({ content: "⚠️ لا يمكن تنفيذ الأوامر خارج القناة المخصصة للمحطة.", ephemeral: true });
    }
    if (!isUserAuthorized(interaction)) {
      return interaction.reply({ content: "❌ عذراً، اسم المستخدم الخاص بك غير مصرح له بالتحكم!", ephemeral: true });
    }

    // 🟢 تنفيذ أمر السلاش: /screen
    if (interaction.commandName === 'screen') {
      // تمديد الوقت (Defer) لكي لا تظهر رسالة "The application did not respond" أثناء سحب الشاشة
      await interaction.deferReply();
      try {
        const imgBuffer = await screenshot({ format: 'png' });
        const attachment = new AttachmentBuilder(imgBuffer, { name: 'screenshot.png' });
        await interaction.editReply({ files: [attachment] });
      } catch (error) {
        console.error("خطأ سحب الصورة:", error);
        await interaction.editReply("❌ فشل التقاط صورة الشاشة الحالية.");
      }
    }

    // 🟢 تنفيذ أمر السلاش: /click
    else if (interaction.commandName === 'click') {
      const x = interaction.options.getInteger('x');
      const y = interaction.options.getInteger('y');

      const psCommand = `powershell -command "$c = '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int info); [DllImport(\\"user32.dll\\")] public static extern bool SetCursorPos(int x, int y);'; $type = Add-Type -MemberDefinition $c -Name 'Win32' -Namespace 'Win32Functions' -PassThru; $type::SetCursorPos(${x}, ${y}); $type::mouse_event(0x0002, 0, 0, 0, 0); $type::mouse_event(0x0004, 0, 0, 0, 0);"`;

      exec(psCommand, (err) => {
        if (err) {
          return interaction.reply({ content: "❌ فشل تنفيذ نقرة الماوس على جهاز الكمبيوتر.", ephemeral: true });
        }
        interaction.reply(`🎯 تم تحريك الماوس والنقر بنجاح عند الإحداثيات **X: ${x}** | **Y: ${y}**`);
      });
    }
  });

  discordStation.client.login(discordStation.token).catch(err => {
    console.error("فشل تسجيل دخول بوت الديسكورد:", err.message);
  });
}

module.exports = { initDiscordBot, discordStation };
