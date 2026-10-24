
/**
 * 📂 plugins/tiktok.js
 * 🎵 WHATSAPP-BOT — DESCARGADOR DE TIKTOK
 *
 * Comandos: .tt / .tiktok / .ttdl
 */

import axios from 'axios'

global.emoji = '🎵'

const API_URL = 'https://api.tiktokdl.xyz/'

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const react = async emoji => {
    try {
      if (typeof m.react === 'function') {
        await m.react(emoji)
      }
    } catch {}
  }

  try {
    const input = args?.[0]?.trim()

    // 📌 Comprobar que se haya ingresado un enlace.
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

    // 🔎 Validar el formato del enlace.
    let url

    try {
      url = new URL(input.startsWith('http') ? input : `https://${input}`)
    } catch {
      return conn.sendMessage(
        m.chat,
        { text: '❎ Enlace de TikTok inválido.' },
        { quoted: m }
      )
    }

    const host = url.hostname.toLowerCase()
    const esTikTok =
      host === 'tiktok.com' ||
      host.endsWith('.tiktok.com')

    if (!esTikTok) {
      return conn.sendMessage(
        m.chat,
        { text: '❎ El enlace debe pertenecer a TikTok.' },
        { quoted: m }
      )
    }

    await react('⌛')

    // 🌐 Consultar la API.
    const { data } = await axios.get(API_URL, {
      params: { url: url.href },
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })

    if (!data || !data.video) {
      throw new Error(
        data?.message || 'No se pudo obtener el video de TikTok.'
      )
    }

    const videoUrl =
      typeof data.video === 'string'
        ? data.video
        : data.video.url

    if (
      typeof videoUrl !== 'string' ||
      !/^https?:\/\//i.test(videoUrl)
    ) {
      throw new Error('La API no devolvió una URL de video válida.')
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

    // 📥 Enviar el video al chat.
    await conn.sendMessage(
      m.chat,
      {
        video: { url: videoUrl },
        caption,
        mimetype: 'video/mp4'
      },
      { quoted: m }
    )

    await react('✅')
  } catch (e) {
    console.error(
      '[TIKTOK] Error:',
      e.response?.data || e.message || e
    )

    await react('❌')

    const mensaje = e.code === 'ECONNABORTED'
      ? 'La API tardó demasiado en responder. Intentá nuevamente.'
      : e.response?.status === 429
        ? 'La API recibió demasiadas solicitudes. Esperá un momento.'
        : 'No se pudo descargar el video. Puede haber fallado la API o el enlace.'

    return conn.sendMessage(
      m.chat,
      {
        text: `❌ *Error de TikTok*\n\n${mensaje}`
      },
      { quoted: m }
    )
  }
}

handler.help = ['tt <enlace>', 'tiktok <enlace>', 'ttdl <enlace>']
handler.tags = ['descargas']
handler.command = /^(tt|tiktok|ttdl)$/i

export default handler
