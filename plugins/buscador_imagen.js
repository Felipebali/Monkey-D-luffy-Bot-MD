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
          page_size: 50
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
    // 🖼️ PROBAR TODAS LAS IMÁGENES DISPONIBLES
    // ============================================================

    let imagen = null

    for (const resultado of resultados) {

      const urls = [
        resultado?.url,
        resultado?.image,
        resultado?.thumbnail
      ].filter(Boolean)

      for (const url of urls) {
        try {

          const img = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 12000,
            maxContentLength: 30 * 1024 * 1024,
            maxBodyLength: 30 * 1024 * 1024,
            validateStatus: status =>
              status >= 200 && status < 400
          })

          if (img.data && img.data.length > 0) {

            imagen = {
              buffer: Buffer.from(img.data),
              url: url,
              titulo: resultado?.title || query,
              autor: resultado?.creator || "Desconocido"
            }

            break
          }

        } catch (error) {
          // Probar la siguiente URL
          continue
        }
      }

      if (imagen) break
    }

    // ============================================================
    // ❌ NINGUNA IMAGEN PUDO DESCARGARSE
    // ============================================================

    if (!imagen) {
      await m.react("❌")

      return conn.reply(
        m.chat,
        `❌ *No pude descargar ninguna imagen.*\n\n` +
        `🔎 Búsqueda: *${query}*\n\n` +
        `⚠️ El buscador encontró resultados, pero las imágenes ` +
        `no pudieron ser descargadas.`,
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
      {
        quoted: m
      }
    )

    await m.react("✅")

  } catch (error) {

    console.error("❌ Error en imagen:", error)

    await m.react("❌")

    return conn.reply(
      m.chat,
      `❌ *No pude buscar la imagen.*\n\n` +
      `🔎 *Búsqueda:* ${text || "Sin texto"}\n\n` +
      `⚠️ El servicio de imágenes puede estar temporalmente caído.`,
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
