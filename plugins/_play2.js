
/**
 * 📂 plugins/_play2.js
 * 🎵 WHATSAPP-BOT — PLAY AUDIO Y VIDEO
 *
 * Comandos:
 * .play / .musica / .audio → Audio
 * .play2 / .video → Video
 * .play3 / .playdoc → Audio como documento
 * .play4 / .playdoc2 → Video como documento
 *
 * ✅ Sintaxis corregida
 * ✅ Búsqueda por nombre o enlace de YouTube
 * ✅ Varias API de respaldo
 * ✅ Validación de enlaces de descarga
 * ✅ Timeout para API
 * ✅ Evita descargas simultáneas del mismo usuario
 * ✅ Libera bloqueo ante errores
 * ✅ Manejo de errores sin detener el bot
 *
 * Baileys ES Modules
 */

import fetch from 'node-fetch'
import yts from 'yt-search'
import { savetube } from '../lib/yt-savetube.js'
import { ogmp3 } from '../lib/youtubedl.js'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const LIMIT_AUDIO = 725 * 1024 * 1024
const LIMIT_VIDEO = 425 * 1024 * 1024

const API_TIMEOUT = 20000
const SEND_TIMEOUT = 90000

const activeRequests = new Set()

const AUDIO_COMMANDS = [
  'play',
  'musica',
  'audio',
  'play3',
  'playdoc'
]

const VIDEO_COMMANDS = [
  'play2',
  'video',
  'play4',
  'playdoc2'
]

const DOCUMENT_COMMANDS = [
  'play3',
  'playdoc',
  'play4',
  'playdoc2'
]

const YOUTUBE_REGEX =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/))([a-zA-Z0-9_-]{11})/i

// ============================================================
// 🛠️ UTILIDADES
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function cleanName(value = '') {
  return String(value)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'WhatsApp-Bot'
}

function formatDuration(seconds) {
  seconds = Number(seconds) || 0

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return [
    ...(hours ? [hours] : []),
    minutes,
    secs
  ].map(n => String(n).padStart(2, '0')).join(':')
}

function getDuration(video) {
  return (
    video?.duration?.seconds ||
    video?.seconds ||
    0
  )
}

function isValidUrl(value) {
  if (typeof value !== 'string') return false

  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol)
  } catch {
    return false
  }
}

function normalizeUrl(value, base = '') {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  try {
    const url = base
      ? new URL(value, base)
      : new URL(value)

    return isValidUrl(url.href)
      ? url.href
      : null

  } catch {
    return null
  }
}

function getApiKey() {
  return process.env.API_KEY || ''
}

function getInfoApi() {
  return global.info?.apis || ''
}

// ============================================================
// 🌐 FETCH CON TIMEOUT
// ============================================================

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()

  const timeout = setTimeout(
    () => controller.abort(),
    API_TIMEOUT
  )

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        ...(options.headers || {})
      }
    })

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      )
    }

    return response

  } finally {
    clearTimeout(timeout)
  }
}

async function fetchJSON(url) {
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: 'application/json'
    }
  })

  return response.json()
}

// ============================================================
// 📦 EXTRAER ENLACES DE RESPUESTAS
// ============================================================

function getString(value) {
  return typeof value === 'string'
    ? value
    : null
}

function extractDownload(value) {
  if (!value) return null

  if (typeof value === 'string') {
    return normalizeUrl(value)
  }

  if (typeof value !== 'object') {
    return null
  }

  const candidates = [
    value.download,
    value.downloadUrl,
    value.download_url,
    value.download_url_full,
    value.stream_url_full,
    value.dl,
    value.dl_url,
    value.url,
    value.link,
    value.result?.download,
    value.result?.url,
    value.result?.dl_url,
    value.data?.download?.url,
    value.data?.download,
    value.data?.url,
    value.data?.audio?.url,
    value.data?.video?.url,
    value.data?.media?.dl_download
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const url = normalizeUrl(candidate)
      if (url) return url
    }
  }

  return null
}

// ============================================================
// 🔎 BUSCAR VIDEO
// ============================================================

async function searchVideo(query) {
  const match = query.match(YOUTUBE_REGEX)

  if (match) {
    const videoUrl =
      `https://www.youtube.com/watch?v=${match[1]}`

    const result = await yts(videoUrl)

    const video = result.videos?.find(
      item => item.videoId === match[1]
    ) || result.videos?.[0]

    if (video) {
      return {
        ...video,
        url: videoUrl
      }
    }

    return {
      title: `YouTube ${match[1]}`,
      url: videoUrl,
      thumbnail:
        `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`,
      seconds: 0
    }
  }

  const result = await yts.search({
    query,
    hl: 'es',
    gl: 'ES'
  })

  const video = result.videos?.[0]

  if (!video) {
    throw new Error(
      'No se encontraron resultados en YouTube.'
    )
  }

  return video
}

// ============================================================
// 🎵 API DE AUDIO
// ============================================================

function getAudioApis(video, quality) {
  const url = video.url
  const encoded = encodeURIComponent(url)
  const title = encodeURIComponent(video.title)
  const apikey = encodeURIComponent(getApiKey())

  const apis = [
    {
      name: 'SaveTube',
      run: async () => {
        const result = await savetube.download(
          url,
          'mp3'
        )

        return extractDownload(result)
      }
    },

    {
      name: 'OGMP3',
      run: async () => {
        const result = await ogmp3.download(
          url,
          quality,
          'audio'
        )

        return extractDownload(result)
      }
    },

    {
      name: 'Mitzuki Audio',
      run: async () => {
        const data = await fetchJSON(
          `https://api.mitzuki.xyz/download/youtube?url=${encoded}&type=audio&format=mp3&apikey=${apikey}`
        )

        return extractDownload(
          data?.data?.media?.dl_download ||
          data
        )
      }
    },

    {
      name: 'Mitzuki Audio 2',
      run: async () => {
        const data = await fetchJSON(
          `https://api.mitzuki.xyz/download/youtube2?url=${encoded}&apikey=${apikey}`
        )

        return extractDownload(
          data?.data?.audio?.url ||
          data
        )
      }
    },

    {
      name: 'DV Yer',
      run: async () => {
        const data = await fetchJSON(
          `https://dv-yer-api.online/ytmp3?mode=link&url=${encoded}`
        )

        const link =
          data?.download_url_full ||
          data?.stream_url_full ||
          data?.url

        return normalizeUrl(
          link,
          'https://dv-yer-api.online'
        )
      }
    },

    {
      name: 'Dorratz',
      run: async () => {
        const data = await fetchJSON(
          `https://api.dorratz.com/v3/ytdl?url=${encoded}`
        )

        const medias = Array.isArray(data?.medias)
          ? data.medias
          : []

        const mp3 =
          medias.find(
            media =>
              media.extension === 'mp3' &&
              media.quality === '160kbps'
          ) ||
          medias.find(
            media => media.extension === 'mp3'
          )

        return normalizeUrl(mp3?.url)
      }
    },

    {
      name: 'Zenkey',
      run: async () => {
        const data = await fetchJSON(
          `https://api.zenkey.my.id/api/download/ytmp3?apikey=zenkey&url=${encoded}`
        )

        return extractDownload(data)
      }
    },

    {
      name: 'Exonity',
      run: async () => {
        const data = await fetchJSON(
          `https://exonity.tech/api/dl/playmp3?query=${title}`
        )

        return extractDownload(data)
      }
    }
  ]

  const infoApi = getInfoApi()

  if (infoApi) {
    apis.push({
      name: 'Info API',
      run: async () => {
        const data = await fetchJSON(
          `${infoApi}/download/ytmp3?url=${encoded}`
        )

        return extractDownload(data)
      }
    })
  }

  return apis
}

// ============================================================
// 🎬 API DE VIDEO
// ============================================================

function getVideoApis(video, quality) {
  const url = video.url
  const encoded = encodeURIComponent(url)
  const title = encodeURIComponent(video.title)

  const apis = [
    {
      name: 'SaveTube Video',
      run: async () => {
        const result = await savetube.download(
          url,
          quality
        )

        return extractDownload(result)
      }
    },

    {
      name: 'OGMP3 Video',
      run: async () => {
        const result = await ogmp3.download(
          url,
          quality,
          'video'
        )

        return extractDownload(result)
      }
    },

    {
      name: 'Siputzx',
      run: async () => {
        const data = await fetchJSON(
          `https://api.siputzx.my.id/api/d/ytmp4?url=${encoded}`
        )

        return extractDownload(data)
      }
    },

    {
      name: 'Neoxr',
      run: async () => {
        const data = await fetchJSON(
          `https://api.neoxr.eu/api/youtube?url=${encoded}&type=video&quality=${quality}p&apikey=GataDios`
        )

        return extractDownload(data)
      }
    },

    {
      name: 'FGMods',
      run: async () => {
        const data = await fetchJSON(
          `https://api.fgmods.xyz/api/downloader/ytmp4?url=${encoded}&apikey=elrebelde21`
        )

        return extractDownload(data)
      }
    },

    {
      name: 'Exonity Video',
      run: async () => {
        const data = await fetchJSON(
          `https://exonity.tech/api/dl/playmp4?query=${title}`
        )

        return extractDownload(data)
      }
    }
  ]

  const infoApi = getInfoApi()

  if (infoApi) {
    apis.push({
      name: 'Info API Video',
      run: async () => {
        const data = await fetchJSON(
          `${infoApi}/download/ytmp4?url=${encoded}`
        )

        return extractDownload(data)
      }
    })
  }

  return apis
}

// ============================================================
// 📏 CONSULTAR TAMAÑO DEL ARCHIVO
// ============================================================

async function getFileSize(url) {
  try {
    const response = await fetchWithTimeout(
      url,
      { method: 'HEAD' }
    )

    const size = Number(
      response.headers.get('content-length')
    )

    return Number.isFinite(size) && size > 0
      ? size
      : null

  } catch {
    // Algunas API no admiten HEAD.
    return null
  }
}

// ============================================================
// 📤 ENVIAR AUDIO O VIDEO
// ============================================================

async function sendMedia(
  conn,
  m,
  video,
  mediaUrl,
  type,
  asDocument
) {
  const title = cleanName(video.title)
  const isAudio = type === 'audio'

  const limit = isAudio
    ? LIMIT_AUDIO
    : LIMIT_VIDEO

  const size = await getFileSize(mediaUrl)

  if (size !== null && size > limit) {
    throw new Error(
      'El archivo supera el límite configurado.'
    )
  }

  const extension = isAudio ? 'mp3' : 'mp4'

  const mimetype = isAudio
    ? 'audio/mpeg'
    : 'video/mp4'

  const fileName = `${title}.${extension}`

  const options = asDocument
    ? {
        document: { url: mediaUrl },
        mimetype,
        fileName
      }
    : isAudio
      ? {
          audio: { url: mediaUrl },
          mimetype,
          ptt: false
        }
      : {
          video: { url: mediaUrl },
          mimetype,
          caption:
            `🎬 *${video.title}*`
        }

  // Baileys puede descargar la URL y subirla
  // nuevamente a WhatsApp.
  return Promise.race([
    conn.sendMessage(
      m.chat,
      options,
      { quoted: m }
    ),

    new Promise((_, reject) => {
      // Este timeout controla la espera del envío,
      // no cancela internamente la operación de Baileys.
      setTimeout(
        () => reject(
          new Error('Tiempo de envío agotado')
        ),
        SEND_TIMEOUT
      )
    })
  ])
}

// ============================================================
// 🔄 INTENTAR VARIAS API
// ============================================================

async function tryDownload(
  conn,
  m,
  video,
  type,
  quality,
  asDocument
) {
  const apis = type === 'audio'
    ? getAudioApis(video, quality)
    : getVideoApis(video, quality)

  const errors = []

  for (const api of apis) {
    try {
      console.log(
        `[PLAY] Probando ${api.name}`
      )

      const mediaUrl = await api.run()

      if (!mediaUrl || !isValidUrl(mediaUrl)) {
        throw new Error(
          'No devolvió un enlace válido'
        )
      }

      console.log(
        `[PLAY] Enlace obtenido con ${api.name}`
      )

      await sendMedia(
        conn,
        m,
        video,
        mediaUrl,
        type,
        asDocument
      )

      console.log(
        `[PLAY] Envío completado con ${api.name}`
      )

      return true

    } catch (error) {
      const message =
        error?.message || String(error)

      errors.push(`${api.name}: ${message}`)

      console.error(
        `[PLAY] ${api.name}:`,
        message
      )

      // No seguir con otra API si un envío
      // pudo quedar pendiente y duplicarse.
      if (message === 'Tiempo de envío agotado') {
        throw new Error(
          'El envío tardó demasiado. Revisá el chat antes de volver a pedirlo.'
        )
      }

      await sleep(300)
    }
  }

  console.error(
    '[PLAY] Todas las API fallaron:\n' +
    errors.join('\n')
  )

  return false
}

// ============================================================
// 🎵 COMANDO PRINCIPAL
// ============================================================

const handler = async (
  m,
  {
    conn,
    command,
    args = [],
    text = '',
    usedPrefix = '.',
    isAdmin,
    isOwner,
    isROwner
  }
) => {
  const cmd = String(command).toLowerCase()

  const query = String(
    text || args.join(' ')
  ).trim()

  if (!query) {
    return m.reply(
      `🎵 *WHATSAPP-BOT — PLAY*\n\n` +
      `Escribí el nombre de una canción o un enlace de YouTube.\n\n` +
      `🎧 ${usedPrefix}play emilia 420\n` +
      `🎬 ${usedPrefix}play2 emilia 420\n` +
      `📁 ${usedPrefix}play3 emilia 420\n` +
      `📹 ${usedPrefix}play4 emilia 420`
    )
  }

  // Evitar solicitudes simultáneas del mismo usuario.
  if (activeRequests.has(m.sender)) {
    return m.reply(
      '⏳ Ya tenés una descarga en proceso. Esperá a que termine.'
    )
  }

  activeRequests.add(m.sender)

  try {
    const isAudio = AUDIO_COMMANDS.includes(cmd)
    const isVideo = VIDEO_COMMANDS.includes(cmd)

    if (!isAudio && !isVideo) {
      return m.reply(
        '❌ Comando de descarga no reconocido.'
      )
    }

    const asDocument =
      DOCUMENT_COMMANDS.includes(cmd)

    const type = isAudio ? 'audio' : 'video'

    const quality = isAudio ? '128' : '720'

    // ========================================================
    // 🔍 BUSCAR
    // ========================================================

    try {
      await m.react('🔎')
    } catch {}

    const video = await searchVideo(query)

    if (!video?.url) {
      throw new Error(
        'No se encontró un video válido.'
      )
    }

    // ========================================================
    // 📋 INFORMACIÓN
    // ========================================================

    const duration = formatDuration(
      getDuration(video)
    )

    const typeText = asDocument
      ? `${type} como documento`
      : type

    const infoText =
      `🎵 *WHATSAPP-BOT — PLAY*\n\n` +
      `📌 *Título:* ${video.title}\n` +
      `⏰ *Duración:* ${duration}\n` +
      `📁 *Formato:* ${typeText}\n\n` +
      `⏳ Buscando una descarga disponible...`

    const message = {
      text: infoText
    }

    if (video.thumbnail) {
      message.contextInfo = {
        externalAdReply: {
          title: video.title,
          body: 'WHATSAPP-BOT',
          thumbnailUrl: video.thumbnail,
          sourceUrl: video.url,
          mediaType: 1,
          showAdAttribution: false
        }
      }
    }

    try {
      await conn.sendMessage(
        m.chat,
        message,
        { quoted: m }
      )
    } catch {
      await m.reply(infoText)
    }

    // ========================================================
    // 📥 DESCARGAR Y ENVIAR
    // ========================================================

    try {
      await m.react('⏳')
    } catch {}

    const success = await tryDownload(
      conn,
      m,
      video,
      type,
      quality,
      asDocument
    )

    if (!success) {
      try {
        await m.react('❌')
      } catch {}

      return m.reply(
        '❌ No pude descargar este archivo. Las API disponibles fallaron o no devolvieron un enlace utilizable.'
      )
    }

    try {
      await m.react('✅')
    } catch {}

  } catch (error) {
    console.error(
      '[PLAY] Error general:',
      error
    )

    try {
      await m.react('❌')
    } catch {}

    return m.reply(
      `❌ *Error en PLAY*\n\n${error?.message || 'No se pudo procesar la solicitud.'}`
    )

  } finally {
    // Siempre liberar la solicitud.
    activeRequests.delete(m.sender)
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  'play <canción>',
  'musica <canción>',
  'audio <canción>',
  'play2 <video>',
  'video <video>',
  'play3 <canción>',
  'playdoc <canción>',
  'play4 <video>',
  'playdoc2 <video>'
]

handler.tags = ['downloader']

handler.command = /^(play|musica|audio|play2|video|play3|playdoc|play4|playdoc2)$/i

handler.register = true

export default handler
