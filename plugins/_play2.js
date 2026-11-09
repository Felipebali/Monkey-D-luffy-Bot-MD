
/**
 * 📂 plugins/_play2.js
 * 🤖 WHATSAPP-BOT — PLAY AUDIO Y VIDEO
 *
 * Comandos:
 * .play / .musica / .audio
 * .play2 / .video
 * .play3 / .playdoc
 * .play4 / .playdoc2
 *
 * No requiere archivos adicionales en /lib.
 * Requiere: yt-search y Node.js >= 18.
 */

import yts from 'yt-search'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const API_TIMEOUT = 20000
const SEND_TIMEOUT = 90000

const MAX_AUDIO = 100 * 1024 * 1024
const MAX_VIDEO = 200 * 1024 * 1024

const solicitudes = new Set()

const AUDIO = new Set([
  'play', 'musica', 'audio',
  'play3', 'playdoc'
])

const VIDEO = new Set([
  'play2', 'video',
  'play4', 'playdoc2'
])

const DOCUMENTOS = new Set([
  'play3', 'playdoc',
  'play4', 'playdoc2'
])

// ============================================================
// 🛠️ UTILIDADES
// ============================================================

function nombreSeguro(texto) {
  return String(texto || 'Audio')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .slice(0, 100)
}

function duracion(segundos) {
  const n = Number(segundos) || 0
  const m = Math.floor(n / 60)
  const s = Math.floor(n % 60)

  return `${m}:${String(s).padStart(2, '0')}`
}

function enlaceValido(valor) {
  if (typeof valor !== 'string') return false

  try {
    const u = new URL(valor)
    return ['http:', 'https:'].includes(u.protocol)
  } catch {
    return false
  }
}

function urlNormalizada(valor, base) {
  if (typeof valor !== 'string' || !valor.trim()) {
    return null
  }

  try {
    const u = new URL(valor, base)
    return enlaceValido(u.href) ? u.href : null
  } catch {
    return null
  }
}

function timeoutPromise(ms, mensaje) {
  return new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(mensaje)),
      ms
    )
  })
}

async function jsonAPI(url) {
  const controller = new AbortController()

  const timer = setTimeout(
    () => controller.abort(),
    API_TIMEOUT
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
// 🔍 BUSCAR EN YOUTUBE
// ============================================================

async function buscar(query) {
  const id = query.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i
  )

  if (id) {
    const url = `https://www.youtube.com/watch?v=${id[1]}`

    const resultado = await yts(url)

    return resultado.videos?.[0] || {
      title: `YouTube ${id[1]}`,
      url,
      seconds: 0,
      thumbnail:
        `https://img.youtube.com/vi/${id[1]}/hqdefault.jpg`
    }
  }

  const resultado = await yts.search(query)

  if (!resultado.videos?.length) {
    throw new Error('No encontré resultados.')
  }

  return resultado.videos[0]
}

// ============================================================
// 🔗 EXTRAER ENLACE DE DESCARGA
// ============================================================

function extraer(data) {
  if (typeof data === 'string') {
    return urlNormalizada(data)
  }

  if (!data || typeof data !== 'object') {
    return null
  }

  const opciones = [
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

  for (const opcion of opciones) {
    const url = urlNormalizada(opcion)
    if (url) return url
  }

  return null
}

// ============================================================
// 🎵 API DE AUDIO
// ============================================================

function apisAudio(video) {
  const url = encodeURIComponent(video.url)
  const titulo = encodeURIComponent(video.title)
  const key = encodeURIComponent(process.env.API_KEY || '')

  const apis = [
    {
      nombre: 'Mitzuki',
      ejecutar: async () => {
        const data = await jsonAPI(
          `https://api.mitzuki.xyz/download/youtube?url=${url}&type=audio&format=mp3&apikey=${key}`
        )

        return extraer(data)
      }
    },
    {
      nombre: 'Mitzuki 2',
      ejecutar: async () => {
        const data = await jsonAPI(
          `https://api.mitzuki.xyz/download/youtube2?url=${url}&apikey=${key}`
        )

        return extraer(data?.data?.audio?.url || data)
      }
    },
    {
      nombre: 'DV Yer',
      ejecutar: async () => {
        const data = await jsonAPI(
          `https://dv-yer-api.online/ytmp3?mode=link&url=${url}`
        )

        return urlNormalizada(
          data?.download_url_full ||
          data?.stream_url_full ||
          data?.url,
          'https://dv-yer-api.online'
        )
      }
    },
    {
      nombre: 'Dorratz',
      ejecutar: async () => {
        const data = await jsonAPI(
          `https://api.dorratz.com/v3/ytdl?url=${url}`
        )

        const medias = Array.isArray(data?.medias)
          ? data.medias
          : []

        const mp3 = medias.find(
          x => x.extension === 'mp3'
        )

        return urlNormalizada(mp3?.url)
      }
    },
    {
      nombre: 'Zenkey',
      ejecutar: async () => {
        const data = await jsonAPI(
          `https://api.zenkey.my.id/api/download/ytmp3?apikey=zenkey&url=${url}`
        )

        return extraer(data)
      }
    },
    {
      nombre: 'Exonity',
      ejecutar: async () => {
        const data = await jsonAPI(
          `https://exonity.tech/api/dl/playmp3?query=${titulo}`
        )

        return extraer(data)
      }
    }
  ]

  if (global.info?.apis) {
    apis.push({
      nombre: 'Info API',
      ejecutar: async () => {
        const data = await jsonAPI(
          `${global.info.apis}/download/ytmp3?url=${url}`
        )

        return extraer(data)
      }
    })
  }

  return apis
}

// ============================================================
// 🎬 API DE VIDEO
// ============================================================

function apisVideo(video) {
  const url = encodeURIComponent(video.url)
  const titulo = encodeURIComponent(video.title)

  const apis = [
    {
      nombre: 'Siputzx',
      ejecutar: async () => {
        const data = await jsonAPI(
          `https://api.siputzx.my.id/api/d/ytmp4?url=${url}`
        )

        return extraer(data)
      }
    },
    {
      nombre: 'Neoxr',
      ejecutar: async () => {
        const data = await jsonAPI(
          `https://api.neoxr.eu/api/youtube?url=${url}&type=video&quality=720p&apikey=GataDios`
        )

        return extraer(data)
      }
    },
    {
      nombre: 'FGMods',
      ejecutar: async () => {
        const data = await jsonAPI(
          `https://api.fgmods.xyz/api/downloader/ytmp4?url=${url}&apikey=elrebelde21`
        )

        return extraer(data)
      }
    },
    {
      nombre: 'Exonity',
      ejecutar: async () => {
        const data = await jsonAPI(
          `https://exonity.tech/api/dl/playmp4?query=${titulo}`
        )

        return extraer(data)
      }
    }
  ]

  if (global.info?.apis) {
    apis.push({
      nombre: 'Info API Video',
      ejecutar: async () => {
        const data = await jsonAPI(
          `${global.info.apis}/download/ytmp4?url=${url}`
        )

        return extraer(data)
      }
    })
  }

  return apis
}

// ============================================================
// 📏 TAMAÑO DEL ARCHIVO
// ============================================================

async function tamañoArchivo(url) {
  const controller = new AbortController()

  const timer = setTimeout(
    () => controller.abort(),
    API_TIMEOUT
  )

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    })

    if (!res.ok) return null

    const n = Number(
      res.headers.get('content-length')
    )

    return Number.isFinite(n) && n > 0
      ? n
      : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ============================================================
// 📤 ENVIAR ARCHIVO
// ============================================================

async function enviar(
  conn,
  m,
  video,
  url,
  tipo,
  documento
) {
  const esAudio = tipo === 'audio'

  const maximo = esAudio
    ? MAX_AUDIO
    : MAX_VIDEO

  const tamaño = await tamañoArchivo(url)

  if (tamaño !== null && tamaño > maximo) {
    throw new Error(
      'El archivo supera el tamaño permitido.'
    )
  }

  const extension = esAudio ? 'mp3' : 'mp4'

  const mimetype = esAudio
    ? 'audio/mpeg'
    : 'video/mp4'

  const nombre =
    `${nombreSeguro(video.title)}.${extension}`

  let mensaje

  if (documento) {
    mensaje = {
      document: { url },
      mimetype,
      fileName: nombre
    }
  } else if (esAudio) {
    mensaje = {
      audio: { url },
      mimetype,
      ptt: false
    }
  } else {
    mensaje = {
      video: { url },
      mimetype,
      caption: `🎬 *${video.title}*`
    }
  }

  await Promise.race([
    conn.sendMessage(
      m.chat,
      mensaje,
      { quoted: m }
    ),
    timeoutPromise(
      SEND_TIMEOUT,
      'Tiempo de envío agotado'
    )
  ])
}

// ============================================================
// 🔄 PROBAR API ALTERNATIVAS
// ============================================================

async function descargar(
  conn,
  m,
  video,
  tipo,
  documento
) {
  const apis = tipo === 'audio'
    ? apisAudio(video)
    : apisVideo(video)

  for (const api of apis) {
    try {
      console.log(
        `[PLAY] Probando ${api.nombre}`
      )

      const url = await api.ejecutar()

      if (!enlaceValido(url)) {
        throw new Error(
          'No devolvió un enlace válido.'
        )
      }

      console.log(
        `[PLAY] Enlace obtenido: ${api.nombre}`
      )

      await enviar(
        conn,
        m,
        video,
        url,
        tipo,
        documento
      )

      console.log(
        `[PLAY] Enviado con ${api.nombre}`
      )

      return true

    } catch (error) {
      console.error(
        `[PLAY] ${api.nombre}:`,
        error?.message || error
      )

      if (
        error?.message === 'Tiempo de envío agotado'
      ) {
        throw error
      }
    }
  }

  return false
}

// ============================================================
// 🤖 HANDLER PRINCIPAL
// ============================================================

const handler = async (
  m,
  {
    conn,
    command,
    args = [],
    text = '',
    usedPrefix = '.'
  }
) => {
  const cmd = String(command).toLowerCase()

  const query = String(
    text || args.join(' ')
  ).trim()

  if (!query) {
    return m.reply(
      `🎵 *WHATSAPP-BOT — PLAY*\n\n` +
      `🎧 ${usedPrefix}play nombre\n` +
      `🎬 ${usedPrefix}play2 nombre\n` +
      `📁 ${usedPrefix}play3 nombre\n` +
      `📹 ${usedPrefix}play4 nombre`
    )
  }

  if (solicitudes.has(m.sender)) {
    return m.reply(
      '⏳ Ya tenés una descarga en proceso.'
    )
  }

  solicitudes.add(m.sender)

  try {
    const esAudio = AUDIO.has(cmd)
    const esVideo = VIDEO.has(cmd)

    if (!esAudio && !esVideo) {
      return m.reply(
        '❌ Comando no reconocido.'
      )
    }

    const tipo = esAudio ? 'audio' : 'video'
    const documento = DOCUMENTOS.has(cmd)

    try {
      await m.react('🔎')
    } catch {}

    const video = await buscar(query)

    if (!video?.url) {
      throw new Error(
        'No se encontró el video.'
      )
    }

    const info =
      `🎵 *WHATSAPP-BOT*\n\n` +
      `📌 *${video.title}*\n` +
      `⏰ Duración: ${duracion(video.seconds)}\n` +
      `📁 Formato: ${tipo}\n\n` +
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

    try {
      await m.react('⏳')
    } catch {}

    const ok = await descargar(
      conn,
      m,
      video,
      tipo,
      documento
    )

    if (!ok) {
      try {
        await m.react('❌')
      } catch {}

      return m.reply(
        '❌ No se pudo descargar el archivo. Todas las API disponibles fallaron.'
      )
    }

    try {
      await m.react('✅')
    } catch {}

  } catch (error) {
    console.error(
      '[PLAY] Error:',
      error
    )

    try {
      await m.react('❌')
    } catch {}

    return m.reply(
      `❌ Error: ${error?.message || 'Error desconocido'}`
    )

  } finally {
    solicitudes.delete(m.sender)
  }
}

// ============================================================
// ⚙️ REGISTRO DEL PLUGIN
// ============================================================

handler.help = [
  'play',
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
  /^(play|musica|audio|play2|video|play3|playdoc|play4|playdoc2)$/i

handler.register = true

export default handler
