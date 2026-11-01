// 📂 plugins/_play.js
// 🎵 Buscador de YouTube
// Compatible con ES Modules

import yts from 'yt-search'

let handler = async (m, { conn, command, text, usedPrefix }) => {

  if (!text) {
    throw `❌ FALTA EL NOMBRE DE LA CANCIÓN

Ejemplo:
${usedPrefix + command} Good Feeling - Flo Rida`
  }

  try {
    const resultado = await yts.search({
      query: text,
      hl: 'es',
      gl: 'UY'
    })

    const vid = resultado.videos?.[0]

    if (!vid) {
      return m.reply('❌ No se encontraron resultados.')
    }

    const url = vid.url

    const caption = `
📌 *TÍTULO:* ${vid.title}
📆 *PUBLICADO:* ${vid.ago || 'Desconocido'}
⌚ *DURACIÓN:* ${vid.duration?.timestamp || 'Desconocida'}
👀 *VISTAS:* ${Number(vid.views || 0).toLocaleString('es-UY')}
👤 *CANAL:* ${vid.author?.name || 'Desconocido'}
🔗 *URL:* ${url}

🎧 *AUDIO:* 
.play ${url}

🎬 *VIDEO:*
.play2 ${url}
`.trim()

    await conn.sendMessage(
      m.chat,
      {
        image: { url: vid.thumbnail },
        caption,
        contextInfo: {
          externalAdReply: {
            title: '🎵 YouTube Music',
            body: 'Buscador de canciones',
            mediaType: 1,
            thumbnailUrl: vid.thumbnail,
            sourceUrl: url
          }
        }
      },
      { quoted: m }
    )

  } catch (error) {
    console.error('Error en _play.js:', error)
    m.reply('❌ Error al buscar en YouTube. Intentá nuevamente.')
  }
}

handler.help = ['play', 'play2', 'play3']
handler.tags = ['downloader']
handler.command = /^(play|play2|play3)$/i

export default handler
