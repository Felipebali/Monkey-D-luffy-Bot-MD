// 📂 plugins/propietario-listanegra.js
// 🛡️ whatsapp-bot — Lista negra global del propietario
//
// Comandos:
// .ln @usuario [motivo]  → agregar y expulsar de los grupos
// .unln @usuario         → quitar de la lista negra
// .unln <número>         → quitar usando el número de la lista
// .vln                   → ver lista negra
// .clrn                  → vaciar la lista negra
//
// Automatizaciones:
// • Expulsión al hablar, entrar o ser citado en un grupo.
// • Expulsión global con concurrencia limitada para acelerar el proceso.
// • Base de datos persistente en ./database/blacklist.json

import fs from 'fs'
import path from 'path'

const DATABASE_DIR = path.resolve('./database')
const BLACKLIST_FILE = path.join(DATABASE_DIR, 'blacklist.json')
const MAX_CONCURRENT_KICKS = 5

const activeKicks = new Set()

if (!fs.existsSync(DATABASE_DIR)) {
  fs.mkdirSync(DATABASE_DIR, { recursive: true })
}

if (!fs.existsSync(BLACKLIST_FILE)) {
  fs.writeFileSync(BLACKLIST_FILE, '{}', 'utf8')
}

function normalizeJid(value = '') {
  if (!value) return null

  const jid = String(value).trim().replace(/^\+/, '')

  if (!jid) return null

  if (jid.endsWith('@c.us')) {
    return jid.replace('@c.us', '@s.whatsapp.net')
  }

  if (jid.includes('@')) return jid

  const digits = jid.replace(/\D/g, '')

  return digits ? `${digits}@s.whatsapp.net` : null
}

function digitsOnly(value = '') {
  return String(value).replace(/\D/g, '')
}

function readBlacklist() {
  try {
    const parsed = JSON.parse(
      fs.readFileSync(BLACKLIST_FILE, 'utf8')
    )

    return parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
      ? parsed
      : {}
  } catch (error) {
    console.error(
      '[whatsapp-bot] No se pudo leer blacklist.json:',
      error?.message || error
    )

    return {}
  }
}

function writeBlacklist(data) {
  const tempFile = `${BLACKLIST_FILE}.tmp`

  try {
    fs.writeFileSync(
      tempFile,
      JSON.stringify(data, null, 2),
      'utf8'
    )

    fs.renameSync(tempFile, BLACKLIST_FILE)

    return true
  } catch (error) {
    console.error(
      '[whatsapp-bot] No se pudo guardar la lista negra:',
      error?.message || error
    )

    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }
    } catch {}

    return false
  }
}

function isBanned(db, jid) {
  const normalized = normalizeJid(jid)

  if (!normalized) return null

  if (db[normalized]?.banned === true) {
    return {
      jid: normalized,
      data: db[normalized]
    }
  }

  const digits = digitsOnly(normalized)

  if (digits) {
    const match = Object.entries(db).find(([savedJid, data]) =>
      data?.banned === true &&
      !String(savedJid).includes('@lid') &&
      digitsOnly(savedJid) === digits
    )

    if (match) {
      return {
        jid: match[0],
        data: match[1]
      }
    }
  }

  return null
}

function participantMatches(participant, targetJid) {
  if (!participant || !targetJid) return false

  const target = normalizeJid(targetJid)
  const targetDigits = digitsOnly(targetJid)

  const ids = [
    participant.id,
    participant.jid,
    participant.lid,
    participant.phoneNumber,
    participant.phone
  ]
    .filter(Boolean)
    .map(String)

  if (
    target &&
    ids.some(id => normalizeJid(id) === target)
  ) {
    return true
  }

  if (targetDigits) {
    return ids.some(id => {
      const normalized = normalizeJid(id)

      if (!normalized || normalized.includes('@lid')) {
        return false
      }

      const digits = digitsOnly(normalized)

      return digits && digits === targetDigits
    })
  }

  return false
}

function getParticipantJid(participant) {
  return normalizeJid(
    participant?.id ||
    participant?.jid ||
    participant?.lid ||
    participant?.phoneNumber ||
    participant?.phone
  )
}

async function kickUser(
  conn,
  groupJid,
  targetJid,
  reason = 'Sin motivo especificado',
  notify = true
) {
  const lockKey =
    `${groupJid}:${normalizeJid(targetJid) || targetJid}`

  if (activeKicks.has(lockKey)) return false

  activeKicks.add(lockKey)

  try {
    const metadata = await conn.groupMetadata(groupJid)

    const participants = metadata?.participants || []

    const participant = participants.find(
      p => participantMatches(p, targetJid)
    )

    if (!participant) return false

    const botJid = normalizeJid(
      conn.user?.id || conn.user?.jid
    )

    const botParticipant = participants.find(
      p => participantMatches(p, botJid)
    )

    if (botParticipant && !botParticipant.admin) {
      return false
    }

    const removalJid = getParticipantJid(participant)

    if (!removalJid) return false

    await conn.groupParticipantsUpdate(
      groupJid,
      [removalJid],
      'remove'
    )

    if (notify) {
      const display = removalJid.split('@')[0]

      await conn.sendMessage(groupJid, {
        text:
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ 🚫 *Usuario de lista negra*
┃
┃ 👤 @${display}
┃ 📝 *Motivo:* ${reason || 'Sin motivo especificado'}
┃ ⚡ *Acción:* expulsión automática
╰━━━━━━━━━━━━━━━━━━⬣`,
        mentions: [removalJid]
      }).catch(() => {})
    }

    return true
  } catch (error) {
    console.error(
      `[whatsapp-bot] No se pudo expulsar en ${groupJid}:`,
      error?.message || error
    )

    return false
  } finally {
    activeKicks.delete(lockKey)
  }
}

async function runWithConcurrency(items, limit, task) {
  let cursor = 0

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++

        try {
          await task(items[index], index)
        } catch {}
      }
    }
  )

  await Promise.all(workers)
}

function getBannedList(db) {
  return Object.entries(db)
    .filter(([, data]) => data?.banned === true)
    .sort(
      (a, b) =>
        Number(a[1]?.addedAt || 0) -
        Number(b[1]?.addedAt || 0)
    )
}

function getTargetFromMessage(m, text = '') {
  if (m.quoted?.sender || m.quoted?.participant) {
    return normalizeJid(
      m.quoted.sender || m.quoted.participant
    )
  }

  if (
    Array.isArray(m.mentionedJid) &&
    m.mentionedJid.length
  ) {
    return normalizeJid(m.mentionedJid[0])
  }

  const digits = digitsOnly(text)

  if (digits.length >= 5) {
    return normalizeJid(digits)
  }

  return null
}

function getReason(text = '') {
  return String(text)
    .replace(/@\S+/g, '')
    .replace(/\b\d{5,}\b/g, '')
    .trim() || 'Sin motivo especificado'
}

const handler = async (m, { conn, command, text = '' }) => {
  const cmd = String(command || '')
    .toLowerCase()
    .replace(/^\./, '')
    .trim()

  if (!['ln', 'unln', 'vln', 'clrn'].includes(cmd)) {
    return
  }

  const SEP = '━━━━━━━━━━━━━━━━━━'
  const db = readBlacklist()
  const list = getBannedList(db)

  try {
    await m.react(
      ({
        ln: '🚫',
        unln: '🕊️',
        vln: '📋',
        clrn: '🧹'
      })[cmd]
    )
  } catch {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📋 VER LISTA NEGRA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (cmd === 'vln') {
    if (!list.length) {
      return conn.reply(
        m.chat,
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ 📋 *Lista negra*
┃
┃ ✅ No hay usuarios registrados.
╰━━━━━━━━━━━━━━━━━━⬣`,
        m
      )
    }

    const MAX_SHOWN = 35
    const shown = list.slice(0, MAX_SHOWN)
    const mentions = []

    let msg =
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ 📋 *LISTA NEGRA*
┃ 👥 *Registrados:* ${list.length}
${SEP}
`

    shown.forEach(([jid, data], index) => {
      const display = String(jid).split('@')[0]

      const reason = String(
        data?.reason || 'Sin motivo especificado'
      )
        .replace(/\n/g, ' ')
        .slice(0, 120)

      msg +=
`┃ *${String(index + 1).padStart(2, '0')}.* @${display}
┃   └ 📝 ${reason}
`

      mentions.push(jid)
    })

    if (list.length > MAX_SHOWN) {
      msg +=
`┃
┃ … y ${list.length - MAX_SHOWN} usuario(s) más.
┃ Usá *.unln número* para quitar por posición.
`
    }

    msg += `${SEP}\n╰━━⬣ *whatsapp-bot*`

    return conn.sendMessage(m.chat, {
      text: msg,
      mentions
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🧹 LIMPIAR LISTA NEGRA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (cmd === 'clrn') {
    if (!list.length) {
      return conn.reply(
        m.chat,
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ ℹ️ *Lista negra*
┃ La lista ya está vacía.
╰━━━━━━━━━━━━━━━━━━⬣`,
        m
      )
    }

    for (const jid of Object.keys(db)) {
      if (db[jid]) {
        db[jid].banned = false
      }
    }

    if (!writeBlacklist(db)) {
      return conn.reply(
        m.chat,
        '❌ No se pudo guardar el cambio. Revisá los permisos de la carpeta database.',
        m
      )
    }

    return conn.reply(
      m.chat,
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ 🧹 *LISTA NEGRA VACIADA*
┃
┃ ✅ Se desactivaron *${list.length}* registro(s).
┃ ℹ️ Los registros quedan guardados en la base de datos.
╰━━━━━━━━━━━━━━━━━━⬣`,
      m
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 👤 IDENTIFICAR USUARIO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let targetJid = null
  const cleanText = String(text).trim()

  if (
    cmd === 'unln' &&
    /^\d+$/.test(cleanText)
  ) {
    const index = Number(cleanText) - 1

    if (!list[index]) {
      return conn.reply(
        m.chat,
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ ⚠️ *Número inválido*
┃ Elegí una posición entre *1* y *${list.length}*.
╰━━━━━━━━━━━━━━━━━━⬣`,
        m
      )
    }

    targetJid = list[index][0]
  } else {
    targetJid = getTargetFromMessage(m, cleanText)
  }

  if (!targetJid) {
    const usage = cmd === 'ln'
      ? 'Respondé al mensaje de la persona o mencionála.\nEjemplo: *.ln @usuario spam*'
      : 'Respondé al mensaje, mencioná a la persona o usá su número de lista.\nEjemplo: *.unln 2*'

    return conn.reply(
      m.chat,
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ ⚠️ *Falta indicar el usuario*
┃
┃ ${usage.replace(/\n/g, '\n┃ ')}
╰━━━━━━━━━━━━━━━━━━⬣`,
      m
    )
  }

  // Para agregar, exigir mención o respuesta.
  if (
    cmd === 'ln' &&
    !m.quoted &&
    !(m.mentionedJid || []).length
  ) {
    return conn.reply(
      m.chat,
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ ⚠️ *Indicá al usuario*
┃ Respondé a su mensaje o mencioná su perfil.
┃ No se agrega a la lista usando solo texto numérico.
╰━━━━━━━━━━━━━━━━━━⬣`,
      m
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚫 AGREGAR A LISTA NEGRA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (cmd === 'ln') {
    const reason = getReason(cleanText)
    const existing = isBanned(db, targetJid)
    const storedJid = existing?.jid || targetJid

    db[storedJid] = {
      ...(db[storedJid] || {}),
      banned: true,
      reason,
      addedBy: m.sender,
      addedAt: Date.now()
    }

    if (!writeBlacklist(db)) {
      return conn.reply(
        m.chat,
        '❌ No se pudo guardar la lista negra. No se inició la expulsión global.',
        m
      )
    }

    let groups = []

    try {
      const allGroups = await conn.groupFetchAllParticipating()
      groups = Object.keys(allGroups || {})
    } catch (error) {
      console.error(
        '[whatsapp-bot] No se pudieron obtener los grupos:',
        error?.message || error
      )
    }

    let kicked = 0

    await runWithConcurrency(
      groups,
      MAX_CONCURRENT_KICKS,
      async groupJid => {
        const removed = await kickUser(
          conn,
          groupJid,
          storedJid,
          reason,
          true
        )

        if (removed) kicked++
      }
    )

    return conn.sendMessage(m.chat, {
      text:
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ 🚫 *USUARIO AGREGADO*
${SEP}
┃ 👤 @${storedJid.split('@')[0]}
┃ 📝 *Motivo:* ${reason}
┃ 🌐 *Grupos revisados:* ${groups.length}
┃ ⚡ *Expulsiones realizadas:* ${kicked}
┃ 💾 *Estado:* guardado correctamente
╰━━━━━━━━━━━━━━━━━━⬣`,
      mentions: [storedJid]
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🕊️ QUITAR DE LISTA NEGRA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (cmd === 'unln') {
    const found = isBanned(db, targetJid)

    if (!found) {
      return conn.reply(
        m.chat,
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ ℹ️ *Usuario no registrado*
┃ Esa persona no figura activa en la lista negra.
╰━━━━━━━━━━━━━━━━━━⬣`,
        m
      )
    }

    db[found.jid] = {
      ...(db[found.jid] || {}),
      banned: false,
      removedAt: Date.now(),
      removedBy: m.sender
    }

    if (!writeBlacklist(db)) {
      return conn.reply(
        m.chat,
        '❌ No se pudo guardar el cambio en la lista negra.',
        m
      )
    }

    return conn.sendMessage(m.chat, {
      text:
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ 🕊️ *USUARIO LIBERADO*
${SEP}
┃ 👤 @${found.jid.split('@')[0]}
┃ ✅ Ya no se aplicará la expulsión automática.
╰━━━━━━━━━━━━━━━━━━⬣`,
      mentions: [found.jid]
    })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚫 AUTOEXPULSIÓN CUANDO HABLA O CITA A UN BLOQUEADO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

handler.all = async function (m) {
  try {
    if (!m?.isGroup || !m.chat) return

    const db = readBlacklist()

    const senderMatch = isBanned(db, m.sender)

    if (senderMatch) {
      await kickUser(
        this,
        m.chat,
        senderMatch.jid,
        senderMatch.data?.reason || 'Sin motivo especificado',
        true
      )
    }

    const quotedJid = normalizeJid(
      m.quoted?.sender || m.quoted?.participant
    )

    const quotedMatch = quotedJid && isBanned(db, quotedJid)

    if (quotedMatch) {
      await kickUser(
        this,
        m.chat,
        quotedMatch.jid,
        quotedMatch.data?.reason || 'Sin motivo especificado',
        true
      )
    }
  } catch (error) {
    console.error(
      '[whatsapp-bot] Error en revisión automática:',
      error?.message || error
    )
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚨 AUTOEXPULSIÓN AL ENTRAR AL GRUPO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

handler.before = async function (m) {
  try {
    if (
      !m?.isGroup ||
      ![27, 31].includes(m.messageStubType)
    ) {
      return
    }

    const db = readBlacklist()
    const users = m.messageStubParameters || []

    for (const user of users) {
      const match = isBanned(db, user)

      if (!match) continue

      await kickUser(
        this,
        m.chat,
        match.jid,
        match.data?.reason || 'Sin motivo especificado',
        true
      )
    }
  } catch (error) {
    console.error(
      '[whatsapp-bot] Error al revisar ingreso:',
      error?.message || error
    )
  }
}

handler.command = /^(ln|unln|vln|clrn)$/i
handler.help = [
  'ln @usuario [motivo]',
  'unln @usuario',
  'unln <número>',
  'vln',
  'clrn'
]

handler.tags = ['owner']
handler.rowner = true

export default handler
