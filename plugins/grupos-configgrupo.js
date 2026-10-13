// 📂 plugins/grupo-toggle.js
// 🔒 SISTEMA AVANZADO DE APERTURA Y CIERRE
// 🛡️ Admins + Owners | Registro | Protección
// ============================================================

// ============================================================
// 🔐 PROTECCIÓN CONTRA EJECUCIONES SIMULTÁNEAS
// ============================================================

const activeGroups = new Set()

// ============================================================
// 📝 HISTORIAL DE ACTIVIDAD EN MEMORIA
// ============================================================

const history = new Map()
const MAX_HISTORY = 50

function saveHistory(chat, entry) {
  if (!history.has(chat)) {
    history.set(chat, [])
  }

  const records = history.get(chat)

  records.unshift({
    ...entry,
    timestamp: new Date().toISOString()
  })

  if (records.length > MAX_HISTORY) {
    records.length = MAX_HISTORY
  }
}

// ============================================================
// 🔒 HANDLER PRINCIPAL — .G
// ============================================================

const handler = async (
  m,
  { conn, isAdmin, isOwner, isBotAdmin }
) => {

  // ==========================================================
  // 🏢 VALIDAR GRUPO
  // ==========================================================

  if (!m.isGroup) {
    return conn.sendMessage(
      m.chat,
      {
        text: '❌ Este comando solo funciona en grupos.'
      },
      { quoted: m }
    )
  }

  // ==========================================================
  // 🛡️ VALIDAR PERMISOS DEL EJECUTOR
  // ==========================================================

  if (!isAdmin && !isOwner) {
    return conn.sendMessage(
      m.chat,
      {
        text:
          '╭━━━〔 🛡️ 〕━━━╮\n' +
          '   *ACCESO DENEGADO*\n' +
          '╰━━━━━━━━━━━━━━╯\n\n' +
          '❌ Solo los administradores o propietarios del bot pueden usar este comando.'
      },
      { quoted: m }
    )
  }

  // ==========================================================
  // 🤖 VALIDAR ADMINISTRADOR DEL BOT
  // ==========================================================

  if (!isBotAdmin) {
    return conn.sendMessage(
      m.chat,
      {
        text:
          '╭━━━〔 🤖 〕━━━╮\n' +
          '   *PERMISOS INSUFICIENTES*\n' +
          '╰━━━━━━━━━━━━━━╯\n\n' +
          'Necesito ser administrador del grupo para cambiar su configuración.'
      },
      { quoted: m }
    )
  }

  // ==========================================================
  // 🔐 EVITAR CAMBIOS SIMULTÁNEOS
  // ==========================================================

  if (activeGroups.has(m.chat)) {
    return conn.sendMessage(
      m.chat,
      {
        text:
          '⏳ Ya hay un cambio de configuración en curso. Esperá un momento.'
      },
      { quoted: m }
    )
  }

  activeGroups.add(m.chat)

  try {

    // ========================================================
    // 📡 OBTENER ESTADO ACTUAL
    // ========================================================

    const metadata = await conn.groupMetadata(m.chat)

    if (!metadata) {
      throw new Error(
        'No se pudo obtener la información del grupo.'
      )
    }

    const wasClosed = metadata.announce === true

    // true = cerrado
    // false = abierto

    const newSetting = wasClosed
      ? 'not_announcement'
      : 'announcement'

    // ========================================================
    // ⚙️ CAMBIAR CONFIGURACIÓN
    // ========================================================

    await conn.groupSettingUpdate(
      m.chat,
      newSetting
    )

    const isNowClosed = !wasClosed

    // ========================================================
    // 📝 REGISTRAR ACTIVIDAD
    // ========================================================

    const actor =
      m.pushName ||
      m.sender ||
      'Desconocido'

    saveHistory(m.chat, {
      actor,
      action: isNowClosed ? 'CERRADO' : 'ABIERTO',
      group: metadata.subject || 'Grupo',
      sender: m.sender || null
    })

    // ========================================================
    // 🎨 PREPARAR CONFIRMACIÓN
    // ========================================================

    const title = isNowClosed
      ? '🔒 GRUPO CERRADO'
      : '🔓 GRUPO ABIERTO'

    const previous = wasClosed
      ? '🔒 Cerrado'
      : '🔓 Abierto'

    const current = isNowClosed
      ? '🔒 Cerrado'
      : '🔓 Abierto'

    const permissions = isNowClosed
      ? 'Solo los administradores pueden enviar mensajes.'
      : 'Todos los participantes pueden enviar mensajes.'

    const message = `
╭━━━〔 ⚙️ 〕━━━╮
   *CONFIGURACIÓN DEL GRUPO*
╰━━━━━━━━━━━━━━╯

📌 *Grupo:* ${metadata.subject || 'Grupo'}

${title}

━━━━━━━━━━━━━━━━━━
📊 *Estado anterior:* ${previous}
📊 *Estado actual:* ${current}

🛡️ *Permisos*
${permissions}

👤 *Ejecutado por:* ${actor}

━━━━━━━━━━━━━━━━━━
✅ Configuración actualizada correctamente.
`.trim()

    return await conn.sendMessage(
      m.chat,
      {
        text: message
      },
      {
        quoted: m
      }
    )

  } catch (error) {

    console.error(
      '[GRUPO-TOGGLE]',
      error
    )

    const err = String(
      error?.message || error
    ).toLowerCase()

    let detail =
      'No se pudo cambiar la configuración. Intentá nuevamente.'

    if (
      err.includes('not-authorized') ||
      err.includes('forbidden') ||
      err.includes('not admin') ||
      err.includes('not an admin')
    ) {
      detail =
        'WhatsApp rechazó la operación. Verificá que el bot siga siendo administrador.'
    }

    return await conn.sendMessage(
      m.chat,
      {
        text:
          '╭━━━〔 ❌ 〕━━━╮\n' +
          '   *ERROR DE CONFIGURACIÓN*\n' +
          '╰━━━━━━━━━━━━━━╯\n\n' +
          detail
      },
      {
        quoted: m
      }
    )

  } finally {

    // Liberar el bloqueo siempre
    activeGroups.delete(m.chat)

  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL COMANDO
// ============================================================

handler.help = ['g']
handler.tags = ['grupo']
handler.command = ['g']

handler.group = true
handler.admin = false
handler.botAdmin = true
handler.rowner = false

export default handler
