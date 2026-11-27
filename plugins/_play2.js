
/**
 * 📂 plugins/_play2.js
 * 🤖 whatsapp-bot — PLAY VIDEO
 *
 * 🎬 Videos MP4
 * 📁 Videos como documento
 * 🔎 Búsqueda por nombre o enlace
 * 🚀 Descarga mediante yt-dlp
 * 🎥 Conversión mediante FFmpeg
 * 🔍 Validación mediante FFprobe
 * ⏳ Cooldown de 5 minutos
 * 👑 Owners y admins exentos del cooldown
 * 👥 Solo grupos
 * 🔇 Sin spam
 * 🧹 Limpieza automática de archivos
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

const CONFIG = {
    maxDuration: 7 * 60,

    cooldown: 5 * 60 * 1000,

    maxConcurrent: 2,

    maxVideo: 50 * 1024 * 1024,

    maxDocument: 100 * 1024 * 1024,

    maxDownload: 150 * 1024 * 1024,

    downloadTimeout: 180000,

    conversionTimeout: 180000,

    quality: 720
}

const processing = new Set()
const cooldowns = new Map()

const DOCUMENTOS = new Set([
    'play4',
    'playdoc2',
    'videodoc'
])

// ============================================================
// 🛠️ FUNCIONES AUXILIARES
// ============================================================

function limpiarNombre(value) {

    return String(value || 'video')
        .replace(/[\\/:*?"<>|\x00-\x1F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100) || 'video'

}

function duracion(seconds) {

    const total = Math.floor(Number(seconds) || 0)

    const min = Math.floor(total / 60)
    const sec = total % 60

    return `${min}:${String(sec).padStart(2, '0')}`

}

function megabytes(bytes) {

    return (bytes / 1024 / 1024).toFixed(2)

}

function obtenerVideoId(value) {

    try {

        const url = new URL(value)

        if (!['https:', 'http:'].includes(url.protocol)) {
            return null
        }

        const host = url.hostname.toLowerCase()

        let id = null

        if (host === 'youtu.be') {

            id = url.pathname.split('/')[1]

        } else if ([
            'youtube.com',
            'www.youtube.com',
            'm.youtube.com',
            'music.youtube.com'
        ].includes(host)) {

            id =
                url.searchParams.get('v') ||
                url.pathname.match(
                    /^\/(?:shorts|live|embed)\/([^/]+)/
                )?.[1]

        }

        return /^[a-zA-Z0-9_-]{11}$/.test(id || '')
            ? id
            : null

    } catch {

        return null

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
// 🔎 BUSCAR VIDEO
// ============================================================

async function buscarVideo(query) {

    const id = obtenerVideoId(query)

    if (id) {

        return {
            videoId: id,
            url: `https://www.youtube.com/watch?v=${id}`
        }

    }

    if (/^https?:\/\//i.test(query)) {

        throw new Error(
            'Ingresá un enlace válido de YouTube.'
        )

    }

    const resultado = await yts(query)

    const video = resultado.videos?.[0]

    if (!video?.videoId) {

        throw new Error(
            'No encontré videos para esa búsqueda.'
        )

    }

    return {
        videoId: video.videoId,
        url: `https://www.youtube.com/watch?v=${video.videoId}`
    }

}

// ============================================================
// 📋 OBTENER INFORMACIÓN REAL DEL VIDEO
// ============================================================

async function obtenerInformacion(video) {

    const data = await ytdlp(
        video.url,
        {
            dumpSingleJson: true,
            skipDownload: true,
            noPlaylist: true,
            noWarnings: true,

            jsRuntimes: `node:${process.execPath}`,

            socketTimeout: 20,
            retries: 2
        },
        {
            timeout: 60000
        }
    )

    const info = typeof data === 'string'
        ? JSON.parse(data)
        : data

    if (!info) {

        throw new Error(
            'No se pudo obtener información del video.'
        )

    }

    if (
        info.is_live ||
        info.live_status === 'is_live' ||
        info.live_status === 'is_upcoming'
    ) {

        throw new Error(
            'No se permiten transmisiones en vivo.'
        )

    }

    const seconds = Number(info.duration)

    if (!Number.isFinite(seconds) || seconds <= 0) {

        throw new Error(
            'No se pudo verificar la duración.'
        )

    }

    if (seconds > CONFIG.maxDuration) {

        throw new Error(
            'Solo se permiten videos de hasta 7 minutos.'
        )

    }

    return {
        ...video,

        title: info.title || 'Video',

        seconds,

        thumbnail: info.thumbnail || '',

        author: info.uploader || info.channel || ''
    }

}

// ============================================================
// 📥 DESCARGAR VIDEO CON YT-DLP
// ============================================================

async function descargarVideo(video, folder) {

    const output = path.join(
        folder,
        'source.%(ext)s'
    )

    console.log('[PLAY2] Descargando:', video.title)

    await ytdlp(
        video.url,
        {
            format:
                'bv*[height<=720][ext=mp4]+ba[ext=m4a]' +
                '/b[height<=720][ext=mp4]' +
                '/bv*[height<=720]+ba' +
                '/b[height<=720]',

            mergeOutputFormat: 'mp4',

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

            concurrentFragments: 2,

            maxFilesize: '150M',

            matchFilter: 'duration <= 420 & !is_live'
        },
        {
            timeout: CONFIG.downloadTimeout
        }
    )

    const files = await fs.readdir(folder)

    const source = files.find(file =>
        /^source\.(mp4|webm|mkv|mov)$/i.test(file)
    )

    if (!source) {

        throw new Error(
            'yt-dlp no generó un archivo de video.'
        )

    }

    const sourcePath = path.join(folder, source)

    const stats = await fs.stat(sourcePath)

    if (!stats.size) {

        throw new Error(
            'El video descargado está vacío.'
        )

    }

    if (stats.size > CONFIG.maxDownload) {

        throw new Error(
            'El archivo descargado supera los 150 MB.'
        )

    }

    console.log(
        '[PLAY2] Descarga completa:',
        `${megabytes(stats.size)} MB`
    )

    return sourcePath

}

// ============================================================
// 🔍 ANALIZAR VIDEO CON FFPROBE
// ============================================================

async function analizarVideo(file) {

    const { stdout } = await exec(
        ffprobe.path,
        [
            '-v', 'error',

            '-show_format',

            '-show_streams',

            '-of', 'json',

            file
        ],
        {
            timeout: 20000,

            maxBuffer: 4 * 1024 * 1024
        }
    )

    const info = JSON.parse(stdout)

    const video = info.streams?.find(
        stream => stream.codec_type === 'video'
    )

    const audio = info.streams?.find(
        stream => stream.codec_type === 'audio'
    )

    if (!video) {

        throw new Error(
            'El archivo no contiene video válido.'
        )

    }

    return {
        width: video.width,

        height: video.height,

        videoCodec: video.codec_name,

        audioCodec: audio?.codec_name || null,

        pixelFormat: video.pix_fmt,

        duration: Number(info.format?.duration || 0),

        size: Number(info.format?.size || 0)
    }

}

// ============================================================
// 🎥 CONVERTIR VIDEO PARA WHATSAPP
// ============================================================

async function convertirVideo(
    source,
    folder,
    documento
) {

    const output = path.join(
        folder,
        'whatsapp-video.mp4'
    )

    const original = await analizarVideo(source)

    if (
        !Number.isFinite(original.duration) ||
        original.duration <= 0 ||
        original.duration > CONFIG.maxDuration + 1
    ) {

        throw new Error(
            'Duración del archivo inválida.'
        )

    }

    const maxSize = documento
        ? CONFIG.maxDocument
        : CONFIG.maxVideo

    // Calcular bitrate para respetar el tamaño máximo.

    const totalBitrate = Math.floor(
        maxSize * 8 * 0.90 /
        original.duration /
        1000
    )

    const videoBitrate = Math.max(
        150,
        Math.min(
            2200,
            totalBitrate - 128
        )
    )

    console.log(
        '[PLAY2] Convirtiendo a H264 + AAC.'
    )

    await exec(
        ffmpeg,
        [
            '-hide_banner',

            '-loglevel', 'error',

            '-y',

            '-i', source,

            // Seleccionar video y audio.

            '-map', '0:v:0',

            '-map', '0:a:0?',

            // Mantener proporciones y dimensiones pares.

            '-vf',
            "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",

            // Codec compatible con WhatsApp.

            '-c:v', 'libx264',

            '-preset', 'veryfast',

            '-profile:v', 'main',

            '-level:v', '4.0',

            '-pix_fmt', 'yuv420p',

            '-r', '30',

            '-b:v', `${videoBitrate}k`,

            '-maxrate', `${videoBitrate}k`,

            '-bufsize', `${videoBitrate * 2}k`,

            // Audio AAC.

            '-c:a', 'aac',

            '-b:a', '128k',

            '-ar', '44100',

            '-ac', '2',

            // Optimizar reproducción.

            '-movflags', '+faststart',

            '-threads', '2',

            '-f', 'mp4',

            output
        ],
        {
            timeout: CONFIG.conversionTimeout,

            maxBuffer: 4 * 1024 * 1024
        }
    )

    // ========================================================
    // 🔍 VALIDAR RESULTADO FINAL
    // ========================================================

    const info = await analizarVideo(output)

    const stats = await fs.stat(output)

    if (!stats.size) {

        throw new Error(
            'FFmpeg generó un archivo vacío.'
        )

    }

    if (stats.size > maxSize) {

        throw new Error(
            'El video supera el tamaño permitido.'
        )

    }

    if (info.videoCodec !== 'h264') {

        throw new Error(
            'El codec del video no es compatible.'
        )

    }

    if (
        info.audioCodec &&
        info.audioCodec !== 'aac'
    ) {

        throw new Error(
            'El codec del audio no es compatible.'
        )

    }

    if (
        original.audioCodec &&
        !info.audioCodec
    ) {

        throw new Error(
            'El video perdió su pista de audio.'
        )

    }

    console.log(
        '[PLAY2] Video validado:',
        `${info.width}x${info.height}`,
        info.videoCodec,
        info.audioCodec,
        `${megabytes(stats.size)} MB`
    )

    return {
        file: output,

        size: stats.size,

        ...info
    }

}

// ============================================================
// 📤 ENVIAR VIDEO
// ============================================================

async function enviarVideo(
    conn,
    m,
    video,
    resultado,
    documento
) {

    const fileName =
        `${limpiarNombre(video.title)}.mp4`

    if (documento) {

        await conn.sendMessage(
            m.chat,
            {
                document: {
                    url: resultado.file
                },

                mimetype: 'video/mp4',

                fileName,

                caption: `🎬 *${video.title}*`
            },
            {
                quoted: m
            }
        )

        return

    }

    await conn.sendMessage(
        m.chat,
        {
            video: {
                url: resultado.file
            },

            mimetype: 'video/mp4',

            gifPlayback: false,

            caption: `╭━━〔 🎬 *PLAY VIDEO* 〕━━╮
┃
┃ 📌 *${video.title}*
┃ ⏰ Duración: ${duracion(video.seconds)}
┃ 📐 Calidad: ${resultado.width} × ${resultado.height}
┃ 📦 Peso: ${megabytes(resultado.size)} MB
┃
╰━━━━━━━━━━━━━━━━━━╯`
        },
        {
            quoted: m
        }
    )

}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, {
    conn,

    command,

    text = '',

    args = [],

    usedPrefix = '.',

    isAdmin,

    isOwner,

    isROwner
}) => {

    if (!m.isGroup) return

    const sender = m.sender

    const cmd = String(command).toLowerCase()

    const query = String(
        text || args.join(' ') || ''
    ).trim()

    const documento = DOCUMENTOS.has(cmd)

    const exento = Boolean(
        isAdmin ||
        isOwner ||
        isROwner ||
        m.fromMe
    )

    // ========================================================
    // 📝 VALIDAR BÚSQUEDA
    // ========================================================

    if (!query) {

        return m.reply(
            `🎬 *PLAY VIDEO*\n\n` +
            `• ${usedPrefix}play2 nombre o enlace\n` +
            `• ${usedPrefix}play4 nombre o enlace`
        )

    }

    // ========================================================
    // 🧹 LIMPIAR COOLDOWNS VENCIDOS
    // ========================================================

    const now = Date.now()

    for (const [id, time] of cooldowns) {

        if (now - time >= CONFIG.cooldown) {

            cooldowns.delete(id)

        }

    }

    // ========================================================
    // ⏳ COOLDOWN DE 5 MINUTOS
    // ========================================================

    if (!exento) {

        const ultimo = cooldowns.get(sender) || 0

        const restante =
            CONFIG.cooldown - (now - ultimo)

        if (restante > 0) {

            const segundos = Math.ceil(
                restante / 1000
            )

            return m.reply(
                `⏳ Esperá ${duracion(segundos)} para volver a descargar videos.`
            )

        }

    }

    // ========================================================
    // 🛡️ PROTEGER EL SERVIDOR
    // ========================================================

    if (processing.has(sender)) return

    if (processing.size >= CONFIG.maxConcurrent) {

        return m.reply(
            '⏳ Hay videos en proceso. Intentá más tarde.'
        )

    }

    processing.add(sender)

    let folder = null

    try {

        if (!ffmpeg || !ffprobe.path) {

            throw new Error(
                'FFmpeg o FFprobe no están disponibles.'
            )

        }

        await react(conn, m, '⏳')

        // ====================================================
        // 🔎 BUSCAR VIDEO
        // ====================================================

        const encontrado = await buscarVideo(query)

        const video = await obtenerInformacion(
            encontrado
        )

        console.log(
            '[PLAY2] Video:',
            video.title
        )

        console.log(
            '[PLAY2] Duración:',
            duracion(video.seconds)
        )

        // ====================================================
        // 📂 CREAR CARPETA TEMPORAL
        // ====================================================

        folder = await fs.mkdtemp(
            path.join(
                os.tmpdir(),
                'whatsapp-play2-'
            )
        )

        // ====================================================
        // 📥 DESCARGAR
        // ====================================================

        const source = await descargarVideo(
            video,
            folder
        )

        // ====================================================
        // 🎥 CONVERTIR
        // ====================================================

        const resultado = await convertirVideo(
            source,
            folder,
            documento
        )

        // ====================================================
        // 📤 ENVIAR RESULTADO
        // ====================================================

        await enviarVideo(
            conn,
            m,
            video,
            resultado,
            documento
        )

        // Cooldown únicamente si se envió correctamente.

        if (!exento) {

            cooldowns.set(
                sender,
                Date.now()
            )

        }

        await react(conn, m, '✅')

        console.log(
            '[PLAY2] Video enviado correctamente.'
        )

    } catch (error) {

        console.error(
            '[PLAY2] ERROR:',
            error?.stderr ||
            error?.message ||
            error
        )

        await react(conn, m, '❌')

        const mensaje = String(
            error?.stderr ||
            error?.message ||
            ''
        )

        if (
            /sign in|confirm you.re not a bot|cookies/i
                .test(mensaje)
        ) {

            return m.reply(
                '❌ YouTube bloqueó temporalmente la descarga.'
            )

        }

        if (
            /7 minutos|transmisiones|duración|Duración|enlace válido|No encontré/i
                .test(mensaje)
        ) {

            return m.reply(
                `⚠️ ${error.message}`
            )

        }

        await m.reply(
            '❌ No se pudo descargar o procesar el video.'
        )

    } finally {

        processing.delete(sender)

        // Eliminar todos los archivos temporales.

        if (folder) {

            await fs.rm(folder, {
                recursive: true,
                force: true
            }).catch(error => {

                console.error(
                    '[PLAY2] Error de limpieza:',
                    error.message
                )

            })

        }

    }

}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL HANDLER
// ============================================================

handler.help = [
    'play2 <nombre o enlace>',
    'video <nombre o enlace>',
    'ytmp4 <enlace>',
    'play4 <nombre o enlace>',
    'playdoc2 <nombre o enlace>',
    'videodoc <nombre o enlace>'
]

handler.tags = ['downloader']

handler.command =
    /^(play2|video|ytmp4|play4|playdoc2|videodoc)$/i

handler.group = true
handler.register = false
handler.limit = false

export default handler
