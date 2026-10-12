
 // 📂 plugins/id-lid-owner.js
// 🧠 ID / LID — Solo Owner
// Compatible con Baileys MD
// ============================================================

import { jidNormalizedUser } from '@whiskeysockets/baileys'

// ============================================================
// 🔢 NORMALIZAR JID
// ============================================================

function normalizeJid(jid = '') {
  return String(jid).trim()
    .replace(/:\d+(?=@)/g, '')
}

// ============================================================
// 🔢 NORMALIZAR NÚMERO
// ============================================================

function normalizeNumber(input = '') {
  return String(input)
    .replace(/@s\.whatsapp\.net/gi, '')
    .replace(/@c\.us/gi, '')
    .replace(/[^0-9]/g, '')
    .replace(/^0+/, '')
}

// ============================================================
// 👑 COMPROBAR OWNER
// ============================================================

function isOwner(m) {
  const owners = Array.isArray(global.owner)
    ? global.owner
    : []

  const sender = normalizeNumber(
    m.sender || m.participant || ''
  )

  if (!sender) return false

  for (let owner of owners) {
    if (Array.isArray(owner)) owner = owner[0]

    const ownerRaw = String(owner || '')
    const ownerNumber = normalizeNumber(ownerRaw)

    // Los LID no son números telefónicos.
    if (/@lid$/i.test(ownerRaw)) {
      if (
        normalizeJid(m.sender) === normalizeJid(ownerRaw)
      ) return true

      continue
    }

    if (!ownerNumber) continue

    if (sender === ownerNumber) return true

    const senderUY = sender.startsWith('598')
      ? sender.slice(3)
      : sender

    const ownerUY = ownerNumber.startsWith('598')
      ? ownerNumber.slice(3)
      : ownerNumber

    if (senderUY === ownerUY) return true

    if (
      sender.length >= 8 &&
      ownerNumber.length >= 8 &&
      sender.slice(-8) === ownerNumber.slice(-8)
    ) return true
  }

  return false
}

// ============================================================
// 🔎 EXTRAER NÚMERO DEL TEXTO
// ============================================================

function extractNumberFromText(text = '') {
  const clean = String(text)
    .replace(/^[.!/#]\s*id\b/i, '')
    .trim()

  const match = clean.match(/^\+?\d{7,15}$/)

  return match ? normalizeNumber(match[0]) : null
}

// ============================================================
// 🧷 OBTENER USUARIO CITADO
// ============================================================

function getQuotedJid(m) {
  const quoted = m.quoted

  if (!quoted) return null

  return (
    quoted.sender ||
    quoted.participant ||
    quoted.key?.participant ||
    quoted.key?.remoteJid ||
    quoted.msg?.contextInfo?.participant ||
    null
  )
}

// ============================================================
// 🆔 OBTENER IDENTIFICADOR DEL USUARIO
// ============================================================

async function getUserInfo(conn, m, groupMetadata) {
  // 1. Usuario citado
  let jid = getQuotedJid(m)

  // 2. Usuario mencionado
  if (!jid && m.mentionedJid?.length) {
    jid = m.mentionedJid[0]
  }

  // 3. Usuario indicado mediante el número
  if (!jid) {
    const rawText =
      m.text ||
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      ''

    const number = extractNumberFromText(rawText)

    if (number) jid = `${number}@s.whatsapp.net`
  }

  if (!jid) return null

  jid = normalizeJid(jid)

  // Buscar correspondencia JID/LID entre participantes.
  const participants = groupMetadata?.participants || []

  const participant = participants.find(p => {
    const ids = [
      p.id,
      p.jid,
      p.lid,
      p.phoneNumber
    ].filter(Boolean).map(normalizeJid)

    return ids.includes(jid)
  })

  const phoneJid =
    participant?.phoneNumber ||
    (
      jid.endsWith('@s.whatsapp.net')
        ? jid
        : null
    )

  const lid =
    participant?.lid ||
    (jid.endsWith('@lid') ? jid : null)

  let name = 'Usuario'

  try {
    name = await conn.getName(jid) || name
  } catch {}

  const number = phoneJid
    ? normalizeNumber(phoneJid)
    : null

  return {
    jid,
    lid,
    phoneJid,
    number,
    name,
    participant
  }
}

// ============================================================
// 🆔 FORMATEAR INFORMACIÓN
// ============================================================

function formatUserInfo(user) {
  return `
╭─✿ *ID / LID DE USUARIO* ✿─╮
│
│ 👤 *Nombre:* ${user.name}
│ 📞 *Número:* ${user.number || 'No disponible'}
│ 🆔 *JID/ID:* ${user.jid}
│ 🪪 *LID:* ${user.lid || 'No disponible'}
│
╰───────────────────────────╯
`.trim()
}

// ============================================================
// 🆔 HANDLER .ID
// ============================================================

let handler = async function (m, { conn, groupMetadata }) {
  if (!isOwner(m)) {
    return m.reply('❌ Solo el owner puede usar este comando.')
  }

  // Priorizar el mensaje citado o la mención.
  const user = await getUserInfo(conn, m, groupMetadata)

  if (user) {
    return conn.reply(
      m.chat,
      formatUserInfo(user),
      m,
      {
        mentions: [user.jid]
      }
    )
  }

  // Sin usuario seleccionado: mostrar el ID del grupo.
  if (m.isGroup) {
    const participants =
      groupMetadata?.participants || []

    return conn.reply(
      m.chat,
      `
╭─✿ *ID DEL GRUPO* ✿─╮
│
│ 🏢 *Nombre:* ${groupMetadata?.subject || 'Sin nombre'}
│ 🆔 *JID/ID:* ${m.chat}
│ 👥 *Participantes:* ${participants.length}
│
╰─────────────────────╯
`.trim(),
      m
    )
  }

  return m.reply(
    '📋 *USO DEL COMANDO*\n\n' +
    '• .id @usuario\n' +
    '• Respondé a un mensaje con .id\n' +
    '• .id +598XXXXXXXX\n' +
    '• .lid — Lista de participantes'
  )
}

// ============================================================
// 📱 HANDLER .LID
// ============================================================

let handlerLid = async function (m, { conn, groupMetadata }) {
  if (!m.isGroup) {
    return m.reply('❌ Este comando solo funciona en grupos.')
  }

  if (!isOwner(m)) {
    return m.reply('❌ Solo el owner puede usar este comando.')
  }

  const participants =
    groupMetadata?.participants || []

  if (!participants.length) {
    return m.reply('❌ No se pudieron obtener los participantes.')
  }

  const tarjetas = participants.map((p, index) => {
    const jid = normalizeJid(p.id || p.jid || p.lid || 'N/A')

    const lid = p.lid ||
      (jid.endsWith('@lid') ? jid : 'No disponible')

    const phone = p.phoneNumber ||
      (jid.endsWith('@s.whatsapp.net') ? jid : null)

    const number = phone
      ? normalizeNumber(phone)
      : 'No disponible'

    const role = p.admin === 'superadmin'
      ? '👑 Propietario'
      : p.admin === 'admin'
        ? '🛡️ Administrador'
        : '👤 Miembro'

    return [
      `╭─✿ *Usuario ${index + 1}* ✿`,
      `│ 📞 *Número:* ${number}`,
      `│ 🆔 *JID:* ${jid}`,
      `│ 🪪 *LID:* ${lid}`,
      `│ 🏷️ *Rol:* ${role}`,
      '╰───────────────✿'
    ].join('\n')
  })

  const mensaje =
    `╭━━❖ *LISTA DE PARTICIPANTES* ❖━━╮\n` +
    `│ 🏢 *Grupo:* ${groupMetadata?.subject || 'Sin nombre'}\n` +
    `│ 👥 *Total:* ${participants.length}\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
    tarjetas.join('\n\n')

  // Dividir mensajes extensos para evitar exceder límites.
  const maxLength = 3500
  const chunks = []
  let chunk = ''

  for (const tarjeta of [mensaje]) {
    if (tarjeta.length <= maxLength) {
      chunks.push(tarjeta)
    } else {
      const lines = tarjeta.split('\n')

      for (const line of lines) {
        if ((chunk + '\n' + line).length > maxLength) {
          if (chunk) chunks.push(chunk)
          chunk = line
        } else {
          chunk += (chunk ? '\n' : '') + line
        }
      }

      if (chunk) {
        chunks.push(chunk)
        chunk = ''
      }
    }
  }

  for (const part of chunks) {
    await conn.reply(m.chat, part, m)
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = ['id']
handler.help = ['id', 'id @usuario']
handler.tags = ['info']
handler.rowner = true

handlerLid.command = ['lid']
handlerLid.help = ['lid']
handlerLid.tags = ['group']
handlerLid.group = true
handlerLid.rowner = true

// ============================================================
// 📤 EXPORTAR
// ============================================================

export {
  handler as default,
  handlerLid
}
