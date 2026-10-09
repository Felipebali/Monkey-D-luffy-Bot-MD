// 📂 plugins/_m.js
// 📥 M SIN PREFIJO
// 👑 Solo owners
// 💾 Almacenamiento independiente
// 📋 Historial de recuperaciones y borrados
// ♻️ Restaurar archivos sin perder la copia
// 🚫 Sin reacciones
// ============================================================

import fs from 'fs'
import path from 'path'
import { webp2png } from '../lib/webp2mp4.js'

// ============================================================
// 📌 GRUPOS CENTRALES
// ============================================================

const MEDIA_GROUPS = [
  '120363410955044864@g.us',
  '120363430366807750@g.us'
]

// ============================================================
// 💾 ALMACENAMIENTO INDEPENDIENTE
// ============================================================

const M_MEDIA_DIR = './database/m-recovered-media-files'
const M_MEDIA_DB = './database/m-recovered-media.json'

fs.mkdirSync(M_MEDIA_DIR, { recursive: true })
fs.mkdirSync(path.dirname(M_MEDIA_DB), { recursive: true })

if (!fs.existsSync(M_MEDIA_DB)) {
  fs.writeFileSync(M_MEDIA_DB, '[]', 'utf8')
}

// ============================================================
// 👑 OWNERS
// ============================================================

function getOwners() {
  return (global.owner || [])
    .map(o => Array.isArray(o) ? o[0] : o)
    .filter(Boolean)
    .map(o => String(o).replace(/[^0-9]/g, ''))
    .filter(Boolean)
}

function isOwner(m, conn) {
  const sender = String(
    conn?.decodeJid
      ? conn.decodeJid(m.sender)
      : m.sender || ''
  )

  const number = sender.split('@')[0].replace(/\D/g, '')

  return getOwners().includes(number)
}

// ============================================================
// 🗃️ BASE DE DATOS
// ============================================================

function loadDB() {
  try {
    const data = JSON.parse(
      fs.readFileSync(M_MEDIA_DB, 'utf8')
    )

    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('[M] Error leyendo base de datos:', error)
    return []
  }
}

function saveDB(list) {
  try {
    fs.writeFileSync(
      M_MEDIA_DB,
      JSON.stringify(list, null, 2),
      'utf8'
    )

    return true
  } catch (error) {
    console.error('[M] Error guardando base de datos:', error)
    return false
  }
}

// ============================================================
// 📂 RUTA SEGURA DE LOS ARCHIVOS
// ============================================================

function getFilePath(item) {
  if (!item?.filename) return null

  // Solo utilizar nombres de archivo, nunca rutas externas.
  if (path.basename(item.filename) !== item.filename) {
    return null
  }

  const filepath = path.resolve(
    M_MEDIA_DIR,
    item.filename
  )

  const root = path.resolve(M_MEDIA_DIR)
  const relative = path.relative(root, filepath)

  if (
    !relative ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    return null
  }

  return fs.existsSync(filepath) &&
    fs.statSync(filepath).isFile()
      ? filepath
      : null
}

// ============================================================
// 🔢 BUSCAR ID
// ============================================================

function getNextID(list) {
  return list.reduce(
    (max, item) => Math.max(max, Number(item.id) || 0),
    0
  ) + 1
}

function findMedia(id) {
  return loadDB().find(
    item => Number(item.id) === Number(id)
  )
}

// ============================================================
// 📄 EXTENSIÓN
// ============================================================

function getExtension(type, mime) {
  const contentType = String(mime || '').toLowerCase()

  if (type === 'video') {
    const ext = contentType.split('/')[1]?.split(';')[0]

    return ext && /^[a-z0-9.+-]+$/i.test(ext)
      ? ext
      : 'mp4'
  }

  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('jpeg')) return 'jpg'

  return 'jpg'
}

// ============================================================
// 💾 GUARDAR COPIA INDEPENDIENTE
// ============================================================

function saveRecoveredCopy({ buffer, type, mime, m }) {
  const list = loadDB()
  const id = getNextID(list)
  const extension = getExtension(type, mime)

  const filename =
    `m_${Date.now()}_${id}.${extension}`

  const filepath = path.join(M_MEDIA_DIR, filename)

  fs.writeFileSync(filepath, buffer)

  const entry = {
    id,
    filename,
    path: filepath,
    type,
    mimetype: mime || null,
    size: buffer.length,
    from: m.sender || null,
    chat: m.chat || null,
    groupId: m.isGroup ? m.chat : null,
    date: new Date().toISOString(),
    savedByM: true,
    deleted: false,
    deletedAt: null
  }

  list.push(entry)

  if (!saveDB(list)) {
    throw new Error('No se pudo registrar el archivo.')
  }

  console.log('[M] Archivo guardado:', filename)

  return entry
}

// ============================================================
// 📤 ENVIAR ARCHIVO
// ============================================================

async function sendMedia(conn, destination, item, quoted = null) {
  const filepath = getFilePath(item)

  if (!filepath) {
    throw new Error('El archivo físico no está disponible.')
  }

  const buffer = fs.readFileSync(filepath)
  const type = item.type || 'image'
  const mime = item.mimetype ||
    (type === 'video' ? 'video/mp4' : 'image/jpeg')

  const caption =
`📦 *ARCHIVO RECUPERADO*

🆔 ID: ${item.id}
📄 Archivo: ${item.filename}
📁 Tipo: ${type}
📅 Fecha: ${item.date || 'Desconocida'}`

  const options = {}

  if (type === 'video') {
    options.video = buffer
    options.mimetype = mime
    options.fileName = item.filename
    options.caption = caption
  } else {
    options.image = buffer
    options.mimetype = mime
    options.fileName = item.filename
    options.caption = caption
  }

  if (quoted) {
    await conn.sendMessage(
      destination,
      options,
      { quoted }
    )
  } else {
    await conn.sendMessage(destination, options)
  }
}

// ============================================================
// 📋 FORMATEAR REGISTRO
// ============================================================

function formatItem(item) {
  const filepath = getFilePath(item)
  const status = item.deleted
    ? '🗑️ MARCADO COMO BORRADO'
    : '✅ GUARDADO'

  const available = filepath
    ? '📂 Copia disponible'
    : '❌ Archivo físico no encontrado'

  return (
    `${item.deleted ? '🗑️' : '📦'} *ID ${item.id}*\n` +
    `📄 ${item.filename}\n` +
    `📁 Tipo: ${item.type || 'desconocido'}\n` +
    `📌 Estado: ${status}\n` +
    `${available}\n` +
    `📅 ${item.date || 'Fecha desconocida'}`
  )
}

// ============================================================
// 📋 LISTAR ARCHIVOS
// ============================================================

async function listMedia(m, conn, deletedOnly = false) {
  const list = loadDB()

  const filtered = list.filter(item =>
    deletedOnly
      ? item.deleted === true
      : item.deleted !== true
  )

  if (!filtered.length) {
    return conn.sendMessage(m.chat, {
      text: deletedOnly
        ? '📭 No hay archivos marcados como borrados.'
        : '📭 No hay archivos guardados.'
    }, { quoted: m })
  }

  const shown = filtered.slice(-30).reverse()

  const text =
`📦 *HISTORIAL DE MEDIOS*

📊 Total: ${filtered.length}
📋 Mostrando: ${shown.length}

━━━━━━━━━━━━━━━━━━

${shown.map(formatItem).join('\n\n━━━━━━━━━━━━━━━━━━\n\n')}

━━━━━━━━━━━━━━━━━━

👁️ Ver: *m ver ID*
♻️ Recuperar: *m recuperar ID*
🗑️ Marcar borrado: *m borrar ID*`

  return conn.sendMessage(m.chat, { text }, { quoted: m })
}

// ============================================================
// 📋 MENÚ
// ============================================================

async function showMenu(m, conn) {
  const list = loadDB()

  const active = list.filter(item => item.deleted !== true)
  const deleted = list.filter(item => item.deleted === true)

  const available = list.filter(item => getFilePath(item)).length

  const text =
`╭━━━〔 📦 *SISTEMA M* 〕━━━╮

👑 *ADMINISTRACIÓN DE MEDIOS*

📊 Total registrado: ${list.length}
✅ Activos: ${active.length}
🗑️ Marcados como borrados: ${deleted.length}
💾 Copias físicas disponibles: ${available}

━━━━━━━━━━━━━━━━━━

📥 *1. RECUPERAR MULTIMEDIA*

Respondé a una imagen, video o sticker
y escribí:

➜ *m*

El archivo se guarda y se envía
a los dos grupos centrales.

━━━━━━━━━━━━━━━━━━

📋 *2. HISTORIAL*

➜ *m lista*
Ver archivos guardados.

➜ *m borrados*
Ver archivos marcados como borrados.

➜ *m ver 5*
Volver a ver el archivo ID 5 en este chat.

━━━━━━━━━━━━━━━━━━

♻️ *3. RECUPERAR OTRA VEZ*

➜ *m recuperar 5*

Restaura el estado del archivo y vuelve
a enviarlo a los grupos centrales.

━━━━━━━━━━━━━━━━━━

🗑️ *4. BORRADO SEGURO*

➜ *m borrar 5*

Lo marca como borrado, pero conserva
el archivo físico para poder recuperarlo.

━━━━━━━━━━━━━━━━━━

📂 *ALMACENAMIENTO INDEPENDIENTE*

📁 ${M_MEDIA_DIR}
🗃️ ${M_MEDIA_DB}

🔒 No utiliza la base de media-admin.js.

╰━━━━━━━━━━━━━━━━━━━━━━╯`

  return conn.sendMessage(m.chat, {
    text
  }, { quoted: m })
}

// ============================================================
// 🗑️ MARCAR ARCHIVO COMO BORRADO
// ============================================================

async function markDeleted(m, conn, id) {
  const list = loadDB()
  const item = list.find(
    entry => Number(entry.id) === Number(id)
  )

  if (!item) {
    return conn.sendMessage(m.chat, {
      text: `❌ No existe el archivo ID ${id}.`
    }, { quoted: m })
  }

  if (item.deleted) {
    return conn.sendMessage(m.chat, {
      text:
`🗑️ El archivo ID ${id} ya está marcado como borrado.

💾 La copia se conserva.
♻️ Podés usar *m recuperar ${id}*.`
    }, { quoted: m })
  }

  item.deleted = true
  item.deletedAt = new Date().toISOString()

  if (!saveDB(list)) {
    return conn.sendMessage(m.chat, {
      text: '❌ No se pudo actualizar el historial.'
    }, { quoted: m })
  }

  return conn.sendMessage(m.chat, {
    text:
`🗑️ *ARCHIVO MARCADO COMO BORRADO*

🆔 ID: ${item.id}
📄 Archivo: ${item.filename}

💾 La copia física se conserva.
♻️ Para recuperarlo: *m recuperar ${item.id}*`
  }, { quoted: m })
}

// ============================================================
// ♻️ RECUPERAR ARCHIVO MARCADO COMO BORRADO
// ============================================================

async function restoreMedia(m, conn, id) {
  const list = loadDB()
  const item = list.find(
    entry => Number(entry.id) === Number(id)
  )

  if (!item) {
    return conn.sendMessage(m.chat, {
      text: `❌ No existe el archivo ID ${id}.`
    }, { quoted: m })
  }

  if (!getFilePath(item)) {
    return conn.sendMessage(m.chat, {
      text:
`❌ No se encuentra la copia física del archivo ID ${id}.

El registro existe, pero el archivo no está disponible.`
    }, { quoted: m })
  }

  try {
    // Primero comprobar que el archivo puede leerse.
    fs.accessSync(getFilePath(item), fs.constants.R_OK)

    // Volver a enviar a los grupos centrales.
    for (const destination of MEDIA_GROUPS) {
      await sendMedia(conn, destination, item)
    }

    item.deleted = false
    item.deletedAt = null
    item.restoredAt = new Date().toISOString()

    if (!saveDB(list)) {
      console.error('[M] No se pudo actualizar el estado restaurado.')
    }

    return conn.sendMessage(m.chat, {
      text:
`♻️ *ARCHIVO RECUPERADO NUEVAMENTE*

🆔 ID: ${item.id}
📄 Archivo: ${item.filename}

✅ Enviado a los grupos centrales.
💾 La copia independiente se conserva.`
    }, { quoted: m })

  } catch (error) {
    console.error('[M] Error restaurando archivo:', error)

    return conn.sendMessage(m.chat, {
      text: '❌ No se pudo volver a enviar el archivo.'
    }, { quoted: m })
  }
}

// ============================================================
// 👁️ VER ARCHIVO GUARDADO EN EL CHAT ACTUAL
// ============================================================

async function viewMedia(m, conn, id) {
  const item = findMedia(id)

  if (!item) {
    return conn.sendMessage(m.chat, {
      text: `❌ No existe el archivo ID ${id}.`
    }, { quoted: m })
  }

  if (!getFilePath(item)) {
    return conn.sendMessage(m.chat, {
      text: `❌ La copia física del archivo ID ${id} no está disponible.`
    }, { quoted: m })
  }

  try {
    await sendMedia(conn, m.chat, item, m)
  } catch (error) {
    console.error('[M] Error mostrando archivo:', error)

    return conn.sendMessage(m.chat, {
      text: '❌ No se pudo mostrar el archivo.'
    }, { quoted: m })
  }
}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

let handler = async (m, { conn }) => {
  const text = String(m.text || '').trim()

  // Acepta únicamente los comandos sin prefijo: m y mm.
  if (!/^(?:m|mm)(?:\s+.*)?$/i.test(text)) return

  if (!isOwner(m, conn)) return

  const parts = text.split(/\s+/)
  const command = String(parts[0] || '').toLowerCase()
  const action = String(parts[1] || '').toLowerCase()
  const id = Number(parts[2])

  // ==========================================================
  // 📋 MENÚ: SOLO CON "mm"
  // ==========================================================

  if (command === 'mm') {
    return showMenu(m, conn)
  }

  // El comando m sin argumentos queda reservado para recuperar
  // multimedia citada. Las acciones administrativas usan m + acción.
  if (command !== 'm') return

  // ==========================================================
  // 📋 LISTADOS
  // ==========================================================

  if (['lista', 'listar', 'list', 'historial'].includes(action)) {
    return listMedia(m, conn, false)
  }

  if (['borrados', 'eliminados', 'papelera'].includes(action)) {
    return listMedia(m, conn, true)
  }

  // ==========================================================
  // 👁️ VER ARCHIVO
  // ==========================================================

  if (['ver', 'view'].includes(action)) {
    if (!Number.isInteger(id) || id < 1) {
      return conn.sendMessage(m.chat, {
        text: 'Usá *m ver ID*. Ejemplo: *m ver 5*.'
      }, { quoted: m })
    }

    return viewMedia(m, conn, id)
  }

  // ==========================================================
  // 🗑️ MARCAR BORRADO
  // ==========================================================

  if (['borrar', 'eliminar', 'delete', 'del'].includes(action)) {
    if (!Number.isInteger(id) || id < 1) {
      return conn.sendMessage(m.chat, {
        text: 'Usá *m borrar ID*. Ejemplo: *m borrar 5*.'
      }, { quoted: m })
    }

    return markDeleted(m, conn, id)
  }

  // ==========================================================
  // ♻️ RECUPERAR DE NUEVO
  // ==========================================================

  if (['recuperar', 'restaurar', 'restore'].includes(action)) {
    if (!Number.isInteger(id) || id < 1) {
      return conn.sendMessage(m.chat, {
        text: 'Usá *m recuperar ID*. Ejemplo: *m recuperar 5*.'
      }, { quoted: m })
    }

    return restoreMedia(m, conn, id)
  }

  // ==========================================================
  // 📥 RECUPERAR NUEVA MULTIMEDIA
  // ==========================================================

  if (action) return

  try {
    const q = m.quoted
    if (!q) return

    const mime = String(
      q.mimetype || q.mediaType || ''
    ).toLowerCase()

    if (!/webp|image|video/i.test(mime)) return

    let buffer = await q.download()

    if (!buffer?.length) return

    let type
    let sendMime = mime

    // Sticker WebP: convertir a PNG.
    if (/webp/i.test(mime)) {
      const result = await webp2png(buffer)
      if (!result?.url) return

      const response = await fetch(result.url)
      if (!response.ok) return

      buffer = Buffer.from(await response.arrayBuffer())
      if (!buffer.length) return

      type = 'image'
      sendMime = 'image/png'
    } else if (mime.startsWith('image/')) {
      type = 'image'
    } else if (mime.startsWith('video/')) {
      type = 'video'
    } else {
      return
    }

    // Guardar antes de enviar.
    let entry

    try {
      entry = saveRecoveredCopy({
        buffer,
        type,
        mime: sendMime,
        m
      })
    } catch (error) {
      console.error('[M] Falló el guardado:', error)
      return
    }

    // Enviar a los dos grupos centrales.
    for (const destination of MEDIA_GROUPS) {
      await sendMedia(conn, destination, entry)
    }

    console.log('[M] Recuperación completada. ID:', entry.id)
    return

  } catch (error) {
    // No se envían avisos de error para la recuperación simple.
    console.error('[M] Error recuperando multimedia:', error)
    return
  }
}

// ============================================================
// 🔤 PREFIJO PERSONALIZADO: M SIN PREFIJO
// ============================================================

// "m" recupera multimedia.
// "mm" abre el menú.
handler.customPrefix = /^(?:m|mm)(?:\s+.*)?$/i
handler.command = new RegExp()

handler.help = [
  'm',
  'mm',
  'm lista',
  'm borrados',
  'm ver <ID>',
  'm borrar <ID>',
  'm recuperar <ID>'
]

handler.tags = ['owner']

export default handler
