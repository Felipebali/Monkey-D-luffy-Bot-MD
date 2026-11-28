
/**
 * 📂 plugins/ttp.js
 * 🤖 WHATSAPP-BOT — TEXT CARD STICKER
 *
 * 🎨 10 estilos personalizados
 * 🃏 Tarjetas, carteles y memes
 * 📝 Ajuste automático de texto
 * 💾 Generación local
 * 🌐 Sin APIs externas
 * ⏳ Sin cooldown
 * 🔇 Sin mensajes privados
 * ⚡ Independiente de TTP2
 */

import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { createRequire } from 'node:module'
import sharp from 'sharp'

const require = createRequire(import.meta.url)

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const CONFIG = {
    size: 512,
    maxTexto: 150,
    maxConcurrent: 3,
    maxSticker: 100 * 1024
}

const processing = new Set()

// ============================================================
// 🔤 FUENTE PERSONALIZADA
// ============================================================

let FONT = 'sans-serif'

try {

    const fontPath = require.resolve(
        '@fontsource/roboto/files/roboto-latin-900-normal.woff'
    )

    if (
        GlobalFonts.registerFromPath(
            fontPath,
            'TTPCard'
        )
    ) {
        FONT = 'TTPCard'
    }

    console.log('[TTP] Fuente:', FONT)

} catch (error) {

    console.warn(
        '[TTP] Fuente alternativa:',
        error.message
    )
}

// ============================================================
// 🎨 ESTILOS
// ============================================================

const ESTILOS = {

    clasico: {
        fondo: '#111111',
        texto: '#FFFFFF',
        borde: '#FFFFFF',
        detalle: '#777777',
        etiqueta: 'MESSAGE',
        radio: 30
    },

    alerta: {
        fondo: '#F9D923',
        texto: '#171717',
        borde: '#171717',
        detalle: '#171717',
        etiqueta: 'ATENCIÓN',
        radio: 15
    },

    meme: {
        fondo: '#FFFFFF',
        texto: '#111111',
        borde: '#111111',
        detalle: '#CCCCCC',
        etiqueta: 'MEME',
        radio: 20
    },

    error: {
        fondo: '#A51D2D',
        texto: '#FFFFFF',
        borde: '#FF8290',
        detalle: '#FFB0B8',
        etiqueta: 'SYSTEM ERROR',
        radio: 25
    },

    terminal: {
        fondo: '#101810',
        texto: '#49ED73',
        borde: '#49ED73',
        detalle: '#267B3D',
        etiqueta: 'TERMINAL',
        radio: 12
    },

    amor: {
        fondo: '#F8C6DA',
        texto: '#8E204B',
        borde: '#E478A3',
        detalle: '#E478A3',
        etiqueta: 'LOVE',
        radio: 45
    },

    premium: {
        fondo: '#191919',
        texto: '#E9C66B',
        borde: '#E9C66B',
        detalle: '#9A7731',
        etiqueta: 'PREMIUM',
        radio: 30
    },

    comic: {
        fondo: '#FFDC55',
        texto: '#222222',
        borde: '#222222',
        detalle: '#E5A728',
        etiqueta: 'COMIC',
        radio: 18
    },

    hielo: {
        fondo: '#D8F2FF',
        texto: '#164C82',
        borde: '#68ADD8',
        detalle: '#8CC9EB',
        etiqueta: 'ICE MODE',
        radio: 35
    },

    whatsapp: {
        fondo: '#D9FDD3',
        texto: '#174C37',
        borde: '#91CBB1',
        detalle: '#5A9C7D',
        etiqueta: 'CHAT',
        radio: 35
    }
}

// ============================================================
// 📚 MENÚ TTP
// ============================================================

const MENU = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   ✦ 𝑻𝑻𝑷 𝑪𝑨𝑹𝑫 𝑺𝒀𝑺𝑻𝑬𝑴 ✦
╰━━━━━━━━━━━━━━━━━━━━━━╯

        ✧ 𝑼𝑳𝑻𝑹𝑨 𝑴𝑶𝑫𝑬 ✧

╭━━━〔 🎨 𝑬𝑺𝑻𝑰𝑳𝑶𝑺 〕━━━╮
┃
┃ ⚫ Clasico
┃ ⚠️ Alerta
┃ 😂 Meme
┃ ❌ Error
┃ 💻 Terminal
┃ 💗 Amor
┃ 👑 Premium
┃ 💥 Comic
┃ ❄️ Hielo
┃ 💬 WhatsApp
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 📝 𝑬𝑱𝑬𝑴𝑷𝑳𝑶𝑺 〕━━━╮
┃
┃ .ttp Hola mundo
┃ .ttp meme | JAJAJA
┃ .ttp alerta | No atomices
┃ .ttp terminal | Bot online
┃ .ttp amor | Te quiero
┃ .ttp premium | Modo ultra
┃ .ttp error | Error 404
┃ .ttp random | Buenas
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 ⚙️ 𝑰𝑵𝑭𝑶𝑹𝑴𝑨𝑪𝑰Ó𝑵 〕━━━╮
┃
┃ 📝 Máximo: 150 caracteres
┃ 🎨 10 estilos diferentes
┃ 🎲 Estilo aleatorio
┃ 🌐 Sin APIs externas
┃ ⏳ Sin cooldown
┃ ⚡ Generación local
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

    } catch (error) {}
}

// ============================================================
// 🎲 ESTILO ALEATORIO
// ============================================================

function estiloAleatorio() {

    const nombres = Object.keys(ESTILOS)

    return nombres[
        Math.floor(
            Math.random() * nombres.length
        )
    ]
}

// ============================================================
// 📝 PROCESAR COMANDO
// ============================================================

function obtenerOpciones(input) {

    let texto = input.trim()
    let estilo = 'clasico'

    const separador = texto.indexOf('|')

    if (separador !== -1) {

        const opcion = texto
            .slice(0, separador)
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')

        if (opcion === 'random') {

            estilo = estiloAleatorio()

            texto = texto
                .slice(separador + 1)
                .trim()

        } else if (
            Object.prototype.hasOwnProperty.call(
                ESTILOS,
                opcion
            )
        ) {

            estilo = opcion

            texto = texto
                .slice(separador + 1)
                .trim()
        }
    }

    return {
        texto,
        estilo
    }
}

// ============================================================
// 📐 RECTÁNGULO REDONDEADO
// ============================================================

function rectangulo(
    ctx,
    x,
    y,
    width,
    height,
    radius
) {

    radius = Math.min(
        radius,
        width / 2,
        height / 2
    )

    ctx.beginPath()

    ctx.moveTo(x + radius, y)

    ctx.lineTo(
        x + width - radius,
        y
    )

    ctx.quadraticCurveTo(
        x + width,
        y,
        x + width,
        y + radius
    )

    ctx.lineTo(
        x + width,
        y + height - radius
    )

    ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height
    )

    ctx.lineTo(
        x + radius,
        y + height
    )

    ctx.quadraticCurveTo(
        x,
        y + height,
        x,
        y + height - radius
    )

    ctx.lineTo(x, y + radius)

    ctx.quadraticCurveTo(
        x,
        y,
        x + radius,
        y
    )

    ctx.closePath()
}

// ============================================================
// 📝 DIVIDIR TEXTO AUTOMÁTICAMENTE
// ============================================================

function dividirTexto(ctx, texto, maxWidth) {

    const lineas = []

    for (const parrafo of texto.split('\n')) {

        if (!parrafo.trim()) {

            lineas.push('')
            continue
        }

        const palabras = parrafo.split(/\s+/)

        let linea = ''

        for (const palabra of palabras) {

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
                continue
            }

            // Dividir palabras demasiado largas.

            for (const letra of Array.from(palabra)) {

                const nuevaLinea = linea + letra

                if (
                    ctx.measureText(nuevaLinea).width >
                    maxWidth
                ) {

                    if (linea) {
                        lineas.push(linea)
                    }

                    linea = letra

                } else {

                    linea = nuevaLinea
                }
            }
        }

        if (linea) {
            lineas.push(linea)
        }
    }

    return lineas
}

// ============================================================
// 📏 AJUSTAR TAMAÑO DEL TEXTO
// ============================================================

function ajustarTexto(ctx, texto, estilo) {

    const maxWidth = 386
    const maxHeight = 285

    let fontSize = 112
    let lineas = []
    let lineHeight = 0

    const fuente = estilo === 'terminal'
        ? 'monospace'
        : `"${FONT}"`

    while (fontSize >= 12) {

        ctx.font =
            `900 ${fontSize}px ${fuente}`

        lineas = dividirTexto(
            ctx,
            texto,
            maxWidth
        )

        lineHeight = fontSize * 1.15

        const altura =
            lineas.length * lineHeight

        const anchoValido = lineas.every(
            linea =>
                ctx.measureText(linea).width <= maxWidth
        )

        if (
            altura <= maxHeight &&
            anchoValido
        ) {

            return {
                fontSize,
                lineas,
                lineHeight,
                fuente
            }
        }

        fontSize -= 2
    }

    throw new Error('TEXT_TOO_LONG')
}

// ============================================================
// 🎨 DECORACIONES SEGÚN ESTILO
// ============================================================

function decorar(ctx, nombre, estilo) {

    ctx.save()

    // ================================================
    // ⚠️ ALERTA — FRANJAS DE SEGURIDAD
    // ================================================

    if (nombre === 'alerta') {

        ctx.save()

        ctx.beginPath()
        ctx.rect(35, 36, 442, 22)
        ctx.rect(35, 454, 442, 22)
        ctx.clip()

        ctx.fillStyle = '#171717'

        for (let x = 0; x < 560; x += 40) {

            ctx.beginPath()
            ctx.moveTo(x, 20)
            ctx.lineTo(x + 20, 20)
            ctx.lineTo(x - 10, 80)
            ctx.lineTo(x - 30, 80)
            ctx.closePath()
            ctx.fill()

            ctx.beginPath()
            ctx.moveTo(x, 440)
            ctx.lineTo(x + 20, 440)
            ctx.lineTo(x - 10, 500)
            ctx.lineTo(x - 30, 500)
            ctx.closePath()
            ctx.fill()
        }

        ctx.restore()
    }

    // ================================================
    // 💻 TERMINAL — BOTONES DE VENTANA
    // ================================================

    if (nombre === 'terminal') {

        const colores = [
            '#FF5F57',
            '#FFBD2E',
            '#28C840'
        ]

        colores.forEach((color, i) => {

            ctx.fillStyle = color

            ctx.beginPath()

            ctx.arc(
                55 + i * 22,
                57,
                7,
                0,
                Math.PI * 2
            )

            ctx.fill()
        })

        ctx.strokeStyle = estilo.detalle
        ctx.lineWidth = 2

        ctx.beginPath()
        ctx.moveTo(40, 78)
        ctx.lineTo(472, 78)
        ctx.stroke()
    }

    // ================================================
    // 💗 AMOR — CORAZONES
    // ================================================

    if (nombre === 'amor') {

        ctx.fillStyle = estilo.detalle

        ctx.font = '38px sans-serif'
        ctx.textAlign = 'center'

        ctx.fillText('♥', 65, 83)
        ctx.fillText('♥', 447, 83)
        ctx.fillText('♥', 65, 453)
        ctx.fillText('♥', 447, 453)
    }

    // ================================================
    // 👑 PREMIUM — DOBLE BORDE
    // ================================================

    if (nombre === 'premium') {

        ctx.strokeStyle = estilo.detalle
        ctx.lineWidth = 2

        rectangulo(
            ctx,
            39,
            39,
            434,
            434,
            22
        )

        ctx.stroke()

        ctx.fillStyle = estilo.borde

        for (const [x, y] of [
            [52, 52],
            [460, 52],
            [52, 460],
            [460, 460]
        ]) {

            ctx.beginPath()
            ctx.moveTo(x, y - 8)
            ctx.lineTo(x + 8, y)
            ctx.lineTo(x, y + 8)
            ctx.lineTo(x - 8, y)
            ctx.closePath()
            ctx.fill()
        }
    }

    // ================================================
    // 💥 COMIC — PUNTOS DECORATIVOS
    // ================================================

    if (nombre === 'comic') {

        ctx.fillStyle = estilo.detalle

        for (let x = 45; x <= 465; x += 18) {

            for (let y = 45; y <= 465; y += 18) {

                if (
                    x < 80 ||
                    x > 432 ||
                    y < 80 ||
                    y > 432
                ) {

                    ctx.beginPath()

                    ctx.arc(
                        x,
                        y,
                        3,
                        0,
                        Math.PI * 2
                    )

                    ctx.fill()
                }
            }
        }
    }

    // ================================================
    // ❄️ HIELO — CRISTALES
    // ================================================

    if (nombre === 'hielo') {

        ctx.strokeStyle = estilo.detalle
        ctx.lineWidth = 3

        for (const [x, y] of [
            [65, 65],
            [447, 65],
            [65, 447],
            [447, 447]
        ]) {

            for (let i = 0; i < 6; i++) {

                const angulo =
                    i * Math.PI / 3

                ctx.beginPath()
                ctx.moveTo(x, y)

                ctx.lineTo(
                    x + Math.cos(angulo) * 17,
                    y + Math.sin(angulo) * 17
                )

                ctx.stroke()
            }
        }
    }

    // ================================================
    // 💬 WHATSAPP — DOBLE CHECK
    // ================================================

    if (nombre === 'whatsapp') {

        ctx.strokeStyle = '#34A7DB'
        ctx.lineWidth = 5
        ctx.lineCap = 'round'

        for (let i = 0; i < 2; i++) {

            const x = 420 + i * 13

            ctx.beginPath()
            ctx.moveTo(x - 8, 439)
            ctx.lineTo(x, 447)
            ctx.lineTo(x + 17, 428)
            ctx.stroke()
        }
    }

    ctx.restore()
}

// ============================================================
// 🖼️ GENERAR TARJETA
// ============================================================

function generarTarjeta(texto, nombre) {

    const estilo = ESTILOS[nombre]

    const canvas = createCanvas(
        CONFIG.size,
        CONFIG.size
    )

    const ctx = canvas.getContext('2d')

    ctx.clearRect(
        0,
        0,
        CONFIG.size,
        CONFIG.size
    )

    // ================================================
    // 🌑 SOMBRA
    // ================================================

    ctx.save()

    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 8

    ctx.fillStyle = estilo.fondo

    rectangulo(
        ctx,
        24,
        24,
        464,
        464,
        estilo.radio
    )

    ctx.fill()

    ctx.restore()

    // ================================================
    // 🎨 FONDO
    // ================================================

    ctx.fillStyle = estilo.fondo

    rectangulo(
        ctx,
        24,
        24,
        464,
        464,
        estilo.radio
    )

    ctx.fill()

    // ================================================
    // 📐 BORDE
    // ================================================

    ctx.strokeStyle = estilo.borde

    ctx.lineWidth =
        nombre === 'comic' ? 9 : 5

    ctx.stroke()

    // ================================================
    // ✨ DECORACIONES
    // ================================================

    decorar(ctx, nombre, estilo)

    // ================================================
    // 🏷️ ETIQUETA SUPERIOR
    // ================================================

    ctx.font = `900 17px "${FONT}"`

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = estilo.texto

    ctx.fillText(
        estilo.etiqueta,
        256,
        nombre === 'alerta' ? 90 : 75
    )

    // ================================================
    // ➖ LÍNEA DECORATIVA
    // ================================================

    ctx.strokeStyle = estilo.detalle
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(100, 110)
    ctx.lineTo(412, 110)
    ctx.stroke()

    // ================================================
    // 📝 TEXTO PRINCIPAL
    // ================================================

    const ajuste = ajustarTexto(
        ctx,
        texto,
        nombre
    )

    ctx.font =
        `900 ${ajuste.fontSize}px ${ajuste.fuente}`

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = estilo.texto

    const altura =
        ajuste.lineas.length *
        ajuste.lineHeight

    const inicioY =
        256 -
        altura / 2 +
        ajuste.lineHeight / 2

    for (
        let i = 0;
        i < ajuste.lineas.length;
        i++
    ) {

        const linea = ajuste.lineas[i]

        const y =
            inicioY + i * ajuste.lineHeight

        if (nombre === 'comic') {

            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = Math.max(
                2,
                ajuste.fontSize * 0.06
            )

            ctx.lineJoin = 'round'

            ctx.strokeText(
                linea,
                256,
                y
            )
        }

        ctx.fillText(
            linea,
            256,
            y
        )
    }

    // ================================================
    // 🐾 FIRMA INFERIOR
    // ================================================

    ctx.font = `900 14px "${FONT}"`

    ctx.fillStyle = estilo.texto

    ctx.globalAlpha = 0.65

    ctx.fillText(
        'WHATSAPP-BOT',
        256,
        438
    )

    ctx.globalAlpha = 1

    return canvas.toBuffer('image/png')
}

// ============================================================
// 🏷️ METADATOS DEL STICKER
// ============================================================

function agregarExif(webp) {

    const metadata = {

        'sticker-pack-id':
            'whatsapp-bot-ttp',

        'sticker-pack-name':
            String(
                global.packname ||
                'WhatsApp-Bot'
            ),

        'sticker-pack-publisher':
            String(
                global.author ||
                'Anónimo🐼'
            ),

        emojis: ['🐾']
    }

    const json = Buffer.from(
        JSON.stringify(metadata),
        'utf8'
    )

    const cabecera = Buffer.from([
        0x49, 0x49, 0x2A, 0x00,
        0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00,
        0x00, 0x00
    ])

    cabecera.writeUInt32LE(
        json.length,
        14
    )

    const exif = Buffer.concat([
        cabecera,
        json
    ])

    if (
        webp.toString('ascii', 0, 4) !== 'RIFF' ||
        webp.toString('ascii', 8, 12) !== 'WEBP'
    ) {

        throw new Error('INVALID_WEBP')
    }

    const chunks = []

    let offset = 12
    let tieneVP8X = false

    while (offset + 8 <= webp.length) {

        const tipo = webp.toString(
            'ascii',
            offset,
            offset + 4
        )

        const longitud =
            webp.readUInt32LE(offset + 4)

        const final =
            offset + 8 + longitud +
            (longitud % 2)

        if (final > webp.length) {

            throw new Error('INVALID_WEBP')
        }

        if (tipo !== 'EXIF') {

            const chunk = Buffer.from(
                webp.subarray(offset, final)
            )

            if (tipo === 'VP8X') {

                if (longitud < 10) {
                    throw new Error('INVALID_WEBP')
                }

                // Activar indicador EXIF.

                chunk[8] |= 0x08

                tieneVP8X = true
            }

            chunks.push(chunk)
        }

        offset = final
    }

    if (!tieneVP8X) {

        const vp8x = Buffer.alloc(18)

        vp8x.write('VP8X', 0)
        vp8x.writeUInt32LE(10, 4)

        // EXIF + transparencia.

        vp8x[8] = 0x18

        vp8x.writeUIntLE(
            CONFIG.size - 1,
            12,
            3
        )

        vp8x.writeUIntLE(
            CONFIG.size - 1,
            15,
            3
        )

        chunks.unshift(vp8x)
    }

    const exifChunk = Buffer.alloc(
        8 + exif.length + exif.length % 2
    )

    exifChunk.write('EXIF', 0)

    exifChunk.writeUInt32LE(
        exif.length,
        4
    )

    exif.copy(exifChunk, 8)

    chunks.push(exifChunk)

    const contenido = Buffer.concat(chunks)

    const riff = Buffer.alloc(12)

    riff.write('RIFF', 0)

    riff.writeUInt32LE(
        contenido.length + 4,
        4
    )

    riff.write('WEBP', 8)

    return Buffer.concat([
        riff,
        contenido
    ])
}

// ============================================================
// 🔄 CONVERTIR A WEBP
// ============================================================

async function generarSticker(png) {

    const calidades = [
        95,
        85,
        75,
        60,
        45,
        30
    ]

    for (const quality of calidades) {

        const webp = await sharp(png)

            .resize(
                CONFIG.size,
                CONFIG.size
            )

            .webp({
                quality,
                alphaQuality: 85,
                effort: 4
            })

            .toBuffer()

        const sticker = agregarExif(webp)

        if (
            sticker.length <= CONFIG.maxSticker
        ) {

            return sticker
        }
    }

    throw new Error('STICKER_TOO_LARGE')
}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

let handler = async function (m, {

    conn,
    text = '',
    usedPrefix = '.'

}) {

    // 🔇 No responder en privados.

    if (!m.isGroup) return

    const consulta = String(text).trim()

    // ================================================
    // 📚 MOSTRAR MENÚ
    // ================================================

    if (
        !consulta ||
        /^(menu|menú|estilos|ayuda)$/i.test(consulta)
    ) {

        return conn.reply(
            m.chat,
            MENU.trim(),
            m
        )
    }

    const opciones =
        obtenerOpciones(consulta)

    if (!opciones.texto) {

        return m.reply(
            `❌ Usá: ${usedPrefix}ttp Hola mundo`
        )
    }

    if (
        Array.from(opciones.texto).length >
        CONFIG.maxTexto
    ) {

        return m.reply(
            `❌ Máximo ${CONFIG.maxTexto} caracteres.`
        )
    }

    // ================================================
    // 🛡️ CONTROL DE SOLICITUDES
    // ================================================

    if (
        processing.has(m.sender) ||
        processing.size >= CONFIG.maxConcurrent
    ) {

        return react(conn, m, '⏳')
    }

    processing.add(m.sender)

    try {

        await react(conn, m, '🎨')

        // ============================================
        // 🖼️ GENERAR TARJETA
        // ============================================

        const png = generarTarjeta(
            opciones.texto,
            opciones.estilo
        )

        // ============================================
        // 🔄 CONVERTIR A STICKER
        // ============================================

        const sticker = await generarSticker(
            png
        )

        // ============================================
        // 📤 ENVIAR STICKER
        // ============================================

        await conn.sendMessage(
            m.chat,
            {
                sticker
            },
            {
                quoted: m
            }
        )

        await react(conn, m, '✅')

        console.log(
            `[TTP] Estilo: ${opciones.estilo} | ` +
            `Tamaño: ${sticker.length} bytes`
        )

    } catch (error) {

        console.error(
            '[TTP] ERROR:',
            error.stack || error.message || error
        )

        const status = error.output
            ? error.output.statusCode
            : error.statusCode

        if (
            Number(status) === 428 ||
            /connection closed/i.test(
                String(error.message || '')
            )
        ) {

            return
        }

        await react(conn, m, '❌')

        try {

            if (
                error.message === 'TEXT_TOO_LONG'
            ) {

                return await m.reply(
                    '❌ El texto es demasiado largo.'
                )
            }

            if (
                error.message === 'STICKER_TOO_LARGE'
            ) {

                return await m.reply(
                    '❌ El sticker es demasiado pesado.'
                )
            }

            await m.reply(
                '❌ No pude generar el sticker.'
            )

        } catch (sendError) {

            console.warn(
                '[TTP] Error de respuesta:',
                sendError.message
            )
        }

    } finally {

        processing.delete(m.sender)
    }
}

// ============================================================
// 📌 COMANDOS
// ============================================================

handler.command = /^(ttp|textcard|ttcard)$/i

handler.help = [
    'ttp <texto>',
    'ttp <estilo> | <texto>',
    'ttp menu'
]

handler.tags = ['sticker']

handler.group = true
handler.register = false
handler.limit = false
handler.botAdmin = false

export default handler
