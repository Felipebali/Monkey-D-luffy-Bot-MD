
/**
 * 📂 plugins/_play2.js
 * 🤖 WHATSAPP-BOT — PLAY MULTIMEDIA
 *
 * 🎵 .musica / .audio
 * 🎬 .play2 / .video
 * 📁 .play3 / .playdoc
 * 📹 .play4 / .playdoc2
 *
 * ❌ NO utiliza .play
 *
 * Node.js 18+
 * Dependencia: yt-search
 */

import yts from 'yt-search'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const CONFIG = {
  apiTimeout: 15000,
  searchTimeout: 20000,
  sendTimeout: 90000,
  cooldown: 5 * 60 * 1000,
  maxDuration: 7 * 60,
  maxAudio: 100 * 1024 * 1024,
  maxVideo: 200 * 1024 * 1024
}

const busy = new Set()
const lastUsed = new Map()

const audioCommands = new Set([
  'musica',
  'audio',
  'play3',
  'playdoc'
])

const documentCommands = new Set([
  'play3',
  'playdoc',
  'play4',
  'playdoc2'
])

const ytId =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|live\/|embed\/))([\w-]{11})/i

// ============================================================
// 🛠️ UTILIDADES
// ============================================================

function httpUrl(value, base) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  try {
    const url = new URL(value, base)

    return ['http:', 'https:'].includes(url.protocol)
      ? url.href
      : null
  } catch {
    return null
  }
}

function extract(value, kind, depth = 0) {
  if (!value || depth > 3) return null

  if (typeof value === 'string') {
    return httpUrl(value)
  }

  if (typeof value !== 'object') {
    return null
  }

  const candidates = [
    value.download_url_full,
    value.stream_url_full,
    value.download_url,
    value.dl_url,
    value.dl,
    value.downloadUrl,
    value.download,
    value.result?.download,
    value.result?.dl_url,
    value.data?.media?.dl_download,
    value.data?.download?.url,
    value.data?.download,
    value.data?.[kind]?.url,
    value.result?.[kind]?.url,
    value.url
  ]

  for (const item of candidates) {
    if (typeof item === 'string') {
      const url = httpUrl(item)

      if (url) return url
    } else if (
      item &&
      typeof item === 'object'
    ) {
      const url = extract(
        item,
        kind,
        depth + 1
      )

      if (url) return url
    }
  }

  return null
}

function safeName(value) {
  return String(value || 'archivo')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .slice(0, 90) || 'archivo'
}

function duration(seconds) {
  const n = Math.max(
    0,
    Number(seconds) || 0
  )

  const minutes = Math.floor(n / 60)
  const secs = Math.floor(n % 60)

  return `${minutes}:${String(secs).padStart(2, '0')}`
}

async function react(m, emoji) {
  try {
    await m.react(emoji)
  } catch {}
}

// ============================================================
// 📢 ENVIAR AVISOS
// ============================================================

async function notify(conn, m, message) {
  console.log(
    '[PLAY2] Aviso:',
    message.replace(/\n/g, ' ').slice(0, 130)
  )

  try {
    return await conn.sendMessage(
      m.chat,
      { text: message },
      { quoted: m }
    )
  } catch (error) {
    console.error(
      '[PLAY2] No se pudo enviar aviso:',
      error?.message || error
    )

    try {
      return await m.reply(message)
    } catch (e) {
      console.error(
        '[PLAY2] Tampoco funcionó m.reply:',
        e?.message || e
      )
    }
  }
}

// ============================================================
// ⏱️ TIMEOUT
// ============================================================

async function withTimeout(task, ms, label) {
  let timer

  try {
    return await Promise.race([
      Promise.resolve().then(task),

      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(
            new Error(`${label}: tiempo agotado`)
          ),
          ms
        )
      })
    ])
  } finally {
    clearTimeout(timer)
  }
}

// ============================================================
// 🌐 CONSULTAR API
// ============================================================

async function fetchJson(url) {
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
      throw new Error(
        `HTTP ${response.status}`
      )
    }

    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

// ============================================================
// 🔎 BUSCAR EN YOUTUBE
// ============================================================

async function findVideo(query) {
  const match = query.match(ytId)

  if (match) {
    const url =
      `https://www.youtube.com/watch?v=${match[1]}`

    try {
      const result = await withTimeout(
        () => yts(url),
        CONFIG.searchTimeout,
        'YouTube'
      )

      const video =
        result?.videos?.find(
          v => v.videoId === match[1]
        ) ||
        result?.videos?.[0]

      if (video) {
        return {
          ...video,
          url
        }
      }
    } catch (error) {
      console.warn(
        '[PLAY2] Metadatos no disponibles:',
        error?.message
      )
    }

    return {
      title: `YouTube ${match[1]}`,
      url,
      seconds: 0
    }
  }

  const result = await withTimeout(
    () => yts.search(query),
    CONFIG.searchTimeout,
    'Búsqueda YouTube'
  )

  const video = result?.videos?.[0]

  if (!video?.url) {
    throw new Error(
      'No encontré resultados en YouTube.'
    )
  }

  return video
}

// ============================================================
// 🎵🎬 PROVEEDORES DE DESCARGA
// ============================================================

function providers(video, kind) {
  const url = encodeURIComponent(video.url)

  const title = encodeURIComponent(
    video.title || ''
  )

  const key = encodeURIComponent(
    process.env.API_KEY || ''
  )

  const list = kind === 'audio'
    ? [
        [
          'Mitzuki',
          `https://api.mitzuki.xyz/download/youtube?url=${url}&type=audio&format=mp3&apikey=${key}`
        ],
        [
          'Mitzuki 2',
          `https://api.mitzuki.xyz/download/youtube2?url=${url}&apikey=${key}`
        ],
        [
          'DV Yer',
          `https://dv-yer-api.online/ytmp3?mode=link&url=${url}`
        ],
        [
          'Dorratz',
          `https://api.dorratz.com/v3/ytdl?url=${url}`
        ],
        [
          'Zenkey',
          `https://api.zenkey.my.id/api/download/ytmp3?apikey=zenkey&url=${url}`
        ],
        [
          'Exonity',
          `https://exonity.tech/api/dl/playmp3?query=${title}`
        ]
      ]
    : [
        [
          'Siputzx',
          `https://api.siputzx.my.id/api/d/ytmp4?url=${url}`
        ],
        [
          'Neoxr',
          `https://api.neoxr.eu/api/youtube?url=${url}&type=video&quality=720p&apikey=GataDios`
        ],
        [
          'FGMods',
          `https://api.fgmods.xyz/api/downloader/ytmp4?url=${url}&apikey=elrebelde21`
        ],
        [
          'Exonity',
          `https://exonity.tech/api/dl/playmp4?query=${title}`
        ]
      ]

  if (global.info?.apis) {
    const base = String(
      global.info.apis
    ).replace(/\/$/, '')

    const format = kind === 'audio'
      ? 'ytmp3'
      : 'ytmp4'

    list.push([
      'Info API',
      `${base}/download/${format}?url=${url}`
    ])
  }

  return list
}

// ============================================================
// 🔗 OBTENER ENLACE DE DESCARGA
// ============================================================

async function getDownloadUrl(provider, kind) {
  const [name, endpoint] = provider

  const data = await fetchJson(endpoint)

  if (name === 'DV Yer') {
    return httpUrl(
      data?.download_url_full ||
      data?.stream_url_full ||
      data?.url,
      'https://dv-yer-api.online'
    )
  }

  if (name === 'Dorratz') {
    const medias = Array.isArray(data?.medias)
      ? data.medias
      : []

    const media = medias.find(
      item => item.extension === 'mp3'
    )

    return httpUrl(media?.url)
  }

  return extract(data, kind)
}

// ============================================================
// 📏 CONSULTAR TAMAÑO
// ============================================================

async function fileSize(url) {
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

    const n = Number(
      response.headers.get('content-length')
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
// 📤 ENVIAR AUDIO O VIDEO
// ============================================================

async function sendFile(
  conn,
  m,
  video,
  url,
  kind,
  document
) {
  const audio = kind === 'audio'

  const size = await fileSize(url)

  const limit = audio
    ? CONFIG.maxAudio
    : CONFIG.maxVideo

  if (size && size > limit) {
    throw new Error(
      'El archivo supera el tamaño permitido.'
    )
  }

  const mime = audio
    ? 'audio/mpeg'
    : 'video/mp4'

  const name =
    `${safeName(video.title)}.${audio ? 'mp3' : 'mp4'}`

  const payload = document
    ? {
        document: { url },
        mimetype: mime,
        fileName: name
      }
    : audio
      ? {
          audio: { url },
          mimetype: mime,
          ptt: false
        }
      : {
          video: { url },
          mimetype: mime,
          caption: `🎬 *${video.title}*`
        }

  return withTimeout(
    () => conn.sendMessage(
      m.chat,
      payload,
      { quoted: m }
    ),
    CONFIG.sendTimeout,
    'Envío'
  )
}

// ============================================================
// 🔄 DESCARGAR CON API ALTERNATIVAS
// ============================================================

async function downloadAndSend(
  conn,
  m,
  video,
  kind,
  document
) {
  const failures = []

  for (const provider of providers(video, kind)) {
    const name = provider[0]

    try {
      console.log(
        `[PLAY2] Consultando ${name}`
      )

      const url = await getDownloadUrl(
        provider,
        kind
      )

      if (!url) {
        throw new Error(
          'Sin enlace de descarga'
        )
      }

      console.log(
        `[PLAY2] Enlace recibido de ${name}`
      )

      await sendFile(
        conn,
        m,
        video,
        url,
        kind,
        document
      )

      console.log(
        `[PLAY2] Archivo enviado con ${name}`
      )

      return true
    } catch (error) {
      console.error(
        `[PLAY2] ${name}:`,
        error?.message || error
      )

      if (
        String(error?.message).includes(
          'Envío: tiempo agotado'
        )
      ) {
        throw error
      }

      failures.push(
        `${name}: ${error?.message || error}`
      )
    }
  }

  console.error(
    '[PLAY2] Proveedores agotados:\n' +
    failures.join('\n')
  )

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
    usedPrefix = '.',
    isAdmin,
    isOwner,
    isROwner
  }
) => {
  const cmd = String(
    command || ''
  ).toLowerCase()

  const query = String(
    text || args.join(' ')
  ).trim()

  if (!query) {
    return notify(
      conn,
      m,
      `🎵 *WHATSAPP-BOT — MULTIMEDIA*\n\n` +
      `🎧 ${usedPrefix}musica canción\n` +
      `🎧 ${usedPrefix}audio canción\n` +
      `🎬 ${usedPrefix}play2 video\n` +
      `📁 ${usedPrefix}play3 canción\n` +
      `📹 ${usedPrefix}play4 video`
    )
  }

  const exempt = Boolean(
    isAdmin || isOwner || isROwner
  )

  // ========================================================
  // ⏳ COOLDOWN
  // ========================================================

  if (!exempt) {
    const remaining =
      CONFIG.cooldown -
      (Date.now() - (lastUsed.get(m.sender) || 0))

    if (remaining > 0) {
      return notify(
        conn,
        m,
        `⏳ Esperá ${Math.ceil(remaining / 60000)} minuto(s) para usar este comando otra vez.`
      )
    }
  }

  if (busy.has(m.sender)) {
    return notify(
      conn,
      m,
      '⏳ Ya tenés una descarga en curso.'
    )
  }

  busy.add(m.sender)

  try {
    const kind = audioCommands.has(cmd)
      ? 'audio'
      : 'video'

    const document = documentCommands.has(cmd)

    console.log(
      `[PLAY2] Comando ${cmd}, búsqueda: ${query}`
    )

    // ======================================================
    // 📢 AVISAR ANTES DE BUSCAR
    // ======================================================

    await notify(
      conn,
      m,
      `🎵 *WHATSAPP-BOT — MULTIMEDIA*\n\n` +
      `🔎 Buscando: *${query}*\n` +
      `⏳ Preparando ${kind === 'audio' ? 'el audio' : 'el video'}, aguardá un momento...`
    )

    await react(m, '🔎')

    // ======================================================
    // 🔎 BUSCAR EN YOUTUBE
    // ======================================================

    const video = await findVideo(query)

    console.log(
      `[PLAY2] Encontrado: ${video.title} (${video.url})`
    )

    const seconds = Number(
      video.seconds ||
      video.duration?.seconds ||
      0
    )

    // ======================================================
    // ⏰ LÍMITE DE DURACIÓN
    // ======================================================

    if (seconds > CONFIG.maxDuration) {
      await react(m, '❌')

      return notify(
        conn,
        m,
        `⛔ El contenido dura ${duration(seconds)}. El máximo permitido es 7 minutos.`
      )
    }

    // ======================================================
    // 📥 AVISO DE DESCARGA
    // ======================================================

    await notify(
      conn,
      m,
      `🎵 *${video.title}*\n` +
      `⏰ Duración: ${seconds ? duration(seconds) : 'No disponible'}\n` +
      `📁 Formato: ${kind}${document ? ' (documento)' : ''}\n` +
      `⏳ Descargando y enviando...`
    )

    await react(m, '⏳')

    // ======================================================
    // 📤 DESCARGAR Y ENVIAR
    // ======================================================

    const ok = await downloadAndSend(
      conn,
      m,
      video,
      kind,
      document
    )

    if (!ok) {
      await react(m, '❌')

      return notify(
        conn,
        m,
        '❌ No se pudo descargar el archivo. Revisá la consola: todas las API fallaron o devolvieron enlaces inválidos.'
      )
    }

    if (!exempt) {
      lastUsed.set(
        m.sender,
        Date.now()
      )
    }

    await react(m, '✅')

  } catch (error) {
    console.error(
      '[PLAY2] Error general:',
      error
    )

    await react(m, '❌')

    await notify(
      conn,
      m,
      `❌ No se pudo completar la descarga: ${error?.message || 'Error desconocido'}`
    )

  } finally {
    busy.delete(m.sender)
  }
}

// ============================================================
// ⚙️ REGISTRO DEL PLUGIN
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

handler.register = false

export default handler
