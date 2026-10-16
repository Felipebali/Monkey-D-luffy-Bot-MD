// 📂 plugins/_qc.js
// 💬 whatsapp-bot — Generador de stickers QC
// ============================================================
// .qc <texto>  → Sticker con el texto escrito
// .qc          → Sticker con el mensaje de texto citado
// ============================================================

import { sticker } from '../lib/sticker.js'
import axios from 'axios'

const API_URL = 'https://bot.lyo.su/quote/generate'
const DEFAULT_AVATAR = 'https://i.ibb.co/dyk5QdQ/1212121212121212.png'
const MAX_LENGTH = 310

let handler = async (m, { conn, text }) => {
    try {
        let quoteText = ''
        let quoteSender = ''
        let quoteName = ''

        // ====================================================
        // 📝 OBTENER TEXTO CITADO O ESCRITO
        // ====================================================

        if (m.quoted) {
            quoteText =
                m.quoted.text ||
                m.quoted.caption ||
                m.quoted.msg?.text ||
                m.quoted.msg?.caption ||
                ''

            quoteText = String(quoteText).trim()

            quoteSender = conn.decodeJid(
                m.quoted.sender || m.sender
            )

            quoteName =
                m.quoted.pushName ||
                m.quoted.name ||
                quoteSender.split('@')[0]

            // Si el mensaje citado no tiene texto,
            // usar el texto escrito después de .qc.
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
            return conn.sendMessage(
                m.chat,
                {
                    text:
`╭━━━〔 💬 *STICKER QC* 〕━━━╮
┃
┃ ❌ Falta el texto.
┃
┃ 📝 Escribe:
┃ • .qc Hola mundo
┃
┃ 💬 O responde a un mensaje:
┃ • .qc
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
                },
                { quoted: m }
            )
        }

        if (quoteText.length > MAX_LENGTH) {
            return conn.sendMessage(
                m.chat,
                {
                    text:
`⚠️ *Texto demasiado largo.*

📏 Máximo: *${MAX_LENGTH} caracteres*
📝 Tu texto: *${quoteText.length} caracteres*`
                },
                { quoted: m }
            )
        }

        await m.react('💬')

        // ====================================================
        // 🖼️ FOTO DE PERFIL
        // ====================================================

        let pp = DEFAULT_AVATAR

        try {
            pp = await conn.profilePictureUrl(
                quoteSender,
                'image'
            ) || DEFAULT_AVATAR
        } catch {}

        // ====================================================
        // 🎨 DATOS PARA LA API
        // ====================================================

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

        // ====================================================
        // 🚀 GENERAR IMAGEN QC
        // ====================================================

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
                    timeout: 30000,
                    validateStatus: () => true
                }
            )
        } catch (error) {
            console.error(
                '[QC] Error de conexión:',
                error.message
            )

            await m.react('⚠️')

            return conn.sendMessage(
                m.chat,
                {
                    text:
`⚠️ *No se pudo conectar con el generador QC.*

🌐 La API no respondió.
🔄 Inténtalo nuevamente en unos segundos.`
                },
                { quoted: m }
            )
        }

        if (response.status !== 200) {
            console.error(
                `[QC] HTTP ${response.status}:`,
                response.data
            )

            await m.react('⚠️')

            return conn.sendMessage(
                m.chat,
                {
                    text:
`❌ *No se pudo generar el sticker QC.*

📡 Código HTTP: *${response.status}*
🔄 Inténtalo nuevamente más tarde.`
                },
                { quoted: m }
            )
        }

        // ====================================================
        // 🧩 VALIDAR IMAGEN RECIBIDA
        // ====================================================

        const imageBase64 = response.data?.result?.image

        if (
            typeof imageBase64 !== 'string' ||
            !imageBase64.length
        ) {
            console.error(
                '[QC] La API no devolvió una imagen:',
                response.data
            )

            await m.react('⚠️')

            return conn.sendMessage(
                m.chat,
                {
                    text:
`❌ *El generador no devolvió la imagen.*

🔄 Inténtalo nuevamente.`
                },
                { quoted: m }
            )
        }

        const buffer = Buffer.from(
            imageBase64,
            'base64'
        )

        if (!buffer.length) {
            throw new Error('La imagen recibida está vacía.')
        }

        // ====================================================
        // 🎨 CONVERTIR A STICKER
        // ====================================================

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

        await m.react('✅')

    } catch (error) {
        console.error('[QC] Error:', error)

        try {
            await m.react('❌')
        } catch {}

        return conn.sendMessage(
            m.chat,
            {
                text:
`❌ *Ocurrió un error generando el sticker QC.*

🔄 Inténtalo nuevamente más tarde.`
            },
            { quoted: m }
        )
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL COMANDO
// ============================================================

handler.help = [
    'qc <texto>',
    'qc respondiendo a un mensaje'
]

handler.tags = ['sticker']
handler.command = ['qc']
handler.limit = false

export default handler
