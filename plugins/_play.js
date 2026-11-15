
/**
 * 📂 plugins/_play.js
 * 🤖 WHATSAPP-BOT — PLAY AUDIO Y VIDEO
 *
 * Comandos:
 * .play / .playaudio / .audio / .musica
 * .play2 / .video
 * .play3 / .playdoc
 * .play4 / .playdoc2
 *
 * Cooldown: 5 minutos
 * Admins y owners: sin cooldown
 * Duración máxima: 7 minutos
 *
 * No requiere yt-dlp ni FFmpeg.
 */

import yts from 'yt-search'
import axios from 'axios'
import { savetube } from '../lib/yt-savetube.js'
import { ogmp3 } from '../lib/youtubedl.js'

const COOLDOWN = 300000
const MAX_SECONDS = 420
const MAX_AUDIO = 25 * 1024 * 1024
const MAX_VIDEO = 80 * 1024 * 1024

const cooldowns = new Map()
const pending = new Set()

// ============================================================
// 🔧 UTILIDADES
// ============================================================

function idOf(text) {
  const match = String(text).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#\s]*?&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/
  )

  return match ? match[1] : ''
}

function msg(error) {
  return String(
    error && error.message || error
  )
}

async function react(conn, m, emoji) {
  try {
    await conn.sendMessage(m.chat, {
      react: {
        text: emoji,
        key: m.key
      }
    })
  } catch (error) {}
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

function owner(m, conn, ctx) {
  if (
    ctx.isOwner ||
    ctx.isROwner ||
    m.fromMe ||
    (m.key && m.key.fromMe)
  ) {
    return true
  }

  const sender = String(
    m.sender || m.participant || ''
  )

  const owners = Array.isArray(global.owner)
    ? global.owner
    : []

  return owners.some(function(item) {
    const configured = String(
      Array.isArray(item) ? item[0] : item
    )

    if (configured === sender) {
      return true
    }

    if (sender.endsWith('@lid')) {
      return false
    }

    function number(value) {
      return String(value)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '')
    }

    return Boolean(
      number(sender) &&
      number(sender) === number(configured)
    )
  })
}

async function privileged(m, conn, ctx) {
  if (
    owner(m, conn, ctx) ||
    ctx.isAdmin
  ) {
    return true
  }

  if (!m.isGroup) {
    return false
  }

  try {
    const group = await conn.groupMetadata(
      m.chat
    )

    const sender = String(
      m.sender || m.participant
    )

    return group.participants.some(function(p) {
      return (
        [p.id, p.jid, p.lid].includes(sender) &&
        Boolean(
          p.admin ||
          p.isAdmin ||
          p.isSuperAdmin
        )
      )
    })
  } catch (error) {
    return false
  }
}

// ============================================================
// 🔎 BUSCAR VIDEO
// ============================================================

async function findVideo(query) {
  const id = idOf(query)

  if (id) {
    const info = await yts({
      videoId: id
    })

    if (!info || !info.videoId) {
      throw new Error(
        'No encontré el video.'
      )
    }

    return info
  }

  const results = await yts(query)

  if (
    !results.videos ||
    !results.videos.length
  ) {
    throw new Error(
      'No encontré esa canción.'
    )
  }

  return results.videos[0]
}

// ============================================================
// 🔗 EXTRAER ENLACES
// ============================================================

function extract(value, depth = 0) {
  if (depth > 5 || !value) {
    return ''
  }

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
    'dl_download',
    'download_url_full',
    'stream_url_full',
    'dl_url',
    'audio',
    'media',
    'url',
    'link',
    'dl',
    'result',
    'data',
    'medias'
  ]

  for (const key of keys) {
    if (value[key]) {
      const result = extract(
        value[key],
        depth + 1
      )

      if (result) {
        return result
      }
    }
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = extract(
        entry,
        depth + 1
      )

      if (result) {
        return result
      }
    }
  }

  return ''
}

// ============================================================
// 🎧 DETECTAR FORMATO
// ============================================================

function mimeOf(buffer) {
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
    buffer.subarray(0, 4).toString() === 'OggS'
  ) {
    return 'audio/ogg; codecs=opus'
  }

  if (
    buffer.subarray(4, 8).toString() === 'ftyp'
  ) {
    return 'audio/mp4'
  }

  if (
    buffer.subarray(0, 4).toString() === 'RIFF'
  ) {
    return 'audio/wav'
  }

  if (
    buffer.subarray(0, 4).toString() === 'fLaC'
  ) {
    return 'audio/flac'
  }

  return ''
}

// ============================================================
// 📥 DESCARGAR Y VALIDAR
// ============================================================

async function fetchMedia(url, kind) {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('URL inválida')
  }

  const limit = kind === 'video'
    ? MAX_VIDEO
    : MAX_AUDIO

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

  const buffer = Buffer.from(
    response.data
  )

  const type = String(
    response.headers['content-type'] || ''
  ).toLowerCase()

  if (
    buffer.length < 1024 ||
    buffer.length > limit ||
    /text\/html|application\/json|text\/plain/.test(type)
  ) {
    throw new Error(
      'Respuesta inválida o archivo demasiado grande.'
    )
  }

  const header = buffer
    .subarray(0, 150)
    .toString('utf8')
    .trimStart()

  if (/^(<|\{|\[)/.test(header)) {
    throw new Error(
      'La URL devolvió HTML o JSON.'
    )
  }

  const mime = mimeOf(buffer)

  if (
    kind === 'audio' &&
    !mime.startsWith('audio/')
  ) {
    throw new Error(
      'No se reconoció audio compatible.'
    )
  }

  if (
    kind === 'video' &&
    buffer.subarray(4, 8).toString() !== 'ftyp'
  ) {
    throw new Error(
      'No se reconoció video MP4.'
    )
  }

  return {
    buffer,
    mimetype: kind === 'video'
      ? 'video/mp4'
      : mime
  }
}

// ============================================================
// 🌐 CONSULTAR API
// ============================================================

async function json(url) {
  const response = await axios.get(url, {
    timeout: 18000,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  })

  return response.data
}

// ============================================================
// 🌐 PROVEEDORES
// ============================================================

function providers(video, kind) {
  const url = video.url
  const encoded = encodeURIComponent(url)
  const title = encodeURIComponent(
    video.title || ''
  )

  const audio = kind === 'audio'

  const list = [
    [
      'SaveTube',
      function() {
        return savetube.download(
          url,
          audio ? 'mp3' : '720'
        )
      }
    ],
    [
      'OGMP3',
      function() {
        return ogmp3.download(
          url,
          audio ? '128' : '720',
          kind
        )
      }
    ],
    [
      'Mitzuki',
      function() {
        return json(
          'https://api.mitzuki.xyz/download/youtube' +
          '?url=' + encoded +
          '&type=' + kind +
          '&format=' + (audio ? 'mp3' : 'mp4') +
          '&apikey=' +
          encodeURIComponent(
            process.env.API_KEY || ''
          )
        )
      }
    ],
    [
      'Mitzuki V2',
      function() {
        return json(
          'https://api.mitzuki.xyz/download/youtube2' +
          '?url=' + encoded +
          '&apikey=' +
          encodeURIComponent(
            process.env.API_KEY || ''
          )
        )
      }
    ],
    [
      'Dorratz',
      function() {
        return json(
          'https://api.dorratz.com/v3/ytdl?url=' +
          encoded
        )
      }
    ],
    [
      'Exonity',
      function() {
        return json(
          'https://exonity.tech/api/dl/' +
          (audio ? 'playmp3' : 'playmp4') +
          '?query=' + title
        )
      }
    ]
  ]

  if (audio) {
    list.push([
      'DV-YER',
      function() {
        return json(
          'https://dv-yer-api.online/ytmp3' +
          '?mode=link&url=' + encoded
        )
      }
    ])

    list.push([
      'Zenkey',
      function() {
        return json(
          'https://api.zenkey.my.id/api/download/ytmp3' +
          '?apikey=zenkey&url=' + encoded
        )
      }
    ])
  } else {
    list.push([
      'Siputzx',
      function() {
        return json(
          'https://api.siputzx.my.id/api/d/ytmp4?url=' +
          encoded
        )
      }
    ])
  }

  return list
}

// ============================================================
// 🔄 DESCARGA CON RESPALDOS
// ============================================================

async function download(video, kind) {
  const failures = []

  for (const [name, method] of providers(video, kind)) {
    try {
      console.log(
        '[PLAY] Probando ' + name
      )

      const result = await method()
      const link = extract(result)

      if (!link) {
        throw new Error(
          'Sin enlace de descarga.'
        )
      }

      return await fetchMedia(
        link,
        kind
      )

    } catch (error) {
      const failure =
        name + ': ' + msg(error)

      failures.push(failure)

      console.warn(
        '[PLAY] ' + failure
      )
    }
  }

  throw new Error(
    failures.join(' | ')
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
      '🎵 Escribí una canción.\n\n' +
      'Ejemplo: *.play emilia 420*'
    )
  }

  const sender = String(
    m.sender ||
    m.participant ||
    m.chat
  )

  const bypass = await privileged(
    m,
    conn,
    ctx
  )

  const remaining =
    (cooldowns.get(sender) || 0) -
    Date.now()

  if (
    !bypass &&
    remaining > 0
  ) {
    return reply(
      conn,
      m,
      '⏳ *¡No atomices! JAJAJA* 🐾\n\n' +
      'Esperá ' +
      Math.floor(remaining / 60000) +
      ' min ' +
      Math.ceil(
        (remaining % 60000) / 1000
      ) +
      ' seg.'
    )
  }

  if (pending.has(sender)) {
    return reply(
      conn,
      m,
      '⏳ Ya estoy preparando tu archivo.'
    )
  }

  pending.add(sender)

  await react(conn, m, '🎧')

  try {
    const video = await findVideo(query)

    const seconds = Number(
      video.seconds ||
      (
        video.duration &&
        video.duration.seconds
      ) ||
      0
    )

    if (
      !seconds ||
      seconds > MAX_SECONDS
    ) {
      await react(conn, m, '❌')

      return reply(
        conn,
        m,
        seconds > MAX_SECONDS
          ? '❌ Máximo permitido: 7 minutos.'
          : '❌ No pude verificar la duración.'
      )
    }

    const kind = [
      'play2',
      'video',
      'play4',
      'playdoc2'
    ].includes(command)
      ? 'video'
      : 'audio'

    const asDocument = [
      'play3',
      'playdoc',
      'play4',
      'playdoc2'
    ].includes(command)

    const id =
      video.videoId ||
      idOf(query)

    if (!id) {
      throw new Error(
        'No se pudo obtener el ID del video.'
      )
    }

    const url =
      'https://youtu.be/' + id

    // Descargar antes de enviar.
    const media = await download(
      {
        url,
        title: video.title
      },
      kind
    )

    const title = String(
      video.title || 'Archivo'
    )
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 90)

    const caption =
      '🎵 *' + title + '*\n' +
      '⏱️ ' +
      (
        video.timestamp ||
        (
          Math.floor(seconds / 60) +
          ':' +
          String(seconds % 60).padStart(2, '0')
        )
      ) +
      '\n🔗 ' + url

    if (asDocument) {
      const extension =
        kind === 'video'
          ? '.mp4'
          : media.mimetype === 'audio/mpeg'
            ? '.mp3'
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

    // Cooldown únicamente después
    // de enviar el archivo.
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
      '❌ No pude descargar el archivo.\n' +
      'Revisá los registros del bot.'
    )

  } finally {
    pending.delete(sender)
  }
}

// ============================================================
// 📋 COMANDOS
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
