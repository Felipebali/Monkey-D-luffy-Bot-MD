
/**
 * 📂 plugins/_ver2.js
 * 🤖 WHATSAPP-BOT — RECUPERACIÓN DE ARCHIVOS
 *
 * Comandos:
 * .ver / .r
 * .recovered
 * .recovered 1
 * .recoveredlist
 * .recovered borrar 1
 * .recovered papelera
 * .recovered restaurar 1
 * .recovered ayuda
 *
 * Baileys ES Modules
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

const MAX_SIZE = 50 * 1024 * 1024

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
    console.error('[VER] Error leyendo DB:', e)
    return []
  }
}

function saveDB(data) {
  const temp = DB + '.tmp'

  fs.writeFileSync(
    temp,
    JSON.stringify(data, null, 2),
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

function getFile(item) {
  if (!item?.filename) return null

  if (path.basename(item.filename) !== item.filename) {
    return null
  }

  const file = path.resolve(DIR, item.filename)

  return fs.existsSync(file) ? file : null
}

function findMessage(list, chat, id) {
  if (!chat || !id) return null

  return list.find(x =>
    x.chat === chat &&
    x.messageId === id
  )
}

// ============================================================
// 👑 OWNER
// ============================================================

function checkOwner(m, isOwner, isROwner) {
  if (isOwner || isROwner) return true

  const sender = String(m.sender || '')

  return (global.owner || []).some(x => {
    const owner = String(
      Array.isArray(x) ? x[0] : x
    )

    if (owner.includes('@')) {
      return owner === sender
    }

    return (
      sender.endsWith('@s.whatsapp.net') &&
      owner.replace(/\D/g, '') ===
        sender.split('@')[0].split(':')[0]
    )
  })
}

// ============================================================
// 🖼️ DETECTAR MULTIMEDIA
// ============================================================

function getMedia(message) {
  let msg = message

  for (let i = 0; i < 5; i++) {
    if (msg?.ephemeralMessage) {
      msg = msg.ephemeralMessage.message
    } else if (msg?.documentWithCaptionMessage) {
      msg = msg.documentWithCaptionMessage.message
    } else {
      break
    }
  }

  // No descargar contenido de una sola visualización.
  if (
    msg?.viewOnceMessage ||
    msg?.viewOnceMessageV2 ||
    msg?.viewOnceMessageV2Extension ||
    msg?.imageMessage?.viewOnce ||
    msg?.videoMessage?.viewOnce
  ) {
    return null
  }

  if (msg?.imageMessage) {
    return {
      type: 'image',
      extension: 'jpg',
      streamType: 'image',
      data: msg.imageMessage
    }
  }

  if (msg?.videoMessage) {
    return {
      type: 'video',
      extension: 'mp4',
      streamType: 'video',
      data: msg.videoMessage
    }
  }

  if (msg?.stickerMessage) {
    return {
      type: 'sticker',
      extension: 'webp',
      streamType: 'sticker',
      data: msg.stickerMessage
    }
  }

  return null
}

// ============================================================
// 🔐 VALIDAR CLAVE
// ============================================================

function hasKey(data) {
  const key = data?.mediaKey

  if (!key) return false

  if (typeof key === 'string') {
    return key.length > 0
  }

  return (key.length || key.byteLength || 0) > 0
}

// ============================================================
// 📥 DESCARGAR ARCHIVO
// ============================================================

async function downloadMedia(info) {
  if (!info?.data || !hasKey(info.data)) {
    throw new Error('MEDIA_KEY_MISSING')
  }

  if (!info.data.url && !info.data.directPath) {
    throw new Error('MEDIA_URL_MISSING')
  }

  const stream = await downloadContentFromMessage(
    info.data,
    info.streamType
  )

  const chunks = []
  let size = 0

  for await (const chunk of stream) {
    size += chunk.length

    if (size > MAX_SIZE) {
      throw new Error('FILE_TOO_LARGE')
    }

    chunks.push(chunk)
  }

  const buffer = Buffer.concat(chunks)

  if (!buffer.length) {
    throw new Error('EMPTY_FILE')
  }

  return buffer
}

// ============================================================
// 📦 GUARDAR
// ============================================================

function saveMedia(buffer, info, chat, sender, messageId) {
  const list = readDB()

  const previous = findMessage(
    list,
    chat,
    messageId
  )

  if (previous && getFile(previous)) {
    return previous
  }

  const id = nextId(list)
  const filename = `recovered_${id}.${info.extension}`

  fs.writeFileSync(
    path.join(DIR, filename),
    buffer
  )

  const item = {
    id,
    type: info.type,
    filename,
    date: new Date().toLocaleString('es-UY'),
    chat,
    sender: sender || null,
    messageId: messageId || null,
    mimetype: info.data?.mimetype || null,
    deleted: false
  }

  list.push(item)
  saveDB(list)

  console.log(
    `[VER] Archivo guardado: ${id} (${info.type})`
  )

  return item
}

// ============================================================
// 📤 ENVIAR ARCHIVO
// ============================================================

async function sendMedia(conn, chat, item) {
  const file = getFile(item)

  if (!file) return false

  try {
    const buffer = fs.readFileSync(file)

    const caption =
      `♻️ *WHATSAPP-BOT*\n` +
      `🆔 Archivo recuperado: ${item.id}`

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
  } catch (e) {
    console.error(
      `[VER] Error enviando a ${chat}:`,
      e
    )

    return false
  }
}

// ============================================================
// 📡 DISTRIBUIR
// ============================================================

async function distribute(conn, currentChat, item) {
  const destinations = new Set(RECOVERY_GROUPS)

  if (currentChat.endsWith('@g.us')) {
    destinations.add(currentChat)
  }

  let sent = 0

  for (const chat of destinations) {
    if (await sendMedia(conn, chat, item)) {
      sent++
    }
  }

  return sent
}

// ============================================================
// 📋 FORMATEAR LISTA
// ============================================================

function formatList(items) {
  if (!items.length) {
    return '📂 No hay archivos.'
  }

  return items.map(x =>
    `🔢 *N.º ${x.id}*\n` +
    `📁 Tipo: ${x.type}\n` +
    `📅 Fecha: ${x.date}\n` +
    `📄 Archivo: ${x.filename}`
  ).join('\n\n')
}

// ============================================================
// 🤖 HANDLER
// ============================================================

const handler = async (
  m,
  {
    conn,
    command,
    args = [],
    usedPrefix = '.',
    isOwner,
    isROwner
  }
) => {
  try {
    if (!checkOwner(m, isOwner, isROwner)) {
      return m.reply(
        '⛔ Solo los propietarios pueden usar este comando.'
      )
    }

    const cmd = String(command || '').toLowerCase()
    const sub = String(args[0] || '').toLowerCase()
    const id = String(args[1] || '')

    const list = readDB()

    // ========================================================
    // 📖 AYUDA
    // ========================================================

    if (sub === 'ayuda') {
      return m.reply(
        `🗃️ *WHATSAPP-BOT — RECUPERADOS*\n\n` +
        `♻️ ${usedPrefix}ver\n` +
        `♻️ ${usedPrefix}r\n` +
        `📋 ${usedPrefix}recovered\n` +
        `📁 ${usedPrefix}recovered 1\n` +
        `🗑️ ${usedPrefix}recovered borrar 1\n` +
        `🗑️ ${usedPrefix}recovered papelera\n` +
        `♻️ ${usedPrefix}recovered restaurar 1\n` +
        `📋 ${usedPrefix}recoveredlist`
      )
    }

    // ========================================================
    // 🗑️ BORRAR
    // ========================================================

    if (
      cmd === 'recovered' &&
      ['borrar', 'eliminar'].includes(sub)
    ) {
      const item = list.find(
        x => String(x.id) === id
      )

      if (!item) {
        return m.reply('❌ ID inexistente.')
      }

      if (item.deleted) {
        return m.reply(
          '⚠️ Ya está en la papelera.'
        )
      }

      item.deleted = true
      item.deletedAt =
        new Date().toLocaleString('es-UY')

      saveDB(list)

      return m.reply(
        `🗑️ Archivo ${id} enviado a la papelera.`
      )
    }

    // ========================================================
    // ♻️ RESTAURAR
    // ========================================================

    if (
      cmd === 'recovered' &&
      ['restaurar', 'restore'].includes(sub)
    ) {
      const item = list.find(
        x => String(x.id) === id
      )

      if (!item) {
        return m.reply('❌ ID inexistente.')
      }

      if (!getFile(item)) {
        return m.reply(
          '❌ No existe la copia física.'
        )
      }

      item.deleted = false
      delete item.deletedAt

      saveDB(list)

      return m.reply(
        `♻️ Archivo ${id} restaurado.`
      )
    }

    // ========================================================
    // 🗑️ PAPELERA
    // ========================================================

    if (
      cmd === 'recovered' &&
      ['papelera', 'borrados'].includes(sub)
    ) {
      const deleted = list
        .filter(x => x.deleted)
        .slice(-50)
        .reverse()

      return m.reply(
        `🗑️ *PAPELERA*\n\n` +
        formatList(deleted)
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
            `🗑️ Está en la papelera.\n` +
            `${usedPrefix}recovered restaurar ${sub}`
          )
        }

        const sent = await sendMedia(
          conn,
          m.chat,
          item
        )

        if (!sent) {
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

      let item = findMessage(
        list,
        quotedChat,
        quotedId
      )

      // Buscar primero una copia existente.
      if (item && getFile(item)) {
        if (item.deleted) {
          return m.reply(
            `🗑️ Archivo en la papelera.\n` +
            `${usedPrefix}recovered restaurar ${item.id}`
          )
        }

        const sent = await distribute(
          conn,
          m.chat,
          item
        )

        if (!sent) {
          return m.reply(
            '❌ No pude enviar el archivo guardado.'
          )
        }

        return
      }

      const raw =
        m.quoted.fakeObj?.message ||
        m.quoted.message

      const info = getMedia(raw)

      if (!info) {
        return m.reply(
          '❌ No hay una copia disponible o el archivo no es compatible.'
        )
      }

      if (!hasKey(info.data)) {
        return m.reply(
          '❌ La foto no tiene una clave multimedia válida. No se puede descargar sin una copia guardada.'
        )
      }

      let buffer

      try {
        buffer = await downloadMedia(info)
      } catch (error) {
        console.error(
          '[VER] Error de descarga:',
          error?.message || error
        )

        return m.reply(
          '❌ WhatsApp no permitió descargar ese archivo.'
        )
      }

      item = saveMedia(
        buffer,
        info,
        quotedChat,
        m.quoted.sender,
        quotedId
      )

      const sent = await distribute(
        conn,
        m.chat,
        item
      )

      if (!sent) {
        return m.reply(
          '⚠️ Guardé el archivo, pero no pude enviarlo.'
        )
      }

      return
    }

  } catch (error) {
    console.error('[VER] Error:', error)

    return m.reply(
      '❌ Ocurrió un error al procesar el archivo.'
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
