
/**
 * 📂 plugins/_play.js
 * 🤖 WHATSAPP-BOT — PLAY AUDIO
 *
 * 🌐 API Lempi
 * 🎵 Búsqueda por nombre o enlace
 * 🎧 Descarga de audio MP3
 * 🖼️ Miniatura e información
 * ⏳ Cooldown de 5 minutos
 * 👑 Admins y owners sin cooldown
 * ⏱️ Duración máxima de 7 minutos
 * 👥 Exclusivo para grupos
 */

import yts from 'yt-search'
import fetch from 'node-fetch'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const API_URL = 'https://api.lempi.lat/dl/yta'
const API_KEY = process.env.LEMPI_API_KEY || 'montekey28'

const COOLDOWN = 5 * 60 * 1000
const MAX_DURATION = 7 * 60
const MAX_BYTES = 25 * 1024 * 1024

const cooldowns = new Map()
const processing = new Set()

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, {
  conn,
  args = [],
  text,
  usedPrefix,
  command,
  isAdmin,
  isOwner,
  isROwner
}) => {

  if (!m.isGroup) return

  const input = String(
    text || args.join(' ')
  ).trim()

  if (!input) {
    return m.reply(
      '《✧》Por favor, mencioná el nombre o URL del video que deseás descargar.\n\n' +
      `*Ejemplo:* ${usedPrefix || '.'}${command || 'play'} emilia 420`
    )
  }

  const sender = m.sender

  const privileged = Boolean(
    isAdmin ||
    isOwner ||
    isROwner ||
    m.fromMe ||
    m.key?.fromMe
  )

  // ==========================================================
  // ⏳ COOLDOWN
  // ==========================================================

  const remaining =
    (cooldowns.get(sender) || 0) - Date.now()

  if (!privileged && remaining > 0) {
    const seconds = Math.ceil(remaining / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60

    return m.reply(
      '⏳ *¡No atomices! JAJAJA* 🐾\n\n' +
      `Esperá ${minutes} min ${secs} seg para volver a utilizar el comando.`
    )
  }

  // Evitar descargas simultáneas.

  if (processing.has(sender)) {
    return react(conn, m, '⏳')
  }

  processing.add(sender)

  try {

    await react(conn, m, '⏳')

    // ========================================================
    // 🔎 BUSCAR CANCIÓN
    // ========================================================

    const videoId = getVideoId(input)

    const query = videoId
      ? `https://youtu.be/${videoId}`
      : input

    const video = await getVideoInfo(
      query,
      videoId
    )

    if (!video?.videoId) {
      throw new Error(
        'No se encontró un video válido de YouTube.'
      )
    }

    const url = `https://youtu.be/${video.videoId}`

    const title = video.title || 'Audio'

    const thumbnail =
      video.image ||
      video.thumbnail ||
      `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`

    const seconds = Number(
      video.seconds ||
      video.duration?.seconds ||
      0
    )

    // ========================================================
    // ⏱️ LÍMITE DE DURACIÓN
    // ========================================================

    if (!seconds || !Number.isFinite(seconds)) {
      await react(conn, m, '❌')

      return m.reply(
        '❌ No pude comprobar la duración del video.'
      )
    }

    if (seconds > MAX_DURATION) {
      await react(conn, m, '❌')

      return m.reply(
        '❌ *El video es demasiado largo.*\n\n' +
        'La duración máxima permitida es de 7 minutos.'
      )
    }

    // ========================================================
    // 📥 DESCARGAR AUDIO
    // ========================================================

    console.log('[PLAY] Consultando API Lempi')
    console.log('[PLAY] Canción:', title)

    const audio = await getAudioFromApi(url)

    if (!audio?.buffer?.length) {
      throw new Error(
        'La API no devolvió un audio válido.'
      )
    }

    // ========================================================
    // 🖼️ INFORMACIÓN DE LA CANCIÓN
    // ========================================================

    const views = Number(
      video.views || 0
    ).toLocaleString('es-UY')

    const channel =
      video.author?.name ||
      (
        typeof video.author === 'string'
          ? video.author
          : 'Desconocido'
      )

    const duration =
      video.timestamp ||
      `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

    const caption = `╭━━━〔 🎵 *PLAY AUDIO* 〕━━━⬣
┃
┃ 🎶 *Título:* ${title}
┃ 👤 *Canal:* ${channel}
┃ ⏱️ *Duración:* ${duration}
┃ 👁️ *Vistas:* ${views}
┃ 📅 *Publicado:* ${video.ago || 'Desconocido'}
┃
╰━━━━━━━━━━━━━━━━⬣

*⇄ㅤ ◁ㅤ ❚❚ㅤ ▷ㅤ ↻*

🔗 ${url}

> 🤖 WHATSAPP-BOT`

    // Enviar miniatura una vez descargado el audio.

    try {
      await conn.sendMessage(m.chat, {
        image: {
          url: thumbnail
        },
        caption
      }, {
        quoted: m
      })
    } catch {
      await m.reply(caption)
    }

    // ========================================================
    // 🎧 ENVIAR AUDIO
    // ========================================================

    await conn.sendMessage(m.chat, {
      audio: audio.buffer,
      mimetype: 'audio/mpeg',
      fileName: audio.name || `${title}.mp3`,
      ptt: false
    }, {
      quoted: m
    })

    // ========================================================
    // ⏳ APLICAR COOLDOWN
    // ========================================================

    if (!privileged) {
      const expires = Date.now() + COOLDOWN

      cooldowns.set(sender, expires)

      const timer = setTimeout(() => {
        if (cooldowns.get(sender) === expires) {
          cooldowns.delete(sender)
        }
      }, COOLDOWN)

      timer.unref?.()
    }

    await react(conn, m, '✅')

    console.log(
      '[PLAY] Audio enviado correctamente:',
      title
    )

  } catch (error) {

    console.error(
      '❌ PLAY ERROR:',
      error.message || error
    )

    await react(conn, m, '❌')

    await m.reply(
      '❌ *No se pudo descargar el audio.*\n\n' +
      'Intentá nuevamente más tarde.'
    )

  } finally {

    processing.delete(sender)

  }
}

// ============================================================
// 🎭 REACCIONES
// ============================================================

async function react(conn, m, emoji) {
  try {
    await conn.sendMessage(m.chat, {
      react: {
        text: emoji,
        key: m.key
      }
    })
  } catch {}
}

// ============================================================
// 🔗 OBTENER ID DE YOUTUBE
// ============================================================

function getVideoId(text = '') {
  const raw = String(text).trim()

  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
    return raw
  }

  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/
  ]

  for (const pattern of patterns) {
    const match = raw.match(pattern)

    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

// ============================================================
// 🔎 INFORMACIÓN DEL VIDEO
// ============================================================

async function getVideoInfo(input, videoId) {

  if (videoId) {

    const info = await yts({
      videoId
    })

    if (info?.videoId === videoId) {
      return {
        ...info,
        url: `https://youtu.be/${info.videoId}`,
        image: info.thumbnail || info.image
      }
    }

    throw new Error(
      'No se encontró el video solicitado.'
    )
  }

  const search = await yts(input)

  return (
    search.videos?.[0] ||
    search.all?.find(v => v.type === 'video') ||
    null
  )
}

// ============================================================
// 🌐 API LEMPI — DESCARGAR AUDIO
// ============================================================

async function getAudioFromApi(url) {

  const apiUrl =
    `${API_URL}?url=${encodeURIComponent(url)}` +
    `&apikey=${encodeURIComponent(API_KEY)}`

  const response = await fetch(apiUrl, {
    signal: AbortSignal.timeout(30000),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0'
    }
  })

  if (!response.ok) {
    throw new Error(
      `API Lempi falló: HTTP ${response.status}`
    )
  }

  const json = await response.json()

  if (
    !json?.status ||
    !json?.descarga?.url
  ) {
    throw new Error(
      'Lempi no devolvió el enlace de descarga.'
    )
  }

  const downloadUrl = json.descarga.url

  if (!/^https?:\/\//i.test(downloadUrl)) {
    throw new Error(
      'La API devolvió un enlace inválido.'
    )
  }

  console.log(
    '[PLAY] Enlace de descarga obtenido.'
  )

  // ==========================================================
  // 📥 DESCARGAR ARCHIVO
  // ==========================================================

  const audioResponse = await fetch(
    downloadUrl,
    {
      signal: AbortSignal.timeout(60000),
      size: MAX_BYTES,
      headers: {
        Accept: 'audio/*, application/octet-stream',
        'User-Agent': 'Mozilla/5.0'
      }
    }
  )

  if (!audioResponse.ok) {
    throw new Error(
      `Error descargando audio: HTTP ${audioResponse.status}`
    )
  }

  const contentType = String(
    audioResponse.headers.get('content-type') || ''
  ).toLowerCase()

  if (
    /text\/html|application\/json|text\/plain/.test(contentType)
  ) {
    throw new Error(
      'El servidor devolvió HTML o JSON en lugar de audio.'
    )
  }

  const contentLength = Number(
    audioResponse.headers.get('content-length') || 0
  )

  if (contentLength > MAX_BYTES) {
    throw new Error(
      'El audio supera los 25 MB.'
    )
  }

  const buffer = Buffer.from(
    await audioResponse.arrayBuffer()
  )

  // ==========================================================
  // 🔍 VALIDAR ARCHIVO MP3
  // ==========================================================

  if (
    buffer.length < 1024 ||
    buffer.length > MAX_BYTES
  ) {
    throw new Error(
      'El audio está vacío o supera el límite permitido.'
    )
  }

  const isMP3 =
    buffer.subarray(0, 3).toString() === 'ID3' ||
    (
      buffer[0] === 0xff &&
      (buffer[1] & 0xe0) === 0xe0 &&
      (buffer[1] & 0x06) !== 0
    )

  if (!isMP3) {
    throw new Error(
      'El archivo descargado no es un MP3 reconocido.'
    )
  }

  console.log(
    '[PLAY] Audio descargado:',
    (buffer.length / 1024 / 1024).toFixed(2),
    'MB'
  )

  return {
    buffer,
    name: json.descarga.archivo || 'audio.mp3'
  }
}

// ============================================================
// 📋 CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.help = [
  'play <canción>',
  'mp3 <canción>',
  'ytmp3 <canción>',
  'ytaudio <canción>',
  'playaudio <canción>',
  'audio <canción>'
]

handler.tags = ['downloader']

handler.command =
  /^(play|mp3|ytmp3|ytaudio|playaudio|audio)$/i

handler.group = true
handler.register = false
handler.limit = false

export default handler
