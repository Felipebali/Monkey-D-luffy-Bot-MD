// 📂 plugins/owner.js
// 👑 SISTEMA DE PROPIETARIOS
// ✨ Diseño premium + menciones + validación
// ============================================================

let handler = async (m, { conn }) => {

  // ==========================================================
  // ⚙️ CONFIGURACIÓN
  // ==========================================================

  if (!Array.isArray(global.owner) || global.owner.length === 0) {
    return m.reply(
      '╭━━━〔 ⚠️ 〕━━━╮\n' +
      '   *SIN PROPIETARIOS*\n' +
      '╰━━━━━━━━━━━━━━╯\n\n' +
      '❌ No hay owners configurados actualmente.'
    )
  }

  // Mostrar un máximo de 3 propietarios
  const owners = global.owner.slice(0, 2)

  const mentions = []
  const tarjetas = []

  // ==========================================================
  // 👑 GENERAR TARJETAS DE OWNERS
  // ==========================================================

  for (let i = 0; i < owners.length; i++) {

    const data = owners[i]

    const numeroOriginal = Array.isArray(data)
      ? data[0]
      : data

    const nombreOriginal = Array.isArray(data)
      ? data[1]
      : null

    const numero = String(numeroOriginal || '')
      .trim()
      .replace(/@s\.whatsapp\.net/gi, '')
      .replace(/@c\.us/gi, '')
      .replace(/\D/g, '')

    // Evitar crear menciones vacías o incorrectas
    if (!numero || numero.length < 7 || numero.length > 15) {
      continue
    }

    const nombre = String(
      nombreOriginal || `Owner ${i + 1}`
    ).trim().slice(0, 60)

    const jid = `${numero}@s.whatsapp.net`

    mentions.push(jid)

    tarjetas.push(
      `╭━━━〔 👑 〕━━━╮\n` +
      `┃ *${nombre || `Owner ${i + 1}`}*\n` +
      `┃\n` +
      `┃ 📱 @${numero}\n` +
      `┃ 🛡️ Propietario oficial\n` +
      `╰━━━━━━━━━━━━━━╯`
    )
  }

  // ==========================================================
  // 🛑 COMPROBAR RESULTADOS
  // ==========================================================

  if (tarjetas.length === 0) {
    return m.reply(
      '❌ No se encontraron propietarios con números válidos.'
    )
  }

  // ==========================================================
  // 🎨 ENCABEZADO Y PIE
  // ==========================================================

  const encabezado =
    `╭━━━〔 ✨ 〕━━━╮\n` +
    `   *LISTA DE OWNERS*\n` +
    `╰━━━━━━━━━━━━━━╯\n\n` +
    `👑 *Equipo de administración*\n` +
    `🔐 Usuarios autorizados como propietarios\n\n`

  const pie =
    `\n\n━━━━━━━━━━━━━━━━━━\n` +
    `👥 *Total:* ${tarjetas.length} ${tarjetas.length === 1 ? 'propietario' : 'propietarios'}\n` +
    `⚙️ *Estado:* Configuración activa`

  const texto =
    encabezado +
    tarjetas.join('\n\n') +
    pie

  // ==========================================================
  // 📤 ENVIAR MENSAJE
  // ==========================================================

  return conn.sendMessage(
    m.chat,
    {
      text: texto,
      mentions
    },
    {
      quoted: m
    }
  )
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL COMANDO
// ============================================================

handler.command = /^owner$/i
handler.help = ['owner']
handler.tags = ['info']

export default handler
