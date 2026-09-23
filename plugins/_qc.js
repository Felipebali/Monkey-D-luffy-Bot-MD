// 📂 plugins/qc.js — FelixCat_Bot 💬

import { sticker } from "../lib/sticker.js"
import axios from "axios"

let handler = async (m, { conn, text }) => {
  try {

    // ============================================================
    // 📝 OBTENER TEXTO
    // ============================================================

    let frase = text?.trim()

    if (!frase && m.quoted?.text) {
      frase = m.quoted.text.trim()
    }

    if (!frase) {
      return await conn.sendMessage(
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
      return await conn.sendMessage(
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

    nombre = String(nombre).substring(0, 50)

    // ============================================================
    // 🖼️ FOTO DE PERFIL
    // ============================================================

    let pp = "https://i.ibb.co/dyk5QdQ/1212121212121212.png"

    try {
      if (typeof conn.profilePictureUrl === "function") {

        const url = await conn.profilePictureUrl(
          userJid,
          "image"
        )

        if (
          typeof url === "string" &&
          url.startsWith("http")
        ) {
          pp = url
        }
      }
    } catch (e) {
      console.log(
        "[QC] Foto de perfil no disponible. Usando imagen predeterminada."
      )
    }

    // ============================================================
    // 📦 DATOS PARA LA API
    // ============================================================

    const payload = {
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

    console.log("[QC] Generando cita...")
    console.log("[QC] Usuario:", nombre)
    console.log("[QC] Texto:", frase)

    // ============================================================
    // 🌐 GENERAR IMAGEN
    // ============================================================

    const response = await axios.post(
      "https://quote.yuri.ly/quote/generate",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "FelixCat-Bot"
        },

        timeout: 30000,

        maxContentLength: 15 * 1024 * 1024,

        maxBodyLength: 15 * 1024 * 1024
      }
    )

    const data = response?.data

    // ============================================================
    // 🔍 MOSTRAR RESPUESTA DE LA API
    // ============================================================

    console.log("[QC] Respuesta API:", {
      ok: data?.ok,
      type: data?.type,
      ext: data?.ext,
      width: data?.width,
      height: data?.height,
      tieneImagen: !!data?.image,
      tieneResult: !!data?.result?.image
    })

    // ============================================================
    // 🖼️ OBTENER IMAGEN
    // ============================================================

    const image =
      data?.image ||
      data?.result?.image

    if (!image) {

      console.error(
        "[QC] Respuesta completa:",
        data
      )

      throw new Error(
        "La API no devolvió ninguna imagen."
      )
    }

    // ============================================================
    // 🔄 CONVERTIR BASE64 A BUFFER
    // ============================================================

    let buffer

    if (Buffer.isBuffer(image)) {

      buffer = image

    } else if (typeof image === "string") {

      let base64 = image

      if (base64.includes(",")) {
        base64 = base64.split(",").pop()
      }

      buffer = Buffer.from(
        base64,
        "base64"
      )

    } else {

      throw new Error(
        "La API devolvió un formato de imagen desconocido."
      )
    }

    // ============================================================
    // ✅ COMPROBAR IMAGEN
    // ============================================================

    if (!buffer || !buffer.length) {

      throw new Error(
        "La imagen recibida está vacía."
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
        "No se pudo convertir la imagen en sticker."
      )
    }

    console.log(
      "[QC] Sticker generado correctamente."
    )

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

    console.error(
      "❌ QC ERROR:",
      e?.response?.data || e
    )

    return await conn.sendMessage(
      m.chat,
      {
        text:
          "⚠️ *No se pudo generar el sticker.*\n\n" +
          "🔧 La API de citas respondió con un error.\n" +
          "📋 Revisá la consola para ver el código exacto."
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
