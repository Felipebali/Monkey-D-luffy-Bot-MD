// 📂 plugins/play.js
// 🎵 FelixCat_Bot — YouTube Audio

import yts from 'yt-search'
import axios from 'axios'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const MAX_DURATION_SECONDS = 7 * 60

// ============================================================
// 🧹 LIMPIAR TEXTO
// ============================================================

const cleanText = text => {

  if (!text)
    return ''

  if (typeof text === 'string')
    return text.trim()

  if (typeof text === 'number')
    return String(text)

  return String(text).trim()
}

// ============================================================
// 👁️ FORMATEAR VISTAS
// ============================================================

const formatViews = v => {

  if (!v)
    return '0'

  return v >= 1e9
    ? (v / 1e9).toFixed(1) + 'B'
    : v >= 1e6
      ? (v / 1e6).toFixed(1) + 'M'
      : v >= 1e3
        ? (v / 1e3).toFixed(1) + 'K'
        : String(v)
}

// ============================================================
// 📡 PROGRESO
// ============================================================

const emitProgress = (
  msgId,
  step,
  extraData = {}
) => {

  try {

    queueMicrotask(() => {

      try {

        global.broadcast?.(
          'cmd_progress',
          {
            id: msgId,
            step,
            ...extraData
          }
        )

      } catch {}
    })

  } catch {}
}

// ============================================================
// 🔎 EXTRAER URL DE DESCARGA
// ============================================================

const extractDownloadUrl = data => {

  const candidate =
    data?.data?.download ||
    data?.download ||
    data?.dl ||
    data?.data?.dl_url ||
    data?.data?.download?.url ||
    data?.datos?.url ||
    data?.result?.download ||
    data?.result?.dl ||
    data?.result?.url ||
    data?.result?.link ||
    data?.data?.dl ||
    data?.data?.url ||
    data?.data?.link ||
    (
      typeof data?.download === 'object'
        ? (
            data?.download?.url ||
            data?.download?.link
          )
        : null
    ) ||
    data?.url ||
    data?.link

  return (
    typeof candidate === 'string' &&
    candidate.startsWith('http')
  )
    ? candidate
    : ''
}

// ============================================================
// 🌐 CONSULTAR API
// ============================================================

const fetchApiUrl = async apiUrl => {

  const res =
    await axios.get(
      apiUrl,
      {
        timeout: 15000,

        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      }
    )

  const dlUrl =
    extractDownloadUrl(res.data)

  if (!dlUrl)
    throw new Error(
      'La API no devolvió una URL de descarga.'
    )

  return dlUrl
}

// ============================================================
// 🔄 OBTENER AUDIO CON VARIAS APIs
// ============================================================

const getAudioUrlWithRetry = async videoUrl => {

  const encoded =
    encodeURIComponent(videoUrl)

  const apis = [

    `https://api.delirius.online/download/ytmp3?url=${encoded}`,

    `https://api.starlights.uk/api/download/ytmp3?url=${encoded}`,

    `https://api.starlights.uk/api/download/ytmp3v2?url=${encoded}`

  ]

  let lastError = null

  for (const api of apis) {

    try {

      const url =
        await fetchApiUrl(api)

      if (url)
        return url

    } catch (error) {

      lastError = error
    }
  }

  throw (
    lastError ||
    new Error(
      'No se pudo obtener el audio.'
    )
  )
}

// ============================================================
// 🤖 HANDLER
// ============================================================

const handler = async (
  m,
  {
    conn,
    text,
    command
  }
) => {

  try {

    // ========================================================
    // 📝 CONSULTA
    // ========================================================

    const query =
      cleanText(text)

    if (!query) {

      return conn.reply(
        m.chat,
        'ꕤ *Ingresa el título o enlace de YouTube que quieres buscar.* ✰',
        m
      )
    }

    // ========================================================
    // 📡 ID DEL MENSAJE
    // ========================================================

    const msgId =
      m.key?.id ||
      m.id ||
      `${Date.now()}`

    emitProgress(
      msgId,
      'search_started',
      {
        query
      }
    )

    // ========================================================
    // 🔗 DETECTAR URL DE YOUTUBE
    // ========================================================

    const urlMatch =
      query.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/
      )

    const searchQuery =
      urlMatch
        ? `https://youtu.be/${urlMatch[1]}`
        : query

    // ========================================================
    // 🔎 BUSCAR EN YOUTUBE
    // ========================================================

    const searchResult =
      await yts(searchQuery)

    if (
      !searchResult?.videos?.length
    ) {

      emitProgress(
        msgId,
        'no_results',
        {
          query
        }
      )

      return conn.reply(
        m.chat,
        `✿ No se encontraron resultados para *${query}*.`,
        m
      )
    }

    // ========================================================
    // 🎵 PRIMER RESULTADO
    // ========================================================

    const video =
      searchResult.videos[0]

    const videoId =
      video.videoId ||
      (
        urlMatch
          ? urlMatch[1]
          : ''
      )

    if (!videoId) {

      return conn.reply(
        m.chat,
        '❌ No pude obtener el ID del video.',
        m
      )
    }

    const videoUrl =
      `https://youtu.be/${videoId}`

    // ========================================================
    // 📋 INFORMACIÓN
    // ========================================================

    const title =
      cleanText(
        video.title
      ) ||
      'Sin título'

    const channel =
      cleanText(
        video.author?.name ||
        video.author
      ) ||
      'Desconocido'

    const views =
      typeof video.views === 'number'
        ? video.views
        : 0

    const duration =
      cleanText(
        video.timestamp ||
        video.duration
      ) ||
      ''

    // ========================================================
    // ⏱️ COMPROBAR DURACIÓN
    // ========================================================

    if (
      video.seconds &&
      video.seconds >
      MAX_DURATION_SECONDS
    ) {

      return conn.reply(
        m.chat,

        `✿ El audio dura *${duration}*, superando el límite permitido de *7 minutos*.`,
        
        m
      )
    }

    // ========================================================
    // 🖼️ MINIATURA
    // ========================================================

    const thumbnail =
      `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`

    // ========================================================
    // 💬 INFORMACIÓN DEL VIDEO
    // ========================================================

    const caption =
`﹒𝜗ৎ ࣪ *${title}*

ׅ  ׄ  ✿ *Canal* » ${channel}
ׅ  ׄ  ✿ *Vistas* » ${formatViews(views)}
ׅ  ׄ  ✿ *Tiempo* » ${duration}
ׅ  ׄ  ✿ *Link* » ${videoUrl}

ׅ  ׄ  ✿ *Descargando audio...*`

    // ========================================================
    // 🖼️ ENVIAR MINIATURA
    // ========================================================

    try {

      await conn.sendMessage(
        m.chat,
        {
          image: {
            url: thumbnail
          },
          caption
        },
        {
          quoted: m
        }
      )

    } catch (error) {

      console.error(
        '⚠️ Error enviando miniatura:',
        error
      )
    }

    // ========================================================
    // 📡 BUSCANDO AUDIO
    // ========================================================

    emitProgress(
      msgId,
      'fetching_audio_stream'
    )

    // ========================================================
    // 🎵 OBTENER URL DEL AUDIO
    // ========================================================

    const downloadUrl =
      await getAudioUrlWithRetry(
        videoUrl
      )

    if (!downloadUrl) {

      throw new Error(
        'No se obtuvo la URL del audio.'
      )
    }

    // ========================================================
    // 📤 ENVIANDO AUDIO
    // ========================================================

    emitProgress(
      msgId,
      'sending_audio_to_whatsapp'
    )

    const safeFileName =
      title
        .replace(/[\\/:*?"<>|]/g, '')
        .substring(0, 100) ||
      'audio'

    // ========================================================
    // 🎧 ENVIAR AUDIO
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        audio: {
          url: downloadUrl
        },

        mimetype:
          'audio/mpeg',

        fileName:
          `${safeFileName}.mp3`,

        ptt:
          false
      },
      {
        quoted: m
      }
    )

  } catch (error) {

    console.error(
      '❌ Error en play.js:',
      error
    )

    return conn.reply(
      m.chat,

      `❌ No pude descargar el audio.

Posible causa: el servicio de descarga está temporalmente caído o no pudo procesar el video.`,

      m
    )
  }
}

// ============================================================
// 📌 CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.help = [
  'play <texto>',
  'playaudio <texto>',
  'audio <texto>'
]

handler.tags = [
  'download'
]

handler.command = [
  'play',
  'playaudio',
  'audio'
]

handler.group = true

export default handler
