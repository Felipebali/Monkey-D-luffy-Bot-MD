
/**
 * 📂 plugins/_play.js
 * 🤖 WHATSAPP-BOT — PLAY AUDIO
 *
 * Requiere:
 * npm install @distube/ytdl-core yt-search axios
 *
 * Audio MP4/AAC sin FFmpeg ni yt-dlp.
 *
 * Comandos:
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

const MAX_SECONDS = 420
const MAX_BYTES = 25 * 1024 * 1024
const COOLDOWN = 5 * 60 * 1000

const cooldowns = new Map()
const inProgress = new Set()

// ============================================================
// 📝 REGISTROS
// ============================================================

function log(message) {
  console.log('[PLAY]', message)
}

function errorText(error) {
  return String(
    (error && error.message) || error
  )
}

// ============================================================
// 👑 PERMISOS
// ============================================================

function normalized(jid, conn) {
  try {
    return String(
      conn.decodeJid(jid) || jid
    )
  } catch {
    return String(jid || '')
  }
}

function isOwner(m, conn, ctx) {
  if (
    ctx.isOwner ||
    ctx.isROwner ||
    m.fromMe ||
    (m.key && m.key.fromMe)
  ) {
    return true
  }

  const sender = normalized(
    m.sender || m.participant,
    conn
  )

  const owners = Array.isArray(global.owner)
    ? global.owner
    : []

  return owners.some(entry => {
    const value = Array.isArray(entry)
      ? entry[0]
      : entry

    const configured = String(value || '')

    if (sender === configured) {
      return true
    }

    // No equiparar LID con un número
    // telefónico sin un mapeo confiable.
    if (sender.endsWith('@lid')) {
      return false
    }

    const digits = s => String(s)
      .split('@')[0]
      .split(':')[0]
      .replace(/\D/g, '')

    return Boolean(
      digits(sender) &&
      digits(sender) === digits(configured)
    )
  })
}

async function privileged(m, conn, ctx) {
  if (
    isOwner(m, conn, ctx) ||
    ctx.isAdmin
  ) {
    return true
  }

  if (!m.isGroup) {
    return false
  }

  try {
    const metadata = await conn.groupMetadata(
      m.chat
    )

    const sender = normalized(
      m.sender || m.participant,
      conn
    )

    return metadata.participants.some(p =>
      [p.id, p.jid, p.lid].some(id =>
        id &&
        normalized(id, conn) === sender
      ) &&
      Boolean(
        p.admin ||
        p.isAdmin ||
        p.isSuperAdmin
      )
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

function reply(conn, m, text) {
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
// 🔎 YOUTUBE
// ============================================================

function idFromUrl(text) {
  const match = String(text).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#\s]*?&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/
  )

  return match ? match[1] : ''
}

async function findVideo(query) {
  const id = idFromUrl(query)

  if (id) {
    const info = await yts({
      videoId: id
    })

    if (!info || !info.videoId) {
      throw new Error(
        'No se encontró ese video.'
      )
    }

    return info
  }

  const result = await yts(query)

  if (
    !result ||
    !result.videos ||
    !result.videos.length
  ) {
    throw new Error(
      'No se encontraron canciones.'
    )
  }

  return result.videos[0]
}

// ============================================================
// 🎧 VALIDAR AUDIO
// ============================================================

function audioType(buffer, contentType = '') {
  const head = buffer
    .subarray(0, 200)
    .toString('utf8')
    .trimStart()
    .toLowerCase()

  if (
    head.startsWith('<') ||
    head.startsWith('{') ||
    head.startsWith('[')
  ) {
    return ''
  }

  if (
    /html|json|text\/plain/i.test(contentType)
  ) {
    return ''
  }

  if (
    buffer.subarray(0, 3).toString() === 'ID3' ||
    (
      buffer[0] === 255 &&
      (buffer[1] & 224) === 224
    )
  ) {
    return 'audio/mpeg'
  }

  if (
    buffer.subarray(4, 8).toString() === 'ftyp'
  ) {
    return 'audio/mp4'
  }

  if (
    buffer.subarray(0, 4).toString() === 'OggS'
  ) {
    return 'audio/ogg; codecs=opus'
  }

  return ''
}

function verifyAudio(buffer, type = '') {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 1024 ||
    buffer.length > MAX_BYTES
  ) {
    throw new Error(
      'Audio vacío o demasiado grande.'
    )
  }

  const mime = audioType(buffer, type)

  if (!mime) {
    throw new Error(
      'El servidor devolvió datos que no son audio compatible.'
    )
  }

  return {
    buffer,
    mimetype: mime
  }
}

// ============================================================
// 📥 STREAM A BUFFER
// ============================================================

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let done = false

    const timer = setTimeout(() => {
      finish(
        new Error(
          'La descarga agotó el tiempo de espera.'
        )
      )
    }, 90000)

    function finish(err, value) {
      if (done) return

      done = true
      clearTimeout(timer)

      if (err) {
        if (
          typeof stream.destroy === 'function'
        ) {
          stream.destroy()
        }

        reject(err)
      } else {
        resolve(value)
      }
    }

    stream.on('data', chunk => {
      size += chunk.length

      if (size > MAX_BYTES) {
        return finish(
          new Error(
            'El audio supera los 25 MB.'
          )
        )
      }

      chunks.push(chunk)
    })

    stream.on('end', () => {
      finish(
        null,
        Buffer.concat(chunks)
      )
    })

    stream.on('error', err => {
      finish(err)
    })
  })
}

// ============================================================
// 🎵 DESCARGA DIRECTA YOUTUBE
// ============================================================

async function youtubeDownload(url) {
  let module

  try {
    module = await import(
      '@distube/ytdl-core'
    )
  } catch {
    throw new Error(
      'Falta @distube/ytdl-core. Instalá la dependencia con npm.'
    )
  }

  const ytdl = module.default || module

  const info = await ytdl.getInfo(url)

  const formats = (
    info.formats || []
  ).filter(f =>
    f.hasAudio &&
    !f.hasVideo &&
    f.container === 'mp4' &&
    (
      !f.contentLength ||
      Number(f.contentLength) <= MAX_BYTES
    )
  )

  formats.sort(
    (a, b) =>
      (b.audioBitrate || 0) -
      (a.audioBitrate || 0)
  )

  if (!formats.length) {
    throw new Error(
      'YouTube no ofreció audio MP4/AAC compatible.'
    )
  }

  let lastError

  for (const format of formats.slice(0, 3)) {
    try {
      const stream = ytdl.downloadFromInfo(
        info,
        {
          format,
          highWaterMark: 1 << 25
        }
      )

      const buffer = await streamToBuffer(
        stream
      )

      const audio = verifyAudio(buffer)

      if (
        audio.mimetype !== 'audio/mp4'
      ) {
        throw new Error(
          'El formato descargado no es MP4.'
        )
      }

      return audio

    } catch (err) {
      lastError = err
    }
  }

  throw (
    lastError ||
    new Error(
      'Falló la descarga directa de YouTube.'
    )
  )
}

// ============================================================
// 🌐 EXTRAER URL DE RESPALDO
// ============================================================

function findLink(obj, depth = 0) {
  if (
    depth > 5 ||
    obj == null
  ) {
    return ''
  }

  if (typeof obj === 'string') {
    return (
      /^https:\/\//i.test(obj) &&
      !/youtu(?:be\.com|\.be)/i.test(obj)
    )
      ? obj
      : ''
  }

  if (typeof obj !== 'object') {
    return ''
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
    if (obj[key] != null) {
      const found = findLink(
        obj[key],
        depth + 1
      )

      if (found) {
        return found
      }
    }
  }

  return ''
}

// ============================================================
// 🌐 RESPALDO DELIRIUS
// ============================================================

async function deliriusDownload(url) {
  const response = await axios.get(
    'https://api.delirius.online/download/ytmp3',
    {
      params: { url },
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    }
  )

  const link = findLink(response.data)

  if (!link) {
    throw new Error(
      'Delirius no entregó un enlace válido.'
    )
  }

  const file = await axios.get(link, {
    responseType: 'arraybuffer',
    timeout: 45000,
    maxRedirects: 4,
    maxContentLength: MAX_BYTES,
    maxBodyLength: MAX_BYTES,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'audio/*,application/octet-stream'
    }
  })

  return verifyAudio(
    Buffer.from(file.data),
    String(
      file.headers['content-type'] || ''
    )
  )
}

// ============================================================
// 🔄 MÉTODOS DE DESCARGA
// ============================================================

async function getAudio(url) {
  const errors = []

  const methods = [
    ['YouTube directo', youtubeDownload],
    ['Delirius', deliriusDownload]
  ]

  for (const [name, download] of methods) {
    try {
      log('Probando ' + name)

      return await download(url)

    } catch (err) {
      log(
        name + ': ' + errorText(err)
      )

      errors.push(
        name + ': ' + errorText(err)
      )
    }
  }

  throw new Error(
    errors.join(' | ')
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
    return reply(
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

  const sender = normalized(
    m.sender ||
    m.participant ||
    m.chat,
    conn
  )

  const expiresAt =
    cooldowns.get(sender) || 0

  if (
    !bypass &&
    Date.now() < expiresAt
  ) {
    const seconds = Math.ceil(
      (expiresAt - Date.now()) / 1000
    )

    return reply(
      conn,
      m,
      '⏳ *¡No atomices! JAJAJA* 🐾\n\n' +
      `Esperá ${Math.floor(seconds / 60)} min ${seconds % 60} seg.`
    )
  }

  if (inProgress.has(sender)) {
    return reply(
      conn,
      m,
      '⏳ Ya estoy preparando tu audio.'
    )
  }

  inProgress.add(sender)

  await react(conn, m, '🎧')

  try {
    // Buscar video.
    const video = await findVideo(query)

    const id =
      video.videoId ||
      idFromUrl(query)

    if (!id) {
      throw new Error(
        'No se pudo obtener el ID de YouTube.'
      )
    }

    const seconds =
      Number(video.seconds) || 0

    // Límite de 7 minutos.
    if (seconds > MAX_SECONDS) {
      await react(conn, m, '❌')

      return reply(
        conn,
        m,
        '❌ *Audio demasiado largo.*\n\n' +
        'Máximo permitido: 7 minutos.'
      )
    }

    if (!seconds) {
      throw new Error(
        'No pude comprobar la duración del video.'
      )
    }

    const url =
      'https://youtu.be/' + id

    // Descargar antes de enviar la miniatura.
    const audio = await getAudio(url)

    const caption =
      `🎵 *${video.title || 'Canción'}*\n` +
      `👤 ${
        (
          video.author &&
          video.author.name
        ) || 'Desconocido'
      }\n` +
      `⏱️ ${video.timestamp || 'Sin datos'}\n` +
      `🔗 ${url}`

    // Enviar información.
    try {
      await conn.sendMessage(
        m.chat,
        {
          image: {
            url:
              `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
          },
          caption
        },
        { quoted: m }
      )
    } catch {
      await reply(
        conn,
        m,
        caption
      )
    }

    // Enviar audio.
    await conn.sendMessage(
      m.chat,
      {
        audio: audio.buffer,
        mimetype: audio.mimetype,
        ptt: false
      },
      { quoted: m }
    )

    // Aplicar cooldown solo después
    // de enviar el audio correctamente.
    if (!bypass) {
      cooldowns.set(
        sender,
        Date.now() + COOLDOWN
      )
    }

    await react(conn, m, '✅')

  } catch (err) {
    console.error(
      '❌ PLAY ERROR:',
      err.stack || err.message
    )

    await react(conn, m, '❌')

    await reply(
      conn,
      m,
      '❌ *No pude descargar el audio.*\n\n' +
      'Revisá la consola del bot.'
    )

  } finally {
    inProgress.delete(sender)
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

handler.command =
  /^(play|playaudio|audio)$/i

handler.group = true

export default handler
