
/**
 * 📂 plugins/antieliminar.js
 * 🛡️ AntiEliminar mediante ProtocolMessage
 *
 * Comando: .antieliminar
 * Detecta: ProtocolMessage REVOKE
 *
 * Funciones:
 * - Identifica quién envió el mensaje original.
 * - Identifica quién eliminó el mensaje.
 * - Recupera el texto cuando está disponible.
 * - Envía el aviso y el contenido en un solo mensaje.
 *
 * Baileys ES Modules
 */

const MAX_CACHE = 1000
const CACHE_TTL = 24 * 60 * 60 * 1000

// ============================================================
// 🗃️ UTILIDADES
// ============================================================

function getChatData(m) {
  global.db.data.chats = global.db.data.chats || {}
  global.db.data.chats[m.chat] =
    global.db.data.chats[m.chat] || {}

  return global.db.data.chats[m.chat]
}

function getMessageContent(message) {
  let current = message

  for (let i = 0; i < 10 && current; i++) {
    if (current.protocolMessage) {
      return {
        type: 'protocol',
        content: current.protocolMessage
      }
    }

    if (current.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message
      continue
    }

    if (current.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message
      continue
    }

    if (current.viewOnceMessageV2?.message) {
      current = current.viewOnceMessageV2.message
      continue
    }

    if (current.viewOnceMessageV2Extension?.message) {
      current = current.viewOnceMessageV2Extension.message
      continue
    }

    if (current.documentWithCaptionMessage?.message) {
      current = current.documentWithCaptionMessage.message
      continue
    }

    return {
      type: 'normal',
      content: current
    }
  }

  return {
    type: 'normal',
    content: current || {}
  }
}

function getText(message) {
  if (!message) return ''

  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    message.documentWithCaptionMessage?.message
      ?.documentMessage?.caption ||
    message.buttonsResponseMessage?.selectedDisplayText ||
    message.listResponseMessage?.title ||
    message.templateButtonReplyMessage?.selectedDisplayText ||
    ''
  )
}

function getSender(key) {
  return key?.participant || key?.remoteJid || ''
}

function formatSender(jid) {
  if (!jid) return 'Desconocido'
  return `@${jid.split('@')[0].split(':')[0]}`
}

function isRevoke(protocol) {
  if (!protocol) return false

  const type = protocol.type

  return (
    type === 0 ||
    type === 'REVOKE' ||
    String(type).toUpperCase().includes('REVOKE')
  )
}

function getCache() {
  if (!global.antiEliminarCache) {
    global.antiEliminarCache = new Map()
  }

  return global.antiEliminarCache
}

function cleanCache(cache) {
  const now = Date.now()

  for (const [key, value] of cache.entries()) {
    if (now - value.time > CACHE_TTL) {
      cache.delete(key)
    }
  }

  while (cache.size > MAX_CACHE) {
    const oldestKey = cache.keys().next().value
    if (!oldestKey) break
    cache.delete(oldestKey)
  }
}

function cacheKey(chat, id) {
  return `${chat}:${id}`
}

function getMediaDescription(message) {
  if (!message) return 'Contenido no disponible'

  if (message.imageMessage) {
    return '🖼️ Imagen'
  }

  if (message.videoMessage) {
    return '🎥 Video'
  }

  if (message.audioMessage) {
    return message.audioMessage.ptt
      ? '🎤 Nota de voz'
      : '🎵 Audio'
  }

  if (message.stickerMessage) {
    return '🏷️ Sticker'
  }

  if (message.documentMessage) {
    const fileName = message.documentMessage.fileName
    return fileName
      ? `📄 Documento: ${fileName}`
      : '📄 Documento'
  }

  if (message.contactMessage || message.contactsArrayMessage) {
    return '👤 Contacto'
  }

  if (message.locationMessage || message.liveLocationMessage) {
    return '📍 Ubicación'
  }

  if (message.pollCreationMessage ||
      message.pollCreationMessageV3) {
    return '📊 Encuesta'
  }

  if (message.reactionMessage) {
    return '😀 Reacción'
  }

  return '⚠️ No se pudo leer el contenido'
}

// ============================================================
// ⚙️ COMANDO: ACTIVAR / DESACTIVAR
// ============================================================

const handler = async (m, { conn }) => {
  if (!m.isGroup) {
    return m.reply(
      '⚠️ Este comando solo funciona en grupos.'
    )
  }

  const chat = getChatData(m)
  chat.antieliminar = !chat.antieliminar

  if (chat.antieliminar) {
    return conn.sendMessage(m.chat, {
      text:
        '🛡️ *ANTI-ELIMINAR ACTIVADO* ✅\n\n' +
        '👀 Detectaré mensajes eliminados mediante ProtocolMessage.\n' +
        '👤 Mostraré quién envió el mensaje y quién lo eliminó.\n' +
        '💬 El aviso y el contenido recuperado se enviarán juntos.\n\n' +
        '⚠️ Solo puedo recuperar mensajes que el bot haya recibido y guardado mientras esta función estaba activa.'
    })
  }

  return conn.sendMessage(m.chat, {
    text:
      '🛡️ *ANTI-ELIMINAR DESACTIVADO* ❌\n\n' +
      'Ya no se detectarán eliminaciones en este grupo.'
  })
}

handler.help = ['antieliminar']
handler.tags = ['grupo']
handler.command = ['antieliminar']
handler.group = true

// ============================================================
// 🔍 GUARDAR MENSAJES Y DETECTAR ELIMINACIONES
// ============================================================

handler.all = async function (m) {
  if (!m?.chat || !m?.key) return
  if (m.fromMe || m.key.fromMe) return
  if (!m.isGroup) return

  const chatData = global.db?.data?.chats?.[m.chat]
  if (!chatData?.antieliminar) return

  const cache = getCache()
  cleanCache(cache)

  const extracted = getMessageContent(m.message || {})

  // ----------------------------------------------------------
  // 🗑️ DETECTAR MENSAJE ELIMINADO
  // ----------------------------------------------------------

  if (extracted.type === 'protocol') {
    const protocol = extracted.content

    if (!isRevoke(protocol)) return

    const deletedKey = protocol.key
    if (!deletedKey?.id) return

    const deletedChat = deletedKey.remoteJid || m.chat
    if (deletedChat !== m.chat) return

    const stored = cache.get(
      cacheKey(deletedChat, deletedKey.id)
    )

    const deleter = getSender(m.key)
    const mentions = []

    if (deleter) mentions.push(deleter)

    let originalSender = ''
    let content = '⚠️ No se encontró una copia del mensaje original.'

    if (stored) {
      originalSender = getSender(stored.key)

      if (originalSender) {
        mentions.push(originalSender)
      }

      const originalExtracted =
        getMessageContent(stored.message)

      const originalContent = originalExtracted.content || {}
      const recoveredText = getText(originalContent)

      if (recoveredText) {
        content = recoveredText
      } else {
        content = getMediaDescription(originalContent)
      }
    }

    const uniqueMentions = [...new Set(mentions)]

    const report =
      '🗑️ *MENSAJE ELIMINADO*\n\n' +
      `👤 *Enviado por:* ${formatSender(originalSender)}\n` +
      `🚫 *Eliminado por:* ${formatSender(deleter)}\n\n` +
      '💬 *Contenido del mensaje:*\n' +
      content

    try {
      await this.sendMessage(m.chat, {
        text: report,
        mentions: uniqueMentions
      })
    } catch (error) {
      console.error(
        '[ANTIELIMINAR] Error enviando el reporte:',
        error
      )
    }

    if (stored) {
      cache.delete(cacheKey(deletedChat, deletedKey.id))
    }

    return
  }

  // ----------------------------------------------------------
  // 💾 GUARDAR MENSAJE ORIGINAL
  // ----------------------------------------------------------

  if (!m.key.id || !m.message) return

  cache.set(cacheKey(m.chat, m.key.id), {
    key: m.key,
    message: m.message,
    time: Date.now()
  })

  cleanCache(cache)
}

export default handler
