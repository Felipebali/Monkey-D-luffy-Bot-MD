// 📂 plugins/_ver.js
// 📥 "m" SIN PREFIJO
// 👑 Solo owners
// 📩 Recupera multimedia y lo envía al grupo central
// 🚫 Sin reacciones
// 🚫 Sin avisos si falla

import fs from 'fs'
import path from 'path'
import { webp2png } from '../lib/webp2mp4.js'

// ============================================================
// 📌 GRUPO CENTRAL DE MEDIOS
// ============================================================

const MEDIA_GROUP_ID =
  '120363429424906972@g.us'


// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {

  return (global.owner || [])
    .map(o =>
      Array.isArray(o)
        ? o[0]
        : o
    )
    .filter(Boolean)
    .map(o =>
      String(o)
        .replace(/[^0-9]/g, '')
    )
    .filter(Boolean)
}


// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (
  m,
  { conn }
) => {

  // ==========================================================
  // 🔤 SOLO "m"
  // ==========================================================

  const text =
    String(m.text || '')
      .trim()
      .toLowerCase()

  if (text !== 'm')
    return


  // ==========================================================
  // 👑 VERIFICAR OWNER
  // ==========================================================

  const senderNumber =
    String(m.sender || '')
      .replace(/[^0-9]/g, '')

  const owners =
    getOwners()

  if (!owners.includes(senderNumber))
    return


  try {

    // ========================================================
    // 💬 DEBE SER RESPUESTA A UN MENSAJE
    // ========================================================

    const q =
      m.quoted

    if (!q)
      return


    // ========================================================
    // 📦 DETECTAR MULTIMEDIA
    // ========================================================

    const mime =
      q.mimetype ||
      q.mediaType ||
      ''

    if (
      !/webp|image|video/i.test(mime)
    )
      return


    // ========================================================
    // 📥 DESCARGAR
    // ========================================================

    let buffer =
      await q.download()

    if (!buffer)
      return


    let type = null
    let filenameSent = null
    let sendMime = mime


    // ========================================================
    // 🖼️ STICKER WEBP → PNG
    // ========================================================

    if (/webp/i.test(mime)) {

      const result =
        await webp2png(buffer)

      if (!result?.url)
        return


      const response =
        await fetch(result.url)

      if (!response.ok)
        return


      buffer =
        Buffer.from(
          await response.arrayBuffer()
        )


      type = 'image'
      sendMime = 'image/png'
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
        mime.split('/')[1] ||
        'jpg'

      filenameSent =
        `recuperado.${ext}`

      sendMime = mime
    }


    // ========================================================
    // 🎥 VIDEO
    // ========================================================

    else if (
      mime.startsWith('video/')
    ) {

      type = 'video'

      const ext =
        mime.split('/')[1] ||
        'mp4'

      filenameSent =
        `recuperado.${ext}`

      sendMime = mime
    }


    // ========================================================
    // ❌ TIPO NO SOPORTADO
    // ========================================================

    else {

      return
    }


    // ========================================================
    // 📁 CREAR CARPETA MEDIA
    // ========================================================

    const mediaFolder =
      './media'

    if (
      !fs.existsSync(mediaFolder)
    ) {

      fs.mkdirSync(
        mediaFolder,
        {
          recursive: true
        }
      )
    }


    // ========================================================
    // 🧹 PREPARAR BASE DE DATOS
    // ========================================================

    if (!global.db.data) {
      global.db.data = {}
    }

    if (
      !Array.isArray(
        global.db.data.mediaList
      )
    ) {

      global.db.data.mediaList = []
    }


    // ========================================================
    // 📄 GENERAR NOMBRE ÚNICO
    // ========================================================

    const filename =
      `${Date.now()}_${Math.floor(
        Math.random() * 999999
      )}`


    const extFile =
      filenameSent.includes('.')
        ? filenameSent
            .split('.')
            .pop()
        : 'bin'


    const finalName =
      `${filename}.${extFile}`


    const filepath =
      path.join(
        mediaFolder,
        finalName
      )


    // ========================================================
    // 💾 GUARDAR ARCHIVO
    // ========================================================

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
          ? (
              chatInfo?.subject ||
              ''
            )
          : null,

      date:
        new Date().toLocaleString(),

      savedByVer:
        true
    })


    // ========================================================
    // 📤 DESTINO
    // ========================================================
    // Ya NO se envía al privado del owner.
    // Se envía siempre al grupo central.

    const destination =
      MEDIA_GROUP_ID


    // ========================================================
    // 🖼️ ENVIAR IMAGEN
    // ========================================================

    if (type === 'image') {

      await conn.sendMessage(
        destination,
        {
          image: buffer,
          mimetype:
            sendMime ||
            'image/png',
          fileName:
            filenameSent
        }
      )
    }


    // ========================================================
    // 🎥 ENVIAR VIDEO
    // ========================================================

    else if (type === 'video') {

      await conn.sendMessage(
        destination,
        {
          video: buffer,
          mimetype:
            sendMime ||
            'video/mp4',
          fileName:
            filenameSent
        }
      )
    }


    // ========================================================
    // ✅ TERMINAR SILENCIOSAMENTE
    // ========================================================

    return


  } catch (e) {

    // 🚫 Sin avisos al usuario

    console.error(
      '❌ ERROR EN M:',
      e
    )

    return
  }
}


// ============================================================
// 🔤 ACTIVAR "m" SIN PREFIJO
// ============================================================

handler.customPrefix =
  /^m$/i


// ============================================================
// 🚫 SIN COMANDO CON PREFIJO
// ============================================================

handler.command =
  new RegExp()


// ============================================================
// 🏷️ CONFIGURACIÓN
// ============================================================

handler.help =
  ['m']

handler.tags =
  ['owner']


// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
