
async function sendWarning(conn, groupJid, senderJid) {
  try {
    await conn.sendMessage(groupJid, {
      text: `╭━━━〔 🚫 ANTIESTADO 〕━━━⬣

⚠️ Atención: @${digits(senderJid)}

📢 *No se permiten estados mencionando a este grupo.*

🛡️ Por favor, respetá las reglas del grupo y evitá publicar estados que lo mencionen.

╰━━━━━━━━━━━━━━━━⬣
        💜 WHATSAPP-BOT`,
      mentions: [senderJid]
    })

    console.log('[ANTIESTADO] Aviso enviado al grupo.')
  } catch (error) {
    console.error('[ANTIESTADO] No se pudo enviar el aviso:', error)
  }
}
