
/**
 * 📂 plugins/antiver.js
 * 👁️ WHATSAPP-BOT — AUTOLEER TODOS LOS MENSAJES
 *
 * Marca como leídos los mensajes entrantes de grupos
 * y chats privados.
 */

export async function before(m, { conn }) {
  try {
    // Validar el mensaje recibido.
    if (!m?.key?.id || !m.chat) return

    // No marcar como leído un mensaje enviado por el propio bot.
    if (m.fromMe || m.key.fromMe) return

    // Marcar el mensaje como leído.
    await conn.readMessages([{
      remoteJid: m.chat,
      id: m.key.id,
      participant: m.isGroup
        ? (m.key.participant || m.sender)
        : undefined
    }])

  } catch (e) {
    console.error('[ANTIVER] Error al marcar como leído:', e)
  }
}
