
/**
 * 📂 plugins/admins.js
 * 👥 WHATSAPP-BOT — ADMINISTRACIÓN DEL GRUPO
 *
 * Comandos:
 * .admins
 * .admins aviso para los administradores
 *
 * Permisos:
 * • Owners del bot
 * • Administradores del grupo
 *
 * Orden:
 * 1. Aviso
 * 2. Máximo 2 owners de global.owner
 * 3. Administradores del grupo
 *
 * • Sin citar el mensaje original.
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
    // 🧰 NORMALIZACIÓN
    // ========================================================

    const normalizeJid = value => {
      if (!value) return ''

      try {
        if (typeof conn.decodeJid === 'function') {
          value = conn.decodeJid(value)
        }
      } catch {}

      return String(value || '').trim()
    }

    const normalizeNumber = value => {
      return normalizeJid(value)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '')
    }

    // ========================================================
    // 👑 OWNERS: SOLO LOS PRIMEROS 2
    // ========================================================

    const rawOwners = Array.isArray(global.owner)
      ? global.owner
      : global.owner
        ? [global.owner]
        : []

    const owners = [
      ...new Set(
        rawOwners
          .map(owner => {
            if (Array.isArray(owner)) owner = owner[0]

            if (typeof owner !== 'string' && typeof owner !== 'number') {
              return ''
            }

            return normalizeNumber(owner)
          })
          .filter(Boolean)
      )
    ].slice(0, 2)

    const sender = normalizeJid(m.sender)
    const senderNumber = normalizeNumber(sender)
    const senderIsOwner = owners.includes(senderNumber)

    // Solo owners o administradores del grupo
    if (!senderIsOwner && !isAdmin) {
      return conn.sendMessage(m.chat, {
        text: '🚫 Solo los administradores del grupo o los dueños del bot pueden usar este comando.'
      })
    }

    // ========================================================
    // 👥 METADATOS Y PARTICIPANTES
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
    // 📢 AVISO
    // ========================================================

    const aviso = typeof text === 'string' ? text.trim() : ''

    // ========================================================
    // 📝 CONSTRUIR MENSAJE
    // ========================================================

    const lines = [
      '╭━━━〔 👥 *ADMINISTRACIÓN DEL GRUPO* 〕━━━⬣',
      '',
      `📛 *Grupo:* ${metadata.subject || 'Sin nombre'}`,
      `👥 *Miembros:* ${participants.length}`,
      `👑 *Owners mostrados:* ${owners.length}`,
      `🛡️ *Administradores del grupo:* ${admins.length}`,
      ''
    ]

    // 1️⃣ AVISO PRIMERO
    lines.push('╭━━━〔 📢 *AVISO PARA LOS ADMINISTRADORES* 〕')
    lines.push(aviso || 'No se escribió ningún aviso.')
    lines.push('')

    // 2️⃣ MÁXIMO 2 OWNERS
    lines.push('╭━━━〔 👑 *OWNERS DEL BOT* 〕')

    if (owners.length > 0) {
      owners.forEach((number, index) => {
        const title = ownerTitles[number] || `Owner ${index + 1} 👑`
        lines.push(`▸ ${title}: @${number}`)
      })
    } else {
      lines.push('▸ No hay owners configurados.')
    }

    lines.push('')

    // 3️⃣ ADMINISTRADORES DEL GRUPO AL FINAL
    lines.push('╭━━━〔 🛡️ *ADMINISTRADORES DEL GRUPO* 〕')

    if (admins.length > 0) {
      for (const admin of admins) {
        lines.push(`▸ @${admin.number}`)
      }
    } else {
      lines.push('▸ No hay otros administradores del grupo.')
    }

    lines.push('')
    lines.push('╰━━━━━━━━━━━━━━━━━━━━⬣')

    const role = senderIsOwner
      ? '👑 Dueño del bot'
      : '🛡️ Administrador del grupo'

    lines.push(`⚡ *Solicitado por:* @${senderNumber}`)
    lines.push(`🎖️ *Rol:* ${role}`)

    const message = lines.join('\n')

    // ========================================================
    // 📣 MENCIONES SIN DUPLICADOS
    // ========================================================

    const mentions = [
      ...new Set([
        ...owners.map(number => `${number}@s.whatsapp.net`),
        ...admins.map(admin => admin.id),
        sender
      ].filter(Boolean))
    ]

    // ========================================================
    // 📤 ENVIAR SIN CITAR EL MENSAJE ORIGINAL
    // ========================================================

    return conn.sendMessage(m.chat, {
      text: message,
      mentions
    })

  } catch (error) {
    console.error('[WHATSAPP-BOT ADMINS] Error:', error)

    return conn.sendMessage(m.chat, {
      text: '❌ Ocurrió un error al obtener la lista de administradores.'
    }).catch(() => {})
  }
}

// ============================================================
// 📚 CONFIGURACIÓN DEL COMANDO
// ============================================================

handler.command = ['admins']
handler.group = true
handler.tags = ['group']
handler.help = [
  'admins',
  'admins <aviso>'
]

export default handler
