// 📂 plugins/gay.js
// 🏳️‍🌈 TEST GAY — FELI 2026 PRO
// Compatible con loaders Baileys / Unify / FelixCat

console.log('[Plugin] gay cargado')

let handler = async (m, { conn, command }) => {
  try {

    // ============================================================
    // 🔒 COMPROBAR CONFIGURACIÓN DE JUEGOS
    // ============================================================

    // Si existe la base de datos y la configuración del chat,
    // respetamos games.
    //
    // Si no existe todavía, NO rompemos el comando.
    let gamesEnabled = true

    try {
      if (
        global.db &&
        global.db.data &&
        global.db.data.chats &&
        global.db.data.chats[m.chat]
      ) {
        const chatData = global.db.data.chats[m.chat]

        // Solo bloquear si games está explícitamente en false
        if (chatData.games === false) {
          gamesEnabled = false
        }
      }
    } catch (e) {
      console.log('[gay] No se pudo comprobar games:', e.message)
    }

    if (!gamesEnabled) {
      return m.reply(
        '🎮 Los juegos están desactivados en este grupo.'
      )
    }

    // ============================================================
    // 🎯 DETECTAR OBJETIVO
    // ============================================================

    let who = null

    // Si responde a alguien
    if (m.quoted && m.quoted.sender) {
      who = m.quoted.sender
    }

    // Si menciona a alguien
    else if (
      m.mentionedJid &&
      Array.isArray(m.mentionedJid) &&
      m.mentionedJid.length
    ) {
      who = m.mentionedJid[0]
    }

    // Si no menciona ni responde, se hace el test al propio usuario
    else {
      who = m.sender
    }

    // ============================================================
    // 🔧 NORMALIZAR JID
    // ============================================================

    if (conn.decodeJid) {
      who = conn.decodeJid(who)
    }

    const simpleId = who.split('@')[0]

    // ============================================================
    // 🎰 PORCENTAJE RANDOM
    // ============================================================

    const porcentaje = Math.floor(Math.random() * 101)

    // ============================================================
    // 🏳️‍🌈 BARRA VISUAL
    // ============================================================

    const totalBars = 10
    const filledBars = Math.round(porcentaje / 10)

    const bar =
      '🏳️‍🌈'.repeat(filledBars) +
      '⬜'.repeat(totalBars - filledBars)

    // ============================================================
    // 💬 FRASE SEGÚN PORCENTAJE
    // ============================================================

    let frase

    if (porcentaje >= 95) {
      frase = '🏳️‍🌈 Nivel divino: sos el arcoíris encarnado.'
    }

    else if (porcentaje >= 80) {
      frase = '💅 Fabulos@ total: brillás más que RuPaul.'
    }

    else if (porcentaje >= 65) {
      frase = '🦄 Brillas con orgullo y estilo.'
    }

    else if (porcentaje >= 50) {
      frase = '😉 Un 50/50, pero el radar marca fuerte.'
    }

    else if (porcentaje >= 35) {
      frase = '🤭 Un poco de color, pero disimulás.'
    }

    else if (porcentaje >= 20) {
      frase = '😇 Bastante tranqui, aunque algo sospechoso.'
    }

    else if (porcentaje >= 5) {
      frase = '😎 Hetero con un toque de glitter.'
    }

    else {
      frase = '🗿 Puro, sin rastros de arcoíris.'
    }

    // ============================================================
    // 🔥 TÍTULO
    // ============================================================

    const titulo = '🏳️‍🌈 *TEST GAY 2.1* 🏳️‍🌈'

    // ============================================================
    // 📩 MENSAJE
    // ============================================================

    const msg = `
${titulo}

👤 Usuario: @${simpleId}
📊 Nivel de gay: *${porcentaje}%*

${bar}

💬 ${frase}
`.trim()

    // ============================================================
    // 📤 ENVIAR
    // ============================================================

    return await conn.sendMessage(
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

    console.error('[gay.js] ERROR:', err)

    try {
      return await conn.reply(
        m.chat,
        `❌ Error ejecutando .gay\n\n${err.message}`,
        m
      )
    } catch {
      return
    }
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.help = ['gay']
handler.tags = ['fun', 'juego']
handler.command = ['gay']

handler.group = true

// Compatible con loaders que requieren register
handler.register = true

export default handler
