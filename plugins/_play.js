
/**
 * 📂 plugins/_play.js
 * 🤖 WHATSAPP-BOT — DESCARGAR AUDIO DE YOUTUBE
 * Compatible con Baileys ES Modules y sistema handler
 *
 * Comandos:
 * .play
 * .mp3
 * .ytmp3
 * .ytaudio
 * .playaudio
 */

import ytsearch from 'yt-search'
import fetch from 'node-fetch'

// ============================================================
// ⚙️ CONFIGURACIÓN DE API
// ============================================================

const getApiConfig = () => {
  const config = global.api || {}

  return {
    url: config.url || process.env.API_URL || '',
    key: config.key || process.env.API_KEY || ''
  }
}

// ============================================================
// 📥 DESCARGAR ARCHIVOS
// ============================================================

async function getBuffer(url) {
  if (!url) throw new Error('URL de descarga vacía')

  const response = await fetch(url, {
    signal: AbortSignal.timeout(60000)
  })

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''

  if (
    contentType.includes('text/html') ||
    contentType.includes('application/json')
  ) {
    throw new Error('La URL no devolvió un archivo multimedia')
  }

  return Buffer.from(await response.arrayBuffer())
}

// ============================================================
// 🎵 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn, text, args, usedPrefix, command }) => {
  try {
    const query = text?.trim() || args?.join(' ').trim()

    if (!query) {
      return m.reply(
        `《✧》 Por favor, escribí el nombre o URL del video.\n\n` +
        `Ejemplo: ${usedPrefix || '.'}${command} Linkin Park Numb`
      )
    }

    const { url: apiUrl, key: apiKey } = getApiConfig()

    if (!apiUrl || !apiKey) {
      return m.reply('❌ La API de descargas no está configurada.')
    }

    await conn.sendMessage(m.chat, {
      react: { text: '⏳', key: m.key }
    }).catch(() => {})

    // ========================================================
    // 🔎 BUSCAR VIDEO
    // ========================================================

    let videoUrl = query

    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(query)) {
      const search = await ytsearch(query)

      if (!search?.videos?.length) {
        return m.reply('《✧》 No se encontró información del video.')
      }

      videoUrl = search.videos[0].url
    }

    // ========================================================
    // 🌐 CONSULTAR API
    // ========================================================

    const endpoint =
      `${apiUrl.replace(/\/$/, '')}/dl/youtubeplay` +
      `?query=${encodeURIComponent(videoUrl)}` +
      `&key=${encodeURIComponent(apiKey)}`

    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(60000)
    })

    if (!response.ok) {
      throw new Error(`API HTTP ${response.status}`)
    }

    const data = await response.json()

    if (!data?.status || !data?.result?.dl) {
      return m.reply('《✧》 No se pudo descargar el audio. Intentá más tarde.')
    }

    const {
      title,
      channel,
      duration,
      views,
      thumbnail,
      dl
    } = data.result

    const titulo = title || 'Audio de YouTube'
    const canal = channel || 'Desconocido'
    const vistas = Number(views || 0).toLocaleString('es-UY')

    const caption = `【　✿　】 _\`୨୧ Download\` ───── *${titulo}*_

> _✐ \`Canal\` ── ${canal}_
> _ⴵ \`Duración\` ── ${duration || 'Desconocida'}_
> _✰ \`Vistas\` ── ${vistas}_
> _🜸 \`Enlace\` ── ${videoUrl}_

> _── ִ ۟ *¡Enviando audio, por favor esperá!*_`

    // ========================================================
    // 🖼️ ENVIAR MINIATURA
    // ========================================================

    if (thumbnail) {
      try {
        const thumbBuffer = await getBuffer(thumbnail)

        await conn.sendMessage(m.chat, {
          image: thumbBuffer,
          caption
        }, { quoted: m })
      } catch {
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

    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${titulo.replace(/[\\/:*?"<>|]/g, '')}.mp3`,
      ptt: false
    }, { quoted: m })

    await conn.sendMessage(m.chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})

  } catch (error) {
    console.error('❌ PLAY ERROR:', error)

    await conn.sendMessage(m.chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    await m.reply(
      '❌ Ocurrió un error al descargar el audio.\n' +
      'Intentá nuevamente más tarde.'
    )
  }
}

// ============================================================
// 🧩 CONFIGURACIÓN HANDLER
// ============================================================

handler.help = ['play', 'mp3', 'ytmp3', 'ytaudio', 'playaudio']
handler.tags = ['descargas']
handler.command = /^(play|mp3|ytmp3|ytaudio|playaudio)$/i

export default handler
