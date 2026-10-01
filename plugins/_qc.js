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

    // Si responde a un mensaje
    if (m.quoted?.text) {

      quoteText = m.quoted.text.trim()
      quoteSender = conn.decodeJid(m.quoted.sender)

      quoteName =
        m.quoted.pushName ||
        m.pushName ||
        quoteSender.split("@")[0] ||
        "Usuario"

    }

    // Si escribe directamente
    else if (text?.trim()) {

      quoteText = text.trim()
      quoteSender = conn.decodeJid(m.sender)

      quoteName =
        m.pushName ||
        quoteSender.split("@")[0] ||
        "Usuario"

    }

    // Sin texto
    else {

      return m.reply(
`╭━━━〔 💬 *QUOTE STICKER* 〕━━━╮
┃
┃ ❌ *Falta el texto.*
┃
┃ 📝 Escribe:
┃ .qc Hola mundo
┃
┃ 💬 O responde a un mensaje
┃ con *.qc*
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
      )
    }

    // ============================================================
    // 📏 LÍMITE
    // ============================================================

    if (quoteText.length > 310) {

      return m.reply(
`⚠️ *Texto demasiado largo*

📏 Máximo permitido: *310 caracteres*
📝 Caracteres actuales: *${quoteText.length}*`
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
    // 🎨 DATOS PARA LA API
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
    // ⏳ REACCIÓN
    // ============================================================

    try {
      await m.react("📝")
    } catch {}

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

    // ============================================================
    // 🔎 COMPROBAR RESPUESTA
    // ============================================================

    if (
      !response?.data?.result?.image
    ) {
      throw new Error(
        "La API no devolvió la imagen."
      )
    }

    // ============================================================
    // 🖼️ BASE64 → BUFFER
    // ============================================================

    const buffer = Buffer.from(
      response.data.result.image,
      "base64"
    )

    // ============================================================
    // 🎟️ CONVERTIR A STICKER
    // ============================================================

    const stiker = await sticker(
      buffer,
      false
    )

    if (!stiker) {
      throw new Error(
        "No se pudo convertir la imagen a sticker."
      )
    }

    // ============================================================
    // 📤 ENVIAR STICKER
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

    // ============================================================
    // ✅ REACCIÓN FINAL
    // ============================================================

    try {
      await m.react("✅")
    } catch {}

  } catch (error) {

    console.error(
      "❌ Error en plugin QC:",
      error
    )

    try {
      await m.react("❌")
    } catch {}

    return m.reply(
`╭━━━〔 ❌ *ERROR QC* 〕━━━╮
┃
┃ No se pudo generar
┃ el sticker.
┃
┃ 🔄 Intenta nuevamente
┃ en unos segundos.
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  "qc <texto>",
  "qc"
]

handler.tags = [
  "sticker"
]

handler.command = [
  "qc"
]

handler.group = false

export default handler
