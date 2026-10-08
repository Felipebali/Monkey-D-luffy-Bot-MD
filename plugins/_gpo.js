// 📂 plugins/gpo.js
// 📸 GPO — Get Profile Group
// 👑 SOLO OWNERS DEL BOT
//
// .gpo
// → Obtiene la foto de perfil del grupo actual
//
// ============================================================

let handler = async (m, { conn }) => {

  try {

    // ==========================================================
    // 👥 SOLO GRUPOS
    // ==========================================================

    if (!m.isGroup) {

      return m.reply(
`❌ *COMANDO NO DISPONIBLE*

Este comando solamente puede utilizarse dentro de un grupo.`
      )
    }

    // ==========================================================
    // 📱 NORMALIZAR NÚMERO
    // ==========================================================

    const normalizePhone = (id) => {

      if (!id) {
        return null
      }

      let value =
        String(id)

      // Nunca convertir un LID en número
      if (
        value.includes('@lid')
      ) {
        return null
      }

      value =
        value
          .split('@')[0]
          .split(':')[0]
          .replace(/\D/g, '')

      return value || null
    }

    // ==========================================================
    // 🔐 OBTENER OWNERS REALES
    // ==========================================================

    const ownerNumbers =
      Array.isArray(global.owner)
        ? global.owner
            .map(owner =>
              Array.isArray(owner)
                ? owner[0]
                : owner
            )
            .map(normalizePhone)
            .filter(Boolean)
        : []

    // ==========================================================
    // 👤 VERIFICAR SENDER
    // ==========================================================

    let sender =
      String(
        m.sender || ''
      )

    try {

      if (conn.decodeJid) {
        sender =
          conn.decodeJid(sender)
      }

    } catch {}

    const senderNumber =
      normalizePhone(sender)

    if (
      !senderNumber ||
      !ownerNumbers.includes(senderNumber)
    ) {

      return m.reply(
`🚫 *ACCESO DENEGADO*

Este comando está disponible únicamente para los owners del bot.`
      )
    }

    // ==========================================================
    // 🆔 ID DEL GRUPO
    // ==========================================================

    let groupId =
      String(
        m.chat || ''
      )

    try {

      if (conn.decodeJid) {
        groupId =
          conn.decodeJid(groupId)
      }

    } catch {}

    if (
      !groupId ||
      !groupId.includes('@g.us')
    ) {

      return m.reply(
        '❌ No se pudo identificar correctamente el grupo.'
      )
    }

    // ==========================================================
    // ⏳ REACCIÓN
    // ==========================================================

    try {
      await m.react('🖼️')
    } catch {}

    // ==========================================================
    // 📸 OBTENER FOTO DEL GRUPO
    // ==========================================================

    let ppUrl = null

    try {

      ppUrl =
        await conn.profilePictureUrl(
          groupId,
          'image'
        )

    } catch (error) {

      console.log(
        '⚠️ [GPO] No se pudo obtener la foto:',
        error?.message || error
      )

      // --------------------------------------------------------
      // 🔄 SEGUNDO INTENTO
      // --------------------------------------------------------

      try {

        ppUrl =
          await conn.profilePictureUrl(
            groupId,
            'preview'
          )

      } catch {}

    }

    // ==========================================================
    // ❌ SIN FOTO
    // ==========================================================

    if (!ppUrl) {

      try {
        await m.react('❌')
      } catch {}

      return m.reply(
`🖼️ *FOTO DEL GRUPO*

━━━━━━━━━━━━━━━━━━

❌ No se pudo obtener la foto de perfil de este grupo.

Puede que:

• El grupo no tenga foto.
• La foto tenga restricciones de privacidad.
• WhatsApp no permita acceder a ella en este momento.

━━━━━━━━━━━━━━━━━━`
      )
    }

    // ==========================================================
    // 📊 OBTENER NOMBRE DEL GRUPO
    // ==========================================================

    let groupName =
      'Grupo'

    try {

      const metadata =
        await conn.groupMetadata(
          groupId
        )

      if (
        metadata?.subject
      ) {
        groupName =
          metadata.subject
      }

    } catch {}

    // ==========================================================
    // 📤 ENVIAR FOTO
    // ==========================================================

    await conn.sendMessage(
      m.chat,
      {
        image: {
          url: ppUrl
        },

        caption:
`╭━━━〔 🖼️ *GPO* 〕━━━╮
┃
┃ 👥 *Grupo:* ${groupName}
┃
┃ 📸 *Foto de perfil*
┃
┃ ✅ Obtenida correctamente
┃
╰━━━━━━━━━━━━━━━━━━╯`
      },
      {
        quoted: m
      }
    )

    // ==========================================================
    // ✅ REACCIÓN FINAL
    // ==========================================================

    try {
      await m.react('📸')
    } catch {}

  } catch (error) {

    console.error(
      '❌ [GPO] Error:',
      error
    )

    try {
      await m.react('❌')
    } catch {}

    return m.reply(
`⚠️ *ERROR EN GPO*

No se pudo obtener la foto de perfil del grupo.

🔎 Revisá la consola del bot para más información.`
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = [
  'gpo'
]

handler.tags = [
  'owner',
  'tools'
]

handler.help = [
  'gpo'
]

handler.group = true

export default handler
