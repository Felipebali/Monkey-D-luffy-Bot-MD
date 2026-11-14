
/**
 * 📂 plugins/_ver2.js
 * 🤖 WHATSAPP-BOT — ARCHIVOS RECUPERADOS
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
 * ✅ Solo owners
 * ✅ ID numéricos permanentes
 * ✅ Guardado físico y JSON
 * ✅ Papelera sin borrar archivos
 * ✅ Compatible con registros anteriores
 * ✅ Verifica mediaKey antes de descargar
 * ✅ Evita duplicados
 * ✅ Envía al grupo de recuperación
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
fs.mkdirSync(path.dirname(DB), { recursive: true })

if (!fs.existsSync(DB)) {
  fs.writeFileSync(DB, '[]', 'utf8')
}

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

function readDB() {
  try {
    const parsed = JSON.parse(
      fs.readFileSync(DB, 'utf8')
    )

    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error(
      '[RECOVERED] Error leyendo JSON:',
      error
    )

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
  const ids = list
    .map(item => Number(item.id))
    .filter(Number.isSafeInteger)

  return String(
    Math.max(0, ...ids) + 1
  )
}

function getFilePath(item) {
  if (!item?.filename) return null

  const filename = path.basename(item.filename)

  if (filename !== item.filename) {
    return null
  }

  const file = path.resolve(DIR, filename)

  return fs.existsSync(file)
    ? file
    : null
}

function findByMessage(list, chat, id) {
  if (!chat || !id) return null

  return list.find(item =>
    item.chat === chat &&
    item.messageId === id
  )
}

// ============================================================
// 👑 OWNERS
// ============================================================

function isBotOwner(m, isOwner, isROwner) {
  if (isOwner || isROwner) return true

  const sender = String(m.sender || '')

  return (global.owner || []).some(entry => {
    const value = Array.isArray(entry)
      ? entry[0]
      : entry

    const owner = String(value || '')

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
// 🖼️ DETECTAR ARCHIVOS NORMALES
// ============================================================

function mediaInfo(message) {
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

  // No intentar descargar archivos de una sola vista.
  if (
    msg?.viewOnceMessage ||
    msg?.viewOnceMessageV2 ||
    msg?.viewOnceMessageV2Extension
  ) {
    return null
  }

  if (msg?.imageMessage?.viewOnce ||
      msg?.videoMessage?.viewOnce) {
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
// 🔐 VALIDAR MEDIA KEY
// ============================================================

function hasMediaKey(media) {
  if (!media?.mediaKey) return false

  const key = media.mediaKey

  if (typeof key === 'string') {
    return key.length > 0
  }

  return key.length > 0 ||
    key.byteLength > 0
}

// ============================================================
// 📥 DESCARGAR
// ============================================================

async function downloadMedia(info) {
  if (!info?.data) {
    throw new Error(
      'El mensaje no contiene datos multimedia.'
    )
  }

  const media = info.data

  if (!hasMediaKey(media)) {
    throw new Error(
      'MEDIA_KEY_MISSING'
    )
  }

  if (!media.url && !media.directPath) {
    throw new Error(
      'MEDIA_URL_MISSING'
    )
  }

  const stream = await downloadContentFromMessage(
    media,
    info.streamType
  )

  const chunks = []
  let size = 0

  for await (const chunk of stream) {
    size += chunk.length

    if (size > MAX_FILE_SIZE) {
      throw new Error(
        'FILE_TOO_LARGE'
      )
    }

    chunks.push(chunk)
  }

  const buffer = Buffer.concat(chunks)

  if (!buffer.length) {
    throw new Error(
      'EMPTY_MEDIA'
    )
  }

  return buffer
}

// ============================================================
// 📦 GUARDAR
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

  // Reutilizar solamente copias existentes.
  if (existing && getFilePath(existing)) {
    return existing
  }

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
    `[RECOVERED] Guardado: ID ${id} (${type})`
  )

  return item
}

// ============================================================
// 📤 ENVIAR ARCHIVO
// ============================================================

async function sendMedia(conn, chat, item) {
  const file = getFilePath(item)

  if (!file) {
    console.error(
      `[RECOVERED] Falta archivo ID ${item.id}`
    )

    return false
  }

  try {
    const buffer = fs.readFileSync(file)

    const caption =
      `♻️ *WHATSAPP-BOT — RECUPERADO*\n` +
      `🆔 ID: ${item.id}`

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
      error?.message || error
    )

    return false
  }
}

// ============================================================
// 📡 DISTRIBUCIÓN
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
// 📋 LISTAR
// ============================================================

function formatList(items) {
  if (!items.length) {
    return '📂 No hay archivos.'
  }

  return items.map(item => (
    `🔢 *N.º ${item.id}*\n` +
    `📁 Tipo: ${item.type}\n` +
    `📅 Fecha: ${item.date}\n` +
    `📄 Archivo: ${item.filename}` +
    (
      item.deletedAt
        ? `\n🗑️ Eliminado: ${item.deletedAt}`
        : ''
    )
  )).join('\n\n')
}

// ============================================================
// 🤖 COMANDOS
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
    if (!isBotOwner(m, isOwner, isROwner)) {
      return m.reply(
        '⛔ Solo los propietarios pueden usar este comando.'
      )
    }

    const cmd = String(command || '').toLowerCase()
    const sub = String(args[0] || '').toLowerCase()
    const id = String(args[1] || '')

    const list = readDB()

    // ======================================================
    // 📖 AYUDA
    // ======================================================

    if (sub === 'ayuda') {
      return m.reply(
        `🗃️ *WHATSAPP-BOT — RECUPERADOS*\n\n` +
        `♻️ ${usedPrefix}ver — Responder a multimedia\n` +
        `♻️ ${usedPrefix}r — Alias\n` +
        `📋 ${usedPrefix}recovered\n` +
        `📁 ${usedPrefix}recovered 1\n` +
        `🗑️ ${usedPrefix}recovered borrar 1\n` +
        `🗑️ ${usedPrefix}recovered papelera\n` +
        `♻️ ${usedPrefix}recovered restaurar 1\n` +
        `📋 ${usedPrefix}recoveredlist`
      )
    }

    // ======================================================
    // 🗑️ BORRAR LÓGICAMENTE
    // ======================================================

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
          '⚠️ Ese archivo ya está en la papelera.'
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

    // ======================================================
    // ♻️ RESTAURAR
    // ======================================================

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

      if (!getFilePath(item)) {
        return m.reply(
          '❌ No existe la copia física del archivo.'
        )
      }

      if (!item.deleted) {
        return m.reply(
          'ℹ️ El archivo ya está activo.'
        )
      }

      item.deleted = false
      delete item.deletedAt

      saveDB(list)

      return m.reply(
        `♻️ Archivo ${id} restaurado.`
      )
    }

    // ======================================================
    // 🗑️ PAPELERA
    // ======================================================

    if (
      cmd === 'recovered' &&
      ['papelera', 'borrados', 'deleted'].includes(sub)
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

    // ======================================================
    // 📋 CONSULTAR
    // ======================================================

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
            `🗑️ Archivo en la papelera.\n` +
            `Usá ${usedPrefix}recovered restaurar ${sub}`
          )
        }

        const sent = await sendMedia(
          conn,
          m.chat,
          item
        )

        if (!sent) {
          return m.reply(
            '❌ No pude enviar la copia guardada.'
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

    // ======================================================
    // ♻️ VER / RECUPERAR
    // ======================================================

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

      // 1. Intentar usar una copia existente.
      if (item && getFilePath(item)) {
        if (item.deleted) {
          return m.reply(
            `🗑️ El archivo está en la papelera.\n` +
            `Restauralo con ${usedPrefix}recovered restaurar ${item.id}`
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

      // 2. Descargar solamente archivos normales.
      const raw =
        m.quoted.fakeObj?.message ||
        m.quoted.message

      const info = mediaInfo(raw)

      if (!info) {
        return m.reply(
          '❌ No hay una copia disponible de ese archivo o el mensaje no contiene multimedia normal compatible.'
        )
      }

      if (!hasMediaKey(info.data)) {
        console.warn(
          '[RECOVERED] Mensaje sin mediaKey:',
          quotedId
        )

        return m.reply(
          '❌ No se puede descargar: el mensaje citado no contiene la clave multimedia. Necesitás una copia previamente guardada.'
        )
      }

      let buffer

      try {
        buffer = await downloadMedia(info)
      } catch (error) {
        console.error(
          '[RECOVERED] Error descargando:',
          error?.message || error
        )

        return m.reply(
          '❌ WhatsApp no permitió descargar el archivo. Puede haber caducado o faltarle información.'
        )
      }

      item = saveMedia({
        buffer,
        type: info.type,
        extension: info.extension,
        chat: quotedChat,
        sender: m.quoted.sender,
        messageId: quotedId,
        mimetype: info.data.mimetype
      })

      const sent = await distribute(
        conn,
        m.chat,
        item
      )

      if (!sent) {
        return m.reply(
          '⚠️ El archivo se guardó, pero no pude enviarlo.'
        )
      }

      return
    }

  } catch (error) {
    console.error(
      '[RECOVERED] Error general:',
      error
    )

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

handler.register = false

export default handler
