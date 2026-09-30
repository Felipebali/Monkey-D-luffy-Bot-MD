// 📂 plugins/imagen.js — FelixCat-Bot 🐾
// 🖼️ Busca y envía una imagen

import axios from 'axios'

const handler = async (m, { conn, text }) => {

  // ============================================================
  // 🔎 VALIDAR BÚSQUEDA
  // ============================================================

  if (!text?.trim()) {
    return conn.reply(
      m.chat,
      '❌ Escribí qué imagen querés buscar.\n\nEjemplo:\n*.imagen gato*',
      m
    )
  }

  await m.react('📷')

  try {

    const query =
      encodeURIComponent(
        text.trim()
      )

    // ==========================================================
    // 🌐 BUSCAR IMAGEN
    // ==========================================================

    const url =
      `https://source.unsplash.com/900x700/?${query}`

    const response =
      await axios.get(
        url,
        {
          responseType: 'arraybuffer',
          maxRedirects: 5,
          timeout: 15000,
          headers: {
            'User-Agent':
              'Mozilla/5.0'
          }
        }
      )

    // ==========================================================
    // 📦 COMPROBAR RESPUESTA
    // ==========================================================

    if (
      !response.data ||
      !response.data.length
    ) {
      throw new Error(
        'La búsqueda no devolvió ninguna imagen.'
      )
    }

    const buffer =
      Buffer.from(response.data)

    // ==========================================================
    // 📤 ENVIAR IMAGEN
    // ==========================================================

    await conn.sendMessage(
      m.chat,
      {
        image: buffer,
        mimetype: 'image/jpeg',
        fileName: 'imagen.jpg',
        caption:
          `🖼️ *Resultado de:* ${text.trim()}`
      },
      {
        quoted: m
      }
    )

    await m.react('✅')

  } catch (e) {

    console.error(
      '❌ Error buscando imagen:',
      e
    )

    await m.react('❌')

    return conn.reply(
      m.chat,
      `❌ No pude obtener una imagen de *${text.trim()}*.\n\n⚠️ El servicio de búsqueda puede estar temporalmente no disponible.`,
      m
    )
  }
}

// ============================================================
// 📋 CONFIGURACIÓN
// ============================================================

handler.help = [
  'imagen <texto>',
  'foto <texto>'
]

handler.tags = [
  'tools'
]

handler.command = [
  'imagen',
  'foto'
]

handler.group = true
handler.botAdmin = false

export default handler
