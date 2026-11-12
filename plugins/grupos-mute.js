
/**
 * 📂 plugins/mute.js
 * 🤖 WHATSAPP-BOT — MUTE AUTOMÁTICO
 *
 * Comandos:
 * .mute
 * .silenciar
 * .unmute
 * .desilenciar
 *
 * ✅ Silencia por grupo
 * ✅ Borra mensajes automáticamente
 * ✅ Soporta número y LID
 * ✅ Protege owners
 * ✅ Admins exentos
 * ✅ Sin mensajes de advertencia al muteado
 *
 * IMPORTANTE:
 * El bot debe ser administrador.
 * handler.js debe ejecutar handler.before
 * para cada mensaje entrante.
 */

// ============================================================
// 🗃️ BASE DE DATOS
// ============================================================

function database() {
  global.db = global.db || {}
  global.db.data = global.db.data || {}
  global.db.data.chats = global.db.data.chats || {}

  return global.db.data.chats
}

function groupData(chat) {
  const chats = database()

  chats[chat] = chats[chat] || {}
  chats[chat].mutedUsers =
    chats[chat].mutedUsers || {}

  return chats[chat]
}

// ============================================================
// 🪪 IDENTIFICADORES
// ============================================================

function normalize(jid, conn) {
  if (!jid) return ''

  try {
    return conn.decodeJid(String(jid)) ||
      String(jid)
  } catch {
    return String(jid)
  }
}

function userPart(jid) {
  return String(jid || '').split('@')[0].split(':')[0]
}

function sameJid(a, b, conn) {
  const x = normalize(a, conn)
  const y = normalize(b, conn)

  if (!x || !y) return false

  if (x === y) return true

  const xd = x.split('@')[1]
  const yd = y.split('@')[1]

  return xd === yd &&
    userPart(x) === userPart(y)
}

// ============================================================
// 👑 PROTEGER OWNERS
// ============================================================

function isProtected(jid, conn) {
  const owners = global.owner || []

  return owners.some(entry => {
    const value = Array.isArray(entry)
      ? entry[0]
      : entry

    const raw = String(value || '')

    const ownerJid = raw.includes('@')
      ? raw
      : `${raw.replace(/\D/g, '')}@s.whatsapp.net`

    return sameJid(
      jid,
      ownerJid,
      conn
    )
  })
}

// ============================================================
// 🔎 OBTENER PARTICIPANTE
// ============================================================

function findParticipant(meta, jid, conn) {
  return meta?.participants?.find(p => {
    return [
      p.id,
      p.lid,
      p.phoneNumber,
      p.jid
    ].some(value => sameJid(value, jid, conn))
  })
}

function participantIds(p, conn) {
  if (!p) return []

  return [
    p.id,
    p.lid,
    p.phoneNumber,
    p.jid
  ]
    .filter(Boolean)
    .map(jid => normalize(jid, conn))
}

// ============================================================
// 🔐 ADMINISTRADORES
// ============================================================

function isParticipantAdmin(p) {
  return (
    p?.admin === 'admin' ||
    p?.admin === 'superadmin'
  )
}

// ============================================================
// 🔇 GUARDAR MUTE
// ============================================================

function setMute(chat, ids, value) {
  const group = groupData(chat)

  for (const jid of ids) {
    if (!jid) continue

    if (value) {
      group.mutedUsers[jid] = true
    } else {
      delete group.mutedUsers[jid]
    }
  }
}

function hasMute(chat, ids) {
  const group = groupData(chat)

  return ids.some(jid => {
    return Boolean(group.mutedUsers[jid])
  })
}

// ============================================================
// 🤖 COMANDOS
// ============================================================

const handler = async (
  m,
  {
    conn,
    command,
    usedPrefix = '.',
    isAdmin,
    isBotAdmin,
    isOwner,
    isROwner
  }
) => {
  if (!m.isGroup) {
    return m.reply(
      '❌ Este comando solo funciona en grupos.'
    )
  }

  if (!isAdmin && !isOwner && !isROwner) {
    return m.reply(
      '⚠️ Solo los administradores pueden usar este comando.'
    )
  }

  if (!isBotAdmin) {
    return m.reply(
      '⚠️ Necesito ser administrador para borrar mensajes.'
    )
  }

  let who =
    m.mentionedJid?.[0] ||
    m.quoted?.sender

  if (!who) {
    return m.reply(
      `✏️ Uso: ${usedPrefix}${command} @usuario\n` +
      `También podés responder a un mensaje.`
    )
  }

  who = normalize(who, conn)

  if (isProtected(who, conn)) {
    await m.react('❌').catch(() => {})

    return m.reply(
      '👑 No podés silenciar a un owner.'
    )
  }

  let meta

  try {
    meta = await conn.groupMetadata(m.chat)
  } catch (error) {
    console.error(
      '[MUTE] Error obteniendo grupo:',
      error
    )

    return m.reply(
      '❌ No pude consultar los participantes.'
    )
  }

  const participant = findParticipant(
    meta,
    who,
    conn
  )

  if (!participant) {
    return m.reply(
      '❌ No encontré al usuario en el grupo.'
    )
  }

  if (isParticipantAdmin(participant)) {
    return m.reply(
      '⚠️ No podés silenciar a un administrador.'
    )
  }

  const ids = [
    who,
    ...participantIds(participant, conn)
  ]

  const unmute = [
    'unmute',
    'desilenciar'
  ].includes(String(command).toLowerCase())

  setMute(
    m.chat,
    ids,
    !unmute
  )

  console.log(
    `[MUTE] ${unmute ? 'Desilenciado' : 'Silenciado'}:`,
    ids
  )

  await m.react('✅').catch(() => {})

  return m.reply(
    unmute
      ? '🔊 Usuario desilenciado correctamente.'
      : '🔇 Usuario silenciado correctamente. Sus próximos mensajes serán eliminados.'
  )
}

// ============================================================
// 🚨 BEFORE — BORRADO AUTOMÁTICO
// ============================================================

handler.before = async function (
  m,
  { conn, isBotAdmin }
) {
  try {
    if (!m.isGroup) return
    if (!m.sender) return
    if (!m.key?.id) return
    if (!m.message) return
    if (m.fromMe || m.key.fromMe) return

    const group = groupData(m.chat)

    if (!Object.keys(group.mutedUsers).length) {
      return
    }

    const sender = normalize(
      m.sender,
      conn
    )

    const meta = await conn.groupMetadata(m.chat)

    const participant = findParticipant(
      meta,
      sender,
      conn
    )

    const ids = [
      sender,
      m.key.participant,
      m.key.participantAlt,
      m.senderAlt,
      ...participantIds(participant, conn)
    ]
      .filter(Boolean)
      .map(jid => normalize(jid, conn))

    if (!hasMute(m.chat, ids)) {
      return
    }

    // 👑 Owners protegidos
    if (ids.some(jid => isProtected(jid, conn))) {
      return
    }

    // 🛡️ Administradores exentos
    if (isParticipantAdmin(participant)) {
      return
    }

    if (!isBotAdmin) {
      console.warn(
        '[MUTE] No puedo borrar: bot sin admin.'
      )
      return
    }

    // ======================================================
    // 🗑️ BORRAR MENSAJE
    // ======================================================

    const participantJid =
      m.key.participant ||
      m.sender

    const deleteKey = {
      remoteJid: m.chat,
      fromMe: false,
      id: m.key.id,
      participant: participantJid
    }

    await conn.sendMessage(
      m.chat,
      {
        delete: deleteKey
      }
    )

    console.log(
      `[MUTE] Mensaje eliminado de ${sender}`
    )

  } catch (error) {
    console.error(
      '[MUTE] Error borrando mensaje:',
      error?.message || error
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  'mute',
  'silenciar',
  'unmute',
  'desilenciar'
]

handler.tags = ['group']

handler.command =
  /^(mute|silenciar|unmute|desilenciar)$/i

handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
