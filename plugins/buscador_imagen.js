// 📂 plugins/imagen.js
// 🖼️ Buscador de imágenes de Google
// FelixCat_Bot 🐈

import fetch from "node-fetch"

let handler = async (m, { conn, text, isOwner }) => {

  // ============================================================
  // 📝 COMPROBAR TEXTO
  // ============================================================

  if (!text?.trim()) {
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

  // ============================================================
  // 🔒 FILTRO DE BÚSQUEDAS RESTRINGIDAS
  // ============================================================

  if (!isOwner) {

    const prohibited = [
      "caca",
      "polla",
      "gay",
      "hombres cogiendo",
      "mía malkova",
      "mia malkova",
      "hombres gay",
      "fisting",
      "porno",
      "porn",
      "gore",
      "cum",
      "semen",
      "puta",
      "puto",
      "culo",
      "putita",
      "putito",
      "pussy",
      "hentai",
      "pene",
      "coño",
      "asesinato",
      "zoofilia",
      "mia khalifa",
      "desnudo",
      "desnuda",
      "cuca",
      "chocha",
      "muertos",
      "pornhub",
      "xnxx",
      "xvideos",
      "teta",
      "vagina",
      "marsha may",
      "misha cross",
      "sexmex",
      "furry",
      "furro",
      "furra",
      "xxx",
      "rule34",
      "panocha",
      "pedofilia",
      "necrofilia",
      "pinga",
      "horny",
      "ass",
      "nude",
      "popo",
      "nsfw",
      "femdom",
      "futanari",
      "erofeet",
      "sexo",
      "sex",
      "yuri",
      "ero",
      "ecchi",
      "blowjob",
      "anal",
      "ahegao",
      "pija",
      "verga",
      "trasero",
      "violation",
      "violacion",
      "bdsm",
      "cachonda",
      "+18",
      "cp",
      "mia marin",
      "lana rhoades",
      "cepesito",
      "hot",
      "buceta",
      "violet myllers",
      "pornografía",
      "pornografía infantil",
      "niña desnuda",
      "niñas desnudas",
      "niña pussy",
      "niña pack",
      "niña culo",
      "niña sin ropa",
      "niña siendo abusada",
      "niña siendo abusada sexualmente",
      "niña cogiendo",
      "niña fototeta",
      "niña vagina",
      "hero boku no pico",
      "mia khalifa cogiendo",
      "mia khalifa sin ropa",
      "mia khalifa comiendo polla",
      "mia khalifa desnuda"
    ]

    const normalizedText = text
      .replace(/\s+/g, "")
      .toLowerCase()

    const restringida = prohibited.some(word =>
      normalizedText.includes(
        word.replace(/\s+/g, "").toLowerCase()
      )
    )

    if (restringida) {
      await m.react("⚠️")

      return conn.reply(
        m.chat,
        `⚠️ *BÚSQUEDA RESTRINGIDA*`,
        m
      )
    }
  }

  // ============================================================
  // 🔎 BUSCAR IMAGEN
  // ============================================================

  await m.react("📷")

  try {

    const query = encodeURIComponent(text.trim())

    const url =
      `https://www.google.com/search?q=${query}` +
      `&hl=es&tbm=isch&tbs=isz:lt,islt:qsvga`

    const HEADERS = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/131.0.0.0 Safari/537.36",

      "Accept":
        "text/html,application/xhtml+xml,application/xml;" +
        "q=0.9,image/webp,*/*;q=0.8",

      "Accept-Language":
        "es-ES,es;q=0.9,en;q=0.8"
    }

    const r = await fetch(url, {
      headers: HEADERS
    })

    if (!r.ok) {
      throw new Error(
        `Google respondió con HTTP ${r.status}`
      )
    }

    const html = await r.text()

    // ============================================================
    // 🧩 EXTRAER RESULTADOS
    // ============================================================

    const patron =
      /\["(https?:\/\/encrypted-tbn0\.gstatic\.com\/images\?[^"]+?)".*?\["(https?:\/\/[^"]+?)".*?"(.*?)".*?\]/g

    let match
    const resultados = []
    const visto = new Set()

    while ((match = patron.exec(html)) !== null) {

      let original_url = match[2]
        .replace(/\\u003d/g, "=")
        .replace(/\\u0026/g, "&")
        .replace(/\\\//g, "/")

      let titulo = match[3]
        .replace(
          /\\u[\dA-F]{4}/gi,
          u =>
            String.fromCharCode(
              parseInt(
                u.replace("\\u", ""),
                16
              )
            )
        )
        .replace(/<[^>]+>/g, "")
        .trim()

      if (!titulo) {
        titulo =
          `Imagen ${resultados.length + 1}`
      }

      if (
        original_url &&
        !visto.has(original_url)
      ) {

        visto.add(original_url)

        resultados.push({
          titulo,
          url: original_url
        })
      }

      if (resultados.length >= 10) {
        break
      }
    }

    // ============================================================
    // ❌ SIN RESULTADOS
    // ============================================================

    if (!resultados.length) {

      await m.react("❌")

      return conn.reply(
        m.chat,
        `❌ *No hubo resultados.*\n\n` +
        `🔎 Búsqueda: *${text}*`,
        m
      )
    }

    // ============================================================
    // 🎲 ELEGIR IMAGEN AL AZAR
    // ============================================================

    const elegido =
      resultados[
        Math.floor(
          Math.random() * resultados.length
        )
      ]

    // ============================================================
    // 📤 ENVIAR IMAGEN
    // ============================================================

    await conn.sendFile(
      m.chat,
      elegido.url,
      "img.jpg",
      `🖼️ *Resultado de:* ${text}`,
      m
    )

    await m.react("✅")

  } catch (err) {

    console.error(
      "❌ Error en búsqueda de imagen:",
      err
    )

    await m.react("❌")

    return conn.reply(
      m.chat,
      `❌ *No pude obtener la imagen.*\n\n` +
      `🔎 Búsqueda: *${text}*\n\n` +
      `⚠️ Google puede haber bloqueado temporalmente ` +
      `la búsqueda.`,
      m
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  "imagen <texto>",
  "foto <texto>",
  "imágen <texto>"
]

handler.tags = [
  "tools"
]

handler.command = [
  "imagen",
  "foto",
  "imágen"
]

handler.group = true
handler.botAdmin = true

export default handler
