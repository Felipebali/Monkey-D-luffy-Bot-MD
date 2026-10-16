
// 📂 plugins/_qc.js
// 💬 whatsapp-bot — Generador de stickers QC
// ============================================================
// .qc <texto>  → Sticker con el texto escrito
// .qc          → Sticker con el mensaje citado
// ============================================================

import { sticker } from '../lib/sticker.js'
import axios from 'axios'

const API_URL = 'https://quote.yuri.ly/quote/generate.png'
const MAX_LENGTH = 310

// ============================================================
// 🎲 AVATARES ALTERNATIVOS
// ============================================================

const DEFAULT_AVATARS = [
    'https://api.dicebear.com/9.x/bottts/png?seed=Felix',
    'https://api.dicebear.com/9.x/adventurer/png?seed=Shadow',
    'https://api.dicebear.com/9.x/thumbs/png?seed=Random',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Sticker',
    'https://api.dicebear.com/9.x/big-smile/png?seed=WhatsApp'
]

function getRandomAvatar() {
    return DEFAULT_AVATARS[
        Math.floor(Math.random() * DEFAULT_AVATARS.length)
    ]
}

// ============================================================
// 🧩 COMANDO QC
// ============================================================

let handler = async (m, { conn, text }) => {
    try {
        let quoteText = ''
        let quoteSender = ''
        let quoteName = ''

        // ----------------------------------------------------
        // 📝 OBTENER TEXTO CITADO O ESCRITO
        // ----------------------------------------------------

        if (m.quoted) {
            quoteText = String(
                m.quoted.text ||
                m.quoted.caption ||
                m.quoted.msg?.text ||
                m.quoted.msg?.caption ||
                ''
            ).trim()

            quoteSender = conn.decodeJid(
                m.quoted.sender || m.sender
            )

            quoteName =
                m.quoted.pushName ||
                m.quoted.name ||
                quoteSender.split('@')[0]

            // Si el mensaje citado no contiene texto,
            // usar el texto que se escribió después de .qc.
            if (!quoteText && text?.trim()) {
                quoteText = text.trim()
                quoteSender = conn.decodeJid(m.sender)

                quoteName =
                    m.pushName ||
                    m.name ||
                    quoteSender.split('@')[0]
            }
        } else if (text?.trim()) {
            quoteText = text.trim()
            quoteSender = conn.decodeJid(m.sender)

            quoteName =
                m.pushName ||
                m.name ||
                quoteSender.split('@')[0]
        }

        if (!quoteText) {
            return m.reply(
                '╭━━━〔 💬 *STICKER QC* 〕━━━╮\n' +
                '┃\n' +
                '┃ ❌ Falta el texto.\n' +
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

        if (quoteText.length > MAX_LENGTH) {
            return m.reply(
                `⚠️ *Texto demasiado largo.*\n\n` +
                `📏 Máximo: *${MAX_LENGTH} caracteres*\n` +
                `📝 Tu texto: *${quoteText.length} caracteres*`
            )
        }

        await m.react('💬')

        // ----------------------------------------------------
        // 🖼️ OBTENER FOTO DE PERFIL
        // ----------------------------------------------------

        let pp = null

        try {
            pp = await conn.profilePictureUrl(
                quoteSender,
                'image'
            )
        } catch (error) {
            console.log(
                '[QC] Sin foto de perfil; usando avatar aleatorio.'
            )
        }

        // Si no tiene foto o no se pudo obtener,
        // elegir un avatar aleatorio.
        if (!pp) {
            pp = getRandomAvatar()
        }

        // ----------------------------------------------------
        // 🎨 DATOS PARA LA API
        // ----------------------------------------------------

        const data = {
            type: 'quote',
            format: 'png',
            backgroundColor: '#000000',
            width: 512,
            height: 768,
            scale: 2,
            messages: [
                {
                    entities: [],
                    avatar: true,
                    from: {
                        id: 1,
                        name: quoteName,
                        photo: {
                            url: pp
                        }
                    },
                    text: quoteText,
                    replyMessage: {}
                }
            ]
        }

        // ----------------------------------------------------
        // 🚀 GENERAR IMAGEN
        // ----------------------------------------------------

        let response

        try {
            response = await axios.post(
                API_URL,
                data,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'whatsapp-bot/1.0'
                    },
                    responseType: 'arraybuffer',
                    timeout: 45000,
                    validateStatus: () => true
                }
            )
        } catch (error) {
            console.error(
                '[QC] Error de conexión:',
                error.message
            )

            await m.react('⚠️')

            return m.reply(
                '⚠️ *No se pudo conectar con el generador QC.*\n\n' +
                'La API no respondió. Intentá nuevamente más tarde.'
            )
        }

        // ----------------------------------------------------
        // 🚨 COMPROBAR RESPUESTA HTTP
        // ----------------------------------------------------

        if (response.status < 200 || response.status >= 300) {
            const errorBody = Buffer.isBuffer(response.data)
                ? response.data.toString('utf8')
                : String(response.data || '')

            console.error(
                `[QC] HTTP ${response.status}:`,
                errorBody.slice(0, 1500)
            )

            await m.react('⚠️')

            if ([400, 404, 405].includes(response.status)) {
                return m.reply(
                    `❌ *El generador QC rechazó la petición.*\n\n` +
                    `📡 HTTP: ${response.status}\n` +
                    'La ruta o el formato de la petición pueden no ser compatibles.'
                )
            }

            if ([502, 503, 504].includes(response.status)) {
                return m.reply(
                    `⚠️ *El generador está temporalmente fuera de servicio.*\n\n` +
                    `📡 HTTP: ${response.status}\n` +
                    'Esperá un momento y volvé a intentarlo.'
                )
            }

            return m.reply(
                `❌ No se pudo generar el sticker QC.\n` +
                `📡 Código HTTP: ${response.status}`
            )
        }

        // ----------------------------------------------------
        // 🧩 VALIDAR IMAGEN
        // ----------------------------------------------------

        const contentType = String(
            response.headers?.['content-type'] || ''
        ).toLowerCase()

        const responseBuffer = Buffer.from(response.data)

        if (!responseBuffer.length) {
            throw new Error('El generador devolvió una respuesta vacía.')
        }

        let buffer

        // Si el servidor devuelve PNG/JPEG/WebP, usar los bytes.
        if (
            contentType.includes('image/') ||
            responseBuffer.subarray(0, 8).equals(
                Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
            ) ||
            responseBuffer.subarray(0, 3).toString() === 'FFD'
        ) {
            buffer = responseBuffer
        } else {
            // Algunas instancias devuelven JSON con la imagen.
            let result

            try {
                result = JSON.parse(responseBuffer.toString('utf8'))
            } catch {
                throw new Error(
                    `Respuesta inesperada del generador: ${contentType || 'tipo desconocido'}`
                )
            }

            const imageData =
                result?.result?.image ||
                result?.image

            if (
                typeof imageData !== 'string' ||
                !imageData.length
            ) {
                throw new Error(
                    result?.error?.message ||
                    'La API no devolvió una imagen válida.'
                )
            }

            const cleanBase64 = imageData.replace(
                /^data:image\/[^;]+;base64,/i,
                ''
            )

            buffer = Buffer.from(cleanBase64, 'base64')
        }

        if (!buffer?.length) {
            throw new Error('La imagen recibida está vacía.')
        }

        // ----------------------------------------------------
        // 🎨 CONVERTIR IMAGEN A STICKER
        // ----------------------------------------------------

        const stiker = await sticker(
            buffer,
            false,
            global.packname || 'whatsapp-bot',
            global.author || ''
        )

        if (!stiker) {
            throw new Error(
                'No se pudo convertir la imagen en sticker.'
            )
        }

        // ----------------------------------------------------
        // 📤 ENVIAR STICKER
        // ----------------------------------------------------

        await conn.sendMessage(
            m.chat,
            {
                sticker: stiker
            },
            {
                quoted: m
            }
        )

        await m.react('✅')

    } catch (error) {
        console.error('[QC] Error:', error)

        try {
            await m.react('❌')
        } catch {}

        return m.reply(
            '❌ *Ocurrió un error generando el sticker QC.*\n\n' +
            'Revisá la consola para ver los detalles.'
        )
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
    'qc <texto>',
    'qc respondiendo a un mensaje'
]

handler.tags = ['sticker']
handler.command = ['qc']
handler.limit = false

export default handler
