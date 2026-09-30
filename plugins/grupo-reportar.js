// 📂 plugins/avisar.js — FelixCat-Bot 🐾
// 🚨 avisar / reportar → avisa a todos los administradores

const handler = async (m, { conn, participants }) => {

  // ============================================================
  // 👥 SOLO GRUPOS
  // ============================================================

  if (!m.isGroup) {
    return m.reply(
      '❗ Este comando solo funciona en grupos.'
    )
  }

  // ============================================================
  // 👮 OBTENER ADMINISTRADORES
  // ============================================================

  const admins = (participants || [])
    .filter(p => p?.admin)
    .filter(p => p?.id)

  if (!admins.length) {
    return m.reply(
      '⚠️ No hay administradores disponibles en este grupo.'
    )
  }

  // ============================================================
  // 👤 USUARIO QUE REALIZA EL AVISO
  // ============================================================

  const sender =
    String(m.sender || '')

  const senderNumber =
    sender
      .split('@')[0]
      .split(':')[0]

  const senderTag =
    `@${senderNumber}`

  // ============================================================
  // 👮 PREPARAR ADMINISTRADORES
  // ============================================================

  const adminJids = admins
    .map(admin => admin.id)
    .filter(Boolean)

  if (!adminJids.length) {
    return m.reply(
      '⚠️ No se pudieron identificar los administradores del grupo.'
    )
  }

  const adminTags = adminJids
    .map(jid => {

      const number =
        String(jid)
          .split('@')[0]
          .split(':')[0]

      return `@${number}`
    })
    .join(', ')

  // ============================================================
  // 📢 MENSAJE DEL AVISO
  // ============================================================

  const aviso =
`⚠️ *AVISO A LOS ADMINISTRADORES*

📣 *Solicitado por:* ${senderTag}

👮 *Administradores:*
${adminTags}

━━━━━━━━━━━━━━━━━━━━
📌 *Se solicita la intervención de un administrador.*`

  // ============================================================
  // 📌 MENCIONES
  // ============================================================

  const mentions = [
    sender,
    ...adminJids
  ]

  // ============================================================
  // 📤 ENVIAR AVISO
  // ============================================================

  try {

    await conn.sendMessage(
      m.chat,
      {
        text: aviso,
        mentions
      },
      {
        quoted: m
      }
    )

  } catch (err) {

    console.error(
      '❌ Error al enviar aviso:',
      err
    )

    try {

      await m.reply(
        '❌ Ocurrió un error al avisar a los administradores.'
      )

    } catch {}

  }
}

// ============================================================
// 📋 CONFIGURACIÓN
// ============================================================

handler.command = [
  'avisar',
  'reportar'
]

handler.help = [
  'avisar',
  'reportar'
]

handler.tags = [
  'group'
]

handler.group = true

export default handler
