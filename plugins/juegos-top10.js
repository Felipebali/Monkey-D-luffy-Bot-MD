// 📂 plugins/top10.js — FelixCat-Bot 🐾
// 🏆 Generador de TOP 10 aleatorio

console.log('[Plugin] top10 cargado')

let handler = async (m, { conn, groupMetadata, command }) => {
  try {
    const chatId = m.chat

    // ============================================================
    // 🎮 COMPROBAR JUEGOS
    // ============================================================

    const chatData = global.db?.data?.chats?.[chatId] || {}

    if (chatData.games === false) {
      return conn.sendMessage(chatId, {
        text:
          '🎮 *Los juegos están desactivados en este grupo.*\n\n' +
          '💡 Usa *.juegos* para activarlos.'
      })
    }

    if (!m.isGroup) {
      return conn.sendMessage(chatId, {
        text: '❌ Este comando solo funciona en grupos.'
      })
    }

    // ============================================================
    // 📝 OBTENER TEXTO
    // ============================================================

    let text = m.text?.trim()

    if (!text) {
      return conn.sendMessage(chatId, {
        text:
          '📝 *Debes indicar qué TOP quieres hacer.*\n\n' +
          '📌 Ejemplos:\n' +
          '`.top10 más divertido`\n' +
          '`.top10 más activo`\n' +
          '`.top10 más probable que llegue tarde`'
      })
    }

    // Quitar el comando
    const partes = text.split(/\s+/)
    partes.shift()
    text = partes.join(' ').trim()

    if (!text) {
      return conn.sendMessage(chatId, {
        text: '❌ Escribe algo después de `.top10`.'
      })
    }

    // ============================================================
    // 👥 OBTENER PARTICIPANTES
    // ============================================================

    let participants = groupMetadata?.participants || []

    participants = participants
      .filter(p => p?.id)
      .filter(p => !p.id.includes('status@broadcast'))

    if (!participants.length) {
      return conn.sendMessage(chatId, {
        text: '❌ No se pudieron obtener los participantes del grupo.'
      })
    }

    // ============================================================
    // 🎲 MEZCLAR PARTICIPANTES
    // ============================================================

    participants = [...participants]

    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))

      ;[participants[i], participants[j]] =
        [participants[j], participants[i]]
    }

    const topCount = Math.min(10, participants.length)
    const top10 = participants.slice(0, topCount)

    // ============================================================
    // 🏅 EMOJIS POR POSICIÓN
    // ============================================================

    const posiciones = [
      '🥇',
      '🥈',
      '🥉',
      '🏅',
      '🎖️',
      '⭐',
      '✨',
      '💫',
      '🔥',
      '💎'
    ]

    // ============================================================
    // 👤 MENCIONES
    // ============================================================

    const mentions = top10.map(p => {
      return conn.decodeJid
        ? conn.decodeJid(p.id)
        : p.id
    })

    // ============================================================
    // 📋 CREAR LISTA
    // ============================================================

    const lista = top10.map((p, i) => {
      const jid = conn.decodeJid
        ? conn.decodeJid(p.id)
        : p.id

      const numero = String(jid).split('@')[0]

      return `${posiciones[i]} *${i + 1}.* @${numero}`
    }).join('\n')

    // ============================================================
    // 🎨 TÍTULO
    // ============================================================

    const titulo =
      text.charAt(0).toUpperCase() +
      text.slice(1)

    // ============================================================
    // 🏆 MENSAJE FINAL
    // ============================================================

    const finalText = `
╭━━━〔 🏆 *TOP ${topCount}* 〕━━━╮
┃
┃ 🎯 *Categoría:*
┃ ${titulo}
┃
┣━━━━━━━━━━━━━━━━━━
┃
${lista.split('\n').map(line => `┃ ${line}`).join('\n')}
┃
╰━━━━━━━━━━━━━━━━━━╯

🎲 *Ranking generado al azar*
🐾 *Whatsapp-Bot*
`.trim()

    // ============================================================
    // 📤 ENVIAR
    // ============================================================

    await conn.sendMessage(chatId, {
      text: finalText,
      mentions
    })

  } catch (e) {
    console.error('❌ Error en top10:', e)

    await conn.sendMessage(m.chat, {
      text: '❌ Ocurrió un error al generar el TOP 10.'
    })
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  'top10 <texto>'
]

handler.tags = [
  'fun',
  'juego'
]

handler.command = [
  'top10'
]

handler.group = true

export default handler
