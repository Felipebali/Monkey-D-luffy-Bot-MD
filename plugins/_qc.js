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

    const response =
      await axios.post(

        "https://quote.yuri.ly/quote/generate",

        payload,

        {

          headers: {

            "Content-Type":
              "application/json",

            "Accept":
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
    // 🔍 RESPUESTA API
    // ============================================================

    console.log(
      "[QC] Status API:",
      response.status
    )

    console.log(
      "[QC] Content-Type:",
      response.headers?.["content-type"]
    )

    console.log(
      "[QC] Respuesta API:",
      {
        ok: data?.ok,
        code: data?.code,
        message: data?.message,
        type: data?.type,
        ext: data?.ext,
        width: data?.width,
        height: data?.height,
        tieneImagen:
          !!data?.image,
        tieneResult:
          !!data?.result,
        tieneResultImage:
          !!data?.result?.image
      }
    )

    // ============================================================
    // ❌ ERROR DE LA API
    // ============================================================

    if (
      data?.error ||
      (
        data?.code &&
        Number(data.code) >= 400
      )
    ) {

      const apiError =
        typeof data === "object"
          ? (
              data?.message ||
              data?.error ||
              JSON.stringify(data)
            )
          : String(data)

      throw new Error(
        `API: ${apiError}`
      )
    }

    // ============================================================
    // 🖼️ BUSCAR IMAGEN
    // ============================================================

    let image =
      data?.image ||
      data?.result?.image ||
      data?.data?.image

    // ============================================================
    // 📦 SI LA API DEVUELVE RESULT DIRECTO
    // ============================================================

    if (
      !image &&
      typeof data?.result === "string"
    ) {

      image =
        data.result

    }

    // ============================================================
    // ❌ SIN IMAGEN
    // ============================================================

    if (!image) {

      console.error(
        "[QC] Respuesta completa de la API:"
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
    // 🔄 CONVERTIR IMAGEN A BUFFER
    // ============================================================

    let buffer

    // ------------------------------------------------------------
    // BUFFER
    // ------------------------------------------------------------

    if (
      Buffer.isBuffer(image)
    ) {

      buffer =
        image

    }

    // ------------------------------------------------------------
    // BASE64
    // ------------------------------------------------------------

    else if (
      typeof image === "string"
    ) {

      let base64 =
        image.trim()

      // data:image/png;base64,...
      if (
        base64.includes(",")
      ) {

        base64 =
          base64
            .split(",")
            .pop()

      }

      // Quitar posibles espacios
      base64 =
        base64.replace(
          /\s/g,
          ""
        )

      buffer =
        Buffer.from(
          base64,
          "base64"
        )

    }

    // ------------------------------------------------------------
    // ARRAYBUFFER
    // ------------------------------------------------------------

    else if (
      image instanceof ArrayBuffer
    ) {

      buffer =
        Buffer.from(
          image
        )

    }

    // ------------------------------------------------------------
    // UNKNOWN
    // ------------------------------------------------------------

    else {

      throw new Error(
        "La API devolvió un formato de imagen desconocido."
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
        "La imagen recibida está vacía."
      )
    }

    console.log(
      `[QC] Imagen recibida: ${buffer.length} bytes`
    )

    // ============================================================
    // 🔎 COMPROBAR PNG
    // ============================================================

    const esPNG =
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47

    if (!esPNG) {

      console.log(
        "[QC] La respuesta no parece PNG. Se intentará convertir igualmente."
      )
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

    // ============================================================
    // 🔍 MOSTRAR ERROR REAL
    // ============================================================

    if (
      e?.response?.data
    ) {

      console.error(
        "[QC] Respuesta del servidor:",
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
    // 📋 TEXTO DEL ERROR
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

    // ============================================================
    // 📤 ENVIAR ERROR
    // ============================================================

    return await conn.sendMessage(

      m.chat,

      {

        text:
          "⚠️ *No se pudo generar el sticker.*\n\n" +

          "🔧 Ocurrió un error al generar la cita.\n\n" +

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
