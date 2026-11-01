
import yts from 'yt-search'
import axios from 'axios'

const MAX_DURATION_SECONDS = 7 * 60

const cleanText = (value) => {
  if (!value) return ''
  return String(value).trim()
}

const formatViews = (views = 0) => {
  if (views >= 1e9) return (views / 1e9).toFixed(1) + 'B'
  if (views >= 1e6) return (views / 1e6).toFixed(1) + 'M'
  if (views >= 1e3) return (views / 1e3).toFixed(1) + 'K'
  return String(views)
}

const extractDownloadUrl = (data) => {
  const candidates = [
    data?.data?.download,
    data?.download,
    data?.dl,
    data?.data?.dl_url,
    data?.data?.download?.url,
    data?.datos?.url,
    data?.result?.download,
    data?.result?.dl,
    data?.result?.url,
    data?.result?.link,
    data?.data?.dl,
    data?.data?.url,
    data?.data?.link,
    data?.url,
    data?.link
  ]

  for (const item of candidates) {
    const url = typeof item === 'string'
      ? item
      : item?.url || item?.link

    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      return url
    }
  }

  return ''
}

const getAudioUrl = async (videoUrl) => {
  const encoded = encodeURIComponent(videoUrl)

  const apis = [
    `https://api.ryuzei.xyz/download/ytmp3/v4?url=${encoded}`,
    `https://api.ryuzei.xyz/download/ytmp3/v2?url=${encoded}`,
    `https://api.ryuzei.xyz/download/ytmp3/v3?url=${encoded}`
  ]

  let lastError

  for (const api of apis) {
    try {
      const response = await axios.get(api, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      })

      const downloadUrl = extractDownloadUrl(response.data)

      if (downloadUrl) return downloadUrl

      throw new Error('La API no devolvió un enlace de audio.')
    } catch (error) {
      lastError = error
      console.error('[PLAY] API fallida:', error.message)
    }
  }

  throw lastError || new Error('No se pudo obtener el audio.')
}

let handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) {
    return m.reply(
      `🎵 *WHATSAPP-BOT MUSIC*

Escribí el nombre de una canción.

Ejemplo:
${usedPrefix + command} Juan Gabriel - Amor Eterno`
    )
  }

  let status

  try {
    status = await conn.sendMessage(m.chat, {
      text: '🔎 Buscando canción...'
    }, { quoted: m })

    console.log('[PLAY] Buscando:', text)

    const urlMatch = text.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/
    )

    const searchQuery = urlMatch
      ? `https://youtu.be/${urlMatch[1]}`
      : text

    const resultado = await yts.search(searchQuery)
    const vid = urlMatch
      ? resultado?.videos?.find(v => v.videoId === urlMatch[1]) || resultado?.videos?.[0]
      : resultado?.videos?.[0]

    if (!vid) {
      throw new Error('No se encontraron resultados.')
    }

    const videoId = vid.videoId
    const videoUrl = `https://youtu.be/${videoId}`
    const title = cleanText(vid.title) || 'Sin título'
    const author = cleanText(vid.author?.name) || 'Desconocido'
    const duration = vid.seconds || 0
    const timestamp = vid.timestamp || 'Desconocida'
    const views = formatViews(vid.views || 0)

    console.log('[PLAY] Encontrado:', title)

    // PLAY2: Mostrar video
    if (command === 'play2') {
      return conn.sendMessage(m.chat, {
        text: `🎬 *VIDEO ENCONTRADO*

📌 ${title}
👤 ${author}
⌚ ${timestamp}
👀 ${views}

🔗 ${videoUrl}`
      }, { quoted: m })
    }

    // PLAY3: Información
    if (command === 'play3') {
      return conn.sendMessage(m.chat, {
        image: { url: vid.thumbnail },
        caption: `🎵 *INFORMACIÓN*

📌 ${title}
👤 ${author}
⌚ ${timestamp}
👀 ${views}

🔗 ${videoUrl}`
      }, { quoted: m })
    }

    // PLAY: Descargar audio
    if (duration > MAX_DURATION_SECONDS) {
      throw new Error('La canción supera el límite de 7 minutos.')
    }

    await conn.sendMessage(m.chat, {
      text: `🎧 *${title}*

👤 ${author}
⌚ ${timestamp}

⏳ Preparando audio...`
    }, { quoted: m })

    const downloadUrl = await getAudioUrl(videoUrl)

    console.log('[PLAY] Enlace de audio obtenido')

    // Descargar y comprobar tamaño antes de enviar
    const audioResponse = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxContentLength: 15 * 1024 * 1024,
      maxBodyLength: 15 * 1024 * 1024
    })

    const audioBuffer = Buffer.from(audioResponse.data)

    if (!audioBuffer.length) {
      throw new Error('El archivo de audio está vacío.')
    }

    const contentType = audioResponse.headers['content-type'] || ''

    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      throw new Error('La fuente devolvió una respuesta inválida.')
    }

    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${title.replace(/[\\/:*?"<>|]/g, '')}.mp3`,
      ptt: false
    }, { quoted: m })

    console.log('[PLAY] Audio enviado:', title)

    // Actualizar el mensaje inicial
    if (status?.key) {
      await conn.sendMessage(m.chat, {
        text: `✅ Audio enviado correctamente.\n🎵 ${title}`
      }, {
        quoted: m,
        edit: status.key
      }).catch(() => {})
    }

  } catch (error) {
    console.error('[PLAY] ERROR:', error)

    const errorMessage = `❌ *ERROR AL PROCESAR PLAY*

${error.message || 'Error desconocido.'}`

    if (status?.key) {
      await conn.sendMessage(m.chat, {
        text: errorMessage
      }, {
        quoted: m,
        edit: status.key
      }).catch(() => m.reply(errorMessage))
    } else {
      await m.reply(errorMessage)
    }
  }
}

handler.help = ['play', 'play2', 'play3']
handler.tags = ['downloader']
handler.command = /^(play|play2|play3)$/i

export default handler
