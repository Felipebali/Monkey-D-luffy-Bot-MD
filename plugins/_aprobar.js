/**
 * 📂 plugins/aprobar.js
 * 🤖 WHATSAPP-BOT — APROBACIÓN AUTOMÁTICA
 *
 * Comandos:
 * .aprobar
 * .desaprobar
 *
 * Funciones:
 * - Activa la aprobación de miembros.
 * - Aprueba solicitudes nuevas automáticamente.
 * - Procesa solicitudes pendientes al activarse.
 * - Guarda la configuración por grupo.
 *
 * Baileys ES Modules
 */

// ============================================================
// 🗃️ UTILIDADES
// ============================================================

function getChatData(chat) {
  global.db.data.chats = global.db.data.chats || {}
  global.db.data.chats[chat] =
    global.db.data.chats[chat] || {}

  return global.db.data.chats[chat]
}

// ============================================================
// ⚙️ COMANDO: ACTIVAR / DESACTIVAR
// ============================================================

const handler = async (m, { conn, command, isAdmin, isOwner }) => {
  if (!m.isGroup)
    return m.reply('⚠️ Este comando solo funciona en grupos.')

  if (!isAdmin && !isOwner)
    return m.reply('⛔ Solo administradores pueden utilizarlo.')

  const chat = getChatData(m.chat)

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
          '🛑 El bot dejará de aprobar solicitudes automáticamente.'
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

    const requests =
      await conn.groupRequestParticipantsList(m.chat)

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
        '👥 Se procesarán las solicitudes pendientes.\n' +
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
// 🔍 DETECTAR SOLICITUDES NUEVAS
// ============================================================

handler.all = async function (m) {
  if (!m?.chat || !m.isGroup) return

  const chat = global.db?.data?.chats?.[m.chat]

  if (!chat?.aprobar) return

  const requests = m.message?.groupParticipantRequest

  if (!requests?.participant) return

  const jid = requests.participant

  try {
    await this.groupRequestParticipantsUpdate(
      m.chat,
      [jid],
      'approve'
    )

    console.log(
      `[APROBAR] Solicitud aprobada automáticamente: ${jid}`
    )

  } catch (error) {
    console.error(
      '[APROBAR] Error aprobando solicitud:',
      error
    )
  }
}

export default handler
