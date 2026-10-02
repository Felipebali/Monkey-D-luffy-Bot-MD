// 📂 plugins/_HD.js
// 🖼️ FelixCat_Bot — Mejorador HD
// 🚀 Real-ESRGAN local

import fetch from 'node-fetch'
import FormData from 'form-data'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const ESRGAN_URL =
  process.env.ESRGAN_URL ||
  'http://127.0.0.1:5000/upscale'

// ============================================================
// 🖼️ OBTENER MIME
// ============================================================

function getMime(media) {
  return (
    media?.mimetype ||
    media?.msg?.mimetype ||
    media?.mediaType ||
    ''
  )
}

// ============================================================
// 📦 OBTENER IMAGEN
// ============================================================

async function getImage(m) {
  const quoted = m.quoted || m
  const mime = getMime(quoted)

  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mime)) {
    return null
  }

  const buffer = await quoted.download()

  if (!buffer || !Buffer.isBuffer(buffer)) {
    return null
  }

  return {
    buffer,
    mime
  }
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (m, { conn }) => {
  try {

    // ========================================================
    // 🖼️ BUSCAR IMAGEN
    // ========================================================

    const image = await getImage(m)

    if (!image) {
      return m.reply(
`🖼️ *MEJORADOR HD*

❌ No encontré una imagen válida.

📌 Respondé a una imagen con:

> .hd

También podés usar:

> .remini
> .enhance`
      )
    }

    // ========================================================
    // 📤 CREAR FORMULARIO
    // ========================================================

    const form = new FormData()

    form.append(
      'image',
      image.buffer,
      {
        filename: `image_${Date.now()}.jpg`,
        contentType: image.mime
      }
    )

    // ========================================================
    // 🚀 ENVIAR A REAL-ESRGAN
    // ========================================================

    const response = await fetch(
      ESRGAN_URL,
      {
        method: 'POST',
        headers: {
          ...form.getHeaders()
        },
        body: form
      }
    )

    // ========================================================
    // ❌ ERROR
    // ========================================================

    if (!response.ok) {
      const errorText =
        await response.text().catch(() => '')

      console.error(
        'Real-ESRGAN:',
        response.status,
        errorText
      )

      throw new Error(
        `Servidor Real-ESRGAN respondió ${response.status}`
      )
    }

    // ========================================================
    // 📥 RESULTADO
    // ========================================================

    const contentType =
      response.headers.get('content-type') || ''

    let resultBuffer

    // ========================================================
    // 🖼️ IMAGEN DIRECTA
    // ========================================================

    if (contentType.startsWith('image/')) {

      resultBuffer =
        Buffer.from(
          await response.arrayBuffer()
        )

    }

    // ========================================================
    // 📦 JSON
    // ========================================================

    else {

      const data =
        await response.json()

      const result =
        data?.url ||
        data?.result_url ||
        data?.image ||
        data?.output

      if (!result) {
        throw new Error(
          'Real-ESRGAN no devolvió una imagen.'
        )
      }

      // ------------------------------------------------------
      // BASE64
      // ------------------------------------------------------

      if (
        typeof result === 'string' &&
        result.startsWith('data:image')
      ) {

        const base64 =
          result.split(',')[1]

        resultBuffer =
          Buffer.from(
            base64,
            'base64'
          )

      }

      // ------------------------------------------------------
      // URL
      // ------------------------------------------------------

      else if (
        typeof result === 'string' &&
        /^https?:\/\//i.test(result)
      ) {

        const resultResponse =
          await fetch(result)

        if (!resultResponse.ok) {
          throw new Error(
            'No se pudo descargar la imagen mejorada.'
          )
        }

        resultBuffer =
          Buffer.from(
            await resultResponse.arrayBuffer()
          )

      }

      else {
        throw new Error(
          'Formato de respuesta desconocido.'
        )
      }
    }

    // ========================================================
    // 🔎 VALIDAR
    // ========================================================

    if (
      !resultBuffer ||
      !resultBuffer.length
    ) {
      throw new Error(
        'La imagen procesada está vacía.'
      )
    }

    // ========================================================
    // 📤 ENVIAR RESULTADO
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        image: resultBuffer,
        mimetype: 'image/jpeg',
        fileName:
          `FelixCat_HD_${Date.now()}.jpg`,
        caption:
`╭━━━〔 ✨ *FELIXCAT HD* 〕━━━╮
┃
┃ 🖼️ Imagen mejorada
┃ 🔍 Resolución optimizada
┃ 🚀 Real-ESRGAN
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
      },
      {
        quoted: m
      }
    )

  } catch (error) {

    console.error(
      '❌ Error en plugin HD:',
      error
    )

    await m.reply(
`❌ *NO SE PUDO MEJORAR LA IMAGEN*

⚠️ El servidor Real-ESRGAN no está disponible.

🔧 Servidor configurado:
${ESRGAN_URL}`
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
