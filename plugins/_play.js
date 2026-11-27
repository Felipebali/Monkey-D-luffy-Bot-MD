
/**
 * 📂 plugins/_play.js
 * 🤖 WHATSAPP-BOT — PLAY MUSIC
 *
 * 🎵 Descarga directa de YouTube
 * 🎧 Conversión real a MP3
 * 🔊 Calidad de audio: 192 kbps
 * 🖼️ Miniatura e información
 * ⏳ Cooldown: 5 minutos
 * ⏱️ Duración máxima: 7 minutos
 * 👑 Owners y admins sin cooldown
 * 👥 Exclusivo para grupos
 * 🗑️ Limpieza automática de archivos
 * 🌐 Sin APIs externas de descarga
 */

import yts from 'yt-search'
import ytdlp from 'youtube-dl-exec'
import ffmpeg from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'

import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const COOLDOWN = 5 * 60 * 1000
const MAX_DURATION = 7 * 60
const MAX_SIZE = 25 * 1024 * 1024
const MAX_CONCURRENT = 2

const cooldowns = new Map()
const processing = new Set()

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, {
  conn,
  args = [],
  text,
  usedPrefix = '.',
  command = 'play',
  isAdmin,
  isOwner,
  isROwner
}) => {

  if (!m.isGroup) return

  const query = String(
    text || args.join(' ')
  ).trim()

  if (!query) {
    return m.reply(
      '《✧》Ingresá el nombre o enlace de una canción.\n\n' +
      `*Ejemplo:* ${usedPrefix}${command} Juan Gabriel Amor Eterno`
    )
  }

  const sender = m.sender

  const privileged = Boolean(
    isAdmin ||
    isOwner ||
    isROwner ||
    m.fromMe ||
    m.key?.fromMe
  )

  // ==========================================================
  // ⏳ COOLDOWN
  // ==========================================================

  const remaining =
    (cooldowns.get(sender) || 0) - Date.now()

  if (!privileged && remaining > 0) {

    const seconds = Math.ceil(remaining / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60

    return m.reply(
      '⏳ *¡No atomices! JAJAJA* 🐾\n\n' +
      `Esperá ${minutes} min ${secs} seg.`
    )
  }

  if (processing.has(sender)) {
    return react(conn, m, '⏳')
  }

  if (processing.size >= MAX_CONCURRENT) {
    return m.reply(
      '⏳ Hay descargas en proceso. Intentá en un momento.'
    )
  }

  processing.add(sender)

  let tempDir = null

  try {

    await react(conn, m, '🎧')

    // ========================================================
    // 🔎 BUSCAR CANCIÓN
    // ========================================================

    const video = await searchVideo(query)

    if (!video?.videoId) {
      throw new Error('No se encontró la canción.')
    }

    const url =
      `https://youtu.be/${video.videoId}`

    const title = video.title || 'Audio'

    const seconds = Number(
      video.seconds ||
      video.duration?.seconds ||
      0
    )

    // ========================================================
    // ⏱️ COMPROBAR DURACIÓN
    // ========================================================

    if (
      !Number.isFinite(seconds) ||
      seconds <= 0
    ) {
      await react(conn, m, '❌')

      return m.reply(
        '❌ No se pudo comprobar la duración.'
      )
    }

    if (seconds > MAX_DURATION) {
      await react(conn, m, '❌')

      return m.reply(
        '❌ La duración máxima es de 7 minutos.'
      )
    }

    // ========================================================
    // 🔧 COMPROBAR FFMPEG Y FFPROBE
    // ========================================================

    if (!ffmpeg || !ffprobe?.path) {
      throw new Error(
        'FFmpeg o FFprobe no están disponibles.'
      )
    }

    await fs.access(ffmpeg)
    await fs.access(ffprobe.path)

    // ========================================================
    // 📂 CREAR CARPETA TEMPORAL
    // ========================================================

    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'whatsapp-play-')
    )

    const output = path.join(
      tempDir,
      'audio.%(ext)s'
    )

    const audioPath = path.join(
      tempDir,
      'audio.mp3'
    )

    // ========================================================
    // 📥 DESCARGAR Y CONVERTIR A MP3
    // ========================================================

    console.log('[PLAY] Canción:', title)
    console.log('[PLAY] Descargando con yt-dlp')

    await ytdlp(url, {

      format: 'bestaudio/best',

      extractAudio: true,

      audioFormat: 'mp3',

      audioQuality: '192K',

      ffmpegLocation: ffmpeg,

      jsRuntimes: `node:${process.execPath}`,

      output,

      noPlaylist: true,

      noWarnings: true,

      noProgress: true,

      noCacheDir: true,

      socketTimeout: 20,

      retries: 2,

      fragmentRetries: 2,

      maxFilesize: '50M',

      matchFilter: 'duration <= 420 & !is_live'

    }, {
      timeout: 120000,
      killSignal: 'SIGKILL'
    })

    // ========================================================
    // 🔍 VERIFICAR ARCHIVO
    // ========================================================

    const stats = await fs.stat(audioPath)

    if (
      stats.size < 1024 ||
      stats.size > MAX_SIZE
    ) {
      throw new Error(
        'Audio vacío o demasiado grande.'
      )
    }

    // ========================================================
    // 🔊 VALIDAR AUDIO REAL CON FFPROBE
    // ========================================================

    const { stdout } = await exec(
      ffprobe.path,
      [
        '-v', 'error',
        '-show_entries',
        'format=duration:stream=codec_name,codec_type',
        '-of', 'json',
        audioPath
      ],
      {
        timeout: 15000,
        maxBuffer: 1024 * 1024
      }
    )

    const audioInfo = JSON.parse(stdout)

    const validAudio = audioInfo.streams?.some(
      stream =>
        stream.codec_type === 'audio' &&
        stream.codec_name === 'mp3'
    )

    const audioDuration = Number(
      audioInfo.format?.duration || 0
    )

    if (
      !validAudio ||
      !Number.isFinite(audioDuration) ||
      audioDuration <= 0 ||
      audioDuration > MAX_DURATION + 1
    ) {
      throw new Error(
        'El MP3 generado no es válido.'
      )
    }

    const buffer = await fs.readFile(audioPath)

    console.log(
      '[PLAY] MP3 listo:',
      (buffer.length / 1024 / 1024).toFixed(2),
      'MB'
    )

    // ========================================================
    // 🖼️ MINIATURA E INFORMACIÓN
    // ========================================================

    const thumbnail =
      video.thumbnail ||
      video.image ||
      `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`

    const channel =
      video.author?.name ||
      (
        typeof video.author === 'string'
          ? video.author
          : 'Desconocido'
      )

    const duration =
      video.timestamp ||
      `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

    const views = Number(
      video.views || 0
    ).toLocaleString('es-UY')

    const size = (
      buffer.length / 1024 / 1024
    ).toFixed(2)

    const caption = `╭━━━〔 🎵 *PLAY MUSIC* 〕━━━⬣
┃
┃ 🎶 *Título:* ${title}
┃ 👤 *Canal:* ${channel}
┃ ⏱️ *Duración:* ${duration}
┃ 👁️ *Vistas:* ${views}
┃ 📅 *Publicado:* ${video.ago || 'Desconocido'}
┃ 📦 *Tamaño:* ${size} MB
┃ 🎧 *Formato:* MP3
┃ 🔊 *Calidad:* 192 kbps
┃
╰━━━━━━━━━━━━━━━━⬣

*⇄ㅤ ◁ㅤ ❚❚ㅤ ▷ㅤ ↻*

🔗 ${url}

> 🤖 WHATSAPP-BOT`

    try {

      await conn.sendMessage(m.chat, {
        image: {
          url: thumbnail
        },
        caption
      }, {
        quoted: m
      })

    } catch {

      await m.reply(caption)

    }

    // ========================================================
    // 🎧 ENVIAR AUDIO A WHATSAPP
    // ========================================================

    const fileName = title
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 100)

    await conn.sendMessage(m.chat, {

      audio: buffer,

      mimetype: 'audio/mpeg',

      fileName: `${fileName || 'audio'}.mp3`,

      ptt: false,

      seconds: Math.round(audioDuration)

    }, {
      quoted: m
    })

    // ========================================================
    // ⏳ GUARDAR COOLDOWN
    // ========================================================

    if (!privileged) {

      const expires = Date.now() + COOLDOWN

      cooldowns.set(sender, expires)

      const timer = setTimeout(() => {

        if (cooldowns.get(sender) === expires) {
          cooldowns.delete(sender)
        }

      }, COOLDOWN)

      timer.unref?.()
    }

    await react(conn, m, '✅')

    console.log(
      '[PLAY] Audio enviado correctamente.'
    )

  } catch (error) {

    const detail = String(
      error.stderr ||
      error.message ||
      error
    )

    console.error(
      '❌ PLAY ERROR:',
      detail
    )

    await react(conn, m, '❌')

    let message =
      '❌ No se pudo descargar el audio.'

    if (
      /sign in|not a bot|captcha/i.test(detail)
    ) {

      message =
        '❌ YouTube está bloqueando las descargas del servidor.'

    } else if (
      /ENOENT|ffmpeg|ffprobe|python/i.test(detail)
    ) {

      message =
        '❌ Faltan dependencias de descarga en el servidor.'

    } else if (
      /timeout|ETIMEDOUT|timed out/i.test(detail)
    ) {

      message =
        '❌ La descarga tardó demasiado.'

    } else if (
      /403|429|too many requests/i.test(detail)
    ) {

      message =
        '❌ YouTube limitó las solicitudes del servidor.'

    }

    await m.reply(message)

  } finally {

    // ========================================================
    // 🗑️ LIMPIAR ARCHIVOS TEMPORALES
    // ========================================================

    if (tempDir) {

      await fs.rm(tempDir, {
        recursive: true,
        force: true
      }).catch(() => {})

    }

    processing.delete(sender)

  }
}

// ============================================================
// 🎭 REACCIONES
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
// 🔗 OBTENER ID DE YOUTUBE
// ============================================================

function getVideoId(input = '') {

  const text = String(input).trim()

  if (/^[\w-]{11}$/.test(text)) {
    return text
  }

  const patterns = [

    /youtu\.be\/([\w-]{11})/,

    /youtube\.com\/watch\?.*?v=([\w-]{11})/,

    /youtube\.com\/shorts\/([\w-]{11})/,

    /youtube\.com\/embed\/([\w-]{11})/,

    /youtube\.com\/live\/([\w-]{11})/

  ]

  for (const pattern of patterns) {

    const match = text.match(pattern)

    if (match?.[1]) return match[1]

  }

  return null
}

// ============================================================
// 🔎 BUSCAR CANCIÓN
// ============================================================

async function searchVideo(query) {

  const id = getVideoId(query)

  if (id) {

    const video = await yts({
      videoId: id
    })

    if (video?.videoId === id) {
      return video
    }

    throw new Error(
      'Video no encontrado.'
    )
  }

  const results = await yts(query)

  return results.videos?.[0] || null
}

// ============================================================
// 📋 CONFIGURACIÓN DEL HANDLER
// ============================================================

handler.help = [
  'play <canción>',
  'mp3 <canción>',
  'ytmp3 <canción>',
  'ytaudio <canción>',
  'playaudio <canción>',
  'audio <canción>',
  'musica <canción>'
]

handler.tags = ['downloader']

handler.command =
  /^(play|mp3|ytmp3|ytaudio|playaudio|audio|musica)$/i

handler.group = true
handler.register = false
handler.limit = false

export default handler
