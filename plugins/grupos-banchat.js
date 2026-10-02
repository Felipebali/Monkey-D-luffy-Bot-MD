// 📂 plugins/bc.js
// 🚫 BAN CHAT — Solo ROOT OWNER
// Banea al bot en el chat actual.
//
// Comando:
// .bc

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

    if (chat.isBanned === true) {
      return conn.reply(
        m.chat,
`⚠️ *CHAT YA BANEADO*

━━━━━━━━━━━━━━━━━━━━

🤖 *WhatsApp-Bot* ya está
desactivado en este chat.

💡 No es necesario ejecutar
el comando nuevamente.

━━━━━━━━━━━━━━━━━━━━`,
        m
      )
    }

    chat.isBanned = true
    chat.bannedAt = new Date().toISOString()
    chat.bannedBy = m.sender

    await conn.reply(
      m.chat,
`🚫 *CHAT BANEADO*

━━━━━━━━━━━━━━━━━━━━

🤖 *WhatsApp-Bot*

🔒 Estado:
*BANEADO*

📛 El bot dejará de responder
a los comandos de este chat.

🛡️ Solo un ROOT OWNER puede
revertir este estado.

━━━━━━━━━━━━━━━━━━━━
⚡ *WhatsApp-Bot Security*`,
      m
    )

  } catch (error) {

    console.error('❌ Error en bc:', error)

    return conn.reply(
      m.chat,
      '❌ *Ocurrió un error al banear este chat.*',
      m
    )
  }
}

handler.help = ['bc']
handler.tags = ['owner']
handler.command = ['bc']
handler.owner = true
handler.group = true

export default handler
