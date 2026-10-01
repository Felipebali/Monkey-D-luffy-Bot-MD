// 📂 plugins/_qc.js
// 💬 Generador de stickers de citas

import { sticker } from "../lib/sticker.js"
import axios from "axios"

const API_URL = "https://bot.lyo.su/quote/generate"

let handler = async (m, { conn, text }) => {
  try {

    // ============================================================
    // 📝 OBTENER TEXTO
    // ============================================================

    let quoteText = ""
    let quoteSender = ""
    let quoteName = ""

    if (m.quoted?.text) {
      quoteText = m.quoted.text.trim()
      quoteSender = conn.decodeJid(m.quoted.sender)
      quoteName =
        m.quoted.pushName ||
        m.quoted.name ||
        quoteSender.split("@")[0]

    } else if (text?.trim()) {
      quoteText = text.trim()
      quoteSender = conn.decodeJid(m.sender)
      quoteName =
        m.pushName ||
        m.name ||
        quoteSender.split("@")[0]

    } else {

      return conn.sendMessage(
        m.chat,
        {
          text:
`╭━━━〔 💬 *STICKER QC* 〕━━━╮
┃
┃ ❌ *Falta el texto.*
┃
┃ 📌 Escribe:
┃ • .qc <texto>
┃
┃ 📌 O responde a un mensaje:
┃ • .qc
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
        },
        { quoted: m }
      )
    }

    // ============================================================
    // 📏 LÍMITE
    // ============================================================

    if (quoteText.length > 310) {

      return conn.sendMessage(
        m.chat,
        {
          text:
`⚠️ *Texto demasiado largo.*

📏 Máximo permitido: *310 caracteres*
📝 Tu texto: *${quoteText.length} caracteres*`
        },
        { quoted: m }
      )
    }

    await m.react("💬")

    // ============================================================
    // 🖼️ FOTO DE PERFIL
    // ============================================================

    const pp = await conn
      .profilePictureUrl(quoteSender, "image")
      .catch(() =>
        "https://i.ibb.co/dyk5QdQ/1212121212121212.png"
      )

    // ============================================================
    // 🎨 DATOS PARA LA API
    // ============================================================

    const data = {
      type: "quote",
      format: "png",
      backgroundColor: "#000000",
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

    // ============================================================
    // 🚀 GENERAR QUOTE
    // ============================================================

    let response

    try {

      response = await axios.post(
        API_URL,
        data,
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "FelixCat-Bot/1.0"
          },

          timeout: 30000,

          validateStatus: () => true
        }
      )

    } catch (error) {

      console.error(
        "❌ Error conectando con API QC:",
        error.message
      )

      await m.react("⚠️")

      return conn.sendMessage(
        m.chat,
        {
          text:
`⚠️ *No se pudo conectar con el generador QC.*

🌐 La API no respondió correctamente.

🔄 Intenta nuevamente en unos segundos.`
        },
        { quoted: m }
      )
    }

    // ============================================================
    // 🚨 ERROR 502 / 5XX
    // ============================================================

    if (response.status >= 500) {

      console.error(
        `❌ API QC respondió HTTP ${response.status}`
      )

      await m.react("⚠️")

      return conn.sendMessage(
        m.chat,
        {
          text:
`⚠️ *El generador de stickers está temporalmente fuera de servicio.*

🌐 Servidor: *bot.lyo.su*
📡 Estado: *HTTP ${response.status}*

🔄 Espera unos segundos y vuelve a intentarlo.`
        },
        { quoted: m }
      )
    }

    // ============================================================
    // ❌ OTROS ERRORES
    // ============================================================

    if (response.status !== 200) {

      console.error(
        "❌ Respuesta inesperada:",
        response.status,
        response.data
      )

      await m.react("⚠️")

      return conn.sendMessage(
        m.chat,
        {
          text:
`❌ *No se pudo generar el sticker.*

📡 Código HTTP: *${response.status}*`
        },
        { quoted: m }
      )
    }

    // ============================================================
    // 🧩 COMPROBAR RESPUESTA
    // ============================================================

    const imageBase64 =
      response.data?.result?.image

    if (!imageBase64) {

      console.error(
        "❌ La API no devolvió la imagen:",
        response.data
      )

      await m.react("⚠️")

      return conn.sendMessage(
        m.chat,
        {
          text:
`❌ *La API respondió, pero no devolvió la imagen.*

🔄 Intenta nuevamente.`
        },
        { quoted: m }
      )
    }

    // ============================================================
    // 🖼️ BASE64 → BUFFER
    // ============================================================

    const buffer = Buffer.from(
      imageBase64,
      "base64"
    )

    if (!buffer.length) {
      throw new Error(
        "La imagen recibida está vacía."
      )
    }

    // ============================================================
    // 🎨 CONVERTIR A STICKER
    // ============================================================

    const stiker = await sticker(
      buffer,
      false
    )

    if (!stiker) {
      throw new Error(
        "No se pudo convertir la imagen en sticker."
      )
    }

    // ============================================================
    // 📤 ENVIAR
    // ============================================================

    await conn.sendMessage(
      m.chat,
      {
        sticker: stiker
      },
      {
        quoted: m
      }
    )

    await m.react("✅")

  } catch (error) {

    console.error(
      "❌ Error en .qc:",
      error
    )

    try {
      await m.react("❌")
    } catch {}

    await conn.sendMessage(
      m.chat,
      {
        text:
`❌ *Ocurrió un error generando el sticker QC.*

🔄 Intenta nuevamente más tarde.`
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

handler.help = [
  "qc <texto>",
  "qc respondiendo mensaje"
]

handler.tags = [
  "sticker"
]

handler.command = [
  "qc"
]

handler.limit = false

export default handler
