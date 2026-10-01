// 📂 plugins/_qc.js
// 💬 Generador de stickers de citas — FelixCat Bot

import { sticker } from "../lib/sticker.js"
import axios from "axios"

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
      quoteSender = m.quoted.sender

      quoteName =
        m.quoted.pushName ||
        m.quoted.name ||
        `@${quoteSender.split("@")[0]}`

    } else if (text?.trim()) {
      quoteText = text.trim()
      quoteSender = m.sender

      quoteName =
        m.pushName ||
        `@${m.sender.split("@")[0]}`
    }

    // ============================================================
    // ❌ SIN TEXTO
    // ============================================================

    if (!quoteText) {
      return conn.sendMessage(
        m.chat,
        {
          text:
`💬 *STICKER DE CITA*

📝 Escribí un texto o respondé a un mensaje.

📌 *Ejemplos:*
• .qc Hola mundo
• Respondé un mensaje con *.qc*`
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

📏 Máximo permitido: *310 caracteres.*
📝 Tu texto tiene: *${quoteText.length} caracteres.*`
        },
        { quoted: m }
      )
    }

    // ============================================================
    // 🖼️ FOTO DE PERFIL
    // ============================================================

    const defaultPP =
      "https://i.ibb.co/dyk5QdQ/1212121212121212.png"

    const pp = await conn
      .profilePictureUrl(quoteSender, "image")
      .catch(() => defaultPP)

    // ============================================================
    // 🎨 CONFIGURACIÓN DE LA CITA
    // ============================================================

    const obj = {
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
    // 🌐 GENERAR IMAGEN
    // ============================================================

    const response = await axios.post(
      "https://bot.lyo.su/quote/generate",
      obj,
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    )

    if (
      !response.data ||
      !response.data.result ||
      !response.data.result.image
    ) {
      throw new Error("La API no devolvió la imagen.")
    }

    // ============================================================
    // 🖼️ CONVERTIR BASE64
    // ============================================================

    const buffer = Buffer.from(
      response.data.result.image,
      "base64"
    )

    // ============================================================
    // 🎟️ CREAR STICKER
    // ============================================================

    const stickerBuffer = await sticker(
      buffer,
      false
    )

    if (!stickerBuffer) {
      throw new Error("No se pudo generar el sticker.")
    }

    // ============================================================
    // 📤 ENVIAR STICKER
    // ============================================================

    await conn.sendMessage(
      m.chat,
      {
        sticker: stickerBuffer
      },
      { quoted: m }
    )

  } catch (error) {

    console.error(
      "❌ Error en plugin QC:",
      error
    )

    return conn.sendMessage(
      m.chat,
      {
        text:
`❌ *No se pudo generar el sticker.*

🔧 Puede que el servicio de generación esté temporalmente caído.

💡 Intentá nuevamente en unos segundos.`
      },
      { quoted: m }
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  "qc <texto>",
  "qc respondiendo un mensaje"
]

handler.tags = [
  "sticker"
]

handler.command = [
  "qc"
]

handler.limit = false

export default handler
