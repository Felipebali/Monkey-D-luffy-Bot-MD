// 📂 plugins/qc.js — FelixCat_Bot 💬
import { sticker } from "../lib/sticker.js"
import axios from "axios"

let handler = async (m, { conn, text }) => {
  try {

    // ============================================================
    // 📝 OBTENER TEXTO
    // ============================================================

    let frase = text?.trim()

    // Si no hay texto, intentar obtener el texto del mensaje citado
    if (!frase && m.quoted?.text) {
      frase = m.quoted.text.trim()
    }

    if (!frase) {
      return conn.sendMessage(
        m.chat,
        {
          text: "❌ Escribí un texto o citá un mensaje para crear el sticker."
        },
        {
          quoted: m
        }
      )
    }

    // ============================================================
    // 🔢 LÍMITE DE CARACTERES
    // ============================================================

    if (frase.length > 50) {
      return conn.sendMessage(
        m.chat,
        {
          text: "❌ El texto no puede superar los 50 caracteres."
        },
        {
          quoted: m
        }
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
      "Usuario"

    // Evitar nombres demasiado largos
    nombre = String(nombre).substring(0, 50)

    // ============================================================
    // 🖼️ FOTO DE PERFIL
    // ============================================================

    let pp = "https://i.ibb.co/dyk5QdQ/1212121212121212.png"

    try {

      if (conn.profilePictureUrl) {

        const url = await conn.profilePictureUrl(
          userJid,
          "image"
        )

        if (typeof url === "string" && url.startsWith("http")) {
          pp = url
        }
      }

    } catch (e) {
      console.log("[QC] No se pudo obtener foto de perfil.")
    }

    // ============================================================
    // 📦 OBJETO PARA LA API
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
    // 🌐 GENERAR IMAGEN
    // ============================================================

    const response = await axios.post(
      "https://bot.lyo.su/quote/generate",
      obj,
      {
        headers: {
          "Content-Type": "application/json"
        },

        timeout: 15000,

        // Evita respuestas gigantes inesperadas
        maxContentLength: 10 * 1024 * 1024,
        maxBodyLength: 10 * 1024 * 1024
      }
    )

    // ============================================================
    // 🔍 COMPROBAR RESPUESTA
    // ============================================================

    const image = response?.data?.result?.image

    if (!image) {
      throw new Error("La API no devolvió ninguna imagen.")
    }

    // ============================================================
    // 🖼️ BASE64 → BUFFER
    // ============================================================

    const buffer = Buffer.from(image, "base64")

    if (!buffer || !buffer.length) {
      throw new Error("La imagen recibida está vacía.")
    }

    // ============================================================
    // 🏷️ CONVERTIR A STICKER
    // ============================================================

    const stiker = await sticker(buffer, false)

    if (!stiker) {
      throw new Error("No se pudo convertir la imagen en sticker.")
    }

    // ============================================================
    // 📤 ENVIAR STICKER
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

    console.error("❌ QC ERROR:", e)

    return conn.sendMessage(
      m.chat,
      {
        text:
          "⚠️ *El generador de stickers está temporalmente caído.*\n\n" +
          "🔄 Probá de nuevo en unos minutos."
      },
      {
        quoted: m
      }
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.command = ["qc"]

handler.help = [
  "qc <texto>"
]

handler.tags = [
  "sticker"
]

handler.group = false
handler.botAdmin = false

export default handler
