
/**
 * 📂 plugins/admins.js
 * 👥 WHATSAPP-BOT — ADMINISTRACIÓN DEL GRUPO
 *
 * Comando:
 * .admins
 * .admins aviso para los administradores
 *
 * Permisos: owners del bot o admins del grupo.
 */

const handler = async (m, { conn, groupMetadata, isBotAdmin, isAdmin, text }) => {
  try {
    // ========================================================
    // 🔐 VALIDACIONES
    // ========================================================

    if (!m.isGroup) {
      return conn.sendMessage(m.chat, {
        text: '❗ Este comando solo funciona en grupos.'
      })
    }

    if (!isBotAdmin) {
      return conn.sendMessage(m.chat, {
        text: '❗ Necesito ser administrador del grupo para consultar los participantes.'
      })
    }

    // ========================================================
    // 👑 OWNERS DESDE global.owner
    // ========================================================

    const normalizeJid = value => {
      if (!value) return ''

      if (typeof conn.decodeJid === 'function') {
        value = conn.decodeJid(value)
      }

      return String(value || '').trim()
    }

    const normalizeNumber = value => {
      return normalizeJid(value)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '')
    }

    const owners = (global.owner || [])
      .map(owner => {
        if (Array.isArray(owner)) owner = owner[0]

        if (typeof owner !== 'string' && typeof owner !== 'number') {
          return ''
        }

        return normalizeNumber(owner)
      })
      .filter(Boolean)

    const sender = normalizeJid(m.sender)
    const senderNumber = normalizeNumber(sender)
    const senderIsOwner = owners.includes(senderNumber)

    // Solo owners o admins del grupo
    if (!senderIsOwner && !isAdmin) {
      return conn.sendMessage(m.chat, {
        text: '🚫 Solo los administradores del grupo o los dueños del bot pueden usar este comando.'
      })
    }

    // ========================================================
    // 👥 OBTENER PARTICIPANTES
    // ========================================================

    const metadata = groupMetadata || await conn.groupMetadata(m.chat)
    const participants = metadata?.participants || []

    const botJid = normalizeJid(
      conn.user?.id || conn.user?.jid || ''
    )

    const botNumber = normalizeNumber(botJid)

    const normalizedParticipants = participants.map(participant => {
      const id = normalizeJid(participant.id || participant.jid)

      return {
        id,
        number: normalizeNumber(id),
        admin: participant.admin || null
      }
    })

    // ========================================================
    // 👑 OWNERS PRESENTES EN EL GRUPO
    // ========================================================

    const ownersInGroup = normalizedParticipants.filter(participant =>
      owners.includes(participant.number)
    )

    // ========================================================
    // 🛡️ ADMINISTRADORES DEL GRUPO
    // ========================================================

    const admins = normalizedParticipants.filter(participant =>
      participant.admin &&
      !owners.includes(participant.number) &&
      participant.number !== botNumber
    )

    // ========================================================
    // 🏷️ TÍTULOS DE OWNERS
    // ========================================================

    const ownerTitles = {}

    if (owners[0]) {
      ownerTitles[owners[0]] = 'Dueño principal 👑'
    }

    if (owners[1]) {
      ownerTitles[owners[1]] = 'Creador asociado 👑'
    }

    // ========================================================
    // 📝 CONSTRUIR MENSAJE
    // ========================================================

    const lines = [
      '╭━━━〔 👥 *ADMINISTRACIÓN DEL GRUPO* 〕━━━⬣',
      '',
      `📛 *Grupo:* ${metadata.subject || 'Sin nombre'}`,
      `👥 *Miembros:* ${participants.length}`,
      `🛡️ *Administradores:* ${admins.length + ownersInGroup.length}`,
      ''
    ]

    if (ownersInGroup.length > 0) {
      lines.push('👑 *DUEÑOS DEL BOT*')

      for (const owner of ownersInGroup) {
        const title = ownerTitles[owner.number] || 'Owner 👑'
        lines.push(`▸ ${title}: @${owner.number}`)
      }

      lines.push('')
    }

    lines.push('🛡️ *ADMINISTRADORES DEL GRUPO*')

    if (admins.length > 0) {
      for (const admin of admins) {
        lines.push(`▸ @${admin.number}`)
      }
    } else {
      lines.push('▸ No hay otros administradores.')
    }

    lines.push('')

    // 📢 Aviso opcional
    const aviso = typeof text === 'string' ? text.trim() : ''

    if (aviso) {
      lines.push('📢 *AVISO PARA LOS ADMINISTRADORES*')
      lines.push(aviso)
      lines.push('')
    }

    const role = senderIsOwner
      ? '👑 Dueño del bot'
      : '🛡️ Administrador del grupo'

    lines.push('╰━━━━━━━━━━━━━━━━━━━━⬣')
    lines.push(`⚡ *Solicitado por:* @${senderNumber}`)
    lines.push(`🎖️ *Rol:* ${role}`)

    const message = lines.join('\n')

    // ========================================================
    // 📣 MENCIONES SIN DUPLICADOS
    // ========================================================

    const mentions = [
      ...new Set([
        ...ownersInGroup.map(owner => owner.id),
        ...admins.map(admin => admin.id),
        sender
      ].filter(Boolean))
    ]

    // Enviar sin citar el mensaje original
    return conn.sendMessage(m.chat, {
      text: message,
      mentions
    })

  } catch (error) {
    console.error('[ADMINS] Error:', error)

    return conn.sendMessage(m.chat, {
      text: '❌ Ocurrió un error al obtener la lista de administradores.'
    }).catch(() => {})
  }
}

// ============================================================
// 📚 CONFIGURACIÓN
// ============================================================

handler.command = ['admins']
handler.group = true
handler.tags = ['group']
handler.help = [
  'admins',
  'admins <aviso>'
]

export default handler
