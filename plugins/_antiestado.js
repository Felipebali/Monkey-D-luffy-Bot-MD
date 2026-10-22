
 // 📂 plugins/antiestado.js
 // 🛡️ WHATSAPP-BOT — ANTIESTADO
 // Comando: .antiestado
 // Intenta eliminar notificaciones de estados y avisa en el grupo.
 // No expulsa usuarios. Se aplica a todos por igual.

import fs from 'fs'
import path from 'path'

const DATABASE_DIR = './database'
const DATABASE_FILE = path.join(DATABASE_DIR, 'antiestado.json')

if (!fs.existsSync(DATABASE_DIR)) {
  fs.mkdirSync(DATABASE_DIR, { recursive: true })
}

if (!fs.existsSync(DATABASE_FILE)) {
  fs.writeFileSync(DATABASE_FILE, '{}', 'utf8')
}

function loadDB() {
  try {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'))
    return data && typeof data === 'object' && !Array.isArray(data)
      ? data
      : {}
  } catch {
    return {}
  }
}

function saveDB(data) {
  fs.writeFileSync(
    DATABASE_FILE,
    JSON.stringify(data, null, 2),
    'utf8'
  )
}

function normalizeJid(conn, jid) {
  if (!jid) return ''

  try {
    return conn.decodeJid ? conn.decodeJid(jid) : jid
  } catch {
    return jid
  }
}

function digits(jid) {
  return String(jid || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

function unwrapMessage(message) {
  let current = message

  for (let i = 0; i < 10 && current; i++) {
    if (
      current.groupStatusMentionMessage ||
      current.groupStatusMention
    ) {
      return current
    }

    if (current.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message
    } else if (current.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message
    } else if (current.viewOnceMessageV2?.message) {
      current = current.viewOnceMessageV2.message
    } else if (current.documentWithCaptionMessage?.message) {
      current = current.documentWithCaptionMessage.message
    } else if (current.message) {
      current = current.message
    } else {
      break
    }
  }

  return current
}

function hasGroupStatusMention(message) {
  const root = unwrapMessage(message)

  if (!root || typeof root !== 'object') return false

  if (
    root.groupStatusMentionMessage ||
    root.groupStatusMention
  ) {
    return true
  }

  return Object.keys(root).some(key =>
    /group.?status.?mention/i.test(key) &&
    root[key] != null
  )
}

function getGroupJid(event, msg) {
  const candidates = [
    event?.groupJid,
    event?.chat,
    event?.jid,
    msg?.key?.remoteJid,
    event?.key?.remoteJid
  ]

  return candidates.find(jid =>
    typeof jid === 'string' && jid.endsWith('@g.us')
  ) || null
}

function getSenderJid(conn, event, msg, groupJid) {
  const candidates = [
    event?.participant,
    event?.sender,
    event?.author,
    msg?.key?.participant,
    msg?.key?.participantAlt,
    event?.key?.participant,
    event?.key?.participantAlt
  ]

  const sender = candidates.find(jid =>
    typeof jid === 'string' &&
    jid.length > 0 &&
    jid !== groupJid &&
    !jid.endsWith('@g.us')
  )

  return sender ? normalizeJid(conn, sender) : null
}

async function tryDeleteNotification(conn, groupJid, msg) {
  const key = msg?.key

  if (!key?.id || key?.remoteJid !== groupJid) {
    console.warn('[ANTIESTADO] No hay una clave válida para borrar la notificación.')
    return false
  }

  try {
    await conn.sendMessage(groupJid, { delete: key })
    console.log('[ANTIESTADO] Solicitud de eliminación enviada.')
    return true
  } catch (error) {
    console.error('[ANTIESTADO] No se pudo borrar la notificación:', error)
    return false
  }
}

async function sendWarning(conn, groupJid, senderJid) {
  try {
    await conn.sendMessage(groupJid, {
      text: `╭━━━〔 🚫 ANTIESTADO 〕━━━⬣

⚠️ Atención: @${digits(senderJid)}

📢 *No se permiten estados mencionando a este grupo.*

🛡️ Por favor, respetá las reglas del grupo y evitá publicar estados que lo mencionen.

╰━━━━━━━━━━━━━━━━⬣
        💜 WHATSAPP-BOT`,
      mentions: [senderJid]
    })

    console.log('[ANTIESTADO] Aviso enviado al grupo.')
  } catch (error) {
    console.error('[ANTIESTADO] No se pudo enviar el aviso:', error)
  }
}

async function processGroupStatusMention(conn, event) {
  try {
    let msg = event

    if (!event?.key) {
      if (event?.messages?.[0]?.key) {
        msg = event.messages[0]
      } else if (event?.msg?.key) {
        msg = event.msg
      } else if (event?.message?.key) {
        msg = event.message
      }
    }

    const payload = msg?.message || event?.message || msg

    if (!hasGroupStatusMention(payload)) return

    const groupJid = getGroupJid(event, msg)
    if (!groupJid) return

    // Comprobar si está activado en este grupo.
    const config = loadDB()
    if (config[groupJid] !== true) return

    const senderJid = getSenderJid(
      conn,
      event,
      msg,
      groupJid
    )

    if (!senderJid) {
      console.warn('[ANTIESTADO] No se pudo identificar al autor.')
      return
    }

    const botJid = normalizeJid(conn, conn.user?.id || '')

    // Evitar procesar mensajes propios del bot.
    if (
      botJid &&
      (
        senderJid === botJid ||
        digits(senderJid) === digits(botJid)
      )
    ) {
      return
    }

    // Intentar eliminar la notificación y advertir en el grupo.
    // No se expulsa ni se sanciona automáticamente a nadie.
    await tryDeleteNotification(conn, groupJid, msg)
    await sendWarning(conn, groupJid, senderJid)

  } catch (error) {
    console.error('[ANTIESTADO] Error procesando mención:', error)
  }
}

function registerListeners(conn) {
  if (!conn?.ev?.on) return

  if (!global.antiestadoListeners) {
    global.antiestadoListeners = new WeakSet()
  }

  if (global.antiestadoListeners.has(conn)) return

  global.antiestadoListeners.add(conn)

  conn.ev.on('messages.upsert', async update => {
    for (const msg of update?.messages || []) {
      await processGroupStatusMention(conn, msg)
    }
  })

  // Funciona solo si la versión o el fork de Baileys emite este evento.
  conn.ev.on('GroupStatusMention', async event => {
    await processGroupStatusMention(conn, event)
  })

  console.log('[ANTIESTADO] Detectores registrados.')
}

const handler = async (m, { conn, command }) => {
  registerListeners(conn)

  if (command !== 'antiestado') return

  if (!m.isGroup) {
    return m.reply(
      '🛡️ Usá .antiestado dentro del grupo que quieras configurar.'
    )
  }

  const sender = normalizeJid(conn, m.sender)
  const owners = global.owner || []
  const senderDigits = digits(sender)

  const owner = owners.some(item => {
    const value = Array.isArray(item) ? item[0] : item
    return typeof value === 'string' &&
      digits(value) === senderDigits &&
      senderDigits !== ''
  })

  let admin = false

  try {
    const metadata = await conn.groupMetadata(m.chat)
    const participant = (metadata.participants || []).find(p => {
      const ids = [p.id, p.jid, p.phoneNumber, p.lid].filter(Boolean)
      return ids.some(id =>
        normalizeJid(conn, id) === sender ||
        (
          digits(id) &&
          digits(id) === senderDigits
        )
      )
    })

    admin = Boolean(
      participant &&
      (
        participant.admin === 'admin' ||
        participant.admin === 'superadmin' ||
        participant.isAdmin ||
        participant.isSuperAdmin
      )
    )
  } catch (error) {
    console.error('[ANTIESTADO] Error comprobando permisos:', error)
  }

  if (!owner && !admin) {
    return m.reply(
      '🔒 Solo los administradores del grupo o el owner pueden usar .antiestado.'
    )
  }

  const db = loadDB()
  const enabled = db[m.chat] !== true

  db[m.chat] = enabled
  saveDB(db)

  return m.reply(
    enabled
      ? `╭━━━〔 🛡️ ANTIESTADO ACTIVADO 〕━━━⬣

✅ Protección activada para este grupo.

📢 Si se detecta una mención de estado, el bot avisará en el grupo y mencionará a la persona.

👥 La regla se aplica a usuarios, administradores y owners por igual.

⚠️ No se expulsa a nadie automáticamente.

╰━━━━━━━━━━━━━━━━⬣
        💜 WHATSAPP-BOT`
      : `╭━━━〔 🔓 ANTIESTADO DESACTIVADO 〕━━━⬣

💤 La protección quedó desactivada en este grupo.

╰━━━━━━━━━━━━━━━━⬣
        💜 WHATSAPP-BOT`
  )
}

handler.command = ['antiestado']
export default handler
