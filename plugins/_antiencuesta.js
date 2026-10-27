
/**
 * 📂 plugins/antiencuesta.js
 * 🚫 AntiEncuesta — Detecta y modera encuestas de WhatsApp
 * Comando: .antiencuesta
 * Detecta:
 * - PollCreationMessageV3
 * - PollCreationMessage
 * - PollCreation
 * - PollResultSnapshot
 *
 * Baileys ES Modules
 */

function getChatData(m) {
  global.db.data.chats = global.db.data.chats || {}
  global.db.data.chats[m.chat] =
    global.db.data.chats[m.chat] || {}

  return global.db.data.chats[m.chat]
}

function getSender(m) {
  return m.sender || m.key?.participant || m.participant || ''
}

// ============================================================
// 🔍 DETECCIÓN RECURSIVA DE ENCUESTAS
// ============================================================

function containsPollMessage(message, depth = 0) {
  if (
    !message ||
    typeof message !== 'object' ||
    depth > 10
  ) {
    return false
  }

  for (const [key, value] of Object.entries(message)) {
    const normalizedKey = key
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase()

    if (
      normalizedKey === 'pollcreationmessagev3' ||
      normalizedKey === 'pollcreationmessage' ||
      normalizedKey === 'pollcreation' ||
      normalizedKey === 'pollresultsnapshot'
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
  const type = String(m.mtype || '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()

  return (
    type === 'pollcreationmessagev3' ||
    type === 'pollcreationmessage' ||
    type === 'pollcreation' ||
    type === 'pollresultsnapshot' ||
    type.includes('pollcreation') ||
    type.includes('pollresultsnapshot') ||
    containsPollMessage(m.message) ||
    containsPollMessage(m.msg)
  )
}

// ============================================================
// ⚙️ COMANDO: ACTIVAR / DESACTIVAR
// ============================================================

let handler = async (m, { conn }) => {
  if (!m.isGroup) {
    return m.reply(
      '⚠️ Este comando solo funciona en grupos.'
    )
  }

  const chat = getChatData(m)
  chat.antiencuesta = !chat.antiencuesta

  if (chat.antiencuesta) {
    return conn.sendMessage(m.chat, {
      text:
        '📊 *ANTIENCUESTA ACTIVADO* ✅\n\n' +
        '🚫 Se detectarán mensajes de encuestas.\n' +
        '🔎 Incluye PollCreationMessageV3 y PollResultSnapshot.\n' +
        '🗑️ El bot intentará eliminar los mensajes detectados.\n' +
        '🔔 Se avisará mencionando al usuario.'
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
// 🛡️ DETECCIÓN Y MODERACIÓN
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
        '[ANTIENCUESTA] Error al intentar borrar el mensaje:',
        error
      )
    }
  }

  const text = deleted
    ? '🚨 *ANTIENCUESTA*\n\n' +
      `👤 Usuario: @${sender.split('@')[0]}\n` +
      '🚫 No se permiten encuestas en este grupo.\n' +
      '🗑️ Se solicitó la eliminación del mensaje.'
    : '🚨 *ANTIENCUESTA*\n\n' +
      `👤 Usuario: @${sender.split('@')[0]}\n` +
      '🚫 No se permiten encuestas en este grupo.\n' +
      '⚠️ No se pudo confirmar la eliminación del mensaje.'

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
