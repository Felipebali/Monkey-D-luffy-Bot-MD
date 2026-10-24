
/**
 * 📂 plugins/grupos-juegos.js
 * 🎮 WHATSAPP-BOT — CONTROL DE MINI-JUEGOS
 *
 * Comando: .juegos
 * Permisos: Administradores y owners
 */

const handler = async (m, { conn, isAdmin, isOwner }) => {
  try {
    // 📂 Verificar y preparar la base de datos
    if (!global.db.data.chats) {
      global.db.data.chats = {}
    }

    if (!global.db.data.chats[m.chat]) {
      global.db.data.chats[m.chat] = {}
    }

    const chat = global.db.data.chats[m.chat]

    // 🔐 Verificar permisos
    if (!isAdmin && !isOwner) {
      return await conn.sendMessage(
        m.chat,
        {
          text:
            '╭━━━〔 🔒 *ACCESO DENEGADO* 〕━━━╮\n' +
            '┃\n' +
            '┃ ❌ No tienes permiso para usar\n' +
            '┃ este comando.\n' +
            '┃\n' +
            '┃ 👑 Solo los administradores\n' +
            '┃ y dueños pueden cambiar el estado\n' +
            '┃ de los mini-juegos.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━━━╯'
        },
        { quoted: m }
      )
    }

    // 🎮 Cambiar el estado de los juegos
    chat.games = !chat.games

    const mensaje = chat.games
      ? (
          '╭━━━〔 🎮 *ZONA DE JUEGOS* 〕━━━╮\n' +
          '┃\n' +
          '┃ 🟢 *¡MINI-JUEGOS ACTIVADOS!*\n' +
          '┃\n' +
          '┃ ✨ ¡Que comience la diversión!\n' +
          '┃ 🎯 Los mini-juegos vuelven a\n' +
          '┃ estar disponibles en este grupo.\n' +
          '┃\n' +
          '┃ 🎲 Reúne a tus amigos y juega.\n' +
          '┃ 🍀 ¡Mucha suerte a todos!\n' +
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
          '┃ quedan desactivados en este grupo.\n' +
          '┃\n' +
          '┃ 🔔 Un administrador puede\n' +
          '┃ volver a activarlos cuando quiera.\n' +
          '┃\n' +
          '╰━━━━━━━━━━━━━━━━━━━━━━╯'
        )

    await conn.sendMessage(
      m.chat,
      { text: mensaje },
      { quoted: m }
    )

  } catch (e) {
    console.error('[GRUPOS-JUEGOS] Error:', e)

    await conn.sendMessage(
      m.chat,
      {
        text:
          '╭━━━〔 ⚠️ *ERROR* 〕━━━╮\n' +
          '┃\n' +
          '┃ ❌ No se pudo cambiar el estado\n' +
          '┃ de los mini-juegos.\n' +
          '┃\n' +
          '┃ 🔄 Inténtalo nuevamente.\n' +
          '┃\n' +
          '╰━━━━━━━━━━━━━━━━━━╯'
      },
      { quoted: m }
    )
  }
}

handler.command = ['juegos']
handler.group = true
handler.admin = false
handler.rowner = false

export default handler
