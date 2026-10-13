// 📂 plugins/propietario-listanegra.js
// 🛡️ LISTA NEGRA GLOBAL DEL OWNER
// ============================================================
// .ln @usuario  → Agregar a lista negra
// .unln @usuario → Quitar de lista negra
// .unln <número> → Quitar por posición
// .vln           → Ver lista negra
// .clrn          → Limpiar lista negra
//
// 🚫 Expulsión global de todos los grupos
// 📢 Aviso en cada grupo donde se realiza una expulsión
// 🚫 Autoexpulsión al hablar
// 🚫 Autoexpulsión al entrar
// 🚫 Expulsión al citar a un bloqueado
// 💾 Base de datos JSON
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const DATABASE_DIR = './database'
const BLACKLIST_FILE = path.join(DATABASE_DIR, 'blacklist.json')

if (!fs.existsSync(DATABASE_DIR)) {
  fs.mkdirSync(DATABASE_DIR, { recursive: true })
}

if (!fs.existsSync(BLACKLIST_FILE)) {
  fs.writeFileSync(BLACKLIST_FILE, '{}', 'utf8')
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

  jid = String(jid)
    .trim()
    .replace(/^\+/, '')
    .replace(/:\d+(?=@)/g, '')

  if (jid.endsWith('@c.us')) {
    return jid.replace('@c.us', '@s.whatsapp.net')
  }

  if (jid.includes('@')) {
    return jid
  }

  const digits = jid.replace(/\D/g, '')
  return digits ? `${digits}@s.whatsapp.net` : null
}

// ============================================================
// 🔢 SOLO NÚMEROS
// ============================================================

function digitsOnly(text = '') {
  return String(text).replace(/\D/g, '')
}

// ============================================================
// 📱 EXTRAER TELÉFONO
// ============================================================

function extractPhoneNumber(text = '') {
  const value = String(text).trim()

  if (!/^\+?[\d\s().-]{7,25}$/.test(value)) {
    return null
  }

  const digits = digitsOnly(value)

  return digits.length >= 7 && digits.length <= 15
    ? digits
    : null
}

// ============================================================
// 💾 LEER BASE DE DATOS
// ============================================================

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
    console.error('[LISTA NEGRA] Error leyendo DB:', error)
    return {}
  }
}

// ============================================================
// 💾 GUARDAR BASE DE DATOS
// ============================================================

function writeBlacklist(data) {
  try {
    fs.writeFileSync(
      BLACKLIST_FILE,
      JSON.stringify(data, null, 2),
      'utf8'
    )
    return true
  } catch (error) {
    console.error('[LISTA NEGRA] Error guardando DB:', error)
    return false
  }
}

// ============================================================
// 👤 BUSCAR PARTICIPANTE POR JID / LID
// ============================================================

function findParticipant(metadata, userJid) {
  const target = normalizeJid(userJid)
  const participants = metadata?.participants || []

  if (!target) return null

  return participants.find(p => {
    const ids = [
      p.id,
      p.jid,
      p.lid,
      p.phoneNumber
    ].filter(Boolean).map(normalizeJid)

    return ids.includes(target)
  }) || null
}

// ============================================================
// 🔎 BUSCAR REGISTRO DE LISTA NEGRA
// ============================================================

function getBlacklistEntry(db, jid, metadata = null) {
  const normalized = normalizeJid(jid)

  if (!normalized) return null

  if (db[normalized]?.banned === true) {
    return { key: normalized, data: db[normalized] }
  }

  const participant = findParticipant(metadata, normalized)

  if (participant) {
    const ids = [
      participant.id,
      participant.jid,
      participant.lid,
      participant.phoneNumber
    ].filter(Boolean).map(normalizeJid)

    for (const id of ids) {
      if (id && db[id]?.banned === true) {
        return { key: id, data: db[id] }
      }
    }
  }

  // Comparar números solo con JID telefónicos.
  if (normalized.endsWith('@s.whatsapp.net')) {
    const phone = digitsOnly(normalized)

    for (const [key, data] of Object.entries(db)) {
      const savedJid = normalizeJid(key)

      if (
        data?.banned === true &&
        savedJid?.endsWith('@s.whatsapp.net') &&
        digitsOnly(savedJid) === phone
      ) {
        return { key, data }
      }
    }
  }

  return null
}

// ============================================================
// 📢 AVISO DE EXPULSIÓN
// ============================================================

async function sendKickNotice(
  conn,
  groupJid,
  participant,
  reason,
  event = 'Expulsión automática'
) {
  try {
    const jid = participant.id
    const isPhoneJid = jid.endsWith('@s.whatsapp.net')
    const userLabel = isPhoneJid
      ? `@${jid.split('@')[0]}`
      : 'Usuario identificado por LID'

    await conn.sendMessage(groupJid, {
      text:
`🚫 *USUARIO EXPULSADO — LISTA NEGRA*
━━━━━━━━━━━━━━━━━━━━
👤 *Usuario:* ${userLabel}
📝 *Motivo:* ${reason || 'No especificado'}
🚷 *Acción:* ${event}
━━━━━━━━━━━━━━━━━━━━`,
      mentions: isPhoneJid ? [jid] : []
    })
  } catch (error) {
    console.error(
      `[LISTA NEGRA] No se pudo enviar aviso a ${groupJid}:`,
      error?.message || error
    )
  }
}

// ============================================================
// 🚫 EXPULSAR USUARIO Y AVISAR EN ESE GRUPO
// ============================================================

async function kickUser(
  conn,
  groupJid,
  userJid,
  reason = 'No especificado',
  aviso = true,
  event = 'Expulsión automática'
) {
  try {
    const metadata = await conn.groupMetadata(groupJid)
    const participant = findParticipant(metadata, userJid)

    if (!participant) return false

    await conn.groupParticipantsUpdate(
      groupJid,
      [participant.id],
      'remove'
    )

    // Avisar únicamente después de solicitar la expulsión.
    if (aviso) {
      await sleep(500)

      await sendKickNotice(
        conn,
        groupJid,
        participant,
        reason,
        event
      )
    }

    return true
  } catch (error) {
    console.error(
      `[LISTA NEGRA] Error expulsando en ${groupJid}:`,
      error?.message || error
    )
    return false
  }
}

// ============================================================
// 🌎 EXPULSAR GLOBALMENTE Y AVISAR EN CADA GRUPO
// ============================================================

async function kickFromAllGroups(conn, userJid, reason) {
  let expulsados = 0
  let fallidos = 0

  const groups = await conn.groupFetchAllParticipating()
  const groupIds = Object.keys(groups || {})

  for (const groupJid of groupIds) {
    const result = await kickUser(
      conn,
      groupJid,
      userJid,
      reason,
      true,
      'Expulsión por lista negra global'
    )

    if (result) {
      expulsados++
    } else {
      fallidos++
    }

    await sleep(500)
  }

  return { expulsados, fallidos }
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
// 📦 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn, command, text }) => {
  const cmd = normalizeCommand(command)

  const SEP = '━━━━━━━━━━━━━━━━━━━━'

  if (!['ln', 'unln', 'vln', 'clrn'].includes(cmd)) {
    return
  }

  const dbUsers = readBlacklist()

  // ==========================================================
  // 👑 REACCIONES
  // ==========================================================

  try {
    const reactions = {
      ln: '🚫',
      unln: '🕊️',
      vln: '📋',
      clrn: '🧹'
    }

    await m.react(reactions[cmd])
  } catch {}

  // ==========================================================
  // 🚫 AUTOEXPULSIÓN AL CITAR A UN BLOQUEADO
  // ==========================================================

  if (m.isGroup && m.quoted) {
    try {
      const quotedJid = normalizeJid(
        m.quoted.sender ||
        m.quoted.participant ||
        m.quoted.key?.participant
      )

      const metadata = await conn.groupMetadata(m.chat)
      const entry = getBlacklistEntry(
        dbUsers,
        quotedJid,
        metadata
      )

      if (entry) {
        await kickUser(
          conn,
          m.chat,
          quotedJid,
          entry.data.reason,
          true,
          'Expulsión por lista negra al citar'
        )
      }
    } catch (error) {
      console.error('[LISTA NEGRA] Error al comprobar cita:', error)
    }
  }

  // ==========================================================
  // 📋 LISTA ACTUAL
  // ==========================================================

  const bannedList = Object.entries(dbUsers).filter(
    ([, data]) => data?.banned === true
  )

  // ==========================================================
  // 👤 DETERMINAR USUARIO
  // ==========================================================

  let userJid = null
  let numberDigits = null
  const input = String(text || '').trim()

  if (cmd === 'unln' && /^\d+$/.test(input)) {
    const index = Number.parseInt(input, 10) - 1

    if (!bannedList[index]) {
      return conn.reply(m.chat, '❌ Número de lista inválido.', m)
    }

    userJid = bannedList[index][0]
  } else if (m.quoted) {
    userJid = normalizeJid(
      m.quoted.sender ||
      m.quoted.participant ||
      m.quoted.key?.participant
    )
  } else if (m.mentionedJid?.length) {
    userJid = normalizeJid(m.mentionedJid[0])
  } else if (input) {
    const number = extractPhoneNumber(input)

    if (number) {
      numberDigits = number
      userJid = normalizeJid(number)
    }
  }

  // ==========================================================
  // 📝 MOTIVO
  // ==========================================================

  let reason = input
    .replace(/@\S+/g, '')
    .replace(/\+?\d{7,15}/g, '')
    .trim()

  if (!reason) reason = 'No especificado'

  // ==========================================================
  // ❌ VALIDAR USUARIO
  // ==========================================================

  if (!userJid && !['vln', 'clrn'].includes(cmd)) {
    return conn.reply(
      m.chat,
      '⚠️ Respondé a un mensaje, mencioná al usuario o usá un número válido.',
      m
    )
  }

  // ==========================================================
  // 🚫 AGREGAR A LISTA NEGRA
  // ==========================================================

  if (cmd === 'ln') {
    if (
      numberDigits &&
      !m.quoted &&
      !m.mentionedJid?.length
    ) {
      return conn.reply(
        m.chat,
        '⚠️ Para agregar a alguien, respondé a su mensaje o mencioná al usuario.',
        m
      )
    }

    const existing = getBlacklistEntry(dbUsers, userJid)

    if (existing) {
      return conn.reply(
        m.chat,
        '⚠️ Este usuario ya está en la lista negra.',
        m
      )
    }

    dbUsers[userJid] = {
      banned: true,
      reason,
      addedBy: m.sender,
      addedAt: Date.now()
    }

    if (!writeBlacklist(dbUsers)) {
      return conn.reply(
        m.chat,
        '❌ No se pudo guardar la lista negra.',
        m
      )
    }

    let result = { expulsados: 0, fallidos: 0 }

    try {
      result = await kickFromAllGroups(
        conn,
        userJid,
        reason
      )
    } catch (error) {
      console.error('[LISTA NEGRA] Error global:', error)
    }

    return conn.sendMessage(
      m.chat,
      {
        text:
`🚫 *AGREGADO A LISTA NEGRA*
━━━━━━━━━━━━━━━━━━━━
👤 *Usuario:* ${userJid}
📝 *Motivo:* ${reason}
🌎 *Expulsiones realizadas:* ${result.expulsados}
⚠️ *Grupos donde no se pudo expulsar:* ${result.fallidos}
━━━━━━━━━━━━━━━━━━━━`,
      },
      { quoted: m }
    )
  }

  // ==========================================================
  // 🕊️ QUITAR DE LISTA NEGRA
  // ==========================================================

  if (cmd === 'unln') {
    const entry = getBlacklistEntry(dbUsers, userJid)

    if (!entry) {
      return conn.reply(
        m.chat,
        '⚠️ El usuario no está en la lista negra.',
        m
      )
    }

    dbUsers[entry.key] = {
      ...entry.data,
      banned: false,
      removedAt: Date.now(),
      removedBy: m.sender
    }

    if (!writeBlacklist(dbUsers)) {
      return conn.reply(
        m.chat,
        '❌ No se pudo actualizar la lista negra.',
        m
      )
    }

    return conn.reply(
      m.chat,
      `✅ *USUARIO LIBERADO*\n${SEP}\n👤 ${entry.key}\n${SEP}`,
      m
    )
  }

  // ==========================================================
  // 📋 VER LISTA NEGRA
  // ==========================================================

  if (cmd === 'vln') {
    if (!bannedList.length) {
      return conn.reply(
        m.chat,
        '✅ La lista negra está vacía.',
        m
      )
    }

    const mentions = []
    const lines = bannedList.map(([jid, data], index) => {
      const isPhone = jid.endsWith('@s.whatsapp.net')
      if (isPhone) mentions.push(jid)

      return (
        `*${index + 1}.* ${isPhone ? `@${jid.split('@')[0]}` : jid}\n` +
        `📝 ${data.reason || 'No especificado'}`
      )
    })

    const chunks = []
    let current = ''

    for (const line of lines) {
      if ((current + '\n\n' + line).length > 3000) {
        chunks.push(current)
        current = line
      } else {
        current += current ? `\n\n${line}` : line
      }
    }

    if (current) chunks.push(current)

    for (let i = 0; i < chunks.length; i++) {
      await conn.sendMessage(
        m.chat,
        {
          text:
`📋 *LISTA NEGRA*
👥 *Total:* ${bannedList.length}
━━━━━━━━━━━━━━━━━━━━
${chunks[i]}`,
          mentions
        },
        { quoted: m }
      )
    }

    return
  }

  // ==========================================================
  // 🧹 LIMPIAR LISTA NEGRA
  // ==========================================================

  if (cmd === 'clrn') {
    for (const jid of Object.keys(dbUsers)) {
      dbUsers[jid] = {
        ...dbUsers[jid],
        banned: false,
        removedAt: Date.now(),
        removedBy: m.sender
      }
    }

    if (!writeBlacklist(dbUsers)) {
      return conn.reply(
        m.chat,
        '❌ No se pudo limpiar la lista negra.',
        m
      )
    }

    return conn.reply(
      m.chat,
      '🧹 *LISTA NEGRA LIMPIADA*\nLos registros se conservaron, pero quedaron desactivados.',
      m
    )
  }
}

// ============================================================
// 🚫 AUTOEXPULSIÓN AL HABLAR
// 📢 AVISA EN EL GRUPO DONDE SE EXPULSA
// ============================================================

handler.all = async function (m) {
  try {
    if (!m.isGroup) return

    const sender = normalizeJid(m.sender)
    if (!sender) return

    const db = readBlacklist()
    const metadata = await this.groupMetadata(m.chat)

    const entry = getBlacklistEntry(db, sender, metadata)
    if (!entry) return

    const participant = findParticipant(metadata, sender)
    if (!participant) return

    await this.groupParticipantsUpdate(
      m.chat,
      [participant.id],
      'remove'
    )

    await sleep(500)

    await sendKickNotice(
      this,
      m.chat,
      participant,
      entry.data.reason || 'No especificado',
      'Expulsión automática por enviar un mensaje'
    )
  } catch (error) {
    console.error('[LISTA NEGRA] Error en handler.all:', error)
  }
}

// ============================================================
// 🚨 AUTOEXPULSIÓN AL ENTRAR
// 📢 AVISA EN EL GRUPO DONDE SE EXPULSA
// ============================================================

handler.before = async function (m) {
  try {
    if (!m.isGroup) return

    if (![27, 31].includes(m.messageStubType)) {
      return
    }

    const db = readBlacklist()
    const metadata = await this.groupMetadata(m.chat)

    for (const rawJid of m.messageStubParameters || []) {
      const jid = normalizeJid(rawJid)
      if (!jid) continue

      const entry = getBlacklistEntry(db, jid, metadata)
      if (!entry) continue

      const participant = findParticipant(metadata, jid)
      if (!participant) continue

      await this.groupParticipantsUpdate(
        m.chat,
        [participant.id],
        'remove'
      )

      await sleep(500)

      await sendKickNotice(
        this,
        m.chat,
        participant,
        entry.data.reason || 'No especificado',
        'Expulsión automática por ingreso'
      )
    }
  } catch (error) {
    console.error('[LISTA NEGRA] Error en handler.before:', error)
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = /^(ln|unln|vln|clrn)$/i
handler.help = [
  'ln @usuario',
  'unln @usuario',
  'unln <número>',
  'vln',
  'clrn'
]
handler.tags = ['owner']
handler.rowner = true

// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
