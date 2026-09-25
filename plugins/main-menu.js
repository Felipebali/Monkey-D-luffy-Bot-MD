```js
// 📂 plugins/menu.js
// 🐾 FELIXCAT ULTRA MENU — Diseño Premium

const botname = global.botname || '😸 FelixCat-Bot 😸'
const creador = 'Anónimo🐼'
const versionBot = '11.0 ULTRA'


let handler = async (m, { conn }) => {

  try {

    // ============================================================
    // 🕒 FECHA Y HORA
    // ============================================================

    const ahora = new Date()

    const fecha = ahora.toLocaleString('es-UY', {
      timeZone: 'America/Montevideo',
      hour12: false
    })


    // ============================================================
    // 🐾 SALUDO
    // ============================================================

    const saludo = getSaludoGatuno()


    // ============================================================
    // 📋 MENÚ
    // ============================================================

    const menu = `

╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🐾 𝐅𝐄𝐋𝐈𝐗𝐂𝐀𝐓 𝐔𝐋𝐓𝐑𝐀 🐾
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

        😸 *${botname}* 😸

╭──────────────────────────╮
│ 👑 Creador : ${creador}
│ ⚙️ Versión : ${versionBot}
│ 🕒 Fecha   : ${fecha}
│ 💬 ${saludo}
╰──────────────────────────╯


╭━━━〔 🌐 𝐆𝐄𝐍𝐄𝐑𝐀𝐋𝐄𝐒 〕━━━╮

  🔮 *.horoscopo*
  └─ Tu destino

  🌦️ *.clima*
  └─ Clima actual

  🕐 *.hora*
  └─ Hora exacta

  🌍 *.traducir*
  └─ Traducciones

  🚨 *.reportar*
  └─ Reportar un problema

  ✉️ *.sug*
  └─ Enviar sugerencia

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━━〔 📚 𝐌𝐄𝐍Ú𝐒 〕━━━╮

  🎮 *.menuj*
  └─ Menú de juegos

  👥 *.menugp*
  └─ Menú de grupo

  🔥 *.menuhot*
  └─ Contenido especial

  👑 *.mw*
  └─ Menú Owner

  🎌 *.menupj*
  └─ Personajes

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━━〔 👤 𝐏𝐄𝐑𝐅𝐈𝐋 〕━━━╮

  🪪 *.perfil*
  └─ Ver perfil

  🎂 *.setbr*
  └─ Cumpleaños

  📝 *.bio*
  └─ Biografía

  🚻 *.genero*
  └─ Género

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━━〔 🤝 𝐇𝐄𝐑𝐌𝐀𝐍𝐎𝐒 〕━━━╮

  🤝 *.hermano*
  └─ Solicitar hermandad

  ✅ *.aceptarhermano*
  └─ Aceptar solicitud

  ❌ *.rechazarhermano*
  └─ Rechazar solicitud

  💔 *.romperhermandad*
  └─ Terminar hermandad

  🤗 *.abrazohermano*
  └─ Dar un abrazo

  🛡️ *.proteger*
  └─ Proteger hermano

  ✋ *.chocarhermano*
  └─ Chocar manos

  🥊 *.entrenarhermano*
  └─ Entrenar juntos

  📊 *.relacionhermano*
  └─ Estado de hermandad

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━━〔 💕 𝐑𝐄𝐋𝐀𝐂𝐈𝐎𝐍𝐄𝐒 〕━━━╮

  💘 *.pareja*
  └─ Hacer propuesta

  👑 *.setpareja*
  └─ Crear pareja

  💬 *.aceptar*
  └─ Aceptar propuesta

  ❌ *.rechazar*
  └─ Rechazar propuesta

  💍 *.casarse*
  └─ Proponer matrimonio

  ✔️ *.si*
  └─ Aceptar matrimonio

  ❌ *.no*
  └─ Rechazar matrimonio

  💔 *.terminar*
  └─ Terminar relación

  💔 *.divorciar*
  └─ Divorciarse

  ❤️ *.relacion*
  └─ Ver estado

  💖 *.amor*
  └─ Nivel de amor

  💋 *.besar*
  └─ Dar un beso

  🤗 *.abrazar*
  └─ Dar un abrazo

  🌹 *.flores*
  └─ Regalar flores

  🎁 *.regalo*
  └─ Hacer un regalo

  🍷 *.cita*
  └─ Tener una cita

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━━〔 🛡️ 𝐒𝐄𝐆𝐔𝐑𝐈𝐃𝐀𝐃 〕━━━╮

  🔗 *.antilink*
  └─ Bloquear enlaces

  🚫 *.antilink2*
  └─ Modo estricto

  🤖 *.antibot*
  └─ Protección anti-bot

  ☣️ *.antitoxico*
  └─ Anti insultos

  👻 *.antifake*
  └─ Protección anti-fake

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━━〔 📥 𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒 〕━━━╮

  📲 *.apk*
  └─ Descargar aplicaciones

  🎧 *.spotify*
  └─ Descargar música

  📘 *.fb*
  └─ Facebook

  📸 *.ig*
  └─ Instagram

  📂 *.mediafire*
  └─ MediaFire

  🎵 *.tiktok*
  └─ Descargar TikTok

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━━〔 🎶 𝐌Ú𝐒𝐈𝐂𝐀 〕━━━╮

  🎵 *.play*
  └─ Buscar música

  🔊 *.play2*
  └─ Alternativa

  🎧 *.mp3*
  └─ Descargar audio

  🎬 *.mp2*
  └─ Descargar video

  🎬 *.ytmp4*
  └─ YouTube → MP4

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━━〔 🖼️ 𝐌𝐔𝐋𝐓𝐈𝐌𝐄𝐃𝐈𝐀 〕━━━╮

  💬 *.qc*
  └─ Crear sticker de texto

  ✂️ *.s*
  └─ Crear sticker

  🖼️ *.imagen*
  └─ Buscar imágenes

  🌐 *.google*
  └─ Buscar información

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━━〔 🎮 𝐉𝐔𝐄𝐆𝐎𝐒 〕━━━╮

  🎯 *.trivia*
  └─ Preguntas

  ❓ *.adivinanza*
  └─ Adivinar

  🏴 *.bandera*
  └─ Adivinar país

  🏛️ *.capital*
  └─ Capitales

  🧠 *.pensar*
  └─ Respuesta random

  🔢 *.numero*
  └─ Número aleatorio

  🐈 *.miau*
  └─ Diversión gatuna

  🏆 *.top10*
  └─ Ranking

  💃 *.dance*
  └─ Bailar

  🍝 *.plato*
  └─ Comida

  🤡 *.cornudo*
  └─ Test

  💔 *.infiel*
  └─ Test de infidelidad

  💋 *.kiss*
  └─ Beso

  🦊 *.zorro*
  └─ Nivel de zorro

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━━〔 🧰 𝐀𝐃𝐌𝐈𝐍𝐒 〕━━━╮

  🗑️ *.del*
  └─ Eliminar mensaje

  👢 *.k*
  └─ Expulsar usuario

  🅿️ *.p*
  └─ Promover admin

  🅳 *.d*
  └─ Degradar admin

  🔇 *.mute*
  └─ Silenciar

  🔊 *.unmute*
  └─ Quitar silencio

  🏷️ *.tagall*
  └─ Mencionar a todos

  📢 *.tag*
  └─ Mención manual

  ⚙️ *.g*
  └─ Configuración del grupo

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━━〔 👑 𝐎𝐖𝐍𝐄𝐑 ━━━╮

  🛡️ *.autoadmin*
  └─ Dar admin al bot

  🔗 *.join*
  └─ Entrar a un grupo

  📜 *.grouplist*
  └─ Lista de grupos

  🔄 *.resetuser*
  └─ Reiniciar usuario

  ✏️ *.setprefix*
  └─ Cambiar prefijo

  🧹 *.resetprefix*
  └─ Restaurar prefijo

  🔁 *.restart*
  └─ Reiniciar bot

  🪄 *.resetlink*
  └─ Generar nuevo enlace

  ⚙️ *.update*
  └─ Actualizar bot

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   🐾 ${botname} ACTIVO 24/7
┃
┃   😼 Sistema FelixCat ULTRA
┃   ⚡ Rápido • Estable • Seguro
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

        💠 _"Dominando grupos
        como un verdadero felino."_ 🐾

╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃       😸 𝐅𝐄𝐋𝐈𝐗𝐂𝐀𝐓 😸
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯
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
// 📌 CONFIGURACIÓN DEL COMANDO
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

  const hour =
    new Date().toLocaleString(
      'en-US',
      {
        timeZone: 'America/Montevideo',
        hour: 'numeric',
        hour12: false
      }
    )

  const hora =
    Number(hour)

  if (
    hora >= 5 &&
    hora < 12
  ) {

    return '🌅 Buenos días, felino'

  }

  if (
    hora >= 12 &&
    hora < 18
  ) {

    return '☀️ Buenas tardes, felino'

  }

  return '🌙 Buenas noches, felino'
}
```

También agregué **`.setpareja` al menú**, porque ahora forma parte del mismo sistema de relaciones que `.terminar` y los demás comandos.
