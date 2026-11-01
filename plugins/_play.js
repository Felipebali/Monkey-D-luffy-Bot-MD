
// 📂 plugins/_play.js
// 🎵 WHATSAPP-BOT — MUSIC DOWNLOADER
// • .play  → Descargar audio
// • .play2 → Buscar video
// • .play3 → Mostrar información
// • Compatible con ES Modules

import yts from 'yt-search'
import fetch from 'node-fetch'

const MAX_SIZE = 15 * 1024 * 1024 // 15 MB

let handler = async (m, { conn, command, text, usedPrefix }) => {

  if (!text) {
    return m.reply(
      `🎵 *WHATSAPP-BOT MUSIC*

Escribí el nombre de una canción.

Ejemplo:
${usedPrefix + command} Good Feeling - Flo Rida`
    )
  }

  try {
    await m.reply('🔎 Buscando tu canción...')

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

    const info = {
      title: vid.title,
      url: vid.url,
      duration: vid.duration?.timestamp || 'Desconocida',
      views: Number(vid.views || 0).toLocaleString('es-UY'),
      author: vid.author?.name || 'Desconocido',
      thumbnail: vid.thumbnail
    }

    console.log('[PLAY] Encontrado:', info.title)

    // PLAY3: Mostrar información
    if (command === 'play3') {
      const caption = `
🎵 *INFORMACIÓN DE LA CANCIÓN*

📌 *Título:* ${info.title}
👤 *Artista/Canal:* ${info.author}
⌚ *Duración:* ${info.duration}
👀 *Visualizaciones:* ${info.views}

🔗 ${info.url}
`.trim()

      return conn.sendMessage(m.chat, {
        image: { url: info.thumbnail },
        caption
      }, { quoted: m })
    }

    // PLAY2: Mostrar enlace del video
    if (command === 'play2') {
      return conn.sendMessage(m.chat, {
        text: `
🎬 *VIDEO ENCONTRADO*

📌 ${info.title}
👤 ${info.author}
⌚ ${info.duration}

🔗 ${info.url}
`.trim()
      }, { quoted: m })
    }

    // PLAY: Descargar audio desde una fuente autorizada.
    await conn.sendMessage(m.chat, {
      text: `🎧 *PREPARANDO AUDIO*

📌 ${info.title}
👤 ${info.author}
⌚ ${info.duration}

⏳ Procesando...`
    }, { quoted: m })

    // No se utiliza una API de descarga de YouTube no verificada.
    // La búsqueda y la información quedan disponibles.
    return m.reply(
      `⚠️ No hay una fuente de descarga autorizada configurada.

🎵 *Canción:* ${info.title}

🔗 ${info.url}

Configurá un proveedor de audio autorizado para habilitar el envío automático del MP3.`
    )

  } catch (error) {
    console.error('[PLAY] ERROR:', error)

    return conn.sendMessage(m.chat, {
      text: `❌ *ERROR EN PLAY*

${error.message || error}`
    }, { quoted: m })
  }
}

handler.help = ['play', 'play2', 'play3']
handler.tags = ['downloader']
handler.command = /^(play|play2|play3)$/i

export default handler
