
/**
 * 📂 plugins/alerta.js
 * 🛡️ WHATSAPP-BOT — CENTRO DE NOTIFICACIONES
 *
 * ⚠️ Avisos administrativos de alta prioridad
 * 👑 Exclusivo para OWNERS
 * 👥 Mención de todos los participantes
 * 📡 Envío a grupo específico
 * 🕒 Fecha y hora de Uruguay
 *
 * Comando:
 * .alerta <mensaje>
 *
 * Baileys ES Modules
 */

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const GRUPO_DESTINO = '120363429891274964@g.us'

const ZONA_HORARIA = 'America/Montevideo'

// ============================================================
// 🕒 OBTENER FECHA Y HORA
// ============================================================

function obtenerFecha() {
  return new Date().toLocaleString('es-UY', {
    timeZone: ZONA_HORARIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

// ============================================================
// 🎭 REACCIONES
// ============================================================

async function reaccionar(conn, m, emoji) {
  try {
    await conn.sendMessage(m.chat, {
      react: {
        text: emoji,
        key: m.key
      }
    })
  } catch (error) {
    console.error(
      '[NOTIFICACIONES] Error de reacción:',
      error
    )
  }
}

// ============================================================
// 👥 OBTENER PARTICIPANTES
// ============================================================

async function obtenerGrupo(conn) {
  const metadata = await conn.groupMetadata(GRUPO_DESTINO)

  const participantes = metadata.participants || []

  const menciones = [
    ...new Set(
      participantes
        .map(participante => participante.id)
        .filter(Boolean)
    )
  ]

  return {
    metadata,
    menciones
  }
}

// ============================================================
// 🛡️ GENERAR NOTIFICACIÓN
// ============================================================

function generarNotificacion(texto, fecha) {
  return `⚠️ *AVISO DE SEGURIDAD*

━━━━━━━━━━━━━━━━━━━━

Se ha generado una notificación de alta prioridad para los participantes de este grupo.

*ATENCIÓN REQUERIDA*

Se solicita leer cuidadosamente la siguiente información.

┌─ *INFORMACIÓN DEL AVISO*

${texto}

└────────────────────

*Detalles de la notificación*

*Prioridad:* ALTA
*Estado:* Aviso emitido
*Alcance:* Todos los participantes
*Fecha:* ${fecha}

━━━━━━━━━━━━━━━━━━━━

Este mensaje ha sido distribuido a todos los integrantes del grupo.

*WhatsApp-Bot*
_Sistema de administración y avisos_`
}

// ============================================================
// 📋 GENERAR CONFIRMACIÓN
// ============================================================

function generarConfirmacion(metadata, menciones, fecha) {
  return `🛡️ *CENTRO DE NOTIFICACIONES*

━━━━━━━━━━━━━━━━━━━━

✅ *NOTIFICACIÓN ENVIADA*

El aviso administrativo fue enviado correctamente.

*Detalles del envío*

👥 *Grupo:* ${metadata.subject || 'Sin nombre'}
📢 *Destinatarios:* ${menciones.length}
🕒 *Fecha:* ${fecha}
📡 *Estado:* Enviado

━━━━━━━━━━━━━━━━━━━━

_WhatsApp-Bot | Administración_`
}

// ============================================================
// 🚨 COMANDO PRINCIPAL
// ============================================================

const handler = async (m, { conn, text }) => {

  // ==========================================================
  // ⚠️ VALIDAR MENSAJE
  // ==========================================================

  const contenido = String(text || '').trim()

  if (!contenido) {
    return m.reply(
      `🛡️ *CENTRO DE NOTIFICACIONES*

⚠️ No se ha especificado ningún mensaje.

*Uso correcto:*

.alerta <mensaje>

*Ejemplo:*

.alerta Se informa que habrá cambios importantes en las normas del grupo.

━━━━━━━━━━━━━━━━━━━━

_Exclusivo para propietarios del bot._`
    )
  }

  try {

    // ========================================================
    // 📡 REACCIÓN DE PROCESAMIENTO
    // ========================================================

    await reaccionar(conn, m, '📡')

    // ========================================================
    // 👥 INFORMACIÓN DEL GRUPO
    // ========================================================

    const {
      metadata,
      menciones
    } = await obtenerGrupo(conn)

    // ========================================================
    // 🕒 FECHA
    // ========================================================

    const fecha = obtenerFecha()

    // ========================================================
    // 🛡️ CREAR NOTIFICACIÓN
    // ========================================================

    const mensaje = generarNotificacion(
      contenido,
      fecha
    )

    // ========================================================
    // 📤 ENVIAR AL GRUPO
    // ========================================================

    await conn.sendMessage(
      GRUPO_DESTINO,
      {
        text: mensaje,
        mentions: menciones
      }
    )

    // ========================================================
    // ✅ REACCIÓN DE ÉXITO
    // ========================================================

    await reaccionar(conn, m, '✅')

    // ========================================================
    // 📋 CONFIRMACIÓN
    // ========================================================

    const confirmacion = generarConfirmacion(
      metadata,
      menciones,
      fecha
    )

    await m.reply(confirmacion)

  } catch (error) {

    // ========================================================
    // ❌ REGISTRAR ERROR
    // ========================================================

    console.error(
      '[NOTIFICACIONES] Error:',
      error
    )

    // ========================================================
    // ❌ REACCIÓN
    // ========================================================

    await reaccionar(conn, m, '❌')

    // ========================================================
    // ⚠️ MENSAJE DE ERROR
    // ========================================================

    await m.reply(
      `⚠️ *ERROR DE NOTIFICACIÓN*

No se pudo completar el envío del aviso.

*Posibles causas:*

• El bot no pertenece al grupo destino.
• El grupo restringe el envío de mensajes.
• Ocurrió un error de conexión.

━━━━━━━━━━━━━━━━━━━━

_WhatsApp-Bot | Administración_`
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL HANDLER
// ============================================================

handler.help = ['alerta <mensaje>']
handler.tags = ['owner']
handler.command = ['alerta']

// 👑 Solo propietarios
handler.owner = true

export default handler
