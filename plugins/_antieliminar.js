
/**
 * 📂 plugins/antieliminar.js
 * 🛡️ AntiEliminar mediante ProtocolMessage
 *
 * Comando: .antieliminar
 * Detecta: ProtocolMessage REVOKE
 *
 * Baileys ES Modules
 */

const MAX_CACHE = 1000
const CACHE_TTL = 24 * 60 * 60 * 1000

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

    if (current.documentWithCaptionMessage?.message) {
      current = current.documentWithCaptionMessage.message
      continue
    }

    return {
      type: 'normal',
      content: current
    }
  }

  return { type: 'normal', content: current }
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
    ''
  )
}

function getSender(key) {
  return key?.participant || key?.remoteJid || ''
}

function isRevoke(protocol) {
  if (!protocol) return false

  const type = protocol.type

  // En Baileys, REVOKE suele representarse con el valor 0.
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
    cache.delete(oldestKey)
  }
}

function cacheKey(chat, id) {
  return `${chat}:${id}`
}

// ============================================================
// ⚙️ COMANDO: ACTIVAR / DESACTIVAR
// ============================================================

const handler = async (m, { conn }) => {
  if (!m.isGroup) {
    return m.reply('⚠️ Este comando solo funciona en grupos.')
  }

  const chat = getChatData(m)
  chat.antieliminar = !chat.antieliminar

  if (chat.antieliminar) {
    return conn.sendMessage(m.chat, {
      text:
        '🛡️ *ANTI-ELIMINAR ACTIVADO* ✅\n\n' +
        '👀 Detectaré eliminaciones mediante ProtocolMessage.\n' +
        '📥 Intentaré recuperar mensajes guardados antes de su eliminación.\n\n' +
        '⚠️ Solo se podrán recuperar mensajes que el bot haya recibido y guardado.'
    })
  }

  return conn.sendMessage(m.chat, {
    text:
      '🛡️ *ANTI-ELIMINAR DESACTIVADO* ❌\n\n' +
      'Ya no se avisarán ni recuperarán eliminaciones en este grupo.'
  })
}

handler.help = ['antieliminar']
handler.tags = ['grupo']
handler.command = ['antieliminar']
handler.group = true

// ============================================================
// 🔍 ALMACENAR MENSAJES Y DETECTAR REVOKE
// ============================================================

handler.all = async function (m) {
  if (!m?.chat || !m?.key) return
  if (m.fromMe || m.key.fromMe) return

  const chatData = global.db?.data?.chats?.[m.chat]
  if (!m.isGroup || !chatData?.antieliminar) return

  const cache = getCache()
  cleanCache(cache)

  const extracted = getMessageContent(m.message || {})

  // No guardar mensajes de protocolo como si fueran mensajes normales.
  if (extracted.type === 'protocol') {
    const protocol = extracted.content

    if (!isRevoke(protocol)) return

    const deletedKey = protocol.key
    if (!deletedKey?.id) return

    const deletedChat = deletedKey.remoteJid || m.chat
    if (deletedChat !== m.chat) return

    const stored = cache.get(cacheKey(deletedChat, deletedKey.id))
    const deleter = getSender(m.key)

    let notice =
      '🗑️ *MENSAJE ELIMINADO*\n\n' +
      `👤 Eliminado por: @${deleter.split('@')[0]}\n`

    if (stored) {
      const originalSender = getSender(stored.key)
      const originalContent = getMessageContent(stored.message).content
      const recoveredText = getText(originalContent)

      notice +=
        `✉️ Autor original: @${originalSender.split('@')[0]}\n` +
        '♻️ Se encontró una copia del mensaje.'

      try {
        await this.sendMessage(m.chat, {
          text: notice,
          mentions: [...new Set([deleter, originalSender].filter(Boolean))]
        })
      } catch (error) {
        console.error('[ANTIELIMINAR] Error enviando aviso:', error)
      }

      // Si es texto, mostrar el contenido recuperado.
      if (recoveredText) {
        try {
          await this.sendMessage(m.chat, {
            text:
              '📩 *Contenido recuperado:*\n\n' +
              recoveredText,
            mentions: originalSender ? [originalSender] : []
          })
        } catch (error) {
          console.error('[ANTIELIMINAR] Error recuperando texto:', error)
        }
      } else {
        // Para multimedia, intentar reenviar el mensaje original.
        try {
          if (typeof this.copyNForward === 'function') {
            await this.copyNForward(m.chat, stored, true)
          } else {
            await this.sendMessage(m.chat, {
              text:
                '📎 Se encontró el mensaje eliminado, pero esta versión ' +
                'del bot no tiene copyNForward para reenviar su contenido.'
            })
          }
        } catch (error) {
          console.error(
            '[ANTIELIMINAR] Error reenviando multimedia:',
            error
          )

          await this.sendMessage(m.chat, {
            text:
              '⚠️ Encontré una copia del mensaje eliminado, ' +
              'pero no pude reenviar su contenido multimedia.'
          }).catch(() => {})
        }
      }

      cache.delete(cacheKey(deletedChat, deletedKey.id))
    } else {
      notice +=
        '⚠️ No había una copia guardada del mensaje original.'

      await this.sendMessage(m.chat, {
        text: notice,
        mentions: deleter ? [deleter] : []
      }).catch(error => {
        console.error('[ANTIELIMINAR] Error enviando aviso:', error)
      })
    }

    return
  }

  // Guardar el mensaje original para poder encontrarlo si lo eliminan.
  if (!m.key.id || !m.message) return

  cache.set(cacheKey(m.chat, m.key.id), {
    key: m.key,
    message: m.message,
    time: Date.now()
  })

  cleanCache(cache)
}

export default handler
