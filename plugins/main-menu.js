```js
// 📂 plugins/main-menu.js
// 🐾 FELIXCAT-BOT — MENU FUTURISTIC
// ✅ Sin template literals para evitar errores del parser

const botname = global.botname || 'FelixCat-Bot'
const creador = 'Anónimo🐼'
const versionBot = '11.0 ULTRA'

let handler = async (m, { conn }) => {
  try {

    const fecha = new Date().toLocaleString('es-UY', {
      timeZone: 'America/Montevideo',
      hour12: false
    })

    const saludo = getSaludoGatuno()

    const menu = [
      '╔══════════════════════════════════╗',
      '║                                  ║',
      '║       🐈‍⬛ 𝐅𝐄𝐋𝐈𝐗𝐂𝐀𝐓 𝐁𝐎𝐓       ║',
      '║          𝐔𝐋𝐓𝐑𝐀 𝐒𝐘𝐒𝐓𝐄𝐌         ║',
      '║                                  ║',
      '╚══════════════════════════════════╝',
      '',
      '        ◈ ' + saludo + ' ◈',
      '',
      '┌─[ 𝐒𝐘𝐒𝐓𝐄𝐌 𝐈𝐍𝐅𝐎 ]',
      '│',
      '│  🤖 ' + botname,
      '│  ⚡ v' + versionBot,
      '│  👤 ' + creador,
      '│  🟢 ONLINE',
      '│  🕒 ' + fecha,
      '│',
      '└──────────────────────────────────',
      '',
      '╭━━━〔 𝟎𝟏 • 𝐌𝐀𝐈𝐍 〕━━━╮',
      '',
      '  › 🏠 .menu',
      '  › 🧭 .menugp',
      '  › 🎮 .menuj',
      '  › 🎭 .menupj',
      '  › 👑 .mw',
      '',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━━〔 𝟎𝟐 • 𝐔𝐒𝐄𝐑 〕━━━╮',
      '',
      '  › 🪪 .perfil',
      '  › 🎂 .setbr',
      '  › 📝 .bio',
      '  › 🚻 .genero',
      '',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━━〔 𝟎𝟑 • 𝐒𝐎𝐂𝐈𝐀𝐋 〕━━━╮',
      '',
      '  › 🤝 .hermano',
      '  › ✅ .aceptarhermano',
      '  › ❌ .rechazarhermano',
      '  › 💔 .romperhermandad',
      '  › 🤗 .abrazohermano',
      '  › 🛡️ .proteger',
      '  › ✋ .chocarhermano',
      '  › 🥊 .entrenarhermano',
      '  › 📊 .relacionhermano',
      '',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━━〔 𝟎𝟒 • 𝐋𝐎𝐕𝐄 〕━━━╮',
      '',
      '  ♥ .pareja',
      '  👑 .setpareja',
      '  💬 .aceptar',
      '  ❌ .rechazar',
      '',
      '  💍 .casarse',
      '  ✔️ .si',
      '  ✖️ .no',
      '',
      '  💔 .terminar',
      '  💔 .divorciar',
      '  ❤️ .relacion',
      '  💖 .amor',
      '',
      '  💋 .besar',
      '  🤗 .abrazar',
      '  🌹 .flores',
      '  🎁 .regalo',
      '  🍷 .cita',
      '',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━━〔 𝟎𝟓 • 𝐒𝐄𝐂𝐔𝐑𝐈𝐓𝐘 〕━━━╮',
      '',
      '  🔗 .antilink',
      '  🚫 .antilink2',
      '  🤖 .antibot',
      '  ☣️ .antitoxico',
      '  👻 .antifake',
      '',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━━〔 𝟎𝟔 • 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐒 〕━━━╮',
      '',
      '  📲 .apk',
      '  🎧 .spotify',
      '  📘 .fb',
      '  📸 .ig',
      '  📂 .mediafire',
      '  🎵 .tiktok',
      '',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━━〔 𝟎𝟕 • 𝐌𝐔𝐒𝐈𝐂 〕━━━╮',
      '',
      '  🎵 .play',
      '  🔊 .play2',
      '  🎧 .mp3',
      '  🎬 .mp2',
      '  🎥 .ytmp4',
      '',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━━〔 𝟎𝟖 • 𝐌𝐄𝐃𝐈𝐀 〕━━━╮',
      '',
      '  💬 .qc',
      '  ✂️ .s',
      '  🖼️ .imagen',
      '  🌐 .google',
      '',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━━〔 𝟎𝟗 • 𝐆𝐀𝐌𝐄𝐒 〕━━━╮',
      '',
      '  🎯 .trivia',
      '  ❓ .adivinanza',
      '  🏴 .bandera',
      '  🏛️ .capital',
      '  🧠 .pensar',
      '  🔢 .numero',
      '  🐈 .miau',
      '  🏆 .top10',
      '  💃 .dance',
      '  🍝 .plato',
      '  🤡 .cornudo',
      '  💔 .infiel',
      '  💋 .kiss',
      '  🦊 .zorro',
      '',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━━〔 𝟏𝟎 • 𝐀𝐃𝐌𝐈𝐍 〕━━━╮',
      '',
      '  🗑️ .del',
      '  👢 .k',
      '  🅿️ .p',
      '  🅳 .d',
      '  🔇 .mute',
      '  🔊 .unmute',
      '  🏷️ .tagall',
      '  📢 .tag',
      '  ⚙️ .g',
      '',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━━〔 𝟏𝟏 • 𝐎𝐖𝐍𝐄𝐑 〕━━━╮',
      '',
      '  🛡️ .autoadmin',
      '  🔗 .join',
      '  📜 .grouplist',
      '  🔄 .resetuser',
      '  ✏️ .setprefix',
      '  🧹 .resetprefix',
      '  🔁 .restart',
      '  🪄 .resetlink',
      '  ⚙️ .update',
      '',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╔══════════════════════════════════╗',
      '║                                  ║',
      '║       🟢 𝐅𝐄𝐋𝐈𝐗𝐂𝐀𝐓 𝐎𝐍𝐋𝐈𝐍𝐄      ║',
      '║                                  ║',
      '║       ⚡ 𝐔𝐋𝐓𝐑𝐀 𝐌𝐎𝐃𝐄 ⚡         ║',
      '║                                  ║',
      '║       「 🐾 NEVER STOP 」         ║',
      '║                                  ║',
      '╚══════════════════════════════════╝',
      '',
      '        ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐅𝐄𝐋𝐈𝐗𝐂𝐀𝐓'
    ].join('\n')

    await conn.reply(m.chat, menu, m)

    await conn.sendMessage(m.chat, {
      react: {
        text: '🐈‍⬛',
        key: m.key
      }
    })

  } catch (err) {

    console.error('❌ Error en main-menu.js:', err)

    await conn.reply(
      m.chat,
      '❌ Error al mostrar el menú\n\n' + err,
      m
    )
  }
}

handler.help = ['menu', 'menú', 'help']
handler.tags = ['main']
handler.command = ['menu', 'menú', 'help']

export default handler


function getSaludoGatuno() {

  const hora = Number(
    new Date().toLocaleString('en-US', {
      timeZone: 'America/Montevideo',
      hour: 'numeric',
      hour12: false
    })
  )

  if (hora >= 5 && hora < 12) {
    return '🌅 𝐁𝐔𝐄𝐍𝐎𝐒 𝐃𝐈́𝐀𝐒 • 𝐅𝐄𝐋𝐈𝐍𝐎'
  }

  if (hora >= 12 && hora < 18) {
    return '☀️ 𝐁𝐔𝐄𝐍𝐀𝐒 𝐓𝐀𝐑𝐃𝐄𝐒 • 𝐅𝐄𝐋𝐈𝐍𝐎'
  }

  return '🌙 𝐁𝐔𝐄𝐍𝐀𝐒 𝐍𝐎𝐂𝐇𝐄𝐒 • 𝐅𝐄𝐋𝐈𝐍𝐎'
}
```
