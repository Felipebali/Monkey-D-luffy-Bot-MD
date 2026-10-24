
/**
 * 📂 plugins/play2.js
 * 🎬 WHATSAPP-BOT — YOUTUBE VIDEO DOWNLOADER
 *
 * Comandos:
 * .play2
 * .ytmp4
 * .video
 * .playv
 */

import yts from 'yt-search'
import { LRUCache } from 'lru-cache'
import axios from 'axios'

const cache = new LRUCache({
  max: 100,
  ttl: 3600000
})

const downloadCache = new LRUCache({
  max: 50,
  ttl: 120000
})

const MAX_DURATION_SECONDS = 7 * 60
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024

const cleanText = text => {
  if (text === null || text === undefined) return ''
  if (typeof text === 'string') return text.trim()
  if (typeof text === 'number') return String(text)

  if (typeof text === 'object') {
    try {
      return JSON.stringify(text).trim()
    } catch {
      return ''
    }
  }

  return String(text).trim()
}

const formatViews = views =>
  views >= 1e9 ? (views / 1e9).toFixed(1) + 'B' :
  views >= 1e6 ? (views / 1e6).toFixed(1) + 'M' :
  views >= 1e3 ? (views / 1e3).toFixed(1) + 'K' :
  String(views)

const emitProgress = (msgId, step, extraData = {}) => {
  if (!msgId) return

  queueMicrotask(() => {
    global.broadcast?.('cmd_progress', {
      id: msgId,
      step,
      ...extraData
    })
  })
}

const getBuffer = async (url, timeoutMs = 60000) => {
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: timeoutMs,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      }
    })

    return Buffer.from(res.data)
  } catch (error) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, {
        signal: controller.signal
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      return Buffer.from(await res.arrayBuffer())
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

const extractVideoUrl = data => {
  const candidate =
    data?.data?.download ||
    data?.data?.dl_url ||
    data?.url ||
    data?.dl ||
    data?.datos?.url ||
    data?.result?.download ||
    data?.result?.url ||
    (typeof data?.download === 'object'
      ? data?.download?.url
      : data?.download)

  if (
    !candidate ||
    typeof candidate !== 'string' ||
    !candidate.startsWith('http')
  ) {
    throw new Error('La API no devolvió una URL de video válida.')
  }

  return candidate
}

const getVideoDownloadUrl = async (link, msgId) => {
  const cacheKey = link.toLowerCase()
  const cached = downloadCache.get(cacheKey)

  if (cached) return cached

  const api =
    `https://api.ryuzei.xyz/download/ytvideo?url=${encodeURIComponent(link)}`

  emitProgress(msgId, 'requesting_api', {
    apiIndex: 1,
    totalApis: 1
  })

  const res = await axios.get(api, {
    timeout: 20000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      Accept: 'application/json'
    }
  })

  const downloadUrl = extractVideoUrl(res.data)

  downloadCache.set(cacheKey, downloadUrl)

  return downloadUrl
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const prefix = usedPrefix || '.'
  const msgId = m.key?.id || m.id

  try {
    const query = cleanText(text)

    if (!query) {
      return conn.sendMessage(
        m.chat,
        {
          text:
            `ꕤ Ingresa el título o enlace del video a buscar ✰\n\n` +
            `> ꕤ *Ejemplo:* ${prefix}${command} Kamikaze - Víctor Mendivil`
        },
        { quoted: m }
      )
    }

    emitProgress(msgId, 'search_started', { query })

    let searchQuery = query

    const urlMatch = query.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/
    )

    if (urlMatch) {
      searchQuery = `https://youtu.be/${urlMatch[1]}`
    }

    const cacheKey = searchQuery.toLowerCase()
    let video = cache.get(cacheKey)

    if (!video) {
      const searchResult = await yts(searchQuery)

      if (!searchResult?.videos?.length) {
        emitProgress(msgId, 'no_results', { query })

        return conn.sendMessage(
          m.chat,
          {
            text:
              `ׄ ✿ No se encontraron resultados para *${query}*.\n` +
              'Intenta con otro nombre o enlace.'
          },
          { quoted: m }
        )
      }

      // Si se pasó un enlace, priorizar el video correspondiente.
      video = urlMatch
        ? searchResult.videos.find(v => v.videoId === urlMatch[1]) ||
          searchResult.videos[0]
        : searchResult.videos[0]

      const videoId = video.videoId || (urlMatch ? urlMatch[1] : '')

      video = {
        ...video,
        link: video.url || `https://youtu.be/${videoId}`,
        thumb:
          video.thumbnail ||
          video.image ||
          `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
      }

      cache.set(cacheKey, video)

      if (videoId) {
        cache.set(videoId, video)
        cache.set(video.link.toLowerCase(), video)
      }
    }

    if (
      typeof video.seconds === 'number' &&
      video.seconds > MAX_DURATION_SECONDS
    ) {
      return conn.sendMessage(
        m.chat,
        {
          text:
            `ׄ ✿ El video dura *${video.timestamp || video.duration}*, ` +
            'superando el límite máximo permitido de *7 minutos*.'
        },
        { quoted: m }
      )
    }

    const videoUrl = cleanText(video.link || video.url)
    const title = cleanText(video.title) || 'Sin título'
    const thumb = cleanText(video.thumb || video.thumbnail || video.image)
    const channel = cleanText(video.author?.name || video.author) || 'Desconocido'
    const views = typeof video.views === 'number' ? video.views : 0
    const duration = cleanText(video.timestamp || video.duration || '')

    emitProgress(msgId, 'media_found', {
      title,
      duration,
      channel,
      videoUrl
    })

    const caption =
      `﹒𝜗ৎ ࣪ *${title}*\n\n` +
      `ׅ ׄ ✿ *Canal* » ${channel}\n` +
      `ׅ ׄ ✿ *Vistas* » ${formatViews(views)}\n` +
      `ׅ ׄ ✿ *Tiempo* » ${duration}\n` +
      `ׅ ׄ ✿ *Link* » ${videoUrl}\n\n` +
      'ׅ ׄ ✿ *¡Enviando video, por favor espera!*'

    emitProgress(msgId, 'fetching_thumbnail')

    // Iniciar la obtención del enlace mientras se procesa la miniatura.
    const downloadUrlPromise = getVideoDownloadUrl(videoUrl, msgId)

    let thumbBuffer = null

    if (thumb) {
      try {
        thumbBuffer = await getBuffer(thumb, 10000)
      } catch {}
    }

    if (thumbBuffer) {
      await conn.sendMessage(
        m.chat,
        {
          image: thumbBuffer,
          caption
        },
        { quoted: m }
      )
    } else {
      await conn.sendMessage(
        m.chat,
        { text: caption },
        { quoted: m }
      )
    }

    emitProgress(msgId, 'thumbnail_sent')

    const downloadUrl = await downloadUrlPromise

    emitProgress(msgId, 'downloading_video_stream')

    const videoBuffer = await getBuffer(downloadUrl)

    if (videoBuffer.length > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (videoBuffer.length / (1024 * 1024)).toFixed(1)

      return conn.sendMessage(
        m.chat,
        {
          text:
            `ׄ ✿ El video pesa *${sizeMb} MB*, ` +
            'superando el límite máximo permitido de *30 MB*.'
        },
        { quoted: m }
      )
    }

    emitProgress(msgId, 'sending_video_to_whatsapp')

    const result = await conn.sendMessage(
      m.chat,
      {
        video: videoBuffer,
        mimetype: 'video/mp4',
        caption: `> ✦ *${title}*`,
        fileName: `${title.replace(/[\\/:*?"<>|]/g, '_')}.mp4`
      },
      { quoted: m }
    )

    emitProgress(msgId, 'completed', { title })

    return result
  } catch (error) {
    console.error('[PLAY2] Error:', error)

    emitProgress(msgId, 'error', {
      error: error.message || String(error)
    })

    return conn.sendMessage(
      m.chat,
      {
        text:
          `《✧》 Ocurrió un error:\n\n` +
          `❒ *${error.message || error}*\n\n` +
          '> *Error al procesar la solicitud*'
      },
      { quoted: m }
    )
  }
}

handler.help = ['play2 <título o enlace>', 'ytmp4 <título o enlace>', 'video <título o enlace>', 'playv <título o enlace>']
handler.tags = ['downloader']
handler.command = ['play2', 'ytmp4', 'video', 'playv']

export default handler
