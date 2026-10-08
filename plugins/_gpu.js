// 📂 plugins/gpu.js
// 🖼️ GPU — Get Profile User
// 👑 SOLO OWNERS DEL BOT
//
// .gpu @usuario
// .gpu 5989XXXXXXXX
// responder mensaje + .gpu
//
// ============================================================

let handler = async (m, { conn, args }) => {

  try {

    // ==========================================================
    // 🔐 FUNCIONES AUXILIARES
    // ==========================================================

    const normalizePhone = (id) => {

      if (!id) return null

      let value = String(id)

      // Nunca convertir un LID en número
      if (value.includes('@lid')) {
        return null
      }

      value = value
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '')

      return value || null
    }

    const getSenderNumber = () => {

      let sender = String(
        m.sender || ''
      )

      try {

        if (conn.decodeJid) {
          sender = conn.decodeJid(sender)
        }

      } catch {}

      return normalizePhone(sender)
    }

    // ==========================================================
    // 👑 OBTENER OWNERS REALES
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
    // 🔐 VERIFICAR PERMISOS
    // ==========================================================

    const senderNumber =
      getSenderNumber()

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
    // 🎯 DETERMINAR OBJETIVO
    // ==========================================================

    let target = null

    // ----------------------------------------------------------
    // 👤 MENCIÓN
    // ----------------------------------------------------------

    if (
      Array.isArray(m.mentionedJid) &&
      m.mentionedJid.length
    ) {

      target =
        m.mentionedJid[0]
    }

    // ----------------------------------------------------------
    // 💬 MENSAJE CITADO
    // ----------------------------------------------------------

    else if (
      m.quoted?.sender
    ) {

      target =
        m.quoted.sender
    }

    // ----------------------------------------------------------
    // 📱 NÚMERO ESCRITO
    // ----------------------------------------------------------

    else if (
      args?.[0]
    ) {

      const number =
        normalizePhone(
          args[0]
        )

      if (
        !number ||
        number.length < 8
      ) {

        return m.reply(
          `❌ *NÚMERO INVÁLIDO*

📌 Ejemplo:

\`.gpu 5989XXXXXXXX\``
        )
      }

      target =
        `${number}@s.whatsapp.net`
    }

    // ==========================================================
    // ❌ SIN OBJETIVO
    // ==========================================================

    if (!target) {

      return m.reply(
`🖼️ *GPU — FOTO DE PERFIL*

━━━━━━━━━━━━━━━━━━

👤 Indicá el usuario cuya foto querés obtener.

📌 *Formas de usarlo:*

• \`.gpu @usuario\`
• \`.gpu 5989XXXXXXXX\`
• Respondé un mensaje y escribí \`.gpu\`

━━━━━━━━━━━━━━━━━━`
      )
    }

    // ==========================================================
    // 🔧 NORMALIZAR TARGET
    // ==========================================================

    if (
      typeof target !== 'string'
    ) {

      if (target?.id) {

        target =
          target.id

      } else if (
        target?.jid
      ) {

        target =
          target.jid

      } else {

        target =
          String(target)
      }
    }

    // ----------------------------------------------------------
    // 🔄 DECODIFICAR JID
    // ----------------------------------------------------------

    try {

      if (conn.decodeJid) {
        target =
          conn.decodeJid(target)
      }

    } catch {}

    target =
      String(target)
        .trim()

    // ----------------------------------------------------------
    // 📱 SI SOLO ES NÚMERO
    // ----------------------------------------------------------

    if (
      !target.includes('@')
    ) {

      const number =
        normalizePhone(target)

      if (!number) {

        return m.reply(
          '❌ No se pudo identificar al usuario.'
        )
      }

      target =
        `${number}@s.whatsapp.net`
    }

    // ==========================================================
    // 🛡️ VALIDAR TARGET
    // ==========================================================

    const targetNumber =
      normalizePhone(target)

    if (!targetNumber) {

      return m.reply(
        '❌ No se pudo identificar correctamente al usuario.'
      )
    }

    // ==========================================================
    // ⏳ REACCIÓN DE PROCESANDO
    // ==========================================================

    try {
      await m.react('🖼️')
    } catch {}

    // ==========================================================
    // 📸 OBTENER FOTO
    // ==========================================================

    let ppUrl = null

    try {

      ppUrl =
        await conn.profilePictureUrl(
          target,
          'image'
        )

    } catch (error) {

      console.log(
        '⚠️ [GPU] No se pudo obtener imagen:',
        error?.message || error
      )

      // --------------------------------------------------------
      // 🔄 SEGUNDO INTENTO
      // --------------------------------------------------------

      try {

        ppUrl =
          await conn.profilePictureUrl(
            target,
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

      return conn.sendMessage(
        m.chat,
        {
          text:
`🖼️ *FOTO DE PERFIL*

━━━━━━━━━━━━━━━━━━

👤 Usuario: @${targetNumber}

❌ No se pudo obtener su foto de perfil.

Puede que:

• No tenga foto pública.
• La foto esté restringida.
• WhatsApp no permita acceder a ella.

━━━━━━━━━━━━━━━━━━`,
          mentions: [
            target
          ]
        },
        {
          quoted: m
        }
      )
    }

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
`╭━━━〔 🖼️ *GPU* 〕━━━╮
┃
┃ 👤 *Usuario:* @${targetNumber}
┃
┃ 📸 *Foto de perfil*
┃
┃ ✅ Obtenida correctamente
┃
╰━━━━━━━━━━━━━━━━━━╯`,

        mentions: [
          target
        ]
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
      '❌ [GPU] Error:',
      error
    )

    try {
      await m.react('❌')
    } catch {}

    return m.reply(
      `⚠️ *ERROR EN GPU*

No se pudo obtener la foto de perfil.

🔎 Revisá la consola del bot para más información.`
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = [
  'gpu'
]

handler.tags = [
  'owner',
  'tools'
]

handler.help = [
  'gpu @usuario',
  'gpu número',
  'gpu respondiendo mensaje'
]

handler.group = false

export default handler
