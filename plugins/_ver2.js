// 📂 plugins/_ver.js
// 📦 Recuperación y administración de archivos recuperados
// Comandos: .ver, .r, .recovered, .recoveredlist
// Sistema independiente de media-admin.js
// ============================================================

import fs from 'fs'
import path from 'path'

const RECOVERED_DIR = './database/recovered-media-files'

if (!fs.existsSync(RECOVERED_DIR)) {
  fs.mkdirSync(RECOVERED_DIR, { recursive: true })
}

// ============================================================
// 👑 PROPIETARIOS
// ============================================================

function getOwners() {
  const owners = global.owner || []

  return owners.map(owner => {
    const value = Array.isArray(owner) ? owner[0] : owner
    return String(value || '').replace(/\D/g, '')
  }).filter(Boolean)
}

function isOwner(m) {
  const sender = String(m.sender || '').split('@')[0].replace(/\D/g, '')
  return getOwners().includes(sender)
}

// ============================================================
// 🗃️ BASE DE DATOS INDEPENDIENTE
// ============================================================

function getRecoveredDB() {
  if (!global.db) global.db = {}
  if (!global.db.data) global.db.data = {}
  if (!Array.isArray(global.db.data.recoveredMedia)) {
    global.db.data.recoveredMedia = []
  }

  return global.db.data.recoveredMedia
}

async function saveDB() {
  if (typeof global.db?.write === 'function') {
    await global.db.write()
  }
}

function getFilePath(item) {
  if (!item) return null

  const candidates = [
    item.path,
    item.filename ? path.join(RECOVERED_DIR, item.filename) : null,
    item.filename ? path.join('./media', item.filename) : null
  ].filter(Boolean)

  return candidates.find(file => fs.existsSync(file)) || null
}

function getMediaType(quoted) {
  const type = String(quoted?.mtype || '').toLowerCase()

  if (type.includes('sticker')) return 'sticker'
  if (type.includes('image')) return 'image'
  if (type.includes('video')) return 'video'

  return null
}

// ============================================================
// 📥 RECUPERAR ARCHIVO CITADO
// .ver / .r
// ============================================================

async function recoverMedia(m, { conn }) {
  if (!isOwner(m)) {
    return conn.sendMessage(m.chat, {
      text: '⛔ *No tenés permiso para usar este comando.*'
    }, { quoted: m })
  }

  const quoted = m.quoted

  if (!quoted) {
    return conn.sendMessage(m.chat, {
      text:
`📦 *RECUPERAR ARCHIVO*

Respondé al mensaje que contiene el archivo y usá:

• *.ver*
• *.r*

Formatos admitidos: imágenes, videos y stickers.`
    }, { quoted: m })
  }

  const type = getMediaType(quoted)

  if (!type) {
    return conn.sendMessage(m.chat, {
      text: '❌ *Ese formato no está admitido.*\n\nPodés recuperar imágenes, videos o stickers.'
    }, { quoted: m })
  }

  try {
    const buffer = await quoted.download()

    if (!buffer || !buffer.length) {
      throw new Error('No se pudo descargar el archivo.')
    }

    const db = getRecoveredDB()
    const id = db.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1

    const extension = {
      sticker: 'webp',
      image: 'jpg',
      video: 'mp4'
    }[type]

    const filename = `recovered_${Date.now()}_${id}.${extension}`
    const filepath = path.join(RECOVERED_DIR, filename)

    fs.writeFileSync(filepath, buffer)

    const entry = {
      id,
      filename,
      path: filepath,
      type,
      size: buffer.length,
      chat: m.chat,
      sender: m.sender || '',
      date: new Date().toISOString()
    }

    db.push(entry)
    await saveDB()

    const caption =
`📦 *ARCHIVO RECUPERADO*

🆔 ID: ${id}
📁 Tipo: ${type}
💾 Tamaño: ${(buffer.length / 1024).toFixed(2)} KB

Usá *.recovered* para ver la lista.`

    if (type === 'sticker') {
      await conn.sendMessage(m.chat, {
        sticker: buffer
      }, { quoted: m })

      await conn.sendMessage(m.chat, {
        text: caption
      }, { quoted: m })
    } else if (type === 'image') {
      await conn.sendMessage(m.chat, {
        image: buffer,
        caption
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        video: buffer,
        caption
      }, { quoted: m })
    }

    await conn.sendMessage(m.chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error('[RECOVERED MEDIA]', error)

    return conn.sendMessage(m.chat, {
      text: '❌ *No se pudo recuperar el archivo.*'
    }, { quoted: m })
  }
}

// ============================================================
// 📋 LISTAR ARCHIVOS RECUPERADOS
// .recovered / .recoveredlist
// ============================================================

async function listRecovered(m, { conn }) {
  if (!isOwner(m)) {
    return conn.sendMessage(m.chat, {
      text: '⛔ *No tenés permiso para usar este comando.*'
    }, { quoted: m })
  }

  const db = getRecoveredDB()

  if (!db.length) {
    return conn.sendMessage(m.chat, {
      text: '📭 *Todavía no hay archivos recuperados.*\n\nRespondé a una imagen, video o sticker con *.ver*.'
    }, { quoted: m })
  }

  const lines = db.slice(-50).reverse().map(item => {
    const filepath = getFilePath(item)
    const status = filepath ? '✅' : '❌'
    const type = item.type || 'archivo'
    const date = item.date
      ? new Date(item.date).toLocaleString('es-UY')
      : 'Fecha desconocida'

    return `${status} *ID ${item.id}* — ${type}\n   📅 ${date}`
  })

  const text =
`╭━━━〔 📦 *ARCHIVOS RECUPERADOS* 〕━━━╮
│
│ 📁 Total registrado: ${db.length}
│ 📋 Mostrando los últimos ${Math.min(db.length, 50)}
│
${lines.join('\n│\n')}
│
╰━━━━━━━━━━━━━━━━━━━━━━╯

📤 *Para reenviar un archivo:*
➜ *.recovered 5*

🔄 *Para actualizar la lista:*
➜ *.recoveredlist*`

  return conn.sendMessage(m.chat, {
    text
  }, { quoted: m })
}

// ============================================================
// 📤 REENVIAR ARCHIVO POR ID
// .recovered 5
// ============================================================

async function resendRecovered(m, { conn, text }) {
  if (!isOwner(m)) {
    return conn.sendMessage(m.chat, {
      text: '⛔ *No tenés permiso para usar este comando.*'
    }, { quoted: m })
  }

  const id = Number(String(text || '').trim())

  if (!Number.isInteger(id) || id < 1) {
    return listRecovered(m, { conn })
  }

  const db = getRecoveredDB()
  const item = db.find(entry => Number(entry.id) === id)

  if (!item) {
    return conn.sendMessage(m.chat, {
      text: `❌ *No existe un archivo recuperado con el ID ${id}.*`
    }, { quoted: m })
  }

  const filepath = getFilePath(item)

  if (!filepath) {
    return conn.sendMessage(m.chat, {
      text: `❌ *El archivo ${id} ya no está disponible en el almacenamiento.*`
    }, { quoted: m })
  }

  try {
    const buffer = fs.readFileSync(filepath)
    const type = item.type || 'image'
    const caption = `📦 *ARCHIVO RECUPERADO*\n\n🆔 ID: ${item.id}`

    if (type === 'sticker') {
      await conn.sendMessage(m.chat, {
        sticker: buffer
      }, { quoted: m })
    } else if (type === 'video') {
      await conn.sendMessage(m.chat, {
        video: buffer,
        caption
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        image: buffer,
        caption
      }, { quoted: m })
    }

  } catch (error) {
    console.error('[RESEND RECOVERED]', error)

    return conn.sendMessage(m.chat, {
      text: '❌ *No se pudo reenviar el archivo.*'
    }, { quoted: m })
  }
}

// ============================================================
// 🎮 MENÚ Y COMANDOS
// ============================================================

let handler = async (m, { conn, text, command }) => {
  const cmd = String(command || '').toLowerCase()

  if (['ver', 'r'].includes(cmd)) {
    return recoverMedia(m, { conn })
  }

  if (['recoveredlist'].includes(cmd)) {
    return listRecovered(m, { conn })
  }

  if (cmd === 'recovered') {
    if (String(text || '').trim()) {
      return resendRecovered(m, { conn, text })
    }

    return listRecovered(m, { conn })
  }
}

handler.help = [
  'ver',
  'r',
  'recovered',
  'recovered <ID>',
  'recoveredlist'
]

handler.tags = ['tools', 'owner']
handler.command = /^(ver|r|recovered|recoveredlist)$/i

export default handler
