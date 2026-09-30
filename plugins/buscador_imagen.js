// 📂 plugins/imagen.js
// 🖼️ Búsqueda de imágenes sin API KEY
// FelixCat_Bot 🐈

import axios from "axios"

let handler = async (m, { conn, text }) => {
  try {
    const query = text?.trim()

    if (!query) {
      return conn.reply(
        m.chat,
        `🖼️ *BÚSQUEDA DE IMÁGENES*\n\n` +
        `📌 Uso:\n` +
        `*.imagen <texto>*\n\n` +
        `💡 Ejemplo:\n` +
        `*.imagen gato*`,
        m
      )
    }

    await m.react("🔎")

    // ============================================================
    // 🔎 BUSCAR EN OPENVERSE
    // ============================================================

    const response = await axios.get(
      "https://api.openverse.org/v1/images/",
      {
        params: {
          q: query,
          page_size: 20
        },
        timeout: 15000
      }
    )

    const resultados = response.data?.results || []

    if (!resultados.length) {
      await m.react("❌")

      return conn.reply(
        m.chat,
        `❌ No encontré imágenes para:\n\n*${query}*`,
        m
      )
    }

    // ============================================================
    // 🖼️ BUSCAR UNA IMAGEN VÁLIDA
    // ============================================================

    let imagen = null

    for (const resultado of resultados) {
      const url =
        resultado?.url ||
        resultado?.thumbnail ||
        resultado?.image

      if (!url) continue

      try {
        const img = await axios.get(url, {
          responseType: "arraybuffer",
          timeout: 10000,
          maxContentLength: 15 * 1024 * 1024
        })

        const contentType =
          img.headers?.["content-type"] || ""

        if (
          contentType.startsWith("image/") &&
          img.data?.length
        ) {
          imagen = {
            buffer: Buffer.from(img.data),
            url,
            titulo: resultado?.title || query,
            autor: resultado?.creator || "Desconocido"
          }

          break
        }
      } catch {
        // Probar la siguiente imagen
      }
    }

    if (!imagen) {
      await m.react("❌")

      return conn.reply(
        m.chat,
        `❌ Encontré resultados, pero no pude descargar ninguna imagen.\n\n` +
        `🔎 Búsqueda: *${query}*`,
        m
      )
    }

    // ============================================================
    // 📤 ENVIAR IMAGEN
    // ============================================================

    await conn.sendMessage(
      m.chat,
      {
        image: imagen.buffer,
        caption:
          `🖼️ *RESULTADO DE IMAGEN*\n\n` +
          `🔎 *Búsqueda:* ${query}\n` +
          `👤 *Autor:* ${imagen.autor}`
      },
      { quoted: m }
    )

    await m.react("✅")

  } catch (error) {
    console.error("❌ Error en imagen:", error)

    await m.react("❌")

    return conn.reply(
      m.chat,
      `❌ *No pude buscar la imagen.*\n\n` +
      `🔎 Búsqueda: *${text || "Sin texto"}*\n\n` +
      `⚠️ Puede que el servicio de imágenes esté temporalmente caído.`,
      m
    )
  }
}

handler.help = [
  "imagen <texto>",
  "foto <texto>"
]

handler.tags = ["tools"]

handler.command = [
  "imagen",
  "foto"
]

handler.group = true
handler.botAdmin = false

export default handler
