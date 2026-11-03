
/**
 * 📂 plugins/anticall.js
 * 🛡️ WHATSAPP-BOT — ANTICALL
 *
 * 📞 Detecta mensajes tipo "Call"
 * 📞 Escucha eventos "call" de Baileys
 * 🗑️ Intenta eliminar avisos de llamadas
 * 👤 Advierte mencionando al responsable
 * 👑 Incluye administradores y owners
 * 💾 Configuración independiente por grupo
 *
 * Comando: .anticall
 * Baileys ES Modules
 */

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

function getChatData(chatId) {
  global.db ||= {}
  global.db.data ||= {}
  global.db.data.chats ||= {}

  global.db.data.chats[chatId] ||= {}

  return global.db.data.chats[chatId]
}

// ============================================================
// ⚙️ ESTADO GLOBAL
// ============================================================

const STATE = globalThis.__anticallState ||= {
  conn: null,
  callListener: null,
  processed: new Map()
}

// ============================================================
// 🔧 UTILIDADES
// ============================================================

function isGroup(jid) {
  return (
    typeof jid === 'string' &&
    jid.endsWith('@g.us')
  )
}

function getSender(m) {
  return (
    m?.key?.participant ||
    m?.participant ||
    m?.sender ||
    null
  )
}

function mention(jid) {
  return '@' + String(jid)
    .split('@')[0]
    .split(':')[0]
}

function getContent(m) {
  let content = m?.message || {}

  for (let i = 0; i < 5; i++) {
    const inner =
      content.ephemeralMessage?.message ||
      content.viewOnceMessage?.message ||
      content.viewOnceMessageV2?.message ||
      content.documentWithCaptionMessage?.message ||
      content.editedMessage?.message

    if (!inner) break

    content = inner
  }

  return content
}

// ============================================================
// 📞 DETECTAR "Call"
// ============================================================

function isCallMessage(m) {
  if (!m) return false

  const content = getContent(m)

  // Tipo exacto
  if (m.mtype === 'Call') return true

  // Propiedad exacta
  if (Object.prototype.hasOwnProperty.call(
    content,
    'Call'
  )) {
    return true
  }

  // Texto exacto
  const texto = String(
    m.text ||
    content.conversation ||
    content.extendedTextMessage?.text ||
    ''
  ).trim()

  if (texto === 'Call') return true

  // Compatibilidad con avisos de Baileys
  const type = String(m.mtype || '')
    .toLowerCase()

  if (
    type === 'callmessage' ||
    type === 'calllogmessage' ||
    type === 'groupcallmessage' ||
    type === 'groupcallstartedmessage'
  ) {
    return true
  }

  if (
    Object.keys(content).some(key =>
      key.toLowerCase().includes('call')
    )
  ) {
    return true
  }

  const stub = String(
    m.messageStubType || ''
  ).toUpperCase()

  if (stub.includes('CALL')) return true

  return false
}

// ============================================================
// 🛡️ EVITAR DUPLICADOS
// ============================================================

function markProcessed(chat, id) {
  if (!chat || !id) return false

  const key = `${chat}:${id}`
  const now = Date.now()

  for (const [k, time] of STATE.processed) {
    if (now - time > 300000) {
      STATE.processed.delete(k)
    }
  }

  if (STATE.processed.has(key)) return false

  STATE.processed.set(key, now)

  return true
}

// ============================================================
// 🚨 ADVERTENCIA
// ============================================================

async function warn(conn, chat, sender, deleted) {
  const warning = `╭━━〔 🚨 *ANTICALL* 〕━━╮

${sender
  ? `👤 *Usuario:* ${mention(sender)}`
  : '👤 *Usuario no identificado*'}

📞 *Se detectó un aviso de llamada.*

🚫 No está permitido iniciar llamadas grupales.

${deleted
  ? '🗑️ Se solicitó eliminar el aviso.'
  : '⚠️ No fue posible eliminar el aviso.'}

⚠️ Esta regla también se aplica a administradores y owners.

Por favor, respetá las reglas del grupo.

╰━━━━━━━━━━━━━━━━━━╯`

  await conn.sendMessage(chat, {
    text: warning,
    ...(sender ? { mentions: [sender] } : {})
  })
}

// ============================================================
// 🗑️ PROCESAR MENSAJE "Call"
// ============================================================

async function processCallMessage(conn, m) {
  const chat =
    m?.key?.remoteJid ||
    m?.chat

  if (!isGroup(chat)) return

  if (!getChatData(chat).anticall) return

  if (!isCallMessage(m)) return

  const key = m.key

  if (!key?.id) {
    console.log(
      '[ANTICALL] Call detectado sin ID:',
      Object.keys(getContent(m))
    )
    return
  }

  if (!markProcessed(chat, key.id)) return

  const sender = getSender(m)

  console.log('[ANTICALL] Call detectado:', {
    chat,
    sender,
    id: key.id,
    type: m.mtype,
    stub: m.messageStubType
  })

  let deleted = false

  try {
    await conn.sendMessage(chat, {
      delete: {
        remoteJid: chat,
        id: key.id,
        participant: key.participant,
        fromMe: !!key.fromMe
      }
    })

    deleted = true

    console.log(
      '[ANTICALL] Eliminación solicitada.'
    )

  } catch (error) {
    console.error(
      '[ANTICALL] Error eliminando Call:',
      error
    )
  }

  await warn(conn, chat, sender, deleted)
}

// ============================================================
// 📞 PROCESAR EVENTOS "call"
// ============================================================

async function processCallEvent(conn, calls) {
  const events = Array.isArray(calls)
    ? calls
    : [calls]

  for (const call of events) {
    try {
      console.log(
        '[ANTICALL] Evento call:',
        JSON.stringify(call)
      )

      const chat =
        call?.chatId ||
        call?.remoteJid ||
        call?.groupJid ||
        call?.groupId ||
        call?.from

      if (!isGroup(chat)) continue

      if (!getChatData(chat).anticall) continue

      const sender =
        call?.participant ||
        call?.sender ||
        call?.from ||
        null

      const id =
        call?.messageId ||
        call?.msgId ||
        call?.id

      if (!id) {
        console.log(
          '[ANTICALL] Evento sin ID.'
        )
        continue
      }

      if (!markProcessed(chat, id)) continue

      // Un ID de llamada no siempre corresponde
      // a un mensaje eliminable de WhatsApp.

      await warn(conn, chat, sender, false)

    } catch (error) {
      console.error(
        '[ANTICALL] Error procesando call:',
        error
      )
    }
  }
}

// ============================================================
// 🔌 REGISTRAR LISTENER DE BAILEYS
// ============================================================

function registerCallListener(conn) {
  if (!conn?.ev?.on) return

  if (
    STATE.conn === conn &&
    STATE.callListener
  ) {
    return
  }

  if (
    STATE.conn?.ev &&
    STATE.callListener
  ) {
    try {
      STATE.conn.ev.off(
        'call',
        STATE.callListener
      )
    } catch {
      try {
        STATE.conn.ev.removeListener(
          'call',
          STATE.callListener
        )
      } catch {}
    }
  }

  const listener = async calls => {
    try {
      await processCallEvent(conn, calls)
    } catch (error) {
      console.error(
        '[ANTICALL] Error listener:',
        error
      )
    }
  }

  conn.ev.on('call', listener)

  STATE.conn = conn
  STATE.callListener = listener

  console.log(
    '📞 [ANTICALL] Listener call registrado.'
  )
}

// ============================================================
// ⚙️ COMANDO .ANTICALL
// ============================================================

const handler = async (
  m,
  { conn, isAdmin, isOwner }
) => {
  if (!m.isGroup) {
    return m.reply(
      '⚠️ Este comando solo funciona en grupos.'
    )
  }

  if (!isAdmin && !isOwner) {
    return m.reply(
      '⛔ Solo administradores y owners pueden configurar AntiCall.'
    )
  }

  registerCallListener(conn)

  const chat = getChatData(m.chat)

  chat.anticall = !chat.anticall

  const text = chat.anticall
    ? `╭━━〔 📞 *ANTICALL* 〕━━╮

✅ *PROTECCIÓN ACTIVADA*

📞 Detección de mensajes "Call".
🔎 Escucha de eventos de llamadas.
🗑️ Eliminación cuando sea posible.
👤 Advertencias con mención.

👑 También aplica a administradores y owners.

╰━━━━━━━━━━━━━━━━━━╯`
    : `╭━━〔 📞 *ANTICALL* 〕━━╮

🔓 *PROTECCIÓN DESACTIVADA*

📞 AntiCall desactivado en este grupo.

╰━━━━━━━━━━━━━━━━━━╯`

  return conn.sendMessage(
    m.chat,
    { text },
    { quoted: m }
  )
}

// ============================================================
// 🔎 DETECTOR AUTOMÁTICO
// ============================================================

handler.all = async function (m) {
  try {
    registerCallListener(this)

    await processCallMessage(this, m)

  } catch (error) {
    console.error(
      '[ANTICALL] Error general:',
      error
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = ['anticall']
handler.tags = ['group']
handler.command = /^anticall$/i
handler.group = true

export default handler
