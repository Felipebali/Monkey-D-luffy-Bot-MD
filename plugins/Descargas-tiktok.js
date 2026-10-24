
/**
 * 📂 plugins/tiktok.js
 * 🎵 WHATSAPP-BOT — DESCARGADOR DE TIKTOK
 *
 * Comandos: .tt / .tiktok / .ttdl
 * No utiliza global.dfail ni failureHandler.
 */

import axios from 'axios'

global.emoji = '🎵'

const API_URL = 'https://api.tiktokdl.xyz/'

const reaccionar = async (m, emoji) => {
  try {
    if (typeof m.react === 'function') {
      await m.react(emoji)
    }
  } catch {}
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    const input = args?.[0]?.trim()

    // 📌 Verificar el enlace.
    if (!input) {
      return conn.sendMessage(
        m.chat,
        {
          text:
            '⚡️ *Debés ingresar un enlace de TikTok.*\n\n' +
            `📌 *Ejemplo:* ${usedPrefix + command} https://vm.tiktok.com/ZMreHF2dC/`
        },
        { quoted: m }
      )
    }

    let url

    try {
      url = new URL(input.startsWith('http') ? input : `https://${input}`)
    } catch {
      return conn.sendMessage(
        m.chat,
        { text: '❎ El enlace ingresado no es válido.' },
        { quoted: m }
      )
    }

    const host = url.hostname.toLowerCase()

    if (
      host !== 'tiktok.com' &&
      !host.endsWith('.tiktok.com')
    ) {
      return conn.sendMessage(
        m.chat,
        { text: '❎ Debés ingresar un enlace de TikTok válido.' },
        { quoted: m }
      )
    }

    await reaccionar(m, '⌛')

    // 🌐 Consultar API de descarga.
    const { data } = await axios.get(API_URL, {
      params: { url: url.href },
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })

    if (!data || !data.video) {
      throw new Error(
        data?.message || 'La API no devolvió el video.'
      )
    }

    const videoUrl =
      typeof data.video === 'string'
        ? data.video
        : data.video?.url

    if (
      typeof videoUrl !== 'string' ||
      !/^https?:\/\//i.test(videoUrl)
    ) {
      throw new Error('La URL del video recibida no es válida.')
    }

    const title = String(data.title || 'Sin título')
    const author = String(data.author_name || 'Desconocido')
    const duration = String(data.duration ?? 'Desconocida')

    const caption = [
      '╭━━━〔 🎵 *WHATSAPP-BOT - DESCARGAS* 〕━━━⬣',
      `┃ ❒ *Autor:* ${author}`,
      `┃ ❒ *Título:* ${title}`,
      `┃ ❒ *Duración:* ${duration}`,
      '╰━━━━━━━━━━━━━━━━━━━━━━⬣'
    ].join('\n')

    // 📥 Enviar video.
    await conn.sendMessage(
      m.chat,
      {
        video: { url: videoUrl },
        caption,
        mimetype: 'video/mp4'
      },
      { quoted: m }
    )

    await reaccionar(m, '✅')

  } catch (error) {
    console.error(
      '[TIKTOK] Error:',
      error?.response?.data || error?.message || error
    )

    await reaccionar(m, '❌')

    const mensaje =
      error?.code === 'ECONNABORTED'
        ? 'La API tardó demasiado en responder.'
        : error?.response?.status === 429
          ? 'La API está recibiendo demasiadas solicitudes. Esperá un momento.'
          : 'No se pudo descargar el video. Puede haber fallado la API o el enlace.'

    try {
      return await conn.sendMessage(
        m.chat,
        { text: `❌ *Error de TikTok*\n\n${mensaje}` },
        { quoted: m }
      )
    } catch (sendError) {
      console.error('[TIKTOK] No se pudo enviar el error:', sendError)
    }
  }
}

handler.help = ['tt <enlace>', 'tiktok <enlace>', 'ttdl <enlace>']
handler.tags = ['descargas']
handler.command = /^(tt|tiktok|ttdl)$/i

export default handler
