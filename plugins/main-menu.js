```js
// 📂 plugins/menu.js
// 🐾 FELIXCAT NEON MENU
// 🌈 Diseño moderno + separadores visuales

const botname = global.botname || 'FelixCat-Bot'
const creador = 'Anónimo🐼'
const versionBot = '11.0 ULTRA'


let handler = async (m, { conn }) => {

  try {

    // ============================================================
    // 🕒 FECHA Y HORA
    // ============================================================

    const fecha = new Date().toLocaleString('es-UY', {
      timeZone: 'America/Montevideo',
      hour12: false
    })

    const saludo = getSaludoGatuno()


    // ============================================================
    // 🌈 MENÚ NEON
    // ============================================================

    const menu = `

╭━━━〔 🐾 𝐅𝐄𝐋𝐈𝐗𝐂𝐀𝐓 〕━━━╮
┃
┃       💜 𝐍𝐄𝐎𝐍 𝐔𝐋𝐓𝐑𝐀 💜
┃
┃  😸 ${botname}
┃  ⚡ ${versionBot}
┃  👑 ${creador}
┃  🟢 ONLINE • 24/7
┃  🕒 ${fecha}
┃
┃  ${saludo}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯


🔮 ════════『 𝐆𝐄𝐍𝐄𝐑𝐀𝐋 』════════ 🔮

🟣 🔮 .horoscopo  › Destino
🔵 🌦️ .clima      › Clima
🟢 🕐 .hora       › Hora
🟡 🌍 .traducir   › Traducciones
🔴 🚨 .reportar   › Reportar
🟠 💌 .sug        › Sugerencias

╰─────────────── ✦ ───────────────╯


💜 ═══════『 𝐌𝐄𝐍Ú𝐒 』═══════ 💜

🟣 🎮 .menuj      › Juegos
🔵 👥 .menugp     › Grupos
🔴 🔥 .menuhot    › Especial
🟡 👑 .mw         › Owner
🟢 🎌 .menupj     › Personajes

╰─────────────── ✦ ───────────────╯


🩵 ═══════『 𝐏𝐄𝐑𝐅𝐈𝐋 』═══════ 🩵

🔵 🪪 .perfil     › Mi perfil
🟣 🎂 .setbr      › Cumpleaños
🟢 📝 .bio        › Biografía
🟡 🚻 .genero     › Género

╰─────────────── ✦ ───────────────╯


🤝 ═════『 𝐇𝐄𝐑𝐌𝐀𝐍𝐃𝐀𝐃 』═════ 🤝

🟢 🤝 .hermano
│   └─ Solicitar

🔵 ✅ .aceptarhermano
│   └─ Aceptar

🔴 ❌ .rechazarhermano
│   └─ Rechazar

🟣 💔 .romperhermandad
│   └─ Terminar

🩵 🤗 .abrazohermano
│   └─ Abrazo

🟡 🛡️ .proteger
│   └─ Protección

🟠 ✋ .chocarhermano
│   └─ Chocar

🔵 🥊 .entrenarhermano
│   └─ Entrenar

🟢 📊 .relacionhermano
│   └─ Estado

╰─────────────── ✦ ───────────────╯


💖 ═════『 𝐑𝐄𝐋𝐀𝐂𝐈𝐎𝐍𝐄𝐒 』═════ 💖

╭─ 💘 𝐏𝐑𝐎𝐏𝐔𝐄𝐒𝐓𝐀𝐒
│
│ 💘 .pareja
│ 👑 .setpareja
│ 💬 .aceptar
│ ❌ .rechazar
╰──────────────────

╭─ 💍 𝐌𝐀𝐓𝐑𝐈𝐌𝐎𝐍𝐈𝐎
│
│ 💍 .casarse
│ 💚 .si
│ ❤️ .no
│ 💔 .divorciar
╰──────────────────

╭─ ❤️ 𝐑𝐄𝐋𝐀𝐂𝐈Ó𝐍
│
│ ❤️ .relacion
│ 💖 .amor
│ 💔 .terminar
╰──────────────────

╭─ 💞 𝐈𝐍𝐓𝐄𝐑𝐀𝐂𝐂𝐈𝐎𝐍𝐄𝐒
│
│ 💋 .besar
│ 🤗 .abrazar
│ 🌹 .flores
│ 🎁 .regalo
│ 🍷 .cita
╰──────────────────

💗 ━━━━━━━━━━━━━━━━━━━━━━━ 💗


🛡️ ══════『 𝐒𝐄𝐆𝐔𝐑𝐈𝐃𝐀𝐃 』══════ 🛡️

🔵 🔗 .antilink
🟣 🚫 .antilink2
🔴 🤖 .antibot
🟠 ☣️ .antitoxico
🟢 👻 .antifake

╰─────────────── ✦ ───────────────╯


📥 ══════『 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐒 』══════ 📥

🔵 📲 .apk
🟢 🎧 .spotify
🔵 📘 .fb
🩷 📸 .ig
🟡 📂 .mediafire
🟣 🎵 .tiktok

╰─────────────── ✦ ───────────────╯


🎧 ═══════『 𝐌𝐔𝐒𝐈𝐂 』═══════ 🎧

🟣 🎵 .play
🔵 🔊 .play2
🟢 🎧 .mp3
🟠 🎬 .mp2
🔴 🎬 .ytmp4

╰─────────────── ✦ ───────────────╯


🖼️ ═════『 𝐌𝐔𝐋𝐓𝐈𝐌𝐄𝐃𝐈𝐀 』═════ 🖼️

💬 🟣 .qc
✂️ 🔵 .s
🖼️ 🟢 .imagen
🌐 🟡 .google

╰─────────────── ✦ ───────────────╯


🎮 ═══════『 𝐀𝐑𝐂𝐀𝐃𝐄 』═══════ 🎮

🟣 🎯 .trivia
🔵 ❓ .adivinanza
🟢 🏴 .bandera
🟡 🏛️ .capital
🟠 🧠 .pensar
🔴 🔢 .numero
🩵 🐈 .miau
💜 🏆 .top10
🩷 💃 .dance
🟢 🍝 .plato
🟠 🤡 .cornudo
🔴 💔 .infiel
🩷 💋 .kiss
🟣 🦊 .zorro

╰─────────────── ✦ ───────────────╯


⚙️ ═══════『 𝐀𝐃𝐌𝐈𝐍 』═══════ ⚙️

🗑️ 🔴 .del
👢 🟠 .k
🅿️ 🟢 .p
🅳 🔵 .d
🔇 🟣 .mute
🔊 🩵 .unmute
🏷️ 🟡 .tagall
📢 🟠 .tag
⚙️ 🔵 .g

╰─────────────── ✦ ───────────────╯


👑 ═══════『 𝐎𝐖𝐍𝐄𝐑 』═══════ 👑

🛡️ .autoadmin
🔗 .join
📜 .grouplist
🔄 .resetuser
✏️ .setprefix
🧹 .resetprefix
🔁 .restart
🪄 .resetlink
⚙️ .update

╰─────────────── ✦ ───────────────╯


╭━━━〔 🌈 𝐒𝐘𝐒𝐓𝐄𝐌 〕━━━╮
┃
┃ 🟢 Estado     : ONLINE
┃ 🟣 Modo       : ULTRA
┃ 🔵 Seguridad  : ACTIVA
┃ 🟡 Respuesta  : RÁPIDA
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯


       🐾 ══ 💜 ══ 🐾 ══ 💜 ══ 🐾

          😸 𝐅𝐄𝐋𝐈𝐗𝐂𝐀𝐓 𝐁𝐎𝐓 😸
             𝐔𝐋𝐓𝐑𝐀 𝐌𝐎𝐃𝐄

       ✦ 24/7 • FAST • SECURE ✦

      _"Un felino nunca duerme..."_ 🐾

       🐾 ══ 💙 ══ 🐾 ══ 💙 ══ 🐾
`


    // ============================================================
    // 📤 ENVIAR MENÚ
    // ============================================================

    await conn.reply(
      m.chat,
      menu.trim(),
      m
    )


    // ============================================================
    // 🐾 REACCIÓN
    // ============================================================

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: '🐾',
          key: m.key
        }
      }
    )


  } catch (err) {

    console.error(
      '❌ Error en menu.js:',
      err
    )

    await conn.reply(
      m.chat,
      `❌ Error al mostrar el menú\n\n${err}`,
      m
    )

  }
}


// ============================================================
// 📌 COMANDOS
// ============================================================

handler.help = [
  'menu',
  'menú',
  'help'
]

handler.tags = [
  'main'
]

handler.command = [
  'menu',
  'menú',
  'help'
]


export default handler


// ============================================================
// 🐾 SALUDO GATUNO
// ============================================================

function getSaludoGatuno() {

  const hora = Number(
    new Date().toLocaleString(
      'en-US',
      {
        timeZone: 'America/Montevideo',
        hour: 'numeric',
        hour12: false
      }
    )
  )

  if (hora >= 5 && hora < 12)
    return '🌅 Buenos días, felino'

  if (hora >= 12 && hora < 18)
    return '☀️ Buenas tardes, felino'

  return '🌙 Buenas noches, felino'
}
```

Acá el cambio visual fuerte está en que cada sección tiene su **propio color/identidad**:

**💜 relaciones · 🛡️ seguridad · 🎧 música · 🎮 juegos · ⚙️ admin · 👑 owner**, y los comandos tienen indicadores de color. En WhatsApp esto suele verse mucho más “neon” sin depender de HTML ni de formato que WhatsApp no soporte.
