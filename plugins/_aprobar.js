/**
 * 📂 plugins/aprobar.js
 * 🤖 WHATSAPP-BOT — APROBACIÓN AUTOMÁTICA
 *
 * Comandos:
 * .aprobar
 * .desaprobar
 *
 * Baileys ES Modules
 */

// ============================================================
// 🗃️ UTILIDADES
// ============================================================

function getChatData(m) {
  global.db.data.chats = global.db.data.chats || {}
  global.db.data.chats[m.chat] =
    global.db.data.chats[m.chat] || {}

  return global.db.data.chats[m.chat]
}

// ============================================================
// ⚙️ ACTIVAR APROBACIÓN
// ============================================================

const handler = async (m, { conn, command, isAdmin, isOwner }) => {
  if (!m.isGroup)
    return m.reply('⚠️ Este comando solo funciona en grupos.')

  if (!isAdmin && !isOwner)
    return m.reply('⛔ Solo administradores pueden utilizarlo.')

  const chat = getChatData(m)

  // ----------------------------------------------------------
  // ❌ DESACTIVAR
  // ----------------------------------------------------------

  if (command === 'desaprobar') {
    try {
      await conn.groupJoinApprovalMode(m.chat, 'off')

      chat.aprobar = false

      return conn.sendMessage(m.chat, {
        text:
          '🤖 *APROBACIÓN AUTOMÁTICA DESACTIVADA* ❌\n\n' +
          '🔓 La aprobación de miembros está desactivada.\n' +
          '🛑 Ya no se aprobarán solicitudes automáticamente.'
      })

    } catch (error) {
      console.error('[APROBAR] Error desactivando:', error)
      return m.reply('❌ No se pudo desactivar la aprobación.')
    }
  }

  // ----------------------------------------------------------
  // ✅ ACTIVAR
  // ----------------------------------------------------------

  try {
    await conn.groupJoinApprovalMode(m.chat, 'on')

    chat.aprobar = true

    let aprobados = 0

    // Procesar solicitudes pendientes
    const requests = await conn.groupRequestParticipantsList(m.chat)

    for (const request of requests || []) {
      const jid = request.jid || request.participant

      if (!jid) continue

      try {
        await conn.groupRequestParticipantsUpdate(
          m.chat,
          [jid],
          'approve'
        )

        aprobados++
      } catch (error) {
        console.error('[APROBAR] Error:', error)
      }
    }

    return conn.sendMessage(m.chat, {
      text:
        '🤖 *APROBACIÓN AUTOMÁTICA ACTIVADA* ✅\n\n' +
        '🔐 Aprobación de miembros activada.\n' +
        '👥 Las solicitudes pendientes serán procesadas.\n' +
        '⚡ Las nuevas solicitudes se aprobarán automáticamente.\n\n' +
        `✅ Solicitudes procesadas: ${aprobados}`
    })

  } catch (error) {
    chat.aprobar = false

    console.error('[APROBAR] Error activando:', error)

    return m.reply(
      '❌ No se pudo activar la aprobación de miembros.\n' +
      'Verifica que el bot sea administrador.'
    )
  }
}

// ============================================================
// 📌 CONFIGURACIÓN
// ============================================================

handler.help = ['aprobar', 'desaprobar']
handler.tags = ['group']
handler.command = /^(aprobar|desaprobar)$/i
handler.group = true

// ============================================================
// 🔍 EVENTO: APROBACIÓN AUTOMÁTICA
// ============================================================

handler.all = async function (m) {
  if (!m?.chat || !m.isGroup) return

  const chat = global.db?.data?.chats?.[m.chat]

  if (!chat?.aprobar) return

  const requests = m.message?.groupParticipantRequest

  if (!requests) return

  const jid = requests.participant

  if (!jid) return

  try {
    await this.groupRequestParticipantsUpdate(
      m.chat,
      [jid],
      'approve'
    )

    console.log(
      `[APROBAR] Solicitud aprobada: ${jid}`
    )

  } catch (error) {
    console.error(
      '[APROBAR] Error aprobando solicitud:',
      error
    )
  }
}

export default handler
