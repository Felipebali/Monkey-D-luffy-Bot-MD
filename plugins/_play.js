
/**
 * 📂 plugins/play.js
 * 🎵 WHATSAPP-BOT — YOUTUBE → AUDIO
 *
 * Comandos:
 * .play
 * .playaudio
 * .audio
 */

import yts from 'yt-search'
import axios from 'axios'

const MAX_DURATION_SECONDS = 7 * 60

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const API_TIMEOUT = 15000

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'

// ============================================================
// 🧹 LIMPIAR TEXTO
// ============================================================

function cleanText(text) {
  if (!text) return ''

  if (typeof text === 'string') return text.trim()
  if (typeof text === 'number') return String(text)

  return String(text).trim()
}

// ============================================================
// 👁️ FORMATEAR VISTAS
// ============================================================

function formatViews(views) {
  const v = Number(views) || 0

  return v >= 1e9
    ? (v / 1e9).toFixed(1) + 'B'
    : v >= 1e6
      ? (v / 1e6).toFixed(1) + 'M'
      : v >= 1e3
        ? (v / 1e3).toFixed(1) + 'K'
        : String(v)
}

// ============================================================
// 📊 PROGRESO
// ============================================================

function emitProgress(msgId, step, extraData = {}) {
  if (!msgId) return

  queueMicrotask(() => {
    try {
      global.broadcast?.('cmd_progress', {
        id: msgId,
        step,
        ...extraData
      })
    } catch (error) {
      console.error('[PLAY] Error en progreso:', error)
    }
  })
}

// ============================================================
// 🔗 EXTRAER URL DE DESCARGA
// ============================================================

function extractDownloadUrl(data) {
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
    data?.download?.url,
    data?.download?.link,
    data?.url,
    data?.link
  ]

  for (const candidate of candidates) {
    const url = typeof candidate === 'string'
      ? candidate
      : candidate?.url || candidate?.link

    if (
      typeof url === 'string' &&
      /^https?:\/\//i.test(url)
    ) {
      return url
    }
  }

  return ''
}

// ============================================================
// 🌐 CONSULTAR API
// ============================================================

async function fetchApiUrl(apiUrl) {
  const response = await axios.get(apiUrl, {
    timeout: API_TIMEOUT,
    headers: {
      'User-Agent': USER_AGENT
    }
  })

  const downloadUrl = extractDownloadUrl(response.data)

  if (!downloadUrl) {
    throw new Error('La API no devolvió una URL de descarga.')
  }

  return downloadUrl
}

// ============================================================
// 🔄 OBTENER AUDIO CON REINTENTOS
// ============================================================

async function getAudioUrlWithRetry(videoUrl) {
  const encoded = encodeURIComponent(videoUrl)

  const apis = [
    `https://api.ryuzei.xyz/download/ytmp3/v4?url=${encoded}`,
    `https://api.ryuzei.xyz/download/ytmp3/v2?url=${encoded}`,
    `https://api.ryuzei.xyz/download/ytmp3/v3?url=${encoded}`
  ]

  let lastError

  for (let i = 0; i < apis.length; i++) {
    try {
      console.log(`[PLAY] Probando API ${i + 1}/3...`)

      const url = await fetchApiUrl(apis[i])

      console.log(`[PLAY] API ${i + 1} respondió correctamente.`)

      return url
    } catch (error) {
      lastError = error

      console.error(
        `[PLAY] API ${i + 1} falló:`,
        error.message
      )
    }
  }

  throw lastError || new Error('Todas las APIs fallaron.')
}

// ============================================================
// 🔎 VALIDAR ENLACE DE YOUTUBE
// ============================================================

function extractYoutubeId(text) {
  const match = text.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/
  )

  return match ? match[1] : null
}

// ============================================================
// 🎵 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    const query = cleanText(text)

    if (!query) {
      return m.reply(
        `ꕤ *Ingresá el título o enlace de YouTube que querés escuchar.*\n\n` +
        `Ejemplo: ${usedPrefix || '.'}play Morat No se va`
      )
    }

    const msgId = m.key?.id

    emitProgress(msgId, 'search_started', {
      query
    })

    // ========================================================
    // 🔎 BUSCAR VIDEO
    // ========================================================

    console.log('[PLAY] Buscando:', query)

    const youtubeId = extractYoutubeId(query)

    const searchQuery = youtubeId
      ? `https://youtu.be/${youtubeId}`
      : query

    const searchResult = await yts(searchQuery)

    if (!searchResult?.videos?.length) {
      emitProgress(msgId, 'no_results', { query })

      return m.reply(
        `✿ No se encontraron resultados para: *${query}*`
      )
    }

    const video = searchResult.videos[0]

    const videoId = video.videoId || youtubeId

    if (!videoId) {
      return m.reply('❌ No se pudo identificar el video.')
    }

    const videoUrl = `https://youtu.be/${videoId}`

    const title = cleanText(video.title) || 'Sin título'

    const channel = cleanText(
      video.author?.name || video.author
    ) || 'Desconocido'

    const views = Number(video.views) || 0

    const duration = cleanText(
      video.timestamp || video.duration?.timestamp ||
      video.duration
    )

    const seconds = Number(video.seconds) || 0

    // ========================================================
    // ⏱️ LÍMITE DE DURACIÓN
    // ========================================================

    if (seconds > MAX_DURATION_SECONDS) {
      emitProgress(msgId, 'duration_exceeded', {
        duration
      })

      return m.reply(
        `✿ El audio dura *${duration || 'más de 7 minutos'}*.\n\n` +
        `⏱️ El límite permitido es de *7 minutos*.`
      )
    }

    // ========================================================
    // 🖼️ INFORMACIÓN DEL VIDEO
    // ========================================================

    const thumbnail =
      `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`

    const caption =
      `﹒𝜗ৎ      ࣪  *${title}*\n\n` +
      `ׅ  ׄ  ✿ *Canal* » ${channel}\n` +
      `ׅ  ׄ  ✿ *Vistas* » ${formatViews(views)}\n` +
      `ׅ  ׄ  ✿ *Tiempo* » ${duration || 'Desconocido'}\n` +
      `ׅ  ׄ  ✿ *Link* » ${videoUrl}\n\n` +
      `ׅ  ׄ  ✿ *Descargando audio...*`

    // ========================================================
    // 📸 ENVIAR MINIATURA
    // ========================================================

    try {
      await conn.sendMessage(
        m.chat,
        {
          image: { url: thumbnail },
          caption
        },
        { quoted: m }
      )
    } catch (error) {
      console.error(
        '[PLAY] Error enviando miniatura:',
        error.message
      )

      await m.reply(caption)
    }

    // ========================================================
    // 🎧 DESCARGAR AUDIO
    // ========================================================

    emitProgress(msgId, 'fetching_audio_stream')

    console.log('[PLAY] Obteniendo enlace de audio...')

    const downloadUrl = await getAudioUrlWithRetry(videoUrl)

    // ========================================================
    // 📤 ENVIAR AUDIO
    // ========================================================

    emitProgress(msgId, 'sending_audio_to_whatsapp')

    console.log('[PLAY] Enviando audio...')

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: downloadUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title.replace(/[\\/:*?"<>|]/g, '_')}.mp3`,
        ptt: false
      },
      { quoted: m }
    )

    emitProgress(msgId, 'completed')

    console.log('[PLAY] Audio enviado correctamente.')

  } catch (error) {
    console.error(
      '[PLAY] Error general:',
      error?.response?.data || error.message || error
    )

    emitProgress(m.key?.id, 'error', {
      message: error.message
    })

    await m.reply(
      '❌ No se pudo descargar o enviar el audio.\n\n' +
      'Intentá nuevamente dentro de unos minutos.'
    ).catch(() => {})
  }
}

// ============================================================
// 📌 CONFIGURACIÓN DEL COMANDO
// ============================================================

handler.help = ['play <canción>', 'playaudio <canción>', 'audio <canción>']
handler.tags = ['download']
handler.command = ['play', 'playaudio', 'audio']

export default handler
