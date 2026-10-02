// 📂 plugins/gpu.js
// 🖼️ Obtener foto de perfil — SOLO OWNERS reales del bot

let handler = async (m, { conn, args }) => {
  try {

    // ============================================================
    // 🔐 OBTENER OWNERS
    // ============================================================

    const ownerNumbers = (global.owner || [])
      .map(v => Array.isArray(v) ? v[0] : v)
      .filter(Boolean)
      .map(v => String(v).replace(/[^0-9]/g, ''))
      .filter(Boolean)

    // ============================================================
    // 👤 VERIFICAR SENDER
    // ============================================================

    let senderJid = String(m.sender || '')

    try {
      if (conn.decodeJid) {
        senderJid = conn.decodeJid(senderJid)
      }
    } catch {}

    const senderNumber =
      senderJid.replace(/[^0-9]/g, '')

    if (!ownerNumbers.includes(senderNumber)) {
      return m.reply(
        '🚫 *Solo los dueños del bot pueden usar este comando.*'
      )
    }

    // ============================================================
    // 🎯 DETERMINAR OBJETIVO
    // ============================================================

    let target = null

    // ------------------------------------------------------------
    // 👤 MENCIONADO
    // ------------------------------------------------------------

    if (
      Array.isArray(m.mentionedJid) &&
      m.mentionedJid.length > 0
    ) {
      target = m.mentionedJid[0]
    }

    // ------------------------------------------------------------
    // 💬 MENSAJE CITADO
    // ------------------------------------------------------------

    else if (m.quoted?.sender) {
      target = m.quoted.sender
    }

    // ------------------------------------------------------------
    // 📱 NÚMERO ESCRITO
    // ------------------------------------------------------------

    else if (args?.[0]) {

      const num =
        String(args[0])
          .replace(/[^0-9]/g, '')

      if (num.length < 8) {
        return m.reply(
          '❌ *Número no válido.*\n\n' +
          '📌 Ejemplo:\n' +
          '`.gpu 5989XXXXXXXX`'
        )
      }

      target =
        `${num}@s.whatsapp.net`
    }

    // ============================================================
    // ❌ SIN OBJETIVO
    // ============================================================

    if (!target) {
      return m.reply(
`🖼️ *FOTO DE PERFIL*

📌 Debes indicar una persona.

Ejemplos:

• *.gpu @usuario*
• *.gpu 5989XXXXXXXX*
• Responder a un mensaje con *.gpu*`
      )
    }

    // ============================================================
    // 🔧 NORMALIZAR TARGET
    // ============================================================

    // Evitar que Baileys reciba un objeto
    if (typeof target !== 'string') {

      if (target?.id) {
        target = target.id
      } else if (target?.jid) {
        target = target.jid
      } else {
        target = String(target)
      }
    }

    // Decodificar JID si está disponible
    try {
      if (conn.decodeJid) {
        target = conn.decodeJid(target)
      }
    } catch {}

    // Limpiar
    target = String(target).trim()

    // Si solamente tenemos el número
    if (!target.includes('@')) {
      const number =
        target.replace(/[^0-9]/g, '')

      if (!number) {
        return m.reply(
          '❌ No se pudo identificar al usuario.'
        )
      }

      target =
        `${number}@s.whatsapp.net`
    }

    // ============================================================
    // 🔎 NÚMERO PARA MOSTRAR
    // ============================================================

    const simple =
      target
        .split('@')[0]
        .replace(/[^0-9]/g, '')

    if (!simple) {
      return m.reply(
        '❌ JID del usuario no válido.'
      )
    }

    // ============================================================
    // 🖼️ OBTENER FOTO
    // ============================================================

    let ppUrl = null

    try {

      ppUrl =
        await conn.profilePictureUrl(
          target,
          'image'
        )

    } catch (error) {

      console.log(
        '⚠️ No se pudo obtener la foto:',
        error?.message || error
      )

      ppUrl = null
    }

    // ============================================================
    // ❌ SIN FOTO
    // ============================================================

    if (!ppUrl) {

      return conn.sendMessage(
        m.chat,
        {
          text:
            `❌ No se pudo obtener la foto de perfil de @${simple}.`,
          mentions: [target]
        },
        {
          quoted: m
        }
      )
    }

    // ============================================================
    // 📤 ENVIAR FOTO
    // ============================================================

    await conn.sendMessage(
      m.chat,
      {
        image: {
          url: ppUrl
        },

        caption:
`╭━━━〔 🖼️ *FOTO DE PERFIL* 〕━━━╮
┃
┃ 👤 Usuario: @${simple}
┃
┃ 📸 Foto obtenida correctamente.
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`,

        mentions: [
          target
        ]
      },
      {
        quoted: m
      }
    )

  } catch (err) {

    console.error(
      '❌ Error en .gpu:',
      err
    )

    try {
      await m.reply(
        '⚠️ *Ocurrió un error al intentar obtener la foto de perfil.*'
      )
    } catch {}
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
  'gpu (responder mensaje)'
]

handler.group = false

export default handler
