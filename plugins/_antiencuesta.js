// 📂 plugins/antiencuesta.js
// 🚫 AntiEncuesta — Detecta encuestas de WhatsApp
// Comando: .antiencuesta
// Detecta: PollCreationMessageV3
// Baileys ES Modules

function getChatData(m) {
  global.db.data.chats = global.db.data.chats || {}
  global.db.data.chats[m.chat] = global.db.data.chats[m.chat] || {}
  return global.db.data.chats[m.chat]
}

function getSender(m) {
  return m.sender || m.key?.participant || m.participant || ''
}

function containsPollMessage(message, depth = 0) {
  if (!message || typeof message !== 'object' || depth > 8) {
    return false
  }

  for (const [key, value] of Object.entries(message)) {
    const normalizedKey = key.toLowerCase()

    if (
      normalizedKey === 'pollcreationmessagev3' ||
      normalizedKey === 'pollcreationmessage' ||
      normalizedKey === 'pollcreation'
    ) {
      return true
    }

    if (
      value &&
      typeof value === 'object' &&
      containsPollMessage(value, depth + 1)
    ) {
      return true
    }
  }

  return false
}

function isPollMessage(m) {
  const type = String(m.mtype || '').toLowerCase()

  return (
    type === 'pollcreationmessagev3' ||
    type === 'pollcreationmessage' ||
    type.includes('pollcreation') ||
    containsPollMessage(m.message) ||
    containsPollMessage(m.msg)
  )
}

// ============================================================
// ⚙️ COMANDO: ACTIVAR / DESACTIVAR
// ============================================================

let handler = async (m, { conn }) => {
  if (!m.isGroup) {
    return m.reply('⚠️ Este comando solo funciona en grupos.')
  }

  const chat = getChatData(m)
  chat.antiencuesta = !chat.antiencuesta

  if (chat.antiencuesta) {
    return conn.sendMessage(m.chat, {
      text:
        '📊 *ANTIENCUESTA ACTIVADO* ✅\n\n' +
        '🚫 Las encuestas serán detectadas.\n' +
        '🗑️ El bot intentará eliminar las encuestas enviadas al grupo.\n' +
        '🔔 Se avisará mencionando al usuario que las publique.'
    })
  }

  return conn.sendMessage(m.chat, {
    text:
      '📊 *ANTIENCUESTA DESACTIVADO* ❌\n\n' +
      'Las encuestas ya no serán moderadas por esta función.'
  })
}

handler.help = ['antiencuesta']
handler.tags = ['grupo']
handler.command = ['antiencuesta']
handler.group = true

// ============================================================
// 🔍 DETECCIÓN Y MODERACIÓN
// ============================================================

handler.all = async function (m) {
  if (!m || !m.chat || !m.isGroup) return
  if (m.fromMe) return

  const chat = global.db?.data?.chats?.[m.chat]
  if (!chat?.antiencuesta) return

  if (!isPollMessage(m)) return

  const sender = getSender(m)
  if (!sender) return

  let deleted = false

  if (m.key?.id && m.key?.remoteJid) {
    try {
      await this.sendMessage(m.chat, {
        delete: m.key
      })
      deleted = true
    } catch (error) {
      console.error(
        '[ANTIENCUESTA] Error al intentar borrar la encuesta:',
        error
      )
    }
  }

  const text = deleted
    ? '🚨 *ANTIENCUESTA*\n\n' +
      `👤 Usuario: @${sender.split('@')[0]}\n` +
      '🚫 No se permiten encuestas en este grupo.\n' +
      '🗑️ Se solicitó la eliminación de la encuesta.'
    : '🚨 *ANTIENCUESTA*\n\n' +
      `👤 Usuario: @${sender.split('@')[0]}\n` +
      '🚫 No se permiten encuestas en este grupo.\n' +
      '⚠️ No se pudo confirmar la eliminación de la encuesta.'

  try {
    await this.sendMessage(m.chat, {
      text,
      mentions: [sender]
    })
  } catch (error) {
    console.error(
      '[ANTIENCUESTA] Error al enviar el aviso:',
      error
    )
  }
}

export default handler
