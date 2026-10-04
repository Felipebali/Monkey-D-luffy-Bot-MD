// 📦 FelixCat_Bot — Sistema PRO de Sugerencias
// ============================================================
// .sug <texto>              → enviar sugerencia
// .suginfo <ID>             → consultar sugerencia
// .suglist                  → ver pendientes
// .sugs                     → estadísticas
// .sugaceptar <ID>          → aceptar
// .sugrechazar <ID>         → rechazar
// .sugdesarrollo <ID>       → poner en desarrollo
//
// 🆔 El ID SOLO se muestra en el grupo de revisión.
// 👤 El usuario NO ve el ID al enviar.
// 💾 Datos guardados en global.db
// ============================================================

const SUG_GROUP = '120363429424906972@g.us'

const COOLDOWN_TIME = 24 * 60 * 60 * 1000

const MAX_LENGTH = 1000
const MIN_LENGTH = 5


// ============================================================
// 💾 BASE DE DATOS
// ============================================================

function prepararDB() {

  if (!global.db.data)
    global.db.data = {}

  if (!global.db.data.sugerencias)
    global.db.data.sugerencias = []

  if (!global.db.data.sugerenciasCooldown)
    global.db.data.sugerenciasCooldown = {}
}


// ============================================================
// 🧹 LIMPIAR TEXTO
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

  return new Date().toLocaleString(
    'es-UY',
    {
      timeZone: 'America/Montevideo',
      dateStyle: 'short',
      timeStyle: 'medium'
    }
  )
}


// ============================================================
// ⏳ TIEMPO RESTANTE
// ============================================================

function obtenerTiempoRestante(ms) {

  const horas =
    Math.floor(ms / 3600000)

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
// 💾 GUARDAR DB
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
      '⚠️ Error guardando sugerencias:',
      e
    )
  }
}


// ============================================================
// 🔎 BUSCAR SUGERENCIA
// ============================================================

function buscarSugerencia(id) {

  prepararDB()

  return global.db.data.sugerencias.find(
    s =>
      String(s.id).toUpperCase() ===
      String(id).toUpperCase()
  )
}


// ============================================================
// 📊 CONTAR ESTADOS
// ============================================================

function contarEstado(estado) {

  prepararDB()

  return global.db.data.sugerencias.filter(
    s =>
      s.estado === estado
  ).length
}


// ============================================================
// 💡 HANDLER PRINCIPAL
// ============================================================

let handler = async (
  m,
  {
    conn,
    text,
    command,
    usedPrefix
  }
) => {

  prepararDB()

  const cmd =
    String(command || '')
      .toLowerCase()

  const args =
    String(text || '').trim()

  const user =
    m.sender

  const owner =
    isOwner(user)


  // ==========================================================
  // 💡 .SUG
  // ==========================================================

  if (cmd === 'sug') {

    const sugerencia =
      limpiarTexto(args)

    if (!sugerencia) {

      return m.reply(
`╭━━━〔 💡 *SUGERENCIAS* 〕━━━╮
┃
┃ ✏️ Escribí una sugerencia
┃ para ayudar a mejorar
┃ FelixCat-Bot 🐾
┃
┃ 📌 *Uso:*
┃ ${usedPrefix}sug <sugerencia>
┃
┃ 💬 *Ejemplo:*
┃ ${usedPrefix}sug agregar comando de memes
┃
┃ ⏳ *Cooldown:* 24 horas
┃ 📏 *Máximo:* ${MAX_LENGTH} caracteres
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
      )
    }


    // ========================================================
    // 📏 LONGITUD
    // ========================================================

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


    // ========================================================
    // ⏳ COOLDOWN
    // ========================================================

    const ultimoEnvio =
      Number(
        global.db.data
          .sugerenciasCooldown[user] || 0
      )

    const transcurrido =
      Date.now() -
      ultimoEnvio


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


    // ========================================================
    // 🆔 CREAR ID
    // ========================================================

    const id =
      generarId()

    const numero =
      normalizarNumero(user)


    // ========================================================
    // 📦 REGISTRO
    // ========================================================

    const registro = {

      id: id,

      user: user,

      numero: numero,

      texto: sugerencia,

      estado: 'pendiente',

      fecha: Date.now(),

      fechaTexto: fechaUY(),

      owner: owner
    }


    // ========================================================
    // 📤 MENSAJE AL GRUPO
    // ========================================================

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


    try {

      await conn.sendMessage(
        SUG_GROUP,
        {
          text: mensajeGrupo,
          mentions: [user]
        }
      )


      // ======================================================
      // 💾 GUARDAR
      // ======================================================

      global.db.data
        .sugerencias
        .push(registro)


      if (!owner) {

        global.db.data
          .sugerenciasCooldown[user] =
          Date.now()
      }


      await guardarDB()


      // ======================================================
      // 💡 REACCIÓN
      // ======================================================

      try {
        await m.react('💡')
      } catch {}


      // ======================================================
      // 👤 RESPUESTA AL USUARIO
      // 🚫 NO SE MUESTRA EL ID
      // ======================================================

      return m.reply(
`╭━━━〔 ✅ *SUGERENCIA ENVIADA* 〕━━━╮
┃
┃ 💡 ¡Gracias por tu aporte!
┃
┃ 📩 Tu sugerencia fue enviada
┃ correctamente al grupo de revisión.
┃
┃ ⏳ ${
          owner
            ? 'Como owner, no tenés cooldown.'
            : 'Podrás enviar otra en 24 horas.'
        }
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
      )


    } catch (error) {

      console.error(
        '❌ Error enviando sugerencia:',
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


  // ==========================================================
  // 🔎 .SUGINFO
  // ==========================================================

  if (cmd === 'suginfo') {

    if (!owner)
      return m.reply(
        '❌ Solo el owner puede usar este comando.'
      )


    if (!args)
      return m.reply(
        '📌 Uso: *.suginfo SUG-XXXXXX*'
      )


    const sug =
      buscarSugerencia(args)


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
        mentions: [sug.user]
      }
    )
  }


  // ==========================================================
  // 📋 .SUGLIST
  // ==========================================================

  if (cmd === 'suglist') {

    if (!owner)
      return m.reply(
        '❌ Solo el owner puede usar este comando.'
      )


    const pendientes =
      global.db.data
        .sugerencias
        .filter(
          s =>
            s.estado ===
            'pendiente'
        )


    if (!pendientes.length)
      return m.reply(
        '📭 No hay sugerencias pendientes.'
      )


    const ultimas =
      pendientes.slice(-20)


    const lista =
      ultimas
        .map(
          (s, i) =>
`*${i + 1}.* 🆔 ${s.id}
👤 @${s.numero}
📝 ${s.texto}
🟡 PENDIENTE`
        )
        .join('\n\n')


    return m.reply(
`╭━━━〔 📋 *SUGERENCIAS PENDIENTES* 〕━━━╮

${lista}

╰━━━━━━━━━━━━━━━━━━━━━━╯`,
      null,
      {
        mentions:
          ultimas.map(
            s => s.user
          )
      }
    )
  }


  // ==========================================================
  // 📊 .SUGS
  // ==========================================================

  if (cmd === 'sugs') {

    if (!owner)
      return m.reply(
        '❌ Solo el owner puede usar este comando.'
      )


    const total =
      global.db.data
        .sugerencias.length


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


  // ==========================================================
  // 🛠️ CAMBIAR ESTADO
  // ==========================================================

  if (
    cmd === 'sugaceptar' ||
    cmd === 'sugrechazar' ||
    cmd === 'sugdesarrollo'
  ) {

    if (!owner)
      return m.reply(
        '❌ Solo el owner puede modificar sugerencias.'
      )


    if (!args)
      return m.reply(
        '📌 Debés indicar el ID de la sugerencia.'
      )


    const sug =
      buscarSugerencia(args)


    if (!sug)
      return m.reply(
        '❌ No encontré ninguna sugerencia con ese ID.'
      )


    let estado
    let emoji
    let nombre


    if (
      cmd ===
      'sugaceptar'
    ) {

      estado =
        'aceptada'

      emoji =
        '🟢'

      nombre =
        'ACEPTADA'

    } else if (
      cmd ===
      'sugrechazar'
    ) {

      estado =
        'rechazada'

      emoji =
        '🔴'

      nombre =
        'RECHAZADA'

    } else {

      estado =
        'desarrollo'

      emoji =
        '🔵'

      nombre =
        'EN DESARROLLO'
    }


    // ========================================================
    // 💾 ACTUALIZAR
    // ========================================================

    sug.estado =
      estado

    sug.actualizada =
      Date.now()

    sug.actualizadaTexto =
      fechaUY()


    await guardarDB()


    // ========================================================
    // 📤 ACTUALIZAR GRUPO
    // ========================================================

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
┃ 📝 *Sugerencia:*
┃ ${sug.texto}
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
        '❌ Error actualizando grupo:',
        e
      )
    }


    // ========================================================
    // 📩 AVISAR AL USUARIO
    // 🚫 SIN ID
    // ========================================================

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
}


// ============================================================
// ⚙️ CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.help = [
  'sug <texto>',
  'suginfo <ID>',
  'suglist',
  'sugs',
  'sugaceptar <ID>',
  'sugrechazar <ID>',
  'sugdesarrollo <ID>'
]

handler.tags = [
  'info',
  'owner'
]

handler.command = [
  'sug',
  'suginfo',
  'suglist',
  'sugs',
  'sugaceptar',
  'sugrechazar',
  'sugdesarrollo'
]

handler.group = false
handler.limit = false

export default handler
