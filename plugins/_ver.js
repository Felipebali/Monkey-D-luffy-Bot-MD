// 📂 plugins/_ver.js
// 📥 "m" SIN PREFIJO
// 👑 Solo owners
// 📩 Recupera multimedia y lo envía al privado

import fs from 'fs'
import path from 'path'
import { webp2png } from '../lib/webp2mp4.js'

// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {
  return (global.owner || [])
    .map(o => Array.isArray(o) ? o[0] : o)
    .filter(Boolean)
    .map(o => String(o).replace(/[^0-9]/g, ''))
    .filter(Boolean)
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (m, { conn }) => {

  // ==========================================================
  // 🔤 SOLO "m"
  // ==========================================================

  const text =
    String(m.text || '')
      .trim()
      .toLowerCase()

  if (text !== 'm') return

  // ==========================================================
  // 👑 VERIFICAR OWNER
  // ==========================================================

  const senderNumber =
    String(m.sender || '')
      .replace(/[^0-9]/g, '')

  const owners = getOwners()

  if (!owners.includes(senderNumber)) {
    return
  }

  try {

    // ========================================================
    // 💬 DEBE SER RESPUESTA A UN MENSAJE
    // ========================================================

    const q = m.quoted

    if (!q) {

      return m.reply(
        '⚠️ Respondé a una imagen, video o sticker.'
      )
    }

    // ========================================================
    // 📦 DETECTAR MULTIMEDIA
    // ========================================================

    const mime =
      q.mimetype ||
      q.mediaType ||
      ''

    if (
      !/webp|image|video/i.test(mime)
    ) {

      return m.reply(
        '⚠️ El mensaje citado no contiene multimedia.'
      )
    }

    // ========================================================
    // 📥 DESCARGAR
    // ========================================================

    await m.react('📥')

    let buffer =
      await q.download()

    if (!buffer) {

      await m.react('✖️')

      return m.reply(
        '⚠️ No se pudo descargar el archivo.'
      )
    }

    let type = null
    let filenameSent = null

    // ========================================================
    // 🖼️ STICKER WEBP → PNG
    // ========================================================

    if (/webp/i.test(mime)) {

      const result =
        await webp2png(buffer)

      if (!result?.url) {

        await m.react('✖️')

        return m.reply(
          '⚠️ No se pudo convertir el sticker.'
        )
      }

      const response =
        await fetch(result.url)

      if (!response.ok) {

        await m.react('✖️')

        return m.reply(
          '⚠️ No se pudo obtener la imagen convertida.'
        )
      }

      buffer =
        Buffer.from(
          await response.arrayBuffer()
        )

      type = 'image'

      filenameSent = 'sticker.png'
    }

    // ========================================================
    // 🖼️ IMAGEN
    // ========================================================

    else if (
      mime.startsWith('image/')
    ) {

      type = 'image'

      const ext =
        mime.split('/')[1] || 'jpg'

      filenameSent =
        `recuperado.${ext}`
    }

    // ========================================================
    // 🎥 VIDEO
    // ========================================================

    else if (
      mime.startsWith('video/')
    ) {

      type = 'video'

      const ext =
        mime.split('/')[1] || 'mp4'

      filenameSent =
        `recuperado.${ext}`
    }

    // ========================================================
    // ❌ TIPO NO SOPORTADO
    // ========================================================

    else {

      await m.react('✖️')

      return m.reply(
        '⚠️ Tipo de archivo no compatible.'
      )
    }

    // ========================================================
    // 📁 CREAR CARPETA MEDIA
    // ========================================================

    const mediaFolder =
      './media'

    if (!fs.existsSync(mediaFolder)) {

      fs.mkdirSync(
        mediaFolder,
        {
          recursive: true
        }
      )
    }

    // ========================================================
    // 🧹 SINCRONIZAR MEDIA LIST
    // ========================================================

    if (!global.db.data) {
      global.db.data = {}
    }

    if (!Array.isArray(
      global.db.data.mediaList
    )) {

      global.db.data.mediaList = []
    }

    // ========================================================
    // 📄 GUARDAR ARCHIVO
    // ========================================================

    const filename =
      `${Date.now()}_${Math.floor(Math.random() * 999999)}`

    const extFile =
      filenameSent.includes('.')
        ? filenameSent.split('.').pop()
        : 'bin'

    const finalName =
      `${filename}.${extFile}`

    const filepath =
      path.join(
        mediaFolder,
        finalName
      )

    fs.writeFileSync(
      filepath,
      buffer
    )

    // ========================================================
    // 👥 INFORMACIÓN DEL GRUPO
    // ========================================================

    let chatInfo = null

    if (m.isGroup) {

      try {

        chatInfo =
          await conn.groupMetadata(
            m.chat
          )

      } catch {

        chatInfo = null
      }
    }

    // ========================================================
    // 💾 GUARDAR REGISTRO
    // ========================================================

    global.db.data.mediaList.push({

      id:
        global.db.data.mediaList.length + 1,

      filename:
        finalName,

      path:
        filepath,

      type,

      from:
        m.sender,

      groupId:
        m.isGroup
          ? m.chat
          : null,

      groupName:
        m.isGroup
          ? (chatInfo?.subject || '')
          : null,

      date:
        new Date().toLocaleString(),

      savedByVer:
        true
    })

    // ========================================================
    // 📩 ENVIAR AL PRIVADO DEL OWNER
    // ========================================================

    if (type === 'image') {

      await conn.sendMessage(
        m.sender,
        {
          image: buffer,
          mimetype: 'image/png',
          fileName: filenameSent,
          caption:
            '🌟 *Archivo recuperado correctamente.*'
        },
        {
          quoted: null
        }
      )

    }

    else if (type === 'video') {

      await conn.sendMessage(
        m.sender,
        {
          video: buffer,
          mimetype:
            mime || 'video/mp4',
          fileName: filenameSent,
          caption:
            '🌟 *Video recuperado correctamente.*'
        },
        {
          quoted: null
        }
      )
    }

    // ========================================================
    // ✅ FINALIZAR
    // ========================================================

    await m.react('✅')

  } catch (e) {

    console.error(
      '❌ ERROR EN M:',
      e
    )

    await m.react('✖️')

    return m.reply(
      '⚠️ Error al recuperar el archivo.'
    )
  }
}

// ============================================================
// 🔤 ACTIVAR "m" SIN PREFIJO
// ============================================================

handler.customPrefix = /^m$/i

// ============================================================
// 🚫 SIN COMANDO CON PREFIJO
// ============================================================

handler.command = new RegExp()

// ============================================================
// 🏷️ CONFIGURACIÓN
// ============================================================

handler.help = [
  'm'
]

handler.tags = [
  'owner'
]

// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
