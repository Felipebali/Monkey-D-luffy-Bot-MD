
/**
 * 📂 plugins/_play2.js
 * 🤖 whatsapp-bot — FAST VIDEO
 *
 * ⚡ Descarga optimizada
 * 🎬 MP4 directo
 * 🚀 Conversión solo cuando sea necesaria
 * 📁 Video como documento
 * 👑 Admins y owners sin cooldown
 * 👥 Solo grupos
 * 🔇 Sin spam
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
    maxDuration: 420,
    cooldown: 300000,
    maxConcurrent: 2,

    videoQuality: 480,
    documentQuality: 720,

    maxVideo: 50 * 1024 * 1024,
    maxDocument: 100 * 1024 * 1024,
    maxDownload: 150 * 1024 * 1024,

    downloadTimeout: 180000,
    conversionTimeout: 180000
}

const processing = new Set()
const cooldowns = new Map()

const DOCUMENTOS = new Set([
    'play4',
    'playdoc2',
    'videodoc'
])

// ============================================================
// 🛠️ UTILIDADES
// ============================================================

function duracion(seconds) {
    const total = Math.floor(Number(seconds) || 0)

    return `${Math.floor(total / 60)}:${
        String(total % 60).padStart(2, '0')
    }`
}

function mb(bytes) {
    return (bytes / 1024 / 1024).toFixed(2)
}

function limpiarNombre(value) {
    return String(value || 'video')
        .replace(/[\\/:*?"<>|\x00-\x1F]/g, '')
        .trim()
        .slice(0, 100) || 'video'
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

// ============================================================
// 🔗 IDENTIFICAR ENLACE DE YOUTUBE
// ============================================================

function obtenerVideoId(value) {
    try {
        const url = new URL(value)

        if (!['http:', 'https:'].includes(url.protocol)) {
            return null
        }

        let id

        if (url.hostname === 'youtu.be') {
            id = url.pathname.split('/')[1]

        } else if ([
            'youtube.com',
            'www.youtube.com',
            'm.youtube.com',
            'music.youtube.com'
        ].includes(url.hostname)) {

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
// 🔎 BUSCAR VIDEO
// ============================================================

async function buscarVideo(query) {

    const id = obtenerVideoId(query)

    if (id) {
        return {
            url: `https://www.youtube.com/watch?v=${id}`,
            title: 'Video de YouTube',
            seconds: 0
        }
    }

    if (/^https?:\/\//i.test(query)) {
        throw new Error('Enlace de YouTube inválido.')
    }

    const result = await yts(query)
    const video = result.videos?.[0]

    if (!video?.videoId) {
        throw new Error('No encontré ningún video.')
    }

    const seconds = Number(video.seconds || 0)

    if (seconds > CONFIG.maxDuration) {
        throw new Error(
            'Solo se permiten videos de hasta 7 minutos.'
        )
    }

    return {
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
        title: video.title,
        seconds
    }
}

// ============================================================
// 📥 DESCARGA OPTIMIZADA
// ============================================================

async function descargarVideo(video, folder, documento) {

    const inicio = Date.now()

    const quality = documento
        ? CONFIG.documentQuality
        : CONFIG.videoQuality

    const maxSize = documento
        ? CONFIG.maxDocument
        : CONFIG.maxVideo

    const maxMB = Math.floor(maxSize / 1024 / 1024)

    console.log(
        `[PLAY2] Descargando hasta ${quality}p`
    )

    // Priorizar H264 + AAC para evitar recodificar.

    const format = [
        `b[height<=${quality}][ext=mp4][vcodec^=avc1][acodec^=mp4a][filesize<=${maxMB}M]`,

        `bv[height<=${quality}][vcodec^=avc1][ext=mp4]+ba[ext=m4a][acodec^=mp4a]`,

        `b[height<=${quality}][ext=mp4][vcodec^=avc1][acodec^=mp4a]`,

        `bv[height<=${quality}]+ba`,

        `b[height<=${quality}]`
    ].join('/')

    const result = await ytdlp(
        video.url,
        {
            format,

            output: path.join(
                folder,
                'source.%(ext)s'
            ),

            mergeOutputFormat: 'mp4',

            ffmpegLocation: ffmpeg,

            jsRuntimes: `node:${process.execPath}`,

            noPlaylist: true,
            noWarnings: true,
            noProgress: true,

            socketTimeout: 15,

            retries: 1,
            fragmentRetries: 2,

            concurrentFragments: 4,

            maxFilesize: '150M',

            matchFilter:
                'duration <= 420 & !is_live',

            print: 'after_move:title',

            noSimulate: true
        },
        {
            timeout: CONFIG.downloadTimeout
        }
    )

    if (typeof result === 'string' && result.trim()) {
        video.title = result.trim().split('\n').at(-1)
    }

    const files = await fs.readdir(folder)

    const source = files.find(file =>
        /^source\.(mp4|webm|mkv|mov)$/i.test(file)
    )

    if (!source) {
        throw new Error(
            'Descarga rechazada o archivo no generado. Verificá el límite de 7 minutos.'
        )
    }

    const file = path.join(folder, source)
    const stats = await fs.stat(file)

    if (!stats.size || stats.size > CONFIG.maxDownload) {
        throw new Error('Tamaño de descarga inválido.')
    }

    console.log(
        `[PLAY2] Descarga: ${mb(stats.size)} MB`
    )

    console.log(
        `[PLAY2] Tiempo de descarga: ${
            ((Date.now() - inicio) / 1000).toFixed(1)
        }s`
    )

    return file
}

// ============================================================
// 🔍 ANALIZAR VIDEO
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
            timeout: 15000,
            maxBuffer: 4 * 1024 * 1024
        }
    )

    const data = JSON.parse(stdout)

    const video = data.streams?.find(
        stream => stream.codec_type === 'video'
    )

    const audio = data.streams?.find(
        stream => stream.codec_type === 'audio'
    )

    if (!video) {
        throw new Error('Video inválido.')
    }

    const stats = await fs.stat(file)

    return {
        file,
        size: stats.size,

        width: video.width,
        height: video.height,

        videoCodec: video.codec_name,
        audioCodec: audio?.codec_name || null,

        pixelFormat: video.pix_fmt,

        duration: Number(data.format?.duration || 0),

        format: data.format?.format_name || ''
    }
}

// ============================================================
// ⚡ COMPROBAR COMPATIBILIDAD
// ============================================================

function compatible(info, maxSize) {

    return (
        path.extname(info.file).toLowerCase() === '.mp4' &&

        info.format.split(',').includes('mp4') &&

        info.videoCodec === 'h264' &&

        (
            info.audioCodec === 'aac' ||
            info.audioCodec === null
        ) &&

        info.pixelFormat === 'yuv420p' &&

        info.width <= 1280 &&

        info.height <= 1280 &&

        info.size > 0 &&

        info.size <= maxSize
    )
}

// ============================================================
// 🎥 OPTIMIZAR SOLO SI ES NECESARIO
// ============================================================

async function prepararVideo(source, folder, documento) {

    const original = await analizarVideo(source)

    if (
        !Number.isFinite(original.duration) ||
        original.duration <= 0 ||
        original.duration > CONFIG.maxDuration + 1
    ) {
        throw new Error(
            'Solo se permiten videos de hasta 7 minutos.'
        )
    }

    const maxSize = documento
        ? CONFIG.maxDocument
        : CONFIG.maxVideo

    // ========================================================
    // ⚡ ENVÍO DIRECTO SIN FFMPEG
    // ========================================================

    if (compatible(original, maxSize)) {

        console.log(
            '[PLAY2] FAST MODE: video compatible.'
        )

        console.log(
            '[PLAY2] Conversión omitida.'
        )

        return original
    }

    // ========================================================
    // 🔄 REMUX RÁPIDO SIN RECODIFICAR
    // ========================================================

    const output = path.join(
        folder,
        'whatsapp.mp4'
    )

    if (
        original.videoCodec === 'h264' &&
        original.pixelFormat === 'yuv420p' &&
        original.width <= 1280 &&
        original.height <= 1280 &&
        (
            original.audioCodec === 'aac' ||
            original.audioCodec === null
        ) &&
        original.size <= maxSize
    ) {

        try {

            console.log('[PLAY2] REMUX MODE')

            await exec(ffmpeg, [
                '-hide_banner',
                '-loglevel', 'error',
                '-y',

                '-i', source,

                '-map', '0:v:0',
                '-map', '0:a:0?',

                '-c', 'copy',

                '-movflags', '+faststart',

                output
            ], {
                timeout: 30000
            })

            const info = await analizarVideo(output)

            if (compatible(info, maxSize)) {
                return info
            }

        } catch (error) {

            console.log(
                '[PLAY2] Remux falló:',
                error.message
            )
        }
    }

    // ========================================================
    // 🎥 CONVERSIÓN COMO ÚLTIMA OPCIÓN
    // ========================================================

    console.log(
        '[PLAY2] CONVERT MODE: recodificación necesaria.'
    )

    const inicio = Date.now()

    const quality = documento
        ? CONFIG.documentQuality
        : CONFIG.videoQuality

    const totalBitrate = Math.floor(
        maxSize * 8 * 0.85 /
        original.duration /
        1000
    )

    const bitrate = Math.max(
        150,
        Math.min(
            documento ? 2000 : 1200,
            totalBitrate - 96
        )
    )

    await exec(
        ffmpeg,
        [
            '-hide_banner',
            '-loglevel', 'error',
            '-y',

            '-i', source,

            '-map', '0:v:0',
            '-map', '0:a:0?',

            '-vf',
            `scale=w='min(${documento ? 1280 : 854},iw)':h='min(${quality},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,

            '-c:v', 'libx264',

            '-preset', 'ultrafast',

            '-pix_fmt', 'yuv420p',

            '-r', '30',

            '-b:v', `${bitrate}k`,

            '-maxrate', `${bitrate}k`,

            '-bufsize', `${bitrate * 2}k`,

            '-c:a', 'aac',

            '-b:a', '96k',

            '-ar', '44100',

            '-ac', '2',

            '-threads', '2',

            '-movflags', '+faststart',

            output
        ],
        {
            timeout: CONFIG.conversionTimeout,

            maxBuffer: 4 * 1024 * 1024
        }
    )

    const result = await analizarVideo(output)

    if (!compatible(result, maxSize)) {
        throw new Error(
            'El video convertido no es compatible o supera el límite.'
        )
    }

    if (original.audioCodec && !result.audioCodec) {
        throw new Error('El video perdió el audio.')
    }

    console.log(
        `[PLAY2] Conversión: ${
            ((Date.now() - inicio) / 1000).toFixed(1)
        }s`
    )

    return result
}

// ============================================================
// 📤 ENVIAR VIDEO
// ============================================================

async function enviarVideo(
    conn,
    m,
    video,
    result,
    documento
) {

    const inicio = Date.now()

    const caption =
        `🎬 *${video.title}*\n` +
        `⏱️ ${duracion(result.duration)}\n` +
        `📐 ${result.width} × ${result.height}\n` +
        `📦 ${mb(result.size)} MB`

    if (documento) {

        await conn.sendMessage(m.chat, {

            document: {
                url: result.file
            },

            mimetype: 'video/mp4',

            fileName:
                `${limpiarNombre(video.title)}.mp4`,

            caption

        }, { quoted: m })

    } else {

        await conn.sendMessage(m.chat, {

            video: {
                url: result.file
            },

            mimetype: 'video/mp4',

            gifPlayback: false,

            caption

        }, { quoted: m })
    }

    console.log(
        `[PLAY2] Envío: ${
            ((Date.now() - inicio) / 1000).toFixed(1)
        }s`
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

    const inicio = Date.now()
    const sender = m.sender

    const query = String(
        text || args.join(' ') || ''
    ).trim()

    const documento = DOCUMENTOS.has(
        String(command).toLowerCase()
    )

    const exento = Boolean(
        isAdmin ||
        isOwner ||
        isROwner ||
        m.fromMe
    )

    if (!query) {

        return m.reply(
            `🎬 *PLAY VIDEO*\n\n` +
            `• ${usedPrefix}play2 nombre o enlace\n` +
            `• ${usedPrefix}play4 nombre o enlace`
        )
    }

    // Limpiar cooldowns vencidos.

    for (const [id, time] of cooldowns) {

        if (Date.now() - time >= CONFIG.cooldown) {
            cooldowns.delete(id)
        }
    }

    if (!exento) {

        const restante =
            CONFIG.cooldown -
            (Date.now() - (cooldowns.get(sender) || 0))

        if (restante > 0) {

            return m.reply(
                `⏳ Esperá ${
                    duracion(Math.ceil(restante / 1000))
                }.`
            )
        }
    }

    if (processing.has(sender)) return

    if (processing.size >= CONFIG.maxConcurrent) {
        return react(conn, m, '⏳')
    }

    processing.add(sender)

    let folder

    try {

        if (!ffmpeg || !ffprobe.path) {
            throw new Error(
                'FFmpeg o FFprobe no disponibles.'
            )
        }

        await react(conn, m, '⏳')

        const video = await buscarVideo(query)

        folder = await fs.mkdtemp(
            path.join(os.tmpdir(), 'play2-fast-')
        )

        const source = await descargarVideo(
            video,
            folder,
            documento
        )

        const result = await prepararVideo(
            source,
            folder,
            documento
        )

        await enviarVideo(
            conn,
            m,
            video,
            result,
            documento
        )

        if (!exento) {
            cooldowns.set(sender, Date.now())
        }

        await react(conn, m, '✅')

        console.log(
            `[PLAY2] Tiempo total: ${
                ((Date.now() - inicio) / 1000).toFixed(1)
            }s`
        )

    } catch (error) {

        console.error(
            '[PLAY2] ERROR:',
            error.stderr || error.message || error
        )

        await react(conn, m, '❌')

        const mensaje = String(
            error.stderr || error.message || ''
        )

        if (
            /sign in|not a bot|cookies/i.test(mensaje)
        ) {

            return m.reply(
                '❌ YouTube bloqueó la descarga.'
            )
        }

        if (
            /7 minutos|No encontré|Enlace|Tamaño/i.test(mensaje)
        ) {

            return m.reply(
                `⚠️ ${error.message}`
            )
        }

        await m.reply(
            '❌ No se pudo descargar el video.'
        )

    } finally {

        if (folder) {

            await fs.rm(folder, {
                recursive: true,
                force: true
            }).catch(() => {})
        }

        processing.delete(sender)
    }
}

// ============================================================
// ⚙️ REGISTRO
// ============================================================

handler.help = [
    'play2 <nombre o enlace>',
    'play4 <nombre o enlace>'
]

handler.tags = ['downloader']

handler.command =
    /^(play2|video|ytmp4|play4|playdoc2|videodoc)$/i

handler.group = true
handler.register = false
handler.limit = false

export default handler
