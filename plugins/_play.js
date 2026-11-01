// 📂 plugins/_play.js

import fs from 'fs'
import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  // 🌐 SISTEMA DE IDIOMA
  const user = global.db?.data?.users?.[m.sender] || {}
  const idioma = user.language || global.defaultLenguaje || 'es'

  const idiomasDisponibles = [
    idioma,
    global.defaultLenguaje,
    'es',
    'es-ES'
  ].filter(Boolean)

  const archivoIdioma = [...new Set(idiomasDisponibles)]
    .map(lang => `./src/languages/${lang}.json`)
    .find(path => fs.existsSync(path))

  if (!archivoIdioma) {
    throw new Error('No se encontró ningún archivo de idioma válido en ./src/languages/')
  }

  const _translate = JSON.parse(
    fs.readFileSync(archivoIdioma, 'utf8')
  )

  const tradutor = _translate?.plugins?.descargas_play

  if (!tradutor) {
    throw new Error(`Falta plugins.descargas_play en ${archivoIdioma}`)
  }

  // 🔎 VALIDAR BÚSQUEDA
  if (!text) {
    throw `${tradutor.texto1[0]} ${usedPrefix + command} ${tradutor.texto1[1]}`
  }

  let additionalText = ''

  if (command === 'play') {
    additionalText = 'audio'
  } else if (command === 'play2') {
    additionalText = 'vídeo'
  }

  // 🔍 BUSCAR EN YOUTUBE
  let result

  try {
    result = await search(args.join(' '))
  } catch (error) {
    console.error('Error buscando en YouTube:', error)
    return conn.reply(m.chat, tradutor.texto6, m)
  }

  if (!result) {
    return conn.reply(m.chat, tradutor.texto6, m)
  }

  const regex = 'https://youtube.com/watch?v='
  const videoUrl = regex + result.videoId

  // 📋 INFORMACIÓN DEL VIDEO
  const body = `
${tradutor.texto2[0]} ${result.title}
${tradutor.texto2[1]} ${result.ago}
${tradutor.texto2[2]} ${result.duration.timestamp}
${tradutor.texto2[3]} ${formatNumber(result.views)}
${tradutor.texto2[4]} ${result.author.name}
${tradutor.texto2[5]} ${result.videoId}
${tradutor.texto2[6]} ${result.type}
${tradutor.texto2[7]} ${result.url}
${tradutor.texto2[8]} ${result.author.url}

${tradutor.texto2[9]} ${additionalText}, ${tradutor.texto2[10]}
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
        throw new Error('El descargador no devolvió un enlace de audio')
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
          await conn.reply(m.chat, tradutor.texto6, m)
        }

      } catch (err2) {
        console.log('❌ Error en Ruby-core MP3:', err2)
        await conn.reply(m.chat, tradutor.texto6, m)
      }
    }
  }

  // 🎬 DESCARGAR VIDEO
  if (command === 'play2') {
    try {
      const videodlp = await tools.downloader.ytmp4(videoUrl)
      const downloader = videodlp?.download

      if (!downloader) {
        throw new Error('El descargador no devolvió un enlace de video')
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
          await conn.reply(m.chat, tradutor.texto6, m)
        }

      } catch (err2) {
        console.log('❌ Error en Ruby-core MP4:', err2)
        await conn.reply(m.chat, tradutor.texto6, m)
      }
    }
  }
}

// ⚙️ CONFIGURACIÓN DEL PLUGIN
handler.help = ['play', 'play2']
handler.tags = ['downloader']
handler.command = ['play', 'play2']

export default handler

// 🔎 FUNCIÓN DE BÚSQUEDA
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
