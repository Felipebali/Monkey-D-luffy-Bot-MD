// 📂 plugins/grupo-promote.js
// 👑 PROMOVER USUARIO A ADMINISTRADOR
// 🛡️ Permisos + Historial + Compatibilidad
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
      '❌ Necesito ser administrador para promover usuarios.'
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
      '⚠️ Mencioná o respondé al usuario que deseas promover.'
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

    const participant = (metadata.participants || []).find(p => {
      const ids = [p.id, p.jid, p.lid].filter(Boolean)
      return ids.some(id => normalizeJid(id) === target)
    })

    if (!participant) {
      return m.reply(
        '❌ No pude encontrar al usuario entre los participantes del grupo.'
      )
    }

    if (participant.admin) {
      return m.reply(
        'ℹ️ Este usuario ya es administrador del grupo.'
      )
    }

    // ========================================================
    // 👑 PROMOVER USUARIO
    // ========================================================

    await conn.groupParticipantsUpdate(
      m.chat,
      [user],
      'promote'
    )

    // ========================================================
    // 📝 REGISTRAR HISTORIAL
    // ========================================================

    try {
      if (global.db && global.db.data) {

        // Inicializar la base de datos de chats
        if (!global.db.data.chats) {
          global.db.data.chats = {}
        }

        // Inicializar el grupo
        if (!global.db.data.chats[m.chat]) {
          global.db.data.chats[m.chat] = {}
        }

        const chatData = global.db.data.chats[m.chat]

        // Respetar configuración del registro
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
            action: 'promovió a admin (por comando)',
            rango: isOwner ? '👑 DUEÑO' : '🛡️ ADMIN'
          })

          // Mantener los últimos 20 registros
          if (chatData.adminHistory.length > 20) {
            chatData.adminHistory =
              chatData.adminHistory.slice(-20)
          }
        }
      }

    } catch (dbError) {
      console.error(
        '[PROMOTE-HISTORY]',
        dbError
      )
    }

    // ========================================================
    // 📤 CONFIRMAR PROMOCIÓN
    // ========================================================

    let nombre = 'Usuario'

    try {
      nombre = await conn.getName(user) || nombre
    } catch {}

    const texto =
      '╭━━━〔 👑 〕━━━╮\n' +
      '   *NUEVO ADMINISTRADOR*\n' +
      '╰━━━━━━━━━━━━━━╯\n\n' +
      `👤 *Usuario:* ${nombre}\n` +
      `📌 *Mención:* @${user.split('@')[0]}\n` +
      `🛡️ *Promovido por:* ${m.pushName || 'Administrador'}\n\n` +
      '✅ Usuario promovido correctamente.'

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

    console.error('[GRUPO-PROMOTE]', e)

    return m.reply(
      '❌ Error al intentar promover al usuario. Verificá los permisos del bot e intentá nuevamente.'
    )
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
