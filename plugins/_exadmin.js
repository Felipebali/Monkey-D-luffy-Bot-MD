
/**
 * 📂 plugins/exigir-admin-bot.js
 * 🛡️ Exige que el bot sea administrador para ejecutar
 * comandos en grupos.
 *
 * Baileys ES Modules
 */

const handler = async (m, { conn, isAdmin, isBotAdmin }) => {
  // Solo aplica en grupos
  if (!m.isGroup) return

  // Ignorar mensajes del propio bot
  if (m.fromMe) return

  // Obtener el prefijo y comando detectados por el handler
  const text = String(m.text || m.body || '').trim()
  if (!text) return

  const prefix = /^[.!#$%&*+/=?@^~]/.test(text)
    ? text.match(/^[.!#$%&*+/=?@^~]/)[0]
    : null

  // Si no empieza con un prefijo, no es un comando
  if (!prefix) return

  const command = text
    .slice(prefix.length)
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()

  if (!command) return

  // No bloquear comandos para los que el bot no necesita ser admin.
  // Agregá o quitá comandos según tus necesidades.
  const comandosQueNoRequierenAdmin = [
    'antilink',
    'antiencuesta',
    'antilocation',
    'antivirus',
    'menu',
    'help'
  ]

  if (comandosQueNoRequierenAdmin.includes(command)) return

  let botIsAdmin = false

  try {
    const metadata = await conn.groupMetadata(m.chat)
    const botJid = conn.decodeJid(conn.user.id)

    const botParticipant = metadata.participants.find(p =>
      conn.decodeJid(p.id) === botJid
    )

    botIsAdmin = Boolean(
      botParticipant?.admin === 'admin' ||
      botParticipant?.admin === 'superadmin'
    )
  } catch (error) {
    console.error(
      '[EXIGIR-ADMIN-BOT] No se pudo comprobar si el bot es admin:',
      error
    )

    return m.reply(
      '⚠️ No pude verificar si soy administrador. Intentá nuevamente.'
    )
  }

  if (!botIsAdmin) {
    return m.reply(
      '🛡️ *COMANDO BLOQUEADO*\n\n' +
      'Para ejecutar este comando, primero necesito ser *administrador del grupo*.\n\n' +
      '👑 Haceme administrador e intentá nuevamente.'
    )
  }
}

handler.before = async function (m, { conn }) {
  if (!m?.isGroup || m.fromMe) return

  const text = String(m.text || m.body || '').trim()
  if (!text) return

  const prefixMatch = text.match(/^[.!#$%&*+/=?@^~]/)
  if (!prefixMatch) return

  const command = text
    .slice(prefixMatch[0].length)
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()

  if (!command) return

  // Estos comandos funcionan sin que el bot sea administrador.
  const excepciones = [
    'antilink',
    'antiencuesta',
    'antilocation',
    'antivirus',
    'menu',
    'help'
  ]

  if (excepciones.includes(command)) return

  try {
    const metadata = await conn.groupMetadata(m.chat)
    const botJid = conn.decodeJid(conn.user.id)

    const botParticipant = metadata.participants.find(
      p => conn.decodeJid(p.id) === botJid
    )

    const botIsAdmin = Boolean(
      botParticipant?.admin === 'admin' ||
      botParticipant?.admin === 'superadmin'
    )

    if (!botIsAdmin) {
      await m.reply(
        '🛡️ *COMANDO BLOQUEADO*\n\n' +
        'Necesito ser *administrador del grupo* para ejecutar comandos.\n' +
        '👑 Haceme administrador y volvé a intentarlo.'
      )

      // Evita que el comando continúe en handlers compatibles
      m._skipCommand = true
    }
  } catch (error) {
    console.error(
      '[EXIGIR-ADMIN-BOT] Error verificando permisos:',
      error
    )
    m._skipCommand = true
    await m.reply(
      '⚠️ No pude verificar mis permisos de administrador. Comando cancelado por seguridad.'
    )
  }
}

handler.priority = 1000

export default handler
