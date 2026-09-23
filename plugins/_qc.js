// 📂 plugins/qc.js — FelixCat_Bot 💬

import { sticker } from '../lib/sticker.js'
import axios from 'axios'

let handler = async (m, { conn, text }) => {
  try {

    // ============================================================
    // 📝 TEXTO
    // ============================================================

    let frase = text?.trim()

    if (!frase && m.quoted?.text) {
      frase = m.quoted.text.trim()
    }

    if (!frase) {
      return conn.sendMessage(
        m.chat,
        {
          text: '❌ Escribí un texto o citá un mensaje para crear el sticker.'
        },
        { quoted: m }
      )
    }

    // ============================================================
    // 🔢 LÍMITE
    // ============================================================

    if (frase.length > 50) {
      return conn.sendMessage(
        m.chat,
        {
          text: '❌ El texto no puede superar los 50 caracteres.'
        },
        { quoted: m }
      )
    }

    // ============================================================
    // 👤 USUARIO
    // ============================================================

    const userJid = m.quoted?.sender || m.sender

    let nombre =
      m.quoted?.name ||
      m.pushName ||
      m.name ||
      'Usuario'

    nombre = String(nombre).substring(0, 50)

    // ============================================================
    // 🖼️ FOTO
    // ============================================================

    let pp = 'https://i.ibb.co/dyk5QdQ/1212121212121212.png'

    try {

      if (conn.profilePictureUrl) {

        const url = await conn.profilePictureUrl(
          userJid,
          'image'
        )

        if (
          typeof url === 'string' &&
          url.startsWith('http')
        ) {
          pp = url
        }
      }

    } catch {
      console.log('[QC] Foto de perfil no disponible.')
    }

    // ============================================================
    // 📦 PAYLOAD
    // ============================================================

    const payload = {
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
            name: nombre,

            photo: {
              url: pp
            }
          },

          text: frase,

          replyMessage: {}
        }
      ]
    }

    // ============================================================
    // 🌐 API
    // ============================================================

    const response = await axios.post(
      'https://quote.yuri.ly/quote/generate',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FelixCat-Bot'
        },

        timeout: 30000,

        maxContentLength: 15 * 1024 * 1024,
        maxBodyLength: 15 * 1024 * 1024
      }
    )

    // ============================================================
    // 🔍 RESPUESTA
    // ============================================================

    const data = response?.data

    console.log('[QC] Respuesta API:', {
      ok: data?.ok,
      type: data?.type,
      ext: data?.ext,
      hasImage: !!data?.image,
      hasResultImage: !!data?.result?.image
    })

    // La API actual devuelve image directamente.
    // Compatibilidad con APIs antiguas: result.image
    const image =
      data?.image ||
      data?.result?.image

    if (!image) {

      console.error(
        '[QC] Respuesta completa:',
        data
      )

      throw new Error(
        'La API no devolvió una imagen.'
      )
    }

    // ============================================================
    // 🖼️ BASE64 → BUFFER
    // ============================================================

    let buffer

    if (Buffer.isBuffer(image)) {

      buffer = image

    } else if (typeof image === 'string') {

      // Por si viene como data:image/png;base64,...
      const base64 = image.includes(',')
        ? image.split(',').pop()
        : image

      buffer = Buffer.from(
        base64,
        'base64'
      )

    } else {

      throw new Error(
        'Formato de imagen desconocido.'
      )
    }

    if (!buffer?.length) {
      throw new Error(
        'El buffer generado está vacío.'
      )
    }

    console.log(
      `[QC] Imagen recibida: ${buffer.length} bytes`
    )

    // ============================================================
    // 🏷️ CONVERTIR A STICKER
    // ============================================================

    const stiker = await sticker(
      buffer,
      false
    )

    if (!stiker) {
      throw new Error(
        'La función sticker() no devolvió datos.'
      )
    }

    // ============================================================
    // 📤 ENVIAR
    // ============================================================

    return await conn.sendMessage(
      m.chat,
      {
        sticker: stiker
      },
      {
        quoted: m
      }
    )

  } catch (e) {

    console.error(
      '❌ QC ERROR:',
      e?.response?.data || e
    )

    return conn.sendMessage(
      m.chat,
      {
        text:
          '⚠️ *No se pudo generar el sticker.*\n\n' +
          '🔄 La API de citas puede estar temporalmente caída. ' +
          'Probá nuevamente en unos minutos.'
      },
      {
        quoted: m
      }
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = ['qc']

handler.help = [
  'qc <texto>'
]

handler.tags = [
  'sticker'
]

handler.group = false
handler.botAdmin = false

export default handler
