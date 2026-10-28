
/**
 * 📂 plugins/exigir-admin-bot.js
 * 🛡️ Bloquea los comandos de grupo si el bot no es admin.
 * Baileys ES Modules
 */

const handler = async () => {}
handler.disabled = false

handler.before = async function (m, { conn }) {
  if (!m?.isGroup || m.fromMe) return false

  const text = String(
    m.text ||
    m.body ||
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    ''
  ).trim()

  if (!text) return false

  // Detectar el prefijo del comando
  const prefixMatch = text.match(/^[.!#$%&*+/=?@^~]/)
  if (!prefixMatch) return false

  const command = text
    .slice(prefixMatch[0].length)
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()

  if (!command) return false

  // Comprobar si el bot es administrador
  try {
    const metadata = await conn.groupMetadata(m.chat)
    const botJid = conn.decodeJid(conn.user.id)

    const botParticipant = metadata.participants.find(p => {
      const participantJid = conn.decodeJid(p.id || p.jid || '')
      return participantJid === botJid
    })

    const botIsAdmin =
      botParticipant?.admin === 'admin' ||
      botParticipant?.admin === 'superadmin'

    if (botIsAdmin) {
      // El bot es admin: permitir que continúe el comando
      return false
    }

    // El bot no es admin: avisar y detener el procesamiento
    await m.reply(
      '🛡️ *COMANDO BLOQUEADO*\n\n' +
      '❌ No soy administrador de este grupo.\n\n' +
      '👑 Haceme administrador para poder ejecutar comandos.'
    )

    return true
  } catch (error) {
    console.error(
      '[EXIGIR-ADMIN-BOT] Error verificando permisos:',
      error
    )

    await m.reply(
      '⚠️ No pude comprobar si soy administrador.\n' +
      'El comando fue bloqueado por seguridad.'
    ).catch(() => {})

    return true
  }
}

handler.priority = 1000
handler.tags = ['grupo']
handler.help = ['exigir-admin-bot']

export default handler
