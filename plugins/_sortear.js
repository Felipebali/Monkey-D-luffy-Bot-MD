
/**
 * 📂 plugins/_sortear.js
 * 🎉 WHATSAPP-BOT — SISTEMA DE SORTEOS
 *
 * Comando:
 * .sortear <premio>
 *
 * Permisos:
 * • Exclusivo para owners del bot
 *
 * Características:
 * • Selección aleatoria segura
 * • Excluye al bot
 * • Evita participantes duplicados
 * • Menciona al ganador
 * • Sin citar el mensaje original
 */

const handler = async (m, { conn, args, groupMetadata }) => {
  try {
    // ========================================================
    // 🔐 VALIDACIONES
    // ========================================================

    if (!m.isGroup) {
      return conn.sendMessage(m.chat, {
        text: '⚠️ Este comando solo puede utilizarse dentro de un grupo.'
      })
    }

    // ========================================================
    // 👑 VERIFICAR OWNERS DESDE global.owner
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

    const normalizeNumber = value => normalizeJid(value)
      .split('@')[0]
      .split(':')[0]
      .replace(/\D/g, '')

    const owners = (Array.isArray(global.owner) ? global.owner : [])
      .map(owner => {
        if (Array.isArray(owner)) owner = owner[0]

        if (typeof owner !== 'string' && typeof owner !== 'number') {
          return ''
        }

        return normalizeNumber(owner)
      })
      .filter(Boolean)

    const senderNumber = normalizeNumber(m.sender)

    if (!owners.includes(senderNumber)) {
      return conn.sendMessage(m.chat, {
        text: '⛔ *ACCESO DENEGADO*\n\nEste comando está reservado exclusivamente para los owners del bot.',
        mentions: [m.sender]
      })
    }

    // ========================================================
    // 🎁 VALIDAR PREMIO
    // ========================================================

    const premio = args.join(' ').trim()

    if (!premio) {
      return conn.sendMessage(m.chat, {
        text: [
          '╭━━━〔 🎉 *SISTEMA DE SORTEOS* 〕━━━⬣',
          '',
          'Para iniciar un sorteo, debes especificar el premio.',
          '',
          '📌 *Uso:* .sortear <premio>',
          '💡 *Ejemplo:* .sortear Auriculares',
          '',
          '╰━━━━━━━━━━━━━━━━━━━━⬣'
        ].join('\n')
      })
    }

    // ========================================================
    // 👥 OBTENER PARTICIPANTES
    // ========================================================

    const metadata = groupMetadata || await conn.groupMetadata(m.chat)
    const participantes = metadata?.participants || []

    const botJid = normalizeJid(
      conn.user?.id || conn.user?.jid || ''
    )

    const botNumber = normalizeNumber(botJid)

    // Normalizar y eliminar duplicados
    const unicos = new Map()

    for (const participante of participantes) {
      const id = normalizeJid(
        participante.id || participante.jid
      )

      const numero = normalizeNumber(id)

      if (!id || !numero || numero === botNumber) continue

      if (!unicos.has(numero)) {
        unicos.set(numero, id)
      }
    }

    const candidatos = [...unicos.values()]

    if (candidatos.length === 0) {
      return conn.sendMessage(m.chat, {
        text: '⚠️ No hay participantes válidos para realizar el sorteo.'
      })
    }

    // ========================================================
    // 🎯 SELECCIÓN ALEATORIA
    // ========================================================

    // crypto.randomInt proporciona una selección aleatoria uniforme.
    const { randomInt } = await import('crypto')
    const indiceGanador = randomInt(0, candidatos.length)
    const ganador = candidatos[indiceGanador]

    const ganadorNumero = normalizeNumber(ganador)

    // ========================================================
    // 🏆 ANUNCIO DEL GANADOR
    // ========================================================

    const nombreGrupo = metadata?.subject || 'Grupo'

    const mensaje = [
      '╭━━━〔 🎉 *SORTEO OFICIAL* 〕━━━⬣',
      '',
      `🏆 *Premio:* ${premio}`,
      `📍 *Grupo:* ${nombreGrupo}`,
      `👥 *Participantes elegibles:* ${candidatos.length}`,
      '',
      '🎊 *¡TENEMOS UN GANADOR!*',
      '',
      `🥇 *Ganador:* @${ganadorNumero}`,
      '',
      '👏 ¡Felicitaciones! Gracias a todos por participar.',
      '',
      '━━━━━━━━━━━━━━━━━━━━',
      '🎲 _Sorteo realizado por WHATSAPP-BOT_',
      '╰━━━━━━━━━━━━━━━━━━━━⬣'
    ].join('\n')

    return await conn.sendMessage(m.chat, {
      text: mensaje,
      mentions: [ganador]
    })

  } catch (error) {
    console.error('[WHATSAPP-BOT SORTEDOR] Error:', error)

    return conn.sendMessage(m.chat, {
      text: '❌ No se pudo completar el sorteo. Inténtalo nuevamente.'
    }).catch(() => {})
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL COMANDO
// ============================================================

handler.help = ['sortear <premio>']
handler.tags = ['owner']
handler.command = ['sortear']
handler.group = true
handler.rowner = true

export default handler
