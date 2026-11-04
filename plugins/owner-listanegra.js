
/**
 * 📂 plugins/propietario-listanegra.js
 * 🛡️ WHATSAPP-BOT — LISTA NEGRA GLOBAL
 *
 * 👑 Exclusivo para owners
 * 🚫 .ln — Agregar y expulsar
 * 🕊️ .unln — Liberar usuario
 * 📋 .vln — Ver lista negra
 * 🧹 .clrn — Limpiar lista negra
 *
 * ✅ Aviso después de cada expulsión confirmada
 * ✅ Motivo y mención del usuario
 * ✅ Expulsión en grupos compartidos
 * ✅ Autoexpulsión al hablar o ingresar
 * ✅ Protección de owners y administradores del bot
 * ✅ Soporte para identificadores LID y PN
 * ✅ Base de datos persistente
 *
 * Baileys ES Modules
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

const MAX_CONCURRENT_KICKS = 3
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
// 🔧 UTILIDADES
// ============================================================

function normalizeJid(value) {
  if (!value) return null

  if (typeof value === 'object') {
    value =
      value.id ||
      value.jid ||
      value.lid ||
      value.phoneNumber ||
      value.number ||
      ''
  }

  let jid = String(value)
    .trim()
    .replace(/^\+/, '')

  if (!jid) return null

  if (jid.endsWith('@c.us')) {
    jid = jid.replace(
      '@c.us',
      '@s.whatsapp.net'
    )
  }

  if (jid.includes('@')) {
    const [user, server] = jid.split('@')

    return `${user.split(':')[0]}@${server}`
  }

  const digits = jid.replace(/\D/g, '')

  return digits
    ? `${digits}@s.whatsapp.net`
    : null
}

function digitsOnly(value) {
  return String(value || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

function sameJid(a, b) {
  const first = normalizeJid(a)
  const second = normalizeJid(b)

  if (!first || !second) return false

  if (first === second) return true

  // No confundir un LID con un número telefónico.
  if (
    first.endsWith('@lid') ||
    second.endsWith('@lid')
  ) {
    return false
  }

  return digitsOnly(first) === digitsOnly(second)
}

function safeText(value, max = 100) {
  return String(value || 'Sin especificar')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\u0000-\u001F]/g, '')
    .trim()
    .slice(0, max) || 'Sin especificar'
}

function sleep(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  )
}

// ============================================================
// 💾 BASE DE DATOS
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
    ) ? data : {}

  } catch (error) {
    console.error(
      '[BLACKLIST] Error leyendo DB:',
      error
    )

    return {}
  }
}

function writeBlacklist(data) {
  const temp = `${BLACKLIST_FILE}.tmp`

  try {
    fs.writeFileSync(
      temp,
      JSON.stringify(data, null, 2),
      'utf8'
    )

    fs.renameSync(temp, BLACKLIST_FILE)

    return true

  } catch (error) {
    console.error(
      '[BLACKLIST] Error guardando DB:',
      error
    )

    try {
      if (fs.existsSync(temp)) {
        fs.unlinkSync(temp)
      }
    } catch {}

    return false
  }
}

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

function findBanned(db, jid) {
  const target = normalizeJid(jid)

  if (!target) return null

  if (db[target]?.banned === true) {
    return {
      jid: target,
      data: db[target]
    }
  }

  for (const [savedJid, data] of Object.entries(db)) {
    if (!data?.banned) continue

    if (sameJid(savedJid, target)) {
      return {
        jid: savedJid,
        data
      }
    }

    const aliases = [
      data.lid,
      data.phoneNumber,
      ...(Array.isArray(data.aliases)
        ? data.aliases
        : [])
    ]

    if (aliases.some(id => sameJid(id, target))) {
      return {
        jid: savedJid,
        data
      }
    }
  }

  return null
}

// ============================================================
// 👑 PROTEGER OWNERS
// ============================================================

function getOwners() {
  const list = Array.isArray(global.owner)
    ? global.owner
    : global.owner
      ? [global.owner]
      : []

  return list
    .map(owner => {
      if (Array.isArray(owner)) {
        owner = owner[0]
      } else if (
        owner &&
        typeof owner === 'object'
      ) {
        owner =
          owner.id ||
          owner.jid ||
          owner.number ||
          owner.numero ||
          ''
      }

      return normalizeJid(owner)
    })
    .filter(Boolean)
}

function isProtected(conn, participant, metadata) {
  if (!participant) return true

  const ids = getParticipantIds(participant)

  const botIds = [
    conn.user?.id,
    conn.user?.jid,
    conn.user?.lid
  ].filter(Boolean)

  if (
    ids.some(id =>
      botIds.some(bot => sameJid(id, bot))
    )
  ) {
    return true
  }

  const owners = getOwners()

  if (
    ids.some(id =>
      owners.some(owner => sameJid(id, owner))
    )
  ) {
    return true
  }

  if (participant.admin === 'superadmin') {
    return true
  }

  const groupOwner = metadata?.owner

  if (
    groupOwner &&
    ids.some(id => sameJid(id, groupOwner))
  ) {
    return true
  }

  return false
}

// ============================================================
// 👤 PARTICIPANTES Y LID
// ============================================================

function getParticipantIds(participant) {
  if (!participant) return []

  return [
    participant.id,
    participant.jid,
    participant.lid,
    participant.phoneNumber,
    participant.phone
  ]
    .map(normalizeJid)
    .filter(Boolean)
}

function participantMatches(participant, target) {
  if (!participant || !target) return false

  return getParticipantIds(participant)
    .some(id => sameJid(id, target))
}

function getRemovalJid(participant) {
  return normalizeJid(
    participant?.id ||
    participant?.jid ||
    participant?.lid ||
    participant?.phoneNumber ||
    participant?.phone
  )
}

function findParticipant(participants, target, data = {}) {
  const identifiers = [
    target,
    data.lid,
    data.phoneNumber,
    ...(Array.isArray(data.aliases)
      ? data.aliases
      : [])
  ].filter(Boolean)

  return participants.find(participant =>
    identifiers.some(id =>
      participantMatches(participant, id)
    )
  )
}

function getAliases(participant) {
  return [
    ...new Set(
      getParticipantIds(participant)
    )
  ]
}

// ============================================================
// 🎯 OBTENER USUARIO DEL COMANDO
// ============================================================

function getTargetFromMessage(m, text = '') {
  const quoted =
    m.quoted?.sender ||
    m.quoted?.participant

  if (quoted) {
    return normalizeJid(quoted)
  }

  if (m.mentionedJid?.length) {
    return normalizeJid(m.mentionedJid[0])
  }

  const clean = String(text).trim()

  const match = clean.match(/^\+?(\d{7,15})(?:\s|$)/)

  if (match) {
    return normalizeJid(match[1])
  }

  return null
}

function getReason(text = '') {
  return String(text)
    .replace(/@\S+/g, '')
    .trim() || 'Sin motivo especificado'
}

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
// 📢 AVISO DE EXPULSIÓN
// ============================================================

async function sendKickNotice(
  conn,
  groupJid,
  removalJid,
  reason
) {
  const user = removalJid.split('@')[0]

  const texto = `╭━━〔 🛡️ *WHATSAPP-BOT* 〕━━⬣
┃
┃ ⛔ *USUARIO EXPULSADO*
┃
┃ 👤 @${user}
┃ 📝 *Motivo:* ${safeText(reason, 120)}
┃ 🚫 *Estado:* Expulsado
┃ 🛡️ *Sistema:* Lista negra global
┃
┃ ⚠️ Este usuario tiene prohibido
┃ permanecer en los grupos del bot.
┃
╰━━━━━━━━━━━━━━━━━━⬣`

  try {
    await conn.sendMessage(groupJid, {
      text: texto,
      mentions: [removalJid]
    })

    console.log(
      `[BLACKLIST] Aviso enviado: ${groupJid}`
    )

    return true

  } catch (error) {
    console.error(
      '[BLACKLIST] Error con mención:',
      error?.message || error
    )
  }

  try {
    await conn.sendMessage(groupJid, {
      text: texto.replace(
        `@${user}`,
        user
      )
    })

    return true

  } catch (error) {
    console.error(
      '[BLACKLIST] Error enviando aviso:',
      error?.message || error
    )

    return false
  }
}

// ============================================================
// 🚫 EXPULSAR Y CONFIRMAR
// ============================================================

async function kickUser(
  conn,
  groupJid,
  targetJid,
  reason = 'Sin motivo especificado',
  notify = true,
  targetData = {}
) {
  const lockKey = `${groupJid}:${targetJid}`

  if (activeKicks.has(lockKey)) {
    return {
      ok: false,
      reason: 'En proceso'
    }
  }

  activeKicks.add(lockKey)

  try {
    const metadata = await conn.groupMetadata(
      groupJid
    )

    const participants = metadata?.participants || []

    const groupName = metadata?.subject || groupJid

    const participant = findParticipant(
      participants,
      targetJid,
      targetData
    )

    if (!participant) {
      return {
        ok: false,
        reason: 'No estaba en el grupo',
        groupName
      }
    }

    if (isProtected(conn, participant, metadata)) {
      return {
        ok: false,
        reason: 'Usuario protegido',
        groupName
      }
    }

    const botParticipant = participants.find(p =>
      getParticipantIds(p).some(id =>
        [
          conn.user?.id,
          conn.user?.jid,
          conn.user?.lid
        ].some(botId => sameJid(id, botId))
      )
    )

    if (!botParticipant?.admin) {
      return {
        ok: false,
        reason: 'El bot no es administrador',
        groupName
      }
    }

    const removalJid = getRemovalJid(participant)

    if (!removalJid) {
      return {
        ok: false,
        reason: 'No se pudo identificar al usuario',
        groupName
      }
    }

    // ========================================================
    // 🚫 EXPULSIÓN
    // ========================================================

    const result = await conn.groupParticipantsUpdate(
      groupJid,
      [removalJid],
      'remove'
    )

    const status = Array.isArray(result)
      ? result[0]?.status
      : result?.status

    if (
      status !== undefined &&
      Number(status) !== 200
    ) {
      return {
        ok: false,
        reason: `WhatsApp rechazó la expulsión (${status})`,
        groupName
      }
    }

    // ========================================================
    // 🔍 CONFIRMAR SALIDA
    // ========================================================

    let confirmed = false

    for (let attempt = 0; attempt < 3; attempt++) {
      await sleep(1200)

      try {
        const updated = await conn.groupMetadata(
          groupJid
        )

        const stillPresent = findParticipant(
          updated.participants || [],
          removalJid
        )

        if (!stillPresent) {
          confirmed = true
          break
        }

      } catch (error) {
        console.error(
          '[BLACKLIST] Error verificando expulsión:',
          error?.message || error
        )
      }
    }

    if (!confirmed) {
      return {
        ok: false,
        reason: 'No se pudo confirmar la expulsión',
        groupName
      }
    }

    // ========================================================
    // 📢 ENVIAR AVISO
    // ========================================================

    let notificationSent = false

    if (notify) {
      notificationSent = await sendKickNotice(
        conn,
        groupJid,
        removalJid,
        reason
      )
    }

    console.log(
      `[BLACKLIST] Expulsado ${removalJid} ` +
      `de ${groupName}. Aviso: ` +
      `${notificationSent ? 'OK' : 'NO ENVIADO'}`
    )

    return {
      ok: true,
      groupName,
      notificationSent
    }

  } catch (error) {
    console.error(
      `[BLACKLIST] Error expulsando en ${groupJid}:`,
      error?.message || error
    )

    return {
      ok: false,
      reason: error?.message || 'Error desconocido',
      groupName: groupJid
    }

  } finally {
    activeKicks.delete(lockKey)
  }
}

// ============================================================
// 🔄 EJECUTAR EXPULSIONES CONTROLADAS
// ============================================================

async function runWithConcurrency(items, limit, task) {
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
          await task(items[index], index)
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
// 📦 COMANDOS
// ============================================================

const handler = async (m, {
  conn,
  command,
  text = ''
}) => {

  const cmd = String(command || '')
    .toLowerCase()
    .replace(/^\./, '')
    .trim()

  if (![
    'ln',
    'unln',
    'vln',
    'clrn'
  ].includes(cmd)) {
    return
  }

  const db = readBlacklist()
  const list = getBannedList(db)

  try {
    await m.react({
      ln: '🚫',
      unln: '🕊️',
      vln: '📋',
      clrn: '🧹'
    }[cmd])
  } catch {}

  // ==========================================================
  // 📋 VER LISTA NEGRA
  // ==========================================================

  if (cmd === 'vln') {
    if (!list.length) {
      return conn.sendMessage(m.chat, {
        text: `╭━━〔 🛡️ *WHATSAPP-BOT* 〕━━⬣
┃
┃ 📋 *LISTA NEGRA GLOBAL*
┃
┃ 🟢 Sin usuarios bloqueados
┃ 👥 Total: 0
┃
╰━━━━━━━━━━━━━━━━━━⬣`
      })
    }

    const shown = list.slice(0, MAX_LIST_ITEMS)

    let texto = `╭━━〔 🛡️ *WHATSAPP-BOT* 〕━━⬣
┃
┃ 📋 *LISTA NEGRA GLOBAL*
┃ 👥 *Usuarios:* ${list.length}
┃
┣━━━━━━━━━━━━━━━━━━
`

    const mentions = []

    shown.forEach(([jid, data], index) => {
      texto += `┃
┃ *${index + 1}.* @${jid.split('@')[0]}
┃ 📝 ${safeText(data.reason, 90)}
┃ 📅 ${formatDate(data.addedAt)}
┃`

      mentions.push(jid)
    })

    if (list.length > MAX_LIST_ITEMS) {
      texto += `
┃
┃ Se muestran ${MAX_LIST_ITEMS} registros.`
    }

    texto += `
┃
╰━━━━━━━━━━━━━━━━━━⬣`

    return conn.sendMessage(m.chat, {
      text: texto,
      mentions
    })
  }

  // ==========================================================
  // 🧹 LIMPIAR LISTA NEGRA
  // ==========================================================

  if (cmd === 'clrn') {
    if (!list.length) {
      return conn.sendMessage(m.chat, {
        text: '📋 La lista negra ya está vacía.'
      })
    }

    for (const jid of Object.keys(db)) {
      if (db[jid]) {
        db[jid].banned = false
      }
    }

    if (!writeBlacklist(db)) {
      return m.reply(
        '❌ No se pudo guardar la limpieza.'
      )
    }

    return conn.sendMessage(m.chat, {
      text: `╭━━〔 🛡️ *WHATSAPP-BOT* 〕━━⬣
┃
┃ 🧹 *LISTA NEGRA LIMPIADA*
┃
┃ ✅ Registros desactivados: ${list.length}
┃ 💾 Base de datos actualizada
┃
╰━━━━━━━━━━━━━━━━━━⬣`
    })
  }

  // ==========================================================
  // 👤 OBTENER USUARIO
  // ==========================================================

  const cleanText = String(text).trim()

  let targetJid = null

  if (
    cmd === 'unln' &&
    /^\d+$/.test(cleanText)
  ) {
    const index = Number(cleanText) - 1

    if (!list[index]) {
      return m.reply(
        `⚠️ Posición inválida. Elegí entre 1 y ${list.length}.`
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
    return m.reply(
      '⚠️ Mencioná al usuario o respondé a su mensaje.'
    )
  }

  // ==========================================================
  // 🚫 AGREGAR A LISTA NEGRA
  // ==========================================================

  if (cmd === 'ln') {
    const reason = getReason(cleanText)

    const existing = findBanned(db, targetJid)

    const storedJid = existing?.jid || targetJid

    // No permitir bloquear owners conocidos.
    if (
      getOwners().some(owner =>
        sameJid(owner, targetJid)
      )
    ) {
      return m.reply(
        '⛔ No podés agregar un owner a la lista negra.'
      )
    }

    const aliases = new Set(
      existing?.data?.aliases || []
    )

    aliases.add(targetJid)

    // Buscar otros identificadores en el grupo actual.
    if (m.isGroup) {
      try {
        const metadata = await conn.groupMetadata(
          m.chat
        )

        const participant = findParticipant(
          metadata.participants || [],
          targetJid
        )

        if (participant) {
          if (isProtected(conn, participant, metadata)) {
            return m.reply(
              '⛔ Ese usuario está protegido.'
            )
          }

          getAliases(participant).forEach(id =>
            aliases.add(id)
          )
        }
      } catch {}
    }

    db[storedJid] = {
      ...(db[storedJid] || {}),
      banned: true,
      reason,
      addedBy: m.sender,
      addedAt: Date.now(),
      aliases: [...aliases]
    }

    if (!writeBlacklist(db)) {
      return m.reply(
        '❌ No se pudo guardar la lista negra.'
      )
    }

    // ========================================================
    // 🌐 EXPULSIÓN GLOBAL
    // ========================================================

    let groups = []

    try {
      const participating =
        await conn.groupFetchAllParticipating()

      groups = Object.keys(participating || {})

    } catch (error) {
      console.error(
        '[BLACKLIST] Error obteniendo grupos:',
        error
      )
    }

    let kicked = 0
    let failed = 0
    let absent = 0
    let notices = 0

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
          true,
          db[storedJid]
        )

        if (result.ok) {
          kicked++

          if (result.notificationSent) {
            notices++
          }

        } else if (
          result.reason === 'No estaba en el grupo'
        ) {
          absent++

        } else {
          failed++

          failedGroups.push({
            name: result.groupName || groupJid,
            reason: result.reason || 'Error'
          })
        }
      }
    )

    // ========================================================
    // 📊 INFORME FINAL
    // ========================================================

    let report = `╭━━〔 🛡️ *WHATSAPP-BOT* 〕━━⬣
┃
┃ 🚫 *USUARIO REGISTRADO*
┃
┃ 👤 @${storedJid.split('@')[0]}
┃ 📝 *Motivo:* ${safeText(reason, 120)}
┃
┣━━〔 📊 *RESULTADO GLOBAL* 〕
┃
┃ 🌐 Grupos revisados: ${groups.length}
┃ ✅ Expulsiones: ${kicked}
┃ 📢 Avisos enviados: ${notices}
┃ 👤 No estaba presente: ${absent}
┃ ⚠️ Operaciones fallidas: ${failed}
┃
┃ 💾 Registro guardado
┃ 🛡️ Protección activa
┃
╰━━━━━━━━━━━━━━━━━━⬣`

    if (failedGroups.length) {
      report += '\n\n⚠️ *GRUPOS CON ERRORES*\n'

      failedGroups.slice(0, 6).forEach(
        (group, index) => {
          report +=
            `\n${index + 1}. ${safeText(group.name, 40)}` +
            `\n   ${safeText(group.reason, 80)}`
        }
      )
    }

    return conn.sendMessage(m.chat, {
      text: report,
      mentions: [storedJid]
    })
  }

  // ==========================================================
  // 🕊️ LIBERAR USUARIO
  // ==========================================================

  if (cmd === 'unln') {
    const found = findBanned(db, targetJid)

    if (!found) {
      return m.reply(
        'ℹ️ Ese usuario no está en la lista negra.'
      )
    }

    db[found.jid] = {
      ...db[found.jid],
      banned: false,
      removedAt: Date.now(),
      removedBy: m.sender
    }

    if (!writeBlacklist(db)) {
      return m.reply(
        '❌ No se pudo actualizar la lista.'
      )
    }

    return conn.sendMessage(m.chat, {
      text: `╭━━〔 🛡️ *WHATSAPP-BOT* 〕━━⬣
┃
┃ 🕊️ *USUARIO LIBERADO*
┃
┃ 👤 @${found.jid.split('@')[0]}
┃ ✅ Ya no está bloqueado
┃ 💾 Registro actualizado
┃
╰━━━━━━━━━━━━━━━━━━⬣`,
      mentions: [found.jid]
    })
  }
}

// ============================================================
// 🚫 AUTOEXPULSIÓN AL HABLAR
// ============================================================

handler.all = async function (m) {
  try {
    if (!m?.isGroup || !m.chat) return

    const db = readBlacklist()

    const match = findBanned(
      db,
      m.sender
    )

    if (!match) return

    await kickUser(
      this,
      m.chat,
      match.jid,
      match.data?.reason,
      true,
      match.data
    )

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
      ![27, 31].includes(m.messageStubType)
    ) {
      return
    }

    const db = readBlacklist()

    for (const user of m.messageStubParameters || []) {
      const match = findBanned(
        db,
        user
      )

      if (!match) continue

      await kickUser(
        this,
        m.chat,
        match.jid,
        match.data?.reason,
        true,
        match.data
      )
    }

  } catch (error) {
    console.error(
      '[BLACKLIST] Error revisando ingresos:',
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
