
// 📂 plugins/_qc.js
// 💬 whatsapp-bot — Generador de stickers de citas

import { sticker } from '../lib/sticker.js'
import axios from 'axios'

const API_URL = 'https://quote.yuri.ly/quote/generate'
const DEFAULT_AVATAR = 'https://i.ibb.co/dyk5QdQ/1212121212121212.png'
const MAX_LENGTH = 310

let handler = async (m, { conn, text }) => {
  try {
    let quoteText = ''
    let quoteSender = ''
    let quoteName = ''

    // Obtener texto citado o escrito
    if (m.quoted) {
      quoteText = String(
        m.quoted.text ||
        m.quoted.caption ||
        m.quoted.msg?.text ||
        m.quoted.msg?.caption ||
        ''
      ).trim()

      quoteSender = conn.decodeJid(m.quoted.sender || m.sender)
      quoteName =
        m.quoted.pushName ||
        m.quoted.name ||
        quoteSender.split('@')[0]

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
        '💬 *STICKER QC*\n\n' +
        '• `.qc Hola mundo`\n' +
        '• Respondé a un mensaje de texto con `.qc`'
      )
    }

    if (quoteText.length > MAX_LENGTH) {
      return m.reply(
        `⚠️ Texto demasiado largo.\n\n` +
        `Máximo: *${MAX_LENGTH} caracteres*\n` +
        `Tu texto: *${quoteText.length} caracteres*`
      )
    }

    await m.react('💬')

    // Foto de perfil
    let pp = DEFAULT_AVATAR

    try {
      pp = await conn.profilePictureUrl(quoteSender, 'image') || DEFAULT_AVATAR
    } catch {}

    // Datos para el generador
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
            photo: { url: pp }
          },
          text: quoteText,
          replyMessage: {}
        }
      ]
    }

    // Solicitar imagen
    let response

    try {
      response = await axios.post(API_URL, data, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'whatsapp-bot/1.0'
        },
        timeout: 45000,
        validateStatus: () => true
      })
    } catch (error) {
      console.error('[QC] Error de conexión:', error.message)
      await m.react('⚠️')
      return m.reply(
        '⚠️ No se pudo conectar con el generador QC. Intentá nuevamente más tarde.'
      )
    }

    if (response.status < 200 || response.status >= 300) {
      console.error(`[QC] HTTP ${response.status}:`, response.data)
      await m.react('⚠️')

      if (response.status === 502 || response.status === 503 || response.status === 504) {
        return m.reply(
          `⚠️ El servidor del generador está temporalmente fallando (HTTP ${response.status}).\n\n` +
          'Esperá un momento y volvé a intentarlo.'
        )
      }

      return m.reply(
        `❌ No se pudo generar el sticker QC.\nCódigo HTTP: ${response.status}`
      )
    }

    // La instancia alternativa devuelve response.data.image
    const imageData = response.data?.image

    if (response.data?.error || !imageData) {
      console.error('[QC] Respuesta sin imagen:', response.data)
      await m.react('⚠️')
      return m.reply('❌ El generador respondió, pero no devolvió una imagen válida.')
    }

    // Aceptar respuesta base64 o binaria
    let buffer

    if (Buffer.isBuffer(imageData)) {
      buffer = imageData
    } else if (typeof imageData === 'string') {
      const cleanBase64 = imageData.replace(/^data:image\/\w+;base64,/, '')
      buffer = Buffer.from(cleanBase64, 'base64')
    } else {
      throw new Error('Formato de imagen no reconocido.')
    }

    if (!buffer.length) {
      throw new Error('La imagen recibida está vacía.')
    }

    // Convertir imagen en sticker
    const stiker = await sticker(
      buffer,
      false,
      global.packname || 'whatsapp-bot',
      global.author || ''
    )

    if (!stiker) {
      throw new Error('No se pudo convertir la imagen en sticker.')
    }

    await conn.sendMessage(
      m.chat,
      { sticker: stiker },
      { quoted: m }
    )

    await m.react('✅')

  } catch (error) {
    console.error('[QC] Error:', error)

    try {
      await m.react('❌')
    } catch {}

    return m.reply(
      '❌ Ocurrió un error generando el sticker QC. Revisá la consola para ver los detalles.'
    )
  }
}

handler.help = ['qc <texto>', 'qc respondiendo a un mensaje']
handler.tags = ['sticker']
handler.command = ['qc']
handler.limit = false

export default handler
