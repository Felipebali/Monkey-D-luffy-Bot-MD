// 📂 plugins/propietario-listanegra.js
// 🐾 FELIXCAT-BOT — LISTA NEGRA DEL OWNER
// ============================================================
// .ln     → agregar usuario a lista negra
// .unln   → quitar usuario de lista negra
// .vln    → ver lista negra
// .clrn   → limpiar lista negra
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

const BLACKLIST_FILE =
  path.join(
    DATABASE_DIR,
    'blacklist.json'
  )

// ============================================================
// 📁 CREAR CARPETA / ARCHIVO
// ============================================================

if (!fs.existsSync(DATABASE_DIR)) {
  fs.mkdirSync(
    DATABASE_DIR,
    {
      recursive: true
    }
  )
}

if (!fs.existsSync(BLACKLIST_FILE)) {
  fs.writeFileSync(
    BLACKLIST_FILE,
    '{}'
  )
}

// ============================================================
// ⏳ ESPERA
// ============================================================

function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(resolve, ms)
  )
}

// ============================================================
// 🔢 NORMALIZAR JID
// ============================================================

function normalizeJid(jid = '') {

  if (!jid)
    return null

  jid =
    String(jid)
      .trim()
      .replace(/^\+/, '')

  if (
    jid.endsWith('@c.us')
  ) {
    return jid.replace(
      '@c.us',
      '@s.whatsapp.net'
    )
  }

  if (
    jid.endsWith('@s.whatsapp.net')
  ) {
    return jid
  }

  if (jid.includes('@'))
    return jid

  const cleaned =
    jid.replace(
      /[^0-9]/g,
      ''
    )

  if (!cleaned)
    return null

  return (
    cleaned +
    '@s.whatsapp.net'
  )
}

// ============================================================
// 🔢 SOLO NÚMEROS
// ============================================================

function digitsOnly(text = '') {

  return String(text)
    .replace(
      /[^0-9]/g,
      ''
    )
}

// ============================================================
// 📱 EXTRAER TELÉFONO
// ============================================================

function extractPhoneNumber(
  text = ''
) {

  const d =
    digitsOnly(text)

  if (
    !d ||
    d.length < 5
  ) {
    return null
  }

  return d
}

// ============================================================
// 👤 BUSCAR PARTICIPANTE
// ============================================================

function findParticipantByDigits(
  metadata,
  digits
) {

  if (
    !metadata ||
    !Array.isArray(
      metadata.participants
    )
  ) {
    return null
  }

  return metadata.participants.find(
    p => {

      const pd =
        digitsOnly(
          p.id || ''
        )

      return (
        pd === digits ||
        pd.endsWith(digits)
      )
    }
  )
}

// ============================================================
// 💾 LEER BLACKLIST
// ============================================================

function readBlacklist() {

  try {

    const data =
      fs.readFileSync(
        BLACKLIST_FILE,
        'utf8'
      )

    return JSON.parse(data)

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
      JSON.stringify(
        data,
        null,
        2
      )
    )

    return true

  } catch (e) {

    console.error(
      '❌ Error guardando blacklist:',
      e
    )

    return false
  }
}

// ============================================================
// 👑 NORMALIZAR COMMAND
// ============================================================

function normalizeCommand(
  command = ''
) {

  return String(command)
    .toLowerCase()
    .trim()
    .replace(/^\./, '')
}

// ============================================================
// 🚫 EXPULSAR USUARIO
// ============================================================

async function kickUser(
  conn,
  groupJid,
  userJid,
  reason = 'No especificado',
  aviso = true
) {

  try {

    const meta =
      await conn.groupMetadata(
        groupJid
      )

    const participant =
      findParticipantByDigits(
        meta,
        digitsOnly(userJid)
      )

    if (!participant)
      return false

    await conn.groupParticipantsUpdate(
      groupJid,
      [
        participant.id
      ],
      'remove'
    )

    await sleep(700)

    if (aviso) {

      await conn.sendMessage(
        groupJid,
        {
          text:
`🚫 *USUARIO BLOQUEADO — LISTA NEGRA*
━━━━━━━━━━━━━━━━━━━━
👤 @${participant.id.split('@')[0]}
📝 *Motivo:* ${reason}
🚷 *Expulsión automática*
━━━━━━━━━━━━━━━━━━━━`,
          mentions: [
            participant.id
          ]
        }
      )
    }

    return true

  } catch {

    return false
  }
}

// ============================================================
// 📦 HANDLER PRINCIPAL
// ============================================================

const handler = async (
  m,
  {
    conn,
    command,
    text
  }
) => {

  const cmd =
    normalizeCommand(command)

  const SEP =
    '━━━━━━━━━━━━━━━━━━━━'

  const ICON = {

    ban: '🚫',

    ok: '✅',

    warn: '⚠️',

    alert: '🚨'
  }

  const dbUsers =
    readBlacklist()

  // ==========================================================
  // 🔎 IGNORAR SI NO ES UNO DE NUESTROS COMANDOS
  // ==========================================================

  if (
    ![
      'ln',
      'unln',
      'vln',
      'clrn'
    ].includes(cmd)
  ) {
    return
  }

  // ==========================================================
  // 👑 REACCIONES
  // ==========================================================

  try {

    if (cmd === 'ln')
      await m.react('🚫')

    if (cmd === 'unln')
      await m.react('🕊️')

    if (cmd === 'vln')
      await m.react('📋')

    if (cmd === 'clrn')
      await m.react('🧹')

  } catch {}

  // ==========================================================
  // 🚫 AUTO-KICK SI CITA A UN BLOQUEADO
  // ==========================================================

  if (
    m.isGroup &&
    m.quoted
  ) {

    const quotedJid =
      normalizeJid(
        m.quoted.sender ||
        m.quoted.participant
      )

    if (
      quotedJid &&
      dbUsers[quotedJid]?.banned
    ) {

      const reason =
        dbUsers[quotedJid].reason ||
        'No especificado'

      await kickUser(
        conn,
        m.chat,
        quotedJid,
        reason,
        true
      )
    }
  }

  // ==========================================================
  // 📋 LISTA ACTUAL
  // ==========================================================

  const bannedList =
    Object.entries(
      dbUsers
    ).filter(
      ([, data]) =>
        data?.banned === true
    )

  // ==========================================================
  // 👤 DETERMINAR USUARIO
  // ==========================================================

  let userJid = null

  let numberDigits = null

  // ==========================================================
  // 🔢 UNLN POR NÚMERO DE LISTA
  // ==========================================================

  if (
    cmd === 'unln' &&
    /^\d+$/.test(
      String(text || '').trim()
    )
  ) {

    const index =
      parseInt(
        String(text).trim(),
        10
      ) - 1

    if (
      !bannedList[index]
    ) {

      try {
        await m.react('❌')
      } catch {}

      return conn.reply(
        m.chat,
        `${ICON.ban} Número inválido.`,
        m
      )
    }

    userJid =
      bannedList[index][0]
  }

  // ==========================================================
  // 💬 USUARIO CITADO
  // ==========================================================

  else if (
    m.quoted
  ) {

    userJid =
      normalizeJid(
        m.quoted.sender ||
        m.quoted.participant
      )
  }

  // ==========================================================
  // 👤 USUARIO MENCIONADO
  // ==========================================================

  else if (
    m.mentionedJid &&
    m.mentionedJid.length
  ) {

    userJid =
      normalizeJid(
        m.mentionedJid[0]
      )
  }

  // ==========================================================
  // 📱 NÚMERO ESCRITO
  // ==========================================================

  else if (text) {

    const num =
      extractPhoneNumber(text)

    if (num) {

      numberDigits =
        num

      userJid =
        normalizeJid(num)
    }
  }

  // ==========================================================
  // 📝 MOTIVO
  // ==========================================================

  let reason =
    String(text || '')
      .replace(
        /@\S+/g,
        ''
      )
      .replace(
        /\d{5,}/g,
        ''
      )
      .trim()

  if (!reason)
    reason =
      'No especificado'

  // ==========================================================
  // ❌ FALTA USUARIO
  // ==========================================================

  if (
    !userJid &&
    ![
      'vln',
      'clrn'
    ].includes(cmd)
  ) {

    try {
      await m.react('❌')
    } catch {}

    return conn.reply(
      m.chat,
      `${ICON.warn} Debes responder, mencionar o usar un número válido.`,
      m
    )
  }

  // ==========================================================
  // 📦 CREAR REGISTRO
  // ==========================================================

  if (
    userJid &&
    !dbUsers[userJid]
  ) {

    dbUsers[userJid] = {}
  }

  // ==========================================================
  // 🚫 AGREGAR A LISTA NEGRA
  // ==========================================================

  if (cmd === 'ln') {

    // --------------------------------------------------------
    // 🚫 NO PERMITIR NÚMERO ESCRITO DIRECTAMENTE
    // --------------------------------------------------------

    if (
      numberDigits &&
      !m.quoted &&
      !(
        m.mentionedJid &&
        m.mentionedJid.length
      )
    ) {

      try {
        await m.react('❌')
      } catch {}

      return conn.reply(
        m.chat,
        `${ICON.ban} Para agregar a la lista negra, responde al mensaje o menciona al usuario.`,
        m
      )
    }

    // --------------------------------------------------------
    // 💾 GUARDAR
    // --------------------------------------------------------

    dbUsers[userJid] = {

      banned: true,

      reason: reason,

      addedBy:
        m.sender,

      addedAt:
        Date.now()
    }

    writeBlacklist(
      dbUsers
    )

    // --------------------------------------------------------
    // 🌎 EXPULSAR DE TODOS LOS GRUPOS
    // --------------------------------------------------------

    try {

      const groups =
        Object.keys(
          await conn.groupFetchAllParticipating()
        )

      for (
        const jid of groups
      ) {

        await sleep(500)

        // 🔇 SIN MENSAJE EN LOS GRUPOS
        await kickUser(
          conn,
          jid,
          userJid,
          reason,
          false
        )
      }

    } catch (e) {

      console.error(
        '❌ Error expulsando globalmente:',
        e
      )
    }

    // --------------------------------------------------------
    // ✅ ÚNICA CONFIRMACIÓN
    // --------------------------------------------------------

    return conn.sendMessage(
      m.chat,
      {
        text:
`🚫 *AGREGADO A LISTA NEGRA*
👤 @${userJid.split('@')[0]}
📝 ${reason}`,
        mentions: [
          userJid
        ]
      }
    )
  }

  // ==========================================================
  // 🕊️ QUITAR DE LISTA NEGRA
  // ==========================================================

  if (cmd === 'unln') {

    if (
      !dbUsers[userJid]?.banned
    ) {

      try {
        await m.react('❌')
      } catch {}

      return conn.reply(
        m.chat,
        `${ICON.ban} El usuario no está en la lista negra.`,
        m
      )
    }

    dbUsers[userJid] = {

      banned: false,

      removedAt:
        Date.now()
    }

    writeBlacklist(
      dbUsers
    )

    return conn.sendMessage(
      m.chat,
      {
        text:
`✅ *USUARIO LIBERADO*
${SEP}
👤 @${userJid.split('@')[0]}
${SEP}`,
        mentions: [
          userJid
        ]
      }
    )
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

    bannedList.forEach(
      ([jid, data], i) => {

        msg +=
`*${i + 1}.* 👤 @${jid.split('@')[0]}
📝 ${data.reason || 'No especificado'}

`

        mentions.push(
          jid
        )
      }
    )

    msg += SEP

    return conn.sendMessage(
      m.chat,
      {
        text: msg.trim(),
        mentions
      }
    )
  }

  // ==========================================================
  // 🧹 LIMPIAR LISTA NEGRA
  // ==========================================================

  if (cmd === 'clrn') {

    for (
      const jid in dbUsers
    ) {

      dbUsers[jid].banned =
        false
    }

    writeBlacklist(
      dbUsers
    )

    return conn.sendMessage(
      m.chat,
      {
        text:
`✅ *LISTA NEGRA VACIADA*
${SEP}`
      }
    )
  }
}

// ============================================================
// 🚫 AUTO-KICK SI EL BLOQUEADO HABLA
// ============================================================

handler.all = async function (m) {

  try {

    if (!m.isGroup)
      return

    const sender =
      normalizeJid(
        m.sender
      )

    if (!sender)
      return

    const dbUsers =
      readBlacklist()

    if (
      !dbUsers[sender]?.banned
    ) {
      return
    }

    const meta =
      await this.groupMetadata(
        m.chat
      )

    const participant =
      findParticipantByDigits(
        meta,
        digitsOnly(sender)
      )

    if (!participant)
      return

    const reason =
      dbUsers[sender].reason ||
      'No especificado'

    await this.groupParticipantsUpdate(
      m.chat,
      [
        participant.id
      ],
      'remove'
    )

    await sleep(700)

    await this.sendMessage(
      m.chat,
      {
        text:
`🚫 *USUARIO BLOQUEADO — LISTA NEGRA*
━━━━━━━━━━━━━━━━━━━━
👤 @${participant.id.split('@')[0]}
📝 *Motivo:* ${reason}
🚷 *Expulsión automática*
━━━━━━━━━━━━━━━━━━━━`,
        mentions: [
          participant.id
        ]
      }
    )

  } catch {}
}

// ============================================================
// 🚨 AUTO-KICK AL ENTRAR
// ============================================================

handler.before = async function (m) {

  try {

    if (!m.isGroup)
      return

    if (
      ![
        27,
        31
      ].includes(
        m.messageStubType
      )
    ) {
      return
    }

    const dbUsers =
      readBlacklist()

    const meta =
      await this.groupMetadata(
        m.chat
      )

    for (
      const u of
      m.messageStubParameters || []
    ) {

      const ujid =
        normalizeJid(u)

      if (
        !ujid ||
        !dbUsers[ujid]?.banned
      ) {
        continue
      }

      const participant =
        findParticipantByDigits(
          meta,
          digitsOnly(ujid)
        )

      if (!participant)
        continue

      const reason =
        dbUsers[ujid].reason ||
        'No especificado'

      await this.groupParticipantsUpdate(
        m.chat,
        [
          participant.id
        ],
        'remove'
      )

      await sleep(700)

      await this.sendMessage(
        m.chat,
        {
          text:
`🚨 *USUARIO EN LISTA NEGRA*
━━━━━━━━━━━━━━━━━━━━
👤 @${participant.id.split('@')[0]}
📝 *Motivo:* ${reason}
🚷 *Expulsión inmediata*
━━━━━━━━━━━━━━━━━━━━`,
          mentions: [
            participant.id
          ]
        }
      )
    }

  } catch {}
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command =
  /^(ln|unln|vln|clrn)$/i

handler.help = [
  'ln @usuario',
  'unln @usuario',
  'unln <número>',
  'vln',
  'clrn'
]

handler.tags = [
  'owner'
]

handler.rowner = true

// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
