
/**
 * 📂 plugins/_play.js
 * 🤖 WHATSAPP-BOT — PLAY AUDIO
 *
 * ✅ Sistema handler
 * ✅ Baileys ES Modules
 * ✅ API original conservada
 * ✅ Sin dependencia #serialize
 * ✅ Miniatura y datos del video
 * ✅ Audio MP3
 */

import ytsearch from 'yt-search'
import fetch from 'node-fetch'

// ============================================================
// 📥 DESCARGAR BUFFER
// ============================================================

async function getBuffer(url) {
  if (!url) {
    throw new Error('URL de descarga vacía')
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(60000)
  })

  if (!response.ok) {
    throw new Error(`Descarga HTTP ${response.status}`)
  }

  const type = response.headers.get('content-type') || ''

  if (
    type.includes('text/html') ||
    type.includes('application/json')
  ) {
    throw new Error('La descarga no devolvió un archivo multimedia')
  }

  return Buffer.from(await response.arrayBuffer())
}

// ============================================================
// 🎵 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn, text, args, command, usedPrefix }) => {
  try {
    const query = text?.trim() || args?.join(' ').trim()

    if (!query) {
      return m.reply(
        `《✧》 Mencioná el nombre o URL del video.\n\n` +
        `Ejemplo: ${usedPrefix || '.'}${command || 'play'} Linkin Park Numb`
      )
    }

    // ========================================================
    // 🔎 BUSCAR VIDEO
    // ========================================================

    let videoUrl = query

    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(query)) {
      const searchResult = await ytsearch(query)

      if (!searchResult?.videos?.length) {
        return m.reply(
          '《✧》 No se encontró información del video.'
        )
      }

      videoUrl = searchResult.videos[0].url
    }

    // ========================================================
    // 🌐 API ORIGINAL
    // ========================================================

    const apiConfig = globalThis.api

    if (!apiConfig?.url || !apiConfig?.key) {
      throw new Error(
        'La configuración api.url o api.key no está disponible'
      )
    }

    const dlEndpoint =
      `${apiConfig.url.replace(/\/$/, '')}/dl/youtubeplay` +
      `?query=${encodeURIComponent(videoUrl)}` +
      `&key=${encodeURIComponent(apiConfig.key)}`

    const response = await fetch(dlEndpoint, {
      signal: AbortSignal.timeout(60000)
    })

    if (!response.ok) {
      throw new Error(`API HTTP ${response.status}`)
    }

    const resDl = await response.json()

    if (!resDl?.status || !resDl?.result?.dl) {
      return m.reply(
        '《✧》 No se pudo descargar el *audio*, intentá más tarde.'
      )
    }

    const {
      title,
      channel,
      duration,
      views,
      thumbnail,
      dl
    } = resDl.result

    const titulo = title || 'Audio de YouTube'
    const vistas = Number(views || 0).toLocaleString('es-UY')
    const canal = channel || 'Desconocido'

    // ========================================================
    // 🖼️ MINIATURA E INFORMACIÓN
    // ========================================================

    const caption = `【　✿　】 _\`୨୧  Download\` ───── *${titulo}*_

> _✐ \`Canal\` ── ${canal}_
> _ⴵ \`Duración\` ── ${duration || ''}s_
> _✰ \`Vistas\` ── ${vistas}_
> _🜸 \`Enlace\` ── ${videoUrl}_

> _──  ִ    ۟  *¡Enviando audio, por favor espera!*_`

    if (thumbnail) {
      try {
        const thumbBuffer = await getBuffer(thumbnail)

        await conn.sendMessage(
          m.chat,
          {
            image: thumbBuffer,
            caption
          },
          { quoted: m }
        )
      } catch (error) {
        console.error('⚠️ Error miniatura:', error.message)
        await m.reply(caption)
      }
    } else {
      await m.reply(caption)
    }

    // ========================================================
    // 🎧 DESCARGAR AUDIO
    // ========================================================

    const audioBuffer = await getBuffer(dl)

    if (!audioBuffer.length) {
      throw new Error('El archivo de audio está vacío')
    }

    // ========================================================
    // 📤 ENVIAR AUDIO
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${titulo.replace(/[\\/:*?"<>|]/g, '')}.mp3`,
        ptt: false
      },
      { quoted: m }
    )

  } catch (error) {
    console.error('❌ PLAY ERROR:', error)

    await m.reply(
      '❌ No se pudo descargar el audio.\n' +
      `Motivo: ${error.message}`
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
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
