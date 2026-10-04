// 📦 FelixCat_Bot — Sistema PRO de Sugerencias
// 💡 .sug <texto>              → enviar sugerencia
// 🔎 .suginfo <ID>             → consultar sugerencia
// 📋 .suglist                  → ver pendientes
// 📊 .sugs                     → estadísticas
// 🟢 .sugaceptar <ID>          → aceptar
// 🔴 .sugrechazar <ID>         → rechazar
// 🔵 .sugdesarrollo <ID>       → poner en desarrollo
//
// 🆔 El ID SOLO se muestra en el grupo de revisión.
// 👤 El usuario que envía la sugerencia NO ve el ID.
// 💾 Sistema persistente mediante global.db
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

if (!global.db.data)
  global.db.data = {}

if (!global.db.data.sugerencias)
  global.db.data.sugerencias = []

if (!global.db.data.sugerenciasCooldown)
  global.db.data.sugerenciasCooldown = {}


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
// 🔢 NORMALIZAR JID
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

  return getOwners()
    .includes(
      normalizarNumero(jid)
    )
}


// ============================================================
// 🆔 GENERAR ID
// ============================================================

function generarId() {

  const tiempo =
    Date.now()
      .toString(36)
      .toUpperCase()

  const random =
    Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()

  return `SUG-${tiempo}-${random}`
}


// ============================================================
// 🕐 FECHA URUGUAY
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
// ⏳ TIEMPO RESTANTE
// ============================================================

function obtenerTiempoRestante(ms) {

  const horas =
    Math.floor(
      ms / 3600000
    )

  const minutos =
    Math.floor(
      (ms % 3600000) / 60000
    )

  if (horas > 0)
    return `${horas}h ${minutos}m`

  if (minutos > 0)
    return `${minutos}m`

  return 'menos de 1 minuto'
}


// ============================================================
// 💾 GUARDAR BASE DE DATOS
// ============================================================

async function guardarDB() {

  try {

    if (
      typeof global.db.write ===
      'function'
    ) {

      await global.db.write()
    }

  } catch (e) {

    console.error(
      '⚠️ Error guardando DB:',
      e
    )
  }
}


// ============================================================
// 🔎 BUSCAR SUGERENCIA
// ============================================================

function buscarSugerencia(id) {

  return global.db.data.sugerencias
    .find(
      s =>
        String(s.id).toUpperCase() ===
        String(id).toUpperCase()
    )
}


// ============================================================
// 📊 CONTAR ESTADOS
// ============================================================

function contarEstado(estado) {

  return global.db.data.sugerencias
    .filter(
      s => s.estado === estado
    )
    .length
}


// ============================================================
// 💡 COMANDO PRINCIPAL
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

  const sugerencia =
    limpiarTexto(text)


  // ==========================================================
  // ❓ AYUDA
  // ==========================================================

  if (!sugerencia) {

    return m.reply(
`╭━━━〔 💡 *SUGERENCIAS* 〕━━━╮
┃
┃ ✏️ Enviá una sugerencia
┃ para ayudar a mejorar
┃ FelixCat-Bot 🐾
┃
┃ 📌 *Uso:*
┃ ${usedPrefix + command} <sugerencia>
┃
┃ 💬 *Ejemplo:*
┃ ${usedPrefix + command} agregar un comando de memes
┃
┃ ⏳ *Cooldown:* 24 horas
┃ 📏 *Máximo:* ${MAX_LENGTH} caracteres
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
    )
  }


  // ==========================================================
  // 📏 VALIDAR LONGITUD
  // ==========================================================

  if (
    sugerencia.length <
    MIN_LENGTH
  ) {

    return m.reply(
`⚠️ *Sugerencia demasiado corta.*

📝 Mínimo:
*${MIN_LENGTH} caracteres.*`
    )
  }


  if (
    sugerencia.length >
    MAX_LENGTH
  ) {

    return m.reply(
`⚠️ *Sugerencia demasiado larga.*

📏 Máximo:
*${MAX_LENGTH} caracteres.*

📝 Actual:
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
    transcurrido <
      COOLDOWN_TIME
  ) {

    return m.reply(
`╭━━━〔 ⏳ *COOLDOWN* 〕━━━╮
┃
┃ ❌ Ya enviaste una sugerencia.
┃
┃ 🕐 Podrás enviar otra en:
┃ *${obtenerTiempoRestante(
      COOLDOWN_TIME -
      transcurrido
    )}*
┃
┃ 📌 Límite:
┃ *1 sugerencia cada 24 horas.*
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
    )
  }


  // ==========================================================
  // 🆔 GENERAR ID
  // ==========================================================

  const id =
    generarId()

  const numero =
    normalizarNumero(user)


  // ==========================================================
  // 📦 CREAR REGISTRO
  // ==========================================================

  const registro = {

    id,

    user,

    numero,

    texto:
      sugerencia,

    estado:
      'pendiente',

    fecha:
      Date.now(),

    fechaTexto:
      fechaUY(),

    owner:
      owner
  }


  // ==========================================================
  // 📤 MENSAJE AL GRUPO
  // ==========================================================

  const mensajeGrupo =
`╭━━━〔 💡 *NUEVA SUGERENCIA* 〕━━━╮
┃
┃ 🆔 *ID:* ${id}
┃
┃ 👤 *Usuario:* @${numero}
┃
┃ 📝 *Sugerencia:*
┃
┃ ${sugerencia}
┃
┃ 🟡 *Estado:* PENDIENTE
┃
┃ 🕐 *Fecha:* ${fechaUY()}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`


  // ==========================================================
  // 📤 ENVIAR
  // ==========================================================

  try {

    await conn.sendMessage(
      SUG_GROUP,
      {
        text:
          mensajeGrupo,

        mentions:
          [user]
      }
    )


    // ========================================================
    // 💾 GUARDAR SUGERENCIA
    // ========================================================

    global.db.data
      .sugerencias
      .push(registro)


    // ========================================================
    // 💾 GUARDAR COOLDOWN
    // ========================================================

    if (!owner) {

      global.db.data
        .sugerenciasCooldown[user] =
        now
    }


    await guardarDB()


    // ========================================================
    // 💡 REACCIÓN
    // ========================================================

    try {

      await m.react('💡')

    } catch {}


    // ========================================================
    // 👤 RESPUESTA AL USUARIO
    // ========================================================
    // 🚫 SIN ID

    return m.reply(
`╭━━━〔 ✅ *SUGERENCIA ENVIADA* 〕━━━╮
┃
┃ 💡 ¡Gracias por tu aporte!
┃
┃ 📩 Tu sugerencia fue enviada
┃ correctamente al grupo de revisión.
┃
┃ ⏳ ${owner
      ? 'Como owner, no tenés cooldown.'
      : 'Podrás enviar otra en 24 horas.'}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
    )


  } catch (error) {

    console.error(
      '❌ Error en .sug:',
      error
    )

    try {
      await m.react('⚠️')
    } catch {}

    return m.reply(
`⚠️ *No se pudo enviar la sugerencia.*

El grupo de revisión podría
no estar disponible.

🔄 Intentá nuevamente más tarde.`
    )
  }
}


// ============================================================
// 🔎 .SUGINFO
// ============================================================

let sugInfo = async (
  m,
  { conn, text }
) => {

  if (!isOwner(m.sender))
    return m.reply(
      '❌ Solo el owner puede consultar sugerencias.'
    )

  const id =
    limpiarTexto(text)

  if (!id)
    return m.reply(
      '📌 Uso: *.suginfo SUG-XXXXXX*'
    )

  const sug =
    buscarSugerencia(id)

  if (!sug)
    return m.reply(
      '❌ No encontré ninguna sugerencia con ese ID.'
    )

  return m.reply(
`╭━━━〔 🔎 *SUGERENCIA* 〕━━━╮
┃
┃ 🆔 *ID:* ${sug.id}
┃
┃ 👤 *Usuario:* @${sug.numero}
┃
┃ 📝 *Texto:*
┃ ${sug.texto}
┃
┃ 📌 *Estado:* ${sug.estado.toUpperCase()}
┃
┃ 🕐 *Fecha:* ${sug.fechaTexto}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`,
    null,
    {
      mentions:
        [sug.user]
    }
  )
}


// ============================================================
// 📋 .SUGLIST
// ============================================================

let sugList = async (
  m,
  { conn }
) => {

  if (!isOwner(m.sender))
    return m.reply(
      '❌ Solo el owner puede ver la lista.'
    )

  const pendientes =
    global.db.data.sugerencias
      .filter(
        s =>
          s.estado ===
          'pendiente'
      )

  if (!pendientes.length)
    return m.reply(
      '📭 No hay sugerencias pendientes.'
    )

  const lista =
    pendientes
      .slice(-20)
      .map(
        (s, i) =>
`*${i + 1}.* 🆔 ${s.id}
👤 @${s.numero}
📝 ${s.texto}
🟡 Pendiente`
      )
      .join('\n\n')

  return m.reply(
`╭━━━〔 📋 *SUGERENCIAS PENDIENTES* 〕━━━╮

${lista}

╰━━━━━━━━━━━━━━━━━━━━━━╯`,
    null,
    {
      mentions:
        pendientes
          .slice(-20)
          .map(s => s.user)
    }
  )
}


// ============================================================
// 📊 .SUGS
// ============================================================

let sugs = async (
  m,
  { conn }
) => {

  if (!isOwner(m.sender))
    return m.reply(
      '❌ Solo el owner puede ver las estadísticas.'
    )

  const total =
    global.db.data.sugerencias.length

  const pendientes =
    contarEstado('pendiente')

  const aceptadas =
    contarEstado('aceptada')

  const rechazadas =
    contarEstado('rechazada')

  const desarrollo =
    contarEstado('desarrollo')

  return m.reply(
`╭━━━〔 📊 *ESTADÍSTICAS* 〕━━━╮
┃
┃ 💡 *Total:* ${total}
┃
┃ 🟡 *Pendientes:* ${pendientes}
┃ 🟢 *Aceptadas:* ${aceptadas}
┃ 🔴 *Rechazadas:* ${rechazadas}
┃ 🔵 *En desarrollo:* ${desarrollo}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
  )
}


// ============================================================
// 🛠️ CAMBIAR ESTADO
// ============================================================

async function cambiarEstado(
  m,
  estado,
  emoji,
  nombre
) {

  if (!isOwner(m.sender))
    return m.reply(
      '❌ Solo el owner puede modificar sugerencias.'
    )

  const id =
    limpiarTexto(
      m.text
        .replace(
          /^\.?(sugaceptar|sugrechazar|sugdesarrollo)\s*/i,
          ''
        )
    )

  if (!id)
    return m.reply(
      '📌 Debés indicar el ID de la sugerencia.'
    )

  const sug =
    buscarSugerencia(id)

  if (!sug)
    return m.reply(
      '❌ No encontré esa sugerencia.'
    )

  sug.estado =
    estado

  sug.actualizada =
    Date.now()

  sug.actualizadaTexto =
    fechaUY()

  await guardarDB()

  // ==========================================================
  // 📤 AVISO EN EL GRUPO
  // ==========================================================

  try {

    await conn.sendMessage(
      SUG_GROUP,
      {
        text:
`╭━━━〔 ${emoji} *SUGERENCIA ACTUALIZADA* 〕━━━╮
┃
┃ 🆔 *ID:* ${sug.id}
┃
┃ 👤 *Usuario:* @${sug.numero}
┃
┃ 📝 ${sug.texto}
┃
┃ ${emoji} *Estado:* ${nombre}
┃
┃ 🕐 *Actualizado:* ${fechaUY()}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`,

        mentions:
          [sug.user]
      }
    )

  } catch (e) {

    console.error(
      '❌ Error avisando al grupo:',
      e
    )
  }


  // ==========================================================
  // 📩 AVISAR AL USUARIO
  // ==========================================================
  // 🚫 SIN ID

  try {

    await conn.sendMessage(
      sug.user,
      {
        text:
`╭━━━〔 ${emoji} *SUGERENCIA ACTUALIZADA* 〕━━━╮
┃
┃ 💡 Tu sugerencia recibió
┃ una actualización.
┃
┃ ${emoji} *Estado:* ${nombre}
┃
┃ 📝 ${sug.texto}
┃
┃ 🐾 Gracias por ayudar
┃ a mejorar FelixCat-Bot.
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
      }
    )

  } catch (e) {

    console.error(
      '⚠️ No se pudo avisar al usuario:',
      e
    )
  }


  return m.reply(
`${emoji} *Sugerencia actualizada correctamente.*

📌 Estado: *${nombre}*`
  )
}


// ============================================================
// 🟢 .SUGACEPTAR
// ============================================================

let sugAceptar = async (
  m,
  { conn }
) => {

  return cambiarEstado(
    m,
    'aceptada',
    '🟢',
    'ACEPTADA'
  )
}


// ============================================================
// 🔴 .SUGRECHAZAR
// ============================================================

let sugRechazar = async (
  m,
  { conn }
) {

  return cambiarEstado(
    m,
    'rechazada',
    '🔴',
    'RECHAZADA'
  )
}


// ============================================================
// 🔵 .SUGDESARROLLO
// ============================================================

let sugDesarrollo = async (
  m,
  { conn }
) {

  return cambiarEstado(
    m,
    'desarrollo',
    '🔵',
    'EN DESARROLLO'
  )
}


// ============================================================
// ⚙️ CONFIGURACIÓN
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


sugInfo.help = [
  'suginfo <ID>'
]

sugInfo.tags = [
  'owner'
]

sugInfo.command =
  /^suginfo$/i

sugInfo.rowner =
  true


sugList.help = [
  'suglist'
]

sugList.tags = [
  'owner'
]

sugList.command =
  /^suglist$/i

sugList.rowner =
  true


sugs.help = [
  'sugs'
]

sugs.tags = [
  'owner'
]

sugs.command =
  /^sugs$/i

sugs.rowner =
  true


sugAceptar.help = [
  'sugaceptar <ID>'
]

sugAceptar.tags = [
  'owner'
]

sugAceptar.command =
  /^sugaceptar$/i

sugAceptar.rowner =
  true


sugRechazar.help = [
  'sugrechazar <ID>'
]

sugRechazar.tags = [
  'owner'
]

sugRechazar.command =
  /^sugrechazar$/i

sugRechazar.rowner =
  true


sugDesarrollo.help = [
  'sugdesarrollo <ID>'
]

sugDesarrollo.tags = [
  'owner'
]

sugDesarrollo.command =
  /^sugdesarrollo$/i

sugDesarrollo.rowner =
  true


// ============================================================
// 📤 EXPORTAR
// ============================================================

export {
  handler as default,
  sugInfo,
  sugList,
  sugs,
  sugAceptar,
  sugRechazar,
  sugDesarrollo
}
