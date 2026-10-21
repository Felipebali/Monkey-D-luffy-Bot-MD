// 📂 plugins/play.js — whatsapp-bot 🐾
// 🎵 YouTube → Audio
// Comandos: .play / .playaudio / .audio
// ⏳ Cooldown de 2 minutos para usuarios
// 👑 Admins y owners sin cooldown
// 😀 Reacciones automáticas

import yts from 'yt-search'
import axios from 'axios'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const MAX_DURATION_SECONDS = 7 * 60
const COOLDOWN_SECONDS = 120

// Cooldown individual por usuario
const cooldowns = new Map()

// ============================================================
// 👑 VERIFICAR OWNER
// ============================================================

const isOwner = (m, conn) => {
  const owners = global.owner || []

  const sender = (m.sender || '')
    .split('@')[0]
    .split(':')[0]

  const ownerNumbers = owners.map(owner => {
    const number = Array.isArray(owner) ? owner[0] : owner
    return String(number).replace(/\D/g, '')
  })

  const botNumber = (conn.user?.id || '')
    .split(':')[0]
    .split('@')[0]

  return (
    ownerNumbers.includes(sender) ||
    sender === botNumber ||
    m.fromMe === true
  )
}

// ============================================================
// 🛡️ VERIFICAR ADMINISTRADOR
// ============================================================

const isAdminOrOwner = async (m, conn) => {
  if (isOwner(m, conn)) return true

  if (!m.isGroup) return false

  try {
    const metadata = await conn.groupMetadata(m.chat)

    const sender = (m.sender || '').split(':')[0]

    const participant = metadata.participants?.find(p => {
      const id = (p.id || p.jid || '').split(':')[0]
      return id === sender
    })

    return Boolean(
      participant?.admin === 'admin' ||
      participant?.admin === 'superadmin' ||
      participant?.isAdmin ||
      participant?.isSuperAdmin
    )
  } catch (e) {
    console.error('⚠️ Error verificando administrador:', e)
    return false
  }
}

// ============================================================
// 😀 REACCIONAR AL MENSAJE
// ============================================================

const react = async (conn, m, emoji) => {
  try {
    await conn.sendMessage(m.chat, {
      react: {
        text: emoji,
        key: m.key
      }
    })
  } catch (e) {
    console.log('⚠️ No se pudo enviar la reacción:', e.message)
  }
}

// ============================================================
// 🧹 LIMPIAR TEXTO
// ============================================================

const cleanText = (text) => {
  if (!text) return ''

  if (typeof text === 'string')
    return text.trim()

  if (typeof text === 'number')
    return String(text)

  return String(text).trim()
}

// ============================================================
// 👁️ FORMATEAR VISTAS
// ============================================================

const formatViews = (v) => {
  v = Number(v) || 0

  if (v >= 1e9)
    return (v / 1e9).toFixed(1) + 'B'

  if (v >= 1e6)
    return (v / 1e6).toFixed(1) + 'M'

  if (v >= 1e3)
    return (v / 1e3).toFixed(1) + 'K'

  return String(v)
}

// ============================================================
// 🔎 EXTRAER URL DE DESCARGA
// ============================================================

const extractDownloadUrl = (data) => {
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
        ? data?.download?.url ||
          data?.download?.link
        : null
    ) ||
    data?.url ||
    data?.link

  return (
    typeof candidate === 'string' &&
    candidate.startsWith('http')
  ) ? candidate : ''
}

// ============================================================
// 🌐 CONSULTAR API
// ============================================================

const fetchApiUrl = async (apiUrl) => {
  const res = await axios.get(apiUrl, {
    timeout: 10000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  })

  const dlUrl = extractDownloadUrl(res.data)

  if (!dlUrl)
    throw new Error('Sin URL de descarga')

  return dlUrl
}

// ============================================================
// 🔄 OBTENER AUDIO CON FALLBACK
// ============================================================

const getAudioUrlWithRetry = async (videoUrl) => {
  const encoded = encodeURIComponent(videoUrl)

  const apis = [
    `https://api.delirius.online/download/ytmp3?url=${encoded}`,
    `https://api.starlights.uk/api/download/ytmp3?url=${encoded}`,
    `https://api.starlights.uk/api/download/ytmp3v2?url=${encoded}`
  ]

  for (const api of apis) {
    try {
      const url = await fetchApiUrl(api)

      if (url)
        return url

    } catch (e) {
      console.log('⚠️ API de audio falló:', api)
    }
  }

  throw new Error('Todas las APIs de descarga fallaron.')
}

// ============================================================
// 🎵 HANDLER
// ============================================================

let handler = async (m, { conn, text }) => {
  const query = String(text || '').trim()

  // ==========================================================
  // ❌ SIN BÚSQUEDA
  // ==========================================================

  if (!query) {
    return conn.sendMessage(
      m.chat,
      {
        text:
          'ꕤ *Ingresá el título o enlace de YouTube que querés buscar.*'
      },
      { quoted: m }
    )
  }

  // ==========================================================
  // 🎧 REACCIÓN INICIAL
  // ==========================================================

  await react(conn, m, '🎧')

  // ==========================================================
  // 👑 VERIFICAR ADMINISTRADOR U OWNER
  // ==========================================================

  const privileged = await isAdminOrOwner(m, conn)

  const senderId = m.sender || m.participant || m.chat

  // ==========================================================
  // ⏳ COOLDOWN DE 2 MINUTOS
  // ==========================================================

  if (!privileged) {
    const now = Date.now()
    const expiresAt = cooldowns.get(senderId) || 0

    if (now < expiresAt) {
      const remaining = Math.ceil((expiresAt - now) / 1000)
      const minutes = Math.floor(remaining / 60)
      const seconds = remaining % 60

      await react(conn, m, '⏳')

      return conn.sendMessage(
        m.chat,
        {
          text:
            `⏳ *¡No atomices! JAJAJA* 🐾\n\n` +
            `ꕤ Ya usaste este comando recientemente.\n` +
            `ꕤ Volvé a intentarlo en *${minutes > 0 ? `${minutes} min ` : ''}${seconds} seg*.\n\n` +
            `ׅ  ׄ  ✿ *Cooldown:* 2 minutos.`
        },
        { quoted: m }
      )
    }

    // Activar cooldown individual
    cooldowns.set(
      senderId,
      now + COOLDOWN_SECONDS * 1000
    )
  }

  try {
    // ========================================================
    // 🔎 BUSCAR VIDEO
    // ========================================================

    let searchQuery = query

    const urlMatch = query.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/
    )

    if (urlMatch) {
      searchQuery = `https://youtu.be/${urlMatch[1]}`
    }

    const searchResult = await yts(searchQuery)

    if (!searchResult?.videos?.length) {
      return conn.sendMessage(
        m.chat,
        {
          text:
            `✿ No se encontraron resultados para *${query}*.`
        },
        { quoted: m }
      )
    }

    // ========================================================
    // 🎬 PRIMER RESULTADO
    // ========================================================

    const video = searchResult.videos[0]

    const videoId =
      video.videoId ||
      (urlMatch ? urlMatch[1] : '')

    if (!videoId) {
      return conn.sendMessage(
        m.chat,
        {
          text: '❌ No pude obtener el ID del video.'
        },
        { quoted: m }
      )
    }

    const videoUrl = `https://youtu.be/${videoId}`

    const title = cleanText(video.title) || 'Sin título'

    const channel = cleanText(
      video.author?.name || video.author
    ) || 'Desconocido'

    const views =
      typeof video.views === 'number'
        ? video.views
        : 0

    const duration = cleanText(
      video.timestamp || video.duration
    ) || ''

    // ========================================================
    // ⏱️ LÍMITE DE DURACIÓN
    // ========================================================

    if (
      video.seconds &&
      video.seconds > MAX_DURATION_SECONDS
    ) {
      return conn.sendMessage(
        m.chat,
        {
          text:
            `✿ El audio dura *${duration}*, superando el límite permitido de *7 minutos*.`
        },
        { quoted: m }
      )
    }

    // ========================================================
    // 🖼️ MINIATURA
    // ========================================================

    const thumbnail =
      `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`

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
          image: { url: thumbnail },
          caption
        },
        { quoted: m }
      )
    } catch (e) {
      console.log('⚠️ No se pudo enviar la miniatura:', e)
    }

    // ========================================================
    // 🎵 OBTENER AUDIO
    // ========================================================

    const downloadUrl =
      await getAudioUrlWithRetry(videoUrl)

    if (!downloadUrl)
      throw new Error('No se obtuvo URL de audio.')

    // ========================================================
    // 📤 ENVIAR AUDIO
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: downloadUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      },
      { quoted: m }
    )

    // ========================================================
    // ✅ REACCIÓN DE ÉXITO
    // ========================================================

    await react(conn, m, '✅')

  } catch (e) {
    console.error('❌ Error en play:', e)

    await react(conn, m, '❌')

    return conn.sendMessage(
      m.chat,
      {
        text:
          '❌ No pude descargar el audio. Intentá nuevamente en unos segundos.'
      },
      { quoted: m }
    )
  }
}

// ============================================================
// 📋 CONFIGURACIÓN
// ============================================================

handler.help = [
  'play <texto>',
  'playaudio <texto>',
  'audio <texto>'
]

handler.tags = ['download']

handler.command = [
  'play',
  'playaudio',
  'audio'
]

handler.group = true

export default handler
