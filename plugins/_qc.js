
/**
 * 📂 plugins/_qc.js
 * 🤖 whatsapp-bot — QUOTE STICKER V2
 *
 * 💬 Mensajes citados y escritos
 * 👤 Foto de perfil circular
 * 🎨 Burbuja estilo WhatsApp
 * 🖼️ WebP directo 512x512
 * 🌐 Sin APIs externas de generación
 * 👥 Solo grupos
 */

import { createCanvas, loadImage } from '@napi-rs/canvas'
import sharp from 'sharp'

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
// 🚀 COMANDO PRINCIPAL
// ============================================================

const handler = async (m, { conn, text = '' }) => {

    if (!m.isGroup) return

    const sender = m.sender

    if (processing.has(sender)) return

    if (processing.size >= MAX_CONCURRENT) {
        return m.reply('⏳ Esperá un momento.')
    }

    let quoteText = ''
    let quoteSender = ''
    let quoteName = ''

    // ========================================================
    // 📝 TEXTO ESCRITO
    // ========================================================

    if (String(text || '').trim()) {

        quoteText = String(text).trim()
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
            ''
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
            '💬 *QUOTE STICKER*\n\n' +
            '• .qc Hola mundo\n' +
            '• Respondé a un mensaje con .qc'
        )

    }

    if (!quoteSender) {
        return m.reply(
            '❌ No se pudo identificar al autor del mensaje.'
        )
    }

    if (Array.from(quoteText).length > MAX_LENGTH) {

        return m.reply(
            `⚠️ Máximo ${MAX_LENGTH} caracteres.`
        )

    }

    processing.add(sender)

    try {

        await react(conn, m, '💬')

        // ====================================================
        // 👤 IDENTIFICAR USUARIO
        // ====================================================

        if (typeof conn.decodeJid === 'function') {

            quoteSender =
                conn.decodeJid(quoteSender) ||
                quoteSender

        }

        const candidates = new Set([quoteSender])

        // Compatibilidad con números normales y LID.

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

                    if (typeof id === 'string' && id.includes('@')) {
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
        // 📛 NOMBRE DEL USUARIO
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
        // 🖼️ FOTO DE PERFIL
        // ====================================================

        let avatar = null

        for (const id of candidates) {

            try {

                const url = await conn.profilePictureUrl(
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

        if (!avatar) {
            console.log('[QC] Usando avatar alternativo.')
        }

        // ====================================================
        // 🎨 GENERAR STICKER
        // ====================================================

        const png = generateQuote({
            name: quoteName,
            text: quoteText,
            avatar,
            jid: quoteSender
        })

        // Conversión directa a WebP.
        // Sin lib/sticker.js ni doble redimensionamiento.

        let webp

        for (const quality of [95, 85, 70, 50, 30]) {

            webp = await sharp(png)
                .webp({
                    quality,
                    alphaQuality: 100,
                    effort: 6
                })
                .toBuffer()

            if (webp.length <= 100 * 1024) break

        }

        if (!webp?.length) {
            throw new Error('WebP vacío.')
        }

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
            '[QC] Sticker enviado:',
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
// 🎨 GENERADOR DE IMAGEN
// ============================================================

function generateQuote({ name, text, avatar, jid }) {

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
    // 📐 AJUSTAR TAMAÑO DEL TEXTO
    // ========================================================

    while (fontSize >= 10) {

        ctx.font = `${fontSize}px sans-serif`

        lines = wrapText(
            ctx,
            text,
            MAX_TEXT_WIDTH
        )

        lineHeight = Math.ceil(fontSize * 1.25)

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

    ctx.font = `${fontSize}px sans-serif`

    const longestLine = Math.max(
        ...lines.map(
            line => ctx.measureText(line).width
        ),
        0
    )

    // ========================================================
    // 📛 AJUSTAR NOMBRE
    // ========================================================

    ctx.font = 'bold 27px sans-serif'

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
    // 📍 CENTRAR TODO EL STICKER
    // ========================================================

    const totalWidth =
        AVATAR + GAP + bubbleWidth

    const totalHeight =
        Math.max(AVATAR, bubbleHeight)

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
    // 💬 BURBUJA OSCURA
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

    // Punta de la burbuja.

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

        // Avatar genérico local.

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
    // 📛 NOMBRE
    // ========================================================

    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    ctx.font = 'bold 27px sans-serif'
    ctx.fillStyle = color

    ctx.fillText(
        displayName,
        bubbleX + PADDING,
        bubbleY + 16
    )

    // ========================================================
    // 📝 MENSAJE
    // ========================================================

    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = '#FFFFFF'

    let y = bubbleY + 56

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
// 📝 DIVIDIR TEXTO SIN CORTAR PALABRAS
// ============================================================

function wrapText(ctx, text, maxWidth) {

    const lines = []

    const segmenter = new Intl.Segmenter(
        'es',
        { granularity: 'grapheme' }
    )

    for (const paragraph of String(text)
        .replace(/\r/g, '')
        .split('\n')) {

        if (!paragraph.trim()) {

            lines.push('')
            continue

        }

        let line = ''

        for (const word of paragraph.trim().split(/\s+/)) {

            const test = line
                ? `${line} ${word}`
                : word

            if (ctx.measureText(test).width <= maxWidth) {

                line = test
                continue

            }

            if (line) {

                lines.push(line)
                line = ''

            }

            if (ctx.measureText(word).width <= maxWidth) {

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
// ✂️ NOMBRES LARGOS
// ============================================================

function truncateText(ctx, text, maxWidth) {

    const chars = Array.from(String(text))

    if (ctx.measureText(chars.join('')).width <= maxWidth) {
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
// 🎨 COLOR DEL NOMBRE
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
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
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
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = ['qc <texto>', 'qc']

handler.tags = ['sticker']

handler.command = /^(qc|quote|quotesticker)$/i

handler.group = true
handler.register = false
handler.limit = false

export default handler
