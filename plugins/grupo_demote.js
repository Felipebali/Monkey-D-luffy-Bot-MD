// 📂 plugins/grupo-demote.js
// 🛡️ DEGRADAR ADMINISTRADOR
// 👥 Permisos + Historial + Compatibilidad
// ============================================================

let handler = async (m, { conn, isAdmin, isBotAdmin, isOwner }) => {

  // ==========================================================
  // 🏢 VALIDAR GRUPO
  // ==========================================================

  if (!m.isGroup) {
    return m.reply(
      '❌ Este comando solo funciona en grupos.'
    )
  }

  // ==========================================================
  // 🛡️ VALIDAR PERMISOS
  // ==========================================================

  if (!isAdmin && !isOwner) {
    return m.reply(
      '❌ Solo los administradores o propietarios pueden usar este comando.'
    )
  }

  if (!isBotAdmin) {
    return m.reply(
      '❌ Necesito ser administrador para degradar usuarios.'
    )
  }

  // ==========================================================
  // 👤 IDENTIFICAR USUARIO
  // ==========================================================

  const user =
    (m.mentionedJid && m.mentionedJid[0]) ||
    (m.quoted && m.quoted.sender)

  if (!user) {
    return m.reply(
      '⚠️ Mencioná o respondé al usuario que deseas degradar.'
    )
  }

  try {

    // ========================================================
    // 📡 OBTENER INFORMACIÓN DEL GRUPO
    // ========================================================

    const metadata = await conn.groupMetadata(m.chat)

    const normalizeJid = jid =>
      String(jid || '').replace(/:\d+(?=@)/g, '')

    const target = normalizeJid(user)

    const participants = metadata.participants || []

    const participant = participants.find(p => {
      const ids = [p.id, p.jid, p.lid].filter(Boolean)

      return ids.some(
        id => normalizeJid(id) === target
      )
    })

    if (!participant) {
      return m.reply(
        '❌ No pude encontrar al usuario entre los participantes del grupo.'
      )
    }

    // ========================================================
    // 🛡️ VALIDAR ESTADO ACTUAL
    // ========================================================

    if (!participant.admin) {
      return m.reply(
        'ℹ️ Este usuario no es administrador del grupo.'
      )
    }

    // Evitar intentar degradar al propietario del grupo
    if (participant.admin === 'superadmin') {
      return m.reply(
        '⛔ No se puede degradar al propietario del grupo mediante este comando.'
      )
    }

    // ========================================================
    // ⚙️ DEGRADAR USUARIO
    // ========================================================

    await conn.groupParticipantsUpdate(
      m.chat,
      [user],
      'demote'
    )

    // ========================================================
    // 📝 REGISTRAR HISTORIAL
    // ========================================================

    try {

      if (global.db && global.db.data) {

        // Inicializar base de datos de chats
        if (!global.db.data.chats) {
          global.db.data.chats = {}
        }

        // Inicializar información del grupo
        if (!global.db.data.chats[m.chat]) {
          global.db.data.chats[m.chat] = {}
        }

        const chatData = global.db.data.chats[m.chat]

        // Respetar configuración del historial
        if (chatData.adminLog !== false) {

          if (!Array.isArray(chatData.adminHistory)) {
            chatData.adminHistory = []
          }

          chatData.adminHistory.push({
            fecha: new Date().toLocaleString('es-UY', {
              timeZone: 'America/Montevideo',
              hour12: false
            }),
            actor: m.sender,
            target: user,
            action: 'degradó de administrador (por comando)',
            rango: isOwner ? '👑 DUEÑO' : '🛡️ ADMIN'
          })

          // Conservar los últimos 20 registros
          if (chatData.adminHistory.length > 20) {
            chatData.adminHistory =
              chatData.adminHistory.slice(-20)
          }
        }
      }

    } catch (dbError) {
      console.error(
        '[DEMOTE-HISTORY]',
        dbError
      )
    }

    // ========================================================
    // 📤 CONFIRMAR ACCIÓN
    // ========================================================

    let nombre = 'Usuario'

    try {
      nombre = await conn.getName(user) || nombre
    } catch {}

    const texto =
      '╭━━━〔 🛡️ 〕━━━╮\n' +
      '   *ADMINISTRADOR DEGRADADO*\n' +
      '╰━━━━━━━━━━━━━━╯\n\n' +
      `👤 *Usuario:* ${nombre}\n` +
      `📌 *Mención:* @${user.split('@')[0]}\n` +
      `🛡️ *Acción realizada por:* ${m.pushName || 'Administrador'}\n\n` +
      '✅ El usuario ya no tiene permisos de administrador.'

    return await conn.sendMessage(
      m.chat,
      {
        text: texto,
        mentions: [user]
      },
      {
        quoted: m
      }
    )

  } catch (e) {

    console.error(
      '[GRUPO-DEMOTE]',
      e
    )

    return m.reply(
      '❌ Error al intentar degradar al usuario. Verificá los permisos del bot e intentá nuevamente.'
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = ['d']
handler.tags = ['group']
handler.command = ['d']
handler.group = true
handler.admin = false
handler.botAdmin = true
handler.rowner = false

export default handler
