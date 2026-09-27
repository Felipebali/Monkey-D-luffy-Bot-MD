```js
const botname = global.botname || 'WhatsApp-Bot'
const creador = 'Anónimo🐼'
const versionBot = '11.0 ULTRA'

let handler = async (m, { conn }) => {
  try {

    const menu = `
🐈 *${botname}*
━━━━━━━━━━━━━━━━━━━━

👤 Creador: ${creador}
⚡ Versión: ${versionBot}
🟢 Estado: Online

━━━━━━━━━━━━━━━━━━━━
🌐 *GENERAL*
━━━━━━━━━━━━━━━━━━━━

🔮 .horoscopo
🌦️ .clima
🕐 .hora
🌍 .traducir
🚨 .reportar
💌 .sug

━━━━━━━━━━━━━━━━━━━━
👤 *PERFIL*
━━━━━━━━━━━━━━━━━━━━

🪪 .perfil
🎂 .setbr
📝 .bio
🚻 .genero

━━━━━━━━━━━━━━━━━━━━
🤝 *HERMANOS*
━━━━━━━━━━━━━━━━━━━━

🤝 .hermano
✅ .aceptarhermano
❌ .rechazarhermano
💔 .romperhermandad
🤗 .abrazohermano
🛡️ .proteger
✋ .chocarhermano
🥊 .entrenarhermano
📊 .relacionhermano

━━━━━━━━━━━━━━━━━━━━
💕 *RELACIONES*
━━━━━━━━━━━━━━━━━━━━

💘 .pareja
👑 .setpareja
💬 .aceptar
❌ .rechazar

💍 .casarse
✔️ .si
❌ .no

💔 .terminar
💔 .divorciar
❤️ .relacion
💖 .amor
💋 .besar
🤗 .abrazar
🌹 .flores
🎁 .regalo
🍷 .cita

━━━━━━━━━━━━━━━━━━━━
🛡️ *SEGURIDAD*
━━━━━━━━━━━━━━━━━━━━

🔗 .antilink
🚫 .antilink2
🤖 .antibot
☣️ .antitoxico
👻 .antifake

━━━━━━━━━━━━━━━━━━━━
📥 *DESCARGAS*
━━━━━━━━━━━━━━━━━━━━

📲 .apk
🎧 .spotify
📘 .fb
📸 .ig
📂 .mediafire
🎵 .tiktok

━━━━━━━━━━━━━━━━━━━━
🎧 *MÚSICA*
━━━━━━━━━━━━━━━━━━━━

🎵 .play
🔊 .play2
🎧 .mp3
🎬 .mp2
🎥 .ytmp4

━━━━━━━━━━━━━━━━━━━━
🖼️ *MULTIMEDIA*
━━━━━━━━━━━━━━━━━━━━

💬 .qc
✂️ .s
🖼️ .imagen
🌐 .google

━━━━━━━━━━━━━━━━━━━━
🎮 *JUEGOS*
━━━━━━━━━━━━━━━━━━━━

🎯 .trivia
❓ .adivinanza
🏴 .bandera
🏛️ .capital
🧠 .pensar
🔢 .numero
🐈 .miau
🏆 .top10
💃 .dance
🍝 .plato
🤡 .cornudo
💔 .infiel
💋 .kiss
🦊 .zorro

━━━━━━━━━━━━━━━━━━━━
🧰 *ADMIN*
━━━━━━━━━━━━━━━━━━━━

🗑️ .del
👢 .k
🅿️ .p
🅳 .d
🔇 .mute
🔊 .unmute
🏷️ .tagall
📢 .tag
⚙️ .g

━━━━━━━━━━━━━━━━━━━━
👑 *OWNER*
━━━━━━━━━━━━━━━━━━━━

🛡️ .autoadmin
🔗 .join
📜 .grouplist
🔄 .resetuser
✏️ .setprefix
🧹 .resetprefix
🔁 .restart
🪄 .resetlink
⚙️ .update

━━━━━━━━━━━━━━━━━━━━

🐾 *${botname} ONLINE*
⚡ *ULTRA MODE*
🟢 24/7

━━━━━━━━━━━━━━━━━━━━
`

    await conn.reply(m.chat, menu.trim(), m)

    await conn.sendMessage(m.chat, {
      react: {
        text: '🐾',
        key: m.key
      }
    })

  } catch (err) {
    console.error('Error en main-menu.js:', err)
    await conn.reply(m.chat, '❌ Error al mostrar el menú', m)
  }
}

handler.help = ['menu', 'menú', 'help']
handler.tags = ['main']
handler.command = ['menu', 'menú', 'help']

export default handler
```
