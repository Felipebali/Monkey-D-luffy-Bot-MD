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

// ============================================================
// 🔎 DETECTAR EVENT
// ============================================================

function containsEvent(message, depth = 0) {
  if (!message || typeof message !== 'object' || depth > 10) {
    return false
  }

  for (const [key, value] of Object.entries(message)) {
    const normalized = key.toLowerCase()

    if (
      normalized === 'event' ||
      normalized === 'eventmessage' ||
      normalized === 'eventcreationmessage'
    ) {
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
    type.includes('eventmessage') ||
    type.includes('eventcreation') ||
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
      ? '🎭 *ANTIEVENTO ACTIVADO* ✅\n\n🚫 Se intentarán eliminar los mensajes Event.\n🔔 Se mencionará al usuario que los publique.'
      : '🎭 *ANTIEVENTO DESACTIVADO* ❌\n\nLa función quedó desactivada.'
  })
}

handler.help = ['antievento']
handler.tags = ['grupo']
handler.command = ['antievento']
handler.group = true
handler.admin = true

// ============================================================
// 🗑️ DETECCIÓN Y ELIMINACIÓN
// ============================================================

handler.all = async function (m) {
  if (!m || !m.chat || !m.isGroup || m.fromMe) return

  const chat = global.db?.data?.chats?.[m.chat]
  if (!chat?.antievento) return

  const eventDetected = isEventMessage(m)
  if (!eventDetected) return

  const sender =
    m.sender ||
    m.key?.participant ||
    m.participant

  if (!sender) return

  const key = m.key
  let deleted = false

  if (key?.id && key?.remoteJid) {
    try {
      await this.sendMessage(m.chat, {
        delete: key
      })

      deleted = true
    } catch (error) {
      deleted = false
    }
  }

  const text = deleted
    ? '🎭 *ANTIEVENTO*\n\n' +
      `👤 Usuario: @${sender.split('@')[0]}\n` +
      '🚫 No se permiten eventos de este tipo en el grupo.\n' +
      '🗑️ Se solicitó eliminar el mensaje.'
    : '🎭 *ANTIEVENTO*\n\n' +
      `👤 Usuario: @${sender.split('@')[0]}\n` +
      '🚫 Se detectó un mensaje Event.\n' +
      '⚠️ No se pudo confirmar la eliminación.'

  try {
    await this.sendMessage(m.chat, {
      text,
      mentions: [sender]
    })
  } catch (error) {
    // Evita mostrar errores en la consola.
  }
}

export default handler
