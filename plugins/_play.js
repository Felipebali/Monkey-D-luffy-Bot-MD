// 📂 plugins/_play.js

import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, args, text, usedPrefix, command }) => {

  // 🔎 VALIDAR BÚSQUEDA
  if (!text) {
    throw `❌ Escribí el nombre de una canción o video.\n\nEjemplo:\n${usedPrefix + command} nombre de la canción`
  }

  const tipo = command === 'play' ? 'audio' : 'vídeo'

  // 🔍 BUSCAR EN YOUTUBE
  let result

  try {
    result = await search(args.join(' '))
  } catch (error) {
    console.error('❌ Error buscando en YouTube:', error)
    return conn.reply(m.chat, '❌ No se pudo realizar la búsqueda en YouTube.', m)
  }

  if (!result) {
    return conn.reply(m.chat, '❌ No se encontraron resultados.', m)
  }

  const videoUrl = `https://youtube.com/watch?v=${result.videoId}`

  // 📋 INFORMACIÓN DEL VIDEO
  const body = `
🎵 Título: ${result.title}
📅 Publicado: ${result.ago}
⏱️ Duración: ${result.duration.timestamp}
👁️ Visualizaciones: ${formatNumber(result.views)}
👤 Autor: ${result.author.name}
🆔 ID: ${result.videoId}
📂 Tipo: ${result.type}
🔗 URL: ${result.url}
🌐 Canal: ${result.author.url}

⏳ Descargando ${tipo}...
`.trim()

  // 🖼️ ENVIAR INFORMACIÓN
  await conn.sendMessage(
    m.chat,
    {
      image: { url: result.thumbnail },
      caption: body
    },
    { quoted: m }
  )

  // 🎵 DESCARGAR AUDIO
  if (command === 'play') {
    try {
      const audiodlp = await tools.downloader.ytmp3(videoUrl)
      const downloader = audiodlp?.download

      if (!downloader) {
        throw new Error('No se recibió el enlace de descarga')
      }

      await conn.sendMessage(
        m.chat,
        {
          audio: { url: downloader },
          mimetype: 'audio/mpeg'
        },
        { quoted: m }
      )

    } catch (error) {
      console.log('❌ Error descargando MP3, intentando Ruby-core:', error)

      try {
        const response = await fetch(
          `https://ruby-core.vercel.app/api/download/youtube/mp3?url=${encodeURIComponent(videoUrl)}`
        )

        const ruby = await response.json()

        if (ruby?.status && ruby?.download?.url) {
          await conn.sendMessage(
            m.chat,
            {
              audio: { url: ruby.download.url },
              mimetype: 'audio/mpeg'
            },
            { quoted: m }
          )
        } else {
          await conn.reply(m.chat, '❌ No se pudo descargar el audio.', m)
        }

      } catch (err2) {
        console.log('❌ Error en Ruby-core MP3:', err2)
        await conn.reply(m.chat, '❌ Fallaron los métodos de descarga de audio.', m)
      }
    }
  }

  // 🎬 DESCARGAR VIDEO
  if (command === 'play2') {
    try {
      const videodlp = await tools.downloader.ytmp4(videoUrl)
      const downloader = videodlp?.download

      if (!downloader) {
        throw new Error('No se recibió el enlace de descarga')
      }

      await conn.sendMessage(
        m.chat,
        {
          video: { url: downloader },
          mimetype: 'video/mp4'
        },
        { quoted: m }
      )

    } catch (error) {
      console.log('❌ Error descargando MP4, intentando Ruby-core:', error)

      try {
        const response = await fetch(
          `https://ruby-core.vercel.app/api/download/youtube/mp4?url=${encodeURIComponent(videoUrl)}`
        )

        const ruby = await response.json()

        if (ruby?.status && ruby?.download?.url) {
          await conn.sendMessage(
            m.chat,
            {
              video: { url: ruby.download.url },
              mimetype: 'video/mp4'
            },
            { quoted: m }
          )
        } else {
          await conn.reply(m.chat, '❌ No se pudo descargar el video.', m)
        }

      } catch (err2) {
        console.log('❌ Error en Ruby-core MP4:', err2)
        await conn.reply(m.chat, '❌ Fallaron los métodos de descarga de video.', m)
      }
    }
  }
}

// ⚙️ CONFIGURACIÓN
handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = ['play', 'play2']

export default handler

// 🔍 BUSCADOR
async function search(query, options = {}) {
  const searchRes = await yts.search({
    query,
    hl: 'es',
    gl: 'ES',
    ...options
  })

  return searchRes.videos?.[0] || null
}

// 🔢 FORMATEAR NÚMEROS
function formatNumber(num) {
  return Number(num || 0).toLocaleString('es-UY')
}
