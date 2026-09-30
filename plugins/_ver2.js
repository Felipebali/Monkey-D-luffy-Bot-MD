// 📂 plugins/_ver.js — FelixCat-Bot 🐾
// ver / r → recupera multimedia en el grupo + copia al owner

import fs from 'fs'
import path from 'path'
import { webp2png } from '../lib/webp2mp4.js'

// ============================================================
// 👤 USUARIO CON PERMISO SOLO PARA r / ver
// ============================================================

const RECOVER_ONLY = '59894305091'

// ============================================================
// 👑 OBTENER OWNERS DESDE global.owner
// ============================================================

function getOwners() {
  return (global.owner || [])
    .map(o => Array.isArray(o) ? o[0] : o)
    .filter(Boolean)
    .map(o => String(o).replace(/[^0-9]/g, ''))
    .filter(Boolean)
}

// ============================================================
// 👑 OBTENER JID DEL OWNER PRINCIPAL
// ============================================================

function getMainOwnerJid() {
  const owners = getOwners()

  if (!owners.length) return null

  return owners[0] + '@s.whatsapp.net'
}

// ============================================================
// 📦 HANDLER
// ============================================================

let handler = async (m, { conn }) => {

  // ============================================================
  // 🔐 VALIDAR PERMISOS
  // ============================================================

  const owners = getOwners()

  const senderNumber = String(m.sender || '')
    .replace(/[^0-9]/g, '')

  const isOwner = owners.includes(senderNumber)

  if (!isOwner && senderNumber !== RECOVER_ONLY) {
    await m.react('✖️')

    return conn.reply(
      m.chat,
      '❌ No tenés permiso para usar este comando.',
      m
    )
  }

  // ============================================================
  // 🗃️ BASE DE DATOS
  // ============================================================

  if (!global.db.data)
    global.db.data = {}

  global.db.data.recoveredMedia =
    global.db.data.recoveredMedia || []

  try {

    // ============================================================
    // 📌 MENSAJE CITADO
    // ============================================================

    const q = m.quoted

    if (!q) {
      return conn.reply(
        m.chat,
        '⚠️ Respondé al mensaje con multimedia.',
        m
      )
    }

    // ============================================================
    // 🎞️ TIPO DE MULTIMEDIA
    // ============================================================

    const mime = q.mimetype || q.mediaType || ''

    if (!/webp|image|video/i.test(mime)) {
      return conn.reply(
        m.chat,
        '⚠️ El mensaje citado no contiene multimedia.',
        m
      )
    }

    await m.react('📥')

    // ============================================================
    // 📥 DESCARGAR MEDIA
    // ============================================================

    let buffer = await q.download()

    if (!buffer) {
      throw new Error('No se pudo descargar la multimedia.')
    }

    let type = 'image'
    let ext = 'jpg'

    // ============================================================
    // 🖼️ STICKER WEBP → PNG
    // ============================================================

    if (/webp/i.test(mime)) {

      const result = await webp2png(buffer)

      if (!result?.url) {
        throw new Error(
          'No se pudo convertir el sticker.'
        )
      }

      const response = await fetch(result.url)

      if (!response.ok) {
        throw new Error(
          'No se pudo descargar el PNG convertido.'
        )
      }

      buffer = Buffer.from(
        await response.arrayBuffer()
      )

      type = 'image'
      ext = 'png'
    }

    // ============================================================
    // 🎥 VIDEO
    // ============================================================

    else if (/video/i.test(mime)) {

      type = 'video'
      ext = 'mp4'
    }

    // ============================================================
    // 📸 IMAGEN
    // ============================================================

    else if (/image/i.test(mime)) {

      type = 'image'
      ext = 'jpg'
    }

    // ============================================================
    // 📤 ENVIAR AL GRUPO
    // ============================================================

    await conn.sendMessage(
      m.chat,
      {
        [type]: buffer,
        caption: '📦 *Archivo recuperado.*'
      },
      {
        quoted: m
      }
    )

    // ============================================================
    // 📁 CREAR CARPETA MEDIA
    // ============================================================

    const mediaFolder = './media'

    if (!fs.existsSync(mediaFolder)) {
      fs.mkdirSync(mediaFolder, {
        recursive: true
      })
    }

    // ============================================================
    // 💾 GUARDAR ARCHIVO
    // ============================================================

    const finalName =
      `${Date.now()}_${Math.floor(Math.random() * 9999)}.${ext}`

    const filepath =
      path.join(mediaFolder, finalName)

    fs.writeFileSync(
      filepath,
      buffer
    )

    // ============================================================
    // 👥 INFORMACIÓN DEL GRUPO
    // ============================================================

    let chatInfo = null

    if (m.isGroup) {

      try {
        chatInfo =
          await conn.groupMetadata(m.chat)
      } catch {
        chatInfo = null
      }
    }

    // ============================================================
    // 🆔 REGISTRO
    // ============================================================

    const record = {

      id:
        global.db.data.recoveredMedia.length + 1,

      filename:
        finalName,

      path:
        filepath,

      type,

      from:
        m.sender,

      groupName:
        m.isGroup
          ? (chatInfo?.subject || '')
          : null,

      date:
        new Date().toLocaleString()
    }

    // ============================================================
    // ➕ GUARDAR REGISTRO
    // ============================================================

    global.db.data.recoveredMedia.push(record)

    if (global.db.write) {
      await global.db.write()
    }

    // ============================================================
    // 👑 COPIA AL OWNER PRINCIPAL
    // ============================================================

    const OWNER_JID = getMainOwnerJid()

    if (OWNER_JID) {

      try {

        await conn.sendMessage(
          OWNER_JID,
          {
            [type]: buffer,

            caption:
`📥 *MEDIA RECUPERADA*

🆔 *ID:* ${record.id}
👤 *Recuperada por:* ${senderNumber}
🏷️ *Grupo:* ${record.groupName || 'Privado'}
📅 *Fecha:* ${record.date}`
          }
        )

      } catch (err) {

        console.log(
          '⚠️ No se pudo enviar al owner:',
          err
        )
      }
    }

    // ============================================================
    // ✅ FINALIZADO
    // ============================================================

    await m.react('✅')

  } catch (e) {

    console.error(
      '❌ Error en _ver.js:',
      e
    )

    try {
      await m.react('✖️')
    } catch {}

    await conn.reply(
      m.chat,
      '⚠️ Error al recuperar el archivo.',
      m
    )
  }
}

// ============================================================
// 📋 CONFIGURACIÓN
// ============================================================

handler.help = [
  'ver',
  'r'
]

handler.tags = [
  'tools'
]

handler.command = [
  'ver',
  'r'
]

export default handler
