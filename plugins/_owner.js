// 📂 plugins/owner.js
// 👑 WHATSAPP-BOT — OWNER PREMIUM
// 🥶 Pipe

const handler = async (m, { conn }) => {
  // Obtener el primer owner de global.owner
  const owner = Array.isArray(global.owner)
    ? global.owner[0]
    : global.owner

  const normalizar = (valor) => {
    if (!valor) return ''

    if (Array.isArray(valor)) {
      valor = valor[0]
    }

    if (typeof valor === 'object' && valor !== null) {
      valor = valor.id || valor.jid || valor.number || valor.numero || ''
    }

    return String(valor)
      .trim()
      .replace(/@s\.whatsapp\.net/gi, '')
      .replace(/@c\.us/gi, '')
      .replace(/@lid/gi, '')
      .replace(/:\d+$/g, '')
      .replace(/\D/g, '')
  }

  const numero = normalizar(owner)

  if (!numero || numero.length < 7 || numero.length > 15) {
    return m.reply(
      '❌ No se pudo obtener el número del owner desde global.owner.'
    )
  }

  const jid = `${numero}@s.whatsapp.net`

  const texto =
    `╭━━━〔 👑 WHATSAPP-BOT 〕━━━╮
┃
┃ 🥶 *OWNER OFICIAL*
┃
┃ ✨ *Pipe*
┃ 🛡️ Creador y propietario
┃ 📱 @${numero}
┃
┃ 💬 *Una frase para vos:*
┃ _En silencio, a mi ritmo y a mi manera; no necesito demostrar quién soy._ 🥶
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 💠 SISTEMA 〕━━━╮
┃ 👤 Propietarios: *1*
┃ 🔐 Estado: *Configuración activa*
╰━━━━━━━━━━━━━━━━━━━━━━╯`

  return conn.sendMessage(
    m.chat,
    {
      text: texto,
      mentions: [jid]
    },
    { quoted: m }
  )
}

handler.command = /^owner$/i
handler.help = ['owner']
handler.tags = ['info']

export default handler
