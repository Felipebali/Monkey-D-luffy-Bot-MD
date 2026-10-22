
 // 📂 plugins/antiestado.js
 // 🛡️ WHATSAPP-BOT — ANTIESTADO
 // Activar/desactivar con .antiestado
 // Detecta GroupStatusMention cuando Baileys lo recibe.

import fs from 'fs'
import path from 'path'

const dir = './database'
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

const file = path.join(dir, 'antiestado.json')
if (!fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify({}, null, 2))
}

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

function saveDB(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
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

function isOwner(conn, jid) {
  const owners = global.owner || []
  const senderDigits = digits(normalizeJid(conn, jid))

  return owners.some(owner => {
    if (Array.isArray(owner)) owner = owner[0]
    if (typeof owner !== 'string') return false

    return digits(owner) === senderDigits && senderDigits !== ''
  })
}

function unwrapMessage(message) {
  let current = message

  for (let i = 0; i < 10 && current; i++) {
    if (
      current.groupStatusMentionMessage ||
      current.groupStatusMention
    ) return current

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
  ) return true

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
    jid &&
    jid !== groupJid
  )

  return sender ? normalizeJid(conn, sender) : null
}

async function isGroupAdmin(conn, groupJid, jid) {
  if (!jid) return false

  try {
    const metadata = await conn.groupMetadata(groupJid)
    const senderDigits = digits(jid)

    const participant = (metadata.participants || []).find(p => {
      const ids = [p.id, p.jid, p.phoneNumber, p.lid].filter(Boolean)

      return ids.some(id =>
        normalizeJid(conn, id) === normalizeJid(conn, jid) ||
        (
          digits(id) &&
          digits(id) === senderDigits
        )
      )
    })

    return Boolean(
      participant &&
      (
        participant.admin === 'admin' ||
        participant.admin === 'superadmin' ||
        participant.isAdmin ||
        participant.isSuperAdmin
      )
    )
  } catch (error) {
    console.error('[ANTIESTADO] Error consultando grupo:', error)
    return false
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

    // Solo actuar si está activado en ese grupo.
    const config = loadDB()
    if (config[groupJid] !== true) return

    const senderJid = getSenderJid(conn, event, msg, groupJid)
    if (!senderJid) return

    const botJid = normalizeJid(conn, conn.user?.id || '')

    // No actuar sobre el propio bot.
    if (
      botJid &&
      (
        senderJid === botJid ||
        digits(senderJid) === digits(botJid)
      )
    ) return

    const owner = isOwner(conn, senderJid)
    const admin = await isGroupAdmin(conn, groupJid, senderJid)

    // Intentar borrar el mensaje de notificación, si su clave es válida.
    // Esto no garantiza que se borre el estado original.
    const key = msg?.key

    if (
      key?.id &&
      key?.remoteJid === groupJid
    ) {
      try {
        await conn.sendMessage(groupJid, { delete: key })
      } catch (error) {
        console.error('[ANTIESTADO] No se pudo borrar la notificación:', error)
      }
    }

    // Owner y administradores: no expulsar.
    if (owner || admin) return

    // Usuario normal: expulsar solo si el bot es administrador.
    const botAdmin = await isGroupAdmin(conn, groupJid, botJid)

    if (!botAdmin) {
      console.warn('[ANTIESTADO] El bot no es administrador:', groupJid)
      return
    }

    try {
      await conn.groupParticipantsUpdate(
        groupJid,
        [senderJid],
        'remove'
      )
    } catch (error) {
      console.error('[ANTIESTADO] No se pudo expulsar al usuario:', error)
    }
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

  // Disponible únicamente si el fork de Baileys emite este evento.
  conn.ev.on('GroupStatusMention', async event => {
    await processGroupStatusMention(conn, event)
  })

  console.log('[ANTIESTADO] Detectores registrados.')
}

const handler = async (m, { conn, command }) => {
  // Registrar el detector cuando el framework ejecuta el plugin.
  registerListeners(conn)

  if (command !== 'antiestado') return

  if (!m.isGroup) {
    return m.reply('🛡️ Usá .antiestado dentro del grupo que quieras configurar.')
  }

  const sender = normalizeJid(conn, m.sender)
  const owner = isOwner(conn, sender)
  const admin = await isGroupAdmin(conn, m.chat, sender)

  if (!owner && !admin) {
    return m.reply('🔒 Solo los administradores del grupo o el owner pueden usar .antiestado.')
  }

  const db = loadDB()
  const enabled = db[m.chat] !== true

  db[m.chat] = enabled
  saveDB(db)

  return m.reply(
    enabled
      ? '🛡️ ANTIESTADO ACTIVADO\n\nSe vigilarán las menciones al grupo que el bot pueda detectar.'
      : '🔓 ANTIESTADO DESACTIVADO\n\nLa protección quedó apagada en este grupo.'
  )
}

handler.command = ['antiestado']
export default handler
