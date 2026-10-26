// 📂 plugins/antievento.js
// ⚙️ WHATSAPP-BOT — AntiEvento
// Comando: .antievento
// Detecta: Event

function getChatData(chatId) {
  global.db.data.chats = global.db.data.chats || {}
  global.db.data.chats[chatId] =
    global.db.data.chats[chatId] || {}

  return global.db.data.chats[chatId]
}

function containsEvent(message, depth = 0) {
  if (!message || typeof message !== 'object' || depth > 8) {
    return false
  }

  for (const [key, value] of Object.entries(message)) {
    if (key.toLowerCase() === 'event') {
      return true
    }

    if (value && typeof value === 'object') {
      if (containsEvent(value, depth + 1)) {
        return true
      }
    }
  }

  return false
}

function isEventMessage(m) {
  const type = String(m.mtype || '').toLowerCase()

  return (
    type === 'event' ||
    containsEvent(m.message) ||
    containsEvent(m.msg)
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
  chat.antievento = !chat.antievento

  return conn.sendMessage(m.chat, {
    text: chat.antievento
      ? '🎭 *ANTIEVENTO ACTIVADO* ✅\n\n🚫 Se intentarán eliminar los mensajes de tipo `Event`.\n🔔 Se mencionará al usuario detectado.'
      : '🎭 *ANTIEVENTO DESACTIVADO* ❌\n\nLa moderación de eventos quedó desactivada.'
  })
}

handler.help = ['antievento']
handler.tags = ['grupo']
handler.command = ['antievento']
handler.group = true
handler.admin = true

// ============================================================
// 🔍 DETECCIÓN Y ELIMINACIÓN
// ============================================================

handler.all = async function (m) {
  if (!m || !m.chat || !m.isGroup || m.fromMe) return

  const chat = global.db?.data?.chats?.[m.chat]
  if (!chat?.antievento) return

  if (!isEventMessage(m)) return

  const sender = m.sender || m.key?.participant || m.participant
  if (!sender) return

  let deleted = false

  if (m.key?.id && m.key?.remoteJid) {
    try {
      await this.sendMessage(m.chat, {
        delete: m.key
      })
      deleted = true
    } catch (error) {
      console.error('[ANTIEVENTO] Error al borrar:', error)
    }
  }

  const text = deleted
    ? '🚨 *ANTIEVENTO*\n\n' +
      `👤 Usuario: @${sender.split('@')[0]}\n` +
      '🚫 No se permiten estos eventos en el grupo.\n' +
      '🗑️ Se solicitó eliminar el mensaje.'
    : '🚨 *ANTIEVENTO*\n\n' +
      `👤 Usuario: @${sender.split('@')[0]}\n` +
      '🚫 Se detectó un evento no permitido.\n' +
      '⚠️ No se pudo confirmar su eliminación.'

  try {
    await this.sendMessage(m.chat, {
      text,
      mentions: [sender]
    })
  } catch (error) {
    console.error('[ANTIEVENTO] Error al enviar aviso:', error)
  }
}

export default handler
