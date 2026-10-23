
/**
 * 📂 plugins/avisar.js
 * 🚨 WHATSAPP-BOT — SISTEMA DE REPORTES
 *
 * Comandos:
 * .avisar (respondiendo al mensaje)
 * .reportar (respondiendo al mensaje)
 *
 * También admite:
 * .reportar motivo del reporte
 */

const handler = async (m, { conn, participants, groupMetadata, args }) => {
  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🏢 VALIDAR GRUPO
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    if (!m.isGroup) {
      return conn.sendMessage(m.chat, {
        text: '⚠️ Este comando solo está disponible dentro de grupos.'
      })
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔎 UTILIDADES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const normalizeJid = (jid) => {
      if (!jid) return ''

      try {
        if (typeof conn.decodeJid === 'function') {
          jid = conn.decodeJid(jid)
        }
      } catch {}

      return String(jid).trim().replace(/:\d+(?=@)/g, '')
    }

    const getNumber = (jid) =>
      normalizeJid(jid).split('@')[0]

    const getTag = (jid) => {
      const id = normalizeJid(jid)
      return id ? `@${getNumber(id)}` : 'Usuario desconocido'
    }

    const cleanText = (value, max = 3500) => {
      const text = String(value || '').trim()
      if (!text) return ''
      return text.length > max
        ? `${text.slice(0, max)}\n… [contenido recortado]`
        : text
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 👥 OBTENER ADMINISTRADORES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    let miembros = participants

    if (!Array.isArray(miembros) || !miembros.length) {
      const metadataActual = await conn.groupMetadata(m.chat)
      miembros = metadataActual?.participants || []
    }

    const admins = miembros.filter(
      p => p?.admin && (p.id || p.jid || p.lid)
    )

    const adminJids = [
      ...new Set(
        admins
          .map(p => normalizeJid(p.id || p.jid || p.lid))
          .filter(Boolean)
      )
    ]

    if (!adminJids.length) {
      return conn.sendMessage(m.chat, {
        text: '⚠️ No se encontraron administradores para notificar.'
      })
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📨 DETECTAR MENSAJE REPORTADO
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const quoted = m.quoted || null
    const quotedMessage = quoted?.message || quoted
    const quotedSender = normalizeJid(
      quoted?.sender ||
      quoted?.participant ||
      quoted?.key?.participant ||
      quoted?.participantPn ||
      ''
    )

    let contenido = ''

    if (quotedMessage) {
      contenido =
        quotedMessage.text ||
        quotedMessage.caption ||
        quotedMessage.body ||
        quotedMessage.conversation ||
        quotedMessage.extendedTextMessage?.text ||
        quotedMessage.imageMessage?.caption ||
        quotedMessage.videoMessage?.caption ||
        quotedMessage.documentMessage?.caption ||
        quotedMessage.message?.conversation ||
        quotedMessage.message?.extendedTextMessage?.text ||
        ''
    }

    // Identificar mensajes multimedia y otros tipos de contenido
    const mensajeBase = quoted?.message || quoted
    const tipoMensaje = mensajeBase
      ? Object.keys(mensajeBase).find(key =>
          /Message$/.test(key) &&
          !['senderKeyDistributionMessage', 'messageContextInfo'].includes(key)
        )
      : ''

    const tiposContenido = {
      imageMessage: '🖼️ Imagen',
      videoMessage: '🎥 Video',
      audioMessage: '🎵 Audio',
      documentMessage: '📄 Documento',
      stickerMessage: '🎭 Sticker',
      contactMessage: '👤 Contacto',
      locationMessage: '📍 Ubicación',
      liveLocationMessage: '📍 Ubicación en tiempo real',
      protocolMessage: '⚙️ Mensaje de sistema'
    }

    if (quoted && !contenido) {
      contenido = tiposContenido[tipoMensaje] ||
        'El mensaje no contiene texto visible o es de un tipo no compatible.'
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📝 MOTIVO DEL REPORTE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const motivo = cleanText(args?.join(' '), 1000)

    if (!quoted && !motivo) {
      return conn.sendMessage(m.chat, {
        text: [
          '╭━━━〔 🚨 SISTEMA DE REPORTES 〕━━━⬣',
          '',
          'Para reportar un mensaje, responde a ese mensaje',
          'con uno de estos comandos:',
          '',
          '📌 .reportar',
          '📌 .avisar',
          '',
          'También puedes indicar un motivo:',
          '📌 .reportar Insultos o spam',
          '',
          '⚠️ Si no respondes a un mensaje, el reporte',
          'incluirá el motivo, pero no un mensaje original.',
          '',
          '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣'
        ].join('\n')
      })
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🏷️ INFORMACIÓN DEL GRUPO Y USUARIOS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const metadata = groupMetadata || await conn.groupMetadata(m.chat)
    const groupName = cleanText(metadata?.subject, 150) || 'Grupo sin nombre'
    const reporter = normalizeJid(m.sender)
    const reporterName = cleanText(m.pushName, 100) || 'Participante'

    const reportadoPor = quotedSender
      ? `${getTag(quotedSender)}`
      : 'No identificado'

    const fecha = new Date().toLocaleString('es-UY', {
      timeZone: 'America/Montevideo',
      dateStyle: 'short',
      timeStyle: 'short'
    })

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📢 CONSTRUIR REPORTE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const seccionMensaje = quoted
      ? [
          '┌─〔 📨 MENSAJE REPORTADO 〕',
          '',
          `👤 *Autor del mensaje:* ${reportadoPor}`,
          `🧩 *Tipo:* ${tiposContenido[tipoMensaje] || 'Texto / contenido'}`,
          '',
          '```',
          cleanText(contenido, 2500) || '[Sin texto visible]',
          '```',
          '└────────────────────'
        ].join('\n')
      : [
          '┌─〔 📝 MOTIVO DEL REPORTE 〕',
          '',
          cleanText(motivo, 1000),
          '└────────────────────'
        ].join('\n')

    const seccionMotivo = quoted && motivo
      ? `\n\n📝 *Motivo indicado:*\n${motivo}`
      : ''

    const aviso = [
      '╭━━━〔 🚨 REPORTE A ADMINISTRACIÓN 〕━━━⬣',
      '',
      `📍 *Grupo:* ${groupName}`,
      `🕒 *Fecha:* ${fecha}`,
      '',
      '┌─〔 👤 PERSONA QUE REPORTA 〕',
      '',
      `${getTag(reporter)} (${reporterName})`,
      '└────────────────────',
      '',
      seccionMensaje + seccionMotivo,
      '',
      '━━━━━━━━━━━━━━━━━━━━',
      '👮 *ADMINISTRADORES NOTIFICADOS*',
      adminJids.map(getTag).join('\n'),
      '',
      '📣 Se solicita que la administración revise el reporte y evalúe la situación.',
      '',
      '🔰 _WHATSAPP-BOT | Sistema de reportes_',
      '╰━━━━━━━━━━━━━━━━━━━━━━━━⬣'
    ].join('\n')

    const mentions = [
      ...new Set(
        [reporter, quotedSender, ...adminJids].filter(Boolean)
      )
    ]

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📤 ENVIAR REPORTE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    return await conn.sendMessage(m.chat, {
      text: aviso,
      mentions
    })

  } catch (err) {
    console.error('[WHATSAPP-BOT | REPORTES]', err)

    return conn.sendMessage(m.chat, {
      text: '❌ No se pudo enviar el reporte. Inténtalo nuevamente.'
    }).catch(() => {})
  }
}

handler.help = [
  'avisar',
  'reportar'
]

handler.tags = ['group']

handler.command = [
  'avisar',
  'reportar'
]

handler.group = true

export default handler
