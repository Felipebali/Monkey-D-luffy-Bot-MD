
/**
 * 📂 plugins/_play.js
 * 🤖 WHATSAPP-BOT — PLAY AUDIO
 *
 * ✅ API original conservada
 * ✅ Búsqueda de YouTube
 * ✅ Miniatura e información
 * ✅ Descarga y envío de MP3
 * ✅ Sistema handler
 * ✅ Baileys ES Modules
 */

import ytsearch from 'yt-search'
import { getBuffer } from '#serialize'
import fetch from 'node-fetch'

// ============================================================
// 🎵 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn, args, text, usedPrefix, command }) => {
  try {
    if (!args?.[0] && !text) {
      return m.reply(
        '《✧》 Por favor, menciona el nombre o URL del video que deseas descargar.'
      )
    }

    const query = text || args.join(' ')

    // ========================================================
    // 🔎 BUSCAR VIDEO
    // ========================================================

    const searchResult = await ytsearch(query)

    if (!searchResult.videos || !searchResult.videos.length) {
      return m.reply(
        '《✧》 No se encontró información del video.'
      )
    }

    const videoUrl = searchResult.videos[0].url

    // ========================================================
    // 🌐 API ORIGINAL
    // ========================================================

    const dlEndpoint =
      `${api.url}/dl/youtubeplay?query=${encodeURIComponent(videoUrl)}&key=${api.key}`

    const resDl = await fetch(dlEndpoint).then(r => r.json())

    if (!resDl?.status || !resDl?.result?.dl) {
      return m.reply(
        '《✧》 No se pudo descargar el *audio*, intenta más tarde.'
      )
    }

    // ========================================================
    // 📋 INFORMACIÓN DEL VIDEO
    // ========================================================

    const {
      title,
      channel,
      duration,
      views,
      thumbnail,
      dl
    } = resDl.result

    const vistas = (views || 0).toLocaleString()
    const canal = channel || 'Desconocido'

    const thumbBuffer = await getBuffer(thumbnail)

    const caption = `【　✿　】 _\`୨୧  Download\` ───── *${title}*_

> _✐ \`Canal\` ── ${canal}_
> _ⴵ \`Duración\` ── ${duration || ''}s_
> _✰ \`Vistas\` ── ${vistas}_
> _🜸 \`Enlace\` ── ${videoUrl}_

> _──  ִ    ۟  *¡Enviando audio, por favor espera!*_`

    // ========================================================
    // 🖼️ ENVIAR MINIATURA
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        image: thumbBuffer,
        caption
      },
      {
        quoted: m
      }
    )

    // ========================================================
    // 🎧 DESCARGAR AUDIO
    // ========================================================

    const audioBuffer = await getBuffer(dl)

    if (!audioBuffer || audioBuffer.length === 0) {
      return m.reply(
        '《✧》 No se pudo descargar el *audio*, intenta más tarde.'
      )
    }

    // ========================================================
    // 📤 ENVIAR AUDIO
    // ========================================================

    const mensaje = {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
      ptt: false
    }

    await conn.sendMessage(
      m.chat,
      mensaje,
      {
        quoted: m
      }
    )

  } catch (e) {
    console.error('❌ PLAY ERROR:', e)

    await m.reply(
      typeof msgglobal !== 'undefined'
        ? msgglobal
        : '❌ Ocurrió un error al descargar el audio.'
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN HANDLER
// ============================================================

handler.help = [
  'play',
  'mp3',
  'ytmp3',
  'ytaudio',
  'playaudio'
]

handler.tags = ['descargas']

handler.command = /^(play|mp3|ytmp3|ytaudio|playaudio)$/i

export default handler
