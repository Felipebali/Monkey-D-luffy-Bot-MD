
/**
 * 📂 plugins/_qc.js
 * 🤖 whatsapp-bot — QUOTE STICKER
 *
 * 💬 Sticker con mensaje citado o escrito
 * 👤 Foto de perfil y nombre del usuario
 * 🎨 Burbuja estilo WhatsApp
 * 🌐 Sin APIs externas de generación
 * 🖼️ Avatar alternativo local
 * 📏 Máximo 310 caracteres
 * 👥 Exclusivo para grupos
 */

import { createCanvas, loadImage } from '@napi-rs/canvas'
import sharp from 'sharp'
import { sticker } from '../lib/sticker.js'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const MAX_LENGTH = 310
const MAX_CONCURRENT = 3

const processing = new Set()

const COLORS = [
    '#FF7B7B',
    '#72D5FF',
    '#FFCB6B',
    '#C792EA',
    '#82E0AA',
    '#F78C6C',
    '#F48FB1'
]

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn, text = '' }) => {

    if (!m.isGroup) return

    const sender = m.sender

    if (processing.has(sender)) return

    if (processing.size >= MAX_CONCURRENT) {
        return m.reply(
            '⏳ Hay stickers en proceso. Intentá en un momento.'
        )
    }

    let quoteText = ''
    let quoteSender = ''
    let quoteName = ''

    // ========================================================
    // 📝 OBTENER MENSAJE
    // ========================================================

    if (m.quoted) {

        quoteText = String(
            m.quoted.text ||
            m.quoted.caption ||
            m.quoted.msg?.text ||
            m.quoted.msg?.caption ||
            ''
        ).trim()

        if (quoteText) {

            quoteSender =
                m.quoted.sender || m.sender

            quoteName =
                m.quoted.pushName ||
                m.quoted.name ||
                ''

        }

    }

    if (!quoteText && text.trim()) {

        quoteText = text.trim()
        quoteSender = m.sender

        quoteName =
            m.pushName ||
            m.name ||
            ''

    }

    if (!quoteText) {

        return m.reply(
            '╭━━━〔 💬 *STICKER QC* 〕━━━╮\n' +
            '┃\n' +
            '┃ 📝 Escribí:\n' +
            '┃ • .qc Hola mundo\n' +
            '┃\n' +
            '┃ 💬 O respondé a un mensaje:\n' +
            '┃ • .qc\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯'
        )

    }

    // ========================================================
    // 📏 LÍMITE DE CARACTERES
    // ========================================================

    const length = Array.from(quoteText).length

    if (length > MAX_LENGTH) {

        return m.reply(
            '⚠️ *Texto demasiado largo.*\n\n' +
            `📏 Máximo: *${MAX_LENGTH} caracteres*\n` +
            `📝 Tu texto: *${length} caracteres*`
        )

    }

    processing.add(sender)

    try {

        await react(conn, m, '💬')

        // ====================================================
        // 👤 OBTENER NOMBRE
        // ====================================================

        if (typeof conn.decodeJid === 'function') {
            quoteSender =
                conn.decodeJid(quoteSender) || quoteSender
        }

        if (!quoteName) {

            try {

                if (typeof conn.getName === 'function') {
                    quoteName = await conn.getName(quoteSender)
                }

            } catch {}

        }

        quoteName = String(
            quoteName ||
            quoteSender.split('@')[0] ||
            'Usuario'
        ).trim()

        // ====================================================
        // 🖼️ OBTENER FOTO DE PERFIL
        // ====================================================

        let avatar = null

        try {

            const pp = await conn.profilePictureUrl(
                quoteSender,
                'image'
            )

            if (pp) {

                const response = await fetch(pp, {
                    signal: AbortSignal.timeout(10000)
                })

                if (response.ok) {

                    const buffer = Buffer.from(
                        await response.arrayBuffer()
                    )

                    const image = await sharp(buffer)
                        .resize(128, 128, {
                            fit: 'cover'
                        })
                        .png()
                        .toBuffer()

                    avatar = await loadImage(image)

                }

            }

        } catch (error) {

            console.log(
                '[QC] Foto no disponible. Usando avatar local.'
            )

        }

        // ====================================================
        // 🎨 GENERAR IMAGEN LOCAL
        // ====================================================

        console.log('[QC] Generando sticker local.')

        const image = generateQuote({
            name: quoteName,
            text: quoteText,
            avatar,
            jid: quoteSender
        })

        // ====================================================
        // 🧩 PREPARAR IMAGEN PARA STICKER
        // ====================================================

        const png = await sharp(image)
            .resize(512, 512, {
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

        // ====================================================
        // 🎨 CONVERTIR A STICKER CON PACK Y AUTOR
        // ====================================================

        const stiker = await sticker(
            png,
            false,
            global.packname || 'whatsapp-bot',
            global.author || ''
        )

        if (!stiker?.length) {

            throw new Error(
                'No se pudo convertir la imagen a WebP.'
            )

        }

        // ====================================================
        // 📤 ENVIAR STICKER
        // ====================================================

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
            '[QC] Sticker enviado correctamente.'
        )

    } catch (error) {

        console.error('[QC] ERROR:', error)

        await react(conn, m, '❌')

        return m.reply(
            '❌ No se pudo generar el sticker QC.'
        )

    } finally {

        processing.delete(sender)

    }

}

// ============================================================
// 🎨 GENERADOR DE STICKERS
// ============================================================

function generateQuote({ name, text, avatar, jid }) {

    const WIDTH = 512
    const PADDING = 18
    const AVATAR_SIZE = 68

    const BUBBLE_X = 102
    const MAX_BUBBLE_WIDTH = 392
    const INNER_PADDING = 22
    const TEXT_WIDTH =
        MAX_BUBBLE_WIDTH - INNER_PADDING * 2

    const FONT_SIZE = 30
    const LINE_HEIGHT = 39

    // Canvas auxiliar para medir el texto.

    const measure = createCanvas(1, 1)
    const measureCtx = measure.getContext('2d')

    measureCtx.font = `${FONT_SIZE}px sans-serif`

    const lines = wrapText(
        measureCtx,
        text,
        TEXT_WIDTH
    )

    const longestLine = Math.max(
        ...lines.map(line =>
            measureCtx.measureText(line).width
        ),
        0
    )

    measureCtx.font = 'bold 25px sans-serif'

    const displayName = truncateText(
        measureCtx,
        name,
        TEXT_WIDTH
    )

    const nameWidth =
        measureCtx.measureText(displayName).width

    const bubbleWidth = Math.min(
        MAX_BUBBLE_WIDTH,
        Math.max(
            150,
            longestLine + INNER_PADDING * 2,
            nameWidth + INNER_PADDING * 2
        )
    )

    const bubbleHeight =
        70 + lines.length * LINE_HEIGHT

    const HEIGHT = Math.max(
        120,
        bubbleHeight + PADDING * 2
    )

    const canvas = createCanvas(WIDTH, HEIGHT)
    const ctx = canvas.getContext('2d')

    // ========================================================
    // 🖤 FONDO TRANSPARENTE
    // ========================================================

    ctx.clearRect(0, 0, WIDTH, HEIGHT)

    const color = getColor(jid || name)

    // ========================================================
    // 💬 BURBUJA DEL MENSAJE
    // ========================================================

    ctx.fillStyle = '#202C33'

    roundedRect(
        ctx,
        BUBBLE_X,
        PADDING,
        bubbleWidth,
        bubbleHeight,
        23
    )

    ctx.fill()

    // Punta de la burbuja.

    ctx.beginPath()

    ctx.moveTo(BUBBLE_X + 9, PADDING + 10)
    ctx.lineTo(BUBBLE_X - 12, PADDING + 10)
    ctx.lineTo(BUBBLE_X + 9, PADDING + 32)

    ctx.closePath()
    ctx.fill()

    // ========================================================
    // 👤 FOTO DE PERFIL CIRCULAR
    // ========================================================

    const avatarX = PADDING
    const avatarY = PADDING + 2

    ctx.save()

    ctx.beginPath()

    ctx.arc(
        avatarX + AVATAR_SIZE / 2,
        avatarY + AVATAR_SIZE / 2,
        AVATAR_SIZE / 2,
        0,
        Math.PI * 2
    )

    ctx.closePath()
    ctx.clip()

    if (avatar) {

        ctx.drawImage(
            avatar,
            avatarX,
            avatarY,
            AVATAR_SIZE,
            AVATAR_SIZE
        )

    } else {

        // Avatar local con inicial del nombre.

        ctx.fillStyle = color

        ctx.fillRect(
            avatarX,
            avatarY,
            AVATAR_SIZE,
            AVATAR_SIZE
        )

        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 35px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const initial =
            Array.from(name.trim())[0]?.toUpperCase() ||
            '?'

        ctx.fillText(
            initial,
            avatarX + AVATAR_SIZE / 2,
            avatarY + AVATAR_SIZE / 2
        )

    }

    ctx.restore()

    // ========================================================
    // ✍️ NOMBRE DEL USUARIO
    // ========================================================

    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    ctx.font = 'bold 25px sans-serif'
    ctx.fillStyle = color

    ctx.fillText(
        displayName,
        BUBBLE_X + INNER_PADDING,
        PADDING + 16
    )

    // ========================================================
    // 📝 TEXTO DEL MENSAJE
    // ========================================================

    ctx.font = `${FONT_SIZE}px sans-serif`
    ctx.fillStyle = '#E9EDEF'

    let y = PADDING + 55

    for (const line of lines) {

        ctx.fillText(
            line,
            BUBBLE_X + INNER_PADDING,
            y
        )

        y += LINE_HEIGHT

    }

    return canvas.toBuffer('image/png')

}

// ============================================================
// 📝 AJUSTAR TEXTO AUTOMÁTICAMENTE
// ============================================================

function wrapText(ctx, text, maxWidth) {

    const lines = []

    const paragraphs = String(text)
        .replace(/\r/g, '')
        .split('\n')

    for (const paragraph of paragraphs) {

        if (!paragraph.trim()) {

            lines.push('')
            continue

        }

        const words = paragraph.split(/\s+/)

        let line = ''

        for (const word of words) {

            const testLine = line
                ? `${line} ${word}`
                : word

            if (
                ctx.measureText(testLine).width <= maxWidth
            ) {

                line = testLine
                continue

            }

            if (line) {

                lines.push(line)
                line = ''

            }

            if (
                ctx.measureText(word).width <= maxWidth
            ) {

                line = word

            } else {

                // Dividir palabras demasiado largas.

                let chunk = ''

                for (const char of Array.from(word)) {

                    if (
                        chunk &&
                        ctx.measureText(chunk + char).width >
                        maxWidth
                    ) {

                        lines.push(chunk)
                        chunk = ''

                    }

                    chunk += char

                }

                line = chunk

            }

        }

        if (line) lines.push(line)

    }

    return lines.length ? lines : ['']

}

// ============================================================
// ✂️ ACORTAR NOMBRES LARGOS
// ============================================================

function truncateText(ctx, text, maxWidth) {

    const value = String(text)

    if (ctx.measureText(value).width <= maxWidth) {
        return value
    }

    const chars = Array.from(value)

    while (
        chars.length &&
        ctx.measureText(chars.join('') + '…').width >
        maxWidth
    ) {
        chars.pop()
    }

    return chars.join('') + '…'

}

// ============================================================
// 🎨 COLOR DEL USUARIO
// ============================================================

function getColor(value = '') {

    let hash = 0

    for (const char of String(value)) {

        hash = (
            hash * 31 + char.codePointAt(0)
        ) | 0

    }

    return COLORS[
        Math.abs(hash) % COLORS.length
    ]

}

// ============================================================
// 🔲 RECTÁNGULO REDONDEADO
// ============================================================

function roundedRect(ctx, x, y, w, h, r) {

    r = Math.min(r, w / 2, h / 2)

    ctx.beginPath()

    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)

    ctx.quadraticCurveTo(
        x + w, y,
        x + w, y + r
    )

    ctx.lineTo(x + w, y + h - r)

    ctx.quadraticCurveTo(
        x + w, y + h,
        x + w - r, y + h
    )

    ctx.lineTo(x + r, y + h)

    ctx.quadraticCurveTo(
        x, y + h,
        x, y + h - r
    )

    ctx.lineTo(x, y + r)

    ctx.quadraticCurveTo(
        x, y,
        x + r, y
    )

    ctx.closePath()

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
// ⚙️ CONFIGURACIÓN DEL HANDLER
// ============================================================

handler.help = [
    'qc <texto>',
    'qc respondiendo a un mensaje'
]

handler.tags = ['sticker']

handler.command =
    /^(qc|quote|quotesticker)$/i

handler.group = true
handler.register = false
handler.limit = false

export default handler
