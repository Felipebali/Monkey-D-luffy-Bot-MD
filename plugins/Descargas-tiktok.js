
/**
 * 📂 plugins/tiktok.js
 * 🎵 WHATSAPP-BOT — DESCARGADOR DE TIKTOK
 *
 * Comandos:
 * .tt <enlace>
 * .tiktok <enlace>
 * .ttdl <enlace>
 */

import axios from 'axios'

global.emoji = '🎵'

const API_URL = 'https://api.tiktokdl.xyz/'

const TIKTOK_REGEX =
  /^(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/\S+$/i

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

    // 📌 Validar que exista un enlace.
    if (!input) {
      return conn.sendMessage(
        m.chat,
        {
          text:
            '⚡ *Debés ingresar un enlace de TikTok.*\n\n' +
            `📌 *Ejemplo:* ${usedPrefix + command} https://vm.tiktok.com/ZMreHF2dC/`
        },
        { quoted: m }
      )
    }

    // 🔎 Validar formato del enlace.
    if (!TIKTOK_REGEX.test(input)) {
      return conn.sendMessage(
        m.chat,
        { text: '❎ El enlace de TikTok no es válido.' },
        { quoted: m }
      )
    }

    await reaccionar(m, '⌛')

    // 🌐 Consultar la API.
    const { data } = await axios.get(API_URL, {
      params: { url: input },
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })

    if (!data || typeof data !== 'object') {
      throw new Error('La API devolvió una respuesta inválida.')
    }

    const videoUrl =
      typeof data.video === 'string'
        ? data.video
        : data.video?.url

    if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) {
      throw new Error(
        data.message || 'No se pudo obtener el video. Probá con otro enlace.'
      )
    }

    const title = String(data.title || 'Sin título')
    const author = String(data.author_name || 'Desconocido')
    const duration = data.duration ?? 'Desconocida'

    const caption = [
      '╭━━━〔 🎵 *WHATSAPP-BOT | TIKTOK* 〕━━━⬣',
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
    console.error('[TIKTOK] Error:', error?.response?.data || error)

    await reaccionar(m, '❌')

    const mensaje = error?.code === 'ECONNABORTED'
      ? 'La API tardó demasiado en responder. Intentá nuevamente.'
      : 'No se pudo descargar el video. El enlace puede ser privado o la API puede estar caída.'

    return conn.sendMessage(
      m.chat,
      { text: `❌ *Error de TikTok*\n\n${mensaje}` },
      { quoted: m }
    )
  }
}

handler.help = ['tt <enlace>', 'tiktok <enlace>', 'ttdl <enlace>']
handler.tags = ['descargas']
handler.command = /^(tt|tiktok|ttdl)$/i

export default handler
