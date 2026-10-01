// 📦 FelixCat_Bot — Comando .sug
// 💡 Sistema de sugerencias con cooldown de 24 horas

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const SUG_GROUP = '120363429424906972@g.us'
const COOLDOWN_TIME = 24 * 60 * 60 * 1000

// ============================================================
// 💾 BASE DE DATOS DEL COOLDOWN
// ============================================================

global.sugerenciasCooldown = global.sugerenciasCooldown || {}

// ============================================================
// 🧹 UTILIDADES
// ============================================================

function limpiarTexto(texto) {
  return String(texto || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function obtenerTiempoRestante(ms) {
  const horas = Math.floor(ms / 3600000)
  const minutos = Math.floor((ms % 3600000) / 60000)

  if (horas > 0) {
    return `${horas}h ${minutos}m`
  }

  if (minutos > 0) {
    return `${minutos}m`
  }

  return 'menos de 1 minuto'
}

// ============================================================
// 💡 HANDLER
// ============================================================

let handler = async (m, { conn, text, usedPrefix, command }) => {

  const user = m.sender
  const now = Date.now()

  // ==========================================================
  // 📝 COMPROBAR SUGERENCIA
  // ==========================================================

  const sugerencia = limpiarTexto(text)

  if (!sugerencia) {
    return m.reply(
`╭━━━〔 💡 *SUGERENCIAS* 〕━━━╮
┃
┃ ✏️ Escribí tu sugerencia después
┃ del comando.
┃
┃ 📌 *Uso:*
┃ ${usedPrefix + command} <sugerencia>
┃
┃ 💬 *Ejemplo:*
┃ ${usedPrefix + command} estaría bueno agregar un comando de memes
┃
┃ ⏳ *Cooldown:* 24 horas
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
    )
  }

  // ==========================================================
  // 🕒 COOLDOWN
  // ==========================================================

  const ultimoEnvio = global.sugerenciasCooldown[user] || 0
  const transcurrido = now - ultimoEnvio

  if (ultimoEnvio && transcurrido < COOLDOWN_TIME) {

    const restante = COOLDOWN_TIME - transcurrido

    return m.reply(
`⏳ *Todavía no podés enviar otra sugerencia.*

💡 Ya enviaste una sugerencia recientemente.

🕐 Podrás enviar otra en:
*${obtenerTiempoRestante(restante)}*

📌 El límite es de *1 sugerencia cada 24 horas*.`
    )
  }

  // ==========================================================
  // 📏 LÍMITE DE TEXTO
  // ==========================================================

  if (sugerencia.length > 1000) {
    return m.reply(
`⚠️ *La sugerencia es demasiado larga.*

📏 Máximo permitido: *1000 caracteres.*
📝 Tu sugerencia tiene: *${sugerencia.length} caracteres*.`
    )
  }

  // ==========================================================
  // 📤 ENVIAR AL GRUPO DE REVISIÓN
  // ==========================================================

  try {

    const numero = user.split('@')[0]

    const mensaje =
`╭━━━〔 💡 *NUEVA SUGERENCIA* 〕━━━╮
┃
┃ 👤 *Usuario:* @${numero}
┃
┃ 📝 *Sugerencia:*
┃ ${sugerencia}
┃
┃ 🕐 *Fecha:* ${new Date().toLocaleString('es-UY')}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`

    await conn.sendMessage(SUG_GROUP, {
      text: mensaje,
      mentions: [user]
    })

    // ========================================================
    // 💾 GUARDAR COOLDOWN
    // ========================================================

    global.sugerenciasCooldown[user] = now

    // ========================================================
    // ✅ CONFIRMACIÓN
    // ========================================================

    try {
      await m.react('💡')
    } catch {}

    return m.reply(
`╭━━━〔 ✅ *SUGERENCIA ENVIADA* 〕━━━╮
┃
┃ 💡 ¡Gracias por tu aporte!
┃
┃ 📩 Tu sugerencia fue enviada
┃ correctamente al grupo de revisión.
┃
┃ ⏳ Podrás enviar otra en *24 horas*.
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
    )

  } catch (error) {

    console.error('❌ Error en .sug:', error)

    try {
      await m.react('⚠️')
    } catch {}

    return m.reply(
`⚠️ *No se pudo enviar tu sugerencia.*

Puede que el grupo de revisión no esté disponible
o que el bot no tenga acceso a él.

🔄 Intentá nuevamente más tarde.`
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL COMANDO
// ============================================================

handler.help = [
  'sug <texto>'
]

handler.tags = [
  'info'
]

handler.command = /^sug$/i

handler.group = false
handler.limit = false

export default handler
