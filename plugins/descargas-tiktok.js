
/**
 * 📂 plugins/_tiktok.js
 * 🤖 whatsapp-bot — TIKTOK DOWNLOADER
 *
 * 📋 Menú: .t
 * 🎬 Videos sin marca de agua mediante API
 * 🖼️ Álbumes de imágenes
 * 🎵 Descarga de audio
 * 🔄 LuxInfinity + yt-dlp
 * ⚡ Conversión solo cuando sea necesaria
 * 👑 Owners y admins sin cooldown
 * ⏳ Cooldown de 5 minutos
 * 👥 Solo grupos
 * 🔇 Sin spam
 * 🧹 Limpieza automática
 */

import fetch from 'node-fetch'
import ytdlp from 'youtube-dl-exec'
import ffmpeg from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'
import sharp from 'sharp'

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
import { createWriteStream } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default &&
    Object.keys(baileysMod).length === 1
    ? baileysMod.default
    : baileysMod

const {
    generateWAMessageFromContent,
    generateWAMessage
} = pkg

const exec = promisify(execFile)

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const CONFIG = {
    api: 'https://luxinfinity.vercel.app/api/tiktok',

    apiTimeout: 12000,
    mediaTimeout: 60000,
    downloadTimeout: 120000,

    cooldown: 5 * 60 * 1000,

    maxConcurrent: 2,
    maxImages: 20,
    maxDuration: 420,

    maxVideo: 50 * 1024 * 1024,
    maxAudio: 25 * 1024 * 1024,
    maxImage: 8 * 1024 * 1024
}

const processing = new Set()
const cooldowns = new Map()

const AUDIO_COMMANDS = new Set([
    'ttaudio',
    'ttmp3',
    'tiktokmp3',
    'tiktokaudio'
])

// ============================================================
// 📋 MENÚ DE TIKTOK
// ============================================================

async function menuTikTok(conn, m, prefix = '.') {

    const menu = `╭━━〔 🎵 *TIKTOK MENU* 〕━━╮
┃
┃ 🎬 *DESCARGAR VIDEOS*
┃ ⌗ ${prefix}tt
┃ ⌗ ${prefix}ttk
┃ ⌗ ${prefix}ttkdl
┃ ⌗ ${prefix}tiktok
┃ ⌗ ${prefix}tiktokdl
┃
┃ 🎧 *DESCARGAR AUDIO*
┃ ⌗ ${prefix}ttaudio
┃ ⌗ ${prefix}ttmp3
┃ ⌗ ${prefix}tiktokmp3
┃ ⌗ ${prefix}tiktokaudio
┃
┃ 🖼️ *ÁLBUM DE IMÁGENES*
┃ ⌗ ${prefix}tt + enlace
┃ Detección automática
┃
┃ 📌 *MODO DE USO*
┃ Comando + enlace de TikTok
┃
┃ ⏳ Cooldown: 5 minutos
┃ 👑 Admins y owners sin espera
┃ ⏱️ Duración máxima: 7 minutos
┃
╰━━〔 *WHATSAPP-BOT* 〕━━╯`

    await conn.sendMessage(
        m.chat,
        { text: menu },
        { quoted: m }
    )
}

// ============================================================
// 🔗 VALIDAR ENLACE
// ============================================================

function obtenerURL(text) {

    const match = String(text || '')
        .match(/https?:\/\/[^\s]+/i)

    if (!match) return null

    try {

        const url = new URL(match[0])
        const host = url.hostname.toLowerCase()

        if (
            host !== 'tiktok.com' &&
            !host.endsWith('.tiktok.com')
        ) {
            return null
        }

        if (
            !['https:', 'http:'].includes(url.protocol) ||
            url.username ||
            url.password ||
            url.port
        ) {
            return null
        }

        return url.href

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
// 🛠️ UTILIDADES
// ============================================================

function formatoNumero(value) {

    return (Number(value) || 0)
        .toLocaleString('es-UY')
}

function limpiarTexto(value, max = 300) {

    return String(value || '')
        .trim()
        .slice(0, max)
}

function obtenerAutor(data) {

    const author = data?.author

    if (typeof author === 'string') {
        return author
    }

    return (
        author?.nickname ||
        author?.name ||
        author?.unique_id ||
        data?.music?.author ||
        'Anónimo'
    )
}

function obtenerMediaURL(value) {

    if (typeof value === 'object' && value) {

        value =
            value.url ||
            value.download ||
            value.src
    }

    if (typeof value !== 'string') {
        return null
    }

    try {

        const url = new URL(value)

        if (
            url.protocol !== 'https:' ||
            url.username ||
            url.password ||
            url.port
        ) {
            return null
        }

        const host = url.hostname.toLowerCase()

        const domains = [
            'tiktok.com',
            'tiktokcdn.com',
            'tiktokcdn-us.com',
            'tiktokcdn-eu.com',
            'tiktokv.com',
            'byteoversea.com',
            'ibytedtos.com',
            'muscdn.com',
            'musical.ly',
            'byteimg.com',
            'ibyteimg.com'
        ]

        const permitido = domains.some(domain =>
            host === domain ||
            host.endsWith(`.${domain}`)
        )

        return permitido ? url.href : null

    } catch {
        return null
    }
}

// ============================================================
// 🌐 CONSULTAR API
// ============================================================

async function consultarAPI(url) {

    const response = await fetch(
        `${CONFIG.api}?url=${encodeURIComponent(url)}`,
        {
            signal: AbortSignal.timeout(
                CONFIG.apiTimeout
            ),

            size: 1024 * 1024,

            headers: {
                Accept: 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        }
    )

    if (!response.ok) {

        throw new Error(
            `LuxInfinity HTTP ${response.status}`
        )
    }

    const json = await response.json()

    if (!json?.status || !json?.data) {

        throw new Error(
            'LuxInfinity no devolvió contenido.'
        )
    }

    return json.data
}

// ============================================================
// 📥 DESCARGAR ARCHIVOS CON LÍMITE REAL
// ============================================================

async function descargarArchivo(
    value,
    destination,
    maxSize,
    tipo
) {

    let url = obtenerMediaURL(value)

    if (!url) {
        throw new Error('URL multimedia no permitida.')
    }

    const signal = AbortSignal.timeout(
        CONFIG.mediaTimeout
    )

    let response

    // Permitir redirecciones únicamente hacia
    // dominios multimedia autorizados.

    for (let i = 0; i <= 3; i++) {

        response = await fetch(url, {
            signal,
            redirect: 'manual',

            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        })

        if (
            response.status >= 300 &&
            response.status < 400
        ) {

            const location =
                response.headers.get('location')

            response.body?.destroy()

            if (!location || i === 3) {
                throw new Error('Redirección inválida.')
            }

            url = obtenerMediaURL(
                new URL(location, url).href
            )

            if (!url) {
                throw new Error(
                    'Redirección no permitida.'
                )
            }

            continue
        }

        break
    }

    if (!response?.ok || !response.body) {

        response?.body?.destroy()

        throw new Error(
            `Descarga HTTP ${response?.status}`
        )
    }

    const mime = String(
        response.headers.get('content-type') || ''
    ).toLowerCase()

    const permitido =
        mime.startsWith(`${tipo}/`) ||
        mime.includes('application/octet-stream')

    if (!permitido) {

        response.body.destroy()

        throw new Error(
            `Contenido inválido: ${mime}`
        )
    }

    const length = Number(
        response.headers.get('content-length') || 0
    )

    if (length > maxSize) {

        response.body.destroy()

        throw new Error(
            'El archivo supera el tamaño permitido.'
        )
    }

    let total = 0

    const limiter = new Transform({

        transform(chunk, encoding, callback) {

            total += chunk.length

            if (total > maxSize) {

                return callback(
                    new Error('Archivo demasiado grande.')
                )
            }

            callback(null, chunk)
        }
    })

    await pipeline(
        response.body,
        limiter,
        createWriteStream(destination)
    )

    if (!total) {
        throw new Error('Archivo vacío.')
    }

    return destination
}

// ============================================================
// 🔍 ANALIZAR MULTIMEDIA
// ============================================================

async function analizar(file) {

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
        stream => stream.codec_type === 'video' &&
            !stream.disposition?.attached_pic
    )

    const audio = data.streams?.find(
        stream => stream.codec_type === 'audio'
    )

    const stats = await fs.stat(file)

    return {
        file,

        size: stats.size,

        duration: Number(
            data.format?.duration || 0
        ),

        format: data.format?.format_name || '',

        videoCodec: video?.codec_name,
        audioCodec: audio?.codec_name,

        pixelFormat: video?.pix_fmt,

        width: video?.width,
        height: video?.height
    }
}

function duracionValida(info) {

    return (
        Number.isFinite(info.duration) &&
        info.duration > 0 &&
        info.duration <= CONFIG.maxDuration
    )
}

// ============================================================
// ⚡ VALIDAR VIDEO COMPATIBLE
// ============================================================

function videoCompatible(info) {

    return (
        info.format.split(',').includes('mp4') &&
        info.videoCodec === 'h264' &&
        info.pixelFormat === 'yuv420p' &&
        (
            !info.audioCodec ||
            info.audioCodec === 'aac'
        ) &&
        info.width <= 1280 &&
        info.height <= 1280 &&
        info.size > 0 &&
        info.size <= CONFIG.maxVideo &&
        duracionValida(info)
    )
}

// ============================================================
// 🎥 PREPARAR VIDEO PARA WHATSAPP
// ============================================================

async function prepararVideo(file, folder) {

    const info = await analizar(file)

    if (!info.videoCodec) {
        throw new Error('Video inválido.')
    }

    if (!duracionValida(info)) {

        throw new Error(
            'Solo se permiten videos de hasta 7 minutos.'
        )
    }

    // Enviar directamente si ya es compatible.

    if (videoCompatible(info)) {

        console.log(
            '[TIKTOK] FAST MODE: conversión omitida.'
        )

        return file
    }

    const output = path.join(
        folder,
        'whatsapp.mp4'
    )

    const bitrate = Math.max(
        150,
        Math.min(
            1500,
            Math.floor(
                CONFIG.maxVideo * 8 * 0.85 /
                info.duration / 1000
            ) - 96
        )
    )

    console.log(
        '[TIKTOK] Convirtiendo video.'
    )

    await exec(ffmpeg, [

        '-hide_banner',
        '-loglevel', 'error',
        '-y',

        '-i', file,

        '-map', '0:v:0',
        '-map', '0:a:0?',

        '-vf',
        "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",

        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p',

        '-r', '30',

        '-b:v', `${bitrate}k`,
        '-maxrate', `${bitrate}k`,
        '-bufsize', `${bitrate * 2}k`,

        '-c:a', 'aac',
        '-b:a', '96k',

        '-threads', '2',

        '-movflags', '+faststart',

        output

    ], {

        timeout: CONFIG.downloadTimeout,

        maxBuffer: 4 * 1024 * 1024

    })

    const result = await analizar(output)

    if (
        !videoCompatible(result) ||
        (
            info.audioCodec &&
            !result.audioCodec
        )
    ) {

        throw new Error(
            'El video convertido no es compatible.'
        )
    }

    return output
}

// ============================================================
// 🎵 PREPARAR AUDIO MP3
// ============================================================

async function prepararAudio(file, folder) {

    const info = await analizar(file)

    if (
        !info.audioCodec ||
        !duracionValida(info)
    ) {

        throw new Error(
            'Audio inválido o superior a 7 minutos.'
        )
    }

    if (
        info.audioCodec === 'mp3' &&
        info.format === 'mp3' &&
        info.size <= CONFIG.maxAudio
    ) {

        console.log(
            '[TIKTOK] Audio MP3 compatible.'
        )

        return file
    }

    const output = path.join(
        folder,
        'whatsapp-audio.mp3'
    )

    await exec(ffmpeg, [

        '-hide_banner',
        '-loglevel', 'error',
        '-y',

        '-i', file,

        '-vn',

        '-c:a', 'libmp3lame',
        '-b:a', '128k',

        output

    ], {

        timeout: CONFIG.downloadTimeout,

        maxBuffer: 4 * 1024 * 1024

    })

    const result = await analizar(output)

    if (
        result.audioCodec !== 'mp3' ||
        result.size <= 0 ||
        result.size > CONFIG.maxAudio ||
        !duracionValida(result)
    ) {

        throw new Error(
            'Audio convertido inválido.'
        )
    }

    return output
}

// ============================================================
// 🔄 RESPALDO MEDIANTE YT-DLP
// ============================================================

async function descargarRespaldo(
    url,
    folder,
    audio
) {

    console.log(
        '[TIKTOK] Utilizando respaldo yt-dlp.'
    )

    const options = {

        format: audio
            ? 'bestaudio/best'
            : [
                'b[height<=720][ext=mp4][vcodec^=avc1][acodec^=mp4a]',
                'bv[height<=720][vcodec^=avc1]+ba[acodec^=mp4a]',
                'b[height<=720][ext=mp4]',
                'bv[height<=720]+ba',
                'b[height<=720]'
            ].join('/'),

        output: path.join(
            folder,
            'fallback.%(ext)s'
        ),

        ffmpegLocation: ffmpeg,

        noPlaylist: true,
        noWarnings: true,
        noProgress: true,

        socketTimeout: 15,

        retries: 1,
        fragmentRetries: 1,

        concurrentFragments: 4,

        maxFilesize: audio
            ? '25M'
            : '50M',

        matchFilter:
            'duration <= 420 & !is_live'
    }

    if (audio) {

        options.extractAudio = true
        options.audioFormat = 'mp3'
        options.audioQuality = '128K'

    } else {

        options.mergeOutputFormat = 'mp4'
    }

    await ytdlp(
        url,
        options,
        {
            timeout: CONFIG.downloadTimeout
        }
    )

    const files = await fs.readdir(folder)

    const file = files.find(name =>

        /^fallback\.(mp4|webm|mkv|mov|mp3|m4a|opus|aac|ogg)$/i
            .test(name)
    )

    if (!file) {

        throw new Error(
            'yt-dlp no generó un archivo.'
        )
    }

    const result = path.join(folder, file)

    const stats = await fs.stat(result)

    if (
        !stats.size ||
        stats.size > (
            audio
                ? CONFIG.maxAudio
                : CONFIG.maxVideo
        )
    ) {

        throw new Error(
            'Archivo demasiado grande o vacío.'
        )
    }

    return result
}

// ============================================================
// 📝 INFORMACIÓN DEL TIKTOK
// ============================================================

function crearCaption(data, cantidad = 0) {

    const title = limpiarTexto(data?.title)

    const author = limpiarTexto(
        obtenerAutor(data),
        80
    )

    const music = limpiarTexto(
        data?.music?.title || 'Sonido original',
        100
    )

    return `╭━━〔 ${cantidad ? '🖼️' : '🎵'} *TIKTOK* 〕━━╮
┃ 👤 ${author}
${title ? `┃ 📝 ${title}\n` : ''}┃ 🎵 ${music}
${cantidad ? `┃ 🖼️ Imágenes: ${cantidad}\n` : ''}┃ ❤️ ${formatoNumero(data?.likes)}
┃ 💬 ${formatoNumero(data?.comments)}
┃ 🔁 ${formatoNumero(data?.shares)}
┃ 👁️ ${formatoNumero(data?.plays)}
╰━━━━━━━━━━━━━━━━╯`
}

// ============================================================
// 🖼️ PREPARAR IMÁGENES
// ============================================================

async function prepararImagenes(data, folder) {

    const images = data.images.slice(
        0,
        CONFIG.maxImages
    )

    const resultados = []

    for (let i = 0; i < images.length; i++) {

        const source = path.join(
            folder,
            `image-${i}.raw`
        )

        const output = path.join(
            folder,
            `image-${i}.jpg`
        )

        await descargarArchivo(
            images[i],
            source,
            CONFIG.maxImage,
            'image'
        )

        await sharp(source, {

            limitInputPixels: 25000000

        })

            .rotate()

            .resize({
                width: 1600,
                height: 1600,
                fit: 'inside',
                withoutEnlargement: true
            })

            .flatten({
                background: '#FFFFFF'
            })

            .jpeg({
                quality: 88
            })

            .toFile(output)

        resultados.push(output)

        await fs.unlink(source).catch(() => {})
    }

    return resultados
}

// ============================================================
// 📚 ENVIAR ÁLBUM NATIVO DE WHATSAPP
// ============================================================

async function enviarAlbum(
    conn,
    m,
    images,
    caption
) {

    if (!images.length) {
        throw new Error('Álbum vacío.')
    }

    if (images.length === 1) {

        await conn.sendMessage(
            m.chat,
            {
                image: {
                    url: images[0]
                },
                caption
            },
            {
                quoted: m
            }
        )

        return
    }

    if (
        typeof generateWAMessageFromContent !== 'function' ||
        typeof generateWAMessage !== 'function'
    ) {

        throw new Error(
            'La versión de Baileys no admite álbumes.'
        )
    }

    const album = generateWAMessageFromContent(

        m.chat,

        {
            albumMessage: {

                expectedImageCount: images.length,
                expectedVideoCount: 0

            }
        },

        {
            userJid: conn.user.id
        }
    )

    const mensajes = []

    // Preparar imágenes antes de publicar el álbum.

    for (let i = 0; i < images.length; i++) {

        const msg = await generateWAMessage(

            m.chat,

            {
                image: {
                    url: images[i]
                },

                caption: i === 0
                    ? caption
                    : ''
            },

            {
                userJid: conn.user.id,
                upload: conn.waUploadToServer
            }
        )

        msg.message.messageContextInfo = {

            ...msg.message.messageContextInfo,

            messageAssociation: {

                associationType: 1,

                parentMessageKey: album.key
            }
        }

        mensajes.push(msg)
    }

    await conn.relayMessage(

        m.chat,

        album.message,

        {
            messageId: album.key.id
        }
    )

    // Mantener el orden original de las imágenes.

    for (const msg of mensajes) {

        await conn.relayMessage(

            m.chat,

            msg.message,

            {
                messageId: msg.key.id
            }
        )
    }
}

// ============================================================
// 📤 ENVIAR VIDEO O AUDIO
// ============================================================

async function enviarMultimedia(
    conn,
    m,
    file,
    data,
    audio
) {

    if (audio) {

        await conn.sendMessage(

            m.chat,

            {
                audio: {
                    url: file
                },

                mimetype: 'audio/mpeg',

                ptt: false
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
                url: file
            },

            mimetype: 'video/mp4',

            gifPlayback: false,

            caption: data
                ? crearCaption(data)
                : '🎵 *TIKTOK*'
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

    text = '',
    args = [],

    command,

    usedPrefix = '.',

    isAdmin,
    isOwner,
    isROwner

}) => {

    // Exclusivamente en grupos.

    if (!m.isGroup) return

    const cmd = String(command).toLowerCase()

    // ========================================================
    // 📋 MENÚ .T SIN COOLDOWN
    // ========================================================

    if (cmd === 't') {

        // Evitar interferir con el comando t sin prefijo.

        if (usedPrefix !== '.') return

        return menuTikTok(
            conn,
            m,
            usedPrefix
        )
    }

    const inicio = Date.now()

    const sender = m.sender

    const url = obtenerURL(
        text || args.join(' ')
    )

    const audio = AUDIO_COMMANDS.has(cmd)

    const exento = Boolean(
        isAdmin ||
        isOwner ||
        isROwner ||
        m.fromMe
    )

    // ========================================================
    // 🔗 VALIDAR ENLACE
    // ========================================================

    if (!url) {

        return m.reply(

            `*『 ✙ 』ENLACE INVÁLIDO.*\n` +
            `> Enviá un enlace válido de TikTok.\n\n` +
            `📋 Menú: ${usedPrefix}t`

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

        const restante = CONFIG.cooldown -
            (now - (cooldowns.get(sender) || 0))

        if (restante > 0) {

            const segundos = Math.ceil(
                restante / 1000
            )

            const minutos = Math.floor(
                segundos / 60
            )

            return m.reply(

                `⏳ Esperá ${minutos}m ${segundos % 60}s.`

            )
        }
    }

    // ========================================================
    // 🛡️ CONTROL DE SOLICITUDES
    // ========================================================

    if (processing.has(sender)) return

    if (processing.size >= CONFIG.maxConcurrent) {

        return m.reply(
            '⏳ Servidor ocupado. Intentá más tarde.'
        )
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

        folder = await fs.mkdtemp(

            path.join(
                os.tmpdir(),
                'whatsapp-tiktok-'
            )
        )

        let data = null

        // ====================================================
        // 🌐 CONSULTAR LUXINFINITY
        // ====================================================

        try {

            data = await consultarAPI(url)

            console.log(
                '[TIKTOK] LuxInfinity disponible.'
            )

        } catch (error) {

            console.log(
                '[TIKTOK] API falló:',
                error.message
            )
        }

        // ====================================================
        // 🖼️ DETECTAR ÁLBUM DE IMÁGENES
        // ====================================================

        if (
            !audio &&
            Array.isArray(data?.images) &&
            data.images.length
        ) {

            const images = await prepararImagenes(
                data,
                folder
            )

            await enviarAlbum(

                conn,

                m,

                images,

                crearCaption(
                    data,
                    images.length
                )
            )

        } else {

            // ================================================
            // 🎬 DESCARGAR VIDEO O AUDIO
            // ================================================

            let file = null

            const media = audio

                ? data?.audio

                : data?.nowatermark ||
                  data?.video

            if (media) {

                try {

                    const downloaded =
                        await descargarArchivo(

                            media,

                            path.join(
                                folder,
                                audio
                                    ? 'source-audio.raw'
                                    : 'source-video.raw'
                            ),

                            audio
                                ? CONFIG.maxAudio
                                : CONFIG.maxVideo,

                            audio
                                ? 'audio'
                                : 'video'
                        )

                    file = audio

                        ? await prepararAudio(
                            downloaded,
                            folder
                        )

                        : await prepararVideo(
                            downloaded,
                            folder
                        )

                } catch (error) {

                    console.log(
                        '[TIKTOK] Multimedia API falló:',
                        error.message
                    )
                }
            }

            // ================================================
            // 🔄 RESPALDO AUTOMÁTICO
            // ================================================

            if (!file) {

                const downloaded =
                    await descargarRespaldo(

                        url,

                        folder,

                        audio
                    )

                file = audio

                    ? await prepararAudio(
                        downloaded,
                        folder
                    )

                    : await prepararVideo(
                        downloaded,
                        folder
                    )
            }

            // ================================================
            // 📤 ENVIAR RESULTADO
            // ================================================

            await enviarMultimedia(

                conn,

                m,

                file,

                data,

                audio
            )
        }

        // ====================================================
        // ✅ DESCARGA FINALIZADA
        // ====================================================

        if (!exento) {

            cooldowns.set(
                sender,
                Date.now()
            )
        }

        await react(conn, m, '✅')

        console.log(

            `[TIKTOK] Tiempo total: ${
                ((Date.now() - inicio) / 1000)
                    .toFixed(1)
            }s`
        )

    } catch (error) {

        console.error(

            '[TIKTOK] ERROR:',

            error.stderr ||
            error.message ||
            error
        )

        await react(conn, m, '❌')

        if (
            /7 minutos|demasiado grande|tamaño permitido/i
                .test(error.message || '')
        ) {

            return m.reply(
                `⚠️ ${error.message}`
            )
        }

        await m.reply(

            '*『 ❌ 』ERROR.*\n' +
            '> No se pudo procesar ese TikTok.'

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
// ⚙️ REGISTRO DE COMANDOS
// ============================================================

handler.help = [
    't',
    'tt <enlace>',
    'ttk <enlace>',
    'ttkdl <enlace>',
    'tiktok <enlace>',
    'tiktokdl <enlace>',
    'ttaudio <enlace>',
    'ttmp3 <enlace>',
    'tiktokmp3 <enlace>',
    'tiktokaudio <enlace>'
]

handler.tags = ['downloader']

handler.command =
    /^(t|tt|ttk|ttkdl|tiktok|tiktokdl|ttaudio|ttmp3|tiktokmp3|tiktokaudio)$/i

handler.group = true
handler.register = false
handler.limit = false

export default handler
