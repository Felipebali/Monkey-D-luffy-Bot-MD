// 📂 plugins/_play.js
// 🎵 YouTube Play - Audio y Video

import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, args, text, usedPrefix, command }) => {

  if (!text) {
    throw `❌ Escribí el nombre de una canción o video.\n\nEjemplo:\n${usedPrefix + command} nombre de la canción`
  }

  // 🔍 BUSCAR EN YOUTUBE
  let result

  try {
    const searchRes = await yts.search({
      query: args.join(' '),
      hl: 'es',
      gl: 'UY'
    })

    result = searchRes.videos?.[0]

  } catch (error) {
    console.error('❌ Error buscando en YouTube:', error)
    return conn.reply(m.chat, '❌ No se pudo realizar la búsqueda.', m)
  }

  if (!result) {
    return conn.reply(m.chat, '❌ No se encontraron resultados.', m)
  }

  const videoUrl = result.url

  // 📋 INFORMACIÓN
  const body = `
🎵 Título: ${result.title}
📅 Publicado: ${result.ago}
⏱️ Duración: ${result.duration.timestamp}
👁️ Visualizaciones: ${Number(result.views || 0).toLocaleString('es-UY')}
👤 Autor: ${result.author.name}
🆔 ID: ${result.videoId}
🔗 URL: ${videoUrl}

⏳ Procesando ${command === 'play' ? 'audio' : 'vídeo'}...
`.trim()

  await conn.sendMessage(
    m.chat,
    {
      image: { url: result.thumbnail },
      caption: body
    },
    { quoted: m }
  )

  // 📥 DESCARGAR AUDIO
  if (command === 'play') {
    try {
      const api = `https://ruby-core.vercel.app/api/download/youtube/mp3?url=${encodeURIComponent(videoUrl)}`

      const response = await fetch(api)
      const ruby = await response.json()

      if (!response.ok || !ruby?.status || !ruby?.download?.url) {
        throw new Error('La API no devolvió un enlace válido')
      }

      await conn.sendMessage(
        m.chat,
        {
          audio: { url: ruby.download.url },
          mimetype: 'audio/mpeg',
          fileName: `${result.title}.mp3`
        },
        { quoted: m }
      )

    } catch (error) {
      console.error('❌ Error descargando MP3:', error)
      await conn.reply(m.chat, '❌ No se pudo descargar el audio. Intentá nuevamente más tarde.', m)
    }
  }

  // 📥 DESCARGAR VIDEO
  if (command === 'play2') {
    try {
      const api = `https://ruby-core.vercel.app/api/download/youtube/mp4?url=${encodeURIComponent(videoUrl)}`

      const response = await fetch(api)
      const ruby = await response.json()

      if (!response.ok || !ruby?.status || !ruby?.download?.url) {
        throw new Error('La API no devolvió un enlace válido')
      }

      await conn.sendMessage(
        m.chat,
        {
          video: { url: ruby.download.url },
          mimetype: 'video/mp4',
          fileName: `${result.title}.mp4`
        },
        { quoted: m }
      )

    } catch (error) {
      console.error('❌ Error descargando MP4:', error)
      await conn.reply(m.chat, '❌ No se pudo descargar el vídeo. Intentá nuevamente más tarde.', m)
    }
  }
}

handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = ['play', 'play2']

export default handler

// 🔍 BUSCADOR
async function search(query, options = {}) {
  const searchRes = await yts.search({
    query,
    hl: 'es',
    gl: 'UY',
    ...options
  })

  return searchRes.videos?.[0] || null
}
