// 📂 plugins/bot-reaccion.js
// 🤖 Reacciona automáticamente cuando alguien escribe "bot"

const emojis = [
  '🤖', '🐾', '😎', '😂', '🤣',
  '❤️', '💀', '👀', '🔥', '😏',
  '🙄', '😹', '🥰', '😈', '🤨',
  '💯', '✨', '🫡', '😭', '💅'
]

function randomEmoji() {
  return emojis[Math.floor(Math.random() * emojis.length)]
}

let handler = async (m, { conn }) => {
  try {
    // Solo grupos
    if (!m.isGroup) return

    // No reaccionar a mensajes enviados por el propio bot
    if (m.fromMe) return

    // Obtener texto del mensaje
    const texto = String(
      m.text ||
      m.body ||
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      ''
    ).trim()

    if (!texto) return

    // Detectar "bot" como palabra independiente
    const contieneBot = /(^|\s)bot(?=$|\s|[.,!?¿¡:;'"()[\]{}])/i.test(texto)

    if (!contieneBot) return

    // Emoji aleatorio
    const emoji = randomEmoji()

    // Reaccionar al mensaje
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
    console.error('❌ Error en bot-reaccion.js:', error)
  }
}

// Importante para que el loader lo procese
handler.all = true
handler.group = true

export default handler
