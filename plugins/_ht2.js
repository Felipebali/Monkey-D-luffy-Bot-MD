
// 📂 plugins/ht2.js
// 👑 WHATSAPP-BOT — HT2
// 🔐 Comando exclusivo para owners

const handler = async (m, { conn }) => {
  const esOwner = m.isROwner || m.isOwner

  if (!esOwner) {
    return m.reply('⛔ Este comando es exclusivo de los owners de WHATSAPP-BOT.')
  }

  if (!m.isGroup) {
    return m.reply('⚠️ Este comando solo funciona en grupos.')
  }

  const link = 'https://chat.whatsapp.com/HwQuzOOfqA8C38ICFG4jq5?s=cl&p=a&mlu=4&ilr=4&iam=0'

  await conn.sendMessage(m.chat, {
    text: `📢 Invitación:\n${link}`
  })

  return m.reply('✅ Invitación publicada.')
}

handler.help = ['ht2']
handler.tags = ['owner']
handler.command = /^ht2$/i
handler.group = true

export default handler
