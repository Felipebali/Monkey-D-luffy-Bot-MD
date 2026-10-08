// 📦 WhatsApp-Bot — Sistema PRO de Sugerencias
// ============================================================
// .sug <texto>              → enviar sugerencia
// .suginfo <ID>             → consultar sugerencia
// .suglist                  → ver pendientes
// .sugs                     → estadísticas
// .sugaceptar <ID>          → aceptar
// .sugrechazar <ID>         → rechazar
// .sugdesarrollo <ID>       → poner en desarrollo
//
// 🆔 ID SIMPLE: SUG-001
// 👤 El usuario NO ve el ID.
// 👥 El grupo de revisión SÍ ve el ID.
// 💾 Datos guardados en global.db
// 📢 Las resoluciones se envían al grupo de origen
// 🚫 NO se envían mensajes privados
// ============================================================


// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const SUG_GROUP = '120363410955044864@g.us'

const COOLDOWN_TIME =
  24 * 60 * 60 * 1000

const MAX_LENGTH = 1000
const MIN_LENGTH = 5


// ============================================================
// 💾 PREPARAR BASE DE DATOS
// ============================================================

function prepararDB() {

  if (!global.db.data)
    global.db.data = {}

  if (!Array.isArray(global.db.data.sugerencias))
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
// 🆔 GENERAR ID SIMPLE
// ============================================================

function generarId() {

  prepararDB()

  let numero = 1

  const sugerencias =
    global.db.data.sugerencias

  if (sugerencias.length > 0) {

    const numeros = sugerencias
      .map(s => {

        const match =
          String(s.id || '')
            .match(/^SUG-(\d+)$/i)

        return match
          ? parseInt(match[1])
          : 0
      })
      .filter(n => n > 0)

    if (numeros.length) {

      numero =
        Math.max(...numeros) + 1
    }
  }

  return `SUG-${String(numero).padStart(3, '0')}`
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

  const buscado =
    String(id || '')
      .trim()
      .toUpperCase()

  return global.db.data.sugerencias.find(
    s =>
      String(s.id || '')
        .toUpperCase() === buscado
  )
}


// ============================================================
// 📊 CONTAR ESTADOS
// ============================================================

function contarEstado(estado) {

  prepararDB()

  return global.db.data.sugerencias
    .filter(
      s =>
        s.estado === estado
    )
    .length
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
┃ WhatsApp-Bot 🐾
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
    // 📏 COMPROBAR LONGITUD
    // ========================================================

    if (
      sugerencia.length <
      MIN_LENGTH
    ) {

      return m.reply(
`⚠️ *Sugerencia demasiado corta.*

📝 Mínimo permitido:
*${MIN_LENGTH} caracteres.*`
      )
    }


    if (
      sugerencia.length >
      MAX_LENGTH
    ) {

      return m.reply(
`⚠️ *Sugerencia demasiado larga.*

📏 Máximo permitido:
*${MAX_LENGTH} caracteres.*

📝 Tu sugerencia tiene:
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
    // 📦 CREAR REGISTRO
    // ========================================================
    // 📌 chat = grupo/chat donde se envió originalmente
    //    la sugerencia. Se utilizará para avisar la resolución.
    // ========================================================

    const registro = {

      id: id,

      user: user,

      numero: numero,

      chat: m.chat,

      texto: sugerencia,

      estado: 'pendiente',

      fecha: Date.now(),

      fechaTexto: fechaUY(),

      owner: owner
    }


    // ========================================================
    // 📤 MENSAJE PARA EL GRUPO DE REVISIÓN
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
      // 💾 GUARDAR SUGERENCIA
      // ======================================================

      global.db.data
        .sugerencias
        .push(registro)


      // ======================================================
      // 💾 GUARDAR COOLDOWN
      // ======================================================

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
      // 🚫 NO SE MUESTRA ID
      // ========================================================

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
        '📌 Uso: *.suginfo SUG-001*'
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
        '📌 Debés indicar el ID.'
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
    // 📤 ACTUALIZAR GRUPO DE REVISIÓN
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
    // 📢 AVISAR EN EL GRUPO DE ORIGEN
    // 🚫 NO SE ENVÍA AL PRIVADO
    // ========================================================

    try {

      // 📌 Compatibilidad con sugerencias antiguas:
      // si no tienen "chat", se usa el grupo de revisión
      // para evitar errores.
      const chatOrigen =
        sug.chat ||
        SUG_GROUP

      await conn.sendMessage(
        chatOrigen,
        {
          text:
`╭━━━〔 ${emoji} *SUGERENCIA ACTUALIZADA* 〕━━━╮
┃
┃ 👤 @${sug.numero}
┃
┃ 💡 *Tu sugerencia recibió
┃ una actualización.*
┃
┃ ${emoji} *Estado:* ${nombre}
┃
┃ 📝 *Sugerencia:*
┃ ${sug.texto}
┃
┃ 🐾 Gracias por ayudar
┃ a mejorar WhatsApp-Bot.
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`,

          mentions:
            [sug.user]
        }
      )

    } catch (e) {

      console.error(
        '⚠️ No se pudo avisar en el grupo de origen:',
        e
      )
    }


    // ========================================================
    // 💬 CONFIRMACIÓN AL OWNER
    // ========================================================

    return m.reply(
`${emoji} *Sugerencia actualizada correctamente.*

📌 Estado: *${nombre}*
📢 Se avisó en el grupo donde fue enviada.
👤 Se mencionó al usuario.`
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


// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
