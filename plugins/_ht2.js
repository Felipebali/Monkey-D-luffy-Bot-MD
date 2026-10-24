
// 📂 plugins/ht2.js
// 👑 WHATSAPP-BOT — HT2
// 🔐 Acceso exclusivo a global.owner

const normalizar = (jid = '') => String(jid)
  .trim()
  .split('@')[0]
  .split(':')[0]
  .replace(/\D/g, '')

function esOwner(m) {
  const owners = Array.isArray(global.owner) ? global.owner : []
  const sender = normalizar(m.sender)

  if (!sender) return false

  return owners.some(owner => {
    const numero = Array.isArray(owner) ? owner[0] : owner
    return normalizar(numero) === sender
  })
}

const handler = async (m, { conn }) => {
  if (!esOwner(m)) {
    return m.reply(
      '⛔ *ACCESO DENEGADO*\n\n' +
      '👑 Este comando es exclusivo de los owners de WHATSAPP-BOT.'
    )
  }

  if (!m.isGroup) {
    return m.reply('⚠️ Este comando solo funciona en grupos.')
  }

  const link =
    'https://chat.whatsapp.com/HwQuzOOfqA8C38ICFG4jq5?s=cl&p=a&mlu=4&ilr=4&iam=0'

  await conn.sendMessage(m.chat, {
    text: `📢 *INVITACIÓN*\n\n${link}`
  })
}

handler.help = ['ht2']
handler.tags = ['owner']
handler.command = /^ht2$/i
handler.group = true

export default handler
