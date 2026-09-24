// plugins/bot-reaccion.js
// 🤖 Activador: palabra "bot" (sin prefijo)
// Reacciona con un emoji aleatorio al mensaje que contiene "bot"

let handler = async (m, { conn }) => {
  try {

    // 👥 SOLO GRUPOS
    if (!m.isGroup) return

    // 📝 Obtener texto del mensaje
    const texto = String(m.text || '').trim()

    if (!texto) return

    // 🔎 Detectar "bot" como palabra independiente
    // Funciona con:
    // bot
    // BOT
    // Bot
    // hola bot
    // che bot 😂
    // bot, ayudame
    const contieneBot =
      /(^|\s)bot(?=$|\s|[.,!?¿¡:;'"()[\]{}])/i.test(texto)

    if (!contieneBot) return

    // 🤖 Emojis disponibles
    const emojis = [
      '🤖',
      '🐾',
      '😎',
      '😂',
      '🤣',
      '❤️',
      '💀',
      '👀',
      '🔥',
      '😏',
      '🙄',
      '😹',
      '🥰',
      '😈',
      '🤨',
      '💯',
      '✨',
      '🫡',
      '😭',
      '💅'
    ]

    // 🎲 Emoji aleatorio
    const emoji =
      emojis[Math.floor(Math.random() * emojis.length)]

    // 🤖 Reaccionar al mensaje
    await conn.sendMessage(m.chat, {
      react: {
        text: emoji,
        key: m.key
      }
    })

  } catch (e) {
    console.error('❌ Error en bot-reaccion:', e)
  }
}

// ============================================================
// 🔎 DETECTAR "bot" SIN PREFIJO
// ============================================================

handler.customPrefix =
  /(^|\s)bot(?=$|\s|[.,!?¿¡:;'"()[\]{}])/i

// No necesita comando con .
handler.command = new RegExp()

// Solo grupos
handler.group = true

export default handler
