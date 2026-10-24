
/**
 * 📂 plugins/grupos-juegos.js
 * 🎮 WHATSAPP-BOT — CONTROL DE MINI-JUEGOS
 *
 * Comando: .juegos
 * Permisos: Administradores y owners
 */

const handler = async (m, { conn, isAdmin, isOwner }) => {
  try {
    if (!global.db.data.chats) {
      global.db.data.chats = {}
    }

    if (!global.db.data.chats[m.chat]) {
      global.db.data.chats[m.chat] = {}
    }

    const chat = global.db.data.chats[m.chat]

    // 🔐 Verificar permisos
    if (!isAdmin && !isOwner) {
      return await conn.sendMessage(m.chat, {
        text:
          '╭━━━〔 🔒 *ACCESO DENEGADO* 〕━━━╮\n' +
          '┃\n' +
          '┃ ❌ No tienes permiso para usar\n' +
          '┃ este comando.\n' +
          '┃\n' +
          '┃ 👑 Solo administradores y dueños\n' +
          '┃ pueden cambiar el estado de los juegos.\n' +
          '┃\n' +
          '╰━━━━━━━━━━━━━━━━━━━━━━╯'
      })
    }

    // 🎮 Alternar estado
    chat.games = !chat.games

    const mensaje = chat.games
      ? (
          '╭━━━〔 🎮 *ZONA DE JUEGOS* 〕━━━╮\n' +
          '┃\n' +
          '┃ 🟢 *¡MINI-JUEGOS ACTIVADOS!*\n' +
          '┃\n' +
          '┃ ✨ ¡Que comience la diversión!\n' +
          '┃ 🎯 Los juegos están disponibles\n' +
          '┃ nuevamente en este grupo.\n' +
          '┃\n' +
          '┃ 🎲 ¡A jugar y mucha suerte!\n' +
          '┃\n' +
          '╰━━━━━━━━━━━━━━━━━━━━━━╯'
        )
      : (
          '╭━━━〔 🎮 *ZONA DE JUEGOS* 〕━━━╮\n' +
          '┃\n' +
          '┃ 🔴 *MINI-JUEGOS DESACTIVADOS*\n' +
          '┃\n' +
          '┃ 🌙 La diversión queda en pausa.\n' +
          '┃ 🚫 Los juegos están desactivados\n' +
          '┃ en este grupo.\n' +
          '┃\n' +
          '┃ 🔔 Un administrador puede\n' +
          '┃ volver a activarlos.\n' +
          '┃\n' +
          '╰━━━━━━━━━━━━━━━━━━━━━━╯'
        )

    // 📩 Enviar sin citar el mensaje del comando
    await conn.sendMessage(m.chat, { text: mensaje })

  } catch (e) {
    console.error('[GRUPOS-JUEGOS] Error:', e)

    await conn.sendMessage(m.chat, {
      text:
        '╭━━━〔 ⚠️ *ERROR* 〕━━━╮\n' +
        '┃\n' +
        '┃ ❌ No se pudo cambiar el estado\n' +
        '┃ de los mini-juegos.\n' +
        '┃\n' +
        '┃ 🔄 Inténtalo nuevamente.\n' +
        '┃\n' +
        '╰━━━━━━━━━━━━━━━━━━╯'
    })
  }
}

handler.command = ['juegos']
handler.group = true
handler.admin = false
handler.rowner = false

export default handler
