// 📂 plugins/_play.js
// 🎵 Buscador de YouTube

import yts from 'yt-search'
import fetch from 'node-fetch'

let handler = async (m, { conn, command, text, usedPrefix }) => {

  if (!text) {
    return m.reply(`❌ Escribí el nombre de una canción.

Ejemplo:
${usedPrefix + command} Good Feeling - Flo Rida`)
  }

  try {
    await m.reply('🔎 Buscando en YouTube...')

    console.log('[PLAY] Buscando:', text)

    const resultado = await yts.search({
      query: text,
      hl: 'es',
      gl: 'UY'
    })

    const vid = resultado?.videos?.[0]

    if (!vid) {
      return m.reply('❌ No se encontraron resultados.')
    }

    console.log('[PLAY] Encontrado:', vid.title)

    const url = vid.url

    const caption = `
🎵 *RESULTADO DE YOUTUBE*

📌 *TÍTULO:* ${vid.title}
📆 *PUBLICADO:* ${vid.ago || 'Desconocido'}
⌚ *DURACIÓN:* ${vid.duration?.timestamp || 'Desconocida'}
👀 *VISTAS:* ${Number(vid.views || 0).toLocaleString('es-UY')}
👤 *CANAL:* ${vid.author?.name || 'Desconocido'}

🔗 *URL:* ${url}

🎧 Para descargar audio:
.play ${url}

🎬 Para descargar video:
.play2 ${url}
`.trim()

    let enviado = false

    // Intentar enviar con miniatura
    try {
      const respuesta = await fetch(vid.thumbnail)

      if (!respuesta.ok) {
        throw new Error(`Error descargando miniatura: ${respuesta.status}`)
      }

      const buffer = Buffer.from(await respuesta.arrayBuffer())

      await conn.sendMessage(
        m.chat,
        {
          image: buffer,
          caption
        },
        { quoted: m }
      )

      enviado = true

    } catch (error) {
      console.error('[PLAY] Error enviando imagen:', error)
    }

    // Si falla la imagen, enviar solamente texto
    if (!enviado) {
      await conn.sendMessage(
        m.chat,
        { text: caption },
        { quoted: m }
      )
    }

    console.log('[PLAY] Mensaje enviado correctamente')

  } catch (error) {
    console.error('[PLAY] ERROR:', error)

    await conn.sendMessage(
      m.chat,
      { text: `❌ Error al buscar o enviar el resultado.\n\n${error.message || error}` },
      { quoted: m }
    )
  }
}

handler.help = ['play', 'play2', 'play3']
handler.tags = ['downloader']
handler.command = /^(play|play2|play3)$/i

export default handler
