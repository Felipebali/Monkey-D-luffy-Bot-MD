
/**
 * 📂 plugins/_anticall.js
 * 🤖 WHATSAPP-BOT — ANTICALL GRUPAL
 *
 * 📞 Detecta mensajes "Call"
 * 📞 Escucha eventos "call" de Baileys
 * 🗑️ Intenta eliminar avisos detectados
 * 👤 Menciona al responsable
 * 👑 Incluye admins y owners
 * 💾 Configuración por grupo
 *
 * Comando: .anticall
 * Baileys ES Modules
 */

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

function getChatData(chatId) {
  global.db = global.db || {}
  global.db.data = global.db.data || {}
  global.db.data.chats = global.db.data.chats || {}

  global.db.data.chats[chatId] =
    global.db.data.chats[chatId] || {}

  return global.db.data.chats[chatId]
}

// ============================================================
// ⚙️ ESTADO GLOBAL
// ============================================================

global.__anticallState =
  global.__anticallState || {
    conn: null,
    callListener: null,
    processed: new Map()
  }

const STATE = global.__anticallState

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
    (m && m.key && m.key.participant) ||
    (m && m.participant) ||
    (m && m.sender) ||
    null
  )
}

function mention(jid) {
  return '@' + String(jid)
    .split('@')[0]
    .split(':')[0]
}

function getContent(m) {
  var content = (m && m.message) || {}

  for (var i = 0; i < 5; i++) {
    var inner = null

    if (
      content.ephemeralMessage &&
      content.ephemeralMessage.message
    ) {
      inner = content.ephemeralMessage.message
    } else if (
      content.viewOnceMessage &&
      content.viewOnceMessage.message
    ) {
      inner = content.viewOnceMessage.message
    } else if (
      content.viewOnceMessageV2 &&
      content.viewOnceMessageV2.message
    ) {
      inner = content.viewOnceMessageV2.message
    } else if (
      content.documentWithCaptionMessage &&
      content.documentWithCaptionMessage.message
    ) {
      inner = content.documentWithCaptionMessage.message
    } else if (
      content.editedMessage &&
      content.editedMessage.message
    ) {
      inner = content.editedMessage.message
    }

    if (!inner) break

    content = inner
  }

  return content
}

// ============================================================
// 📞 DETECTAR MENSAJES "Call"
// ============================================================

function isCallMessage(m) {
  if (!m) return false

  var content = getContent(m)

  // Tipo exacto "Call"
  if (m.mtype === 'Call') return true

  // Propiedad exacta "Call"
  if (
    Object.prototype.hasOwnProperty.call(
      content,
      'Call'
    )
  ) {
    return true
  }

  // Texto exacto "Call"
  var texto = String(
    m.text ||
    content.conversation ||
    (
      content.extendedTextMessage &&
      content.extendedTextMessage.text
    ) ||
    ''
  ).trim()

  if (texto === 'Call') return true

  // Otros formatos de llamada
  var type = String(m.mtype || '')
    .toLowerCase()

  var supportedTypes = [
    'call',
    'callmessage',
    'calllogmessage',
    'groupcallmessage',
    'groupcallstartedmessage'
  ]

  if (supportedTypes.includes(type)) {
    return true
  }

  var keys = Object.keys(content)

  if (
    keys.some(function (key) {
      return key.toLowerCase().includes('call')
    })
  ) {
    return true
  }

  var stub = String(
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

  var key = chat + ':' + id
  var now = Date.now()

  for (var entry of STATE.processed) {
    if (now - entry[1] > 300000) {
      STATE.processed.delete(entry[0])
    }
  }

  if (STATE.processed.has(key)) {
    return false
  }

  STATE.processed.set(key, now)

  return true
}

// ============================================================
// 🚨 ADVERTENCIA
// ============================================================

async function warn(conn, chat, sender, deleted) {
  var usuario = sender
    ? '👤 *Usuario:* ' + mention(sender)
    : '👤 *Usuario no identificado*'

  var eliminacion = deleted
    ? '🗑️ Se solicitó eliminar el aviso.'
    : '⚠️ No fue posible solicitar la eliminación.'

  var warning = `╭━━〔 🚨 *ANTICALL* 〕━━╮

${usuario}

📞 *Se detectó un aviso de llamada.*

🚫 No está permitido iniciar llamadas grupales.

${eliminacion}

⚠️ Esta regla también se aplica a administradores y owners.

Por favor, respetá las reglas del grupo.

╰━━━━━━━━━━━━━━━━━━╯`

  var options = {
    text: warning
  }

  if (sender) {
    options.mentions = [sender]
  }

  await conn.sendMessage(chat, options)
}

// ============================================================
// 🗑️ PROCESAR MENSAJES CALL
// ============================================================

async function processCallMessage(conn, m) {
  var chat =
    (m && m.key && m.key.remoteJid) ||
    (m && m.chat)

  if (!isGroup(chat)) return

  var chatData = getChatData(chat)

  if (!chatData.anticall) return

  if (!isCallMessage(m)) return

  var key = m.key || {}

  if (!key.id) {
    console.log(
      '[ANTICALL] Call detectado sin ID:',
      Object.keys(getContent(m))
    )
    return
  }

  if (!markProcessed(chat, key.id)) {
    return
  }

  var sender = getSender(m)

  console.log(
    '[ANTICALL] Call detectado:',
    {
      chat: chat,
      sender: sender,
      id: key.id,
      type: m.mtype,
      stub: m.messageStubType
    }
  )

  var deleted = false

  try {
    await conn.sendMessage(chat, {
      delete: {
        remoteJid: chat,
        id: key.id,
        participant: key.participant,
        fromMe: Boolean(key.fromMe)
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
// 📞 PROCESAR EVENTOS DE BAILEYS
// ============================================================

async function processCallEvent(conn, calls) {
  var events = Array.isArray(calls)
    ? calls
    : [calls]

  for (var call of events) {
    try {
      console.log(
        '[ANTICALL] Evento call recibido:',
        JSON.stringify(call)
      )

      var chat =
        call.chatId ||
        call.remoteJid ||
        call.groupJid ||
        call.groupId ||
        call.from

      if (!isGroup(chat)) continue

      var chatData = getChatData(chat)

      if (!chatData.anticall) continue

      var sender =
        call.participant ||
        call.sender ||
        call.from ||
        null

      var id =
        call.messageId ||
        call.msgId ||
        call.id

      if (!id) {
        console.log(
          '[ANTICALL] Evento sin ID.'
        )
        continue
      }

      if (!markProcessed(chat, id)) {
        continue
      }

      // Los IDs de llamada no siempre son
      // mensajes que se puedan eliminar.

      await warn(
        conn,
        chat,
        sender,
        false
      )

    } catch (error) {
      console.error(
        '[ANTICALL] Error evento call:',
        error
      )
    }
  }
}

// ============================================================
// 🔌 REGISTRAR EVENTO CALL
// ============================================================

function registerCallListener(conn) {
  if (!conn || !conn.ev || !conn.ev.on) {
    return
  }

  if (
    STATE.conn === conn &&
    STATE.callListener
  ) {
    return
  }

  if (
    STATE.conn &&
    STATE.conn.ev &&
    STATE.callListener
  ) {
    try {
      if (STATE.conn.ev.off) {
        STATE.conn.ev.off(
          'call',
          STATE.callListener
        )
      } else if (
        STATE.conn.ev.removeListener
      ) {
        STATE.conn.ev.removeListener(
          'call',
          STATE.callListener
        )
      }
    } catch (error) {
      console.error(
        '[ANTICALL] Error quitando listener:',
        error
      )
    }
  }

  var listener = async function (calls) {
    try {
      await processCallEvent(
        conn,
        calls
      )
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

var handler = async function (
  m,
  { conn, isAdmin, isOwner }
) {
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

  var chatData = getChatData(m.chat)

  chatData.anticall = !chatData.anticall

  var text = chatData.anticall
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
    { text: text },
    { quoted: m }
  )
}

// ============================================================
// 🔎 DETECTOR AUTOMÁTICO
// ============================================================

handler.all = async function (m) {
  try {
    registerCallListener(this)

    await processCallMessage(
      this,
      m
    )

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
