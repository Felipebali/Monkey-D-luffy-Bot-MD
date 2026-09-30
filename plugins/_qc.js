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

    const userJid =
      m.quoted?.sender ||
      m.sender

    let nombre =
      m.quoted?.name ||
      m.pushName ||
      m.name ||
      "Usuario"

    nombre =
      String(nombre)
        .substring(0, 50)

    // ============================================================
    // 🖼️ FOTO DE PERFIL
    // ============================================================

    let pp =
      "https://i.ibb.co/dyk5QdQ/1212121212121212.png"

    try {

      if (
        typeof conn.profilePictureUrl ===
        "function"
      ) {

        const url =
          await conn.profilePictureUrl(
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

    console.log(
      "[QC] Generando cita..."
    )

    console.log(
      "[QC] Usuario:",
      nombre
    )

    console.log(
      "[QC] Texto:",
      frase
    )

    // ============================================================
    // 🌐 GENERAR IMAGEN
    // ============================================================
    // Usamos el endpoint PNG directo.
    // La API devuelve la imagen como binario.

    const response =
      await axios.post(

        "https://quote.yuri.ly/quote/generate.png",

        payload,

        {

          headers: {

            "Content-Type":
              "application/json",

            "Accept":
              "image/png",

            "User-Agent":
              "FelixCat-Bot"

          },

          responseType:
            "arraybuffer",

          timeout:
            30000,

          maxContentLength:
            20 * 1024 * 1024,

          maxBodyLength:
            20 * 1024 * 1024,

          validateStatus:
            () => true

        }

      )

    // ============================================================
    // 🔍 COMPROBAR RESPUESTA
    // ============================================================

    console.log(
      "[QC] Status API:",
      response.status
    )

    console.log(
      "[QC] Content-Type:",
      response.headers?.["content-type"]
    )

    if (
      response.status < 200 ||
      response.status >= 300
    ) {

      let errorText = ""

      try {

        const raw =
          Buffer.from(
            response.data
          ).toString("utf8")

        try {

          const json =
            JSON.parse(raw)

          errorText =
            json?.error ||
            json?.message ||
            raw

        } catch {

          errorText =
            raw

        }

      } catch {

        errorText =
          "Respuesta inválida de la API."

      }

      console.error(
        "[QC] Error API:",
        errorText
      )

      throw new Error(
        `API respondió ${response.status}: ${errorText}`
      )
    }

    // ============================================================
    // 🖼️ OBTENER BUFFER
    // ============================================================

    let buffer

    if (
      Buffer.isBuffer(
        response.data
      )
    ) {

      buffer =
        response.data

    } else if (
      response.data instanceof ArrayBuffer
    ) {

      buffer =
        Buffer.from(
          response.data
        )

    } else {

      buffer =
        Buffer.from(
          response.data
        )

    }

    // ============================================================
    // ✅ COMPROBAR IMAGEN
    // ============================================================

    if (
      !buffer ||
      !buffer.length
    ) {

      throw new Error(
        "La API devolvió una imagen vacía."
      )
    }

    console.log(
      `[QC] Imagen recibida: ${buffer.length} bytes`
    )

    // ============================================================
    // 🔎 COMPROBAR FIRMA PNG
    // ============================================================

    const esPNG =
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47

    if (!esPNG) {

      console.log(
        "[QC] La respuesta no parece PNG."
      )

      // Intentar detectar si la API devolvió JSON
      try {

        const raw =
          buffer.toString("utf8")

        const json =
          JSON.parse(raw)

        console.error(
          "[QC] Respuesta JSON inesperada:",
          json
        )

        throw new Error(
          json?.error ||
          json?.message ||
          "La API no devolvió una imagen PNG."
        )

      } catch (jsonError) {

        if (
          jsonError?.message &&
          !jsonError.message.includes(
            "Unexpected token"
          )
        ) {
          throw jsonError
        }

        throw new Error(
          "La API no devolvió una imagen PNG válida."
        )
      }
    }

    // ============================================================
    // 🏷️ CONVERTIR A STICKER
    // ============================================================

    console.log(
      "[QC] Convirtiendo imagen a sticker..."
    )

    const stiker =
      await sticker(
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
      "❌ QC ERROR:"
    )

    console.error(
      e?.response?.data ||
      e?.message ||
      e
    )

    // ============================================================
    // 📋 MENSAJE DE ERROR
    // ============================================================

    let detalle =
      e?.message ||
      "Error desconocido."

    if (
      detalle.length > 300
    ) {
      detalle =
        detalle.substring(
          0,
          300
        ) + "..."
    }

    return await conn.sendMessage(

      m.chat,

      {

        text:
          "⚠️ *No se pudo generar el sticker.*\n\n" +

          "🔧 La API de citas respondió con un error.\n" +

          `📋 ${detalle}`

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

handler.command = [
  "qc"
]

handler.help = [
  "qc <texto>"
]

handler.tags = [
  "sticker"
]

handler.group = false

handler.botAdmin = false

export default handler
