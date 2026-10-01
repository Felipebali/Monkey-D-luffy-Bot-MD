// 📂 plugins/ig.js
// 🤳 Consulta rápida de perfiles de Instagram
// FelixCat-Bot 🐾

const handler = async (m, { conn, text }) => {
  try {
    let username = text?.trim()

    if (!username) {
      return conn.reply(
        m.chat,
        `❌ *Debes escribir un usuario de Instagram.*\n\n` +
        `📌 *Ejemplo:*\n` +
        `.ig messi\n\n` +
        `💡 También puedes usar:\n` +
        `.ig @messi`,
        m
      )
    }

    // Quitar @
    username = username.replace(/^@+/, '').trim()

    // Aceptar URL completa
    username = username
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .split(/[/?#]/)[0]
      .trim()

    // Validar usuario
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) {
      return conn.reply(
        m.chat,
        `❌ *El usuario de Instagram no es válido.*\n\n` +
        `Usa solamente letras, números, puntos y guiones bajos.`,
        m
      )
    }

    await m.react('🤳')

    // Enlace del perfil
    const instagramUrl = `https://www.instagram.com/${username}/`

    // Imagen
    const image =
      'https://raw.githubusercontent.com/BrayanOFC-Media/Assets/main/logo.png'

    // Mensaje
    const caption = `
╭━━━〔 🤳 *INSTAGRAM* 〕━━━╮
┃
┃ 👤 *Usuario:* @${username}
┃ 🔗 *Perfil:* Instagram
┃
┃ 📲 *Solicitado por:*
┃ @${m.sender.split('@')[0]}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

🌐 *Abrir perfil:*
${instagramUrl}

💡 Tocá el enlace para visitar el perfil.
`.trim()

    // Enviar
    await conn.sendMessage(
      m.chat,
      {
        image: { url: image },
        caption,
        mentions: [m.sender]
      },
      { quoted: m }
    )

    await m.react('✅')

  } catch (error) {
    console.error('❌ Error en plugin IG:', error)

    try {
      await m.react('❌')
    } catch {}

    return conn.reply(
      m.chat,
      '❌ *No se pudo generar el enlace del perfil de Instagram.*',
      m
    )
  }
}

handler.help = [
  'ig <usuario>',
  'instagram <usuario>'
]

handler.tags = ['tools']

handler.command = [
  'ig',
  'instagram'
]

handler.group = false
handler.limit = false

export default handler
