// 📂 plugins/juego-fiel.js
// 💚 TEST DE FIDELIDAD — FelixCat_Bot

let handler = async (m, { conn }) => {

  try {

    const chatData =
      global.db?.data?.chats?.[m.chat] || {}

    // ========================================================
    // ⚠️ VERIFICAR SI LOS JUEGOS ESTÁN ACTIVADOS
    // ========================================================

    if (!chatData.games) {

      return await conn.sendMessage(
        m.chat,
        {
          text:
            '❌ Los mini-juegos están desactivados en este chat. Usa *.juegos* para activarlos.'
        },
        {
          quoted: m
        }
      )
    }

    // ========================================================
    // 🎯 DETERMINAR OBJETIVO
    // MENCIONADO > CITADO > PROPIO USUARIO
    // ========================================================

    let who =
      m.quoted
        ? m.quoted.sender
        : (
            m.mentionedJid &&
            m.mentionedJid[0]
          ) || m.sender

    // ========================================================
    // 🔧 DECODIFICAR JID
    // ========================================================

    if (
      typeof conn.decodeJid === 'function'
    ) {
      who =
        conn.decodeJid(who)
    }

    // ========================================================
    // 📱 OBTENER NÚMERO
    // ========================================================

    const simpleId =
      String(who)
        .split('@')[0]
        .split(':')[0]

    // ========================================================
    // 💚 CALCULAR PORCENTAJE DE FIDELIDAD
    // ========================================================

    const porcentaje =
      Math.floor(
        Math.random() * 101
      )

    // ========================================================
    // 📊 BARRA VISUAL
    // ========================================================

    const totalBars = 10

    const filledBars =
      Math.round(
        porcentaje / 10
      )

    const bar =
      '💚'.repeat(filledBars) +
      '⬜'.repeat(
        totalBars - filledBars
      )

    // ========================================================
    // 💬 FRASES SEGÚN PORCENTAJE
    // ========================================================

    let frase

    if (porcentaje >= 95) {

      frase =
        '💚 Fidelidad legendaria. Tu corazón parece tener una sola dirección.'

    } else if (porcentaje >= 80) {

      frase =
        '😍 Muy fiel. Las tentaciones no parecen hacerte cambiar de rumbo.'

    } else if (porcentaje >= 65) {

      frase =
        '🥰 Bastante fiel. Sabés mantenerte firme ante las tentaciones.'

    } else if (porcentaje >= 50) {

      frase =
        '😌 Más fiel que infiel. Hay algunas tentaciones, pero todavía hay control.'

    } else if (porcentaje >= 35) {

      frase =
        '🤔 Fidelidad dudosa. Tu corazón podría necesitar un poco más de compromiso.'

    } else if (porcentaje >= 20) {

      frase =
        '😅 La fidelidad está complicada. Las tentaciones están ganando terreno.'

    } else if (porcentaje >= 5) {

      frase =
        '👀 Fidelidad en peligro. Cupido debería empezar a preocuparse.'

    } else {

      frase =
        '💔 Fidelidad: 0%. Cupido acaba de presentar su renuncia.'
    }

    // ========================================================
    // 💚 MENSAJE FINAL
    // ========================================================

    const msg = `
💚 *TEST DE FIDELIDAD 2.1* 💚

👤 *Usuario:* @${simpleId}
💚 *Nivel de fidelidad:* ${porcentaje}%

${bar}

💬 ${frase}
`.trim()

    // ========================================================
    // 📤 ENVIAR RESULTADO
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        text: msg,
        mentions: [who]
      },
      {
        quoted: m
      }
    )

  } catch (err) {

    console.error(
      '❌ Error en juego-fiel:',
      err
    )

    return conn.reply(
      m.chat,
      '❌ Error ejecutando el comando .fiel',
      m
    )
  }
}

// ============================================================
// 📌 CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.help = [
  'fiel'
]

handler.tags = [
  'fun',
  'juego'
]

handler.command = /^fiel$/i

handler.group = true

export default handler
