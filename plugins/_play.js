
/**
 * 📂 plugins/play.js
 * 🤖 WHATSAPP-BOT — PLAY AUDIO
 *
 * 🎵 YouTube → MP3
 * 🛠️ yt-dlp + FFmpeg (si están disponibles)
 * 🌐 APIs de respaldo
 * 🖼️ Miniatura e información
 * ⏳ Cooldown: 5 minutos
 * 👑 Admins y owners sin cooldown
 * ⏱️ Duración máxima: 7 minutos
 *
 * Baileys ES Modules
 */

import yts from 'yt-search'
import axios from 'axios'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const MAX_DURATION = 420
const COOLDOWN = 300000
const MAX_BYTES = 25 * 1024 * 1024

const cooldowns = new Map()

// ============================================================
// ⚙️ DETECTAR PROGRAMAS
// ============================================================

function disponible(programa) {
  try {
    const result = spawnSync(
      programa,
      ['--version'],
      {
        timeout: 5000,
        stdio: 'ignore'
      }
    )

    return result.status === 0
  } catch {
    return false
  }
}

const HAS_FFMPEG = disponible('ffmpeg')
const HAS_YTDLP = disponible('yt-dlp')

console.log(
  `[PLAY] yt-dlp: ${HAS_YTDLP} | FFmpeg: ${HAS_FFMPEG}`
)

// ============================================================
// 👑 PERMISOS
// ============================================================

function decode(conn, jid) {
  try {
    return conn.decodeJid?.(jid) || jid || ''
  } catch {
    return jid || ''
  }
}

function numero(jid) {
  return String(jid || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

function esOwner(m, conn, ownerContext) {
  if (
    ownerContext ||
    m.fromMe ||
    m.key?.fromMe
  ) return true

  const sender = decode(
    conn,
    m.sender || m.participant
  )

  const owners = global.owner || []

  return owners.some(owner => {
    const value = Array.isArray(owner)
      ? owner[0]
      : owner

    const configured = String(value || '')

    if (sender === configured) return true

    if (sender.endsWith('@lid')) {
      return false
    }

    return (
      numero(sender) &&
      numero(sender) === numero(configured)
    )
  })
}

async function esPrivilegiado(m, conn, context) {
  if (
    esOwner(m, conn, context.isOwner) ||
    context.isAdmin
  ) return true

  if (!m.isGroup) return false

  try {
    const metadata = await conn.groupMetadata(m.chat)

    const sender = decode(
      conn,
      m.sender || m.participant
    )

    const participant = metadata.participants.find(p =>
      decode(conn, p.id) === sender ||
      decode(conn, p.lid) === sender
    )

    return Boolean(
      participant?.admin === 'admin' ||
      participant?.admin === 'superadmin' ||
      participant?.isAdmin ||
      participant?.isSuperAdmin
    )
  } catch {
    return false
  }
}

// ============================================================
// 😀 REACCIONES
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
// 🎬 IDENTIFICAR VIDEO
// ============================================================

function obtenerId(text) {
  const match = String(text).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#\s]*?&)?v=|shorts\/|embed\/|live\/))([a-zA-Z0-9_-]{11})/
  )

  return match?.[1] || ''
}

async function buscarVideo(query) {
  const id = obtenerId(query)

  if (id) {
    const result = await yts({
      videoId: id
    })

    if (!result?.videoId) {
      throw new Error(
        'No se pudo obtener información del video.'
      )
    }

    return result
  }

  const result = await yts(query)

  if (!result.videos?.length) {
    throw new Error(
      'No se encontraron resultados.'
    )
  }

  return result.videos[0]
}

// ============================================================
// 🛠️ EJECUTAR PROCESO
// ============================================================

function ejecutar(programa, args, timeout = 90000) {
  return new Promise((resolve, reject) => {
    const proceso = spawn(programa, args, {
      stdio: ['ignore', 'ignore', 'pipe']
    })

    let errorText = ''
    let terminado = false

    const timer = setTimeout(() => {
      proceso.kill('SIGKILL')

      finalizar(
        new Error(`${programa}: tiempo agotado`)
      )
    }, timeout)

    function finalizar(error) {
      if (terminado) return

      terminado = true
      clearTimeout(timer)

      if (error) reject(error)
      else resolve()
    }

    proceso.stderr.on('data', chunk => {
      errorText += chunk.toString()

      if (errorText.length > 4000) {
        errorText = errorText.slice(-4000)
      }
    })

    proceso.on('error', finalizar)

    proceso.on('close', code => {
      if (code !== 0) {
        return finalizar(
          new Error(
            errorText.slice(-500) ||
            `${programa} terminó con código ${code}`
          )
        )
      }

      finalizar()
    })
  })
}

// ============================================================
// 🎵 DESCARGA LOCAL CON YT-DLP
// ============================================================

async function descargarLocal(videoUrl) {
  if (!HAS_YTDLP || !HAS_FFMPEG) {
    throw new Error(
      'yt-dlp o FFmpeg no están instalados.'
    )
  }

  const folder = await fs.mkdtemp(
    path.join(os.tmpdir(), 'wa-play-')
  )

  const output = path.join(folder, 'audio.mp3')

  try {
    await ejecutar('yt-dlp', [
      '--no-playlist',
      '--no-progress',
      '--max-filesize', '25M',
      '--socket-timeout', '20',
      '--retries', '2',
      '--format', 'bestaudio/best',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '128K',
      '--ffmpeg-location', 'ffmpeg',
      '--output', output,
      videoUrl
    ], 120000)

    const buffer = await fs.readFile(output)

    if (
      buffer.length < 1024 ||
      buffer.length > MAX_BYTES
    ) {
      throw new Error(
        'El MP3 descargado no tiene un tamaño válido.'
      )
    }

    return buffer

  } finally {
    await fs.rm(folder, {
      recursive: true,
      force: true
    }).catch(() => {})
  }
}

// ============================================================
// 🔎 EXTRAER ENLACES DE APIs
// ============================================================

function extraerUrl(data) {
  const values = [
    data?.data?.download,
    data?.data?.download?.url,
    data?.data?.download?.link,
    data?.download,
    data?.download?.url,
    data?.download?.link,
    data?.data?.dl_url,
    data?.data?.dl,
    data?.data?.url,
    data?.data?.link,
    data?.result?.download,
    data?.result?.download?.url,
    data?.result?.url,
    data?.result?.link,
    data?.datos?.url,
    data?.dl,
    data?.url,
    data?.link
  ]

  return values.find(value =>
    typeof value === 'string' &&
    /^https?:\/\//i.test(value)
  ) || null
}

// ============================================================
// 📥 DESCARGAR ARCHIVO EXTERNO
// ============================================================

async function descargarArchivo(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    maxRedirects: 5,
    maxContentLength: MAX_BYTES,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'audio/*,application/octet-stream'
    }
  })

  const buffer = Buffer.from(response.data)

  if (
    buffer.length < 1024 ||
    buffer.length > MAX_BYTES
  ) {
    throw new Error(
      'Archivo vacío o demasiado grande.'
    )
  }

  const contentType = String(
    response.headers['content-type'] || ''
  ).toLowerCase()

  if (
    contentType.includes('text/html') ||
    contentType.includes('application/json')
  ) {
    throw new Error(
      'La URL devolvió HTML o JSON, no audio.'
    )
  }

  return buffer
}

// ============================================================
// 🎧 VERIFICAR MP3
// ============================================================

function esMP3(buffer) {
  if (buffer.length < 4) return false

  if (
    buffer.toString('ascii', 0, 3) === 'ID3'
  ) return true

  return (
    buffer[0] === 0xff &&
    (buffer[1] & 0xe0) === 0xe0
  )
}

// ============================================================
// 🔄 CONVERTIR CON FFMPEG
// ============================================================

async function convertirMP3(buffer) {
  if (!HAS_FFMPEG) {
    if (esMP3(buffer)) {
      return buffer
    }

    throw new Error(
      'FFmpeg no está disponible y el archivo no es MP3.'
    )
  }

  const folder = await fs.mkdtemp(
    path.join(os.tmpdir(), 'wa-convert-')
  )

  const input = path.join(folder, 'input.audio')
  const output = path.join(folder, 'output.mp3')

  try {
    await fs.writeFile(input, buffer)

    await ejecutar('ffmpeg', [
      '-y',
      '-hide_banner',
      '-loglevel', 'error',
      '-i', input,
      '-vn',
      '-map', '0:a:0',
      '-c:a', 'libmp3lame',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      output
    ], 90000)

    const converted = await fs.readFile(output)

    if (
      converted.length < 1024 ||
      converted.length > MAX_BYTES ||
      !esMP3(converted)
    ) {
      throw new Error(
        'La conversión no produjo un MP3 válido.'
      )
    }

    return converted

  } finally {
    await fs.rm(folder, {
      recursive: true,
      force: true
    }).catch(() => {})
  }
}

// ============================================================
// 🌐 APIS DE RESPALDO
// ============================================================

async function descargarConAPIs(videoUrl) {
  const encoded = encodeURIComponent(videoUrl)

  const apis = [
    {
      name: 'Delirius',
      url: `https://api.delirius.online/download/ytmp3?url=${encoded}`
    },
    {
      name: 'Starlights',
      url: `https://api.starlights.uk/api/download/ytmp3?url=${encoded}`
    },
    {
      name: 'Starlights V2',
      url: `https://api.starlights.uk/api/download/ytmp3v2?url=${encoded}`
    }
  ]

  const errors = []

  for (const api of apis) {
    try {
      console.log(
        `[PLAY] Probando ${api.name}`
      )

      const response = await axios.get(api.url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      })

      const url = extraerUrl(response.data)

      if (!url) {
        throw new Error(
          'No devolvió enlace de descarga.'
        )
      }

      const buffer = await descargarArchivo(url)

      return await convertirMP3(buffer)

    } catch (error) {
      const message =
        `${api.name}: ${error.message}`

      errors.push(message)

      console.error(
        `[PLAY] ${message}`
      )
    }
  }

  throw new Error(errors.join(' | '))
}

// ============================================================
// 🎵 OBTENER AUDIO CON FALLBACK
// ============================================================

async function obtenerAudio(videoUrl) {
  const errors = []

  if (HAS_YTDLP && HAS_FFMPEG) {
    try {
      console.log(
        '[PLAY] Descargando con yt-dlp...'
      )

      return await descargarLocal(videoUrl)

    } catch (error) {
      errors.push(
        `yt-dlp: ${error.message}`
      )

      console.error(
        '[PLAY] Falló yt-dlp:',
        error.message
      )
    }
  }

  try {
    return await descargarConAPIs(videoUrl)
  } catch (error) {
    errors.push(error.message)
  }

  throw new Error(
    errors.join(' | ') ||
    'No se pudo obtener audio.'
  )
}

// ============================================================
// 🎵 HANDLER PRINCIPAL
// ============================================================

let handler = async (m, context) => {
  const { conn, text } = context

  const query = String(text || '').trim()

  if (!query) {
    return m.reply(
      '🎵 *PLAY AUDIO*\n\n' +
      'ꕤ Escribí el nombre de una canción.\n\n' +
      '✿ Ejemplo: *.play nombre de canción*'
    )
  }

  const privileged = await esPrivilegiado(
    m,
    conn,
    context
  )

  const senderId =
    m.sender || m.participant || m.chat

  if (!privileged) {
    const expiresAt = cooldowns.get(senderId) || 0
    const now = Date.now()

    if (now < expiresAt) {
      const remaining = Math.ceil(
        (expiresAt - now) / 1000
      )

      const minutes = Math.floor(
        remaining / 60
      )

      const seconds = remaining % 60

      await react(conn, m, '⏳')

      return m.reply(
        '⏳ *¡No atomices! JAJAJA* 🐾\n\n' +
        `ꕤ Esperá *${minutes} min ${seconds} seg*.\n` +
        '✿ Cooldown: 5 minutos.'
      )
    }
  }

  await react(conn, m, '🎧')

  try {
    // ========================================================
    // 🔎 BUSCAR VIDEO
    // ========================================================

    const video = await buscarVideo(query)

    const videoId =
      video.videoId || obtenerId(query)

    if (!videoId) {
      throw new Error(
        'No se pudo obtener el ID de YouTube.'
      )
    }

    const videoUrl =
      `https://youtu.be/${videoId}`

    const title =
      String(video.title || 'Sin título')

    const channel =
      String(
        video.author?.name || 'Desconocido'
      )

    const duration =
      String(video.timestamp || 'Desconocida')

    const seconds =
      Number(video.seconds) || 0

    // ========================================================
    // ⏱️ LÍMITE DE DURACIÓN
    // ========================================================

    if (seconds > MAX_DURATION) {
      await react(conn, m, '❌')

      return m.reply(
        '❌ *Audio demasiado largo*\n\n' +
        `🎵 ${title}\n` +
        `⏱️ Duración: ${duration}\n\n` +
        'ꕤ Máximo permitido: 7 minutos.'
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
ׅ  ׄ  ✿ *Vistas* » ${Number(video.views || 0).toLocaleString('es-UY')}
ׅ  ׄ  ✿ *Tiempo* » ${duration}
ׅ  ׄ  ✿ *Link* » ${videoUrl}

ׅ  ׄ  ✿ *Preparando audio...*`

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
      console.log(
        '[PLAY] Error de miniatura:',
        error.message
      )
    }

    // ========================================================
    // 📥 DESCARGAR AUDIO
    // ========================================================

    const audio = await obtenerAudio(videoUrl)

    // ========================================================
    // 📤 ENVIAR MP3
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        audio,
        mimetype: 'audio/mpeg',
        ptt: false
      },
      { quoted: m }
    )

    if (!privileged) {
      cooldowns.set(
        senderId,
        Date.now() + COOLDOWN
      )
    }

    await react(conn, m, '✅')

  } catch (error) {
    console.error(
      '❌ PLAY ERROR:',
      error.stack || error.message
    )

    await react(conn, m, '❌')

    return m.reply(
      '❌ *No pude descargar el audio.*\n\n' +
      'ꕤ Revisá los registros de Boxmine.\n' +
      'ꕤ El servidor puede necesitar yt-dlp y FFmpeg.'
    )
  }
}

// ============================================================
// 📋 CONFIGURACIÓN
// ============================================================

handler.help = [
  'play <canción>',
  'playaudio <canción>',
  'audio <canción>'
]

handler.tags = ['download']

handler.command = /^(play|playaudio|audio)$/i

handler.group = true

export default handler
