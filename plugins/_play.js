
/**
 * 📂 plugins/_play.js
 * 🤖 WHATSAPP-BOT — PLAY AUDIO
 *
 * .play
 * .playaudio
 * .audio
 *
 * Cooldown: 5 minutos
 * Admins y owners: sin cooldown
 * Duración máxima: 7 minutos
 */

import yts from 'yt-search'
import axios from 'axios'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const MAX_SECONDS = 420
const COOLDOWN_MS = 300000
const MAX_BYTES = 25 * 1024 * 1024
const cooldowns = new Map()

// ============================================================
// ⚙️ PROGRAMAS DISPONIBLES
// ============================================================

function available(name) {
  try {
    const result = spawnSync(
      name,
      ['--version'],
      { timeout: 5000, stdio: 'ignore' }
    )

    return result.status === 0
  } catch {
    return false
  }
}

const HAS_FFMPEG = available('ffmpeg')
const HAS_YTDLP = available('yt-dlp')

console.log(
  `[PLAY] yt-dlp=${HAS_YTDLP} | FFmpeg=${HAS_FFMPEG}`
)

// ============================================================
// 👑 PERMISOS
// ============================================================

function userId(value, conn) {
  if (!value) return ''

  try {
    if (conn && conn.decodeJid) {
      value = conn.decodeJid(value) || value
    }
  } catch {}

  return String(value)
    .split(':')[0]
    .split('@')[0]
}

function owner(m, conn, ctx) {
  if (
    ctx.isOwner ||
    ctx.isROwner ||
    m.fromMe ||
    (m.key && m.key.fromMe)
  ) return true

  const sender = m.sender || m.participant || ''

  const owners = Array.isArray(global.owner)
    ? global.owner
    : []

  return owners.some(function(o) {
    const value = Array.isArray(o) ? o[0] : o

    if (String(value) === String(sender)) {
      return true
    }

    if (String(sender).endsWith('@lid')) {
      return false
    }

    return (
      userId(value, conn) ===
      userId(sender, conn)
    )
  })
}

async function privileged(m, conn, ctx) {
  if (
    owner(m, conn, ctx) ||
    ctx.isAdmin
  ) return true

  if (!m.isGroup) return false

  try {
    const metadata = await conn.groupMetadata(m.chat)
    const sender = m.sender || m.participant

    const participant = metadata.participants.find(
      function(p) {
        return [p.id, p.jid, p.lid].some(
          function(id) {
            return id && id === sender
          }
        )
      }
    )

    return Boolean(
      participant &&
      (
        participant.admin ||
        participant.isAdmin ||
        participant.isSuperAdmin
      )
    )
  } catch {
    return false
  }
}

// ============================================================
// 😀 REACCIONES Y RESPUESTAS
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

async function respond(conn, m, text) {
  if (typeof m.reply === 'function') {
    return m.reply(text)
  }

  return conn.sendMessage(
    m.chat,
    { text },
    { quoted: m }
  )
}

// ============================================================
// 🔎 BUSCAR EN YOUTUBE
// ============================================================

function videoId(text) {
  const match = String(text).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#\s]*?&)?v=|shorts\/|embed\/|live\/))([a-zA-Z0-9_-]{11})/
  )

  return match ? match[1] : ''
}

async function findVideo(query) {
  const id = videoId(query)

  if (id) {
    const info = await yts({ videoId: id })

    if (!info || !info.videoId) {
      throw new Error(
        'No pude consultar ese video.'
      )
    }

    return info
  }

  const result = await yts(query)

  if (!result || !result.videos || !result.videos.length) {
    throw new Error('No encontré esa canción.')
  }

  return result.videos[0]
}

// ============================================================
// 🛠️ EJECUTAR PROGRAMAS
// ============================================================

function run(bin, args, timeout = 120000) {
  return new Promise(function(resolve, reject) {
    let done = false
    let stderr = ''
    let child

    try {
      child = spawn(bin, args, {
        stdio: ['ignore', 'ignore', 'pipe']
      })
    } catch (error) {
      reject(error)
      return
    }

    const timer = setTimeout(function() {
      child.kill('SIGKILL')
      finish(new Error(bin + ': tiempo agotado'))
    }, timeout)

    function finish(error) {
      if (done) return

      done = true
      clearTimeout(timer)

      if (error) reject(error)
      else resolve()
    }

    child.stderr.on('data', function(buffer) {
      stderr = (
        stderr + buffer.toString()
      ).slice(-3000)
    })

    child.on('error', finish)

    child.on('close', function(code) {
      finish(
        code === 0
          ? null
          : new Error(
              stderr.slice(-500) ||
              bin + ': código ' + code
            )
      )
    })
  })
}

// ============================================================
// 🎧 VALIDAR ARCHIVOS
// ============================================================

function isMP3(buffer) {
  return (
    buffer.length > 4 &&
    (
      buffer.toString('ascii', 0, 3) === 'ID3' ||
      (
        buffer[0] === 255 &&
        (buffer[1] & 224) === 224
      )
    )
  )
}

function isAudio(buffer, type = '') {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 1024 ||
    buffer.length > MAX_BYTES
  ) return false

  const head = buffer
    .subarray(0, 200)
    .toString('utf8')
    .trimStart()
    .toLowerCase()

  if (
    head.startsWith('<!doctype') ||
    head.startsWith('<html') ||
    head.startsWith('{') ||
    head.startsWith('[')
  ) return false

  if (
    /text\/html|application\/json|text\/plain/.test(type)
  ) return false

  return (
    isMP3(buffer) ||
    buffer.toString('ascii', 0, 4) === 'OggS' ||
    buffer.toString('ascii', 0, 4) === 'fLaC' ||
    buffer.toString('ascii', 4, 8) === 'ftyp' ||
    buffer.toString('ascii', 0, 4) === 'RIFF' ||
    (
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    )
  )
}

// ============================================================
// 🔄 CONVERTIR A MP3
// ============================================================

async function convertMP3(buffer) {
  if (isMP3(buffer)) return buffer

  if (!HAS_FFMPEG) {
    throw new Error(
      'El archivo no es MP3 y FFmpeg no está instalado.'
    )
  }

  const folder = await fs.mkdtemp(
    path.join(os.tmpdir(), 'wa-convert-')
  )

  try {
    const input = path.join(folder, 'in.bin')
    const output = path.join(folder, 'out.mp3')

    await fs.writeFile(input, buffer)

    await run('ffmpeg', [
      '-y',
      '-hide_banner',
      '-loglevel', 'error',
      '-i', input,
      '-vn',
      '-c:a', 'libmp3lame',
      '-b:a', '128k',
      output
    ], 90000)

    const result = await fs.readFile(output)

    if (
      !isMP3(result) ||
      result.length > MAX_BYTES
    ) {
      throw new Error(
        'FFmpeg no generó un MP3 válido.'
      )
    }

    return result

  } finally {
    await fs.rm(folder, {
      recursive: true,
      force: true
    }).catch(function() {})
  }
}

// ============================================================
// 🎵 DESCARGA CON YT-DLP
// ============================================================

async function localDownload(url) {
  if (!HAS_YTDLP || !HAS_FFMPEG) {
    throw new Error(
      'yt-dlp o FFmpeg no están instalados.'
    )
  }

  const folder = await fs.mkdtemp(
    path.join(os.tmpdir(), 'wa-play-')
  )

  try {
    const template = path.join(
      folder,
      'audio.%(ext)s'
    )

    await run('yt-dlp', [
      '--no-playlist',
      '--no-progress',
      '--no-warnings',
      '--socket-timeout', '20',
      '--retries', '2',
      '-f', 'bestaudio/best',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '128K',
      '-o', template,
      url
    ], 120000)

    const files = await fs.readdir(folder)

    const mp3 = files.find(function(file) {
      return file.endsWith('.mp3')
    })

    if (!mp3) {
      throw new Error(
        'yt-dlp no generó el archivo MP3.'
      )
    }

    const audio = await fs.readFile(
      path.join(folder, mp3)
    )

    if (
      !isMP3(audio) ||
      audio.length > MAX_BYTES
    ) {
      throw new Error(
        'MP3 inválido o demasiado grande.'
      )
    }

    return audio

  } finally {
    await fs.rm(folder, {
      recursive: true,
      force: true
    }).catch(function() {})
  }
}

// ============================================================
// 🌐 RESPALDO DELIRIUS
// ============================================================

function findAudioUrl(data, depth = 0) {
  if (depth > 5 || !data) return null

  if (typeof data === 'string') {
    if (
      /^https:\/\//i.test(data) &&
      !/(youtube\.com|youtu\.be)/i.test(data)
    ) {
      return data
    }

    return null
  }

  if (typeof data !== 'object') {
    return null
  }

  const keys = [
    'download',
    'dl',
    'dl_url',
    'audio',
    'url',
    'link',
    'result',
    'data',
    'downloads'
  ]

  for (const key of keys) {
    if (data[key] != null) {
      const found = findAudioUrl(
        data[key],
        depth + 1
      )

      if (found) return found
    }
  }

  return null
}

async function apiDownload(url) {
  console.log('[PLAY] Probando Delirius')

  const response = await axios.get(
    'https://api.delirius.online/download/ytmp3',
    {
      params: { url },
      timeout: 25000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    }
  )

  const direct = findAudioUrl(response.data)

  if (!direct) {
    throw new Error(
      'Delirius no devolvió enlace de audio.'
    )
  }

  const file = await axios.get(direct, {
    responseType: 'arraybuffer',
    timeout: 45000,
    maxRedirects: 5,
    maxContentLength: MAX_BYTES,
    maxBodyLength: MAX_BYTES,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'audio/*,application/octet-stream,*/*'
    }
  })

  const buffer = Buffer.from(file.data)

  const type = String(
    file.headers['content-type'] || ''
  ).toLowerCase()

  if (!isAudio(buffer, type)) {
    throw new Error(
      'Delirius devolvió HTML, JSON o datos que no son audio.'
    )
  }

  return convertMP3(buffer)
}

// ============================================================
// 🎵 OBTENER AUDIO
// ============================================================

async function getAudio(url) {
  const errors = []

  if (HAS_YTDLP && HAS_FFMPEG) {
    try {
      console.log('[PLAY] Probando yt-dlp')
      return await localDownload(url)
    } catch (error) {
      console.warn(
        '[PLAY] yt-dlp:',
        error.message
      )

      errors.push(
        'yt-dlp: ' + error.message
      )
    }
  } else {
    console.warn(
      '[PLAY] yt-dlp/FFmpeg no disponibles. Usando respaldo.'
    )
  }

  try {
    return await apiDownload(url)
  } catch (error) {
    console.warn(
      '[PLAY] Delirius:',
      error.message
    )

    errors.push(
      'Delirius: ' + error.message
    )
  }

  throw new Error(
    errors.join(' | ') ||
    'No hay método de descarga disponible.'
  )
}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, ctx = {}) => {
  const conn = ctx.conn

  const query = String(
    ctx.text ||
    (
      Array.isArray(ctx.args)
        ? ctx.args.join(' ')
        : ''
    )
  ).trim()

  if (!query) {
    return respond(
      conn,
      m,
      '🎵 *PLAY AUDIO*\n\n' +
      'Uso: *.play nombre de canción*'
    )
  }

  const bypass = await privileged(
    m,
    conn,
    ctx
  )

  const sender =
    m.sender ||
    m.participant ||
    m.chat

  const now = Date.now()

  if (
    !bypass &&
    now < (cooldowns.get(sender) || 0)
  ) {
    const left = Math.ceil(
      (cooldowns.get(sender) - now) / 1000
    )

    return respond(
      conn,
      m,
      '⏳ *¡No atomices! JAJAJA* 🐾\n\n' +
      `Esperá ${Math.floor(left / 60)} min ${left % 60} seg.`
    )
  }

  await react(conn, m, '🎧')

  try {
    const video = await findVideo(query)

    const id =
      video.videoId ||
      videoId(query)

    if (!id) {
      throw new Error(
        'No encontré el ID del video.'
      )
    }

    const seconds = Number(
      video.seconds
    ) || 0

    if (seconds > MAX_SECONDS) {
      await react(conn, m, '❌')

      return respond(
        conn,
        m,
        '❌ *Audio demasiado largo*\n\n' +
        `🎵 ${video.title}\n` +
        '⏱️ Máximo: 7 minutos.'
      )
    }

    const url = `https://youtu.be/${id}`

    // Descargar primero para evitar mensajes
    // de preparación cuando falla el servicio.
    const audio = await getAudio(url)

    const caption =
      `🎵 *${video.title || 'Canción'}*\n` +
      `👤 ${
        video.author && video.author.name
          ? video.author.name
          : 'Desconocido'
      }\n` +
      `⏱️ ${video.timestamp || 'Sin datos'}\n` +
      `🔗 ${url}`

    try {
      await conn.sendMessage(
        m.chat,
        {
          image: {
            url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
          },
          caption
        },
        { quoted: m }
      )
    } catch {
      await respond(conn, m, caption)
    }

    await conn.sendMessage(
      m.chat,
      {
        audio,
        mimetype: 'audio/mpeg',
        ptt: false
      },
      { quoted: m }
    )

    if (!bypass) {
      cooldowns.set(
        sender,
        Date.now() + COOLDOWN_MS
      )
    }

    await react(conn, m, '✅')

  } catch (error) {
    console.error(
      '❌ PLAY ERROR:',
      error.stack || error.message
    )

    await react(conn, m, '❌')

    return respond(
      conn,
      m,
      '❌ *No pude descargar el audio.*\n\n' +
      'El servicio de descarga no respondió correctamente. ' +
      'Revisá la consola del bot.'
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
