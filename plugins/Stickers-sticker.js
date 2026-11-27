
/**
 * 📂 plugins/sticker.js
 * 🤖 WHATSAPP-BOT — STICKER SYSTEM
 *
 * 📚 .ss — Menú de stickers
 * ✂️ .s — Sticker normal
 * 📝 .st — Sticker con texto
 * 🎨 Colores personalizados
 * 📐 Posiciones personalizadas
 * 🖼️ Imágenes y stickers existentes
 * 🎞️ Videos, GIF y WebP animados
 * 🏷️ Pack y autor personalizados
 * 👥 Solo grupos
 * 🔇 Sin spam
 * 🌐 Sin APIs externas
 */

import { sticker } from '../lib/sticker.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { createRequire } from 'node:module'

import sharp from 'sharp'
import ffmpeg from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'

import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const require = createRequire(import.meta.url)

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const SIZE = 512
const MAX_TEXT = 150
const MAX_DURATION = 8
const MAX_SIZE = 20 * 1024 * 1024
const MAX_CONCURRENT = 2
const MAX_FRAMES = 240

const processing = new Set()

// ============================================================
// 🎨 COLORES
// ============================================================

const COLORES = {
    blanco: '#FFFFFF',
    negro: '#000000',
    rojo: '#FF3030',
    azul: '#3498FF',
    amarillo: '#FFE600',
    verde: '#00FF66',
    rosa: '#FF69B4',
    morado: '#B026FF',
    naranja: '#FF8C00',
    celeste: '#00D9FF',
    dorado: '#FFD700'
}

const POSICIONES = [
    'arriba',
    'centro',
    'abajo'
]

// ============================================================
// 🔤 CARGAR FUENTE
// ============================================================

let FONT = 'sans-serif'

try {

    const fontPath = require.resolve(
        '@fontsource/roboto/files/roboto-latin-900-normal.woff'
    )

    if (GlobalFonts.registerFromPath(fontPath, 'StickerText')) {
        FONT = 'StickerText'
    }

} catch (error) {

    console.warn(
        '[STICKER] Fuente alternativa:',
        error.message
    )
}

// ============================================================
// 📚 MENÚ DE STICKERS — .ss
// ============================================================

const MENU = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   ✦ 𝑺𝑻𝑰𝑪𝑲𝑬𝑹 𝑺𝒀𝑺𝑻𝑬𝑴 ✦
╰━━━━━━━━━━━━━━━━━━━━━━╯

        ✧ 𝑼𝑳𝑻𝑹𝑨 𝑴𝑶𝑫𝑬 ✧

╭━━━〔 ✂️ 𝑺𝑻𝑰𝑪𝑲𝑬𝑹𝑺 〕━━━╮
┃
┃ 🖼️ *.s*
┃    ↳ Convierte imagen o video
┃
┃ ✂️ *.sticker*
┃    ↳ Genera un sticker normal
┃
┃ 📝 *.st <texto>*
┃    ↳ Agrega texto personalizado
┃
┃ 🐾 También modifica stickers
┃     existentes y animados.
┃
┃ 🎞️ Imágenes, GIF y videos
┃ ⏱️ Máximo 8 segundos
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 📐 𝑷𝑶𝑺𝑰𝑪𝑰𝑶𝑵𝑬𝑺 〕━━━╮
┃
┃ 🔼 .st arriba | Hola
┃ ⏺️ .st centro | Hola
┃ 🔽 .st abajo | Hola
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🎨 𝑪𝑶𝑳𝑶𝑹𝑬𝑺 〕━━━╮
┃
┃ ⚪ Blanco
┃ ⚫ Negro
┃ 🔴 Rojo
┃ 🔵 Azul
┃ 🟡 Amarillo
┃ 🟢 Verde
┃ 🩷 Rosa
┃ 🟣 Morado
┃ 🟠 Naranja
┃ 🩵 Celeste
┃ 👑 Dorado
┃
┃ 📝 Ejemplo:
┃ .st rojo | No atomices JAJAJA
┃
┃ 📝 Combinar color y posición:
┃ .st arriba amarillo | JAJAJA
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 ⚙️ 𝑰𝑵𝑭𝑶𝑹𝑴𝑨𝑪𝑰Ó𝑵 〕━━━╮
┃
┃ 📝 Máximo: 150 caracteres
┃ ⏱️ Duración: 8 segundos
┃ 📦 Tamaño máximo: 20 MB
┃ 🏷️ Pack personalizado
┃ 🟢 Sin cooldown
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ 🐾 *WHATSAPP-BOT ONLINE*
┃ ⚡ *𝑼𝑳𝑻𝑹𝑨 𝑴𝑶𝑫𝑬*
┃ 🟢 *𝟐𝟒/𝟕 𝑨𝑪𝑻𝑰𝑽𝑶*
╰━━━━━━━━━━━━━━━━━━━━━━╯
`

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
// 🔗 VALIDAR URL
// ============================================================

function isUrl(text = '') {

    try {

        const url = new URL(text)

        return (
            /^https?:$/.test(url.protocol) &&
            /\.(jpe?g|png|gif|webp)$/i.test(url.pathname)
        )

    } catch {

        return false
    }
}

// ============================================================
// 🔍 OBTENER MENSAJE MULTIMEDIA
// ============================================================

function obtenerMedia(q) {

    const tipos = [
        'stickerMessage',
        'imageMessage',
        'videoMessage'
    ]

    const contenedores = [
        q.message,
        q.fakeObj?.message,
        q.msg?.message,
        q.msg
    ]

    for (const contenido of contenedores) {

        if (!contenido) continue

        for (const tipo of tipos) {

            if (contenido[tipo]) {

                return {
                    tipo,
                    msg: contenido[tipo]
                }
            }
        }
    }

    const msg = q.msg || q

    const tipo = String(
        q.mtype ||
        q.type ||
        q.mediaType ||
        ''
    )

    const mime = String(
        msg.mimetype ||
        q.mimetype ||
        ''
    )

    if (/sticker|webp/i.test(tipo + mime)) {

        return {
            tipo: 'stickerMessage',
            msg
        }
    }

    if (/video/i.test(tipo + mime)) {

        return {
            tipo: 'videoMessage',
            msg
        }
    }

    if (/image|gif/i.test(tipo + mime)) {

        return {
            tipo: 'imageMessage',
            msg
        }
    }

    return {
        tipo: '',
        msg
    }
}

// ============================================================
// 🔒 PROTEGER CONTENIDO DE VER UNA VEZ
// ============================================================

function esViewOnce(q, msg) {

    const contenedores = [
        q,
        q.msg,
        q.message,
        q.fakeObj?.message,
        q.msg?.message,
        msg
    ]

    return contenedores.some(contenido => {

        if (!contenido) return false

        return Boolean(
            contenido.viewOnce ||
            contenido.viewOnceMessage ||
            contenido.viewOnceMessageV2 ||
            contenido.viewOnceMessageV2Extension ||
            /viewonce/i.test(contenido.mtype || '') ||
            /viewonce/i.test(contenido.mediaType || '')
        )
    })
}

// ============================================================
// 📥 DESCARGAR IMAGEN, VIDEO O STICKER
// ============================================================

async function descargarMedia(conn, m, q, tipo, msg) {

    // Método habitual del serializador.

    if (typeof q.download === 'function') {

        try {

            const buffer = await q.download()

            if (Buffer.isBuffer(buffer) && buffer.length) {
                return buffer
            }

            if (buffer instanceof Uint8Array && buffer.length) {
                return Buffer.from(buffer)
            }

        } catch (error) {

            console.warn(
                '[STICKER] Descarga habitual:',
                error.message
            )
        }
    }

    // Método alternativo de la conexión.

    if (typeof conn.downloadM === 'function') {

        try {

            const buffer = await conn.downloadM(msg, tipo)

            if (buffer instanceof Uint8Array && buffer.length) {
                return Buffer.from(buffer)
            }

        } catch (error) {

            console.warn(
                '[STICKER] Descarga alternativa:',
                error.message
            )
        }
    }

    // Reconstruir mensaje para Baileys.

    const mensaje = q.fakeObj ||
        (q.key && q.message ? q : null) ||
        {
            key: {
                remoteJid: q.chat || m.chat,
                id: q.id || q.key?.id,
                participant: q.sender || q.key?.participant,
                fromMe: Boolean(q.fromMe)
            },
            message: {
                [tipo]: msg
            }
        }

    const opciones = {}

    if (typeof conn.updateMediaMessage === 'function') {

        opciones.reuploadRequest =
            conn.updateMediaMessage.bind(conn)
    }

    if (conn.logger) {
        opciones.logger = conn.logger
    }

    const buffer = await downloadMediaMessage(
        mensaje,
        'buffer',
        {},
        opciones
    )

    if (!(buffer instanceof Uint8Array) || !buffer.length) {
        throw new Error('INVALID_MEDIA')
    }

    return Buffer.from(buffer)
}

// ============================================================
// ⚙️ INTERPRETAR TEXTO, COLOR Y POSICIÓN
// ============================================================

function obtenerOpciones(input) {

    let texto = input.trim()
    let color = COLORES.blanco
    let posicion = 'abajo'

    const separador = texto.indexOf('|')

    if (separador !== -1) {

        const opciones = texto
            .slice(0, separador)
            .trim()
            .toLowerCase()
            .split(/\s+/)

        const validas = opciones.every(opcion =>
            Object.hasOwn(COLORES, opcion) ||
            POSICIONES.includes(opcion)
        )

        if (validas) {

            texto = texto
                .slice(separador + 1)
                .trim()

            for (const opcion of opciones) {

                if (Object.hasOwn(COLORES, opcion)) {
                    color = COLORES[opcion]
                }

                if (POSICIONES.includes(opcion)) {
                    posicion = opcion
                }
            }
        }
    }

    return {
        texto,
        color,
        posicion
    }
}

// ============================================================
// 📝 DIVIDIR TEXTO EN LÍNEAS
// ============================================================

function dividirTexto(ctx, texto, maxWidth) {

    const lineas = []

    for (const parrafo of texto.split('\n')) {

        let linea = ''

        for (const palabra of parrafo.split(/\s+/)) {

            const prueba = linea
                ? `${linea} ${palabra}`
                : palabra

            if (ctx.measureText(prueba).width <= maxWidth) {

                linea = prueba
                continue
            }

            if (linea) {

                lineas.push(linea)
                linea = ''
            }

            if (ctx.measureText(palabra).width <= maxWidth) {

                linea = palabra

            } else {

                for (const letra of palabra) {

                    if (
                        ctx.measureText(linea + letra).width >
                        maxWidth
                    ) {

                        if (linea) lineas.push(linea)

                        linea = letra

                    } else {

                        linea += letra
                    }
                }
            }
        }

        if (linea) lineas.push(linea)
    }

    return lineas
}

// ============================================================
// 🎨 CREAR TEXTO TRANSPARENTE
// ============================================================

function crearTexto({ texto, color, posicion }) {

    const canvas = createCanvas(SIZE, SIZE)
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, SIZE, SIZE)

    const maxWidth = 460
    const maxHeight = 230

    let fontSize = 76
    let lineas = []
    let lineHeight = 0

    while (fontSize >= 12) {

        ctx.font = `900 ${fontSize}px "${FONT}"`

        lineas = dividirTexto(ctx, texto, maxWidth)

        lineHeight = fontSize * 1.15

        if (
            lineas.length * lineHeight <= maxHeight &&
            lineas.every(linea =>
                ctx.measureText(linea).width <= maxWidth
            )
        ) {

            break
        }

        fontSize -= 2
    }

    if (fontSize < 12 || !lineas.length) {
        throw new Error('MAX_TEXT')
    }

    ctx.font = `900 ${fontSize}px "${FONT}"`

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    ctx.fillStyle = color

    ctx.strokeStyle =
        color === '#000000'
            ? '#FFFFFF'
            : '#000000'

    ctx.lineWidth = Math.max(
        3,
        fontSize * 0.12
    )

    const alturaTotal = lineas.length * lineHeight

    let inicioY

    switch (posicion) {

        case 'arriba':

            inicioY = 22 + lineHeight / 2
            break

        case 'centro':

            inicioY =
                (SIZE - alturaTotal) / 2 +
                lineHeight / 2

            break

        default:

            inicioY =
                SIZE - 22 - alturaTotal +
                lineHeight / 2

            break
    }

    for (let i = 0; i < lineas.length; i++) {

        const y = inicioY + i * lineHeight

        ctx.strokeText(
            lineas[i],
            SIZE / 2,
            y
        )

        ctx.fillText(
            lineas[i],
            SIZE / 2,
            y
        )
    }

    return canvas.toBuffer('image/png')
}

// ============================================================
// 🖼️ PROCESAR IMAGEN O STICKER ESTÁTICO
// ============================================================

async function procesarImagen(media, textoPNG) {

    // Primero normalizar el sticker a PNG.
    // Esto evita problemas al componer WebP directamente.

    const base = await sharp(media, {
        animated: false,
        limitInputPixels: 25000000
    })

        .rotate()

        .ensureAlpha()

        .resize(SIZE, SIZE, {
            fit: 'contain',
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
            }
        })

        .png()

        .toBuffer()

    // Aplicar texto en una segunda operación.

    return sharp(base)

        .composite([
            {
                input: textoPNG,
                top: 0,
                left: 0
            }
        ])

        .png()

        .toBuffer()
}

// ============================================================
// 🎞️ PROCESAR STICKERS WEBP Y GIF ANIMADOS
// ============================================================

async function procesarWebpAnimado(
    media,
    textoPNG,
    metadata
) {

    const paginas = Number(metadata.pages || 1)

    if (paginas > MAX_FRAMES) {
        throw new Error('MAX_FRAMES')
    }

    const delays = Array.from(
        { length: paginas },
        (_, i) => Math.max(
            20,
            Number(metadata.delay?.[i] || 100)
        )
    )

    const duracion = delays.reduce(
        (total, delay) => total + delay,
        0
    )

    if (duracion > MAX_DURATION * 1000) {
        throw new Error('MAX_DURATION')
    }

    // Sharp decodifica todos los fotogramas
    // como una imagen vertical.

    const { data, info } = await sharp(media, {
        animated: true,
        limitInputPixels: 70000000
    })

        .resize(SIZE, SIZE, {
            fit: 'contain',
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
            }
        })

        .ensureAlpha()

        .raw()

        .toBuffer({
            resolveWithObject: true
        })

    const ancho = info.width
    const alto = info.pageHeight ||
        Math.floor(info.height / paginas)

    const channels = info.channels

    if (
        ancho !== SIZE ||
        alto !== SIZE ||
        info.height !== alto * paginas ||
        channels !== 4
    ) {
        throw new Error('INVALID_FRAMES')
    }

    const frameSize = ancho * alto * channels

    const resultado = Buffer.alloc(
        frameSize * paginas
    )

    // Incorporar texto en cada fotograma.

    for (let i = 0; i < paginas; i++) {

        const frame = data.subarray(
            i * frameSize,
            (i + 1) * frameSize
        )

        const editado = await sharp(frame, {
            raw: {
                width: ancho,
                height: alto,
                channels
            }
        })

            .composite([
                {
                    input: textoPNG,
                    top: 0,
                    left: 0
                }
            ])

            .raw()

            .toBuffer()

        editado.copy(
            resultado,
            i * frameSize
        )
    }

    // Reconstruir el WebP conservando los tiempos
    // de cada fotograma.

    for (const quality of [85, 70, 55, 40, 25]) {

        const webp = await sharp(resultado, {
            raw: {
                width: ancho,
                height: alto * paginas,
                channels,
                pageHeight: alto
            }
        })

            .webp({
                quality,
                alphaQuality: 80,
                effort: 4,
                loop: metadata.loop ?? 0,
                delay: delays
            })

            .toBuffer()

        const comprobacion = await sharp(webp).metadata()

        if (Number(comprobacion.pages || 1) < 2) {
            throw new Error('ANIMATION_UNSUPPORTED')
        }

        if (webp.length <= 480 * 1024) {
            return webp
        }
    }

    throw new Error('STICKER_TOO_LARGE')
}

// ============================================================
// 🔍 ANALIZAR VIDEO
// ============================================================

async function analizarVideo(input) {

    if (!ffprobe?.path) {
        throw new Error('FFPROBE_MISSING')
    }

    const { stdout } = await exec(
        ffprobe.path,
        [
            '-v', 'error',
            '-show_format',
            '-show_streams',
            '-of', 'json',
            input
        ],
        {
            timeout: 15000,
            maxBuffer: 1024 * 1024
        }
    )

    const info = JSON.parse(stdout)

    const duration = Number(
        info.format?.duration || 0
    )

    const tieneVideo = info.streams?.some(stream =>
        stream.codec_type === 'video' &&
        !stream.disposition?.attached_pic
    )

    if (!tieneVideo) {
        throw new Error('INVALID_VIDEO')
    }

    if (
        !Number.isFinite(duration) ||
        duration <= 0
    ) {
        throw new Error('INVALID_VIDEO')
    }

    if (duration > MAX_DURATION) {
        throw new Error('MAX_DURATION')
    }

    return info
}

// ============================================================
// 🎞️ PROCESAR VIDEO CON TEXTO
// ============================================================

async function procesarVideo(
    media,
    textoPNG,
    tempDir
) {

    if (!ffmpeg || !ffprobe?.path) {
        throw new Error('FFMPEG_MISSING')
    }

    const input = path.join(
        tempDir,
        'entrada.media'
    )

    const overlay = path.join(
        tempDir,
        'texto.png'
    )

    const output = path.join(
        tempDir,
        'sticker-video.mp4'
    )

    await fs.writeFile(input, media)
    await fs.writeFile(overlay, textoPNG)

    await analizarVideo(input)

    const filtro = [

        '[0:v]',

        'fps=15,',

        'scale=512:512:',

        'force_original_aspect_ratio=decrease,',

        'pad=512:512:(ow-iw)/2:(oh-ih)/2:',

        'color=black,',

        'setsar=1[base];',

        '[base][1:v]',

        'overlay=0:0:format=auto[v]'

    ].join('')

    await exec(
        ffmpeg,
        [
            '-hide_banner',
            '-loglevel', 'error',
            '-y',

            '-i', input,
            '-i', overlay,

            '-filter_complex_threads', '1',
            '-filter_complex', filtro,

            '-map', '[v]',
            '-an',

            '-t', String(MAX_DURATION),

            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '23',

            '-pix_fmt', 'yuv420p',
            '-threads', '2',

            '-movflags', '+faststart',

            output
        ],
        {
            timeout: 60000,
            maxBuffer: 1024 * 1024
        }
    )

    return fs.readFile(output)
}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, {
    conn,
    args = [],
    text,
    command = '',
    usedPrefix = '.'
}) => {

    if (!m.isGroup) return

    command = command.toLowerCase()

    // ========================================================
    // 📚 MENÚ INDEPENDIENTE — .ss
    // ========================================================

    if (command === 'ss') {

        await m.reply(MENU.trim())

        return react(conn, m, '🐾')
    }

    // ========================================================
    // 📝 DETECTAR COMANDO
    // ========================================================

    const conTexto =
        /^(st|stickertexto|stickermeme|smeme)$/i.test(command)

    const input = String(
        text || args.join(' ')
    ).trim()

    const opciones = conTexto
        ? obtenerOpciones(input)
        : null

    const q = m.quoted || m

    const { tipo, msg } = obtenerMedia(q)

    // ========================================================
    // 🔒 BLOQUEAR CONTENIDO DE VER UNA VEZ
    // ========================================================

    if (esViewOnce(q, msg)) {

        return m.reply(
            '🔒 No se admite contenido de ver una vez.'
        )
    }

    // ========================================================
    // 📝 VALIDAR TEXTO
    // ========================================================

    if (conTexto && !opciones.texto) {

        return m.reply(

            '📝 Respondé a una imagen, video o sticker con:\n\n' +

            `*${usedPrefix}st No atomices JAJAJA*\n\n` +

            `📚 Menú: *${usedPrefix}ss*`

        )
    }

    if (
        conTexto &&
        Array.from(opciones.texto).length > MAX_TEXT
    ) {

        return m.reply(
            `❌ Máximo ${MAX_TEXT} caracteres.`
        )
    }

    // ========================================================
    // 🖼️ VALIDAR CONTENIDO
    // ========================================================

    const tieneMedia = Boolean(tipo)

    const tieneUrl =
        !conTexto && isUrl(args[0])

    if (!tieneMedia && !tieneUrl) {

        return m.reply(

            '🐉 Respondé a una imagen, video, GIF o sticker.\n\n' +

            `📚 Menú: *${usedPrefix}ss*`

        )
    }

    if (Number(msg.seconds || 0) > MAX_DURATION) {

        return m.reply(
            '☁️ El video no puede durar más de 8 segundos.'
        )
    }

    if (Number(msg.fileLength || 0) > MAX_SIZE) {

        return m.reply(
            '❌ El archivo supera los 20 MB.'
        )
    }

    // ========================================================
    // 🛡️ EVITAR SOBRECARGA
    // ========================================================

    if (processing.has(m.sender)) {
        return react(conn, m, '⏳')
    }

    if (processing.size >= MAX_CONCURRENT) {
        return react(conn, m, '⏳')
    }

    processing.add(m.sender)

    let tempDir = null

    try {

        await react(
            conn,
            m,
            conTexto ? '🎨' : '✂️'
        )

        let stiker

        const packname =
            global.packname || 'WhatsApp-Bot'

        const author =
            global.author || 'Anónimo🐼'

        // ====================================================
        // 🔗 STICKER DESDE URL
        // ====================================================

        if (!tieneMedia && tieneUrl) {

            stiker = await sticker(
                false,
                args[0],
                packname,
                author
            )

        } else {

            // ================================================
            // 📥 DESCARGAR CONTENIDO
            // ================================================

            const media = await descargarMedia(
                conn,
                m,
                q,
                tipo,
                msg
            )

            if (!media.length) {
                throw new Error('INVALID_MEDIA')
            }

            if (media.length > MAX_SIZE) {

                return m.reply(
                    '❌ El archivo supera los 20 MB.'
                )
            }

            console.log(
                '[STICKER] Tipo:', tipo,
                '| Tamaño:', media.length
            )

            // ================================================
            // 🔍 DETECTAR FORMATO REAL
            // ================================================

            const esVideo = tipo === 'videoMessage'

            let metadata = null

            if (!esVideo) {

                metadata = await sharp(media, {
                    limitInputPixels: 70000000
                }).metadata()
            }

            const esAnimado =
                Number(metadata?.pages || 1) > 1

            // Validar duración de imágenes animadas.

            if (esAnimado && metadata.delay) {

                const duracion = metadata.delay.reduce(
                    (total, delay) =>
                        total + Number(delay || 100),
                    0
                )

                if (duracion > MAX_DURATION * 1000) {
                    throw new Error('MAX_DURATION')
                }
            }

            // ================================================
            // ✂️ STICKER NORMAL — .s
            // ================================================

            if (!conTexto) {

                if (esVideo) {

                    tempDir = await fs.mkdtemp(
                        path.join(
                            os.tmpdir(),
                            'whatsapp-sticker-'
                        )
                    )

                    const archivo = path.join(
                        tempDir,
                        'entrada.media'
                    )

                    await fs.writeFile(archivo, media)

                    await analizarVideo(archivo)
                }

                stiker = await sticker(
                    media,
                    false,
                    packname,
                    author
                )

            } else {

                // ============================================
                // 📝 STICKER CON TEXTO — .st
                // ============================================

                const textoPNG = crearTexto(opciones)

                let resultado

                // VIDEO MP4

                if (esVideo) {

                    tempDir = await fs.mkdtemp(
                        path.join(
                            os.tmpdir(),
                            'whatsapp-st-'
                        )
                    )

                    resultado = await procesarVideo(
                        media,
                        textoPNG,
                        tempDir
                    )

                // STICKER WEBP O GIF ANIMADO

                } else if (esAnimado) {

                    resultado = await procesarWebpAnimado(
                        media,
                        textoPNG,
                        metadata
                    )

                // IMAGEN O STICKER NORMAL

                } else {

                    resultado = await procesarImagen(
                        media,
                        textoPNG
                    )
                }

                // ============================================
                // 🏷️ APLICAR PACK Y AUTOR
                // ============================================

                stiker = await sticker(
                    resultado,
                    false,
                    packname,
                    author
                )

                // Comprobar que la librería no haya
                // eliminado la animación del sticker.

                if (esAnimado && !esVideo) {

                    const finalMetadata =
                        await sharp(stiker).metadata()

                    if (
                        Number(finalMetadata.pages || 1) < 2
                    ) {

                        console.warn(
                            '[STICKER] La librería eliminó la animación.'
                        )

                        // Priorizar conservar la animación.
                        // En este caso puede perderse el pack.

                        stiker = resultado
                    }
                }
            }
        }

        // ====================================================
        // 📤 ENVIAR STICKER FINAL
        // ====================================================

        if (
            !(stiker instanceof Uint8Array) ||
            !stiker.length
        ) {

            throw new Error('INVALID_STICKER')
        }

        stiker = Buffer.from(stiker)

        // Enviar directamente como sticker.
        // Evita conversiones adicionales de sendFile.

        await conn.sendMessage(
            m.chat,
            {
                sticker: stiker
            },
            {
                quoted: m
            }
        )

        await react(conn, m, '✅')

        console.log(
            `[STICKER] .${command} enviado correctamente.`
        )

    } catch (error) {

        console.error(
            '[STICKER] ERROR:',
            error.stderr ||
            error.stack ||
            error.message ||
            error
        )

        await react(conn, m, '❌')

        switch (error.message) {

            case 'MAX_DURATION':

                return m.reply(
                    '☁️ Máximo 8 segundos de duración.'
                )

            case 'MAX_TEXT':

                return m.reply(
                    '❌ El texto es demasiado largo.'
                )

            case 'MAX_FRAMES':

                return m.reply(
                    '❌ El sticker tiene demasiados fotogramas.'
                )

            case 'STICKER_TOO_LARGE':

                return m.reply(
                    '❌ El sticker animado es demasiado pesado.'
                )

            case 'ANIMATION_UNSUPPORTED':

            case 'INVALID_FRAMES':

                return m.reply(
                    '❌ No pude conservar la animación del sticker.'
                )

            case 'FFMPEG_MISSING':

            case 'FFPROBE_MISSING':

                return m.reply(
                    '❌ Faltan dependencias multimedia.'
                )

            case 'INVALID_VIDEO':

            case 'INVALID_MEDIA':

                return m.reply(
                    '❌ No pude descargar o procesar el archivo.'
                )

            default:

                return m.reply(
                    '⚡ Error al generar el sticker.'
                )
        }

    } finally {

        // ====================================================
        // 🗑️ LIMPIEZA AUTOMÁTICA
        // ====================================================

        if (tempDir) {

            await fs.rm(tempDir, {
                recursive: true,
                force: true
            }).catch(() => {})
        }

        processing.delete(m.sender)
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL HANDLER
// ============================================================

handler.help = [
    'ss',
    's',
    'sticker',
    'stiker',
    'st <texto>',
    'stickertexto <texto>',
    'stickermeme <texto>',
    'smeme <texto>'
]

handler.tags = ['sticker']

handler.command =
    /^(ss|s|sticker|stiker|st|stickertexto|stickermeme|smeme)$/i

handler.group = true
handler.register = false
handler.limit = false

export default handler
