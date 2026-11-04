
/**
 * 📂 plugins/propietario-listanegra.js
 * 🛡️ WHATSAPP-BOT — LISTA NEGRA GLOBAL
 *
 * COMANDOS:
 * .ln @usuario [motivo]
 * .unln @usuario
 * .unln número
 * .vln
 * .clrn
 *
 * FUNCIONES:
 * 🚫 Lista negra global
 * 📢 Avisos de expulsión al grupo
 * 🗑️ Expulsión automática
 * 👑 Protección de owners
 * 🛡️ Protección de administradores del bot
 * 💾 Base de datos persistente
 * 🔄 Compatible con Baileys ESM
 */

import fs from 'fs'
import path from 'path'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const DATABASE_DIR = path.resolve('./database')
const BLACKLIST_FILE = path.join(
  DATABASE_DIR,
  'blacklist.json'
)

const MAX_CONCURRENT_KICKS = 5
const MAX_LIST_ITEMS = 20

const activeKicks = new Set()

fs.mkdirSync(DATABASE_DIR, {
  recursive: true
})

if (!fs.existsSync(BLACKLIST_FILE)) {
  fs.writeFileSync(
    BLACKLIST_FILE,
    '{}',
    'utf8'
  )
}

// ============================================================
// 🔎 NORMALIZAR JID
// ============================================================

function normalizeJid(value = '') {
  if (!value) return null

  const jid = String(value)
    .trim()
    .replace(/^\+/, '')

  if (!jid) return null

  if (jid.endsWith('@c.us')) {
    return jid.replace(
      '@c.us',
      '@s.whatsapp.net'
    )
  }

  if (jid.includes('@')) return jid

  const digits = jid.replace(/\D/g, '')

  return digits
    ? `${digits}@s.whatsapp.net`
    : null
}

function digitsOnly(value = '') {
  return String(value).replace(/\D/g, '')
}

function sameJid(a, b) {
  const first = normalizeJid(a)
  const second = normalizeJid(b)

  if (!first || !second) return false
  if (first === second) return true

  if (
    first.includes('@lid') ||
    second.includes('@lid')
  ) {
    return false
  }

  return (
    digitsOnly(first) === digitsOnly(second)
  )
}

// ============================================================
// 🧹 TEXTO SEGURO
// ============================================================

function safeText(value = '', max = 100) {
  return String(value || 'Sin especificar')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\u0000-\u001F]/g, '')
    .trim()
    .slice(0, max) || 'Sin especificar'
}

// ============================================================
// 📂 LEER BASE DE DATOS
// ============================================================

function readBlacklist() {
  try {
    const data = JSON.parse(
      fs.readFileSync(
        BLACKLIST_FILE,
        'utf8'
      )
    )

    return (
      data &&
      typeof data === 'object' &&
      !Array.isArray(data)
    )
      ? data
      : {}

  } catch (error) {
    console.error(
      '[BLACKLIST] Error leyendo base de datos:',
      error
    )

    return {}
  }
}

// ============================================================
// 💾 GUARDAR BASE DE DATOS
// ============================================================

function writeBlacklist(data) {
  const tempFile = `${BLACKLIST_FILE}.tmp`

  try {
    fs.writeFileSync(
      tempFile,
      JSON.stringify(data, null, 2),
      'utf8'
    )

    fs.renameSync(
      tempFile,
      BLACKLIST_FILE
    )

    return true

  } catch (error) {
    console.error(
      '[BLACKLIST] Error guardando:',
      error
    )

    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }
    } catch {}

    return false
  }
}

// ============================================================
// 📋 OBTENER LISTA ACTIVA
// ============================================================

function getBannedList(db) {
  return Object.entries(db)
    .filter(([, data]) =>
      data?.banned === true
    )
    .sort(
      (a, b) =>
        Number(a[1]?.addedAt || 0) -
        Number(b[1]?.addedAt || 0)
    )
}

// ============================================================
// 🔎 BUSCAR USUARIO BLOQUEADO
// ============================================================

function findBanned(db, jid) {
  const normalized = normalizeJid(jid)

  if (!normalized) return null

  if (db[normalized]?.banned === true) {
    return {
      jid: normalized,
      data: db[normalized]
    }
  }

  const match = Object.entries(db).find(
    ([savedJid, data]) =>
      data?.banned === true &&
      sameJid(savedJid, normalized)
  )

  return match
    ? {
        jid: match[0],
        data: match[1]
      }
    : null
}

// ============================================================
// 👤 COMPARAR PARTICIPANTES
// ============================================================

function participantMatches(participant, targetJid) {
  if (!participant || !targetJid) {
    return false
  }

  const ids = [
    participant.id,
    participant.jid,
    participant.lid,
    participant.phoneNumber,
    participant.phone
  ].filter(Boolean)

  return ids.some(id =>
    sameJid(id, targetJid)
  )
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

// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {
  const owners = [
    ...(Array.isArray(global.owner)
      ? global.owner
      : global.owner ? [global.owner] : []),

    ...(Array.isArray(global.owners)
      ? global.owners
      : [])
  ]

  return owners
    .map(owner => {
      const value = Array.isArray(owner)
        ? owner[0]
        : owner?.jid || owner?.id || owner

      return normalizeJid(value)
    })
    .filter(Boolean)
}

// ============================================================
// 🛡️ VERIFICAR USUARIO PROTEGIDO
// ============================================================

function isProtected(
  targetJid,
  conn,
  metadata,
  participant
) {
  const owners = getOwners()

  if (owners.some(owner =>
    sameJid(owner, targetJid)
  )) {
    return true
  }

  const botJid = normalizeJid(
    conn.user?.id || conn.user?.jid
  )

  if (sameJid(botJid, targetJid)) {
    return true
  }

  const groupOwner = normalizeJid(
    metadata?.owner
  )

  if (sameJid(groupOwner, targetJid)) {
    return true
  }

  if (
    participant?.admin === 'superadmin' ||
    participant?.admin === 'owner'
  ) {
    return true
  }

  return false
}

// ============================================================
// 👤 OBTENER OBJETIVO
// ============================================================

function getTargetFromMessage(m, text = '') {
  if (
    m.quoted?.sender ||
    m.quoted?.participant
  ) {
    return normalizeJid(
      m.quoted.sender ||
      m.quoted.participant
    )
  }

  if (m.mentionedJid?.length) {
    return normalizeJid(
      m.mentionedJid[0]
    )
  }

  const digits = digitsOnly(text)

  return digits.length >= 5
    ? normalizeJid(digits)
    : null
}

// ============================================================
// 📝 OBTENER MOTIVO
// ============================================================

function getReason(text = '') {
  return String(text)
    .replace(/@\S+/g, '')
    .trim() || 'Sin motivo especificado'
}

// ============================================================
// 📅 FORMATO DE FECHA
// ============================================================

function formatDate(timestamp) {
  if (!timestamp) return 'Sin fecha'

  try {
    return new Date(timestamp)
      .toLocaleDateString('es-UY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
  } catch {
    return 'Sin fecha'
  }
}

// ============================================================
// 📢 ENVIAR AVISO AL GRUPO
// ============================================================

async function sendNotice(
  conn,
  groupJid,
  targetJid,
  reason,
  type = 'removed'
) {
  const user = targetJid.split('@')[0]

  let text

  if (type === 'processing') {
    text = `╭━━〔 *WHATSAPP-BOT* 〕━━⬣
┃
┃ 🚨 *LISTA NEGRA DETECTADA*
┃
┃ 👤 @${user}
┃ 📝 *Motivo:* ${safeText(reason, 120)}
┃
┃ ⏳ Procesando expulsión...
┃ 🛡️ Sistema: Lista negra global
┃
╰━━━━━━━━━━━━━━━━━━⬣`
  } else {
    text = `╭━━〔 *WHATSAPP-BOT* 〕━━⬣
┃
┃ ⛔ *USUARIO ELIMINADO*
┃
┃ 👤 @${user}
┃ 📝 *Motivo:* ${safeText(reason, 120)}
┃
┃ ✅ Expulsión confirmada
┃ 🛡️ Sistema: Lista negra global
┃
╰━━━━━━━━━━━━━━━━━━⬣`
  }

  try {
    await conn.sendMessage(groupJid, {
      text,
      mentions: [targetJid]
    })

    return true

  } catch (error) {
    console.error(
      `[BLACKLIST] Aviso con mención falló en ${groupJid}:`,
      error?.message || error
    )
  }

  // Segundo intento sin mención
  try {
    await conn.sendMessage(groupJid, {
      text: text.replace(
        `@${user}`,
        user
      )
    })

    return true

  } catch (error) {
    console.error(
      `[BLACKLIST] Aviso falló en ${groupJid}:`,
      error?.message || error
    )

    return false
  }
}

// ============================================================
// 🚫 EXPULSAR USUARIO
// ============================================================

async function kickUser(
  conn,
  groupJid,
  targetJid,
  reason = 'Sin motivo especificado',
  notify = true
) {
  const lockKey = `${groupJid}:${targetJid}`

  if (activeKicks.has(lockKey)) {
    return {
      ok: false,
      reason: 'Expulsión en proceso'
    }
  }

  activeKicks.add(lockKey)

  try {
    const metadata = await conn.groupMetadata(
      groupJid
    )

    const participants =
      metadata?.participants || []

    const groupName =
      metadata?.subject || groupJid

    // ========================================================
    // 🔎 BUSCAR PARTICIPANTE
    // ========================================================

    const participant = participants.find(
      p => participantMatches(
        p,
        targetJid
      )
    )

    if (!participant) {
      return {
        ok: false,
        reason: 'No estaba en el grupo',
        groupName
      }
    }

    const removalJid =
      getParticipantJid(participant)

    if (!removalJid) {
      return {
        ok: false,
        reason: 'Usuario no identificado',
        groupName
      }
    }

    // ========================================================
    // 👑 PROTEGER OWNERS Y CREADOR
    // ========================================================

    if (
      isProtected(
        removalJid,
        conn,
        metadata,
        participant
      )
    ) {
      return {
        ok: false,
        reason: 'Usuario protegido',
        groupName
      }
    }

    // ========================================================
    // 🛡️ VERIFICAR BOT ADMIN
    // ========================================================

    const botJid = normalizeJid(
      conn.user?.id || conn.user?.jid
    )

    const botParticipant = participants.find(
      p => participantMatches(
        p,
        botJid
      )
    )

    if (
      !botParticipant ||
      !botParticipant.admin
    ) {
      return {
        ok: false,
        reason: 'El bot no es administrador',
        groupName
      }
    }

    // ========================================================
    // 📢 AVISO PREVIO
    // ========================================================

    let preNoticeSent = false

    if (notify) {
      preNoticeSent = await sendNotice(
        conn,
        groupJid,
        removalJid,
        reason,
        'processing'
      )
    }

    // ========================================================
    // 🚫 EJECUTAR EXPULSIÓN
    // ========================================================

    const updateResult =
      await conn.groupParticipantsUpdate(
        groupJid,
        [removalJid],
        'remove'
      )

    const updateStatus =
      Array.isArray(updateResult)
        ? updateResult[0]?.status
        : updateResult?.status

    if (
      updateStatus != null &&
      String(updateStatus) !== '200'
    ) {
      return {
        ok: false,
        reason:
          `WhatsApp rechazó la expulsión (${updateStatus})`,
        groupName,
        preNoticeSent
      }
    }

    // ========================================================
    // ✅ AVISO FINAL
    // ========================================================

    let notificationSent = false

    if (notify) {
      notificationSent = await sendNotice(
        conn,
        groupJid,
        removalJid,
        reason,
        'removed'
      )
    }

    return {
      ok: true,
      groupName,
      preNoticeSent,
      notificationSent
    }

  } catch (error) {
    console.error(
      `[BLACKLIST] Error expulsando en ${groupJid}:`,
      error?.message || error
    )

    return {
      ok: false,
      reason:
        error?.message || 'Error de WhatsApp',
      groupName: groupJid
    }

  } finally {
    activeKicks.delete(lockKey)
  }
}

// ============================================================
// ⚙️ EJECUTAR TAREAS CON CONCURRENCIA
// ============================================================

async function runWithConcurrency(
  items,
  limit,
  task
) {
  let cursor = 0

  const workers = Array.from(
    {
      length: Math.min(
        limit,
        items.length
      )
    },
    async () => {
      while (cursor < items.length) {
        const index = cursor++

        try {
          await task(
            items[index],
            index
          )
        } catch (error) {
          console.error(
            '[BLACKLIST] Error en tarea:',
            error
          )
        }
      }
    }
  )

  await Promise.all(workers)
}

// ============================================================
// 📦 HANDLER PRINCIPAL
// ============================================================

const handler = async (
  m,
  { conn, command, text = '' }
) => {
  const cmd = String(command || '')
    .toLowerCase()
    .replace(/^\./, '')
    .trim()

  if (
    !['ln', 'unln', 'vln', 'clrn']
      .includes(cmd)
  ) {
    return
  }

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

  // ========================================================
  // 📋 VER LISTA NEGRA
  // ========================================================

  if (cmd === 'vln') {
    if (!list.length) {
      return conn.reply(
        m.chat,
        `╭─「 *WHATSAPP-BOT* 」
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

    const shown = list.slice(
      0,
      MAX_LIST_ITEMS
    )

    const mentions = []

    let msg = `╭─「 *WHATSAPP-BOT* 」
│
│ 🛡️ *DIRECTORIO DE BLOQUEOS*
│ 📂 Lista negra global
│ 👥 Usuarios activos: *${list.length}*
│
├────────────────────
`

    shown.forEach(
      ([jid, data], index) => {
        msg += `│
│ ┌─ *REGISTRO ${String(index + 1).padStart(2, '0')}*
│ │ 👤 @${jid.split('@')[0]}
│ │ 📝 ${safeText(data?.reason, 90)}
│ │ 📅 ${formatDate(data?.addedAt)}
│ └──────────────────
`

        mentions.push(jid)
      }
    )

    if (list.length > MAX_LIST_ITEMS) {
      msg += `│
│ ℹ️ Se muestran ${MAX_LIST_ITEMS} de ${list.length}.
│ Usá *.unln número* para liberar.
`
    }

    msg += `│
├────────────────────
│ ⚙️ *ACCIONES*
│
│ • .ln @usuario motivo
│ • .unln número
│ • .clrn
│
╰─「 *WHATSAPP-BOT* 」`

    return conn.sendMessage(m.chat, {
      text: msg,
      mentions
    })
  }

  // ========================================================
  // 🧹 LIMPIAR LISTA NEGRA
  // ========================================================

  if (cmd === 'clrn') {
    if (!list.length) {
      return conn.reply(
        m.chat,
        '📋 La lista negra ya está vacía.',
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
        '❌ No se pudo guardar el cambio.',
        m
      )
    }

    return conn.reply(
      m.chat,
      `╭─「 *WHATSAPP-BOT* 」
│
│ 🧹 *LISTA LIMPIADA*
│
│ ✅ Registros desactivados: ${list.length}
│ 💾 Base de datos actualizada
│
╰────────────────────`,
      m
    )
  }

  // ========================================================
  // 👤 IDENTIFICAR USUARIO
  // ========================================================

  const cleanText = String(text).trim()

  let targetJid = null

  if (
    cmd === 'unln' &&
    /^\d+$/.test(cleanText)
  ) {
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
    targetJid = getTargetFromMessage(
      m,
      cleanText
    )
  }

  if (!targetJid) {
    return conn.reply(
      m.chat,
      `╭─「 *WHATSAPP-BOT* 」
│
│ ⚠️ *FALTA INDICAR USUARIO*
│
│ Respondé a su mensaje
│ o mencioná su perfil.
│
│ Ejemplo:
│ .ln @usuario spam
│
╰────────────────────`,
      m
    )
  }

  // ========================================================
  // 🚫 AGREGAR A LISTA NEGRA
  // ========================================================

  if (cmd === 'ln') {
    if (
      !m.quoted &&
      !(m.mentionedJid || []).length
    ) {
      return conn.reply(
        m.chat,
        '⚠️ Mencioná al usuario o respondé a su mensaje.',
        m
      )
    }

    const reason = getReason(cleanText)

    const existing = findBanned(
      db,
      targetJid
    )

    const storedJid =
      existing?.jid || targetJid

    // ======================================================
    // 👑 PROTEGER OWNERS
    // ======================================================

    if (
      getOwners().some(owner =>
        sameJid(owner, storedJid)
      )
    ) {
      return conn.reply(
        m.chat,
        '⛔ No podés agregar un owner a la lista negra.',
        m
      )
    }

    const botJid = normalizeJid(
      conn.user?.id || conn.user?.jid
    )

    if (sameJid(botJid, storedJid)) {
      return conn.reply(
        m.chat,
        '⛔ No podés agregar al bot a la lista negra.',
        m
      )
    }

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
        '❌ No se pudo guardar el registro.',
        m
      )
    }

    // ======================================================
    // 🌐 OBTENER GRUPOS
    // ======================================================

    let groups = []

    try {
      const participating =
        await conn.groupFetchAllParticipating()

      groups = Object.keys(
        participating || {}
      )

    } catch (error) {
      console.error(
        '[BLACKLIST] Error obteniendo grupos:',
        error
      )
    }

    // ======================================================
    // 📊 CONTADORES
    // ======================================================

    let kicked = 0
    let failed = 0
    let absent = 0
    let protectedUsers = 0
    let noticesSent = 0
    let noticesFailed = 0

    const failedGroups = []

    // ======================================================
    // 🚫 EXPULSIÓN GLOBAL
    // ======================================================

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

          if (result.notificationSent) {
            noticesSent++
          } else {
            noticesFailed++
          }

        } else if (
          result.reason === 'No estaba en el grupo'
        ) {
          absent++

        } else if (
          result.reason === 'Usuario protegido'
        ) {
          protectedUsers++

        } else {
          failed++

          failedGroups.push({
            name:
              result.groupName || groupJid,
            reason:
              result.reason || 'Error desconocido'
          })
        }
      }
    )

    // ======================================================
    // 📋 REPORTE FINAL
    // ======================================================

    let report = `╭─「 *WHATSAPP-BOT / SEGURIDAD* 」
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
│ ✅ Expulsiones: ${kicked}
│ 👤 No estaba presente: ${absent}
│ 👑 Protegidos: ${protectedUsers}
│ ⚠️ Fallidas: ${failed}
│
├────────────────────
│ 📢 *NOTIFICACIONES*
│
│ ✅ Avisos finales enviados: ${noticesSent}
│ ❌ Avisos finales fallidos: ${noticesFailed}
│
│ 💾 Registro: guardado
│ 🛡️ Protección: activa
`

    if (failedGroups.length) {
      report += `│
├────────────────────
│ ⚠️ *GRUPOS CON ERRORES*
`

      failedGroups
        .slice(0, 6)
        .forEach((group, index) => {
          report += `│ ${index + 1}. ${safeText(group.name, 50)}
│    └ ${safeText(group.reason, 65)}
`
        })
    }

    report += `╰─「 *WHATSAPP-BOT* 」`

    return conn.sendMessage(m.chat, {
      text: report,
      mentions: [storedJid]
    })
  }

  // ========================================================
  // 🕊️ LIBERAR USUARIO
  // ========================================================

  if (cmd === 'unln') {
    const found = findBanned(
      db,
      targetJid
    )

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
      return conn.reply(
        m.chat,
        '❌ No se pudo guardar el cambio.',
        m
      )
    }

    return conn.sendMessage(m.chat, {
      text: `╭─「 *WHATSAPP-BOT* 」
│
│ 🕊️ *USUARIO LIBERADO*
│
│ 👤 @${found.jid.split('@')[0]}
│
│ ✅ Ya no está bloqueado.
│ 💾 Registro actualizado.
│
╰────────────────────`,
      mentions: [found.jid]
    })
  }
}

// ============================================================
// 🚫 AUTOEXPULSIÓN AL HABLAR O CITAR
// ============================================================

handler.all = async function (m) {
  try {
    if (!m?.isGroup || !m.chat) return

    const db = readBlacklist()

    const senderMatch = findBanned(
      db,
      m.sender
    )

    if (senderMatch) {
      await kickUser(
        this,
        m.chat,
        senderMatch.jid,
        senderMatch.data?.reason ||
          'Sin motivo especificado',
        true
      )
    }

    const quotedJid = normalizeJid(
      m.quoted?.sender ||
      m.quoted?.participant
    )

    if (quotedJid) {
      const quotedMatch = findBanned(
        db,
        quotedJid
      )

      if (quotedMatch) {
        await kickUser(
          this,
          m.chat,
          quotedMatch.jid,
          quotedMatch.data?.reason ||
            'Sin motivo especificado',
          true
        )
      }
    }

  } catch (error) {
    console.error(
      '[BLACKLIST] Error en autoexpulsión:',
      error
    )
  }
}

// ============================================================
// 🚨 AUTOEXPULSIÓN AL ENTRAR
// ============================================================

handler.before = async function (m) {
  try {
    if (
      !m?.isGroup ||
      ![27, 31].includes(
        m.messageStubType
      )
    ) {
      return
    }

    const db = readBlacklist()

    for (
      const user of
      m.messageStubParameters || []
    ) {
      const match = findBanned(
        db,
        user
      )

      if (!match) continue

      await kickUser(
        this,
        m.chat,
        match.jid,
        match.data?.reason ||
          'Sin motivo especificado',
        true
      )
    }

  } catch (error) {
    console.error(
      '[BLACKLIST] Error al revisar ingresos:',
      error
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = /^(ln|unln|vln|clrn)$/i

handler.help = [
  'ln @usuario [motivo]',
  'unln @usuario',
  'unln número',
  'vln',
  'clrn'
]

handler.tags = ['owner']
handler.rowner = true

export default handler
