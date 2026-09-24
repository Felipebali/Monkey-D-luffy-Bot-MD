// 📂 plugins/bot-reaccion.js
// 🤖 FelixCat_Bot — Reacción automática al mencionar "bot"

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

// ============================================================
// 🎲 EMOJI ALEATORIO
// ============================================================

const randomEmoji = () => {
  return emojis[
    Math.floor(
      Math.random() * emojis.length
    )
  ]
}

// ============================================================
// 🤖 HANDLER
// ============================================================

let handler = async (m, { conn }) => {

  try {

    // Solo grupos
    if (!m.isGroup)
      return

    // Evitar que el bot reaccione a sí mismo
    if (m.fromMe)
      return

    // Obtener texto del mensaje
    const text =
      String(
        m.text ||
        m.body ||
        ''
      ).trim()

    if (!text)
      return

    // ========================================================
    // 🔎 DETECTAR "BOT"
    // ========================================================

    // Detecta:
    // bot
    // Bot
    // BOT
    // "bot"
    // bot?
    // bot!
    // hola bot
    // bot responde
    //
    // Pero evita palabras como:
    // botella
    // robot
    // botánico

    const contieneBot =
      /(^|\s)bot(?=$|\s|[.,!?¿¡:;'"()])/i.test(text)

    if (!contieneBot)
      return

    // ========================================================
    // 🎲 ELEGIR EMOJI
    // ========================================================

    const emoji =
      randomEmoji()

    // ========================================================
    // ❤️ REACCIONAR
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: emoji,
          key: m.key
        }
      }
    )

  } catch (error) {

    console.error(
      '❌ Error en bot-reaccion.js:',
      error
    )
  }
}

// ============================================================
// 🚫 SIN PREFIJO
// ============================================================

// Esto permite que el plugin se ejecute
// sin escribir .bot

handler.customPrefix =
  /(^|\s)bot(?=$|\s|[.,!?¿¡:;'"()])/i

// ============================================================
// 📌 IMPORTANTE
// ============================================================

// No necesita comando con prefijo.
handler.command = []

handler.group = true

export default handler
