
/**
 * 📂 plugins/_play2.js
 * 🤖 WHATSAPP-BOT — PLAY MULTIMEDIA
 *
 * 🎵 .musica / .audio
 * 🎬 .play2 / .video
 * 📁 .play3 / .playdoc
 * 📹 .play4 / .playdoc2
 *
 * ✅ Sin dependencias locales de /lib
 * ✅ Node.js 18+
 * ✅ Búsqueda por nombre o URL
 * ✅ API alternativas
 * ✅ Control de solicitudes
 * ✅ Errores controlados
 * ✅ Sin failureHandler ni global.dfail
 */

import yts from 'yt-search'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const CONFIG = {
  apiTimeout: 20000,
  maxAudio: 100 * 1024 * 1024,
  maxVideo: 200 * 1024 * 1024,
  maxDuration: 7 * 60,
  cooldown: 5 * 60 * 1000
}

const solicitudes = new Set()
const cooldowns = new Map()

const AUDIO = new Set([
  'musica', 'audio',
  'play3', 'playdoc'
])

const DOCUMENTOS = new Set([
  'play3', 'playdoc',
  'play4', 'playdoc2'
])

// ============================================================
// 🛠️ FUNCIONES AUXILIARES
// ============================================================

function urlValida(value) {
  if (typeof value !== 'string') return false

  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol)
  } catch {
    return false
  }
}

function normalizarURL(value, base) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  try {
    const url = new URL(value, base)

    return urlValida(url.href)
      ? url.href
      : null
  } catch {
    return null
  }
}

function extraerURL(data) {
  if (typeof data === 'string') {
    return normalizarURL(data)
  }

  if (!data || typeof data !== 'object') {
    return null
  }

  const candidates = [
    data.download_url_full,
    data.stream_url_full,
    data.download_url,
    data.downloadUrl,
    data.dl_url,
    data.dl,
    data.url,
    data.link,
    data.download,
    data.result?.download,
    data.result?.url,
    data.result?.dl_url,
    data.data?.audio?.url,
    data.data?.video?.url,
    data.data?.media?.dl_download,
    data.data?.download?.url,
    data.data?.download,
    data.data?.url
  ]

  for (const item of candidates) {
    const url = normalizarURL(item)
    if (url) return url
  }

  return null
}

function limpiarNombre(texto) {
  return String(texto || 'archivo')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

function duracion(seconds) {
  const n = Number(seconds) || 0

  const min = Math.floor(n / 60)
  const sec = Math.floor(n % 60)

  return `${min}:${String(sec).padStart(2, '0')}`
}

function espera(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function reaccionar(m, emoji) {
  try {
    await m.react(emoji)
  } catch {}
}

// ============================================================
// 🌐 PETICIONES HTTP
// ============================================================

async function fetchJSON(url) {
  const controller = new AbortController()

  const timer = setTimeout(
    () => controller.abort(),
    CONFIG.apiTimeout
  )

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

// ============================================================
// 🔎 BUSCAR VIDEO
// ============================================================

async function buscarVideo(query) {
  const match = query.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|live\/|embed\/))([a-zA-Z0-9_-]{11})/i
  )

  if (match) {
    const url =
      `https://www.youtube.com/watch?v=${match[1]}`

    const resultado = await yts(url)

    const video = resultado.videos?.find(
      v => v.videoId === match[1]
    )

    return video || {
      title: `YouTube ${match[1]}`,
      url,
      seconds: 0,
      thumbnail:
        `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    }
  }

  const resultado = await yts.search(query)

  if (!resultado.videos?.length) {
    throw new Error(
      'No encontré resultados para esa búsqueda.'
    )
  }

  return resultado.videos[0]
}

// ============================================================
// 🎵 PROVEEDORES DE AUDIO
// ============================================================

function proveedoresAudio(video) {
  const url = encodeURIComponent(video.url)
  const titulo = encodeURIComponent(video.title)
  const key = encodeURIComponent(
    process.env.API_KEY || ''
  )

  const proveedores = [
    {
      nombre: 'Mitzuki',
      url:
        `https://api.mitzuki.xyz/download/youtube?url=${url}&type=audio&format=mp3&apikey=${key}`
    },
    {
      nombre: 'Mitzuki 2',
      url:
        `https://api.mitzuki.xyz/download/youtube2?url=${url}&apikey=${key}`
    },
    {
      nombre: 'DV Yer',
      url:
        `https://dv-yer-api.online/ytmp3?mode=link&url=${url}`,
      base: 'https://dv-yer-api.online'
    },
    {
      nombre: 'Zenkey',
      url:
        `https://api.zenkey.my.id/api/download/ytmp3?apikey=zenkey&url=${url}`
    },
    {
      nombre: 'Exonity',
      url:
        `https://exonity.tech/api/dl/playmp3?query=${titulo}`
    }
  ]

  if (global.info?.apis) {
    proveedores.push({
      nombre: 'Info API',
      url:
        `${global.info.apis}/download/ytmp3?url=${url}`
    })
  }

  return proveedores
}

// ============================================================
// 🎬 PROVEEDORES DE VIDEO
// ============================================================

function proveedoresVideo(video) {
  const url = encodeURIComponent(video.url)
  const titulo = encodeURIComponent(video.title)

  const proveedores = [
    {
      nombre: 'Siputzx',
      url:
        `https://api.siputzx.my.id/api/d/ytmp4?url=${url}`
    },
    {
      nombre: 'Neoxr',
      url:
        `https://api.neoxr.eu/api/youtube?url=${url}&type=video&quality=720p&apikey=GataDios`
    },
    {
      nombre: 'FGMods',
      url:
        `https://api.fgmods.xyz/api/downloader/ytmp4?url=${url}&apikey=elrebelde21`
    },
    {
      nombre: 'Exonity',
      url:
        `https://exonity.tech/api/dl/playmp4?query=${titulo}`
    }
  ]

  if (global.info?.apis) {
    proveedores.push({
      nombre: 'Info API Video',
      url:
        `${global.info.apis}/download/ytmp4?url=${url}`
    })
  }

  return proveedores
}

// ============================================================
// 🔄 OBTENER ENLACE
// ============================================================

async function obtenerEnlace(proveedor) {
  const data = await fetchJSON(proveedor.url)

  if (proveedor.nombre === 'DV Yer') {
    const enlace =
      data?.download_url_full ||
      data?.stream_url_full ||
      data?.url

    return normalizarURL(
      enlace,
      proveedor.base
    )
  }

  if (
    proveedor.nombre === 'Mitzuki 2'
  ) {
    return extraerURL(
      data?.data?.audio?.url || data
    )
  }

  return extraerURL(data)
}

// ============================================================
// 📏 CONSULTAR TAMAÑO
// ============================================================

async function obtenerTamaño(url) {
  const controller = new AbortController()

  const timer = setTimeout(
    () => controller.abort(),
    CONFIG.apiTimeout
  )

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    })

    if (!response.ok) return null

    const size = Number(
      response.headers.get('content-length')
    )

    return Number.isFinite(size) && size > 0
      ? size
      : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ============================================================
// 📤 ENVIAR MULTIMEDIA
// ============================================================

async function enviarMultimedia(
  conn,
  m,
  video,
  enlace,
  tipo,
  documento
) {
  const audio = tipo === 'audio'

  const maximo = audio
    ? CONFIG.maxAudio
    : CONFIG.maxVideo

  const size = await obtenerTamaño(enlace)

  if (size !== null && size > maximo) {
    throw new Error(
      'El archivo supera el tamaño permitido.'
    )
  }

  const extension = audio ? 'mp3' : 'mp4'

  const mimetype = audio
    ? 'audio/mpeg'
    : 'video/mp4'

  const fileName =
    `${limpiarNombre(video.title)}.${extension}`

  let mensaje

  if (documento) {
    mensaje = {
      document: { url: enlace },
      mimetype,
      fileName
    }
  } else if (audio) {
    mensaje = {
      audio: { url: enlace },
      mimetype,
      ptt: false
    }
  } else {
    mensaje = {
      video: { url: enlace },
      mimetype,
      caption: `🎬 *${video.title}*`
    }
  }

  await conn.sendMessage(
    m.chat,
    mensaje,
    { quoted: m }
  )
}

// ============================================================
// 📥 DESCARGA CON RESPALDO
// ============================================================

async function descargar(
  conn,
  m,
  video,
  tipo,
  documento
) {
  const proveedores = tipo === 'audio'
    ? proveedoresAudio(video)
    : proveedoresVideo(video)

  for (const proveedor of proveedores) {
    try {
      console.log(
        `[PLAY] Probando ${proveedor.nombre}`
      )

      const enlace = await obtenerEnlace(
        proveedor
      )

      if (!urlValida(enlace)) {
        throw new Error(
          'La API no devolvió un enlace válido.'
        )
      }

      console.log(
        `[PLAY] Enlace obtenido: ${proveedor.nombre}`
      )

      await enviarMultimedia(
        conn,
        m,
        video,
        enlace,
        tipo,
        documento
      )

      console.log(
        `[PLAY] Enviado con ${proveedor.nombre}`
      )

      return true

    } catch (error) {
      console.error(
        `[PLAY] ${proveedor.nombre}:`,
        error?.message || error
      )

      await espera(300)
    }
  }

  return false
}

// ============================================================
// 🤖 HANDLER
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
      `🎬 ${usedPrefix}play2 video\n` +
      `📁 ${usedPrefix}play3 canción\n` +
      `📹 ${usedPrefix}play4 video`
    )
  }

  const exento = Boolean(
    isAdmin || isOwner || isROwner
  )

  // ========================================================
  // ⏳ COOLDOWN DE 5 MINUTOS
  // ========================================================

  if (!exento) {
    const ultimo = cooldowns.get(m.sender) || 0
    const restante =
      CONFIG.cooldown - (Date.now() - ultimo)

    if (restante > 0) {
      const minutos = Math.ceil(
        restante / 60000
      )

      return m.reply(
        `⏳ Esperá ${minutos} minuto(s) para volver a usar PLAY.`
      )
    }
  }

  if (solicitudes.has(m.sender)) {
    return m.reply(
      '⏳ Ya tenés una descarga en proceso.'
    )
  }

  solicitudes.add(m.sender)

  try {
    const tipo = AUDIO.has(cmd)
      ? 'audio'
      : 'video'

    const documento = DOCUMENTOS.has(cmd)

    await reaccionar(m, '🔎')

    // ======================================================
    // 🔎 BUSCAR
    // ======================================================

    const video = await buscarVideo(query)

    if (!video?.url) {
      throw new Error(
        'No se encontró el contenido.'
      )
    }

    // ======================================================
    // ⏰ LÍMITE DE 7 MINUTOS
    // ======================================================

    const segundos = Number(
      video.seconds ||
      video.duration?.seconds ||
      0
    )

    if (
      segundos > 0 &&
      segundos > CONFIG.maxDuration
    ) {
      return m.reply(
        '⛔ Solo se permiten canciones o videos de hasta 7 minutos.'
      )
    }

    // ======================================================
    // 📋 INFORMACIÓN
    // ======================================================

    const info =
      `🎵 *WHATSAPP-BOT — PLAY*\n\n` +
      `📌 *${video.title}*\n` +
      `⏰ Duración: ${duracion(segundos)}\n` +
      `📁 Formato: ${tipo}${documento ? ' (documento)' : ''}\n\n` +
      `⏳ Buscando descarga...`

    try {
      await conn.sendMessage(
        m.chat,
        {
          text: info,
          contextInfo: {
            externalAdReply: {
              title: video.title,
              body: 'WHATSAPP-BOT',
              thumbnailUrl: video.thumbnail,
              sourceUrl: video.url,
              mediaType: 1,
              showAdAttribution: false
            }
          }
        },
        { quoted: m }
      )
    } catch {
      await m.reply(info)
    }

    await reaccionar(m, '⏳')

    // ======================================================
    // 📥 DESCARGAR Y ENVIAR
    // ======================================================

    const enviado = await descargar(
      conn,
      m,
      video,
      tipo,
      documento
    )

    if (!enviado) {
      await reaccionar(m, '❌')

      return m.reply(
        '❌ No se pudo descargar el archivo. Todas las API disponibles fallaron.'
      )
    }

    if (!exento) {
      cooldowns.set(
        m.sender,
        Date.now()
      )
    }

    await reaccionar(m, '✅')

  } catch (error) {
    console.error(
      '[PLAY] Error:',
      error
    )

    await reaccionar(m, '❌')

    return m.reply(
      `❌ Error: ${error?.message || 'Error desconocido'}`
    )

  } finally {
    solicitudes.delete(m.sender)
  }
}

// ============================================================
// ⚙️ REGISTRO
// ============================================================

handler.help = [
  'musica',
  'audio',
  'play2',
  'video',
  'play3',
  'playdoc',
  'play4',
  'playdoc2'
]

handler.tags = ['downloader']

handler.command =
  /^(musica|audio|play2|video|play3|playdoc|play4|playdoc2)$/i

// No se exige registro para evitar que el handler
// invoque global.dfail('unreg') por este plugin.
handler.register = false

export default handler
