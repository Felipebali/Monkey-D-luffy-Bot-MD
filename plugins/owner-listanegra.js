// 📂 plugins/propietario-listanegra.js
// 🚫 FELIXCAT BOT — SISTEMA DE LISTA NEGRA v2
// 👑 SOLO ROOT OWNER
//
// Comandos:
// .ln @usuario [motivo]     → Agregar a lista negra
// .unln @usuario            → Quitar de lista negra
// .unln 3                   → Quitar por número de lista
// .vln                     → Ver lista negra
// .clrn                    → Vaciar lista negra
//
// Funciones:
// ✅ Persistencia JSON
// ✅ Expulsión automática de grupos
// ✅ Expulsión al entrar
// ✅ Expulsión si el usuario habla
// ✅ Expulsión si es citado
// ✅ Evita expulsiones duplicadas
// ✅ Guarda motivo, fecha y quién agregó
// ✅ Compatible con @usuario, respuesta y JID
// ✅ Comprueba si el bot es administrador
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// 📁 CONFIGURACIÓN
// ============================================================

const DATABASE_DIR = './database'
const BLACKLIST_FILE = path.join(
  DATABASE_DIR,
  'blacklist.json'
)

if (!fs.existsSync(DATABASE_DIR)) {
  fs.mkdirSync(DATABASE_DIR, {
    recursive: true
  })
}

if (!fs.existsSync(BLACKLIST_FILE)) {
  fs.writeFileSync(
    BLACKLIST_FILE,
    '{}',
    'utf8'
  )
}

// ============================================================
// 🧰 UTILIDADES
// ============================================================

function sleep(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  )
}

function normalizeJid(jid = '') {

  if (!jid) return null

  let value = String(jid)
    .trim()
    .replace(/^@/, '')

  if (value.endsWith('@c.us')) {
    value = value.replace(
      '@c.us',
      '@s.whatsapp.net'
    )
  }

  if (
    value.endsWith(
      '@s.whatsapp.net'
    )
  ) {
    return value
  }

  if (value.includes('@')) {
    return value
  }

  const number =
    value.replace(/[^0-9]/g, '')

  if (!number) return null

  return `${number}@s.whatsapp.net`
}

function digitsOnly(jid = '') {
  return String(jid)
    .replace(/[^0-9]/g, '')
}

function getNumber(jid = '') {
  return digitsOnly(jid)
}

function getName(jid = '') {
  return `@${digitsOnly(jid)}`
}

// ============================================================
// 👑 ROOT OWNER
// ============================================================

function getOwners() {

  return (global.owner || [])
    .map(owner => {

      if (Array.isArray(owner)) {
        owner = owner[0]
      }

      if (
        typeof owner !== 'string' &&
        typeof owner !== 'number'
      ) {
        return null
      }

      return digitsOnly(owner)
    })
    .filter(Boolean)
}

function isOwner(jid) {

  const number =
    digitsOnly(jid)

  return getOwners()
    .includes(number)
}

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

function readBlacklist() {

  try {

    const raw =
      fs.readFileSync(
        BLACKLIST_FILE,
        'utf8'
      )

    if (!raw.trim()) {
      return {}
    }

    const data =
      JSON.parse(raw)

    if (
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data)
    ) {
      return {}
    }

    return data

  } catch (error) {

    console.error(
      '[BLACKLIST] Error leyendo JSON:',
      error
    )

    return {}
  }
}

function writeBlacklist(data) {

  try {

    fs.writeFileSync(
      BLACKLIST_FILE,
      JSON.stringify(
        data,
        null,
        2
      ),
      'utf8'
    )

    return true

  } catch (error) {

    console.error(
      '[BLACKLIST] Error guardando JSON:',
      error
    )

    return false
  }
}

// ============================================================
// 🔎 BUSCAR PARTICIPANTE
// ============================================================

function findParticipant(
  metadata,
  jid
) {

  if (
    !metadata?.participants ||
    !jid
  ) {
    return null
  }

  const targetNumber =
    digitsOnly(jid)

  return metadata.participants.find(
    participant => {

      const participantNumber =
        digitsOnly(
          participant.id
        )

      return (
        participantNumber ===
        targetNumber
      )
    }
  )
}

// ============================================================
// 🛡️ COMPROBAR ADMIN DEL BOT
// ============================================================

async function isBotAdmin(
  conn,
  chatId,
  metadata = null
) {

  try {

    const meta =
      metadata ||
      await conn.groupMetadata(
        chatId
      )

    const botJid =
      conn.decodeJid
        ? conn.decodeJid(
            conn.user?.id ||
            conn.user?.jid
          )
        : (
            conn.user?.id ||
            conn.user?.jid
          )

    if (!botJid) {
      return false
    }

    const botNumber =
      digitsOnly(botJid)

    const bot =
      meta.participants?.find(
        p =>
          digitsOnly(p.id) ===
          botNumber
      )

    return Boolean(
      bot?.admin
    )

  } catch {

    return false
  }
}

// ============================================================
// 🚫 EXPULSAR USUARIO
// ============================================================

async function kickUser(
  conn,
  chatId,
  jid,
  data = {}
) {

  try {

    const metadata =
      await conn.groupMetadata(
        chatId
      )

    const admin =
      await isBotAdmin(
        conn,
        chatId,
        metadata
      )

    if (!admin) {
      return {
        success: false,
        reason: 'bot_not_admin'
      }
    }

    const participant =
      findParticipant(
        metadata,
        jid
      )

    if (!participant) {
      return {
        success: false,
        reason: 'not_member'
      }
    }

    // 🛡️ Evitar intentar expulsar administradores
    if (participant.admin) {
      return {
        success: false,
        reason: 'target_admin'
      }
    }

    await conn.groupParticipantsUpdate(
      chatId,
      [participant.id],
      'remove'
    )

    return {
      success: true,
      jid: participant.id,
      reason:
        data.reason ||
        'No especificado'
    }

  } catch (error) {

    console.error(
      '[BLACKLIST] Error expulsando:',
      error
    )

    return {
      success: false,
      reason: 'error'
    }
  }
}

// ============================================================
// 📢 AVISO DE EXPULSIÓN
// ============================================================

async function sendKickNotice(
  conn,
  chatId,
  jid,
  reason,
  type = 'AUTOMÁTICA'
) {

  try {

    const text =
`🚫 *LISTA NEGRA*
━━━━━━━━━━━━━━━━━━━━

👤 Usuario: @${digitsOnly(jid)}

⚠️ *Acción:* Expulsión ${type.toLowerCase()}
📝 *Motivo:* ${reason || 'No especificado'}

🚷 El usuario se encuentra en la lista negra.

━━━━━━━━━━━━━━━━━━━━`

    await conn.sendMessage(
      chatId,
      {
        text,
        mentions: [jid]
      }
    )

  } catch {}
}

// ============================================================
// 🎯 OBTENER OBJETIVO
// ============================================================

function getTarget(
  m,
  text = ''
) {

  // 💬 Respuesta
  if (m.quoted?.sender) {

    return normalizeJid(
      m.quoted.sender
    )
  }

  // 👤 Mención
  if (
    Array.isArray(
      m.mentionedJid
    ) &&
    m.mentionedJid.length
  ) {

    return normalizeJid(
      m.mentionedJid[0]
    )
  }

  return null
}

// ============================================================
// 📝 OBTENER MOTIVO
// ============================================================

function getReason(
  text = ''
) {

  let reason =
    String(text)
      .replace(
        /@\d+/g,
        ''
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim()

  return (
    reason ||
    'No especificado'
  )
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (
  m,
  {
    conn,
    command,
    text
  }
) => {

  try {

    // ========================================================
    // 👑 SEGURIDAD
    // ========================================================

    if (
      !isOwner(
        m.sender
      )
    ) {
      return
    }

    const db =
      readBlacklist()

    const cmd =
      String(command)
        .toLowerCase()

    // ========================================================
    // 🎯 LISTA ACTIVA
    // ========================================================

    const bannedList =
      Object.entries(db)
        .filter(
          ([, data]) =>
            data?.banned === true
        )

    // ========================================================
    // ➕ AGREGAR
    // ========================================================

    if (cmd === 'ln') {

      if (!m.isGroup) {

        return m.reply(
          '❌ Este comando debe utilizarse en un grupo.'
        )
      }

      const target =
        getTarget(
          m,
          text
        )

      if (!target) {

        return m.reply(
`🚫 *LISTA NEGRA*

Uso:
• .ln @usuario motivo
• Responder al usuario: .ln motivo

Ejemplo:
.ln @usuario spam constante`
        )
      }

      if (
        isOwner(target)
      ) {

        return m.reply(
          '🛡️ No se puede agregar a un ROOT OWNER a la lista negra.'
        )
      }

      const reason =
        getReason(text)

      const now =
        new Date()

      const alreadyBanned =
        db[target]?.banned === true

      db[target] = {

        banned: true,

        reason,

        addedBy:
          normalizeJid(
            m.sender
          ),

        addedAt:
          now.toISOString(),

        updatedAt:
          now.toISOString()
      }

      if (!writeBlacklist(db)) {

        return m.reply(
          '❌ No se pudo guardar la lista negra.'
        )
      }

      await m.react('🚫')

      let expulsados = 0

      // ======================================================
      // 🌎 EXPULSAR DE TODOS LOS GRUPOS
      // ======================================================

      try {

        const groups =
          await conn.groupFetchAllParticipating()

        for (
          const groupId of
          Object.keys(groups || {})
        ) {

          await sleep(400)

          const result =
            await kickUser(
              conn,
              groupId,
              target,
              { reason }
            )

          if (
            result.success
          ) {

            expulsados++

            await sleep(500)

            await sendKickNotice(
              conn,
              groupId,
              result.jid,
              reason,
              'automática'
            )
          }
        }

      } catch (error) {

        console.error(
          '[BLACKLIST] Error recorriendo grupos:',
          error
        )
      }

      const estado =
        alreadyBanned
          ? 'actualizado'
          : 'agregado'

      return m.reply(
`🚫 *USUARIO ${estado.toUpperCase()}*

━━━━━━━━━━━━━━━━━━━━

👤 Usuario:
@${digitsOnly(target)}

📝 Motivo:
${reason}

🌎 Expulsiones realizadas:
${expulsados}

📅 Fecha:
${now.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━`,
        {
          mentions: [target]
        }
      )
    }

    // ========================================================
    // ➖ REMOVER
    // ========================================================

    if (cmd === 'unln') {

      let target = null

      const cleanText =
        String(text || '')
          .trim()

      // 🔢 Remover por índice
      if (
        /^\d+$/.test(
          cleanText
        )
      ) {

        const index =
          parseInt(
            cleanText,
            10
          ) - 1

        if (
          !bannedList[index]
        ) {

          return m.reply(
            '❌ Ese número no corresponde a ningún usuario de la lista negra.'
          )
        }

        target =
          bannedList[index][0]

      } else {

        target =
          getTarget(
            m,
            text
          )
      }

      if (!target) {

        return m.reply(
`🕊️ *QUITAR DE LISTA NEGRA*

Uso:

• .unln @usuario
• Responder: .unln
• .unln 3`
        )
      }

      if (
        !db[target]?.banned
      ) {

        return m.reply(
          `ℹ️ @${digitsOnly(target)} no está en la lista negra.`,
          {
            mentions: [target]
          }
        )
      }

      const oldData =
        db[target]

      db[target] = {

        banned: false,

        removedAt:
          new Date().toISOString(),

        removedBy:
          normalizeJid(
            m.sender
          ),

        previousReason:
          oldData.reason ||
          'No especificado'
      }

      writeBlacklist(db)

      await m.react('🕊️')

      return conn.sendMessage(
        m.chat,
        {
          text:
`🕊️ *USUARIO LIBERADO*

━━━━━━━━━━━━━━━━━━━━

👤 @${digitsOnly(target)}

📜 Motivo anterior:
${oldData.reason || 'No especificado'}

✅ Ya no forma parte de la lista negra.

━━━━━━━━━━━━━━━━━━━━`,
          mentions: [target]
        }
      )
    }

    // ========================================================
    // 📋 VER LISTA
    // ========================================================

    if (cmd === 'vln') {

      await m.react('📋')

      if (!bannedList.length) {

        return m.reply(
          '✅ La lista negra está vacía.'
        )
      }

      const mentions = []

      let message =
`🚫 *LISTA NEGRA*
━━━━━━━━━━━━━━━━━━━━

👥 Usuarios bloqueados:
*${bannedList.length}*

`

      bannedList.forEach(
        ([jid, data], index) => {

          mentions.push(jid)

          message +=
`*${index + 1}.* 👤 @${digitsOnly(jid)}
📝 ${data.reason || 'No especificado'}
📅 ${data.addedAt
  ? new Date(
      data.addedAt
    ).toLocaleString()
  : 'Sin fecha'}

`
        }
      )

      message +=
`━━━━━━━━━━━━━━━━━━━━
🛡️ Sistema de protección activo`

      return conn.sendMessage(
        m.chat,
        {
          text: message,
          mentions
        }
      )
    }

    // ========================================================
    // 🧹 LIMPIAR
    // ========================================================

    if (cmd === 'clrn') {

      await m.react('🧹')

      const cantidad =
        bannedList.length

      if (!cantidad) {

        return m.reply(
          'ℹ️ La lista negra ya está vacía.'
        )
      }

      // Mantener historial pero desactivar
      for (
        const jid of
        Object.keys(db)
      ) {

        if (
          db[jid]?.banned
        ) {

          db[jid].banned = false

          db[jid].removedAt =
            new Date()
              .toISOString()

          db[jid].removedBy =
            normalizeJid(
              m.sender
            )
        }
      }

      writeBlacklist(db)

      return m.reply(
`🧹 *LISTA NEGRA LIMPIADA*

━━━━━━━━━━━━━━━━━━━━

👥 Usuarios liberados:
*${cantidad}*

✅ La lista activa quedó vacía.

━━━━━━━━━━━━━━━━━━━━`
      )
    }

  } catch (error) {

    console.error(
      '❌ Error en propietario-listanegra:',
      error
    )

    return
  }
}

// ============================================================
// 👁️ AUTO-KICK SI UN BLOQUEADO HABLA
// ============================================================

handler.all = async function (m) {

  try {

    if (!m.isGroup) return

    const sender =
      normalizeJid(
        m.sender
      )

    if (!sender) return

    // 🛡️ Nunca expulsar owners
    if (
      isOwner(sender)
    ) {
      return
    }

    const db =
      readBlacklist()

    const data =
      db[sender]

    if (
      !data?.banned
    ) {
      return
    }

    const result =
      await kickUser(
        this,
        m.chat,
        sender,
        {
          reason:
            data.reason
        }
      )

    if (
      !result.success
    ) {
      return
    }

    await sleep(500)

    await sendKickNotice(
      this,
      m.chat,
      result.jid,
      data.reason,
      'automática'
    )

  } catch {}
}

// ============================================================
// 👋 AUTO-KICK AL ENTRAR
// ============================================================

handler.before = async function (m) {

  try {

    if (!m.isGroup) return

    // Detectar eventos de entrada
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

    const db =
      readBlacklist()

    const metadata =
      await this.groupMetadata(
        m.chat
      )

    const users =
      m.messageStubParameters ||
      []

    for (
      const rawJid of
      users
    ) {

      const jid =
        normalizeJid(
          rawJid
        )

      if (!jid) continue

      if (
        isOwner(jid)
      ) {
        continue
      }

      const data =
        db[jid]

      if (
        !data?.banned
      ) {
        continue
      }

      const result =
        await kickUser(
          this,
          m.chat,
          jid,
          {
            reason:
              data.reason
          }
        )

      if (
        !result.success
      ) {
        continue
      }

      await sleep(500)

      await sendKickNotice(
        this,
        m.chat,
        result.jid,
        data.reason,
        'automática'
      )
    }

  } catch {}
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  'ln @usuario <motivo>',
  'unln @usuario',
  'unln <número>',
  'vln',
  'clrn'
]

handler.tags = [
  'owner'
]

handler.command = [
  'ln',
  'unln',
  'vln',
  'clrn'
]

// 👑 Solo ROOT OWNER
handler.rowner = true

export default handler
