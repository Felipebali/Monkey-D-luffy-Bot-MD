// 📂 plugins/nombre.js
// 👑 Cambiar el nombre del GRUPO
// 🔐 SOLO OWNERS del bot
// ============================================================


// ============================================================
// 📱 NORMALIZAR NÚMERO
// ============================================================

function normalizePhone(value) {

  if (!value)
    return null

  if (Array.isArray(value)) {
    value = value[0]
  }

  if (typeof value !== 'string')
    return null

  // 🚫 No aceptar LIDs como owners
  if (value.includes('@lid'))
    return null

  const number = value
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace(/[^0-9]/g, '')

  if (!number)
    return null

  return number
}


// ============================================================
// 👑 OBTENER OWNERS REALES
// ============================================================

function getOwners() {

  return (global.owner || [])
    .map(owner =>
      normalizePhone(owner)
    )
    .filter(Boolean)
}


// ============================================================
// 👑 VERIFICAR OWNER
// ============================================================

function isOwner(sender) {

  const number =
    normalizePhone(sender)

  if (!number)
    return false

  return getOwners()
    .includes(number)
}


// ============================================================
// ✏️ HANDLER
// ============================================================

let handler = async (m, { conn, text }) => {

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

    const sender =
      conn.decodeJid
        ? conn.decodeJid(m.sender)
        : m.sender

    if (!isOwner(sender)) {

      return m.reply(
        '🚫 Solo los *owners del bot* pueden cambiar el nombre del grupo.'
      )
    }


    // ========================================================
    // 📝 OBTENER NUEVO NOMBRE
    // ========================================================

    const nuevoNombre =
      String(text || '').trim()


    // ========================================================
    // 📌 MOSTRAR USO
    // ========================================================

    if (!nuevoNombre) {

      return m.reply(
`╭━━━〔 ✏️ *CAMBIAR NOMBRE* 〕━━━╮
┃
┃ 👥 Cambia el nombre del grupo.
┃
┃ 📌 *Uso:*
┃ .name <nuevo nombre>
┃
┃ 💬 *Ejemplo:*
┃ .name WhatsApp-Bot Oficial
┃
┃ 👑 *Acceso:* Solo Owners
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
      )
    }


    // ========================================================
    // 📏 VALIDAR NOMBRE
    // ========================================================

    if (nuevoNombre.length > 100) {

      return m.reply(
`❌ *Nombre demasiado largo.*

📏 Máximo permitido:
*100 caracteres.*

📝 Tu nombre tiene:
*${nuevoNombre.length} caracteres.*`
      )
    }


    // ========================================================
    // 🚫 VALIDAR NOMBRE VACÍO
    // ========================================================

    if (!nuevoNombre.replace(/\s/g, '')) {

      return m.reply(
        '❌ El nombre del grupo no puede estar vacío.'
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
            text: '✏️',
            key: m.key
          }
        }
      )

    } catch {}


    // ========================================================
    // 👥 OBTENER NOMBRE ACTUAL
    // ========================================================

    let nombreAnterior =
      'Grupo'

    try {

      const metadata =
        await conn.groupMetadata(m.chat)

      if (metadata?.subject) {
        nombreAnterior =
          metadata.subject
      }

    } catch {}


    // ========================================================
    // ✏️ CAMBIAR NOMBRE DEL GRUPO
    // ========================================================

    try {

      await conn.groupUpdateSubject(
        m.chat,
        nuevoNombre
      )

    } catch (error) {

      console.error(
        '❌ Error actualizando nombre del grupo:',
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
`❌ *No pude cambiar el nombre del grupo.*

Verifica que:

• El bot siga dentro del grupo.
• El bot tenga permisos de administrador.
• El nombre sea válido.
• WhatsApp permita modificar la información del grupo.`
      )
    }


    // ========================================================
    // ✅ CONFIRMACIÓN
    // ========================================================

    await m.reply(
`╭━━━〔 ✏️ *NOMBRE ACTUALIZADO* 〕━━━╮
┃
┃ 👥 *Grupo:* ${nuevoNombre}
┃
┃ 📝 *Anterior:* ${nombreAnterior}
┃ 📝 *Nuevo:* ${nuevoNombre}
┃
┃ 👑 *Modificado por:* Owner
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
      '❌ Error en plugins/nombre.js:',
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
      '⚠️ Ocurrió un error al intentar cambiar el nombre del grupo.'
    )
  }
}


// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  'name <nombre>',
  'nombre <nombre>'
]

handler.tags = [
  'owner',
  'grupo'
]

handler.command = [
  'name',
  'nombre'
]

handler.group = true

// 👑 SOLO OWNERS
handler.owner = true


export default handler
