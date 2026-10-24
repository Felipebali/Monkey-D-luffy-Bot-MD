
/**
 * 📂 plugins/juegos.js
 * 🎮 WHATSAPP-BOT — CONTROL DE MINI-JUEGOS
 */

const handler = async (m, { conn, isAdmin, isOwner }) => {
  try {
    const chat = global.db.data.chats[m.chat] ||= {}

    // 🔐 Permisos: administradores y owners
    if (!isAdmin && !isOwner) {
      return await conn.sendMessage(
        m.chat,
        {
          text:
            '╭━━━〔 🔒 *ACCESO DENEGADO* 〕━━━╮\n' +
            '┃\n' +
            '┃ ❌ Este comando es exclusivo\n' +
            '┃ para administradores y dueños.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━━━╯'
        },
        { quoted: m }
      )
    }

    // 🎮 Cambiar estado de los juegos
    chat.games = !chat.games

    const activados = chat.games

    const mensaje = activados
      ? (
          '╭━━━〔 🎮 *ZONA DE JUEGOS* 〕━━━╮\n' +
          '┃\n' +
          '┃ 🟢 *¡MINI-JUEGOS ACTIVADOS!*\n' +
          '┃\n' +
          '┃ ✨ La diversión ha comenzado.\n' +
          '┃ 🎯 Los juegos están disponibles\n' +
          '┃    nuevamente en este grupo.\n' +
          '┃\n' +
          '┃ 💬 ¡Que comience la partida!\n' +
          '┃\n' +
          '╰━━━━━━━━━━━━━━━━━━━━━━╯'
        )
      : (
          '╭━━━〔 🎮 *ZONA DE JUEGOS* 〕━━━╮\n' +
          '┃\n' +
          '┃ 🔴 *MINI-JUEGOS DESACTIVADOS*\n' +
          '┃\n' +
          '┃ 🌙 La diversión queda en pausa.\n' +
          '┃ 🚫 Los comandos de mini-juegos\n' +
          '┃    deben permanecer desactivados.\n' +
          '┃\n' +
          '┃ 🔔 Un admin puede reactivarlos\n' +
          '┃    cuando quiera.\n' +
          '┃\n' +
          '╰━━━━━━━━━━━━━━━━━━━━━━╯'
        )

    await conn.sendMessage(
      m.chat,
      { text: mensaje },
      { quoted: m }
    )

  } catch (e) {
    console.error('[JUEGOS] Error:', e)

    await m.reply(
      '╭━━━〔 ⚠️ *ERROR* 〕━━━╮\n' +
      '┃\n' +
      '┃ ❌ No se pudo cambiar el estado\n' +
      '┃ de los mini-juegos.\n' +
      '┃\n' +
      '┃ 🔄 Inténtalo nuevamente.\n' +
      '┃\n' +
      '╰━━━━━━━━━━━━━━━━━━╯'
    )
  }
}

handler.command = ['juegos']
handler.group = true
handler.admin = false
handler.rowner = false

export default handler
