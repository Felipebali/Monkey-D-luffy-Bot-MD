
/**
 * 📂 plugins/ttp2.js
 * 🤖 WHATSAPP-BOT — TEXT TO STICKER V2
 *
 * 🎨 10 estilos de texto
 * 🌈 Colores degradados
 * ✨ Efectos de neón y sombras
 * 🔠 Tamaño de texto automático
 * 🖼️ Fondo transparente
 * 💾 Generación local
 * 🌐 Sin APIs externas
 * 👥 Solo grupos
 * 🔇 Sin spam
 */

import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { createRequire } from 'node:module'
import path from 'node:path'
import sharp from 'sharp'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const CONFIG = {
    size: 512,
    maxTexto: 150,
    maxConcurrent: 3,
    maxSticker: 100 * 1024
}

const require = createRequire(import.meta.url)
const processing = new Set()

// ============================================================
// 🔠 REGISTRAR FUENTE
// ============================================================

let FONT = 'sans-serif'

try {

    const fontPath = path.join(
        path.dirname(
            require.resolve('@fontsource/roboto/package.json')
        ),
        'files',
        'roboto-latin-900-normal.woff'
    )

    const registrada = GlobalFonts.registerFromPath(
        fontPath,
        'TTP2Roboto'
    )

    if (registrada) {
        FONT = 'TTP2Roboto'
    }

    console.log(
        '[TTP2] Fuente:',
        registrada ? 'Roboto OK' : 'Fuente alternativa'
    )

} catch (error) {

    console.log(
        '[TTP2] Error de fuente:',
        error.message
    )
}

// ============================================================
// 🎨 ESTILOS DISPONIBLES
// ============================================================

const ESTILOS = {

    neon: {
        colores: ['#FFFFFF', '#00FFFF', '#008CFF'],
        borde: '#002B55',
        sombra: '#00FFFF',
        brillo: 18
    },

    fuego: {
        colores: ['#FFFF00', '#FF9900', '#FF2200'],
        borde: '#6B0000',
        sombra: '#FF4500',
        brillo: 15
    },

    arcoiris: {
        colores: [
            '#FF3366',
            '#FF9900',
            '#FFFF00',
            '#33FF77',
            '#00CCFF',
            '#CC44FF'
        ],
        borde: '#222222',
        sombra: '#FFFFFF',
        brillo: 5
    },

    clasico: {
        colores: ['#FFFFFF', '#FFFFFF'],
        borde: '#000000',
        sombra: '#000000',
        brillo: 4
    },

    dorado: {
        colores: ['#FFF5B0', '#FFD700', '#B8860B'],
        borde: '#503000',
        sombra: '#FFD700',
        brillo: 10
    },

    rosa: {
        colores: ['#FFE0F5', '#FF69B4', '#FF1493'],
        borde: '#75003D',
        sombra: '#FF69B4',
        brillo: 14
    },

    hielo: {
        colores: ['#FFFFFF', '#A5F3FF', '#369EFF'],
        borde: '#003B70',
        sombra: '#66D9FF',
        brillo: 12
    },

    verde: {
        colores: ['#CCFF99', '#39FF14', '#009900'],
        borde: '#003300',
        sombra: '#39FF14',
        brillo: 14
    },

    morado: {
        colores: ['#F1D5FF', '#B44CFF', '#6500C8'],
        borde: '#25004D',
        sombra: '#C266FF',
        brillo: 15
    },

    rojo: {
        colores: ['#FFAAAA', '#FF3333', '#BB0000'],
        borde: '#400000',
        sombra: '#FF0000',
        brillo: 12
    }
}

// ============================================================
// 🎲 ESTILO ALEATORIO
// ============================================================

function estiloAleatorio() {

    const estilos = Object.keys(ESTILOS)

    return estilos[
        Math.floor(Math.random() * estilos.length)
    ]
}

// ============================================================
// 📋 MENÚ DE ESTILOS
// ============================================================

function menu(prefix = '.') {

    return `╭━━〔 🎨 *TTP2 STICKERS* 〕━━╮
┃
┃ 🖼️ Texto a sticker
┃ ✨ Estilos disponibles:
┃
┃ ⚡ neon
┃ 🔥 fuego
┃ 🌈 arcoiris
┃ ⚪ clasico
┃ 👑 dorado
┃ 🩷 rosa
┃ 🧊 hielo
┃ 💚 verde
┃ 💜 morado
┃ ❤️ rojo
┃
┃ 📌 *EJEMPLOS*
┃ ${prefix}ttp2 Hola mundo
┃ ${prefix}ttp2 neon | Hola
┃ ${prefix}ttp2 fuego | Buenas
┃ ${prefix}ttp2 dorado | OWNER
┃
┃ 🎲 Sin estilo: aleatorio
┃ 📝 Máximo 150 caracteres
┃
╰━━〔 *WHATSAPP-BOT* 〕━━╯`
}

// ============================================================
// 📝 SEPARAR TEXTO EN LÍNEAS
// ============================================================

function dividirTexto(ctx, texto, maxWidth) {

    const lineas = []

    for (const parrafo of texto.split('\n')) {

        if (!parrafo.trim()) {
            lineas.push('')
            continue
        }

        const palabras = parrafo.trim().split(/\s+/)

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

            // Dividir palabras demasiado largas.

            if (
                ctx.measureText(palabra).width > maxWidth
            ) {

                let fragmento = ''

                for (const letra of Array.from(palabra)) {

                    const siguiente = fragmento + letra

                    if (
                        fragmento &&
                        ctx.measureText(siguiente).width >
                            maxWidth
                    ) {

                        lineas.push(fragmento)
                        fragmento = letra

                    } else {

                        fragmento = siguiente
                    }
                }

                linea = fragmento

            } else {

                linea = palabra
            }
        }

        if (linea) {
            lineas.push(linea)
        }
    }

    return lineas
}

// ============================================================
// 📐 AJUSTAR TAMAÑO AUTOMÁTICAMENTE
// ============================================================

function ajustarTexto(ctx, texto) {

    const maxWidth = 420
    const maxHeight = 420

    for (
        let fontSize = 125;
        fontSize >= 12;
        fontSize -= 2
    ) {

        ctx.font = `900 ${fontSize}px "${FONT}"`

        const lineas = dividirTexto(
            ctx,
            texto,
            maxWidth
        )

        const lineHeight = fontSize * 1.18

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
                lineHeight,
                lineas
            }
        }
    }

    throw new Error(
        'El texto no entra en el sticker.'
    )
}

// ============================================================
// 🎨 GENERAR STICKER LOCALMENTE
// ============================================================

async function generarSticker(texto, estilo) {

    const canvas = createCanvas(
        CONFIG.size,
        CONFIG.size
    )

    const ctx = canvas.getContext('2d')

    // Fondo completamente transparente.

    ctx.clearRect(
        0,
        0,
        CONFIG.size,
        CONFIG.size
    )

    const config = ESTILOS[estilo]

    const {
        fontSize,
        lineHeight,
        lineas
    } = ajustarTexto(ctx, texto)

    ctx.font = `900 ${fontSize}px "${FONT}"`

    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    const centerX = CONFIG.size / 2

    const alturaTotal =
        lineas.length * lineHeight

    const startY =
        (CONFIG.size - alturaTotal) / 2

    const borde = Math.max(
        2,
        fontSize * 0.10
    )

    for (let i = 0; i < lineas.length; i++) {

        const linea = lineas[i]

        if (!linea) continue

        const metrics = ctx.measureText(linea)

        const ascent =
            metrics.actualBoundingBoxAscent ||
            fontSize * 0.8

        const descent =
            metrics.actualBoundingBoxDescent ||
            fontSize * 0.2

        const y =
            startY +
            i * lineHeight +
            (lineHeight + ascent - descent) / 2

        // ====================================================
        // 🌈 DEGRADADO
        // ====================================================

        const gradient = ctx.createLinearGradient(
            centerX,
            y - ascent,
            centerX,
            y + descent
        )

        config.colores.forEach((color, index) => {

            gradient.addColorStop(
                index / (config.colores.length - 1),
                color
            )
        })

        // ====================================================
        // ✨ SOMBRA Y BRILLO
        // ====================================================

        ctx.shadowColor = config.sombra
        ctx.shadowBlur = config.brillo

        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 2

        ctx.strokeStyle = config.borde
        ctx.lineWidth = borde

        ctx.strokeText(
            linea,
            centerX,
            y
        )

        // ====================================================
        // 🔠 RELLENO DEL TEXTO
        // ====================================================

        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0

        ctx.fillStyle = gradient

        ctx.fillText(
            linea,
            centerX,
            y
        )
    }

    const png = canvas.toBuffer('image/png')

    // ========================================================
    // 🗜️ CONVERTIR A WEBP OPTIMIZADO
    // ========================================================

    for (const quality of [95, 85, 75, 60, 45]) {

        const webp = await sharp(png)

            .webp({
                quality,
                alphaQuality: 85,
                effort: 4
            })

            .toBuffer()

        if (webp.length <= CONFIG.maxSticker) {

            return webp
        }
    }

    throw new Error(
        'El sticker supera el tamaño permitido.'
    )
}

// ============================================================
// 🎭 REACCIONES
// ============================================================

async function reaccionar(conn, m, emoji) {

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
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, {

    conn,
    text = '',
    usedPrefix = '.'

}) => {

    if (!m.isGroup) return

    const entrada = String(text).trim()

    // ========================================================
    // 📋 MOSTRAR MENÚ
    // ========================================================

    if (
        !entrada ||
        /^(menu|menú|estilos|ayuda)$/i.test(entrada)
    ) {

        return conn.sendMessage(

            m.chat,

            {
                text: menu(usedPrefix)
            },

            {
                quoted: m
            }
        )
    }

    // ========================================================
    // 🎨 SELECCIONAR ESTILO
    // ========================================================

    let estilo = estiloAleatorio()

    let contenido = entrada

    if (entrada.includes('|')) {

        const posicion = entrada.indexOf('|')

        const seleccionado = entrada

            .slice(0, posicion)

            .trim()

            .normalize('NFD')

            .replace(/[\u0300-\u036f]/g, '')

            .toLowerCase()

        if (
            !Object.hasOwn(ESTILOS, seleccionado) &&
            seleccionado !== 'random' &&
            seleccionado !== 'aleatorio'
        ) {

            return m.reply(

                `❌ Estilo inválido.\n` +
                `📋 Usá ${usedPrefix}ttp2 para ver los estilos.`

            )
        }

        if (Object.hasOwn(ESTILOS, seleccionado)) {

            estilo = seleccionado
        }

        contenido = entrada

            .slice(posicion + 1)

            .trim()
    }

    // ========================================================
    // 📝 VALIDAR TEXTO
    // ========================================================

    if (!contenido) {

        return m.reply(
            '❌ Escribí el texto del sticker.'
        )
    }

    if (
        Array.from(contenido).length >
        CONFIG.maxTexto
    ) {

        return m.reply(
            `❌ Máximo ${CONFIG.maxTexto} caracteres.`
        )
    }

    // ========================================================
    // 🛡️ EVITAR SOBRECARGA
    // ========================================================

    if (processing.has(m.sender)) return

    if (
        processing.size >= CONFIG.maxConcurrent
    ) {

        return reaccionar(conn, m, '⏳')
    }

    processing.add(m.sender)

    const inicio = Date.now()

    try {

        await reaccionar(conn, m, '🎨')

        // ====================================================
        // 🖼️ GENERAR STICKER
        // ====================================================

        const sticker = await generarSticker(
            contenido,
            estilo
        )

        // ====================================================
        // 📤 ENVIAR STICKER
        // ====================================================

        await conn.sendMessage(

            m.chat,

            {
                sticker
            },

            {
                quoted: m
            }
        )

        await reaccionar(conn, m, '✅')

        console.log(

            `[TTP2] Estilo: ${estilo} | ` +

            `Tamaño: ${(sticker.length / 1024).toFixed(1)} KB | ` +

            `Tiempo: ${Date.now() - inicio}ms`

        )

    } catch (error) {

        console.error(
            '[TTP2] ERROR:',
            error.message || error
        )

        await reaccionar(conn, m, '❌')

        await m.reply(
            '⚠️ No pude generar el sticker.'
        )

    } finally {

        processing.delete(m.sender)
    }
}

// ============================================================
// ⚙️ REGISTRO DE COMANDOS
// ============================================================

handler.help = [
    'ttp2 <texto>',
    'ttp2 <estilo> | <texto>'
]

handler.tags = ['sticker']

handler.command = /^(ttp2|textsticker2)$/i

handler.group = true
handler.register = false
handler.limit = false

export default handler
