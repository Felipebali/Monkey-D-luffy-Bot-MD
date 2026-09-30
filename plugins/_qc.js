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
          text:
            "❌ Escribí un texto o citá un mensaje para crear el sticker."
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
          text:
            "❌ El texto no puede superar los 50 caracteres."
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

    } catch {

      console.log(
        "[QC] Foto de perfil no disponible. Usando imagen predeterminada."
      )
    }

    // ============================================================
    // 📦 PAYLOAD
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

    // ============================================================
    // 🌐 GENERAR CITA
    // ============================================================

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

    const response =
      await axios.post(

        "https://bot.lyo.su/quote/generate",

        payload,

        {

          headers: {

            "Content-Type":
              "application/json",

            "User-Agent":
              "FelixCat-Bot"

          },

          timeout:
            30000,

          maxContentLength:
            20 * 1024 * 1024,

          maxBodyLength:
            20 * 1024 * 1024

        }

      )

    const data =
      response?.data

    // ============================================================
    // 🔍 MOSTRAR RESPUESTA
    // ============================================================

    console.log(
      "[QC] Status API:",
      response.status
    )

    console.log(
      "[QC] Respuesta API:",
      {
        ok: data?.ok,
        type: data?.result?.type,
        width: data?.result?.width,
        height: data?.result?.height,
        tieneImagen:
          !!data?.result?.image
      }
    )

    // ============================================================
    // ❌ ERROR API
    // ============================================================

    if (
      data?.ok === false
    ) {

      const error =
        data?.error ||
        data?.message ||
        "La API rechazó la solicitud."

      throw new Error(
        typeof error === "object"
          ? JSON.stringify(error)
          : String(error)
      )
    }

    // ============================================================
    // 🖼️ OBTENER IMAGEN
    // ============================================================

    const image =
      data?.result?.image ||
      data?.image

    if (!image) {

      console.error(
        "[QC] Respuesta completa:"
      )

      console.error(
        JSON.stringify(
          data,
          null,
          2
        )
      )

      throw new Error(
        "La API no devolvió ninguna imagen."
      )
    }

    // ============================================================
    // 🔄 BASE64 → BUFFER
    // ============================================================

    let base64 =
      String(image)

    // Por si devuelve:
    // data:image/png;base64,...

    if (
      base64.includes(",")
    ) {

      base64 =
        base64
          .split(",")
          .pop()

    }

    base64 =
      base64.replace(
        /\s/g,
        ""
      )

    const buffer =
      Buffer.from(
        base64,
        "base64"
      )

    // ============================================================
    // ✅ COMPROBAR BUFFER
    // ============================================================

    if (
      !buffer ||
      !buffer.length
    ) {

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

    // ============================================================
    // ❌ ERROR
    // ============================================================

    console.error(
      "❌ QC ERROR:"
    )

    if (
      e?.response?.data
    ) {

      console.error(
        JSON.stringify(
          e.response.data,
          null,
          2
        )
      )

    } else {

      console.error(
        e?.message ||
        e
      )
    }

    // ============================================================
    // 📋 MENSAJE
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
// ⚙️ CONFIGURACIÓN
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
