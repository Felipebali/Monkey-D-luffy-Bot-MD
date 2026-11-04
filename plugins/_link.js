
/**
 * 📂 plugins/_link.js
 * 🔗 WHATSAPP-BOT — ENLACES DE GRUPOS
 *
 * 👑 Solo owners de global.owner
 * 😂 Descansada con mención, sin citar ni expulsar
 * 🔗 Enlace actual + 2 grupos adicionales
 */

const handler = async (m, { conn, isBotAdmin }) => {
  if (!m.isGroup) {
    return conn.sendMessage(m.chat, {
      text: '❗ Este comando solo puede usarse dentro de grupos.'
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

    return String(owner).replace(/[^0-9]/g, '')
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

    const nombre = m.pushName || 'Usuario'

    return conn.sendMessage(m.chat, {
      text: `☠️ @${senderNumber}

💀 *${nombre}*, ${descanso}`,
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
    // 🔗 NUEVOS ENLACES DE GRUPOS
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
    // 🔗 ENLACE DEL GRUPO ACTUAL
    // ============================================================

    const code = await conn.groupInviteCode(m.chat)
    const metadata = await conn.groupMetadata(m.chat)

    let texto =
      '╭━━━〔 🌐 *ENLACES DE GRUPOS* 〕━━━╮\n' +
      '┃\n' +
      `┃ 📛 *Grupo actual:* ${metadata.subject}\n` +
      `┃ 👥 *Miembros:* ${metadata.participants.length}\n` +
      '┃\n' +
      '┃ 🔗 *ENLACE DEL GRUPO ACTUAL*\n' +
      `┃ https://chat.whatsapp.com/${code}\n` +
      '┃\n' +
      '┣━━━〔 📌 *OTROS GRUPOS* 〕━━━\n' +
      '┃\n'

    // ============================================================
    // 📌 AGREGAR LOS DOS GRUPOS
    // ============================================================

    for (const grupo of enlacesExtra) {
      texto +=
        `┃ 🔹 *${grupo.nombre}*\n` +
        `┃ https://chat.whatsapp.com/${grupo.codigo}\n` +
        '┃\n'
    }

    // ============================================================
    // 👑 FRASES PARA OWNERS
    // ============================================================

    const frases = [
      '🐾 A la orden, mi creador.',
      '😼 Siempre listo para servirte, sensei.',
      '👑 Solo tú controlas los hilos del destino.',
      '⚡ Obedeciendo órdenes, jefe.',
      '🦾 A sus órdenes, comandante.'
    ]

    const frase = frases[
      Math.floor(Math.random() * frases.length)
    ]

    texto +=
      '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
      `${frase}\n` +
      '🐾 *WHATSAPP-BOT — Conectando grupos*'

    // ============================================================
    // 📩 ENVIAR SIN CITAR
    // ============================================================

    return conn.sendMessage(m.chat, {
      text: texto
    })

  } catch (err) {
    console.error(
      '[LINK] Error obteniendo los enlaces:',
      err
    )

    return conn.sendMessage(m.chat, {
      text: '❗ No pude obtener el enlace actual. Verificá que el bot sea administrador del grupo.'
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
