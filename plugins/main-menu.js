const botname = global.botname || 'FelixCat-Bot'
const creador = 'Anónimo🐼'
const versionBot = '11.0 ULTRA'

let handler = async (m, { conn }) => {
  try {
    const fecha = new Date().toLocaleString('es-UY', {
      timeZone: 'America/Montevideo',
      hour12: false
    })

    const hora = Number(
      new Date().toLocaleString('en-US', {
        timeZone: 'America/Montevideo',
        hour: 'numeric',
        hour12: false
      })
    )

    let saludo

    if (hora >= 5 && hora < 12) {
      saludo = '🌅 Buenos días, felino'
    } else if (hora >= 12 && hora < 18) {
      saludo = '☀️ Buenas tardes, felino'
    } else {
      saludo = '🌙 Buenas noches, felino'
    }

    const menu = [
      '╔══════════════════════════════════╗',
      '║                                  ║',
      '║       🐈 FELIXCAT-BOT            ║',
      '║         ⚡ ULTRA SYSTEM          ║',
      '║                                  ║',
      '╚══════════════════════════════════╝',
      '',
      '        ◈ ' + saludo + ' ◈',
      '',
      '┌─「 SYSTEM 」',
      '│',
      '│ 🤖 Bot: ' + botname,
      '│ 👤 Creator: ' + creador,
      '│ ⚡ Version: ' + versionBot,
      '│ 🟢 Status: ONLINE',
      '│ 🕒 ' + fecha,
      '│',
      '└────────────────────────────',
      '',
      '╭━━〔 01 • MAIN 〕━━╮',
      '│',
      '│ 🏠 .menu',
      '│ 🧭 .menugp',
      '│ 🎮 .menuj',
      '│ 🎭 .menupj',
      '│ 👑 .mw',
      '│',
      '╰━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━〔 02 • PERFIL 〕━━╮',
      '│',
      '│ 🪪 .perfil',
      '│ 🎂 .setbr',
      '│ 📝 .bio',
      '│ 🚻 .genero',
      '│',
      '╰━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━〔 03 • HERMANDAD 〕━━╮',
      '│',
      '│ 🤝 .hermano',
      '│ ✅ .aceptarhermano',
      '│ ❌ .rechazarhermano',
      '│ 💔 .romperhermandad',
      '│ 🤗 .abrazohermano',
      '│ 🛡️ .proteger',
      '│ ✋ .chocarhermano',
      '│ 🥊 .entrenarhermano',
      '│ 📊 .relacionhermano',
      '│',
      '╰━━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━〔 04 • RELACIONES 〕━━╮',
      '│',
      '│ 💘 .pareja',
      '│ 👑 .setpareja',
      '│ 💬 .aceptar',
      '│ ❌ .rechazar',
      '│',
      '│ 💍 .casarse',
      '│ ✔️ .si',
      '│ ❌ .no',
      '│',
      '│ 💔 .terminar',
      '│ 💔 .divorciar',
      '│ ❤️ .relacion',
      '│ 💖 .amor',
      '│',
      '│ 💋 .besar',
      '│ 🤗 .abrazar',
      '│ 🌹 .flores',
      '│ 🎁 .regalo',
      '│ 🍷 .cita',
      '│',
      '╰━━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━〔 05 • SEGURIDAD 〕━━╮',
      '│',
      '│ 🔗 .antilink',
      '│ 🚫 .antilink2',
      '│ 🤖 .antibot',
      '│ ☣️ .antitoxico',
      '│ 👻 .antifake',
      '│',
      '╰━━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━〔 06 • DESCARGAS 〕━━╮',
      '│',
      '│ 📲 .apk',
      '│ 🎧 .spotify',
      '│ 📘 .fb',
      '│ 📸 .ig',
      '│ 📂 .mediafire',
      '│ 🎵 .tiktok',
      '│',
      '╰━━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━〔 07 • MUSICA 〕━━╮',
      '│',
      '│ 🎵 .play',
      '│ 🔊 .play2',
      '│ 🎧 .mp3',
      '│ 🎬 .mp2',
      '│ 🎥 .ytmp4',
      '│',
      '╰━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━〔 08 • MULTIMEDIA 〕━━╮',
      '│',
      '│ 💬 .qc',
      '│ ✂️ .s',
      '│ 🖼️ .imagen',
      '│ 🌐 .google',
      '│',
      '╰━━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━〔 09 • JUEGOS 〕━━╮',
      '│',
      '│ 🎯 .trivia',
      '│ ❓ .adivinanza',
      '│ 🏴 .bandera',
      '│ 🏛️ .capital',
      '│ 🧠 .pensar',
      '│ 🔢 .numero',
      '│ 🐈 .miau',
      '│ 🏆 .top10',
      '│ 💃 .dance',
      '│ 🍝 .plato',
      '│ 🤡 .cornudo',
      '│ 💔 .infiel',
      '│ 💋 .kiss',
      '│ 🦊 .zorro',
      '│',
      '╰━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━〔 10 • ADMIN 〕━━╮',
      '│',
      '│ 🗑️ .del',
      '│ 👢 .k',
      '│ 🅿️ .p',
      '│ 🅳 .d',
      '│ 🔇 .mute',
      '│ 🔊 .unmute',
      '│ 🏷️ .tagall',
      '│ 📢 .tag',
      '│ ⚙️ .g',
      '│',
      '╰━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╭━━〔 11 • OWNER 〕━━╮',
      '│',
      '│ 🛡️ .autoadmin',
      '│ 🔗 .join',
      '│ 📜 .grouplist',
      '│ 🔄 .resetuser',
      '│ ✏️ .setprefix',
      '│ 🧹 .resetprefix',
      '│ 🔁 .restart',
      '│ 🪄 .resetlink',
      '│ ⚙️ .update',
      '│',
      '╰━━━━━━━━━━━━━━━━━━━━╯',
      '',
      '╔══════════════════════════════════╗',
      '║                                  ║',
      '║      🟢 FELIXCAT ONLINE          ║',
      '║                                  ║',
      '║       ⚡ ULTRA MODE ⚡            ║',
      '║                                  ║',
      '║       🐾 NEVER STOP 🐾           ║',
      '║                                  ║',
      '╚══════════════════════════════════╝'
    ].join('\n')

    await conn.reply(m.chat, menu, m)

    await conn.sendMessage(m.chat, {
      react: {
        text: '🐈',
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
