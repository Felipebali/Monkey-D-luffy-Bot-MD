// 📂 plugins/hd.js
// 🖼️ Mejorador de imágenes — FelixCat_Bot
// 🚀 HD / Remini / Enhance

import fetch from 'node-fetch'
import FormData from 'form-data'

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

let handler = async (m, { conn }) => {
  try {

    // ==========================================================
    // 🖼️ OBTENER IMAGEN
    // ==========================================================

    const quoted = m.quoted || m

    const mime =
      quoted.mimetype ||
      quoted.msg?.mimetype ||
      quoted.mediaType ||
      ''

    if (!/^image\/(jpe?g|png|webp)$/i.test(mime)) {
      return m.reply(
`🖼️ *MEJORAR IMAGEN*

❌ No encontré una imagen válida.

📌 Respondé a una imagen con:
> .hd

También podés usar:
> .remini
> .enhance`
      )
    }

    // ==========================================================
    // 📥 DESCARGAR IMAGEN
    // ==========================================================

    const media = await quoted.download()

    if (!media || !Buffer.isBuffer(media)) {
      return m.reply('❌ No se pudo descargar la imagen.')
    }

    // ==========================================================
    // ⏳ MENSAJE DE PROCESAMIENTO
    // ==========================================================

    await conn.sendMessage(
      m.chat,
      {
        text:
`╭━━━〔 ✨ *MEJORANDO IMAGEN* 〕━━━╮
┃
┃ 🖼️ Procesando imagen...
┃ 🔍 Mejorando resolución
┃ ✨ Optimizando detalles
┃ 🚀 Un momento...
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
      },
      { quoted: m }
    )

    // ==========================================================
    // 🚀 PIXELCUT UPSCALE
    // ==========================================================

    const filename =
      `felixcat_${Date.now()}.jpg`

    const form = new FormData()

    form.append(
      'image',
      media,
      {
        filename,
        contentType: mime
      }
    )

    form.append('scale', '2')

    const response = await fetch(
      'https://api2.pixelcut.app/image/upscale/v1',
      {
        method: 'POST',
        headers: {
          ...form.getHeaders(),
          'accept': 'application/json',
          'x-client-version': 'web',
          'x-locale': 'en',
          'user-agent':
            'Mozilla/5.0'
        },
        body: form
      }
    )

    // ==========================================================
    // 📡 COMPROBAR RESPUESTA
    // ==========================================================

    if (!response.ok) {
      throw new Error(
        `La API respondió con HTTP ${response.status}`
      )
    }

    const contentType =
      response.headers.get('content-type') || ''

    if (!contentType.includes('application/json')) {
      throw new Error(
        'La API no devolvió una respuesta JSON válida.'
      )
    }

    const data = await response.json()

    // ==========================================================
    // 🔗 OBTENER RESULTADO
    // ==========================================================

    const resultUrl =
      data?.result_url ||
      data?.url ||
      data?.result?.url

    if (
      !resultUrl ||
      typeof resultUrl !== 'string' ||
      !/^https?:\/\//i.test(resultUrl)
    ) {
      console.error(
        'Respuesta de Pixelcut:',
        data
      )

      throw new Error(
        'La API no devolvió la imagen procesada.'
      )
    }

    // ==========================================================
    // 📥 DESCARGAR RESULTADO
    // ==========================================================

    const resultResponse =
      await fetch(resultUrl)

    if (!resultResponse.ok) {
      throw new Error(
        `No se pudo descargar el resultado (${resultResponse.status}).`
      )
    }

    const resultBuffer =
      Buffer.from(
        await resultResponse.arrayBuffer()
      )

    if (!resultBuffer.length) {
      throw new Error(
        'La imagen procesada está vacía.'
      )
    }

    // ==========================================================
    // 📤 ENVIAR IMAGEN HD
    // ==========================================================

    await conn.sendMessage(
      m.chat,
      {
        image: resultBuffer,
        mimetype: 'image/jpeg',
        caption:
`╭━━━〔 🚀 *IMAGEN MEJORADA* 〕━━━╮
┃
┃ ✨ Calidad mejorada
┃ 🔍 Resolución optimizada
┃ 🖼️ Procesamiento HD
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯
> FelixCat_Bot ⚡`
      },
      { quoted: m }
    )

  } catch (error) {

    console.error(
      '❌ Error en plugin HD:',
      error
    )

    await m.reply(
`❌ *NO SE PUDO MEJORAR LA IMAGEN*

⚠️ La API de mejora no respondió correctamente.

🔄 Probá nuevamente en unos segundos.`
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  'hd',
  'remini',
  'enhance'
]

handler.tags = [
  'tools'
]

handler.command = [
  'hd',
  'remini',
  'enhance'
]

handler.group = false
handler.limit = false

export default handler
