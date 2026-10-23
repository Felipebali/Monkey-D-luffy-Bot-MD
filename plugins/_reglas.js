
/**
 * 📂 plugins/reglas.js
 * WHATSAPP-BOT | SISTEMA DE REGLAMENTO
 *
 * Comando:
 * .reglas
 *
 * Permisos:
 * • Administradores del grupo
 *
 * Características:
 * • Presentación profesional
 * • Información del grupo
 * • Reglamento desde la descripción
 * • Control de permisos
 * • Manejo de errores
 * • Sin citar el mensaje original
 */

const handler = async (m, { conn, groupMetadata, isAdmin }) => {
  try {
    // ========================================================
    // VALIDACIÓN DEL CONTEXTO
    // ========================================================

    if (!m.isGroup) {
      return conn.sendMessage(m.chat, {
        text: '⚠️ Este comando únicamente está disponible en grupos.'
      })
    }

    // ========================================================
    // CONTROL DE ACCESO
    // ========================================================

    if (!isAdmin) {
      return conn.sendMessage(m.chat, {
        text: [
          '╭━━━〔 🔒 *ACCESO RESTRINGIDO* 〕',
          '',
          'No tienes permisos para consultar este apartado.',
          'Esta función está reservada para los administradores del grupo.',
          '',
          '╰━━━━━━━━━━━━━━━━━━━━'
        ].join('\n'),
        mentions: [m.sender]
      })
    }

    // ========================================================
    // OBTENER INFORMACIÓN DEL GRUPO
    // ========================================================

    const metadata = groupMetadata || await conn.groupMetadata(m.chat)

    const nombreGrupo = metadata?.subject?.trim() || 'Grupo sin nombre'
    const descripcion = String(metadata?.desc || '').trim()

    // ========================================================
    // REGLAMENTO
    // ========================================================

    const reglas = descripcion
      ? descripcion
      : 'El reglamento todavía no ha sido configurado. Los administradores pueden establecerlo editando la descripción del grupo.'

    // ========================================================
    // CONSTRUIR PRESENTACIÓN
    // ========================================================

    const texto = [
      '╭━━━━━━━━━━━━━━━━━━━━━━╮',
      '       🛡️ *REGLAMENTO OFICIAL*',
      '           *WHATSAPP-BOT*',
      '╰━━━━━━━━━━━━━━━━━━━━━━╯',
      '',
      `📌 *Comunidad:* ${nombreGrupo}`,
      '',
      '┌─〔 📜 *NORMATIVA DEL GRUPO* 〕',
      '',
      reglas,
      '',
      '└──────────────────────',
      '',
      '⚖️ *CONVIVENCIA Y CUMPLIMIENTO*',
      '',
      '• Mantener el respeto entre los integrantes.',
      '• Seguir las indicaciones de la administración.',
      '• Evitar conductas que alteren la convivencia.',
      '',
      'Las medidas ante posibles incumplimientos quedarán a criterio de la administración, conforme a las normas del grupo.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━',
      '🔰 *Administración de la comunidad*',
      '_La convivencia es responsabilidad de todos._'
    ].join('\n')

    // ========================================================
    // ENVIAR MENSAJE
    // ========================================================

    return await conn.sendMessage(m.chat, {
      text: texto
    })

  } catch (error) {
    console.error('[WHATSAPP-BOT | REGLAS]', error)

    return conn.sendMessage(m.chat, {
      text: '❌ No fue posible consultar el reglamento en este momento. Inténtalo nuevamente más tarde.'
    }).catch(() => {})
  }
}

// ============================================================
// CONFIGURACIÓN DEL COMANDO
// ============================================================

handler.command = ['reglas']
handler.help = ['reglas']
handler.tags = ['group']
handler.group = true
handler.admin = true

export default handler
