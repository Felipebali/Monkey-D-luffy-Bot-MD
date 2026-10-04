// 📦 FelixCat_Bot — Comando .sug
// 💡 Sistema avanzado de sugerencias
// ⏳ Cooldown de 24 horas
// 📤 Envía las sugerencias al grupo de revisión
// 💾 Cooldown persistente en global.db
// 👑 Owners sin cooldown
// ============================================================


// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const SUG_GROUP =
  '120363429424906972@g.us'

const COOLDOWN_TIME =
  24 * 60 * 60 * 1000

const MAX_LENGTH =
  1000

const MIN_LENGTH =
  5


// ============================================================
// 💾 PREPARAR BASE DE DATOS
// ============================================================

if (!global.db.data) {
  global.db.data = {}
}

if (!global.db.data.sugerenciasCooldown) {
  global.db.data.sugerenciasCooldown = {}
}


// ============================================================
// 🧹 UTILIDADES
// ============================================================

function limpiarTexto(texto = '') {

  return String(texto)
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}


// ============================================================
// 🔢 NORMALIZAR NÚMERO
// ============================================================

function normalizarNumero(jid = '') {

  return String(jid)
    .replace(/[^0-9]/g, '')
}


// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {

  return (global.owner || [])
    .map(o =>
      Array.isArray(o)
        ? o[0]
        : o
    )
    .filter(Boolean)
    .map(o =>
      normalizarNumero(o)
    )
    .filter(Boolean)
}


// ============================================================
// 👑 COMPROBAR OWNER
// ============================================================

function isOwner(jid) {

  const numero =
    normalizarNumero(jid)

  return getOwners()
    .includes(numero)
}


// ============================================================
// ⏳ TIEMPO RESTANTE
// ============================================================

function obtenerTiempoRestante(ms) {

  if (ms <= 0)
    return 'ya disponible'


  const dias =
    Math.floor(
      ms / 86400000
    )

  const horas =
    Math.floor(
      (ms % 86400000) / 3600000
    )

  const minutos =
    Math.floor(
      (ms % 3600000) / 60000
    )

  const segundos =
    Math.floor(
      (ms % 60000) / 1000
    )


  const partes = []


  if (dias > 0)
    partes.push(`${dias}d`)

  if (horas > 0)
    partes.push(`${horas}h`)

  if (minutos > 0)
    partes.push(`${minutos}m`)

  if (
    segundos > 0 &&
    partes.length < 2
  ) {
    partes.push(`${segundos}s`)
  }


  return partes.join(' ') ||
    'menos de 1 minuto'
}


// ============================================================
// 🕐 FORMATEAR FECHA
// ============================================================

function fechaUY() {

  return new Date()
    .toLocaleString(
      'es-UY',
      {
        timeZone:
          'America/Montevideo',
        dateStyle:
          'short',
        timeStyle:
          'medium'
      }
    )
}


// ============================================================
// 🆔 GENERAR ID DE SUGERENCIA
// ============================================================

function generarId() {

  const tiempo =
    Date.now()
      .toString(36)
      .toUpperCase()

  const random =
    Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()

  return `SUG-${tiempo}-${random}`
}


// ============================================================
// 💡 HANDLER
// ============================================================

let handler = async (
  m,
  {
    conn,
    text,
    usedPrefix,
    command
  }
) => {

  const user =
    m.sender

  const now =
    Date.now()


  // ==========================================================
  // 📝 LIMPIAR SUGERENCIA
  // ==========================================================

  const sugerencia =
    limpiarTexto(text)


  // ==========================================================
  // ❓ SIN TEXTO
  // ==========================================================

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
┃ 📏 *Máximo:* ${MAX_LENGTH} caracteres
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
    )
  }


  // ==========================================================
  // 📏 LONGITUD MÍNIMA
  // ==========================================================

  if (
    sugerencia.length <
    MIN_LENGTH
  ) {

    return m.reply(
`⚠️ *La sugerencia es demasiado corta.*

📝 Mínimo:
*${MIN_LENGTH} caracteres.*

💡 Escribí una sugerencia un poco más detallada.`
    )
  }


  // ==========================================================
  // 📏 LONGITUD MÁXIMA
  // ==========================================================

  if (
    sugerencia.length >
    MAX_LENGTH
  ) {

    return m.reply(
`⚠️ *La sugerencia es demasiado larga.*

📏 Máximo permitido:
*${MAX_LENGTH} caracteres.*

📝 Tu sugerencia:
*${sugerencia.length} caracteres.*`
    )
  }


  // ==========================================================
  // 👑 OWNER
  // ==========================================================

  const owner =
    isOwner(user)


  // ==========================================================
  // ⏳ COOLDOWN
  // ==========================================================

  const ultimoEnvio =
    Number(
      global.db.data
        .sugerenciasCooldown[user] || 0
    )


  const transcurrido =
    now - ultimoEnvio


  if (
    !owner &&
    ultimoEnvio &&
    transcurrido < COOLDOWN_TIME
  ) {

    const restante =
      COOLDOWN_TIME -
      transcurrido


    return m.reply(
`╭━━━〔 ⏳ *COOLDOWN* 〕━━━╮
┃
┃ ❌ Ya enviaste una sugerencia
┃ recientemente.
┃
┃ 🕐 Podrás enviar otra en:
┃ *${obtenerTiempoRestante(restante)}*
┃
┃ 📌 Límite:
┃ *1 sugerencia cada 24 horas*
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
    )
  }


  // ==========================================================
  // 🆔 ID DE SUGERENCIA
  // ==========================================================

  const sugerenciaId =
    generarId()


  // ==========================================================
  // 👤 INFORMACIÓN DEL USUARIO
  // ==========================================================

  const numero =
    normalizarNumero(user)


  // ==========================================================
  // 📤 MENSAJE PARA EL GRUPO
  // ==========================================================

  const mensaje =
`╭━━━〔 💡 *NUEVA SUGERENCIA* 〕━━━╮
┃
┃ 🆔 *ID:* ${sugerenciaId}
┃
┃ 👤 *Usuario:* @${numero}
┃
┃ 📝 *Sugerencia:*
┃
┃ ${sugerencia}
┃
┃ 👑 *Owner:* ${owner ? 'Sí' : 'No'}
┃
┃ 🕐 *Fecha:* ${fechaUY()}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`


  // ==========================================================
  // 📤 ENVIAR AL GRUPO
  // ==========================================================

  try {

    await conn.sendMessage(
      SUG_GROUP,
      {
        text: mensaje,

        mentions: [
          user
        ]
      }
    )


    // ========================================================
    // 💾 GUARDAR COOLDOWN
    // ========================================================

    if (!owner) {

      global.db.data
        .sugerenciasCooldown[user] =
        now
    }


    // ========================================================
    // 💾 GUARDAR DB
    // ========================================================

    try {

      if (
        typeof global.db.write ===
        'function'
      ) {

        await global.db.write()
      }

    } catch (dbError) {

      console.error(
        '⚠️ Error guardando cooldown:',
        dbError
      )
    }


    // ========================================================
    // 💡 REACCIÓN
    // ========================================================

    try {

      await m.react('💡')

    } catch {}


    // ========================================================
    // ✅ CONFIRMACIÓN
    // ========================================================

    return m.reply(
`╭━━━〔 ✅ *SUGERENCIA ENVIADA* 〕━━━╮
┃
┃ 💡 ¡Gracias por tu aporte!
┃
┃ 📩 Tu sugerencia fue enviada
┃ correctamente al grupo de revisión.
┃
┃ 🆔 *ID:* ${sugerenciaId}
┃
┃ ⏳ ${owner
      ? 'Como owner, no tenés cooldown.'
      : 'Podrás enviar otra en 24 horas.'}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
    )


  } catch (error) {

    // ========================================================
    // ❌ ERROR
    // ========================================================

    console.error(
      '❌ Error en .sug:',
      error
    )


    try {

      await m.react('⚠️')

    } catch {}


    return m.reply(
`╭━━━〔 ⚠️ *ERROR* 〕━━━╮
┃
┃ No se pudo enviar tu sugerencia.
┃
┃ 📡 El grupo de revisión podría
┃ no estar disponible o el bot
┃ podría no tener acceso.
┃
┃ 🔄 Intentá nuevamente más tarde.
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
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

handler.command =
  /^sug$/i

handler.group =
  false

handler.limit =
  false


// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
