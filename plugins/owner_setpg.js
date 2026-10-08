// 📂 plugins/grupos-setpg.js
// 🖼️ Cambiar foto del GRUPO citando una imagen
// 👑 SOLO OWNERS del bot
// ============================================================

import { downloadContentFromMessage } from '@whiskeysockets/baileys'


// ============================================================
// 📱 NORMALIZAR NÚMERO
// ============================================================

function normalizePhone(value) {
  if (!value) return null

  if (Array.isArray(value)) {
    value = value[0]
  }

  if (typeof value !== 'string') {
    return null
  }

  // 🚫 No aceptar LIDs
  if (value.includes('@lid')) {
    return null
  }

  const number = value
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace(/[^0-9]/g, '')

  if (!number) return null

  return number
}


// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {
  return (global.owner || [])
    .map(owner => normalizePhone(owner))
    .filter(Boolean)
}


// ============================================================
// 👑 VERIFICAR OWNER
// ============================================================

function isOwner(sender) {
  const number = normalizePhone(sender)

  if (!number) return false

  return getOwners().includes(number)
}


// ============================================================
// 📥 DESCARGAR IMAGEN
// ============================================================

async function downloadImage(message) {
  const stream = await downloadContentFromMessage(
    message,
    'image'
  )

  const chunks = []

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}


// ============================================================
// 🖼️ HANDLER
// ============================================================

let handler = async (m, { conn }) => {

  try {

    // ========================================================
    // 👥 SOLO GRUPOS
    // ========================================================

    if (!m.isGroup) {
      return m.reply(
        '❌ Este comando solo funciona en grupos.'
      )
    }


    // ========================================================
    // 👑 VERIFICAR OWNER
    // ========================================================

    const sender = conn.decodeJid
      ? conn.decodeJid(m.sender)
      : m.sender

    if (!isOwner(sender)) {
      return m.reply(
        '🚫 Solo los *owners del bot* pueden cambiar la foto del grupo.'
      )
    }


    // ========================================================
    // 📸 VERIFICAR IMAGEN CITADA
    // ========================================================

    if (!m.quoted) {
      return m.reply(
`🖼️ *CAMBIAR FOTO DEL GRUPO*

Debes responder/citar una imagen usando:

*.setpg*

También puedes usar:

*.cambiarpg*
*.grouppic*`
      )
    }


    const quoted = m.quoted

    const quotedMessage =
      quoted.msg ||
      quoted.message ||
      quoted

    const mime =
      quoted.mimetype ||
      quotedMessage?.mimetype ||
      ''


    // ========================================================
    // 🚫 SOLO IMÁGENES
    // ========================================================

    if (!mime.startsWith('image/')) {
      return m.reply(
        '❌ El mensaje citado debe contener una *imagen válida*.'
      )
    }


    // ========================================================
    // ⏳ REACCIÓN
    // ========================================================

    try {
      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '🖼️',
            key: m.key
          }
        }
      )
    } catch {}


    // ========================================================
    // 📥 DESCARGAR IMAGEN
    // ========================================================

    let buffer

    try {

      buffer = await downloadImage(quotedMessage)

    } catch (error) {

      console.error(
        'Error descargando imagen para setpg:',
        error
      )

      return m.reply(
        '❌ No pude descargar la imagen citada.'
      )
    }


    // ========================================================
    // 🔍 VALIDAR BUFFER
    // ========================================================

    if (!buffer || !buffer.length) {
      return m.reply(
        '❌ La imagen está vacía o no pudo descargarse correctamente.'
      )
    }


    // ========================================================
    // 🖼️ CAMBIAR FOTO DEL GRUPO
    // ========================================================

    try {

      await conn.updateProfilePicture(
        m.chat,
        buffer
      )

    } catch (error) {

      console.error(
        'Error actualizando foto del grupo:',
        error
      )

      try {
        await conn.sendMessage(
          m.chat,
          {
            react: {
              text: '❌',
              key: m.key
            }
          }
        )
      } catch {}

      return m.reply(
`❌ *No pude cambiar la foto del grupo.*

Verifica que:

• El bot siga dentro del grupo.
• El bot tenga permisos suficientes.
• La imagen sea válida.`
      )
    }


    // ========================================================
    // 👥 OBTENER NOMBRE DEL GRUPO
    // ========================================================

    let groupName = 'Grupo'

    try {

      const metadata =
        await conn.groupMetadata(m.chat)

      if (metadata?.subject) {
        groupName = metadata.subject
      }

    } catch {}


    // ========================================================
    // ✅ CONFIRMACIÓN
    // ========================================================

    await m.reply(
`╭━━━〔 🖼️ *SET GROUP PIC* 〕━━━╮
┃
┃ 👥 *Grupo:* ${groupName}
┃ 📸 *Foto de perfil actualizada*
┃ 👑 *Por:* Owner del bot
┃
┃ ✅ *Cambio realizado correctamente*
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
    )


    // ========================================================
    // ✅ REACCIÓN FINAL
    // ========================================================

    try {
      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '✅',
            key: m.key
          }
        }
      )
    } catch {}


  } catch (error) {

    console.error(
      '❌ Error en plugins/grupos-setpg.js:',
      error
    )

    try {
      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '❌',
            key: m.key
          }
        }
      )
    } catch {}

    return m.reply(
      '⚠️ Ocurrió un error al intentar cambiar la foto del grupo.'
    )
  }
}


// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  'setpg',
  'cambiarpg',
  'grouppic'
]

handler.tags = [
  'owner',
  'grupo'
]

handler.command = [
  'setpg',
  'cambiarpg',
  'grouppic'
]

handler.group = true

// 👑 SOLO OWNERS
handler.owner = true


export default handler
