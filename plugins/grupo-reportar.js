
// 📂 plugins/avisar.js
// 🚨 SISTEMA DE AVISOS A ADMINISTRADORES
// 📢 .avisar | .reportar
// 🎨 Estilo WhatsApp-Bot
// ============================================================

const handler = async (m, { conn, participants, groupMetadata }) => {

  // ==========================================================
  // 🏢 VALIDAR GRUPO
  // ==========================================================

  if (!m.isGroup) {
    return m.reply(
      '╭━━━〔 ⚠️ 〕━━━╮\n' +
      '   *AVISO DE GRUPO*\n' +
      '╰━━━━━━━━━━━━━━╯\n\n' +
      '❌ Este comando solo funciona en grupos.'
    )
  }

  try {

    // ========================================================
    // 👥 OBTENER ADMINISTRADORES
    // ========================================================

    let miembros = participants

    if (!Array.isArray(miembros) || !miembros.length) {
      const metadata = await conn.groupMetadata(m.chat)
      miembros = metadata?.participants || []
    }

    const admins = miembros.filter(
      p => p?.admin && (p.id || p.jid || p.lid)
    )

    if (!admins.length) {
      return m.reply(
        '╭━━━〔 ⚠️ 〕━━━╮\n' +
        '   *SIN ADMINISTRADORES*\n' +
        '╰━━━━━━━━━━━━━━╯\n\n' +
        'No se encontraron administradores disponibles.'
      )
    }

    // ========================================================
    // 🔎 UTILIDADES DE IDENTIFICACIÓN
    // ========================================================

    const normalizeJid = jid =>
      String(jid || '').trim().replace(/:\d+(?=@)/g, '')

    const getTag = jid => {
      const value = normalizeJid(jid)
      const [user, server = ''] = value.split('@')

      // Para LID se conserva el identificador disponible.
      return user ? `@${user}` : '@usuario'
    }

    // ========================================================
    // 👤 IDENTIFICAR SOLICITANTE
    // ========================================================

    const sender = normalizeJid(m.sender)

    const senderName =
      m.pushName ||
      'Participante'

    const senderTag = getTag(sender)

    // ========================================================
    // 👮 PREPARAR ADMINISTRADORES
    // ========================================================

    const adminJids = [
      ...new Set(
        admins
          .map(p => normalizeJid(p.id || p.jid || p.lid))
          .filter(Boolean)
      )
    ]

    if (!adminJids.length) {
      return m.reply(
        '❌ No se pudieron identificar los administradores.'
      )
    }

    const adminTags = adminJids
      .map(getTag)
      .join('\n')

    // ========================================================
    // 🏷️ INFORMACIÓN DEL GRUPO
    // ========================================================

    const metadata = groupMetadata ||
      await conn.groupMetadata(m.chat)

    const groupName =
      metadata?.subject ||
      'Grupo'

    // ========================================================
    // 📩 MENSAJE ORIGINAL CITADO
    // ========================================================

    let referencia = ''

    if (m.quoted) {
      referencia =
        '\n\n📨 *Mensaje citado:*\n' +
        'El aviso hace referencia a un mensaje anterior.'
    }

    // ========================================================
    // 📢 CONSTRUIR AVISO
    // ========================================================

    const aviso = `
╭━━━〔 🚨 〕━━━╮
   *AVISO A LOS ADMINISTRADORES*
╰━━━━━━━━━━━━━━╯

📍 *Grupo:* ${groupName}

👤 *Solicitado por:*
${senderTag} (${senderName})

━━━━━━━━━━━━━━━━━━
👮 *Administradores notificados:*
${adminTags}
━━━━━━━━━━━━━━━━━━

📣 Se solicita la intervención de un administrador.
Por favor, revisen la situación y tomen las medidas necesarias.${referencia}

╰━━━━━━━━━━━━━━━━━━╯
`.trim()

    // ========================================================
    // 📌 MENCIONES SIN DUPLICADOS
    // ========================================================

    const mentions = [
      ...new Set(
        [sender, ...adminJids].filter(Boolean)
      )
    ]

    // ========================================================
    // 📤 ENVIAR AVISO
    // ========================================================

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

    console.error('[AVISAR-ADMIN]', err)

    return m.reply(
      '╭━━━〔 ❌ 〕━━━╮\n' +
      '   *ERROR AL ENVIAR EL AVISO*\n' +
      '╰━━━━━━━━━━━━━━╯\n\n' +
      'No se pudo completar el aviso. Intentá nuevamente.'
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL PLUGIN
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
