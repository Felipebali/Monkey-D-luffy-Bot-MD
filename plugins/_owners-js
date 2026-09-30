// 📂 plugins/owner.js — FelixCat-Bot 🐾
// 👑 adowner / rowner
//
// USO:
// Responder/citar un mensaje:
//
// .adowner
// .rowner
//
// Guarda:
//
// ['NUMERO', 'Nombre', true]
// ['LID', 'NombreLID', true]

import { jidDecode } from '@whiskeysockets/baileys'

// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {

  if (!Array.isArray(global.owner))
    global.owner = []

  return global.owner
}

// ============================================================
// 🔢 LIMPIAR ID
// ============================================================

function cleanId(id) {

  if (!id) return null

  return String(id)
    .split('@')[0]
    .split(':')[0]
    .replace(/[^0-9]/g, '') || null
}

// ============================================================
// 👑 COMPROBAR SI ES OWNER
// ============================================================

function isOwner(m) {

  const sender = String(m.sender || '')

  const senderId = cleanId(sender)

  if (!senderId)
    return false

  return getOwners().some(owner => {

    if (!Array.isArray(owner))
      return false

    const ownerId =
      cleanId(owner[0])

    return ownerId === senderId
  })
}

// ============================================================
// 🎯 OBTENER USUARIO CITADO
// ============================================================

async function getQuotedUser(m, conn) {

  if (!m.quoted)
    return null

  let number = null
  let lid = null

  // ==========================================================
  // 👤 ID DEL MENSAJE CITADO
  // ==========================================================

  const quotedSender =
    m.quoted.sender ||
    m.quoted.participant ||
    m.quoted.key?.participant ||
    null

  // ==========================================================
  // 📱 SI YA TENEMOS JID NORMAL
  // ==========================================================

  if (quotedSender) {

    const senderString =
      String(quotedSender)

    if (
      senderString.includes('@s.whatsapp.net')
    ) {
      number =
        cleanId(senderString)
    }

    if (
      senderString.includes('@lid')
    ) {
      lid =
        cleanId(senderString)
    }
  }

  // ==========================================================
  // 👥 BUSCAR EN PARTICIPANTES DEL GRUPO
  // ==========================================================

  if (m.isGroup) {

    try {

      const metadata =
        await conn.groupMetadata(m.chat)

      const participants =
        metadata?.participants || []

      const participant =
        participants.find(p => {

          const ids = [
            p.id,
            p.jid,
            p.lid
          ]

          return ids.some(id => {

            if (!id || !quotedSender)
              return false

            return String(id) ===
              String(quotedSender)
          })
        })

      if (participant) {

        // ====================================================
        // 📱 NÚMERO
        // ====================================================

        const possibleJid =
          participant.jid ||
          (
            String(participant.id || '')
              .includes('@s.whatsapp.net')
              ? participant.id
              : null
          )

        if (possibleJid) {

          number =
            cleanId(possibleJid)
        }

        // ====================================================
        // 🆔 LID
        // ====================================================

        const possibleLid =
          participant.lid ||
          (
            String(participant.id || '')
              .includes('@lid')
              ? participant.id
              : null
          )

        if (possibleLid) {

          lid =
            cleanId(possibleLid)
        }
      }

    } catch (e) {

      console.log(
        '⚠️ Error obteniendo participante:',
        e
      )
    }
  }

  // ==========================================================
  // 🏷️ NOMBRE
  // ==========================================================

  const name =
    m.quoted.pushName ||
    m.quoted.name ||
    'Owner'

  // ==========================================================
  // ❌ NO SE ENCONTRÓ NADA
  // ==========================================================

  if (!number && !lid)
    return null

  return {
    number,
    lid,
    name
  }
}

// ============================================================
// 🔍 COMPROBAR SI UN ID YA EXISTE
// ============================================================

function ownerExists(id) {

  if (!id)
    return false

  const clean =
    cleanId(id)

  return getOwners().some(owner => {

    if (!Array.isArray(owner))
      return false

    return cleanId(owner[0]) === clean
  })
}

// ============================================================
// 👑 ADOWNER
// ============================================================

async function addOwner(m, { conn }) {

  // ==========================================================
  // 🔐 SOLO OWNER
  // ==========================================================

  if (!isOwner(m)) {

    return conn.reply(
      m.chat,
      '❌ Solo los owners pueden usar este comando.',
      m
    )
  }

  // ==========================================================
  // 💬 OBLIGATORIO CITAR
  // ==========================================================

  if (!m.quoted) {

    return conn.reply(
      m.chat,
      '⚠️ Respondé/citá el mensaje del usuario que querés agregar.',
      m
    )
  }

  // ==========================================================
  // 🎯 OBTENER DATOS
  // ==========================================================

  const user =
    await getQuotedUser(m, conn)

  if (!user) {

    return conn.reply(
      m.chat,
      '❌ No pude obtener el número o LID del usuario citado.',
      m
    )
  }

  // ==========================================================
  // 🔍 COMPROBAR
  // ==========================================================

  const numberExists =
    user.number &&
    ownerExists(user.number)

  const lidExists =
    user.lid &&
    ownerExists(user.lid)

  if (numberExists || lidExists) {

    return conn.reply(
      m.chat,
`⚠️ *${user.name}* ya figura como owner.

📱 Número: ${user.number || 'No encontrado'}
🆔 LID: ${user.lid || 'No encontrado'}`,
      m
    )
  }

  // ==========================================================
  // 📱 AGREGAR NÚMERO
  // ==========================================================

  if (user.number) {

    global.owner.push([
      user.number,
      user.name,
      true
    ])
  }

  // ==========================================================
  // 🆔 AGREGAR LID
  // ==========================================================

  if (user.lid) {

    global.owner.push([
      user.lid,
      `${user.name}LID`,
      true
    ])
  }

  // ==========================================================
  // 💾 MOSTRAR RESULTADO
  // ==========================================================

  await m.react('👑')

  return conn.reply(
    m.chat,
`👑 *OWNER AGREGADO*

👤 *Nombre:* ${user.name}

📱 *Número:*
${user.number ? `\`${user.number}\`` : '❌ No encontrado'}

🆔 *LID:*
${user.lid ? `\`${user.lid}\`` : '❌ No encontrado'}

✅ *Agregado correctamente a global.owner*`,
    m
  )
}

// ============================================================
// 🗑️ ROWNER
// ============================================================

async function removeOwner(m, { conn }) {

  // ==========================================================
  // 🔐 SOLO OWNER
  // ==========================================================

  if (!isOwner(m)) {

    return conn.reply(
      m.chat,
      '❌ Solo los owners pueden usar este comando.',
      m
    )
  }

  // ==========================================================
  // 💬 OBLIGATORIO CITAR
  // ==========================================================

  if (!m.quoted) {

    return conn.reply(
      m.chat,
      '⚠️ Respondé/citá el mensaje del owner que querés eliminar.',
      m
    )
  }

  // ==========================================================
  // 🎯 OBTENER DATOS
  // ==========================================================

  const user =
    await getQuotedUser(m, conn)

  if (!user) {

    return conn.reply(
      m.chat,
      '❌ No pude obtener el número o LID del usuario citado.',
      m
    )
  }

  // ==========================================================
  // 🛡️ NO ELIMINAR AL ÚLTIMO OWNER
  // ==========================================================

  const currentOwners =
    getOwners()

  const remaining =
    currentOwners.filter(owner => {

      if (!Array.isArray(owner))
        return true

      const id =
        cleanId(owner[0])

      if (
        user.number &&
        id === user.number
      )
        return false

      if (
        user.lid &&
        id === user.lid
      )
        return false

      return true
    })

  if (
    remaining.length === currentOwners.length
  ) {

    return conn.reply(
      m.chat,
      `⚠️ *${user.name}* no figura como owner.`,
      m
    )
  }

  if (remaining.length === 0) {

    return conn.reply(
      m.chat,
      '🛡️ No podés eliminar al último owner.',
      m
    )
  }

  // ==========================================================
  // 🗑️ ACTUALIZAR GLOBAL.OWNER
  // ==========================================================

  global.owner =
    remaining

  // ==========================================================
  // ✅ RESULTADO
  // ==========================================================

  await m.react('🗑️')

  return conn.reply(
    m.chat,
`🗑️ *OWNER ELIMINADO*

👤 *Nombre:* ${user.name}

📱 *Número:*
${user.number ? `\`${user.number}\`` : '❌ No encontrado'}

🆔 *LID:*
${user.lid ? `\`${user.lid}\`` : '❌ No encontrado'}

✅ *Eliminado de global.owner*`,
    m
  )
}

// ============================================================
// 🔧 HANDLER
// ============================================================

let handler = async (m, { conn, command }) => {

  try {

    command =
      String(command || '')
        .toLowerCase()

    if (command === 'adowner') {

      return await addOwner(
        m,
        { conn }
      )
    }

    if (command === 'rowner') {

      return await removeOwner(
        m,
        { conn }
      )
    }

  } catch (e) {

    console.error(
      '❌ Error en owner.js:',
      e
    )

    return conn.reply(
      m.chat,
      '❌ Ocurrió un error al modificar los owners.',
      m
    )
  }
}

// ============================================================
// 📋 CONFIGURACIÓN
// ============================================================

handler.help = [
  'adowner',
  'rowner'
]

handler.tags = [
  'owner'
]

handler.command = [
  'adowner',
  'rowner'
]

export default handler
