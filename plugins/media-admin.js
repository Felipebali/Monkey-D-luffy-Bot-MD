
/**
 * 📂 plugins/media-admin.js
 * 🤖 WHATSAPP-BOT — SISTEMA DE MEDIOS
 *
 * 💾 Guardado automático de medios normales
 * 📷 Imágenes
 * 🎥 Videos
 * 🎵 Audios
 * 🎙️ Notas de voz
 * 📄 Documentos
 * 👑 Comandos exclusivos para owners
 * 🔄 Sincronización persistente
 * 🛡️ Sin duplicados
 *
 * Comandos:
 * .media
 * .media list
 * .media 1
 * .media del 1
 * .media sync
 * .media limpiar
 *
 * Baileys ES Modules
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import {
  downloadContentFromMessage
} from '@whiskeysockets/baileys'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const ROOT = process.cwd()
const MEDIA_FOLDER = path.join(ROOT, 'media')
const DATABASE_DIR = path.join(ROOT, 'database')
const MEDIA_DB_FILE = path.join(DATABASE_DIR, 'media.json')

const MAX_MEDIA_SIZE = 100 * 1024 * 1024
const MAX_LIST_ITEMS = 700

fs.mkdirSync(MEDIA_FOLDER, { recursive: true })
fs.mkdirSync(DATABASE_DIR, { recursive: true })

if (!fs.existsSync(MEDIA_DB_FILE)) {
  fs.writeFileSync(MEDIA_DB_FILE, '[]', 'utf8')
}

// ============================================================
// 👑 OWNERS
// ============================================================

function normalizeJid(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+@/, '@')
    .replace('@c.us', '@s.whatsapp.net')
}

function sameJid(a, b) {
  const first = normalizeJid(a)
  const second = normalizeJid(b)

  if (!first || !second) return false
  if (first === second) return true

  if (
    first.endsWith('@lid') ||
    second.endsWith('@lid')
  ) {
    return false
  }

  return (
    first.split('@')[0] ===
    second.split('@')[0]
  )
}

function getOwners() {
  const owners = [
    ...(Array.isArray(global.owner)
      ? global.owner
      : global.owner ? [global.owner] : []),
    ...(Array.isArray(global.owners)
      ? global.owners
      : [])
  ]

  return owners.map(owner => {
    const value = Array.isArray(owner)
      ? owner[0]
      : owner?.jid || owner?.id || owner

    const id = String(value || '').trim()

    return id.includes('@')
      ? id
      : `${id.replace(/\D/g, '')}@s.whatsapp.net`
  }).filter(Boolean)
}

function isOwner(m, conn, frameworkOwner = false) {
  if (frameworkOwner === true || m.isOwner === true) {
    return true
  }

  const sender = m.sender || m.key?.participant

  return getOwners().some(owner =>
    sameJid(sender, owner)
  )
}

// ============================================================
// 📂 BASE DE DATOS
// ============================================================

function loadMediaDB() {
  try {
    const data = JSON.parse(
      fs.readFileSync(MEDIA_DB_FILE, 'utf8')
    )

    if (!Array.isArray(data)) {
      throw new Error('media.json no contiene una lista')
    }

    return data
  } catch (error) {
    console.error('[MEDIA] Error leyendo DB:', error)
    return null
  }
}

function saveMediaDB(list) {
  const temp = MEDIA_DB_FILE + '.tmp'

  try {
    fs.writeFileSync(
      temp,
      JSON.stringify(list, null, 2),
      'utf8'
    )

    fs.renameSync(temp, MEDIA_DB_FILE)

    if (!global.db) global.db = {}
    if (!global.db.data) global.db.data = {}

    global.db.data.mediaList = list

    return true
  } catch (error) {
    console.error('[MEDIA] Error guardando DB:', error)

    try {
      if (fs.existsSync(temp)) fs.unlinkSync(temp)
    } catch {}

    return false
  }
}

function getFilePath(item) {
  if (!item?.filename) return null

  const filename = path.basename(String(item.filename))

  if (filename !== item.filename) return null

  const filepath = path.join(MEDIA_FOLDER, filename)

  return fs.existsSync(filepath)
    ? filepath
    : null
}

function syncMediaDB() {
  const list = loadMediaDB()
  if (!list) return null

  const valid = list.filter(item =>
    Boolean(getFilePath(item))
  )

  if (valid.length !== list.length) {
    console.warn(
      `[MEDIA] ${list.length - valid.length} archivos no encontrados`
    )
  }

  const normalized = valid.map((item, index) => ({
    ...item,
    id: index + 1
  }))

  if (!saveMediaDB(normalized)) return null

  return normalized
}

// ============================================================
// 🔎 DETECTAR CONTENIDO MULTIMEDIA
// ============================================================

const TYPE_MAP = {
  imageMessage: 'image',
  videoMessage: 'video',
  audioMessage: 'audio',
  documentMessage: 'document'
}

function unwrapMessage(message) {
  let content = message || {}

  for (let i = 0; i < 5; i++) {
    if (
      content.viewOnceMessage ||
      content.viewOnceMessageV2 ||
      content.viewOnceMessageV2Extension
    ) {
      // Respetar los medios de visualización única.
      return null
    }

    const next =
      content.ephemeralMessage?.message ||
      content.documentWithCaptionMessage?.message ||
      content.editedMessage?.message

    if (!next) break

    content = next
  }

  return content
}

function detectMedia(m) {
  const content = unwrapMessage(m.message)

  if (!content) return null

  for (const [key, type] of Object.entries(TYPE_MAP)) {
    if (content[key]) {
      return {
        type,
        media: content[key],
        key
      }
    }
  }

  // Compatibilidad con mensajes serializados
  if (TYPE_MAP[m.mtype] && m.msg) {
    return {
      type: TYPE_MAP[m.mtype],
      media: m.msg,
      key: m.mtype
    }
  }

  return null
}

// ============================================================
// 📎 EXTENSIONES
// ============================================================

function getExtension(type, mimetype) {
  const mime = String(mimetype || '')
    .toLowerCase()
    .split(';')[0]

  const extensions = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/3gpp': '.3gp',
    'audio/ogg': '.ogg',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/aac': '.aac',
    'audio/wav': '.wav',
    'audio/amr': '.amr',
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'text/plain': '.txt'
  }

  return extensions[mime] || (
    type === 'image' ? '.jpg' :
    type === 'video' ? '.mp4' :
    type === 'audio' ? '.ogg' :
    '.bin'
  )
}

function safeFilename(name) {
  return path.basename(String(name || 'archivo'))
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 100)
}

// ============================================================
// 📥 DESCARGAR MEDIO
// ============================================================

async function downloadMedia(media, type) {
  const stream = await downloadContentFromMessage(
    media,
    type
  )

  const chunks = []
  let total = 0

  for await (const chunk of stream) {
    const buffer = Buffer.from(chunk)

    total += buffer.length

    if (total > MAX_MEDIA_SIZE) {
      throw new Error('Archivo supera el límite de 100 MB')
    }

    chunks.push(buffer)
  }

  const result = Buffer.concat(chunks)

  if (!result.length) {
    throw new Error('Descarga vacía')
  }

  return result
}

// ============================================================
// 🛡️ EVITAR DESCARGAS DUPLICADAS
// ============================================================

const processing = new Set()

function getMessageKey(m) {
  const chat = m.chat || m.key?.remoteJid || ''
  const id = m.key?.id || m.id || ''

  if (!chat || !id) return null

  return `${chat}:${id}`
}

// ============================================================
// 💾 GUARDADO AUTOMÁTICO
// ============================================================

async function saveIncomingMedia(m, conn) {
  if (!m?.message) return

  const detected = detectMedia(m)

  if (!detected) return

  const { type, media } = detected

  const messageKey = getMessageKey(m)

  if (messageKey && processing.has(messageKey)) {
    return
  }

  if (messageKey) processing.add(messageKey)

  try {
    const current = loadMediaDB()

    if (!current) return

    if (
      messageKey &&
      current.some(item => item.messageKey === messageKey)
    ) {
      return
    }

    console.log(
      `[MEDIA] Detectado ${type} en ${m.chat || 'chat'}`
    )

    const buffer = await downloadMedia(media, type)

    const mimetype = media.mimetype || (
      type === 'image' ? 'image/jpeg' :
      type === 'video' ? 'video/mp4' :
      type === 'audio' ? 'audio/ogg' :
      'application/octet-stream'
    )

    const extension = getExtension(type, mimetype)

    const uniqueName = [
      Date.now(),
      crypto.randomBytes(5).toString('hex')
    ].join('_')

    const filename = type === 'document'
      ? `${uniqueName}_${safeFilename(media.fileName)}`
      : `${uniqueName}${extension}`

    const filepath = path.join(MEDIA_FOLDER, filename)

    // Primero guardar el archivo físico.
    fs.writeFileSync(filepath, buffer)

    let groupName = null

    if (m.isGroup && conn?.groupMetadata) {
      try {
        const metadata = await conn.groupMetadata(m.chat)
        groupName = metadata?.subject || null
      } catch {}
    }

    const entry = {
      id: 0,
      filename,
      path: filepath,
      type,
      from: m.sender || m.key?.participant || null,
      groupId: m.isGroup ? m.chat : null,
      groupName,
      mimetype,
      ptt: type === 'audio' && media.ptt === true,
      messageKey,
      size: buffer.length,
      date: new Date().toLocaleString('es-UY', {
        timeZone: 'America/Montevideo'
      })
    }

    // Volver a leer para incorporar guardados anteriores.
    const latest = loadMediaDB()

    if (!latest) {
      fs.unlinkSync(filepath)
      return
    }

    if (
      messageKey &&
      latest.some(item => item.messageKey === messageKey)
    ) {
      fs.unlinkSync(filepath)
      return
    }

    entry.id = latest.length
      ? Math.max(...latest.map(item => Number(item.id) || 0)) + 1
      : 1

    latest.push(entry)

    if (!saveMediaDB(latest)) {
      fs.unlinkSync(filepath)
      return
    }

    console.log(
      `[MEDIA] ✅ Guardado ID ${entry.id}: ${filename} (${buffer.length} bytes)`
    )

  } catch (error) {
    console.error(
      '[MEDIA] ❌ Error descargando o guardando:',
      error?.stack || error
    )
  } finally {
    if (messageKey) processing.delete(messageKey)
  }
}

// ============================================================
// 📤 RECUPERAR MEDIO
// ============================================================

async function sendSavedMedia(conn, chat, item) {
  const filepath = getFilePath(item)

  if (!filepath) {
    throw new Error('Archivo no encontrado')
  }

  const buffer = fs.readFileSync(filepath)

  const caption = `📂 *MEDIO RECUPERADO*

🆔 ID: ${item.id}
📦 Tipo: ${item.type}
📄 Archivo: ${item.filename}`

  if (item.type === 'image') {
    return conn.sendMessage(chat, {
      image: buffer,
      mimetype: item.mimetype || 'image/jpeg',
      caption
    })
  }

  if (item.type === 'video') {
    return conn.sendMessage(chat, {
      video: buffer,
      mimetype: item.mimetype || 'video/mp4',
      caption
    })
  }

  if (item.type === 'audio') {
    return conn.sendMessage(chat, {
      audio: buffer,
      mimetype: item.mimetype || 'audio/ogg',
      ptt: item.ptt === true
    })
  }

  return conn.sendMessage(chat, {
    document: buffer,
    mimetype: item.mimetype || 'application/octet-stream',
    fileName: item.filename,
    caption
  })
}

// ============================================================
// 📡 COMANDOS
// ============================================================

const handler = async (m, context) => {
  const {
    conn,
    args = [],
    text = '',
    isOwner: frameworkOwner
  } = context

  if (!isOwner(m, conn, frameworkOwner)) {
    return m.reply('⛔ Comando exclusivo para owners.')
  }

  const commandArgs = args.length
    ? args
    : String(text || '').trim().split(/\s+/).filter(Boolean)

  const cmd = String(commandArgs[0] || '')
    .toLowerCase()

  let list = loadMediaDB()

  if (!list) {
    return m.reply('❌ Error leyendo media.json.')
  }

  // ========================================================
  // 📋 LISTAR MEDIOS
  // ========================================================

  if (
    !cmd ||
    ['list', 'lista', 'medias'].includes(cmd)
  ) {
    if (!list.length) {
      return m.reply(
        '📂 No hay medios guardados actualmente.'
      )
    }

    const shown = list.slice(-MAX_LIST_ITEMS).reverse()

    const lines = shown.map(item => {
      const available = getFilePath(item)
        ? '✅'
        : '⚠️'

      return `${available} *ID ${item.id}*
📦 ${item.type}
📄 ${item.filename}
👥 ${item.groupName || item.groupId || 'Privado'}
📅 ${item.date || 'Sin fecha'}`
    })

    return conn.sendMessage(m.chat, {
      text: `📁 *MEDIOS GUARDADOS*

📊 Total: ${list.length}
📋 Mostrando: ${shown.length}

━━━━━━━━━━━━━━━━━━

${lines.join('\n\n━━━━━━━━━━━━━━━━━━\n\n')}

📌 Usá *.media ID* para recuperar.`
    })
  }

  // ========================================================
  // 🔄 SINCRONIZAR
  // ========================================================

  if (
    ['sync', 'sincronizar', 'repair', 'fix'].includes(cmd)
  ) {
    const before = list.length

    list = syncMediaDB()

    if (!list) {
      return m.reply(
        '❌ No se pudo sincronizar la base de datos.'
      )
    }

    return m.reply(
      `🔄 *SINCRONIZACIÓN COMPLETADA*

📂 Antes: ${before}
📁 Disponibles: ${list.length}
🗑️ Registros sin archivo: ${before - list.length}`
    )
  }

  // ========================================================
  // 🗑️ LIMPIAR TODO
  // ========================================================

  if (
    ['clear', 'clean', 'wipe', 'limpiar'].includes(cmd)
  ) {
    const total = list.length

    if (!saveMediaDB([])) {
      return m.reply('❌ No se pudo limpiar la base de datos.')
    }

    let failed = 0

    for (const item of list) {
      const filepath = getFilePath(item)

      if (!filepath) continue

      try {
        fs.unlinkSync(filepath)
      } catch (error) {
        failed++
        console.error('[MEDIA] Error eliminando:', error)
      }
    }

    return m.reply(
      `🧹 *LIMPIEZA COMPLETADA*

🗑️ Registros eliminados: ${total}
⚠️ Errores de archivos: ${failed}`
    )
  }

  // ========================================================
  // 🗑️ ELIMINAR POR ID
  // ========================================================

  if (
    ['del', 'delete', 'rm', 'borrar', 'eliminar'].includes(cmd)
  ) {
    const ids = commandArgs.slice(1)
      .map(Number)
      .filter(id => Number.isInteger(id) && id > 0)

    if (!ids.length) {
      return m.reply(
        '⚠️ Ejemplo: *.media del 1 2 3*'
      )
    }

    const idSet = new Set(ids)

    const removed = list.filter(item =>
      idSet.has(Number(item.id))
    )

    const remaining = list.filter(item =>
      !idSet.has(Number(item.id))
    )

    if (!saveMediaDB(remaining)) {
      return m.reply('❌ No se pudieron guardar los cambios.')
    }

    let errors = 0

    for (const item of removed) {
      const filepath = getFilePath(item)

      if (!filepath) continue

      try {
        fs.unlinkSync(filepath)
      } catch {
        errors++
      }
    }

    return m.reply(
      `🗑️ *MEDIOS ELIMINADOS*

✅ Registros: ${removed.length}
⚠️ Errores: ${errors}`
    )
  }

  // ========================================================
  // 📤 RECUPERAR POR ID
  // ========================================================

  if (/^\d+$/.test(cmd)) {
    const id = Number(cmd)

    const item = list.find(entry =>
      Number(entry.id) === id
    )

    if (!item) {
      return m.reply(
        `❌ No existe el medio con ID ${id}.`
      )
    }

    try {
      await sendSavedMedia(conn, m.chat, item)
    } catch (error) {
      console.error('[MEDIA] Error recuperando:', error)

      return m.reply(
        '❌ No se pudo recuperar el archivo.'
      )
    }

    return
  }

  return m.reply(
    `⚙️ *COMANDOS DE MEDIOS*

.media
.media list
.media 1
.media del 1
.media sync
.media limpiar`
  )
}

// ============================================================
// 📡 ESCUCHAR MEDIOS ENTRANTES
// ============================================================

handler.all = async function (m) {
  try {
    if (!m?.message) return

    await saveIncomingMedia(m, this)
  } catch (error) {
    console.error(
      '[MEDIA] Error en handler.all:',
      error
    )
  }
}

// ============================================================
// ⚙️ EXPORTACIÓN
// ============================================================

handler.help = [
  'media',
  'media list',
  'media <id>',
  'media del <id>',
  'media sync',
  'media limpiar'
]

handler.tags = ['owner']
handler.command = ['media', 'medias']
handler.owner = true

export default handler
