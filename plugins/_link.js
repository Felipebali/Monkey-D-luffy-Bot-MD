
/**
 * 📂 plugins/_link.js
 * 🔗 WHATSAPP-BOT — ENLACES DE GRUPOS
 *
 * 👑 Exclusivo para owners
 * 📢 Mención oculta a todos los participantes
 * 👥 Invitación para agregar más personas
 * 😂 Descansada a usuarios sin permisos
 * 🚫 Sin citar mensajes
 *
 * Baileys ES Modules
 */

const handler = async (m, { conn, isBotAdmin }) => {

  if (!m.isGroup) {
    return conn.sendMessage(m.chat, {
      text: '❗ Este comando solo funciona en grupos.'
    })
  }

  // ============================================================
  // 👑 OBTENER OWNERS
  // ============================================================

  const owners = (global.owner || []).map(owner => {
    if (Array.isArray(owner)) {
      owner = owner[0]
    } else if (owner && typeof owner === 'object') {
      owner = owner.id || owner.number || owner.jid || ''
    }

    return String(owner)
      .split('@')[0]
      .replace(/[^0-9]/g, '')
  })

  const senderNumber = String(m.sender || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/[^0-9]/g, '')

  const isOwner = owners.includes(senderNumber)

  // ============================================================
  // 😂 USUARIOS SIN PERMISO
  // ============================================================

  if (!isOwner) {

    await conn.sendMessage(m.chat, {
      react: {
        text: '☠️',
        key: m.key
      }
    }).catch(() => {})

    const descansadas = [
      '¿Quién te dio permiso para pedir el link? JAJAJA. 😂',
      'El enlace es exclusivo de los owners. Volvé a tu asiento, campeón. 🪑',
      'Mucha confianza para tan pocos permisos. JAJAJA. 🐾',
      '¿Querés el link? Primero desbloqueá el rango de owner, máquina. 👑',
      'Tranquilo, crack... el enlace no se va a escapar. 🤣'
    ]

    const descanso = descansadas[
      Math.floor(Math.random() * descansadas.length)
    ]

    return conn.sendMessage(m.chat, {
      text: `☠️ @${senderNumber}

💀 *${m.pushName || 'Usuario'}*, ${descanso}`,
      mentions: [m.sender]
    })
  }

  // ============================================================
  // 🛡️ VERIFICAR ADMINISTRADOR
  // ============================================================

  if (!isBotAdmin) {
    return conn.sendMessage(m.chat, {
      text: '❗ Necesito ser *administrador del grupo* para obtener el enlace actual.'
    })
  }

  try {

    await conn.sendMessage(m.chat, {
      react: {
        text: '😼',
        key: m.key
      }
    }).catch(() => {})

    // ============================================================
    // 🔗 ENLACES ADICIONALES
    // ============================================================

    const enlacesExtra = [
      {
        nombre: 'Grupo 1',
        codigo: 'HB9qYS377UZARJLypp9MVb'
      },
      {
        nombre: 'Grupo 2',
        codigo: 'DFnfd3Kyd4q8QNRHsj4PEp'
      }
    ]

    // ============================================================
    // 📋 DATOS DEL GRUPO
    // ============================================================

    const metadata = await conn.groupMetadata(m.chat)

    const code = await conn.groupInviteCode(m.chat)

    // ============================================================
    // 📢 MENCIONES OCULTAS
    // ============================================================

    const mentions = [
      ...new Set(
        (metadata.participants || [])
          .map(p => p.id)
          .filter(Boolean)
      )
    ]

    // ============================================================
    // 📝 CONSTRUIR MENSAJE
    // ============================================================

    let texto = `╭━━━〔 🌐 *ENLACES DE GRUPOS* 〕━━━╮
┃
┃ 📛 *Grupo actual:* ${metadata.subject}
┃ 👥 *Miembros:* ${metadata.participants.length}
┃
┃ 🔗 *ENLACE DEL GRUPO ACTUAL*
┃ https://chat.whatsapp.com/${code}
┃
┣━━━〔 📌 *OTROS GRUPOS* 〕━━━
┃
`

    for (const grupo of enlacesExtra) {
      texto += `┃ 🔹 *${grupo.nombre}*
┃ https://chat.whatsapp.com/${grupo.codigo}
┃
`
    }

    texto += `╰━━━━━━━━━━━━━━━━━━━━━━╯

📢 *¡ATENCIÓN A TODOS!*

👥 *¡AYUDEN A HACER CRECER LOS GRUPOS!*

🚀 Los invitamos a compartir los enlaces y agregar a sus amigos, conocidos y personas que quieran formar parte de la comunidad.

🔗 *¡Compartan los grupos para que llegue más gente!*

🤝 Recuerden invitar solamente a personas que quieran participar y respetar las reglas.

👑 *WHATSAPP-BOT — Conectando grupos*`

    // ============================================================
    // 📩 ENVIAR CON MENCIONES OCULTAS
    // ============================================================

    return await conn.sendMessage(m.chat, {
      text: texto,
      mentions
    })

  } catch (error) {

    console.error(
      '[LINK] Error obteniendo enlaces:',
      error
    )

    return conn.sendMessage(m.chat, {
      text: '❗ No pude obtener los enlaces. Verificá que el bot sea administrador.'
    })
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = ['link', 'glink']
handler.tags = ['owner']
handler.command = ['link', 'glink']
handler.group = true

export default handler
