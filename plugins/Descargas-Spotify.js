
/**
 * 📂 plugins/spotify.js
 * 🤖 WHATSAPP-BOT — SPOTIFY ULTRA
 *
 * 🎵 Búsqueda por canción, artista o enlace
 * 🌐 Sistema de múltiples APIs
 * 🎧 Audio MP3 con portada
 * ⏳ Cooldown de 5 minutos
 * 👑 Admins y owners sin cooldown
 * 🔇 Sin mensajes privados
 * 🛡️ Manejo de desconexiones
 */

import axios from 'axios'
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
    cooldown: 5 * 60 * 1000,
    maxDuration: 420,
    maxSize: 25 * 1024 * 1024,
    maxDownload: 40 * 1024 * 1024,
    maxConcurrent: 2,
    searchTimeout: 15000,
    apiTimeout: 20000,
    downloadTimeout: 45000
}

const cooldowns = new Map()
const processing = new Set()
const avisos = new Map()

// ============================================================
// 😂 MENSAJES DE COOLDOWN
// ============================================================

const mensajesCooldown = [
    '¡No atomices, bo! JAJAJA 🐾',
    'Tomate un mate mientras esperás. 🧉',
    '¡Ansiedad con patas! JAJAJA 😭',
    'Pará un poquito, DJ. 😂',
    '¡No me explotes el servidor! 😭',
    'Tranquilidad, criatura. 🐼',
    '¡Aguantá un cacho, bo! 😂',
    'Spotify no se va a escapar. 🎵',
    'Dale descanso al pobre bot. 🥹',
    '¡Qué desesperación, por favor! 😂',
    'Todavía no, maestro. 🐾',
    'Respirá, que ya falta poquito. 😂',
    '¡Pará la máquina! 🚂',
    'El DJ está tomando mate. 🧉',
    '¡No seas intenso! JAJAJA 😭'
]

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
    } catch (error) {}
}

// ============================================================
// 🔌 DETECTAR DESCONEXIÓN
// ============================================================

function conexionCerrada(error) {
    if (!error) return false

    const status = error.output
        ? error.output.statusCode
        : error.statusCode

    return Number(status) === 428 ||
        /connection closed|socket closed/i.test(
            String(error.message || '')
        )
}

// ============================================================
// 💬 RESPUESTA SEGURA
// ============================================================

async function responder(conn, m, mensaje) {
    try {
        await conn.reply(m.chat, mensaje, m)
    } catch (error) {
        console.warn(
            '[SPOTIFY] No se pudo responder:',
            error.message
        )
    }
}

// ============================================================
// ⏱️ FORMATEAR TIEMPO
// ============================================================

function tiempoRestante(ms) {
    const segundos = Math.ceil(ms / 1000)
    const minutos = Math.floor(segundos / 60)
    const resto = segundos % 60

    return `${minutos}m ${resto}s`
}

// ============================================================
// 🧹 LIMPIAR COOLDOWNS VENCIDOS
// ============================================================

function limpiarCooldowns() {
    const ahora = Date.now()

    for (const [id, fecha] of cooldowns) {
        if (fecha <= ahora) {
            cooldowns.delete(id)
        }
    }

    for (const [id, fecha] of avisos) {
        if (ahora - fecha >= 30000) {
            avisos.delete(id)
        }
    }
}

// ============================================================
// 🌐 PETICIONES JSON
// ============================================================

async function obtenerJSON(url, timeout) {
    const respuesta = await axios.get(url, {
        timeout,
        maxRedirects: 3,
        maxContentLength: 2 * 1024 * 1024,
        headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0'
        }
    })

    let data = respuesta.data

    if (typeof data === 'string') {
        data = JSON.parse(data)
    }

    if (!data || typeof data !== 'object') {
        throw new Error('Respuesta JSON inválida.')
    }

    return data
}

// ============================================================
// 🔗 VALIDAR ENLACE DE SPOTIFY
// ============================================================

function enlaceSpotify(texto) {
    try {
        const url = new URL(texto)

        return url.protocol === 'https:' &&
            url.hostname === 'open.spotify.com' &&
            /\/track\/[a-zA-Z0-9]+/.test(url.pathname)

    } catch (error) {
        return false
    }
}

// ============================================================
// 🔍 BUSCAR CANCIÓN
// ============================================================

async function buscarCancion(texto) {

    // Permitir enlaces directos de Spotify.

    if (enlaceSpotify(texto)) {

        const url = new URL(texto)

        url.search = ''
        url.hash = ''

        const spotifyUrl = url.toString()

        let metadata = {}

        try {
            metadata = await obtenerJSON(
                'https://open.spotify.com/oembed?url=' +
                encodeURIComponent(spotifyUrl),
                CONFIG.searchTimeout
            )
        } catch (error) {
            console.warn(
                '[SPOTIFY] OEmbed:',
                error.message
            )
        }

        return {
            title: metadata.title || 'Spotify Audio',
            artist: metadata.author_name || 'Spotify',
            url: spotifyUrl,
            image: metadata.thumbnail_url || ''
        }
    }

    // Buscar por nombre o artista.

    const searchUrl =
        'https://api.delirius.store/search/spotify?q=' +
        encodeURIComponent(texto) +
        '&limit=1'

    const respuesta = await obtenerJSON(
        searchUrl,
        CONFIG.searchTimeout
    )

    const resultados = Array.isArray(respuesta.data)
        ? respuesta.data
        : []

    if (!resultados.length) {
        throw new Error('NO_RESULTS')
    }

    const data = resultados[0]

    const spotifyUrl = data.url || data.link

    if (!spotifyUrl || !enlaceSpotify(spotifyUrl)) {
        throw new Error('INVALID_SPOTIFY_URL')
    }

    return {
        title: String(
            data.title || data.name || 'Spotify Audio'
        ),

        artist: Array.isArray(data.artist)
            ? data.artist.join(', ')
            : String(data.artist || 'Artista desconocido'),

        url: spotifyUrl,

        image: data.image || data.thumbnail || ''
    }
}

// ============================================================
// 🌐 EXTRAER ENLACE DE DESCARGA
// ============================================================

function extraerDescarga(respuesta) {

    if (!respuesta) return null

    const result = respuesta.result || {}
    const data = respuesta.data || {}

    const candidatos = [
        result.downloadUrl,
        result.download_url,
        result.download,
        result.audio,
        result.url,
        data.dl_url,
        data.downloadUrl,
        data.download_url,
        data.download,
        data.audio,
        data.url,
        respuesta.downloadUrl,
        respuesta.download_url,
        respuesta.dl_url
    ]

    for (const candidato of candidatos) {

        if (typeof candidato !== 'string') continue

        try {
            const url = new URL(candidato)

            if (
                url.protocol === 'https:' &&
                !url.username &&
                !url.password &&
                url.hostname !== 'open.spotify.com'
            ) {
                return url.toString()
            }

        } catch (error) {}
    }

    return null
}

// ============================================================
// 📥 DESCARGAR AUDIO
// ============================================================

async function descargarAudio(url) {

    const respuesta = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: CONFIG.downloadTimeout,
        maxContentLength: CONFIG.maxDownload,
        maxRedirects: 0,
        headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'audio/*, application/octet-stream'
        }
    })

    const headers = respuesta.headers || {}

    const contentType = String(
        headers['content-type'] || ''
    ).toLowerCase()

    if (
        contentType.includes('text/html') ||
        contentType.includes('application/json') ||
        contentType.includes('text/plain')
    ) {
        throw new Error(
            'La API devolvió texto en lugar de audio.'
        )
    }

    const buffer = Buffer.from(respuesta.data)

    if (buffer.length < 1024) {
        throw new Error('Audio vacío o inválido.')
    }

    if (buffer.length > CONFIG.maxDownload) {
        throw new Error('MAX_SIZE')
    }

    const inicio = buffer
        .subarray(0, 100)
        .toString('utf8')
        .trim()
        .toLowerCase()

    if (
        inicio.startsWith('<!doctype') ||
        inicio.startsWith('<html') ||
        inicio.startsWith('{')
    ) {
        throw new Error('Archivo multimedia inválido.')
    }

    return buffer
}

// ============================================================
// 🔎 ANALIZAR AUDIO CON FFPROBE
// ============================================================

async function analizarAudio(archivo) {

    if (!ffprobe || !ffprobe.path) {
        throw new Error('FFPROBE_MISSING')
    }

    const resultado = await exec(
        ffprobe.path,
        [
            '-v', 'error',
            '-show_format',
            '-show_streams',
            '-of', 'json',
            archivo
        ],
        {
            timeout: 15000,
            maxBuffer: 1024 * 1024
        }
    )

    const info = JSON.parse(resultado.stdout)

    const streams = Array.isArray(info.streams)
        ? info.streams
        : []

    const audio = streams.find(
        stream => stream.codec_type === 'audio'
    )

    if (!audio) {
        throw new Error('INVALID_AUDIO')
    }

    const format = info.format || {}

    const duracion = Number(
        format.duration || audio.duration || 0
    )

    if (!Number.isFinite(duracion) || duracion <= 0) {
        throw new Error('INVALID_AUDIO')
    }

    if (duracion > CONFIG.maxDuration) {
        throw new Error('MAX_DURATION')
    }

    return {
        duracion,
        codec: audio.codec_name,
        formato: format.format_name || ''
    }
}

// ============================================================
// 🎧 PREPARAR MP3
// ============================================================

async function prepararMP3(buffer, tempDir) {

    const entrada = path.join(tempDir, 'entrada.media')
    const salida = path.join(tempDir, 'audio.mp3')

    await fs.writeFile(entrada, buffer)

    const info = await analizarAudio(entrada)

    // Si ya es MP3 válido, no convertir innecesariamente.

    if (
        info.codec === 'mp3' &&
        info.formato === 'mp3' &&
        buffer.length <= CONFIG.maxSize
    ) {
        return {
            buffer,
            duracion: info.duracion
        }
    }

    if (!ffmpeg) {
        throw new Error('FFMPEG_MISSING')
    }

    await exec(
        ffmpeg,
        [
            '-hide_banner',
            '-loglevel', 'error',
            '-y',
            '-i', entrada,
            '-map', '0:a:0',
            '-vn',
            '-c:a', 'libmp3lame',
            '-b:a', '192k',
            '-ar', '44100',
            '-ac', '2',
            '-threads', '2',
            salida
        ],
        {
            timeout: 60000,
            maxBuffer: 1024 * 1024
        }
    )

    const audio = await fs.readFile(salida)

    if (!audio.length) {
        throw new Error('INVALID_AUDIO')
    }

    if (audio.length > CONFIG.maxSize) {
        throw new Error('MAX_SIZE')
    }

    const final = await analizarAudio(salida)

    return {
        buffer: audio,
        duracion: final.duracion
    }
}

// ============================================================
// 🌐 SISTEMA DE APIs ALTERNATIVAS
// ============================================================

async function obtenerAudio(spotifyUrl, tempDir) {

    const url = encodeURIComponent(spotifyUrl)

    const apis = [
        {
            nombre: 'Nekolabs',
            url:
                'https://api.nekolabs.my.id/downloader/' +
                `spotify/v1?url=${url}`
        },
        {
            nombre: 'Sylphy',
            url:
                'https://api.sylphy.xyz/download/' +
                `spotify?url=${url}&apikey=sylphy-c519`
        },
        {
            nombre: 'Neoxr',
            url:
                'https://api.neoxr.eu/api/' +
                `spotify?url=${url}&apikey=russellxz`
        }
    ]

    const errores = []

    for (const api of apis) {

        try {

            console.log(
                `[SPOTIFY] Probando ${api.nombre}...`
            )

            const respuesta = await obtenerJSON(
                api.url,
                CONFIG.apiTimeout
            )

            const downloadUrl =
                extraerDescarga(respuesta)

            if (!downloadUrl) {
                throw new Error(
                    'No devolvió enlace de descarga.'
                )
            }

            const buffer =
                await descargarAudio(downloadUrl)

            const audio =
                await prepararMP3(buffer, tempDir)

            console.log(
                `[SPOTIFY] API exitosa: ${api.nombre}`
            )

            return {
                buffer: audio.buffer,
                duracion: audio.duracion,
                proveedor: api.nombre
            }

        } catch (error) {

            if (error.message === 'MAX_DURATION') {
                throw error
            }

            if (
                error.message === 'FFMPEG_MISSING' ||
                error.message === 'FFPROBE_MISSING'
            ) {
                throw error
            }

            const status = error.response
                ? error.response.status
                : ''

            const detalle = status
                ? `HTTP ${status}`
                : String(error.message || 'Error')

            errores.push(
                `${api.nombre}: ${detalle}`
            )

            console.warn(
                `[SPOTIFY] ${api.nombre}: ${detalle}`
            )
        }
    }

    throw new Error(
        'APIS_FAILED: ' + errores.join(' | ')
    )
}

// ============================================================
// 📝 LIMPIAR NOMBRE DEL ARCHIVO
// ============================================================

function nombreArchivo(texto) {

    return String(texto || 'Spotify Audio')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .trim()
        .slice(0, 100) || 'Spotify Audio'
}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

let handler = async function (m, {
    conn,
    text = '',
    usedPrefix = '.',
    isAdmin,
    isOwner,
    isROwner
}) {

    // 🔇 No responder en privados.

    if (!m.isGroup) return

    const consulta = String(text).trim()

    if (!consulta) {
        return responder(
            conn,
            m,
            `╭━━〔 🎧 *SPOTIFY* 〕━━╮
┃
┃ 🎵 Busca una canción.
┃
┃ 📝 Ejemplo:
┃ ${usedPrefix}spotify Rammstein Sonne
┃
┃ 🔗 También admite enlaces
┃ de canciones de Spotify.
┃
┃ ⏱️ Máximo 7 minutos.
╰━━━━━━━━━━━━━━━━━━━━╯`
        )
    }

    if (consulta.length > 500) {
        return responder(
            conn,
            m,
            '❌ La búsqueda es demasiado larga.'
        )
    }

    const sender = m.sender

    const exento = Boolean(
        isAdmin || isOwner || isROwner
    )

    limpiarCooldowns()

    // ========================================================
    // ⏳ COOLDOWN
    // ========================================================

    if (!exento) {

        const vencimiento =
            cooldowns.get(sender) || 0

        const restante =
            vencimiento - Date.now()

        if (restante > 0) {

            const ultimoAviso =
                avisos.get(sender) || 0

            if (Date.now() - ultimoAviso < 30000) {
                return react(conn, m, '⏳')
            }

            avisos.set(sender, Date.now())

            const frase = mensajesCooldown[
                Math.floor(
                    Math.random() *
                    mensajesCooldown.length
                )
            ]

            return responder(
                conn,
                m,
                `${frase}\n\n` +
                `⏳ Esperá *${tiempoRestante(restante)}*.`
            )
        }
    }

    // ========================================================
    // 🛡️ CONTROL DE SOLICITUDES
    // ========================================================

    if (processing.has(sender)) {
        return react(conn, m, '⏳')
    }

    if (processing.size >= CONFIG.maxConcurrent) {
        return react(conn, m, '⏳')
    }

    processing.add(sender)

    let tempDir = null

    try {

        await react(conn, m, '🎵')

        // ====================================================
        // 🔍 BUSCAR CANCIÓN
        // ====================================================

        const cancion =
            await buscarCancion(consulta)

        console.log(
            `[SPOTIFY] Canción: ${cancion.title}`
        )

        // ====================================================
        // 📂 CARPETA TEMPORAL
        // ====================================================

        tempDir = await fs.mkdtemp(
            path.join(os.tmpdir(), 'whatsapp-spotify-')
        )

        // ====================================================
        // 📥 OBTENER AUDIO
        // ====================================================

        const audio = await obtenerAudio(
            cancion.url,
            tempDir
        )

        // ====================================================
        // 🎧 PREPARAR MENSAJE
        // ====================================================

        const portada = {
            title: cancion.title,
            body: cancion.artist,
            sourceUrl: cancion.url,
            mediaType: 1,
            renderLargerThumbnail: true
        }

        if (
            typeof cancion.image === 'string' &&
            cancion.image.startsWith(
                'https://i.scdn.co/'
            )
        ) {
            portada.thumbnailUrl = cancion.image
        }

        // ====================================================
        // 📤 ENVIAR SOLO AUDIO
        // ====================================================

        await conn.sendMessage(m.chat, {

            audio: audio.buffer,

            mimetype: 'audio/mpeg',

            fileName:
                `${nombreArchivo(cancion.title)}.mp3`,

            seconds: Math.ceil(audio.duracion),

            ptt: false,

            contextInfo: {
                externalAdReply: portada
            }

        }, {
            quoted: m
        })

        // ====================================================
        // ⏳ COOLDOWN SOLO DESPUÉS DEL ENVÍO
        // ====================================================

        if (!exento) {

            cooldowns.set(
                sender,
                Date.now() + CONFIG.cooldown
            )
        }

        await react(conn, m, '✅')

        console.log(
            '[SPOTIFY] Enviado correctamente | ' +
            `API: ${audio.proveedor} | ` +
            `Duración: ${audio.duracion.toFixed(2)}s | ` +
            `Tamaño: ${
                (audio.buffer.length / 1024 / 1024)
                    .toFixed(2)
            } MB`
        )

    } catch (error) {

        // ====================================================
        // 🔌 CONTROL DE CONNECTION CLOSED
        // ====================================================

        if (conexionCerrada(error)) {

            console.warn(
                '[SPOTIFY] Conexión cerrada. ' +
                'Solicitud cancelada sin cooldown.'
            )

            return
        }

        console.error(
            '[SPOTIFY] ERROR:',
            error.message || error
        )

        await react(conn, m, '❌')

        switch (error.message) {

            case 'NO_RESULTS':
                return responder(
                    conn,
                    m,
                    '❌ No encontré esa canción.'
                )

            case 'MAX_DURATION':
                return responder(
                    conn,
                    m,
                    '❌ Máximo 7 minutos de duración.'
                )

            case 'MAX_SIZE':
                return responder(
                    conn,
                    m,
                    '❌ El audio supera los 25 MB.'
                )

            case 'FFMPEG_MISSING':
            case 'FFPROBE_MISSING':
                return responder(
                    conn,
                    m,
                    '❌ Faltan dependencias multimedia.'
                )

            default:
                return responder(
                    conn,
                    m,
                    '❌ No pude obtener la canción. ' +
                    'Intentá nuevamente más tarde.'
                )
        }

    } finally {

        // ====================================================
        // 🧹 LIMPIEZA AUTOMÁTICA
        // ====================================================

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
// 📌 COMANDOS
// ============================================================

handler.help = [
    'spotify <canción>',
    'splay <canción>',
    'spotifydl <enlace>'
]

handler.tags = ['download']

handler.command =
    /^(spotify|splay|spotifydl|spdl)$/i

handler.group = true
handler.register = false
handler.limit = false
handler.botAdmin = false

export default handler
