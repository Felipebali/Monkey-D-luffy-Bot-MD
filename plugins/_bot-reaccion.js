// plugins/bot-reaccion.js
// 🤖 Activador: palabra "bot" (sin prefijo)
// Reacciona y responde citando el mensaje que contiene "bot"

let handler = async (m, { conn }) => {
  try {

    // ============================================================
    // 👥 SOLO GRUPOS
    // ============================================================

    if (!m.isGroup) return


    // ============================================================
    // 📝 OBTENER TEXTO DEL MENSAJE
    // ============================================================

    const texto =
      String(m.text || '').trim()

    if (!texto) return


    // ============================================================
    // 🔎 DETECTAR "BOT" COMO PALABRA INDEPENDIENTE
    // ============================================================

    const contieneBot =
      /(^|\s)bot(?=$|\s|[.,!?¿¡:;'"()[\]{}])/i.test(texto)

    if (!contieneBot) return


    // ============================================================
    // 🤖 EMOJIS PARA LA REACCIÓN
    // ============================================================

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

    const emoji =
      emojis[
        Math.floor(
          Math.random() * emojis.length
        )
      ]


    // ============================================================
    // 🤖 REACCIONAR AL MENSAJE
    // ============================================================

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: emoji,
          key: m.key
        }
      }
    )


    // ============================================================
    // 💬 RESPUESTAS ALEATORIAS
    // ============================================================

    const respuestas = [
      '🤖 ¿Sí? ¿Qué pasó?',
      '🤖 Acá estoy 👀',
      '🤖 ¿Me llamaron? 😎',
      '🤖 Presente 🫡',
      '🤖 ¿Qué necesitás? 👀',
      '🤖 Te escucho 😏',
      '🤖 ¿Qué pasa? 😂',
      '🤖 A sus órdenes 🫡',
      '🤖 Dígame 👀',
      '🤖 ¿Quién me invocó? 😂',
      '🤖 Estoy acá 🐾',
      '🤖 ¿Qué se le ofrece? 😎',
      '🤖 ¿Me estabas llamando? 👀',
      '🤖 Presente, jefe 🫡',
      '🤖 ¿Qué onda? 😏'
    ]


    // ============================================================
    // 🎲 RESPUESTA ALEATORIA
    // ============================================================

    const respuesta =
      respuestas[
        Math.floor(
          Math.random() * respuestas.length
        )
      ]


    // ============================================================
    // 💬 RESPONDER CITANDO EL MENSAJE
    // ============================================================

    await conn.sendMessage(
      m.chat,
      {
        text: respuesta
      },
      {
        quoted: m
      }
    )


  } catch (e) {

    console.error(
      '❌ Error en bot-reaccion:',
      e
    )

  }
}


// ============================================================
// 🔎 DETECTAR "BOT" SIN PREFIJO
// ============================================================

handler.customPrefix =
  /(^|\s)bot(?=$|\s|[.,!?¿¡:;'"()[\]{}])/i


// ============================================================
// 🚫 NO NECESITA COMANDO CON PREFIX
// ============================================================

handler.command =
  new RegExp()


// ============================================================
// 👥 SOLO GRUPOS
// ============================================================

handler.group = true


export default handler
