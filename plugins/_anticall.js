
/**
 * 📂 plugins/_anticall.js
 * 🤖 WHATSAPP-BOT — ANTICALL GRUPAL
 *
 * 📞 Detecta eventos de llamadas grupales
 * 📞 Compatible con groupJid y usuarios @lid
 * 🗑️ Elimina avisos cuando sea posible
 * 👤 Menciona al responsable
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

  // Otros tipos de mensajes de llamada
  var type = String(m.mtype || '').toLowerCase()

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
    : 'ℹ️ El aviso de llamada no se pudo eliminar.'

  var warning = `╭━━〔 🚨 *ANTICALL* 〕━━╮

${usuario}

📞 *Se detectó una llamada grupal.*

🚫 No está permitido iniciar llamadas en este grupo.

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

  if (!markProcessed(chat, key.id)) return

  var sender = getSender(m)

  console.log(
    '[ANTICALL] Mensaje Call detectado:',
    {
      chat: chat,
      sender: sender,
      id: key.id,
      type: m.mtype
    }
  )

  var deleted = false

  try {
    await conn.sendMessage(chat, {
      delete: {
        remoteJid: chat,
        id: key.id,
        participant: key.participant || sender,
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
// 📞 PROCESAR EVENTOS CALL DE BAILEYS
// ============================================================

async function processCallEvent(conn, calls) {
  var events = Array.isArray(calls)
    ? calls
    : [calls]

  for (var call of events) {
    try {
      if (!call) continue

      console.log(
        '[ANTICALL] Evento call recibido:',
        JSON.stringify(call)
      )

      // Solo detectar llamadas entrantes nuevas.
      if (call.status !== 'offer') {
        continue
      }

      // ======================================================
      // 👥 IDENTIFICAR EL GRUPO CORRECTAMENTE
      // ======================================================

      // En llamadas grupales, chatId puede ser @lid.
      // groupJid contiene el grupo verdadero.

      var chat =
        call.groupJid ||
        call.groupId ||
        (
          isGroup(call.chatId)
            ? call.chatId
            : null
        ) ||
        (
          isGroup(call.remoteJid)
            ? call.remoteJid
            : null
        )

      if (!isGroup(chat)) {
        console.log(
          '[ANTICALL] Evento sin grupo válido:',
          call
        )
        continue
      }

      // ======================================================
      // ⚙️ COMPROBAR SI ANTICALL ESTÁ ACTIVADO
      // ======================================================

      var chatData = getChatData(chat)

      if (!chatData.anticall) {
        console.log(
          '[ANTICALL] Protección desactivada:',
          chat
        )
        continue
      }

      // ======================================================
      // 👤 IDENTIFICAR AL RESPONSABLE
      // ======================================================

      var sender =
        call.from ||
        call.participant ||
        call.sender ||
        null

      // ======================================================
      // 🆔 IDENTIFICAR LA LLAMADA
      // ======================================================

      var id =
        call.id ||
        call.messageId ||
        call.msgId

      if (!id) {
        console.log(
          '[ANTICALL] Llamada sin ID.'
        )
        continue
      }

      if (!markProcessed(chat, id)) {
        continue
      }

      // ======================================================
      // 📞 LLAMADA DETECTADA
      // ======================================================

      console.log(
        '[ANTICALL] LLAMADA GRUPAL DETECTADA:',
        {
          grupo: chat,
          usuario: sender,
          llamada: id,
          video: Boolean(call.isVideo),
          estado: call.status
        }
      )

      // El ID del evento call no garantiza
      // que exista un mensaje eliminable.
      // Por eso no se usa para borrar mensajes.

      await warn(
        conn,
        chat,
        sender,
        false
      )

    } catch (error) {
      console.error(
        '[ANTICALL] Error procesando llamada:',
        error
      )
    }
  }
}

// ============================================================
// 🔌 REGISTRAR LISTENER CALL
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

  // Evitar listeners duplicados al recargar plugins.
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

📞 Detección de llamadas grupales.
🔎 Compatible con usuarios @lid.
👤 Advertencias con mención.
🗑️ Eliminación de avisos cuando sea posible.

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
