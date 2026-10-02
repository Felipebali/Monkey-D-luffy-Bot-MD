// 📂 plugins/ba.js
// 🔓 UNBAN CHAT — Solo ROOT OWNER
// Desbanea al bot del chat actual.
//
// Comando:
// .ba

let handler = async (m, { conn }) => {
  try {

    if (!global.db?.data?.chats) {
      return conn.reply(
        m.chat,
        '❌ *La base de datos de chats no está disponible.*',
        m
      )
    }

    if (!global.db.data.chats[m.chat]) {
      return conn.reply(
        m.chat,
        '🔥 *Este chat todavía no está registrado en la base de datos.*',
        m
      )
    }

    const chat = global.db.data.chats[m.chat]

    if (chat.isBanned !== true) {
      return conn.reply(
        m.chat,
`🟢 *CHAT ACTIVO*

━━━━━━━━━━━━━━━━━━━━

🤖 *WhatsApp-Bot* ya está
habilitado en este chat.

⚡ No es necesario ejecutar
el comando nuevamente.

━━━━━━━━━━━━━━━━━━━━`,
        m
      )
    }

    chat.isBanned = false
    chat.unbannedAt = new Date().toISOString()
    chat.unbannedBy = m.sender

    await conn.reply(
      m.chat,
`🟢 *CHAT DESBANEADO*

━━━━━━━━━━━━━━━━━━━━

🤖 *WhatsApp-Bot*

🔓 Estado:
*ACTIVO*

⚡ El bot vuelve a responder
normalmente en este chat.

━━━━━━━━━━━━━━━━━━━━
✨ *WhatsApp-Bot Online*`,
      m
    )

  } catch (error) {

    console.error('❌ Error en ba:', error)

    return conn.reply(
      m.chat,
      '❌ *Ocurrió un error al desbanear este chat.*',
      m
    )
  }
}

handler.help = ['ba']
handler.tags = ['owner']
handler.command = ['ba']
handler.owner = true
handler.group = true

export default handler
