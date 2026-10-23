
/**
 * 📂 plugins/_link.js
 * 🔗 WHATSAPP-BOT — ENLACE DEL GRUPO
 *
 * 👑 Owners definidos en global.owner
 * 😂 Descansa a los demás, sin expulsarlos.
 */

const handler = async (m, { conn, isBotAdmin }) => {
  if (!m.isGroup) {
    return conn.reply(
      m.chat,
      '❗ Este comando solo puede usarse dentro de grupos.',
      m
    )
  }

  // 👑 Obtener owners desde global.owner
  const owners = (global.owner || []).map(owner => {
    if (Array.isArray(owner)) owner = owner[0]

    return String(owner)
      .replace(/[^0-9]/g, '')
  })

  // 🔎 Normalizar el número del remitente
  const senderNumber = String(m.sender || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/[^0-9]/g, '')

  const isOwner = owners.includes(senderNumber)

  // 😂 Descansada para quien no sea owner (sin expulsión)
  if (!isOwner) {
    await conn.sendMessage(m.chat, {
      react: {
        text: '☠️',
        key: m.key
      }
    }).catch(() => {})

    const descansadas = [
      `💀 *${m.pushName || 'Usuario'}*, ¿quién te dio permiso para pedir el link? JAJAJA. 😂`,
      '😹 El enlace es exclusivo de los owners. Volvé a tu asiento, campeón. 🪑',
      '☠️ Mucha confianza para tan pocos permisos. JAJAJA. 🐾',
      '😂 ¿Querés el link? Primero desbloqueá el rango de owner, máquina. 👑',
      '🐒 Tranquilo, crack... el enlace no se va a escapar. 🤣'
    ]

    const texto = descansadas[
      Math.floor(Math.random() * descansadas.length)
    ]

    return conn.reply(m.chat, texto, m)
  }

  // 🛡️ El bot necesita ser administrador
  if (!isBotAdmin) {
    return conn.reply(
      m.chat,
      '❗ Necesito ser *administrador del grupo* para obtener el enlace.',
      m
    )
  }

  try {
    await conn.sendMessage(m.chat, {
      react: {
        text: '😼',
        key: m.key
      }
    }).catch(() => {})

    const code = await conn.groupInviteCode(m.chat)
    const link = `https://chat.whatsapp.com/${code}`
    const metadata = await conn.groupMetadata(m.chat)

    const frases = [
      '🐾 A la orden, mi creador.',
      '😼 Siempre listo para servirte, sensei.',
      '👑 Solo tú controlas los hilos del destino del grupo.',
      '⚡ Obedeciendo órdenes, jefe.',
      '🦾 A sus órdenes, comandante.'
    ]

    const frase = frases[
      Math.floor(Math.random() * frases.length)
    ]

    const texto = `
╭━━━〔 *🌐 ENLACE DEL GRUPO* 〕━━━⬣
┃ 📛 *Nombre:* ${metadata.subject}
┃ 👥 *Miembros:* ${metadata.participants.length}
┃ 🔗 *Invitación:*
┃ ${link}
╰━━━━━━━━━━━━━━━━━━━━━━⬣

${frase}
🐾 *WHATSAPP-BOT — Conectando grupos*
`.trim()

    return conn.reply(m.chat, texto, m)
  } catch (err) {
    console.error('[LINK] Error obteniendo el enlace:', err)

    return conn.reply(
      m.chat,
      '❗ No pude obtener el enlace. Verificá que el bot sea administrador del grupo.',
      m
    )
  }
}

handler.help = ['link']
handler.tags = ['owner']
handler.command = ['link', 'glink']
handler.group = true

export default handler
