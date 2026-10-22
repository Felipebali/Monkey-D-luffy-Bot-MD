
// 📂 plugins/antiestado.js
// 🛡️ WHATSAPP-BOT — ANTIESTADO
// Comando: .antiestado
// Requiere permisos de administrador para expulsar usuarios.

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

function isOwner(conn, jid) {
  const owners = global.owner || []
  const senderDigits = digits(normalizeJid(conn, jid))

  if (!senderDigits) return false

  return owners.some(owner => {
    if (Array.isArray(owner)) owner = owner[0]
    if (typeof owner !== 'string') return false

    return digits(owner) === senderDigits
  })
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

async function isGroupAdmin(conn, groupJid, jid) {
  if (!jid) return false

  try {
    const metadata = await conn.groupMetadata(groupJid)
    const senderJid = normalizeJid(conn, jid)
    const senderDigits = digits(senderJid)

    const participant = (metadata.participants || []).find(p => {
      const ids = [p.id, p.jid, p.phoneNumber, p.lid].filter(Boolean)

      return ids.some(id => {
        const normalized = normalizeJid(conn, id)

        return normalized === senderJid ||
          (
            digits(id) &&
            senderDigits &&
            digits(id) === senderDigits
          )
      })
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
    console.error('[ANTIESTADO] Error consultando administradores:', error)
    return false
  }
}

async function tryDeleteNotification(conn, groupJid, msg) {
  const key = msg?.key

  if (!key?.id || key?.remoteJid !== groupJid) {
    return false
  }

  try {
    await conn.sendMessage(groupJid, { delete: key })
    return true
  } catch (error) {
    console.error('[ANTIESTADO] No se pudo borrar la notificación:', error)
    return false
  }
}

async function sendRemovalNotice(conn, groupJid, senderJid) {
  try {
    await conn.sendMessage(groupJid, {
      text: `╭━━━〔 🚨 ANTIESTADO 〕━━━⬣

⚠️ *¡INFRACCIÓN DETECTADA!*

👤 Usuario expulsado: @${digits(senderJid)}

📌 Motivo: Mencionar al grupo mediante un estado de WhatsApp.

⛔ Sanción: Expulsión del grupo.

🛡️ Respetá las reglas para evitar sanciones.

╰━━━━━━━━━━━━━━━━⬣
        💜 WHATSAPP-BOT`,
      mentions: [senderJid]
    })

    console.log('[ANTIESTADO] Aviso de expulsión enviado.')
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

    const config = loadDB()
    if (config[groupJid] !== true) return

    const senderJid = getSenderJid(conn, event, msg, groupJid)
    if (!senderJid) {
      console.warn('[ANTIESTADO] Se detectó una mención, pero no se identificó al autor.')
      return
    }

    const botJid = normalizeJid(conn, conn.user?.id || '')

    if (
      botJid &&
      (
        senderJid === botJid ||
        digits(senderJid) === digits(botJid)
      )
    ) {
      return
    }

    const owner = isOwner(conn, senderJid)
    const admin = await isGroupAdmin(conn, groupJid, senderJid)

    // Intentar borrar la notificación.
    // Esto no garantiza que se elimine el estado original.
    await tryDeleteNotification(conn, groupJid, msg)

    // El owner y los administradores no son expulsados.
    if (owner || admin) return

    // Verificar los permisos del bot.
    const botAdmin = await isGroupAdmin(conn, groupJid, botJid)

    if (!botAdmin) {
      console.warn('[ANTIESTADO] El bot no es administrador:', groupJid)
      return
    }

    try {
      const result = await conn.groupParticipantsUpdate(
        groupJid,
        [senderJid],
        'remove'
      )

      console.log('[ANTIESTADO] Resultado de expulsión:', result)

      // Si la API devuelve un estado explícito de error,
      // no publicar un aviso afirmando que fue expulsado.
      const participantResult = Array.isArray(result)
        ? result.find(p =>
            p.jid === senderJid ||
            p.id === senderJid ||
            p.phoneNumber === senderJid
          )
        : null

      const status = participantResult?.status

      if (
        status != null &&
        String(status) !== '200'
      ) {
        console.warn(
          '[ANTIESTADO] WhatsApp devolvió un estado no exitoso:',
          participantResult
        )
        return
      }

      // Separado de la expulsión para que un error del aviso
      // no se confunda con un error al expulsar.
      await sendRemovalNotice(conn, groupJid, senderJid)

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

  // Solo funcionará si la versión o el fork de Baileys
  // emite este evento.
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
  const owner = isOwner(conn, sender)
  const admin = await isGroupAdmin(conn, m.chat, sender)

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

✅ La protección de este grupo está activada.

👁️ Se vigilarán las menciones al grupo en estados que Baileys permita detectar.

⚖️ *REGLAS DEL SISTEMA*

👑 Owners y administradores: exentos de expulsión.
🚫 Usuarios normales: podrán ser expulsados si se detecta la infracción y el bot tiene permisos.

💠 La detección depende de los eventos que reciba el bot.

╰━━━━━━━━━━━━━━━━⬣
        💜 WHATSAPP-BOT`
      : `╭━━━〔 🔓 ANTIESTADO DESACTIVADO 〕━━━⬣

💤 La protección automática de este grupo quedó desactivada.

📌 El sistema dejará de actuar mientras esté apagado.

🛡️ Podrás volver a activarlo con .antiestado.

╰━━━━━━━━━━━━━━━━⬣
        💜 WHATSAPP-BOT`
  )
}

handler.command = ['antiestado']
export default handler
