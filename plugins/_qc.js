
/**
 * 📂 plugins/_qc.js
 * 🤖 whatsapp-bot — QUOTE STICKER V3
 *
 * ✅ Fuente Roboto integrada
 * ✅ Texto escrito y citado
 * ✅ Foto de perfil circular
 * ✅ Compatibilidad LID
 * ✅ Fondo transparente
 * ✅ WebP 512x512
 * ✅ Sin APIs externas de generación
 * ✅ Solo grupos
 * ✅ Sin cooldown
 */

import {
    createCanvas,
    loadImage,
    GlobalFonts
} from '@napi-rs/canvas'

import sharp from 'sharp'
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'

const require = createRequire(import.meta.url)

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const MAX_LENGTH = 310
const MAX_CONCURRENT = 3

const processing = new Set()

const COLORS = [
    '#53BDEB',
    '#82E0AA',
    '#FFCB6B',
    '#F48FB1',
    '#C792EA',
    '#FF7B7B'
]

// ============================================================
// 🔤 REGISTRAR FUENTES ROBOTO
// ============================================================

let FONT_REGULAR = false
let FONT_BOLD = false

try {

    const fontDirectory = path.join(
        path.dirname(
            require.resolve('@fontsource/roboto/package.json')
        ),
        'files'
    )

    const regularPath = path.join(
        fontDirectory,
        'roboto-latin-400-normal.woff'
    )

    const boldPath = path.join(
        fontDirectory,
        'roboto-latin-700-normal.woff'
    )

    if (fs.existsSync(regularPath)) {

        FONT_REGULAR = GlobalFonts.registerFromPath(
            regularPath,
            'QCRobotoRegular'
        )

    }

    if (fs.existsSync(boldPath)) {

        FONT_BOLD = GlobalFonts.registerFromPath(
            boldPath,
            'QCRobotoBold'
        )

    }

    console.log(
        '[QC] Fuente regular:',
        FONT_REGULAR ? 'OK' : 'ERROR'
    )

    console.log(
        '[QC] Fuente negrita:',
        FONT_BOLD ? 'OK' : 'ERROR'
    )

} catch (error) {

    console.error(
        '[QC] Error cargando fuentes:',
        error.message
    )

}

function setFont(ctx, size, bold = false) {

    const family = bold && FONT_BOLD
        ? 'QCRobotoBold'
        : 'QCRobotoRegular'

    ctx.font = `${size}px "${family}"`

}

// ============================================================
// 🚀 COMANDO PRINCIPAL
// ============================================================

const handler = async (m, {
    conn,
    text = '',
    args = []
}) => {

    if (!m.isGroup) return

    const sender = m.sender

    if (processing.has(sender)) return

    if (processing.size >= MAX_CONCURRENT) {
        return react(conn, m, '⏳')
    }

    let quoteText = ''
    let quoteSender = ''
    let quoteName = ''

    const input = String(
        text || args.join(' ') || ''
    ).trim()

    // ========================================================
    // 📝 TEXTO ESCRITO
    // ========================================================

    if (input) {

        quoteText = input
        quoteSender = m.sender

        quoteName =
            m.pushName ||
            m.name ||
            ''

    // ========================================================
    // 💬 MENSAJE CITADO
    // ========================================================

    } else if (m.quoted) {

        const q = m.quoted

        quoteText = String(
            q.text ||
            q.caption ||
            q.msg?.text ||
            q.msg?.caption ||
            q.message?.conversation ||
            q.message?.extendedTextMessage?.text ||
            q.message?.imageMessage?.caption ||
            q.message?.videoMessage?.caption ||
            (
                typeof q.msg === 'string'
                    ? q.msg
                    : ''
            )
        ).trim()

        quoteSender =
            q.sender ||
            q.participant ||
            q.key?.participant ||
            ''

        quoteName =
            q.pushName ||
            q.name ||
            ''

    }

    if (!quoteText) {

        return m.reply(
            '╭━━━〔 💬 *QUOTE STICKER* 〕━━━╮\n' +
            '┃\n' +
            '┃ 📝 .qc Hola mundo\n' +
            '┃ 💬 O citá un mensaje con .qc\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯'
        )

    }

    if (!quoteSender) {

        return m.reply(
            '❌ No se pudo identificar al autor.'
        )

    }

    const length = Array.from(quoteText).length

    if (length > MAX_LENGTH) {

        return m.reply(
            `⚠️ Máximo ${MAX_LENGTH} caracteres.`
        )

    }

    if (!FONT_REGULAR) {

        console.error(
            '[QC] No se pudo registrar la fuente Roboto.'
        )

        return m.reply(
            '❌ La fuente del QC no está disponible.'
        )

    }

    processing.add(sender)

    try {

        await react(conn, m, '💬')

        // ====================================================
        // 👤 IDENTIFICAR USUARIO Y LID
        // ====================================================

        if (typeof conn.decodeJid === 'function') {

            quoteSender =
                conn.decodeJid(quoteSender) ||
                quoteSender

        }

        const candidates = new Set([quoteSender])

        try {

            const metadata =
                await conn.groupMetadata(m.chat)

            const participant =
                metadata.participants?.find(p =>
                    [
                        p.id,
                        p.lid,
                        p.phoneNumber,
                        p.jid
                    ].includes(quoteSender)
                )

            if (participant) {

                for (const id of [
                    participant.id,
                    participant.lid,
                    participant.phoneNumber,
                    participant.jid
                ]) {

                    if (
                        typeof id === 'string' &&
                        id.includes('@')
                    ) {

                        candidates.add(id)

                    }

                }

                if (!quoteName) {

                    quoteName =
                        participant.notify ||
                        participant.name ||
                        ''

                }

            }

        } catch {}

        // ====================================================
        // 📛 OBTENER NOMBRE
        // ====================================================

        if (!quoteName) {

            for (const id of candidates) {

                try {

                    const contact = conn.contacts?.[id]

                    const name =
                        contact?.notify ||
                        contact?.name ||
                        (
                            typeof conn.getName === 'function'
                                ? await conn.getName(id)
                                : ''
                        )

                    if (name) {

                        quoteName = String(name)
                        break

                    }

                } catch {}

            }

        }

        quoteName = String(
            quoteName ||
            (
                quoteSender.endsWith('@lid')
                    ? 'Usuario'
                    : quoteSender.split('@')[0]
            )
        ).trim()

        // ====================================================
        // 🖼️ OBTENER FOTO DE PERFIL
        // ====================================================

        let avatar = null

        for (const id of candidates) {

            try {

                const url =
                    await conn.profilePictureUrl(
                        id,
                        'image'
                    )

                if (!url) continue

                const response = await fetch(url, {
                    signal: AbortSignal.timeout(8000)
                })

                if (!response.ok) continue

                const buffer = Buffer.from(
                    await response.arrayBuffer()
                )

                const image = await sharp(buffer)
                    .rotate()
                    .resize(256, 256, {
                        fit: 'cover'
                    })
                    .png()
                    .toBuffer()

                avatar = await loadImage(image)

                break

            } catch {}

        }

        console.log('[QC] Autor:', quoteName)
        console.log('[QC] Caracteres:', length)
        console.log(
            '[QC] Foto:',
            avatar ? 'OK' : 'Avatar alternativo'
        )

        // ====================================================
        // 🎨 GENERAR IMAGEN
        // ====================================================

        const png = generateQuote({
            name: quoteName,
            text: quoteText,
            avatar,
            jid: quoteSender
        })

        // ====================================================
        // 🧩 CONVERTIR DIRECTAMENTE A WEBP
        // ====================================================

        let webp = null

        for (const quality of [
            95, 85, 70, 50, 30, 15
        ]) {

            webp = await sharp(png)
                .webp({
                    quality,
                    alphaQuality: 100,
                    effort: 6
                })
                .toBuffer()

            if (webp.length <= 100 * 1024) {
                break
            }

        }

        if (!webp?.length) {
            throw new Error('WebP vacío.')
        }

        if (webp.length > 100 * 1024) {
            throw new Error('Sticker demasiado grande.')
        }

        const info = await sharp(webp).metadata()

        console.log(
            '[QC] Imagen:',
            `${info.width}x${info.height}`,
            info.format
        )

        // ====================================================
        // 📤 ENVIAR STICKER
        // ====================================================

        await conn.sendMessage(
            m.chat,
            {
                sticker: webp
            },
            {
                quoted: m
            }
        )

        await react(conn, m, '✅')

        console.log(
            '[QC] Sticker enviado correctamente:',
            `${(webp.length / 1024).toFixed(1)} KB`
        )

    } catch (error) {

        console.error('[QC] ERROR:', error)

        await react(conn, m, '❌')

        await m.reply(
            '❌ No se pudo generar el sticker QC.'
        )

    } finally {

        processing.delete(sender)

    }

}

// ============================================================
// 🎨 GENERADOR DE STICKERS
// ============================================================

function generateQuote({
    name,
    text,
    avatar,
    jid
}) {

    const SIZE = 512

    const canvas = createCanvas(SIZE, SIZE)
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, SIZE, SIZE)

    const AVATAR = 82
    const GAP = 16
    const PADDING = 22

    const MAX_BUBBLE_WIDTH = 386

    const MAX_TEXT_WIDTH =
        MAX_BUBBLE_WIDTH - PADDING * 2

    let fontSize = 34
    let lines = []
    let lineHeight = 42
    let bubbleHeight = 0

    // ========================================================
    // 📐 AJUSTAR TEXTO AL STICKER
    // ========================================================

    while (fontSize >= 10) {

        setFont(ctx, fontSize)

        lines = wrapText(
            ctx,
            text,
            MAX_TEXT_WIDTH
        )

        lineHeight =
            Math.ceil(fontSize * 1.3)

        bubbleHeight =
            76 + lines.length * lineHeight

        if (bubbleHeight <= 480) break

        fontSize--

    }

    if (bubbleHeight > 480) {

        throw new Error(
            'El mensaje contiene demasiadas líneas.'
        )

    }

    setFont(ctx, fontSize)

    const longestLine = Math.max(
        ...lines.map(
            line => ctx.measureText(line).width
        ),
        0
    )

    // Comprobar que la fuente mida correctamente.

    const testWidth =
        ctx.measureText('Hola mundo').width

    if (!Number.isFinite(testWidth) || testWidth <= 0) {

        throw new Error(
            'La fuente no está renderizando correctamente.'
        )

    }

    // ========================================================
    // 📛 AJUSTAR NOMBRE
    // ========================================================

    setFont(ctx, 27, true)

    const displayName = truncateText(
        ctx,
        name,
        MAX_TEXT_WIDTH
    )

    const nameWidth =
        ctx.measureText(displayName).width

    const bubbleWidth = Math.min(
        MAX_BUBBLE_WIDTH,
        Math.max(
            160,
            longestLine + PADDING * 2,
            nameWidth + PADDING * 2
        )
    )

    // ========================================================
    // 📍 CENTRAR IMAGEN
    // ========================================================

    const totalWidth =
        AVATAR + GAP + bubbleWidth

    const totalHeight =
        Math.max(AVATAR + 4, bubbleHeight)

    const startX =
        Math.round((SIZE - totalWidth) / 2)

    const startY =
        Math.round((SIZE - totalHeight) / 2)

    const avatarX = startX
    const avatarY = startY + 4

    const bubbleX =
        startX + AVATAR + GAP

    const bubbleY = startY

    const color = getColor(jid || name)

    // ========================================================
    // 💬 BURBUJA ESTILO WHATSAPP
    // ========================================================

    ctx.fillStyle = '#202C33'

    roundedRect(
        ctx,
        bubbleX,
        bubbleY,
        bubbleWidth,
        bubbleHeight,
        25
    )

    ctx.fill()

    ctx.beginPath()

    ctx.moveTo(
        bubbleX + 12,
        bubbleY + 12
    )

    ctx.lineTo(
        bubbleX - 12,
        bubbleY + 12
    )

    ctx.lineTo(
        bubbleX + 12,
        bubbleY + 38
    )

    ctx.closePath()
    ctx.fill()

    // ========================================================
    // 👤 FOTO CIRCULAR
    // ========================================================

    ctx.save()

    ctx.beginPath()

    ctx.arc(
        avatarX + AVATAR / 2,
        avatarY + AVATAR / 2,
        AVATAR / 2,
        0,
        Math.PI * 2
    )

    ctx.clip()

    if (avatar) {

        ctx.drawImage(
            avatar,
            avatarX,
            avatarY,
            AVATAR,
            AVATAR
        )

    } else {

        // Avatar alternativo local.

        ctx.fillStyle = '#667781'

        ctx.fillRect(
            avatarX,
            avatarY,
            AVATAR,
            AVATAR
        )

        ctx.fillStyle = '#CFD8DC'

        ctx.beginPath()

        ctx.arc(
            avatarX + AVATAR / 2,
            avatarY + 28,
            15,
            0,
            Math.PI * 2
        )

        ctx.fill()

        ctx.beginPath()

        ctx.ellipse(
            avatarX + AVATAR / 2,
            avatarY + 76,
            32,
            28,
            0,
            0,
            Math.PI * 2
        )

        ctx.fill()

    }

    ctx.restore()

    // ========================================================
    // 📛 DIBUJAR NOMBRE CON ROBOTO
    // ========================================================

    ctx.globalAlpha = 1
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'

    setFont(ctx, 27, true)

    ctx.fillStyle = color

    ctx.fillText(
        displayName,
        bubbleX + PADDING,
        bubbleY + 40
    )

    // ========================================================
    // 📝 DIBUJAR MENSAJE CON ROBOTO
    // ========================================================

    setFont(ctx, fontSize)

    ctx.fillStyle = '#FFFFFF'

    let y =
        bubbleY + 54 + fontSize

    for (const line of lines) {

        ctx.fillText(
            line,
            bubbleX + PADDING,
            y
        )

        y += lineHeight

    }

    return canvas.toBuffer('image/png')

}

// ============================================================
// 📝 DIVIDIR TEXTO AUTOMÁTICAMENTE
// ============================================================

function wrapText(ctx, text, maxWidth) {

    const lines = []

    const segmenter = new Intl.Segmenter(
        'es',
        {
            granularity: 'grapheme'
        }
    )

    const paragraphs = String(text)
        .replace(/\r/g, '')
        .split('\n')

    for (const paragraph of paragraphs) {

        if (!paragraph.trim()) {

            lines.push('')
            continue

        }

        let line = ''

        for (const word of paragraph.trim().split(/\s+/)) {

            const test = line
                ? `${line} ${word}`
                : word

            if (
                ctx.measureText(test).width <= maxWidth
            ) {

                line = test
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
                continue

            }

            for (const { segment } of segmenter.segment(word)) {

                if (
                    line &&
                    ctx.measureText(line + segment).width >
                    maxWidth
                ) {

                    lines.push(line)
                    line = ''

                }

                line += segment

            }

        }

        if (line) lines.push(line)

    }

    return lines.length ? lines : ['']

}

// ============================================================
// ✂️ ACORTAR NOMBRES
// ============================================================

function truncateText(ctx, text, maxWidth) {

    const chars = Array.from(String(text))

    if (
        ctx.measureText(chars.join('')).width <= maxWidth
    ) {

        return chars.join('')

    }

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
// 🎨 COLOR INDIVIDUAL
// ============================================================

function getColor(value) {

    let hash = 0

    for (const char of String(value || '')) {

        hash = (
            hash * 31 + char.codePointAt(0)
        ) | 0

    }

    return COLORS[
        Math.abs(hash) % COLORS.length
    ]

}

// ============================================================
// 🔲 BORDES REDONDEADOS
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
    'qc'
]

handler.tags = ['sticker']

handler.command =
    /^(qc|quote|quotesticker)$/i

handler.group = true
handler.register = false
handler.limit = false

export default handler
