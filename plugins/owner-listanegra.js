// 📂 plugins/propietario-listanegra.js
// 🤖 WHATSAPP-BOT — LISTA NEGRA DEL OWNER
// ============================================================
// .ln @usuario       → agregar por mención
// .ln 59899123456    → agregar por número internacional
// .ln 099123456      → agregar por número uruguayo
// .unln @usuario     → quitar de lista negra
// .unln 1            → quitar por número de lista
// .vln               → ver lista negra
// .clrn              → limpiar lista negra
//
// 🚫 Expulsión automática al hablar
// 🚫 Expulsión automática al entrar
// 🚫 Expulsión al ser citado
// 🚫 Expulsión global de todos los grupos
// 💾 Base de datos JSON
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const DATABASE_DIR = './database'
const BLACKLIST_FILE = path.join(DATABASE_DIR, 'blacklist.json')

// ============================================================
// 📁 CREAR CARPETA / ARCHIVO
// ============================================================

if (!fs.existsSync(DATABASE_DIR)) {
  fs.mkdirSync(DATABASE_DIR, { recursive: true })
}

if (!fs.existsSync(BLACKLIST_FILE)) {
  fs.writeFileSync(BLACKLIST_FILE, '{}')
}

// ============================================================
// ⏳ ESPERA
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================
// 🔢 NORMALIZAR JID
// ============================================================

function normalizeJid(jid = '') {
  if (!jid) return null

  jid = String(jid).trim().replace(/^\+/, '')

  if (jid.endsWith('@c.us')) {
    return jid.replace('@c.us', '@s.whatsapp.net')
  }

  if (
    jid.endsWith('@s.whatsapp.net') ||
    jid.endsWith('@lid')
  ) {
    return jid
  }

  if (jid.includes('@')) return jid

  const cleaned = jid.replace(/[^0-9]/g, '')
  if (!cleaned) return null

  return `${cleaned}@s.whatsapp.net`
}

// ============================================================
// 🔢 SOLO NÚMEROS
// ============================================================

function digitsOnly(text = '') {
  return String(text).replace(/[^0-9]/g, '')
}

// ============================================================
// 📱 NORMALIZAR NÚMERO URUGUAYO
// ============================================================

function normalizePhoneNumber(text = '') {
  let number = digitsOnly(text)

  if (!number) return null

  if (number.startsWith('00')) {
    number = number.slice(2)
  }

  // Número con prefijo internacional de Uruguay
  if (number.startsWith('598')) {
    return number.length >= 11 && number.length <= 15
      ? number
      : null
  }

  // Celular uruguayo escrito como 09XXXXXXX
  if (number.length === 9 && number.startsWith('09')) {
    return `598${number.slice(1)}`
  }

  // Número uruguayo sin el 0 inicial
  if (number.length === 8 && /^[924]/.test(number)) {
    return `598${number}`
  }

  // Otros números internacionales completos
  if (number.length >= 10 && number.length <= 15) {
    return number
  }

  return null
}

// ============================================================
// 👤 BUSCAR PARTICIPANTE POR NÚMERO
// ============================================================

function findParticipantByDigits(metadata, digits) {
  if (!metadata || !Array.isArray(metadata.participants)) {
    return null
  }

  const target = digitsOnly(digits)
  if (!target) return null

  return metadata.participants.find(p => {
    const participantDigits = digitsOnly(p.id || '')

    return (
      participantDigits === target ||
      participantDigits.endsWith(target) ||
      target.endsWith(participantDigits)
    )
  }) || null
}

// ============================================================
// 💾 LEER BLACKLIST
// ============================================================

function readBlacklist() {
  try {
    const data = fs.readFileSync(BLACKLIST_FILE, 'utf8')
    const parsed = JSON.parse(data)

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {}
  } catch {
    return {}
  }
}

// ============================================================
// 💾 GUARDAR BLACKLIST
// ============================================================

function writeBlacklist(data) {
  try {
    fs.writeFileSync(
      BLACKLIST_FILE,
      JSON.stringify(data, null, 2)
    )

    return true
  } catch (e) {
    console.error('❌ Error guardando blacklist:', e)
    return false
  }
}

// ============================================================
// 👑 NORMALIZAR COMANDO
// ============================================================

function normalizeCommand(command = '') {
  return String(command)
    .toLowerCase()
    .trim()
    .replace(/^\./, '')
}

// ============================================================
// 🔎 BUSCAR REGISTRO POR NÚMERO
// ============================================================

function findBlacklistEntryByDigits(dbUsers, digits) {
  const target = digitsOnly(digits)

  if (!target) return null

  for (const [jid, data] of Object.entries(dbUsers)) {
    const storedDigits = digitsOnly(jid)

    if (
      storedDigits &&
      (
        storedDigits === target ||
        storedDigits.endsWith(target) ||
        target.endsWith(storedDigits)
      )
    ) {
      return { jid, data }
    }
  }

  return null
}

// ============================================================
// 🚫 EXPULSAR USUARIO — UN AVISO POR GRUPO
// ============================================================

const activeKicks = new Set()

async function kickUser(
  conn,
  groupJid,
  userJid,
  reason = 'No especificado',
  aviso = true
) {
  let lockKey = null

  try {
    const meta = await conn.groupMetadata(groupJid)
    const targetDigits = digitsOnly(userJid)

    let participant = meta.participants?.find(
      p => normalizeJid(p.id) === normalizeJid(userJid)
    )

    if (!participant && targetDigits) {
      participant = findParticipantByDigits(meta, targetDigits)
    }

    if (!participant) return false

    lockKey = `${groupJid}:${participant.id}`

    if (activeKicks.has(lockKey)) return false

    activeKicks.add(lockKey)

    // Volver a consultar para comprobar que siga en el grupo
    const freshMeta = await conn.groupMetadata(groupJid)

    let stillPresent = freshMeta.participants?.find(
      p => p.id === participant.id
    )

    if (!stillPresent && targetDigits) {
      stillPresent = findParticipantByDigits(freshMeta, targetDigits)
    }

    if (!stillPresent) return false

    const finalJid = stillPresent.id

    await conn.groupParticipantsUpdate(
      groupJid,
      [finalJid],
      'remove'
    )

    if (aviso) {
      await sleep(700)

      await conn.sendMessage(groupJid, {
        text:
`🚫 *USUARIO BLOQUEADO — LISTA NEGRA*
━━━━━━━━━━━━━━━━━━━━
👤 @${String(finalJid).split('@')[0]}
📝 *Motivo:* ${reason}
🚷 *Expulsión automática*
━━━━━━━━━━━━━━━━━━━━`,
        mentions: [finalJid]
      })
    }

    return true
  } catch (e) {
    console.error(`❌ Error expulsando en ${groupJid}:`, e)
    return false
  } finally {
    if (lockKey) activeKicks.delete(lockKey)
  }
}

// ============================================================
// 📦 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn, command, text }) => {
  const cmd = normalizeCommand(command)
  const SEP = '━━━━━━━━━━━━━━━━━━━━'

  const ICON = {
    ban: '🚫',
    ok: '✅',
    warn: '⚠️'
  }

  const dbUsers = readBlacklist()

  if (!['ln', 'unln', 'vln', 'clrn'].includes(cmd)) {
    return
  }

  // Reacciones
  try {
    if (cmd === 'ln') await m.react('🚫')
    if (cmd === 'unln') await m.react('🕊️')
    if (cmd === 'vln') await m.react('📋')
    if (cmd === 'clrn') await m.react('🧹')
  } catch {}

  // ==========================================================
  // 🚫 SI SE CITA A UN BLOQUEADO, INTENTAR EXPULSARLO
  // ==========================================================

  if (m.isGroup && m.quoted) {
    const quotedJid = normalizeJid(
      m.quoted.sender || m.quoted.participant
    )

    const quotedDigits = digitsOnly(quotedJid)
    const quotedEntry =
      dbUsers[quotedJid]?.banned
        ? { jid: quotedJid, data: dbUsers[quotedJid] }
        : findBlacklistEntryByDigits(dbUsers, quotedDigits)

    if (quotedEntry?.data?.banned) {
      await kickUser(
        conn,
        m.chat,
        quotedEntry.jid,
        quotedEntry.data.reason || 'No especificado',
        true
      )
    }
  }

  const bannedList = Object.entries(dbUsers)
    .filter(([, data]) => data?.banned === true)

  let userJid = null
  let numberDigits = null
  let reason = 'No especificado'

  // ==========================================================
  // 🔢 QUITAR POR NÚMERO DE LISTA
  // ==========================================================

  if (
    cmd === 'unln' &&
    /^\d+$/.test(String(text || '').trim())
  ) {
    const index = parseInt(String(text).trim(), 10) - 1

    if (!bannedList[index]) {
      try { await m.react('❌') } catch {}

      return conn.reply(
        m.chat,
        `${ICON.ban} Número de lista inválido.`,
        m
      )
    }

    userJid = bannedList[index][0]
  }

  // ==========================================================
  // 👤 RESOLVER USUARIO: RESPUESTA, MENCIÓN O NÚMERO
  // ==========================================================

  else if (m.quoted) {
    userJid = normalizeJid(
      m.quoted.sender || m.quoted.participant
    )
  } else if (m.mentionedJid?.length) {
    userJid = normalizeJid(m.mentionedJid[0])
  } else if (text) {
    const firstToken = String(text).trim().split(/\s+/)[0]
    numberDigits = normalizePhoneNumber(firstToken)

    if (numberDigits) {
      const existing = findBlacklistEntryByDigits(dbUsers, numberDigits)
      userJid = existing?.jid || normalizeJid(numberDigits)
    }
  }

  // ==========================================================
  // 📝 MOTIVO
  // ==========================================================

  if (text) {
    let reasonText = String(text).trim()

    if (numberDigits) {
      reasonText = reasonText.replace(/^\S+\s*/, '')
    } else if (m.mentionedJid?.length) {
      reasonText = reasonText.replace(/@\S+/g, '')
    }

    reason = reasonText.trim() || 'No especificado'
  }

  // ==========================================================
  // ❌ FALTA USUARIO
  // ==========================================================

  if (!userJid && !['vln', 'clrn'].includes(cmd)) {
    try { await m.react('❌') } catch {}

    return conn.reply(
      m.chat,
      `${ICON.warn} Debes mencionar, responder o escribir un número válido.`,
      m
    )
  }

  // ==========================================================
  // 📦 BUSCAR REGISTRO EXISTENTE POR NÚMERO
  // ==========================================================

  if (userJid && !dbUsers[userJid]) {
    dbUsers[userJid] = {}
  }

  // ==========================================================
  // 🚫 AGREGAR A LISTA NEGRA
  // ==========================================================

  if (cmd === 'ln') {
    dbUsers[userJid] = {
      ...(dbUsers[userJid] || {}),
      banned: true,
      reason,
      addedBy: m.sender,
      addedAt: Date.now()
    }

    if (!writeBlacklist(dbUsers)) {
      return conn.reply(
        m.chat,
        `${ICON.ban} No se pudo guardar la lista negra.`,
        m
      )
    }

    // Intentar expulsar de todos los grupos
    try {
      const groups = Object.keys(
        await conn.groupFetchAllParticipating()
      )

      for (const jid of groups) {
        await sleep(500)

        await kickUser(
          conn,
          jid,
          userJid,
          reason,
          true
        )
      }
    } catch (e) {
      console.error('❌ Error expulsando globalmente:', e)
    }

    // Sin mensaje de confirmación adicional
    return
  }

  // ==========================================================
  // 🕊️ QUITAR DE LISTA NEGRA
  // ==========================================================

  if (cmd === 'unln') {
    const entry = dbUsers[userJid]

    if (!entry?.banned) {
      try { await m.react('❌') } catch {}

      return conn.reply(
        m.chat,
        `${ICON.ban} El usuario no está en la lista negra.`,
        m
      )
    }

    dbUsers[userJid] = {
      banned: false,
      removedAt: Date.now()
    }

    writeBlacklist(dbUsers)

    return conn.sendMessage(m.chat, {
      text:
`✅ *USUARIO LIBERADO*
${SEP}
👤 @${String(userJid).split('@')[0]}
${SEP}`,
      mentions: [userJid]
    })
  }

  // ==========================================================
  // 📋 VER LISTA NEGRA
  // ==========================================================

  if (cmd === 'vln') {
    if (!bannedList.length) {
      return conn.reply(
        m.chat,
        `${ICON.ok} *La lista negra está vacía.*`,
        m
      )
    }

    let msg =
      `${ICON.ban} *LISTA NEGRA — ${bannedList.length} USUARIOS*\n${SEP}\n`

    const mentions = []

    bannedList.forEach(([jid, data], i) => {
      msg +=
`*${i + 1}.* 👤 @${String(jid).split('@')[0]}
📝 ${data.reason || 'No especificado'}

`

      mentions.push(jid)
    })

    msg += SEP

    return conn.sendMessage(m.chat, {
      text: msg.trim(),
      mentions
    })
  }

  // ==========================================================
  // 🧹 LIMPIAR LISTA NEGRA
  // ==========================================================

  if (cmd === 'clrn') {
    for (const jid in dbUsers) {
      dbUsers[jid].banned = false
    }

    writeBlacklist(dbUsers)

    return conn.sendMessage(m.chat, {
      text:
`✅ *LISTA NEGRA VACIADA*
${SEP}`
    })
  }
}

// ============================================================
// 🚫 EXPULSAR SI EL BLOQUEADO HABLA
// ============================================================

handler.all = async function (m) {
  try {
    if (!m.isGroup) return

    const sender = normalizeJid(m.sender)
    if (!sender) return

    const dbUsers = readBlacklist()
    let entry = dbUsers[sender]

    if (!entry?.banned) {
      const digits = digitsOnly(sender)
      const match = findBlacklistEntryByDigits(dbUsers, digits)

      if (!match?.data?.banned) return
      entry = match.data
    }

    await kickUser(
      this,
      m.chat,
      sender,
      entry.reason || 'No especificado',
      true
    )
  } catch {}
}

// ============================================================
// 🚨 EXPULSAR AL ENTRAR
// ============================================================

handler.before = async function (m) {
  try {
    if (!m.isGroup) return
    if (![27, 31].includes(m.messageStubType)) return

    const dbUsers = readBlacklist()

    for (const u of m.messageStubParameters || []) {
      const ujid = normalizeJid(u)
      if (!ujid) continue

      let entry = dbUsers[ujid]

      if (!entry?.banned) {
        const match = findBlacklistEntryByDigits(
          dbUsers,
          digitsOnly(ujid)
        )

        if (!match?.data?.banned) continue
        entry = match.data
      }

      await kickUser(
        this,
        m.chat,
        ujid,
        entry.reason || 'No especificado',
        true
      )
    }
  } catch {}
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = /^(ln|unln|vln|clrn)$/i

handler.help = [
  'ln @usuario',
  'ln 598XXXXXXXX',
  'ln 09XXXXXXX',
  'unln @usuario',
  'unln <número de lista>',
  'vln',
  'clrn'
]

handler.tags = ['owner']
handler.rowner = true

export default handler
