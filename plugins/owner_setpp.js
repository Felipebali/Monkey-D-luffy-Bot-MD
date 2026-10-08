// 📂 plugins/propietario-setpp.js
// 🖼️ Cambiar la foto de perfil del BOT citando una imagen
// 👑 SOLO OWNERS del bot
// ============================================================

import { downloadContentFromMessage } from "@whiskeysockets/baileys"


// ============================================================
// 📱 NORMALIZAR NÚMERO
// ============================================================

function normalizePhone(value) {
  if (!value) return null

  if (Array.isArray(value)) {
    value = value[0]
  }

  if (typeof value !== "string") {
    return null
  }

  // 🚫 No aceptar LIDs como owners
  if (value.includes("@lid")) {
    return null
  }

  const number = value
    .replace("@s.whatsapp.net", "")
    .replace("@c.us", "")
    .replace(/[^0-9]/g, "")

  if (!number) return null

  return number
}


// ============================================================
// 👑 OBTENER OWNERS REALES
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

  if (!number) {
    return false
  }

  return getOwners().includes(number)
}


// ============================================================
// 📥 DESCARGAR IMAGEN
// ============================================================

async function downloadImage(message) {

  const stream = await downloadContentFromMessage(
    message,
    "image"
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
    // 👑 VERIFICAR OWNER
    // ========================================================

    const sender = conn.decodeJid
      ? conn.decodeJid(m.sender)
      : m.sender

    if (!isOwner(sender)) {

      return m.reply(
        "🚫 Solo los *owners del bot* pueden cambiar la foto de perfil."
      )
    }


    // ========================================================
    // 📸 VERIFICAR IMAGEN CITADA
    // ========================================================

    if (!m.quoted) {

      return m.reply(
`🖼️ *CAMBIAR FOTO DEL BOT*

Debes responder/citar una imagen usando:

*.setpp*

También puedes usar:

*.cambiarpp*
*.botpp*`
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
      ""


    // ========================================================
    // 🚫 SOLO IMÁGENES
    // ========================================================

    if (!mime.startsWith("image/")) {

      return m.reply(
        "❌ El mensaje citado debe contener una *imagen válida*."
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
            text: "🖼️",
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
        "Error descargando imagen para setpp:",
        error
      )

      return m.reply(
        "❌ No pude descargar la imagen citada."
      )
    }


    // ========================================================
    // 🔍 VALIDAR BUFFER
    // ========================================================

    if (!buffer || !buffer.length) {

      return m.reply(
        "❌ La imagen está vacía o no pudo descargarse correctamente."
      )
    }


    // ========================================================
    // 🤖 JID DEL BOT
    // ========================================================

    const botJid = conn.decodeJid
      ? conn.decodeJid(conn.user?.jid)
      : conn.user?.jid

    if (!botJid) {

      return m.reply(
        "❌ No pude identificar el JID del bot."
      )
    }


    // ========================================================
    // 🖼️ ACTUALIZAR FOTO DEL BOT
    // ========================================================

    try {

      await conn.updateProfilePicture(
        botJid,
        buffer
      )

    } catch (error) {

      console.error(
        "Error actualizando foto del bot:",
        error
      )

      try {

        await conn.sendMessage(
          m.chat,
          {
            react: {
              text: "❌",
              key: m.key
            }
          }
        )

      } catch {}

      return m.reply(
`❌ *No pude cambiar la foto del bot.*

Verifica que:

• El bot esté conectado correctamente.
• La imagen sea válida.
• WhatsApp permita actualizar la foto en este momento.`
      )
    }


    // ========================================================
    // ✅ CONFIRMACIÓN
    // ========================================================

    await m.reply(
`╭━━━〔 🤖 *SET BOT PIC* 〕━━━╮
┃
┃ 🤖 *Bot:* Perfil actualizado
┃ 📸 *Foto de perfil:* Cambiada
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
            text: "✅",
            key: m.key
          }
        }
      )

    } catch {}


  } catch (error) {

    console.error(
      "❌ Error en propietario-setpp:",
      error
    )

    try {

      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: "❌",
            key: m.key
          }
        }
      )

    } catch {}

    return m.reply(
      "⚠️ Ocurrió un error al intentar cambiar la foto del bot."
    )
  }
}


// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  "setpp",
  "cambiarpp",
  "botpp"
]

handler.tags = [
  "owner"
]

handler.command = [
  "setpp",
  "cambiarpp",
  "botpp"
]

// 👑 SOLO OWNERS
handler.owner = true


export default handler
