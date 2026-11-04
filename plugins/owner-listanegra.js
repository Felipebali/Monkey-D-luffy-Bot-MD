// 📂 plugins/propietario-listanegra.js
// 🛡️ whatsapp-bot — BLACKLIST MANAGER
// ======================================================
// .ln @usuario [motivo] → Agregar a la lista negra
// .unln @usuario        → Liberar usuario
// .unln <número>        → Liberar por posición
// .vln                  → Ver lista negra
// .clrn                 → Limpiar lista negra
// ======================================================

import fs from 'fs'
import path from 'path'

const DATABASE_DIR = path.resolve('./database')
const BLACKLIST_FILE = path.join(DATABASE_DIR, 'blacklist.json')
const MAX_CONCURRENT_KICKS = 5
const MAX_LIST_ITEMS = 20
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
  return String(value || 'Sin especificar')
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
    console.error('[whatsapp-bot] Error leyendo blacklist:', error)
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
    console.error('[whatsapp-bot] Error guardando blacklist:', error)

    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
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

  // No comparar identificadores LID como si fueran teléfonos.
  if (normalized.includes('@lid')) return null

  const digits = digitsOnly(normalized)
  if (!digits) return null

  const match = Object.entries(db).find(([savedJid, data]) =>
    data?.banned === true &&
    !String(savedJid).includes('@lid') &&
    digitsOnly(savedJid) === digits
  )

  return match ? { jid: match[0], data: match[1] } : null
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

  if (target && ids.some(id => normalizeJid(id) === target)) {
    return true
  }

  if (!target || target.includes('@lid')) return false

  const targetDigits = digitsOnly(target)

  return ids.some(id => {
    const normalized = normalizeJid(id)

    return normalized &&
      !normalized.includes('@lid') &&
      digitsOnly(normalized) === targetDigits
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

function getTargetFromMessage(m, text = '') {
  if (m.quoted?.sender || m.quoted?.participant) {
    return normalizeJid(m.quoted.sender || m.quoted.participant)
  }

  if (m.mentionedJid?.length) {
    return normalizeJid(m.mentionedJid[0])
  }

  const digits = digitsOnly(text)
  return digits.length >= 5 ? normalizeJid(digits) : null
}

function getReason(text = '') {
  return String(text)
    .replace(/@\S+/g, '')
    .trim() || 'Sin motivo especificado'
}

function formatDate(timestamp) {
  if (!timestamp) return 'Sin fecha'

  try {
    return new Date(timestamp).toLocaleDateString('es-UY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return 'Sin fecha'
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📣 ENVIAR AVISO DE EXPULSIÓN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function sendKickNotice(
  conn,
  groupJid,
  removalJid,
  reason
) {
  const text =
`╭━━〔 *whatsapp-bot* 〕━━⬣
┃
┃ ⛔ *USUARIO ELIMINADO*
┃
┃ 👤 @${removalJid.split('@')[0]}
┃ 📝 *Motivo:* ${safeText(reason, 120)}
┃ 🛡️ *Sistema:* Lista negra global
┃
╰━━━━━━━━━━━━━━━━━━⬣`

  // Primer intento: mensaje con mención.
  try {
    await conn.sendMessage(groupJid, {
      text,
      mentions: [removalJid]
    })

    return true
  } catch (error) {
    console.error(
      `[whatsapp-bot] Falló el aviso con mención en ${groupJid}:`,
      error?.message || error
    )
  }

  // Segundo intento: mensaje simple, sin mención.
  try {
    await conn.sendMessage(groupJid, {
      text:
`⛔ *USUARIO ELIMINADO*
👤 Usuario: ${removalJid.split('@')[0]}
📝 Motivo: ${safeText(reason, 120)}
🛡️ Sistema: Lista negra global`
    })

    return true
  } catch (error) {
    console.error(
      `[whatsapp-bot] Fallaron los dos intentos de aviso en ${groupJid}:`,
      error?.message || error
    )

    return false
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚫 EXPULSIÓN Y AVISO
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
    const groupName = metadata?.subject || groupJid

    const participant = participants.find(
      p => participantMatches(p, targetJid)
    )

    if (!participant) {
      return {
        ok: false,
        reason: 'No estaba en el grupo',
        groupName
      }
    }

    const botJid = normalizeJid(conn.user?.id || conn.user?.jid)

    const botParticipant = participants.find(
      p => participantMatches(p, botJid)
    )

    if (botParticipant && !botParticipant.admin) {
      return {
        ok: false,
        reason: 'El bot no es administrador',
        groupName
      }
    }

    const removalJid = getParticipantJid(participant)

    if (!removalJid) {
      return {
        ok: false,
        reason: 'No se pudo identificar al usuario',
        groupName
      }
    }

    // Expulsar al usuario.
    const updateResult = await conn.groupParticipantsUpdate(
      groupJid,
      [removalJid],
      'remove'
    )

    // Revisar si WhatsApp devolvió un error explícito.
    const updateStatus = Array.isArray(updateResult)
      ? updateResult[0]?.status
      : updateResult?.status

    if (
      updateStatus &&
      !['200', 200].includes(updateStatus)
    ) {
      return {
        ok: false,
        reason: `WhatsApp no confirmó la expulsión (estado ${updateStatus})`,
        groupName
      }
    }

    // Avisar después de la expulsión, con un segundo intento
    // automático si falla el envío del mensaje.
    let notificationSent = false

    if (notify) {
      notificationSent = await sendKickNotice(
        conn,
        groupJid,
        removalJid,
        reason
      )
    }

    return {
      ok: true,
      groupName,
      notificationSent
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
          console.error('[whatsapp-bot] Error en tarea:', error)
        }
      }
    }
  )

  await Promise.all(workers)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const handler = async (m, { conn, command, text = '' }) => {
  const cmd = String(command || '')
    .toLowerCase()
    .replace(/^\./, '')
    .trim()

  if (!['ln', 'unln', 'vln', 'clrn'].includes(cmd)) return

  const db = readBlacklist()
  const list = getBannedList(db)

  try {
    await m.react(
      ({ ln: '🚫', unln: '🕊️', vln: '📋', clrn: '🧹' })[cmd]
    )
  } catch {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📋 VER LISTA NEGRA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (cmd === 'vln') {
    if (!list.length) {
      return conn.reply(
        m.chat,
`╭─「 *whatsapp-bot / seguridad* 」
│
│ 🛡️ *DIRECTORIO DE BLOQUEOS*
│
│ Estado: 🟢 Sin registros activos
│ Total: 0 usuarios
│
╰────────────────────`,
        m
      )
    }

    const shown = list.slice(0, MAX_LIST_ITEMS)
    const mentions = []

    let msg =
`╭─「 *whatsapp-bot / seguridad* 」
│
│ 🛡️ *DIRECTORIO DE BLOQUEOS*
│ 📂 Categoría: Lista negra global
│ 👥 Usuarios activos: *${list.length}*
│
├────────────────────
`

    shown.forEach(([jid, data], index) => {
      const display = String(jid).split('@')[0]
      const reason = safeText(data?.reason, 90)
      const date = formatDate(data?.addedAt)

      msg +=
`│
│ ┌─ *REGISTRO ${String(index + 1).padStart(2, '0')}*
│ │ 👤 @${display}
│ │ 📝 ${reason}
│ │ 📅 ${date}
│ └──────────────────
`

      mentions.push(jid)
    })

    if (list.length > MAX_LIST_ITEMS) {
      msg +=
`│
│ ℹ️ Se muestran ${MAX_LIST_ITEMS} de ${list.length}.
│ Usá *.unln número* para liberar por posición.
`
    }

    msg +=
`│
├────────────────────
│ ⚙️ *ACCIONES DISPONIBLES*
│
│ • *.ln @usuario motivo*
│ • *.unln número*
│ • *.clrn*
│
╰─「 *whatsapp-bot* 」`

    return conn.sendMessage(m.chat, {
      text: msg,
      mentions
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🧹 LIMPIAR LISTA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (cmd === 'clrn') {
    if (!list.length) {
      return conn.reply(
        m.chat,
        '📋 *whatsapp-bot:* la lista negra ya está vacía.',
        m
      )
    }

    for (const jid of Object.keys(db)) {
      if (db[jid]) db[jid].banned = false
    }

    if (!writeBlacklist(db)) {
      return conn.reply(m.chat, '❌ No se pudo guardar el cambio.', m)
    }

    return conn.reply(
      m.chat,
`╭─「 *whatsapp-bot* 」
│ 🧹 *LISTA LIMPIADA*
│
│ ✅ Registros desactivados: ${list.length}
│ 💾 Base de datos actualizada
╰────────────────────`,
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
        `⚠️ Posición inválida. Elegí un número entre 1 y ${list.length}.`,
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
`╭─「 *whatsapp-bot* 」
│ ⚠️ *Falta indicar el usuario*
│
│ Respondé a su mensaje o mencioná
│ su perfil.
│
│ Ejemplo: *.ln @usuario spam*
╰────────────────────`,
      m
    )
  }

  if (cmd === 'ln' && !m.quoted && !(m.mentionedJid || []).length) {
    return conn.reply(
      m.chat,
      '⚠️ Para agregar a alguien, respondé a su mensaje o mencioná su perfil.',
      m
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚫 AGREGAR A LISTA NEGRA
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
      console.error('[whatsapp-bot] Error obteniendo grupos:', error)
    }

    let kicked = 0
    let failed = 0
    let absent = 0
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
          absent++
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
`╭─「 *whatsapp-bot / seguridad* 」
│
│ 🚫 *USUARIO REGISTRADO*
│
│ 👤 @${storedJid.split('@')[0]}
│ 📝 Motivo: ${safeText(reason, 120)}
│
├────────────────────
│ 📊 *RESULTADO GLOBAL*
│
│ 🌐 Grupos revisados: ${groups.length}
│ ✅ Expulsiones realizadas: ${kicked}
│ 👤 No estaba presente: ${absent}
│ ⚠️ Operaciones fallidas: ${failed}
│
│ 💾 Registro: guardado
│ 🛡️ Protección: activa
`

    if (failedGroups.length) {
      report +=
`│
├────────────────────
│ ⚠️ *GRUPOS CON ERRORES*
`

      failedGroups.slice(0, 6).forEach((group, index) => {
        report +=
`│ ${index + 1}. ${safeText(group.name, 50)}
│    └ ${safeText(group.reason, 65)}
`
      })

      if (failedGroups.length > 6) {
        report += `│ … y ${failedGroups.length - 6} más.\n`
      }
    }

    report += `╰─「 *whatsapp-bot* 」`

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
        'ℹ️ Esa persona no figura activa en la lista negra.',
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
      return conn.reply(m.chat, '❌ No se pudo guardar el cambio.', m)
    }

    return conn.sendMessage(m.chat, {
      text:
`╭─「 *whatsapp-bot* 」
│ 🕊️ *USUARIO LIBERADO*
│
│ 👤 @${found.jid.split('@')[0]}
│ ✅ Ya no está bloqueado.
│ 💾 Registro actualizado.
╰────────────────────`,
      mentions: [found.jid]
    })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚫 AUTOEXPULSIÓN AL HABLAR O CITAR
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
    console.error('[whatsapp-bot] Error en autoexpulsión:', error)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚨 AUTOEXPULSIÓN AL ENTRAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

handler.before = async function (m) {
  try {
    if (!m?.isGroup || ![27, 31].includes(m.messageStubType)) {
      return
    }

    const db = readBlacklist()

    for (const user of m.messageStubParameters || []) {
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
    console.error('[whatsapp-bot] Error al revisar ingresos:', error)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ CONFIGURACIÓN
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
