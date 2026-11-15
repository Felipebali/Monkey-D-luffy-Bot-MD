
/**
 * 📂 plugins/_play.js
 * 🤖 WHATSAPP-BOT — PLAY COMPLETO
 *
 * Comandos:
 * .play / .playaudio / .audio / .musica
 * .play2 / .video
 * .play3 / .playdoc
 * .play4 / .playdoc2
 *
 * Duración máxima: 7 minutos
 * Cooldown: 5 minutos
 * Admins y owners sin cooldown
 *
 * Dependencias:
 * npm install yt-search axios
 *
 * SaveTube y OGMP3 son opcionales.
 * No requiere FFmpeg ni yt-dlp.
 */

import yts from 'yt-search'
import axios from 'axios'

const MAX_DURATION = 420
const COOLDOWN = 300000
const MAX_AUDIO = 25 * 1024 * 1024
const MAX_VIDEO = 80 * 1024 * 1024

const cooldowns = new Map()
const processing = new Set()

// ============================================================
// 📦 CARGAR SERVICIOS OPCIONALES
// ============================================================

let savetube = null
let ogmp3 = null

try {
  const module = await import('../lib/yt-savetube.js')
  savetube = module.savetube || module.default
  console.log('[PLAY] SaveTube cargado')
} catch {
  console.log('[PLAY] SaveTube no disponible')
}

try {
  const module = await import('../lib/youtubedl.js')
  ogmp3 = module.ogmp3 || module.default
  console.log('[PLAY] OGMP3 cargado')
} catch {
  console.log('[PLAY] OGMP3 no disponible')
}

// ============================================================
// 🔧 FUNCIONES GENERALES
// ============================================================

function errorMessage(error) {
  return String(error?.message || error)
}

function youtubeId(text) {
  const match = String(text).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#\s]*?&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/
  )

  return match?.[1] || ''
}

function getSender(m) {
  return String(
    m.sender || m.participant || m.chat
  )
}

function phone(jid) {
  return String(jid || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

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

async function reply(conn, m, text) {
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
// 👑 OWNERS Y ADMINS
// ============================================================

function isOwner(m, conn, ctx) {
  if (
    ctx.isOwner ||
    ctx.isROwner ||
    m.fromMe ||
    m.key?.fromMe
  ) return true

  const sender = getSender(m)

  const owners = Array.isArray(global.owner)
    ? global.owner
    : []

  return owners.some(item => {
    const value = String(
      Array.isArray(item) ? item[0] : item
    )

    if (value === sender) return true

    // Evitar confundir LID con número.
    if (sender.endsWith('@lid')) {
      return false
    }

    return Boolean(
      phone(sender) &&
      phone(sender) === phone(value)
    )
  })
}

async function isPrivileged(m, conn, ctx) {
  if (
    isOwner(m, conn, ctx) ||
    ctx.isAdmin
  ) return true

  if (!m.isGroup) return false

  try {
    const group = await conn.groupMetadata(m.chat)
    const sender = getSender(m)

    return group.participants.some(p => {
      const ids = [p.id, p.jid, p.lid]

      return (
        ids.includes(sender) &&
        Boolean(
          p.admin ||
          p.isAdmin ||
          p.isSuperAdmin
        )
      )
    })
  } catch {
    return false
  }
}

// ============================================================
// 🔎 BUSCAR YOUTUBE
// ============================================================

async function searchVideo(query) {
  const id = youtubeId(query)

  if (id) {
    const result = await yts({
      videoId: id
    })

    if (!result?.videoId) {
      throw new Error('Video no encontrado')
    }

    return result
  }

  const result = await yts(query)

  if (!result?.videos?.length) {
    throw new Error('No encontré la canción')
  }

  return result.videos[0]
}

// ============================================================
// 🔗 EXTRAER ENLACES DE APIs
// ============================================================

function extractUrl(value, depth = 0) {
  if (!value || depth > 6) return ''

  if (typeof value === 'string') {
    if (
      /^https?:\/\//i.test(value) &&
      !/youtube\.com|youtu\.be/i.test(value)
    ) {
      return value
    }

    return ''
  }

  if (typeof value !== 'object') {
    return ''
  }

  const keys = [
    'download',
    'downloadUrl',
    'download_url',
    'download_url_full',
    'dl_download',
    'dl_url',
    'stream_url_full',
    'audio',
    'video',
    'media',
    'url',
    'link',
    'dl',
    'result',
    'data',
    'medias'
  ]

  for (const key of keys) {
    if (value[key] != null) {
      const result = extractUrl(
        value[key],
        depth + 1
      )

      if (result) return result
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = extractUrl(
        item,
        depth + 1
      )

      if (result) return result
    }
  }

  return ''
}

// ============================================================
// 🎧 VALIDAR FORMATO
// ============================================================

function detectFormat(buffer) {
  if (buffer.length < 12) return ''

  if (
    buffer.toString('ascii', 0, 3) === 'ID3' ||
    (
      buffer[0] === 0xff &&
      (buffer[1] & 0xe0) === 0xe0
    )
  ) {
    return 'audio/mpeg'
  }

  if (
    buffer.toString('ascii', 0, 4) === 'OggS'
  ) {
    return 'audio/ogg; codecs=opus'
  }

  if (
    buffer.toString('ascii', 0, 4) === 'fLaC'
  ) {
    return 'audio/flac'
  }

  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return 'audio/wav'
  }

  if (
    buffer.toString('ascii', 4, 8) === 'ftyp'
  ) {
    const brand = buffer
      .toString('ascii', 8, 12)
      .toLowerCase()

    if (brand.startsWith('m4a')) {
      return 'audio/mp4'
    }

    return 'video/mp4'
  }

  return ''
}

// ============================================================
// 📥 DESCARGAR ARCHIVO
// ============================================================

async function downloadFile(url, kind) {
  const limit = kind === 'video'
    ? MAX_VIDEO
    : MAX_AUDIO

  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Enlace inválido')
  }

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 45000,
    maxRedirects: 5,
    maxContentLength: limit,
    maxBodyLength: limit,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: '*/*'
    }
  })

  const buffer = Buffer.from(response.data)

  if (
    buffer.length < 1024 ||
    buffer.length > limit
  ) {
    throw new Error(
      'Archivo vacío o demasiado grande'
    )
  }

  const contentType = String(
    response.headers['content-type'] || ''
  ).toLowerCase()

  if (
    /text\/html|application\/json|text\/plain/.test(contentType)
  ) {
    throw new Error(
      'El servidor devolvió HTML o JSON'
    )
  }

  const header = buffer
    .subarray(0, 100)
    .toString('utf8')
    .trimStart()

  if (/^(<|\{|\[)/.test(header)) {
    throw new Error(
      'La respuesta no contiene audio o video'
    )
  }

  let mimetype = detectFormat(buffer)

  if (
    kind === 'audio' &&
    mimetype === 'video/mp4'
  ) {
    // Algunos proveedores entregan M4A
    // con marca MP4 genérica.
    // Solo aceptar cuando el servidor
    // identifica el contenido como audio.
    if (contentType.startsWith('audio/')) {
      mimetype = 'audio/mp4'
    }
  }

  if (
    kind === 'audio' &&
    !mimetype.startsWith('audio/')
  ) {
    throw new Error(
      'El archivo no es audio compatible'
    )
  }

  if (
    kind === 'video' &&
    mimetype !== 'video/mp4'
  ) {
    throw new Error(
      'El archivo no es video MP4 compatible'
    )
  }

  return {
    buffer,
    mimetype
  }
}

// ============================================================
// 🌐 CONSULTAR SERVICIOS
// ============================================================

async function requestApi(url) {
  const response = await axios.get(url, {
    timeout: 18000,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  })

  return response.data
}

// ============================================================
// 🎵 LISTA DE PROVEEDORES
// ============================================================

function getProviders(video, kind) {
  const url = video.url
  const encoded = encodeURIComponent(url)
  const title = encodeURIComponent(
    video.title || ''
  )

  const audio = kind === 'audio'
  const providers = []

  // SaveTube, si existe.
  if (savetube?.download) {
    providers.push({
      name: 'SaveTube',
      run: () => savetube.download(
        url,
        audio ? 'mp3' : '720'
      )
    })
  }

  // OGMP3, si existe.
  if (ogmp3?.download) {
    providers.push({
      name: 'OGMP3',
      run: () => ogmp3.download(
        url,
        audio ? '128' : '720',
        kind
      )
    })
  }

  // Mitzuki, si hay API_KEY.
  if (process.env.API_KEY) {
    providers.push({
      name: 'Mitzuki',
      run: () => requestApi(
        'https://api.mitzuki.xyz/download/youtube' +
        '?url=' + encoded +
        '&type=' + kind +
        '&format=' + (audio ? 'mp3' : 'mp4') +
        '&apikey=' +
        encodeURIComponent(process.env.API_KEY)
      )
    })

    providers.push({
      name: 'Mitzuki V2',
      run: () => requestApi(
        'https://api.mitzuki.xyz/download/youtube2' +
        '?url=' + encoded +
        '&apikey=' +
        encodeURIComponent(process.env.API_KEY)
      )
    })
  }

  providers.push({
    name: 'Dorratz',
    run: () => requestApi(
      'https://api.dorratz.com/v3/ytdl?url=' +
      encoded
    )
  })

  providers.push({
    name: 'Exonity',
    run: () => requestApi(
      'https://exonity.tech/api/dl/' +
      (audio ? 'playmp3' : 'playmp4') +
      '?query=' + title
    )
  })

  if (audio) {
    providers.push({
      name: 'DV-YER',
      run: () => requestApi(
        'https://dv-yer-api.online/ytmp3' +
        '?mode=link&url=' + encoded
      )
    })

    providers.push({
      name: 'Zenkey',
      run: () => requestApi(
        'https://api.zenkey.my.id/api/download/ytmp3' +
        '?apikey=zenkey&url=' + encoded
      )
    })

    providers.push({
      name: 'Delirius',
      run: () => requestApi(
        'https://api.delirius.online/download/ytmp3' +
        '?url=' + encoded
      )
    })
  } else {
    providers.push({
      name: 'Siputzx',
      run: () => requestApi(
        'https://api.siputzx.my.id/api/d/ytmp4' +
        '?url=' + encoded
      )
    })
  }

  return providers
}

// ============================================================
// 🔄 DESCARGA CON RESPALDOS
// ============================================================

async function getMedia(video, kind) {
  const errors = []
  const providers = getProviders(video, kind)

  for (const provider of providers) {
    try {
      console.log(
        '[PLAY] Probando ' + provider.name
      )

      const result = await provider.run()
      const url = extractUrl(result)

      if (!url) {
        throw new Error(
          'No devolvió enlace de descarga'
        )
      }

      const media = await downloadFile(
        url,
        kind
      )

      console.log(
        '[PLAY] Descarga correcta: ' +
        provider.name
      )

      return media

    } catch (error) {
      const message =
        provider.name + ': ' +
        errorMessage(error)

      console.warn('[PLAY]', message)

      errors.push(message)
    }
  }

  throw new Error(
    'Todos los proveedores fallaron: ' +
    errors.join(' | ')
  )
}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, ctx = {}) => {
  const conn = ctx.conn

  const command = String(
    ctx.command || 'play'
  ).toLowerCase()

  const text = String(
    ctx.text ||
    (
      Array.isArray(ctx.args)
        ? ctx.args.join(' ')
        : ''
    )
  ).trim()

  if (!text) {
    return reply(
      conn,
      m,
      '🎵 *WHATSAPP-BOT PLAY*\n\n' +
      'Escribí el nombre de una canción.\n\n' +
      'Ejemplo: *.play emilia 420*'
    )
  }

  const sender = getSender(m)

  const bypass = await isPrivileged(
    m,
    conn,
    ctx
  )

  // ==========================================================
  // ⏳ COOLDOWN
  // ==========================================================

  const remaining =
    (cooldowns.get(sender) || 0) -
    Date.now()

  if (
    !bypass &&
    remaining > 0
  ) {
    const seconds = Math.ceil(
      remaining / 1000
    )

    return reply(
      conn,
      m,
      '⏳ *¡No atomices! JAJAJA* 🐾\n\n' +
      'Esperá ' +
      Math.floor(seconds / 60) +
      ' min ' +
      (seconds % 60) +
      ' seg.'
    )
  }

  if (processing.has(sender)) {
    return reply(
      conn,
      m,
      '⏳ Ya estoy descargando tu archivo.'
    )
  }

  processing.add(sender)

  await react(conn, m, '🎧')

  try {
    // ========================================================
    // 🔎 BUSCAR VIDEO
    // ========================================================

    const video = await searchVideo(text)

    const seconds = Number(
      video.seconds ||
      video.duration?.seconds ||
      0
    )

    if (
      !seconds ||
      seconds > MAX_DURATION
    ) {
      await react(conn, m, '❌')

      return reply(
        conn,
        m,
        seconds > MAX_DURATION
          ? '❌ Máximo permitido: 7 minutos.'
          : '❌ No pude verificar la duración.'
      )
    }

    const id =
      video.videoId ||
      youtubeId(text)

    if (!id) {
      throw new Error(
        'No se encontró el ID del video'
      )
    }

    const url =
      'https://youtu.be/' + id

    // ========================================================
    // 🎬 TIPO DE ARCHIVO
    // ========================================================

    const videoCommands = [
      'play2',
      'video',
      'play4',
      'playdoc2'
    ]

    const documentCommands = [
      'play3',
      'playdoc',
      'play4',
      'playdoc2'
    ]

    const kind = videoCommands.includes(command)
      ? 'video'
      : 'audio'

    const asDocument =
      documentCommands.includes(command)

    // ========================================================
    // 📥 DESCARGAR
    // ========================================================

    const media = await getMedia(
      {
        url,
        title: video.title
      },
      kind
    )

    // ========================================================
    // 📝 INFORMACIÓN
    // ========================================================

    const title = String(
      video.title || 'Archivo'
    )
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 90)

    const duration =
      video.timestamp ||
      (
        Math.floor(seconds / 60) +
        ':' +
        String(seconds % 60).padStart(2, '0')
      )

    const caption =
      '🎵 *' + title + '*\n' +
      '⏱️ ' + duration + '\n' +
      '🔗 ' + url

    // ========================================================
    // 📤 ENVIAR ARCHIVO
    // ========================================================

    if (asDocument) {
      const extension = kind === 'video'
        ? '.mp4'
        : media.mimetype === 'audio/mpeg'
          ? '.mp3'
          : media.mimetype === 'audio/ogg; codecs=opus'
            ? '.ogg'
            : media.mimetype === 'audio/wav'
              ? '.wav'
              : media.mimetype === 'audio/flac'
                ? '.flac'
                : '.m4a'

      await conn.sendMessage(
        m.chat,
        {
          document: media.buffer,
          mimetype: media.mimetype,
          fileName: title + extension,
          caption
        },
        { quoted: m }
      )

    } else if (kind === 'video') {
      await conn.sendMessage(
        m.chat,
        {
          video: media.buffer,
          mimetype: 'video/mp4',
          caption
        },
        { quoted: m }
      )

    } else {
      await conn.sendMessage(
        m.chat,
        {
          audio: media.buffer,
          mimetype: media.mimetype,
          ptt: false
        },
        { quoted: m }
      )
    }

    // ========================================================
    // ⏳ GUARDAR COOLDOWN
    // ========================================================

    if (!bypass) {
      cooldowns.set(
        sender,
        Date.now() + COOLDOWN
      )
    }

    await react(conn, m, '✅')

  } catch (error) {
    console.error(
      '❌ PLAY ERROR:',
      error.stack || error
    )

    await react(conn, m, '❌')

    await reply(
      conn,
      m,
      '❌ *No pude descargar el archivo.*\n\n' +
      'Revisá los registros de WHATSAPP-BOT.'
    )

  } finally {
    processing.delete(sender)
  }
}

// ============================================================
// 📋 CONFIGURACIÓN
// ============================================================

handler.help = [
  'play',
  'playaudio',
  'audio',
  'musica',
  'play2',
  'video',
  'play3',
  'playdoc',
  'play4',
  'playdoc2'
]

handler.tags = ['download']

handler.command =
  /^(play|playaudio|audio|musica|play2|video|play3|playdoc|play4|playdoc2)$/i

handler.group = true

export default handler
