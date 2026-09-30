// 📂 plugins/toimg.js
// 🖼️ Convierte un sticker en imagen PNG
// Comandos: .img / .jpg

import { execFile } from 'child_process'
import { tmpdir } from 'os'
import path from 'path'
import fs from 'fs'

// ============================================================
// 👑 OBTENER OWNERS DESDE global.owner
// ============================================================

function getOwners() {
  return (global.owner || [])
    .map(owner => Array.isArray(owner) ? owner[0] : owner)
    .filter(Boolean)
    .map(owner =>
      String(owner).replace(/[^0-9]/g, '')
    )
}

// ============================================================
// 🖼️ HANDLER
// ============================================================

let handler = async (m, { conn }) => {

  // ==========================================================
  // 👑 SOLO OWNERS
  // ==========================================================

  const senderNum =
    String(m.sender || '')
      .replace(/[^0-9]/g, '')

  const owners = getOwners()

  if (!owners.includes(senderNum))
    return

  // ==========================================================
  // 📌 DEBE RESPONDER A UN STICKER
  // ==========================================================

  if (!m.quoted) {
    return m.reply(
      '⚠️ Respondé a un sticker para convertirlo en imagen.'
    )
  }

  const mime =
    m.quoted.mimetype || ''

  if (!/webp/i.test(mime)) {
    return m.reply(
      '⚠️ El mensaje citado no parece ser un sticker.'
    )
  }

  // ==========================================================
  // 📥 DESCARGAR STICKER
  // ==========================================================

  let media

  try {

    media =
      await m.quoted.download()

    if (!media) {
      return m.reply(
        '❌ No pude descargar el sticker.'
      )
    }

  } catch (e) {

    console.error(
      '❌ Error descargando sticker:',
      e
    )

    return m.reply(
      '❌ Error al descargar el sticker.'
    )
  }

  // ==========================================================
  // 📁 ARCHIVOS TEMPORALES
  // ==========================================================

  const id =
    `${Date.now()}_${Math.floor(Math.random() * 9999)}`

  const input =
    path.join(
      tmpdir(),
      `sticker_${id}.webp`
    )

  const output =
    path.join(
      tmpdir(),
      `sticker_${id}.png`
    )

  try {

    fs.writeFileSync(
      input,
      media
    )

  } catch (e) {

    console.error(e)

    return m.reply(
      '❌ Error al preparar el sticker.'
    )
  }

  // ==========================================================
  // 🔄 CONVERTIR WEBP → PNG
  // ==========================================================

  execFile(
    'ffmpeg',
    [
      '-y',
      '-i',
      input,
      output
    ],
    async (err) => {

      // Borrar WebP temporal
      try {
        if (fs.existsSync(input))
          fs.unlinkSync(input)
      } catch {}

      if (err) {

        console.error(
          '❌ Error FFmpeg:',
          err
        )

        try {
          if (fs.existsSync(output))
            fs.unlinkSync(output)
        } catch {}

        return m.reply(
          '❌ Error al convertir el sticker en imagen.'
        )
      }

      try {

        // ====================================================
        // 🖼️ LEER PNG
        // ====================================================

        const img =
          fs.readFileSync(output)

        // ====================================================
        // 📤 ENVIAR COMO IMAGEN
        // ====================================================

        await conn.sendMessage(
          m.chat,
          {
            image: img,
            mimetype: 'image/png',
            fileName: 'sticker.png',
            caption: '🖼️ *Sticker convertido en imagen.*'
          },
          {
            quoted: m
          }
        )

      } catch (e) {

        console.error(
          '❌ Error enviando imagen:',
          e
        )

        await m.reply(
          '❌ Se convirtió el sticker, pero ocurrió un error al enviar la imagen.'
        )

      } finally {

        // ====================================================
        // 🗑️ LIMPIAR ARCHIVO TEMPORAL
        // ====================================================

        try {
          if (fs.existsSync(output))
            fs.unlinkSync(output)
        } catch {}

      }
    }
  )
}

// ============================================================
// 📋 CONFIGURACIÓN
// ============================================================

handler.help = [
  'img',
  'jpg'
]

handler.tags = [
  'tools'
]

handler.command = [
  'img',
  'jpg'
]

export default handler
