
// ============================================================
// ⚙️ COMANDO .ANTICALL — SILENCIOSO
// ============================================================

const handler = async (m, { conn, isOwner }) => {
    // Exclusivo para owners.
    if (!isOwner) return

    // Registrar detectores de llamadas.
    registerListeners(conn)

    // Alternar estado.
    config.enabled = !config.enabled

    // Guardar configuración en JSON.
    saveConfig(config)

    // Mostrar estado solamente en consola.
    console.log(
        `╭━━━〔 📞 ANTICALL 〕━━━╮
┃
┃ ${config.enabled
    ? '🟢 SISTEMA ACTIVADO'
    : '🔴 SISTEMA DESACTIVADO'}
┃
╰━━━━━━━━━━━━━━━━━━╯

🚫 Rechazo automático: ${config.enabled ? 'ACTIVO' : 'INACTIVO'}
🗑️ Detección de registros Call: ${config.enabled ? 'ACTIVA' : 'INACTIVA'}
📢 Avisos de eliminación: ${config.enabled ? 'ACTIVOS' : 'INACTIVOS'}

🤖 whatsapp-bot`
    )

    // No responder al comando.
    return
}

// ============================================================
// 🔄 INICIALIZACIÓN AUTOMÁTICA
// ============================================================

handler.before = async function (m, { conn }) {
    registerListeners(conn)
    return false
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = ['anticall']
handler.tags = ['owner']
handler.command = /^anticall$/i
handler.owner = true

export default handler
