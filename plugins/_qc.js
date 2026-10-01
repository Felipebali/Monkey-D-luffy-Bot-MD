// 📂 plugins/_qc.js
// 💬 Generador de stickers de citas

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
      quoteName = m.quoted.pushName || m.quoted.name || quoteSender.split("@")[0]
    } else if (text?.trim()) {
      quoteText = text.trim()
      quoteSender = m.sender
      quoteName = m.pushName || m.name || quoteSender.split("@")[0]
    } else {
      return conn.sendMessage(
        m.chat,
        {
          text: "❌ Debes escribir un texto o responder a un mensaje.\n\n💡 Ejemplo:\n.qc Hola mundo"
        },
        { quoted: m }
      )
    }

    // ============================================================
    // 📏 LÍMITE DE TEXTO
    // ============================================================

    if (quoteText.length > 310) {
      return conn.sendMessage(
        m.chat,
        {
          text: "❌ El texto es demasiado largo.\n\n📏 Máximo permitido: *310 caracteres*."
        },
        { quoted: m }
      )
    }

    // ============================================================
    // 🖼️ FOTO DE PERFIL
    // ============================================================

    const pp = await conn
      .profilePictureUrl(quoteSender, "image")
      .catch(() =>
        "https://i.ibb.co/dyk5QdQ/1212121212121212.png"
      )

    // ============================================================
    // 🎨 CONFIGURACIÓN DEL QUOTE
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
    // 🚀 GENERAR IMAGEN
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

    if (!response.data?.result?.image) {
      throw new Error("La API no devolvió ninguna imagen.")
    }

    // ============================================================
    // 🧩 CONVERTIR A STICKER
    // ============================================================

    const buffer = Buffer.from(
      response.data.result.image,
      "base64"
    )

    const stiker = await sticker(buffer, false)

    if (!stiker) {
      throw new Error("No se pudo convertir la imagen a sticker.")
    }

    // ============================================================
    // 📤 ENVIAR STICKER
    // ============================================================

    await conn.sendMessage(
      m.chat,
      {
        sticker: stiker
      },
      { quoted: m }
    )

  } catch (error) {
    console.error("❌ Error en .qc:", error)

    await conn.sendMessage(
      m.chat,
      {
        text:
          "❌ *No se pudo generar el sticker.*\n\n" +
          "🔄 Intenta nuevamente en unos segundos."
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

export default handler
