// 📂 plugins/_play.js
// 🎵 Buscador de YouTube

import fs from 'fs'
import fetch from 'node-fetch'
import { youtubeSearch } from '@bochilteam/scraper'

let handler = async (m, { conn, command, text, usedPrefix }) => {

  if (!text) {
    throw `❌ FALTA EL NOMBRE DE LA CANCIÓN

Ejemplo:
${usedPrefix + command} Good Feeling - Flo Rida`
  }

  try {
    const resultado = await youtubeSearch(text)
    const vid = resultado?.video?.[0]

    if (!vid) {
      return m.reply('❌ No se encontraron resultados.')
    }

    const {
      title,
      description,
      thumbnail,
      videoId,
      durationH,
      viewH,
      publishedTime
    } = vid

    const url = `https://www.youtube.com/watch?v=${videoId}`

    const caption = `
📌 *TÍTULO:* ${title}
📇 *DESCRIPCIÓN:* ${description || 'Sin descripción'}
📆 *PUBLICADO:* ${publishedTime || 'Desconocido'}
⌚ *DURACIÓN:* ${durationH || 'Desconocida'}
👀 *VISTAS:* ${viewH || 'Desconocidas'}
🔗 *URL:* ${url}

🎧 Para descargar el audio:
.play ${url}

🎬 Para descargar el video:
.play2 ${url}
`.trim()

    let imagen

    try {
      const response = await fetch(thumbnail)
      imagen = Buffer.from(await response.arrayBuffer())
    } catch {
      imagen = fs.readFileSync('./src/logo.png')
    }

    await conn.sendMessage(
      m.chat,
      {
        image: imagen,
        caption,
        mentions: [m.sender],
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            showAdAttribution: true,
            mediaType: 1,
            title: '🎵 YouTube Music',
            body: 'Buscador de canciones',
            thumbnail: fs.readFileSync('./src/logo.png'),
            sourceUrl: url
          }
        }
      },
      { quoted: m }
    )

  } catch (error) {
    console.error('Error en _play.js:', error)
    m.reply('❌ Ocurrió un error al buscar el video. Intentá nuevamente.')
  }
}

handler.help = ['play', 'play2', 'play3']
handler.tags = ['downloader']
handler.command = /^(play|play2|play3)$/i

export default handler
