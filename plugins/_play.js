
/**
 * 📂 plugins/play.js
 * 🤖 WHATSAPP-BOT — PLAY AUDIO
 *
 * 🎵 Búsqueda de YouTube
 * 🎧 Audio MP3 compatible con WhatsApp
 * 🔄 APIs alternativas
 * 🛠️ Conversión con FFmpeg si está disponible
 * 🖼️ Miniatura e información
 * ⏳ Cooldown: 5 minutos
 * 👑 Admins y owners sin cooldown
 * ⏱️ Máximo: 7 minutos
 *
 * Baileys ES Modules
 */

import yts from 'yt-search'
import axios from 'axios'
import { spawn, spawnSync } from 'node:child_process'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const MAX_DURATION = 7 * 60
const COOLDOWN = 5 * 60 * 1000
const MAX_AUDIO_SIZE = 25 * 1024 * 1024

const cooldowns = new Map()

const FFMPEG_AVAILABLE = (() => {
  try {
    const result = spawnSync(
      'ffmpeg',
      ['-version'],
      { timeout: 5000, stdio: 'ignore' }
    )

    return result.status === 0
  } catch {
    return false
  }
})()

console.log(
  FFMPEG_AVAILABLE
    ? '✅ PLAY: FFmpeg disponible'
    : '⚠️ PLAY: FFmpeg no disponible'
)

// ============================================================
// 👑 OWNER Y ADMINISTRADORES
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

function verificarOwner(m, conn, isOwner) {
  if (isOwner || m.fromMe || m.key?.fromMe) {
    return true
  }

  const sender = decode(conn, m.sender)
  const owners = global.owner || []

  return owners.some(owner => {
    const value = Array.isArray(owner)
      ? owner[0]
      : owner

    const ownerJid = String(value || '')

    if (sender === ownerJid) return true

    // No confundir identificadores LID con teléfonos.
    if (sender.endsWith('@lid')) return false

    return numero(sender) === numero(ownerJid)
  })
}

async function verificarPrivilegios(
  m,
  conn,
  isAdmin,
  isOwner
) {
  if (verificarOwner(m, conn, isOwner)) {
    return true
  }

  if (isAdmin) return true

  if (!m.isGroup) return false

  try {
    const metadata = await conn.groupMetadata(m.chat)
    const sender = decode(conn, m.sender)

    const participante = metadata.participants.find(p =>
      decode(conn, p.id) === sender ||
      decode(conn, p.lid) === sender
    )

    return Boolean(
      participante?.admin === 'admin' ||
      participante?.admin === 'superadmin'
    )
  } catch {
    return false
  }
}

// ============================================================
// 😀 REACCIONES
// ============================================================

async function reaccion(conn, m, emoji) {
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
// 🔎 BUSCAR ID DE YOUTUBE
// ============================================================

function obtenerId(texto) {
  const match = String(texto).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#\s]*?&)?v=|shorts\/|embed\/|live\/))([a-zA-Z0-9_-]{11})/
  )

  return match?.[1] || ''
}

// ============================================================
// 🔎 EXTRAER URL DE LA API
// ============================================================

function extraerUrl(data) {
  const posibles = [
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

  for (const valor of posibles) {
    if (
      typeof valor === 'string' &&
      /^https?:\/\//i.test(valor)
    ) {
      return valor
    }
  }

  return null
}

// ============================================================
// 🎧 IDENTIFICAR FORMATO
// ============================================================

function detectarFormato(buffer, contentType) {
  const inicio = buffer.subarray(0, 16)

  if (
    inicio.toString('ascii', 0, 3) === 'ID3' ||
    (
      inicio[0] === 0xff &&
      (inicio[1] & 0xe0) === 0xe0
    )
  ) {
    return 'audio/mpeg'
  }

  if (
    inicio.toString('ascii', 0, 4) === 'OggS'
  ) {
    return 'audio/ogg'
  }

  if (
    inicio.toString('ascii', 4, 8) === 'ftyp'
  ) {
    return 'audio/mp4'
  }

  if (
    inicio.toString('ascii', 0, 4) === 'RIFF' &&
    inicio.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return 'audio/wav'
  }

  if (
    inicio[0] === 0x1a &&
    inicio[1] === 0x45 &&
    inicio[2] === 0xdf &&
    inicio[3] === 0xa3
  ) {
    return 'audio/webm'
  }

  const mime = String(contentType || '')
    .split(';')[0]
    .toLowerCase()

  if (
    [
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/ogg',
      'audio/webm',
      'audio/wav',
      'audio/aac'
    ].includes(mime)
  ) {
    return mime === 'audio/mp3'
      ? 'audio/mpeg'
      : mime
  }

  throw new Error(
    'La API no entregó un archivo de audio reconocido.'
  )
}

// ============================================================
// 📥 DESCARGAR ARCHIVO
// ============================================================

async function descargar(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    maxRedirects: 5,
    maxContentLength: MAX_AUDIO_SIZE,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'audio/*,application/octet-stream'
    }
  })

  const buffer = Buffer.from(response.data)

  if (
    buffer.length < 1024 ||
    buffer.length > MAX_AUDIO_SIZE
  ) {
    throw new Error(
      'El archivo está vacío, incompleto o es demasiado grande.'
    )
  }

  const contentType =
    response.headers['content-type'] || ''

  if (
    /text\/html|application\/json/i.test(contentType)
  ) {
    throw new Error(
      'La descarga devolvió una página o un error.'
    )
  }

  const mimetype = detectarFormato(
    buffer,
    contentType
  )

  return { buffer, mimetype }
}

// ============================================================
// 🛠️ CONVERTIR AUDIO A MP3 CON FFMPEG
// ============================================================

function convertirMP3(buffer) {
  return new Promise((resolve, reject) => {
    if (!FFMPEG_AVAILABLE) {
      return reject(
        new Error('FFmpeg no está instalado.')
      )
    }

    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-vn',
      '-map', '0:a:0',
      '-ac', '2',
      '-ar', '44100',
      '-c:a', 'libmp3lame',
      '-b:a', '128k',
      '-f', 'mp3',
      'pipe:1'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    const chunks = []
    const errors = []

    let outputSize = 0
    let finished = false

    const timeout = setTimeout(() => {
      ffmpeg.kill('SIGKILL')
      finalizar(
        new Error('FFmpeg tardó demasiado.')
      )
    }, 60000)

    function finalizar(error, result) {
      if (finished) return
      finished = true

      clearTimeout(timeout)

      if (error) reject(error)
      else resolve(result)
    }

    ffmpeg.stdout.on('data', chunk => {
      outputSize += chunk.length

      if (outputSize > MAX_AUDIO_SIZE) {
        ffmpeg.kill('SIGKILL')
        finalizar(
          new Error('El MP3 supera el tamaño permitido.')
        )
        return
      }

      chunks.push(chunk)
    })

    ffmpeg.stderr.on('data', chunk => {
      errors.push(chunk.toString())
    })

    ffmpeg.on('error', finalizar)

    ffmpeg.on('close', code => {
      if (finished) return

      const resultado = Buffer.concat(chunks)

      if (code !== 0 || resultado.length < 1024) {
        return finalizar(
          new Error(
            'Falló la conversión: ' +
            errors.join('').slice(0, 300)
          )
        )
      }

      finalizar(null, resultado)
    })

    ffmpeg.stdin.on('error', () => {})

    ffmpeg.stdin.end(buffer)
  })
}

// ============================================================
// 🔄 DESCARGAR DESDE DIFERENTES APIs
// ============================================================

async function obtenerAudio(videoUrl) {
  const encoded = encodeURIComponent(videoUrl)

  const apis = [
    {
      nombre: 'Delirius',
      url: `https://api.delirius.online/download/ytmp3?url=${encoded}`
    },
    {
      nombre: 'Starlights',
      url: `https://api.starlights.uk/api/download/ytmp3?url=${encoded}`
    },
    {
      nombre: 'Starlights V2',
      url: `https://api.starlights.uk/api/download/ytmp3v2?url=${encoded}`
    }
  ]

  const errores = []

  for (const api of apis) {
    try {
      console.log(
        `🎵 PLAY: Probando ${api.nombre}`
      )

      const respuesta = await axios.get(api.url, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      })

      const url = extraerUrl(respuesta.data)

      if (!url) {
        throw new Error(
          'No devolvió enlace de descarga.'
        )
      }

      const archivo = await descargar(url)

      let audioFinal
      let mimetype

      if (FFMPEG_AVAILABLE) {
        audioFinal = await convertirMP3(
          archivo.buffer
        )

        mimetype = 'audio/mpeg'
      } else if (
        archivo.mimetype === 'audio/mpeg'
      ) {
        audioFinal = archivo.buffer
        mimetype = 'audio/mpeg'
      } else {
        throw new Error(
          'El audio requiere FFmpeg para convertirse a MP3.'
        )
      }

      console.log(
        `✅ PLAY: Audio preparado (${audioFinal.length} bytes)`
      )

      return {
        buffer: audioFinal,
        mimetype
      }

    } catch (error) {
      console.error(
        `⚠️ PLAY ${api.nombre}: ${error.message}`
      )

      errores.push(
        `${api.nombre}: ${error.message}`
      )
    }
  }

  throw new Error(
    errores.join(' | ')
  )
}

// ============================================================
// 🎵 COMANDO PRINCIPAL
// ============================================================

let handler = async (m, {
  conn,
  text,
  isAdmin,
  isOwner
}) => {

  const query = String(text || '').trim()

  if (!query) {
    return m.reply(
      '🎵 *PLAY AUDIO*\n\n' +
      'ꕤ Escribí el nombre de una canción.\n\n' +
      '✿ Ejemplo: *.play nombre de canción*'
    )
  }

  const privileged = await verificarPrivilegios(
    m,
    conn,
    isAdmin,
    isOwner
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

      await reaccion(conn, m, '⏳')

      return m.reply(
        '⏳ *¡No atomices! JAJAJA* 🐾\n\n' +
        `ꕤ Esperá *${minutes} min ${seconds} seg*.\n\n` +
        '✿ Cooldown: 5 minutos.'
      )
    }
  }

  await reaccion(conn, m, '🎧')

  try {
    // ========================================================
    // 🔎 BUSCAR VIDEO
    // ========================================================

    const idDirecto = obtenerId(query)

    let video

    if (idDirecto) {
      const resultado = await yts({
        videoId: idDirecto
      })

      video = resultado
    } else {
      const resultado = await yts(query)

      video = resultado.videos?.[0]
    }

    if (!video) {
      await reaccion(conn, m, '❌')

      return m.reply(
        '❌ No encontré esa canción.'
      )
    }

    const videoId =
      video.videoId || idDirecto

    if (!videoId) {
      throw new Error(
        'No se encontró el ID del video.'
      )
    }

    const videoUrl =
      `https://youtu.be/${videoId}`

    const title =
      String(video.title || 'Sin título')

    const channel =
      String(video.author?.name || 'Desconocido')

    const duration =
      String(video.timestamp || 'Desconocida')

    const seconds =
      Number(video.seconds) || 0

    // ========================================================
    // ⏱️ DURACIÓN MÁXIMA
    // ========================================================

    if (seconds > MAX_DURATION) {
      await reaccion(conn, m, '❌')

      return m.reply(
        `❌ *Audio demasiado largo*\n\n` +
        `🎵 ${title}\n` +
        `⏱️ Duración: ${duration}\n\n` +
        'ꕤ Máximo permitido: 7 minutos.'
      )
    }

    // ========================================================
    // 🖼️ ENVIAR MINIATURA
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
        '⚠️ No se pudo enviar miniatura:',
        error.message
      )
    }

    // ========================================================
    // 📥 DESCARGAR Y CONVERTIR
    // ========================================================

    const audio = await obtenerAudio(videoUrl)

    // ========================================================
    // 📤 ENVIAR MP3 REAL
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        audio: audio.buffer,
        mimetype: audio.mimetype,
        ptt: false
      },
      { quoted: m }
    )

    // Cooldown únicamente después de enviar.
    if (!privileged) {
      cooldowns.set(
        senderId,
        Date.now() + COOLDOWN
      )
    }

    await reaccion(conn, m, '✅')

  } catch (error) {
    console.error(
      '❌ PLAY ERROR:',
      error.stack || error.message
    )

    await reaccion(conn, m, '❌')

    return m.reply(
      '❌ *No pude preparar el audio.*\n\n' +
      'ꕤ Revisá los registros de Boxmine.\n' +
      'ꕤ Puede fallar la API o faltar FFmpeg.'
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
