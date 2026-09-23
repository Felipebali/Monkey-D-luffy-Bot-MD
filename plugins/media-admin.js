// 📂 plugins/media-admin.js
import fs from 'fs'
import path from 'path'

// ============================================================
// 📁 CONFIGURACIÓN
// ============================================================

const MEDIA_DB_FILE = './database/media.json'
const MEDIA_FOLDER = './media'

// Crear carpetas/archivos si no existen
if (!fs.existsSync('./database')) {
  fs.mkdirSync('./database', { recursive: true })
}

if (!fs.existsSync(MEDIA_FOLDER)) {
  fs.mkdirSync(MEDIA_FOLDER, { recursive: true })
}

if (!fs.existsSync(MEDIA_DB_FILE)) {
  fs.writeFileSync(MEDIA_DB_FILE, '[]')
}

// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {
  return (global.owner || [])
    .map(o => Array.isArray(o) ? o[0] : o)
    .filter(Boolean)
    .map(v => {
      const number = String(v).replace(/[^0-9]/g, '')
      return number ? number + '@s.whatsapp.net' : null
    })
    .filter(Boolean)
}

// ============================================================
// 📂 CARGAR BASE DE DATOS
// ============================================================

function loadMediaDB() {

  try {

    if (!fs.existsSync(MEDIA_DB_FILE)) {
      fs.writeFileSync(MEDIA_DB_FILE, '[]')
      return []
    }

    const data = JSON.parse(
      fs.readFileSync(MEDIA_DB_FILE, 'utf8')
    )

    return Array.isArray(data) ? data : []

  } catch (e) {

    console.error('[MEDIA] Error leyendo DB:', e)

    return []
  }
}

// ============================================================
// 💾 GUARDAR BASE DE DATOS
// ============================================================

function saveMediaDB(list) {

  fs.writeFileSync(
    MEDIA_DB_FILE,
    JSON.stringify(list, null, 2)
  )
}

// ============================================================
// 🧹 OBTENER RUTA DEL ARCHIVO
// ============================================================

function getFilePath(item) {

  if (item.path) {
    return item.path
  }

  return path.join(
    MEDIA_FOLDER,
    item.filename
  )
}

// ============================================================
// 🚀 HANDLER
// ============================================================

const handler = async (m, { conn, args }) => {

  try {

    // ========================================================
    // 👑 SEGURIDAD OWNER
    // ========================================================

    const sender = conn.decodeJid
      ? conn.decodeJid(m.sender)
      : m.sender

    const owners = getOwners()

    if (!owners.includes(sender)) {
      return
    }

    // ========================================================
    // 📂 CARGAR LISTA
    // ========================================================

    const list = loadMediaDB()

    // ========================================================
    // 🔎 ARGUMENTOS
    // ========================================================

    const cmd = String(args?.[0] || '')
      .toLowerCase()
      .trim()

    // ========================================================
    // 📋 LISTAR
    // .media
    // .medias
    // .media list
    // .media medias
    // ========================================================

    if (
      !cmd ||
      cmd === 'list' ||
      cmd === 'lista' ||
      cmd === 'medias'
    ) {

      if (!list.length) {

        return conn.reply(
          m.chat,
          '📂 No hay medios guardados aún.',
          m
        )
      }

      const max = Math.min(list.length, 250)

      const lines = list
        .slice(0, max)
        .map(item => {

          return (
            `🆔 *ID:* ${item.id}\n` +
            `📄 *Archivo:* ${item.filename}\n` +
            `📦 *Tipo:* ${item.type}\n` +
            `👤 *From:* ${item.from || 'Desconocido'}\n` +
            `👥 *Grupo:* ${item.groupName || item.groupId || 'Desconocido'}\n` +
            `📅 *Fecha:* ${item.date || 'Desconocida'}`
          )

        })

      const text =
`📁 *MEDIOS GUARDADOS*

Mostrando: ${max}/${list.length}

━━━━━━━━━━━━━━━━━━

${lines.join('\n\n━━━━━━━━━━━━━━━━━━\n\n')}`

      return conn.reply(
        m.chat,
        text,
        m
      )
    }

    // ========================================================
    // 🗑 BORRAR TODOS
    // .media clear
    // .media clean
    // .media wipe
    // ========================================================

    if (
      cmd === 'clear' ||
      cmd === 'clean' ||
      cmd === 'wipe' ||
      cmd === 'limpiar'
    ) {

      let count = 0

      for (const item of list) {

        const filepath = getFilePath(item)

        if (fs.existsSync(filepath)) {

          try {
            fs.unlinkSync(filepath)
            count++
          } catch (e) {
            console.error(
              '[MEDIA] No se pudo borrar:',
              filepath
            )
          }
        }
      }

      saveMediaDB([])

      return conn.reply(
        m.chat,
        `🧹 *Base de medios limpiada.*

🗑️ Archivos eliminados: *${count}*
📂 Registros eliminados: *${list.length}*`,
        m
      )
    }

    // ========================================================
    // 🗑 BORRAR UNO O VARIOS
    //
    // .media del 5
    // .media del 3 7 9
    //
    // También:
    // .media delete 5
    // .media rm 5
    // .media borrar 5
    // ========================================================

    if (
      cmd === 'del' ||
      cmd === 'delete' ||
      cmd === 'rm' ||
      cmd === 'borrar' ||
      cmd === 'eliminar'
    ) {

      const ids = args
        .slice(1)
        .map(v => parseInt(v))
        .filter(v => !isNaN(v))

      if (!ids.length) {

        return conn.reply(
          m.chat,
`❌ Debes indicar al menos un ID.

Ejemplos:

*.media del 5*

*.media del 3 7 9*

*.media borrar 10*`,
          m
        )
      }

      let deleted = 0
      let notFound = []

      for (const id of ids) {

        const index = list.findIndex(
          item => Number(item.id) === id
        )

        if (index === -1) {
          notFound.push(id)
          continue
        }

        const item = list[index]
        const filepath = getFilePath(item)

        if (fs.existsSync(filepath)) {

          try {
            fs.unlinkSync(filepath)
          } catch (e) {
            console.error(
              '[MEDIA] Error borrando archivo:',
              e
            )
          }
        }

        list.splice(index, 1)

        deleted++
      }

      saveMediaDB(list)

      let respuesta =
`🗑️ *MEDIOS ELIMINADOS*

✅ Eliminados: *${deleted}*`

      if (notFound.length) {
        respuesta +=
          `\n❌ No encontrados: *${notFound.join(', ')}*`
      }

      return conn.reply(
        m.chat,
        respuesta,
        m
      )
    }

    // ========================================================
    // 📤 ENVIAR ARCHIVO POR ID
    //
    // .media 5
    // .medias 5
    // ========================================================

    if (/^\d+$/.test(cmd)) {

      const id = parseInt(cmd)

      const item = list.find(
        x => Number(x.id) === id
      )

      if (!item) {

        return conn.reply(
          m.chat,
          `❌ No existe ningún medio con ID *${id}*.`,
          m
        )
      }

      const filepath = getFilePath(item)

      if (!fs.existsSync(filepath)) {

        return conn.reply(
          m.chat,
          `❌ El archivo del ID *${id}* no existe en el servidor.`,
          m
        )
      }

      const buffer = fs.readFileSync(filepath)

      const caption =
`📁 *MEDIO*

🆔 ID: ${item.id}
📄 Archivo: ${item.filename}
📦 Tipo: ${item.type}
👤 From: ${item.from || 'Desconocido'}
👥 Grupo: ${item.groupName || item.groupId || 'Desconocido'}
📅 Fecha: ${item.date || 'Desconocida'}`

      // ======================================================
      // 🖼️ IMAGEN
      // ======================================================

      if (item.type === 'image') {

        await conn.sendMessage(
          sender,
          {
            image: buffer,
            caption
          },
          {
            quoted: m
          }
        )

        return
      }

      // ======================================================
      // 🎥 VIDEO
      // ======================================================

      if (item.type === 'video') {

        await conn.sendMessage(
          sender,
          {
            video: buffer,
            caption,
            fileName: item.filename
          },
          {
            quoted: m
          }
        )

        return
      }

      // ======================================================
      // 🎵 AUDIO
      // ======================================================

      if (item.type === 'audio') {

        await conn.sendMessage(
          sender,
          {
            audio: buffer,
            ptt: false,
            fileName: item.filename,
            mimetype: item.mimetype || 'audio/mpeg'
          },
          {
            quoted: m
          }
        )

        return
      }

      // ======================================================
      // 📄 DOCUMENTO
      // ======================================================

      await conn.sendMessage(
        sender,
        {
          document: buffer,
          fileName: item.filename,
          mimetype: item.mimetype || 'application/octet-stream',
          caption
        },
        {
          quoted: m
        }
      )

      return
    }

    // ========================================================
    // ❓ AYUDA
    // ========================================================

    return conn.reply(
      m.chat,
`📂 *ADMINISTRADOR DE MEDIOS*

📋 *LISTAR*
• .media
• .medias
• .media list

📤 *ENVIAR*
• .media <id>
• .medias <id>

🗑️ *BORRAR*
• .media del <id>
• .media del <id> <id> <id>

🧹 *BORRAR TODO*
• .media clear
• .media clean
• .media wipe

━━━━━━━━━━━━━━━━━━

👑 Solo disponible para el owner.`,
      m
    )

  } catch (e) {

    console.error(
      '❌ MEDIA-ADMIN ERROR:',
      e
    )

    return conn.reply(
      m.chat,
      '❌ Error ejecutando el administrador de medios.',
      m
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.help = [
  'media',
  'medias'
]

handler.tags = [
  'owner'
]

handler.command = [
  'media',
  'medias'
]

handler.owner = true

export default handler
