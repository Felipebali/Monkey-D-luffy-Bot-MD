
// 📂 plugins/promote.js
// 👑 SISTEMA DE PROMOCIÓN A ADMINISTRADOR
// 🛡️ Permisos | Validaciones | Historial | WhatsApp-Bot
// ============================================================

const handler = async (
  m,
  { conn, isAdmin, isBotAdmin, isOwner }
) => {

  // ==========================================================
  // 🏢 VALIDAR GRUPO
  // ==========================================================

  if (!m.isGroup) {
    return m.reply(
      '❌ Este comando solo funciona en grupos.'
    )
  }

  // ==========================================================
  // 🛡️ VALIDAR PERMISOS DEL EJECUTOR
  // ==========================================================

  if (!isAdmin && !isOwner) {
    return m.reply(
      '╭━━━〔 🛡️ 〕━━━╮\n' +
      '   *ACCESO DENEGADO*\n' +
      '╰━━━━━━━━━━━━━━╯\n\n' +
      '❌ Solo los administradores o propietarios del bot pueden usar este comando.'
    )
  }

  // ==========================================================
  // 🤖 VALIDAR ADMINISTRADOR DEL BOT
  // ==========================================================

  if (!isBotAdmin) {
    return m.reply(
      '❌ Necesito ser administrador del grupo para promover usuarios.'
    )
  }

  // ==========================================================
  // 👤 IDENTIFICAR USUARIO OBJETIVO
  // ==========================================================

  const user =
    m.mentionedJid?.[0] ||
    m.quoted?.sender ||
    m.quoted?.participant ||
    null

  if (!user) {
    return m.reply(
      '╭━━━〔 👑 〕━━━╮\n' +
      '   *PROMOVER ADMINISTRADOR*\n' +
      '╰━━━━━━━━━━━━━━╯\n\n' +
      '📌 Mencioná a un usuario o respondé a uno de sus mensajes.\n\n' +
      '💡 *Ejemplo:* .p @usuario'
    )
  }

  // Normalizar sufijos de dispositivos sin cambiar el servidor JID/LID.
  const target = String(user).replace(/:\d+(?=@)/g, '')
  const botJid = String(conn.user?.id || '')
    .replace(/:\d+(?=@)/g, '')

  // ==========================================================
  // 🔎 CONSULTAR ESTADO ACTUAL
  // ==========================================================

  try {
    const metadata = await conn.groupMetadata(m.chat)
    const participants = metadata?.participants || []

    const findParticipant = jid => {
      const normalized = String(jid).replace(/:\d+(?=@)/g, '')

      return participants.find(p => {
        const ids = [
          p.id,
          p.jid,
          p.lid
        ].filter(Boolean).map(
          value => String(value).replace(/:\d+(?=@)/g, '')
        )

        return ids.includes(normalized)
      })
    }

    const targetParticipant = findParticipant(target)
    const botParticipant = findParticipant(botJid)

    if (!targetParticipant) {
      return m.reply(
        '❌ No pude identificar al usuario entre los participantes del grupo.'
      )
    }

    if (targetParticipant.admin) {
      return m.reply(
        'ℹ️ Este usuario ya es administrador del grupo.'
      )
    }

    if (
      botParticipant &&
      [botParticipant.id, botParticipant.jid, botParticipant.lid]
        .filter(Boolean)
        .some(id =>
          String(id).replace(/:\d+(?=@)/g, '') === target
        )
    ) {
      return m.reply(
        '⚠️ No podés utilizar este comando para promover al propio bot.'
      )
    }

    // ========================================================
    // ⚙️ PROMOVER USUARIO
    // ========================================================

    const result = await conn.groupParticipantsUpdate(
      m.chat,
      [target],
      'promote'
    )

    // Baileys puede devolver resultados individuales.
    const operation = Array.isArray(result)
      ? result.find(item => {
          const id = item?.jid || item?.id
          return !id || String(id).replace(/:\d+(?=@)/g, '') === target
        }) || result[0]
      : result

    if (
      operation?.status &&
      !['200', 'ok'].includes(String(operation.status).toLowerCase())
    ) {
      throw new Error(
        `WhatsApp rechazó la promoción (estado ${operation.status}).`
      )
    }

    // ========================================================
    // 📝 REGISTRAR HISTORIAL
    // ========================================================

    try {
      if (global.db?.data) {
        global.db.data.chats ||= {}

        const chatData = global.db.data.chats[m.chat] ||= {}

        // Solo registrar si el historial está habilitado.
        if (chatData.adminLog !== false) {
          chatData.adminHistory ||= []

          chatData.adminHistory.push({
            fecha: new Date().toLocaleString('es-UY', {
              timeZone: 'America/Montevideo',
              hour12: false
            }),
            actor: m.sender,
            target,
            action: 'promovió a administrador',
            rango: isOwner ? '👑 OWNER' : '🛡️ ADMIN'
          })

          if (chatData.adminHistory.length > 20) {
            chatData.adminHistory.splice(
              0,
              chatData.adminHistory.length - 20
            )
          }
        }
      }
    } catch (dbError) {
      // Un error del historial no debe ocultar el resultado de WhatsApp.
      console.error('[PROMOTE-HISTORY]', dbError)
    }

    // ========================================================
    // 📢 CONFIRMAR PROMOCIÓN
    // ========================================================

    let nombre = 'Usuario'

    try {
      nombre = await conn.getName(target) || nombre
    } catch {}

    const tag = target.includes('@lid')
      ? null
      : target

    const texto =
      '╭━━━〔 👑 〕━━━╮\n' +
      '   *NUEVO ADMINISTRADOR*\n' +
      '╰━━━━━━━━━━━━━━╯\n\n' +
      `👤 *Usuario:* ${nombre}\n` +
      (tag ? `📌 *Mención:* @${tag.split('@')[0]}\n` : '') +
      `🛡️ *Promovido por:* ${m.pushName || 'Administrador'}\n\n` +
      '✅ La solicitud de promoción fue procesada.\n' +
      '━━━━━━━━━━━━━━━━━━'

    return await conn.sendMessage(
      m.chat,
      {
        text: texto,
        mentions: tag ? [tag] : []
      },
      { quoted: m }
    )

  } catch (error) {
    console.error('[PROMOTE]', error)

    const reason = String(
      error?.message || error
    ).toLowerCase()

    let mensaje =
      '❌ No se pudo completar la promoción. Intentá nuevamente.'

    if (
      reason.includes('not-authorized') ||
      reason.includes('forbidden') ||
      reason.includes('not admin') ||
      reason.includes('not an admin')
    ) {
      mensaje =
        '🛡️ WhatsApp rechazó la operación. Verificá los permisos de administrador del bot.'
    }

    return m.reply(mensaje)
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = ['p']
handler.tags = ['group']
handler.command = ['p']

handler.group = true
handler.admin = false
handler.botAdmin = true
handler.rowner = false

export default handler
