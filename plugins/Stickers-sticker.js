
/**
 * 📂 plugins/sticker.js
 * 🤖 WHATSAPP-BOT — STICKER SYSTEM
 *
 * 📚 Menú independiente: .ss
 * ✂️ Sticker normal: .s
 * 📝 Sticker con texto: .st
 * 🎨 Colores personalizados
 * 📐 Posiciones personalizadas
 * 🎞️ Imágenes, videos y GIF
 * ⏱️ Máximo 8 segundos
 * 🏷️ Pack y autor personalizados
 * 👥 Exclusivo para grupos
 * 🔇 Sin spam
 * 🌐 Procesamiento local
 */

import { sticker } from '../lib/sticker.js'

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

const processing = new Set()

// ============================================================
// 🎨 COLORES DISPONIBLES
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

    if (
        GlobalFonts.registerFromPath(
            fontPath,
            'StickerText'
        )
    ) {

        FONT = 'StickerText'
    }

} catch {

    console.warn(
        '[STICKER] Usando fuente alternativa.'
    )
}

// ============================================================
// 📚 MENÚ DE STICKERS
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
┃    ↳ Sticker con texto
┃
┃ 🎞️ Admite imágenes, GIF y videos
┃ ⏱️ Videos de hasta 8 segundos
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
// 🔗 VALIDAR URL DE IMAGEN
// ============================================================

function isUrl(text = '') {

    try {

        const url = new URL(text)

        return (

            /^https?:$/.test(url.protocol) &&

            /\.(jpe?g|png|gif|webp)$/i.test(
                url.pathname
            )

        )

    } catch {

        return false
    }
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

        const validas = opciones.every(

            opcion =>

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

            if (
                ctx.measureText(prueba).width <= maxWidth
            ) {

                linea = prueba
                continue
            }

            if (linea) {

                lineas.push(linea)
                linea = ''
            }

            if (
                ctx.measureText(palabra).width <= maxWidth
            ) {

                linea = palabra

            } else {

                for (const letra of palabra) {

                    if (

                        ctx.measureText(
                            linea + letra
                        ).width > maxWidth

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
// 🎨 GENERAR TEXTO TRANSPARENTE
// ============================================================

function crearTexto({
    texto,
    color,
    posicion
}) {

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

        lineas = dividirTexto(
            ctx,
            texto,
            maxWidth
        )

        lineHeight = fontSize * 1.15

        if (

            lineas.length * lineHeight <= maxHeight &&

            lineas.every(
                linea =>
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

    const alturaTotal =
        lineas.length * lineHeight

    let inicioY

    // ========================================================
    // 📐 POSICIÓN DEL TEXTO
    // ========================================================

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

        const y =
            inicioY + i * lineHeight

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
// 🖼️ PROCESAR IMAGEN ESTÁTICA
// ============================================================

async function procesarImagen(media, textoPNG) {

    return sharp(media, {

        limitInputPixels: 25000000

    })

        .rotate()

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

    const tieneVideo = info.streams?.some(

        stream =>
            stream.codec_type === 'video' &&
            !stream.disposition?.attached_pic

    )

    if (!tieneVideo) {

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

async function procesarAnimado(
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

    // ========================================================
    // 🎨 APLICAR TEXTO EN TODOS LOS FOTOGRAMAS
    // ========================================================

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
    // 📝 DETECTAR TIPO DE STICKER
    // ========================================================

    const conTexto = /^(st|stickertexto|stickermeme|smeme)$/i
        .test(command)

    const input = String(
        text || args.join(' ')
    ).trim()

    const opciones = conTexto
        ? obtenerOpciones(input)
        : null

    const q = m.quoted || m

    const msg = q.msg || q

    const mime = String(

        msg.mimetype ||

        q.mediaType ||

        q.mtype ||

        ''

    ).toLowerCase()

    // ========================================================
    // 🔒 BLOQUEAR CONTENIDO DE VER UNA VEZ
    // ========================================================

    if (

        msg.viewOnce ||

        q.viewOnce ||

        /viewonce/i.test(q.mtype || '') ||

        /viewonce/i.test(q.mediaType || '')

    ) {

        return m.reply(

            '🔒 No se puede hacer sticker de contenido de ver una vez.'

        )
    }

    // ========================================================
    // 📝 VALIDAR TEXTO
    // ========================================================

    if (conTexto && !opciones.texto) {

        return m.reply(

            '📝 Respondé a una imagen o video con:\n\n' +

            `*${usedPrefix}st No atomices JAJAJA*\n\n` +

            `📚 Menú completo: *${usedPrefix}ss*`

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

    const tieneMedia =
        /image|video|webp|gif|sticker/.test(mime)

    const tieneUrl =
        !conTexto && isUrl(args[0])

    if (!tieneMedia && !tieneUrl) {

        return m.reply(

            '🐉 Respondé a una imagen, video, GIF o sticker.\n\n' +

            `📚 Menú de stickers: *${usedPrefix}ss*`

        )
    }

    if (Number(msg.seconds || 0) > MAX_DURATION) {

        return m.reply(

            '☁️ ¡El video no puede durar más de 8 segundos!'

        )
    }

    if (Number(msg.fileLength || 0) > MAX_SIZE) {

        return m.reply(

            '❌ El archivo supera los 20 MB.'

        )
    }

    // ========================================================
    // 🛡️ PROTECCIÓN ANTISPAM
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
        // 🔗 STICKER NORMAL DESDE URL
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

            const media = await q.download?.()

            if (

                !Buffer.isBuffer(media) ||

                !media.length

            ) {

                throw new Error('INVALID_MEDIA')
            }

            if (media.length > MAX_SIZE) {

                return m.reply(

                    '❌ El archivo supera los 20 MB.'

                )
            }

            // ================================================
            // 🔍 DETECTAR CONTENIDO ANIMADO
            // ================================================

            let animado = /video|gif/.test(mime)

            if (!animado) {

                const metadata = await sharp(media, {

                    limitInputPixels: 25000000

                }).metadata()

                animado =
                    Number(metadata.pages || 1) > 1
            }

            // ================================================
            // ✂️ STICKER NORMAL — .s
            // ================================================

            if (!conTexto) {

                if (animado && /video/.test(mime)) {

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

                const textoPNG =
                    crearTexto(opciones)

                let resultado

                if (animado) {

                    tempDir = await fs.mkdtemp(

                        path.join(
                            os.tmpdir(),
                            'whatsapp-st-'
                        )
                    )

                    resultado = await procesarAnimado(

                        media,

                        textoPNG,

                        tempDir

                    )

                } else {

                    resultado = await procesarImagen(

                        media,

                        textoPNG

                    )
                }

                stiker = await sticker(

                    resultado,

                    false,

                    packname,

                    author

                )
            }
        }

        // ====================================================
        // 📤 ENVIAR STICKER FINAL
        // ====================================================

        if (!stiker || !stiker.length) {

            throw new Error('INVALID_STICKER')
        }

        await conn.sendFile(

            m.chat,

            stiker,

            'sticker.webp',

            '',

            m,

            true

        )

        await react(conn, m, '✅')

        console.log(

            `[STICKER] Comando: ${command} | Enviado correctamente`

        )

    } catch (error) {

        console.error(

            '[STICKER] ERROR:',

            error.stderr ||
            error.message ||
            error

        )

        await react(conn, m, '❌')

        switch (error.message) {

            case 'MAX_DURATION':

                return m.reply(

                    '☁️ ¡El video no puede durar más de 8 segundos!'

                )

            case 'MAX_TEXT':

                return m.reply(

                    '❌ El texto es demasiado largo.'

                )

            case 'FFMPEG_MISSING':

            case 'FFPROBE_MISSING':

                return m.reply(

                    '❌ Faltan dependencias multimedia en el servidor.'

                )

            case 'INVALID_VIDEO':

            case 'INVALID_MEDIA':

                return m.reply(

                    '❌ No se pudo procesar el archivo.'

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

handler.command = /^(ss|s|sticker|stiker|st|stickertexto|stickermeme|smeme)$/i

handler.group = true

handler.register = false

handler.limit = false

export default handler
