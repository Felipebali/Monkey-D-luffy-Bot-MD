
/**
 * 📂 plugins/_HD.js
 * 🤖 whatsapp-bot — MEJORADOR HD
 *
 * 🖼️ Procesamiento local con Sharp
 * 🔍 Resolución x2 y x4
 * ✨ Mejora de nitidez y contraste
 * 🚫 Sin APIs externas
 * 🚫 Sin Python
 * 👥 Solo grupos
 * 🔇 Sin spam
 */

import sharp from 'sharp'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const MAX_SIZE = 4096
const MAX_FILE_SIZE = 15 * 1024 * 1024
const MAX_CONCURRENT = 2

const processing = new Set()

// ============================================================
// 🚀 HANDLER
// ============================================================

const handler = async (m, {
    conn,
    args = []
}) => {

    if (!m.isGroup) return

    if (processing.has(m.sender)) return

    if (processing.size >= MAX_CONCURRENT) {
        return m.reply('⏳ Intentá nuevamente en un momento.')
    }

    const quoted = m.quoted || m

    const mime = String(
        quoted.mimetype ||
        quoted.msg?.mimetype ||
        quoted.mediaType ||
        ''
    )

    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mime)) {

        return m.reply(
            '🖼️ Respondé a una imagen con:\n\n' +
            '• .hd — Mejorar x2\n' +
            '• .hd 4 — Mejorar x4'
        )

    }

    const scale = ['4', 'x4'].includes(
        String(args[0] || '').toLowerCase()
    ) ? 4 : 2

    processing.add(m.sender)

    try {

        // ====================================================
        // 📥 DESCARGAR IMAGEN
        // ====================================================

        const downloaded = await quoted.download()

        if (!downloaded?.length) {
            throw new Error('Imagen vacía.')
        }

        const buffer = Buffer.from(downloaded)

        if (buffer.length > MAX_FILE_SIZE) {
            return m.reply('⚠️ Máximo 15 MB por imagen.')
        }

        // ====================================================
        // 🔎 LEER DIMENSIONES
        // ====================================================

        const metadata = await sharp(buffer, {
            limitInputPixels: 25000000
        }).metadata()

        if (!metadata.width || !metadata.height) {
            throw new Error('Dimensiones inválidas.')
        }

        const rotated = [5, 6, 7, 8].includes(
            metadata.orientation
        )

        const originalWidth = rotated
            ? metadata.height
            : metadata.width

        const originalHeight = rotated
            ? metadata.width
            : metadata.height

        // ====================================================
        // 📐 CALCULAR NUEVA RESOLUCIÓN
        // ====================================================

        const factor = Math.min(
            scale,
            MAX_SIZE / originalWidth,
            MAX_SIZE / originalHeight
        )

        const width = Math.max(
            1,
            Math.round(originalWidth * factor)
        )

        const height = Math.max(
            1,
            Math.round(originalHeight * factor)
        )

        // ====================================================
        // ✨ MEJORAR IMAGEN LOCALMENTE
        // ====================================================

        const result = await sharp(buffer, {
            limitInputPixels: 25000000
        })

            // Corregir orientación.
            .rotate()

            // Aumentar resolución.
            .resize(width, height, {
                fit: 'fill',
                kernel: sharp.kernel.lanczos3
            })

            // Mejorar contraste local.
            .clahe({
                width: 8,
                height: 8,
                maxSlope: 2
            })

            // Mejorar colores.
            .modulate({
                brightness: 1.02,
                saturation: 1.06
            })

            // Mejorar nitidez.
            .sharpen({
                sigma: 1.2,
                m1: 0.5,
                m2: 1.5
            })

            // Fondo para imágenes transparentes.
            .flatten({
                background: '#FFFFFF'
            })

            // Exportar en alta calidad.
            .jpeg({
                quality: 95,
                mozjpeg: true,
                chromaSubsampling: '4:4:4'
            })

            .toBuffer()

        if (!result?.length) {
            throw new Error('Resultado vacío.')
        }

        // ====================================================
        // 📤 ENVIAR RESULTADO
        // ====================================================

        await conn.sendMessage(
            m.chat,
            {
                image: result,
                mimetype: 'image/jpeg',

                caption: `╭━━〔 ✨ *MEJORADOR HD* 〕━━╮
┃
┃ 🖼️ Imagen procesada
┃ 📥 Original: ${originalWidth} × ${originalHeight}
┃ 📤 Resultado: ${width} × ${height}
┃ 🔍 Escala: ×${factor.toFixed(1)}
┃ ✨ Nitidez optimizada
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
            },
            {
                quoted: m
            }
        )

        console.log(
            `[HD] Procesado: ${originalWidth}x${originalHeight} → ${width}x${height}`
        )

    } catch (error) {

        console.error('[HD] ERROR:', error)

        await m.reply(
            '❌ No se pudo mejorar la imagen.'
        )

    } finally {

        processing.delete(m.sender)

    }

}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL COMANDO
// ============================================================

handler.help = [
    'hd',
    'hd 4',
    'remini',
    'enhance'
]

handler.tags = ['tools']

handler.command =
    /^(hd|remini|enhance|mejorar|upscale)$/i

handler.group = true
handler.register = false
handler.limit = false

export default handler
