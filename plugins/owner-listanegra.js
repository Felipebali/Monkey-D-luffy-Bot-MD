// 📂 plugins/propietario-listanegra.js
// 🛡️ whatsapp-bot — BLACKLIST SYSTEM
// ======================================================
// .ln @usuario motivo  → Agregar a lista negra
// .unln @usuario       → Liberar usuario
// .unln 2              → Liberar por número de lista
// .vln                 → Ver lista negra
// .clrn                → Vaciar lista negra
//
// Funciones:
// • Expulsión global de los grupos.
// • Aviso en cada grupo donde se logra expulsar.
// • Resumen de grupos revisados, expulsiones y errores.
// • Autoexpulsión al hablar o entrar al grupo.
// • Detección de usuarios citados.
// • Base de datos JSON con guardado seguro.
// ======================================================

import fs from 'fs'
import path from 'path'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ CONFIGURACIÓN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DATABASE_DIR = path.resolve('./database')
const BLACKLIST_FILE = path.join(DATABASE_DIR, 'blacklist.json')
const MAX_CONCURRENT_KICKS = 5
const MAX_LIST_ITEMS = 25

const activeKicks = new Set()

if (!fs.existsSync(DATABASE_DIR)) {
  fs.mkdirSync(DATABASE_DIR, { recursive: true })
}

if (!fs.existsSync(BLACKLIST_FILE)) {
  fs.writeFileSync(BLACKLIST_FILE, '{}', 'utf8')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧰 UTILIDADES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

function safeText(value = '', max = 100) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\u0000-\u001F]/g, '')
    .trim()
    .slice(0, max) || 'Sin especificar'
}

function readBlacklist() {
  try {
    const data = JSON.parse(
      fs.readFileSync(BLACKLIST_FILE, 'utf8')
    )

    return data &&
      typeof data === 'object' &&
      !Array.isArray(data)
      ? data
      : {}
  } catch (error) {
    console.error(
      '[whatsapp-bot] Error leyendo blacklist:',
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
      '[whatsapp-bot] Error guardando blacklist:',
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

function getBannedList(db) {
  return Object.entries(db)
    .filter(([, data]) => data?.banned === true)
    .sort(
      (a, b) =>
        Number(a[1]?.addedAt || 0) -
        Number(b[1]?.addedAt || 0)
    )
}

function findBanned(db, jid) {
  const normalized = normalizeJid(jid)

  if (!normalized) return null

  if (db[normalized]?.banned === true) {
    return { jid: normalized, data: db[normalized] }
  }

  // Comparar por teléfono cuando esté disponible.
  // No se comparan los dígitos de identificadores LID.
  if (normalized.includes('@lid')) return null

  const digits = digitsOnly(normalized)

  if (!digits) return null

  const match = Object.entries(db).find(([savedJid, data]) => {
    if (data?.banned !== true) return false
    if (String(savedJid).includes('@lid')) return false

    return digitsOnly(savedJid) === digits
  })

  return match
    ? { jid: match[0], data: match[1] }
    : null
}

function participantMatches(participant, targetJid) {
  if (!participant || !targetJid) return false

  const target = normalizeJid(targetJid)

  const ids = [
    participant.id,
    participant.jid,
    participant.lid,
    participant.phoneNumber,
    participant.phone
  ].filter(Boolean)

  if (
    target &&
    ids.some(id => normalizeJid(id) === target)
  ) {
    return true
  }

  if (!target || target.includes('@lid')) return false

  const targetDigits = digitsOnly(target)

  return ids.some(id => {
    const normalized = normalizeJid(id)

    if (!normalized || normalized.includes('@lid')) {
      return false
    }

    return digitsOnly(normalized) === targetDigits
  })
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

function getReason(text = '') {
  return String(text)
    .replace(/@\S+/g, '')
    .trim() || 'Sin motivo especificado'
}

function getTargetFromMessage(m, text = '') {
  if (m.quoted?.sender || m.quoted?.participant) {
    return normalizeJid(
      m.quoted.sender || m.quoted.participant
    )
  }

  if (m.mentionedJid?.length) {
    return normalizeJid(m.mentionedJid[0])
  }

  const digits = digitsOnly(text)

  return digits.length >= 5
    ? normalizeJid(digits)
    : null
}

function formatDate(timestamp) {
  if (!timestamp) return 'Fecha desconocida'

  try {
    return new Date(timestamp).toLocaleDateString('es-UY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return 'Fecha desconocida'
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚫 EXPULSIÓN DE UN USUARIO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function kickUser(
  conn,
  groupJid,
  targetJid,
  reason = 'Sin motivo especificado',
  notify = true
) {
  const lockKey = `${groupJid}:${targetJid}`

  if (activeKicks.has(lockKey)) {
    return { ok: false, reason: 'En proceso' }
  }

  activeKicks.add(lockKey)

  try {
    const metadata = await conn.groupMetadata(groupJid)
    const participants = metadata?.participants || []

    const participant = participants.find(
      p => participantMatches(p, targetJid)
    )

    if (!participant) {
      return {
        ok: false,
        reason: 'No estaba en el grupo',
        groupName: metadata?.subject || groupJid
      }
    }

    const botJid = normalizeJid(
      conn.user?.id || conn.user?.jid
    )

    const botParticipant = participants.find(
      p => participantMatches(p, botJid)
    )

    if (botParticipant && !botParticipant.admin) {
      return {
        ok: false,
        reason: 'El bot no es administrador',
        groupName: metadata?.subject || groupJid
      }
    }

    const removalJid = getParticipantJid(participant)

    if (!removalJid) {
      return {
        ok: false,
        reason: 'No se pudo identificar al participante',
        groupName: metadata?.subject || groupJid
      }
    }

    await conn.groupParticipantsUpdate(
      groupJid,
      [removalJid],
      'remove'
    )

    const groupName = metadata?.subject || groupJid

    if (notify) {
      await conn.sendMessage(groupJid, {
        text:
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃
┃ 🚫 *USUARIO ELIMINADO*
┃
┃ 👤 @${removalJid.split('@')[0]}
┃ 📝 *Motivo:* ${safeText(reason, 150)}
┃ 🛡️ *Sistema:* Lista negra global
┃
╰━━━━━━━━━━━━━━━━━━⬣`,
        mentions: [removalJid]
      }).catch(() => {})
    }

    return {
      ok: true,
      groupName
    }
  } catch (error) {
    console.error(
      `[whatsapp-bot] Error expulsando en ${groupJid}:`,
      error?.message || error
    )

    return {
      ok: false,
      reason: error?.message || 'Error de WhatsApp',
      groupName: groupJid
    }
  } finally {
    activeKicks.delete(lockKey)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚡ PROCESAMIENTO PARALELO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runWithConcurrency(items, limit, task) {
  let cursor = 0

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++

        try {
          await task(items[index], index)
        } catch (error) {
          console.error(
            '[whatsapp-bot] Error en tarea:',
            error?.message || error
          )
        }
      }
    }
  )

  await Promise.all(workers)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 HANDLER PRINCIPAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const handler = async (m, { conn, command, text = '' }) => {
  const cmd = String(command || '')
    .toLowerCase()
    .replace(/^\./, '')
    .trim()

  if (!['ln', 'unln', 'vln', 'clrn'].includes(cmd)) {
    return
  }

  const db = readBlacklist()
  const list = getBannedList(db)
  const SEP = '━━━━━━━━━━━━━━━━━━━━'

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
  // 📋 LISTA NEGRA — DISEÑO RENOVADO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (cmd === 'vln') {
    if (!list.length) {
      return conn.reply(
        m.chat,
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃
┃ 📋 *CENTRO DE SEGURIDAD*
┃
┃ ┌──────────────────
┃ │ 🛡️ Lista negra
┃ │
┃ │ ✅ Estado: sin registros
┃ │ 👥 Usuarios activos: 0
┃ └──────────────────
┃
┃ _No hay usuarios bloqueados._
┃
╰━━━━━━━━━━━━━━━━━━⬣`,
        m
      )
    }

    const shown = list.slice(0, MAX_LIST_ITEMS)
    const mentions = []

    let msg =
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃
┃ 🛡️ *CENTRO DE SEGURIDAD*
┃ 📋 *LISTA NEGRA GLOBAL*
┃
┃ ┌──────────────────
┃ │ 👥 Registrados: *${list.length}*
┃ │ 📑 Mostrando: *${shown.length}*
┃ │ 🔒 Estado: *ACTIVA*
┃ └──────────────────
┃
${SEP}
┃`

    shown.forEach(([jid, data], index) => {
      const display = String(jid).split('@')[0]
      const reason = safeText(data?.reason, 90)
      const date = formatDate(data?.addedAt)

      msg +=
`┃
┃ 〔 *${String(index + 1).padStart(2, '0')}* 〕 👤 @${display}
┃      ├ 📝 ${reason}
┃      └ 📅 ${date}
`

      mentions.push(jid)
    })

    msg +=
`┃
${SEP}
┃`

    if (list.length > MAX_LIST_ITEMS) {
      msg +=
`┃ ℹ️ Hay ${list.length - MAX_LIST_ITEMS} registro(s) más.
┃ Usá *.unln número* para liberar por posición.
┃
`
    }

    msg +=
`┃ ⚙️ *COMANDOS*
┃
┃ • *.ln @usuario motivo*
┃ • *.unln número*
┃ • *.clrn*
┃
╰━━⬣ *whatsapp-bot*`

    return conn.sendMessage(m.chat, {
      text: msg,
      mentions
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🧹 VACIAR LISTA NEGRA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (cmd === 'clrn') {
    if (!list.length) {
      return conn.reply(
        m.chat,
        '📋 *whatsapp-bot* · La lista negra ya está vacía.',
        m
      )
    }

    for (const jid of Object.keys(db)) {
      if (db[jid]) db[jid].banned = false
    }

    if (!writeBlacklist(db)) {
      return conn.reply(
        m.chat,
        '❌ No se pudo guardar el cambio en la base de datos.',
        m
      )
    }

    return conn.reply(
      m.chat,
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ 🧹 *LISTA NEGRA LIMPIADA*
┃
┃ ✅ Registros desactivados: *${list.length}*
┃ 💾 Base de datos actualizada.
╰━━━━━━━━━━━━━━━━━━⬣`,
      m
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 👤 IDENTIFICAR USUARIO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const cleanText = String(text).trim()
  let targetJid = null

  if (cmd === 'unln' && /^\d+$/.test(cleanText)) {
    const index = Number(cleanText) - 1

    if (!list[index]) {
      return conn.reply(
        m.chat,
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ ⚠️ *POSICIÓN NO VÁLIDA*
┃
┃ Elegí un número entre *1* y *${list.length}*.
╰━━━━━━━━━━━━━━━━━━⬣`,
        m
      )
    }

    targetJid = list[index][0]
  } else {
    targetJid = getTargetFromMessage(m, cleanText)
  }

  if (!targetJid) {
    return conn.reply(
      m.chat,
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ ⚠️ *FALTA EL USUARIO*
┃
┃ Respondé al mensaje de la persona
┃ o mencioná su perfil.
┃
┃ Ejemplo: *.ln @usuario spam*
╰━━━━━━━━━━━━━━━━━━⬣`,
      m
    )
  }

  if (
    cmd === 'ln' &&
    !m.quoted &&
    !(m.mentionedJid || []).length
  ) {
    return conn.reply(
      m.chat,
      '⚠️ Para agregar a alguien, respondé a su mensaje o mencioná su perfil.',
      m
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚫 AGREGAR A LA LISTA NEGRA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (cmd === 'ln') {
    const reason = getReason(cleanText)
    const existing = findBanned(db, targetJid)
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
        '❌ No se pudo guardar el registro. No se inició la expulsión global.',
        m
      )
    }

    let groups = []

    try {
      const participating = await conn.groupFetchAllParticipating()
      groups = Object.keys(participating || {})
    } catch (error) {
      console.error(
        '[whatsapp-bot] Error obteniendo grupos:',
        error?.message || error
      )
    }

    let kicked = 0
    let failed = 0
    let notPresent = 0
    const failedGroups = []

    await runWithConcurrency(
      groups,
      MAX_CONCURRENT_KICKS,
      async groupJid => {
        const result = await kickUser(
          conn,
          groupJid,
          storedJid,
          reason,
          true
        )

        if (result.ok) {
          kicked++
        } else if (result.reason === 'No estaba en el grupo') {
          notPresent++
        } else {
          failed++
          failedGroups.push({
            name: result.groupName || groupJid,
            reason: result.reason || 'Error desconocido'
          })
        }
      }
    )

    let report =
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃
┃ 🚫 *USUARIO REGISTRADO*
┃
┃ 👤 @${storedJid.split('@')[0]}
┃ 📝 *Motivo:* ${safeText(reason, 150)}
┃
┃ ━━〔 📊 RESULTADOS 〕━━
┃
┃ 🌐 Grupos revisados: *${groups.length}*
┃ ✅ Expulsiones realizadas: *${kicked}*
┃ 👤 No estaba presente: *${notPresent}*
┃ ⚠️ Errores: *${failed}*
┃
┃ 💾 Lista negra: *ACTUALIZADA*
┃ 🛡️ Protección automática: *ACTIVA*
┃`

    if (failedGroups.length) {
      report +=
`
┃
┃ ━━〔 ⚠️ ERRORES 〕━━
┃`

      failedGroups.slice(0, 8).forEach((group, i) => {
        report +=
`
┃ ${i + 1}. ${safeText(group.name, 55)}
┃    └ ${safeText(group.reason, 80)}
`
      })

      if (failedGroups.length > 8) {
        report +=
`
┃ … y ${failedGroups.length - 8} error(es) más.
`
      }
    }

    report +=
`
╰━━⬣ *whatsapp-bot*`

    return conn.sendMessage(m.chat, {
      text: report,
      mentions: [storedJid]
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🕊️ LIBERAR USUARIO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (cmd === 'unln') {
    const found = findBanned(db, targetJid)

    if (!found) {
      return conn.reply(
        m.chat,
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃ ℹ️ *USUARIO NO REGISTRADO*
┃
┃ La persona no figura activa
┃ en la lista negra.
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
        '❌ No se pudo guardar el cambio en la base de datos.',
        m
      )
    }

    return conn.sendMessage(m.chat, {
      text:
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃
┃ 🕊️ *USUARIO LIBERADO*
┃
┃ 👤 @${found.jid.split('@')[0]}
┃ ✅ Ya no está bloqueado.
┃ 💾 Registro actualizado.
┃
╰━━━━━━━━━━━━━━━━━━⬣`,
      mentions: [found.jid]
    })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚫 AUTOEXPULSIÓN CUANDO HABLA O CITA A UN BLOQUEADO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

handler.all = async function (m) {
  try {
    if (!m?.isGroup || !m.chat) return

    const db = readBlacklist()
    const senderMatch = findBanned(db, m.sender)

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

    if (quotedJid) {
      const quotedMatch = findBanned(db, quotedJid)

      if (quotedMatch) {
        await kickUser(
          this,
          m.chat,
          quotedMatch.jid,
          quotedMatch.data?.reason || 'Sin motivo especificado',
          true
        )
      }
    }
  } catch (error) {
    console.error(
      '[whatsapp-bot] Error en autoexpulsión:',
      error?.message || error
    )
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚨 AUTOEXPULSIÓN AL ENTRAR AL GRUPO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
      const match = findBanned(db, user)

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
      '[whatsapp-bot] Error al revisar ingresos:',
      error?.message || error
    )
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ CONFIGURACIÓN DEL PLUGIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
