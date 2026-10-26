// 📂 plugins/antilocation.js
// ⚙️ WHATSAPP-BOT — AntiLocation
// Comando: .antilocation
// Detecta: Location

function getChatData(chatId) {
  global.db.data.chats = global.db.data.chats || {}
  global.db.data.chats[chatId] =
    global.db.data.chats[chatId] || {}

  return global.db.data.chats[chatId]
}

// ============================================================
// 🔎 DETECTAR LOCATION
// ============================================================

function containsLocation(message, depth = 0) {
  if (!message || typeof message !== 'object' || depth > 10) {
    return false
  }

  for (const [key, value] of Object.entries(message)) {
    const normalized = key.toLowerCase()

    if (
      normalized === 'locationmessage' ||
      normalized === 'liv elocationmessage'.replace(' ', '')
    ) {
      return true
    }

    if (value && typeof value === 'object') {
      if (containsLocation(value, depth + 1)) {
        return true
      }
    }
  }

  return false
}

function isLocationMessage(m) {
  const type = String(m.mtype || '').toLowerCase()

  return (
    type === 'location' ||
    type === 'liveLocation' .toLowerCase() ||
    type.includes('locationmessage') ||
    containsLocation(m.message) ||
    containsLocation(m.msg)
  )
}

// ============================================================
// ⚙️ ACTIVAR / DESACTIVAR
// ============================================================

const handler = async (m, { conn }) => {
  if (!m.isGroup) {
    return m.reply('⚠️ Este comando solo funciona en grupos.')
  }

  const chat = getChatData(m.chat)
  chat.antilocation = !chat.antilocation

  return conn.sendMessage(m.chat, {
    text: chat.antilocation
      ? '📍 *ANTILOCATION ACTIVADO* ✅\n\n🚫 Se intentarán eliminar las ubicaciones enviadas al grupo.\n🔔 Se mencionará al usuario.'
      : '📍 *ANTILOCATION DESACTIVADO* ❌\n\nLa función quedó desactivada.'
  })
}

handler.help = ['antilocation']
handler.tags = ['grupo']
handler.command = ['antilocation']
handler.group = true
handler.admin = true

// ============================================================
// 🗑️ DETECCIÓN Y ELIMINACIÓN
// ============================================================

handler.all = async function (m) {
  if (!m || !m.chat || !m.isGroup || m.fromMe) return

  const chat = global.db?.data?.chats?.[m.chat]
  if (!chat?.antilocation) return

  if (!isLocationMessage(m)) return

  const sender =
    m.sender ||
    m.key?.participant ||
    m.participant

  if (!sender) return

  let deleted = false
  const key = m.key

  if (key?.id && key?.remoteJid) {
    try {
      await this.sendMessage(m.chat, {
        delete: key
      })
      deleted = true
    } catch {
      deleted = false
    }
  }

  const text = deleted
    ? '📍 *ANTILOCATION*\n\n' +
      `👤 Usuario: @${sender.split('@')[0]}\n` +
      '🚫 No se permiten ubicaciones en este grupo.\n' +
      '🗑️ Se solicitó eliminar el mensaje.'
    : '📍 *ANTILOCATION*\n\n' +
      `👤 Usuario: @${sender.split('@')[0]}\n` +
      '🚫 Se detectó una ubicación.\n' +
      '⚠️ No se pudo confirmar la eliminación.'

  try {
    await this.sendMessage(m.chat, {
      text,
      mentions: [sender]
    })
  } catch {}
}

export default handler
