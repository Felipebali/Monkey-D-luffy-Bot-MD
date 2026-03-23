// 📂 plugins/resetlink.js — Reset link solo para owners 🔗

console.log('[Plugin] resetlink cargado')

let handler = async (m, { conn, isOwner, isBotAdmin }) => {
  try {
    if (!m.isGroup) 
      return m.reply('❌ Este comando solo funciona en grupos.')

    // 🔐 Usa el sistema del bot (MUY IMPORTANTE)
    if (!isOwner) 
      return m.reply('❌ Este comando es solo para owners.')

    if (!isBotAdmin) 
      return m.reply('❌ Necesito ser administrador del grupo para resetear el link.')

    // 🔗 Resetear link
    const code = await conn.groupRevokeInvite(m.chat)

    // 📩 Enviar nuevo link
    await conn.sendMessage(m.chat, { 
      text: `🔗 *Link del grupo reseteado correctamente*\n\nNuevo link:\nhttps://chat.whatsapp.com/${code}`
    })

  } catch (e) {
    console.error('Error en resetlink:', e)
    m.reply('⚠️ Ocurrió un error al intentar resetear el link.')
  }
}

// ✅ COMANDOS (IMPORTANTE: no duplicar)
handler.command = /^resetlink$/i

handler.help = ['resetlink']
handler.tags = ['owner']
handler.group = true

// 🔐 Restricción real
handler.owner = true

export default handler
