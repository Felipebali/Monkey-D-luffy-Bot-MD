
 // 📂 plugins/owner.js
 // 👑 WHATSAPP-BOT — OWNERS PREMIUM
 // ✨ Angee 🧸🩷 & Pipe 🥶
 
let handler = async (m, { conn }) => {
  if (!Array.isArray(global.owner) || global.owner.length === 0) {
    return m.reply(
      '╭━━━〔 ⚠️ SISTEMA DE OWNERS 〕━━━╮\n' +
      '┃\n' +
      '┃ ❌ No hay propietarios configurados.\n' +
      '┃\n' +
      '╰━━━━━━━━━━━━━━━━━━━━━━╯'
    )
  }

  const owners = global.owner
  const mentions = []
  const tarjetas = []

  const normalizar = (valor) => String(valor || '')
    .trim()
    .replace(/@s\.whatsapp\.net/gi, '')
    .replace(/@c\.us/gi, '')
    .replace(/@lid/gi, '')
    .replace(/:\d+$/g, '')
    .replace(/\D/g, '')

  for (let i = 0; i < owners.length; i++) {
    const data = owners[i]
    const numeroOriginal = Array.isArray(data) ? data[0] : data
    const nombreOriginal = Array.isArray(data) ? data[1] : null

    const numero = normalizar(numeroOriginal)

    if (!numero || numero.length < 7 || numero.length > 15) continue

    const nombreConfig = String(nombreOriginal || '').trim()
    const nombreLower = nombreConfig.toLowerCase()

    // Personalización para Angee y Pipe
    let nombre = nombreConfig || `Owner ${i + 1}`
    let emoji = '👑'
    let rol = 'Propietario oficial'
    let estilo = '💠'

    if (nombreLower.includes('angee') || nombreLower.includes('angelina')) {
      nombre = 'Angee 🧸🩷'
      emoji = '🎀'
      rol = 'Propietaria oficial'
      estilo = '🌸'
    } else if (
      nombreLower.includes('pipe') ||
      nombreLower.includes('felipe')
    ) {
      nombre = 'Pipe 🥶'
      emoji = '⚡'
      rol = 'Propietario oficial'
      estilo = '❄️'
    }

    const jid = `${numero}@s.whatsapp.net`
    mentions.push(jid)

    tarjetas.push(
      `╭━━━〔 ${emoji} OWNER ${String(i + 1).padStart(2, '0')} 〕━━━╮\n` +
      `┃\n` +
      `┃ ${estilo} *${nombre}*\n` +
      `┃\n` +
      `┃ 📱 @${numero}\n` +
      `┃ ${emoji} ${rol}\n` +
      `┃ 🔐 Acceso de propietario\n` +
      `┃\n` +
      `╰━━━━━━━━━━━━━━━━━━━━━━╯`
    )
  }

  if (tarjetas.length === 0) {
    return m.reply(
      '╭━━━〔 ⚠️ 〕━━━╮\n' +
      '┃ No se encontraron owners con números válidos.\n' +
      '╰━━━━━━━━━━━━━━╯'
    )
  }

  const encabezado =
    `╭━━━〔 👑 WHATSAPP-BOT 〕━━━╮\n` +
    `┃\n` +
    `┃ ✨ *EQUIPO DE PROPIETARIOS*\n` +
    `┃ 🛡️ Administración oficial del bot\n` +
    `┃ 💜 Confianza · Control · Seguridad\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`

  const pie =
    `\n\n╭━━━〔 📊 ESTADÍSTICAS 〕━━━╮\n` +
    `┃ 👥 Total: *${tarjetas.length}* ${tarjetas.length === 1 ? 'propietario' : 'propietarios'}\n` +
    `┃ 🟢 Estado: *Configuración activa*\n` +
    `┃ 🤖 Bot: *WHATSAPP-BOT*\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━╯`

  return conn.sendMessage(m.chat, {
    text: encabezado + tarjetas.join('\n\n') + pie,
    mentions
  }, { quoted: m })
}

handler.command = /^owner$/i
handler.help = ['owner']
handler.tags = ['info']

export default handler
