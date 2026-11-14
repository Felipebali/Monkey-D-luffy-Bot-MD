
/**
 * 📂 plugins/ver.js
 * 🤖 WHATSAPP-BOT — ARCHIVOS RECUPERADOS
 *
 * Comandos exclusivos de owners:
 * .ver / .r
 * .recovered
 * .recovered 1
 * .recoveredlist
 * .recovered borrar 1
 * .recovered papelera
 * .recovered restaurar 1
 * .recovered ayuda
 *
 * Guarda automáticamente imágenes, videos y stickers
 * que el bot puede descargar cuando los recibe.
 *
 * No recupera archivos que WhatsApp ya no permite
 * descargar si no fueron guardados previamente.
 */

import fs from 'fs'
import path from 'path'
import {
  downloadContentFromMessage
} from '@whiskeysockets/baileys'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const DIR = './database/recovered-media-files'
const DB = './database/recovered-media.json'

const RECOVERY_GROUPS = [
  '120363410955044864@g.us'
]

const MAX_FILE_SIZE = 50 * 1024 * 1024

fs.mkdirSync(DIR, { recursive: true })

if (!fs.existsSync(DB)) {
  fs.writeFileSync(DB, '[]', 'utf8')
}

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

function readDB() {
  try {
    const data = JSON.parse(
      fs.readFileSync(DB, 'utf8')
    )

    return Array.isArray(data) ? data : []
  } catch (e) {
    console.error('[RECOVERED] Error leyendo DB:', e)
    return []
  }
}

function saveDB(list) {
  const temp = DB + '.tmp'

  fs.writeFileSync(
    temp,
    JSON.stringify(list, null, 2),
    'utf8'
  )

  fs.renameSync(temp, DB)
}

function nextId(list) {
  return String(
    Math.max(
      0,
      ...list.map(x => Number(x.id) || 0)
    ) + 1
  )
}

function filePath(item) {
  if (!item?.filename) return null

  const name = path.basename(item.filename)

  if (name !== item.filename) return null

  const file = path.join(DIR, name)

  return fs.existsSync(file) ? file : null
}

function findByMessage(list, chat, messageId) {
  if (!chat || !messageId) return null

  return list.find(item =>
    item.chat === chat &&
    item.messageId === messageId
  )
}

// ============================================================
// 👑 OWNERS
// ============================================================

function isOwnerUser(m, isOwner, isROwner) {
  if (isOwner || isROwner) return true

  const sender = String(m.sender || '')
    .split('@')[0]
    .split(':')[0]

  return (global.owner || []).some(entry => {
    const value = Array.isArray(entry)
      ? entry[0]
      : entry

    const raw = String(value || '')

    if (raw.includes('@')) {
      return raw === m.sender
    }

    return raw.replace(/\D/g, '') === sender
  })
}

// ============================================================
// 🖼️ DETECTAR MULTIMEDIA
// ============================================================

function unwrap(message) {
  let msg = message

  for (let i = 0; i < 6; i++) {
    if (!msg) break

    if (msg.ephemeralMessage) {
      msg = msg.ephemeralMessage.message
    } else if (msg.viewOnceMessageV2) {
      msg = msg.viewOnceMessageV2.message
    } else if (msg.viewOnceMessage) {
      msg = msg.viewOnceMessage.message
    } else if (msg.viewOnceMessageV2Extension) {
      msg = msg.viewOnceMessageV2Extension.message
    } else if (msg.documentWithCaptionMessage) {
      msg = msg.documentWithCaptionMessage.message
    } else {
      break
    }
  }

  return msg
}

function mediaInfo(message) {
  const msg = unwrap(message)

  if (msg?.imageMessage) {
    return {
      type: 'image',
      data: msg.imageMessage,
      extension: 'jpg',
      streamType: 'image'
    }
  }

  if (msg?.videoMessage) {
    return {
      type: 'video',
      data: msg.videoMessage,
      extension: 'mp4',
      streamType: 'video'
    }
  }

  if (msg?.stickerMessage) {
    return {
      type: 'sticker',
      data: msg.stickerMessage,
      extension: 'webp',
      streamType: 'sticker'
    }
  }

  return null
}

// ============================================================
// 📥 DESCARGAR MULTIMEDIA
// ============================================================

async function downloadMedia(info) {
  const stream = await downloadContentFromMessage(
    info.data,
    info.streamType
  )

  const chunks = []
  let size = 0

  for await (const chunk of stream) {
    size += chunk.length

    if (size > MAX_FILE_SIZE) {
      throw new Error(
        'Archivo demasiado grande.'
      )
    }

    chunks.push(chunk)
  }

  const buffer = Buffer.concat(chunks)

  if (!buffer.length) {
    throw new Error(
      'WhatsApp no devolvió el archivo.'
    )
  }

  return buffer
}

// ============================================================
// 📦 GUARDAR ARCHIVO
// ============================================================

function saveMedia({
  buffer,
  type,
  extension,
  chat,
  sender,
  messageId,
  mimetype
}) {
  const list = readDB()

  const existing = findByMessage(
    list,
    chat,
    messageId
  )

  if (existing) return existing

  const id = nextId(list)
  const filename = `recovered_${id}.${extension}`

  fs.writeFileSync(
    path.join(DIR, filename),
    buffer
  )

  const item = {
    id,
    type,
    filename,
    date: new Date().toLocaleString('es-UY'),
    chat,
    sender,
    messageId,
    mimetype: mimetype || null,
    deleted: false
  }

  list.push(item)
  saveDB(list)

  console.log(
    `[RECOVERED] Guardado ID ${id}, tipo ${type}`
  )

  return item
}

// ============================================================
// 📤 ENVIAR ARCHIVO
// ============================================================

async function sendMedia(conn, chat, item) {
  const file = filePath(item)

  if (!file) {
    console.error(
      `[RECOVERED] Archivo inexistente: ${item.id}`
    )
    return false
  }

  const buffer = fs.readFileSync(file)

  const caption =
    `♻️ *Archivo recuperado*\n` +
    `🆔 ID: ${item.id}`

  try {
    if (item.type === 'image') {
      await conn.sendMessage(chat, {
        image: buffer,
        caption
      })
    } else if (item.type === 'video') {
      await conn.sendMessage(chat, {
        video: buffer,
        caption
      })
    } else if (item.type === 'sticker') {
      await conn.sendMessage(chat, {
        sticker: buffer
      })
    } else {
      return false
    }

    return true
  } catch (error) {
    console.error(
      `[RECOVERED] Error enviando a ${chat}:`,
      error
    )

    return false
  }
}

async function distribute(conn, currentChat, item) {
  const destinations = new Set(
    RECOVERY_GROUPS
  )

  if (currentChat.endsWith('@g.us')) {
    destinations.add(currentChat)
  }

  for (const chat of destinations) {
    await sendMedia(conn, chat, item)
  }
}

// ============================================================
// 📋 FORMATEAR LISTA
// ============================================================

function formatList(items) {
  if (!items.length) {
    return '📂 No hay archivos para mostrar.'
  }

  return items.map(item => {
    return (
      `🔢 *N.º ${item.id}*\n` +
      `📁 Tipo: ${item.type}\n` +
      `📅 Fecha: ${item.date}\n` +
      `📄 Archivo: ${item.filename}` +
      (
        item.deletedAt
          ? `\n🗑️ Eliminado: ${item.deletedAt}`
          : ''
      )
    )
  }).join('\n\n')
}

// ============================================================
// 📸 GUARDADO AUTOMÁTICO
// ============================================================

const handler = async (
  m,
  {
    conn,
    isOwner,
    isROwner,
    command,
    args = [],
    usedPrefix = '.'
  }
) => {
  if (!isOwnerUser(m, isOwner, isROwner)) {
    return m.reply(
      '⛔ Solo los propietarios pueden usar este comando.'
    )
  }

  const cmd = String(command).toLowerCase()
  const sub = String(args[0] || '').toLowerCase()
  const id = String(args[1] || '')

  const list = readDB()

  // ========================================================
  // 📖 AYUDA
  // ========================================================

  if (sub === 'ayuda') {
    return m.reply(
      `🗃️ *WHATSAPP-BOT — RECUPERADOS*\n\n` +
      `♻️ ${usedPrefix}ver (citando archivo)\n` +
      `📋 ${usedPrefix}recovered\n` +
      `📁 ${usedPrefix}recovered 1\n` +
      `🗑️ ${usedPrefix}recovered borrar 1\n` +
      `🗑️ ${usedPrefix}recovered papelera\n` +
      `♻️ ${usedPrefix}recovered restaurar 1`
    )
  }

  // ========================================================
  // 🗑️ PAPELERA
  // ========================================================

  if (
    cmd === 'recovered' &&
    ['borrar', 'eliminar'].includes(sub)
  ) {
    const item = list.find(x => String(x.id) === id)

    if (!item) {
      return m.reply('❌ ID inexistente.')
    }

    item.deleted = true
    item.deletedAt = new Date().toLocaleString('es-UY')

    saveDB(list)

    return m.reply(
      `🗑️ Archivo ${id} enviado a la papelera.`
    )
  }

  if (
    cmd === 'recovered' &&
    ['restaurar', 'restore'].includes(sub)
  ) {
    const item = list.find(x => String(x.id) === id)

    if (!item) {
      return m.reply('❌ ID inexistente.')
    }

    if (!filePath(item)) {
      return m.reply(
        '❌ El archivo físico no existe.'
      )
    }

    item.deleted = false
    delete item.deletedAt

    saveDB(list)

    return m.reply(
      `♻️ Archivo ${id} restaurado.`
    )
  }

  if (
    cmd === 'recovered' &&
    ['papelera', 'borrados'].includes(sub)
  ) {
    const deleted = list.filter(x => x.deleted)

    return m.reply(
      `🗑️ *PAPELERA*\n\n` +
      formatList(deleted.slice(-50).reverse())
    )
  }

  // ========================================================
  // 📋 LISTAR / CONSULTAR
  // ========================================================

  if (
    cmd === 'recovered' ||
    cmd === 'recoveredlist'
  ) {
    if (sub) {
      const item = list.find(
        x => String(x.id) === sub
      )

      if (!item) {
        return m.reply('❌ ID inexistente.')
      }

      if (item.deleted) {
        return m.reply(
          '🗑️ Ese archivo está en la papelera.'
        )
      }

      const ok = await sendMedia(
        conn,
        m.chat,
        item
      )

      if (!ok) {
        return m.reply(
          '❌ No se pudo enviar el archivo.'
        )
      }

      return
    }

    const active = list
      .filter(x => !x.deleted)
      .slice(-50)
      .reverse()

    return m.reply(
      `🗃️ *ARCHIVOS RECUPERADOS*\n\n` +
      formatList(active)
    )
  }

  // ========================================================
  // ♻️ VER / RECUPERAR
  // ========================================================

  if (cmd === 'ver' || cmd === 'r') {
    if (!m.quoted) {
      return m.reply(
        '❌ Respondé a una imagen, video o sticker.'
      )
    }

    const quotedId =
      m.quoted.id ||
      m.quoted.key?.id ||
      m.quoted.fakeObj?.key?.id

    const quotedChat =
      m.quoted.chat ||
      m.chat

    let item = findByMessage(
      list,
      quotedChat,
      quotedId
    )

    if (!item) {
      try {
        let buffer
        let type
        let extension
        let mimetype

        const raw =
          m.quoted.fakeObj?.message ||
          m.quoted.message

        const info = mediaInfo(raw)

        if (info) {
          buffer = await downloadMedia(info)
          type = info.type
          extension = info.extension
          mimetype = info.data.mimetype
        } else {
          type = m.quoted.mtype === 'imageMessage'
            ? 'image'
            : m.quoted.mtype === 'videoMessage'
              ? 'video'
              : m.quoted.mtype === 'stickerMessage'
                ? 'sticker'
                : null

          if (!type) {
            return m.reply(
              '❌ El mensaje citado no contiene multimedia compatible.'
            )
          }

          buffer = await m.quoted.download()

          extension = type === 'image'
            ? 'jpg'
            : type === 'video'
              ? 'mp4'
              : 'webp'

          mimetype = m.quoted.mimetype
        }

        if (!Buffer.isBuffer(buffer)) {
          buffer = Buffer.from(buffer)
        }

        if (!buffer.length) {
          throw new Error(
            'Archivo vacío.'
          )
        }

        item = saveMedia({
          buffer,
          type,
          extension,
          chat: quotedChat,
          sender: m.quoted.sender,
          messageId: quotedId,
          mimetype
        })

      } catch (error) {
        console.error(
          '[RECOVERED] No se pudo recuperar:',
          error
        )

        return m.reply(
          '❌ No pude descargar ese archivo. Si fue eliminado o ya no está disponible, necesitaba haberse guardado cuando llegó.'
        )
      }
    }

    await distribute(
      conn,
      m.chat,
      item
    )

    return
  }
}

// ============================================================
// 📥 BEFORE — GUARDADO AUTOMÁTICO
// ============================================================

handler.before = async function (
  m,
  { conn }
) {
  try {
    if (!m.message) return
    if (m.fromMe || m.key?.fromMe) return
    if (!m.key?.id) return

    // Solo guardar contenido de los grupos de recuperación
    // o de grupos donde el bot está presente.
    if (!m.isGroup) return

    const info = mediaInfo(m.message)

    if (!info) return

    const list = readDB()

    if (findByMessage(list, m.chat, m.key.id)) {
      return
    }

    const buffer = await downloadMedia(info)

    saveMedia({
      buffer,
      type: info.type,
      extension: info.extension,
      chat: m.chat,
      sender: m.sender,
      messageId: m.key.id,
      mimetype: info.data.mimetype
    })

  } catch (error) {
    console.error(
      '[RECOVERED] Error en guardado automático:',
      error?.message || error
    )
  }
}

// ============================================================
// ⚙️ REGISTRO
// ============================================================

handler.help = [
  'ver',
  'r',
  'recovered',
  'recoveredlist'
]

handler.tags = ['owner']

handler.command =
  /^(ver|r|recovered|recoveredlist)$/i

export default handler
