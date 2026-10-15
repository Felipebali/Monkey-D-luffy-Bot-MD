// 📂 plugins/parejas.js
// 💞 Sistema completo de parejas, noviazgo, matrimonio e infidelidad
// FelixCat_Bot ❤️

import fs from 'fs'
import path from 'path'

const dir = './database'

if (!fs.existsSync(dir))
  fs.mkdirSync(dir, { recursive: true })

const file = path.join(dir, 'parejas.json')

if (!fs.existsSync(file))
  fs.writeFileSync(file, JSON.stringify({}, null, 2))


// ============================================================
// 💾 BASE DE DATOS
// ============================================================

const loadDB = () => {
  try {
    return JSON.parse(fs.readFileSync(file))
  } catch {
    return {}
  }
}

const saveDB = (data) => {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  )
}


// ============================================================
// ⏳ 3 DÍAS PARA PODER CASARSE
// ============================================================

const TRES_DIAS = 3 * 24 * 60 * 60 * 1000


// ============================================================
// 👑 DUEÑOS
// ============================================================

function getOwnersJid() {

  return (global.owner || [])
    .map(v => {

      if (Array.isArray(v))
        v = v[0]

      if (typeof v !== 'string')
        return null

      return v.replace(
        /[^0-9]/g,
        ''
      ) + '@s.whatsapp.net'

    })
    .filter(Boolean)
}


// ============================================================
// 💕 HANDLER
// ============================================================

let handler = async (m, { conn, command }) => {

  const db = loadDB()

  const sender = conn.decodeJid(m.sender)

  const ahora = Date.now()

  const ownersJid = getOwnersJid()


  // ============================================================
  // 👤 CREAR / OBTENER USUARIO
  // ============================================================

  const getUser = (id) => {

    if (!db[id]) {

      db[id] = {

        pareja: null,

        estado: 'soltero',

        propuesta: null,

        propuestaFecha: null,

        propuestaMatrimonio: null,

        propuestaMatrimonioFecha: null,

        relacionFecha: null,

        matrimonioFecha: null,

        amor: 0

      }
    }

    return db[id]
  }


  // ============================================================
  // 🏷️ MENCIONAR
  // ============================================================

  const tag = (id) => {

    if (!id)
      return ''

    return '@' + id.split('@')[0]
  }


  // ============================================================
  // ⏱️ FORMATO DE TIEMPO
  // ============================================================

  const tiempo = (ms) => {

    const dias = Math.floor(
      ms / 86400000
    )

    const horas = Math.floor(
      (ms % 86400000) / 3600000
    )

    return `${dias} día(s) y ${horas} hora(s)`
  }


  // ============================================================
  // 📦 CAJA
  // ============================================================

  const box = (title, text) => `
╭━━━〔 ${title} 〕━━━⬣
${text}
╰━━━━━━━━━━━━━━━━⬣`


  // ============================================================
  // 🎯 OBTENER OBJETIVO
  // MENCIONANDO O RESPONDIENDO/CITANDO
  // ============================================================

  const getTarget = () => {

    // 👤 Mención
    if (m.mentionedJid?.length)
      return conn.decodeJid(
        m.mentionedJid[0]
      )

    // 💬 Respuesta / citado
    if (m.quoted?.sender)
      return conn.decodeJid(
        m.quoted.sender
      )

    return null
  }


  // ============================================================
  // 🔎 COMPARAR DOS JID
  // ============================================================

  const sameUser = (a, b) => {

    if (!a || !b)
      return false

    a = conn.decodeJid(a)
    b = conn.decodeJid(b)

    // Comparación directa
    if (a === b)
      return true


    // Limpiar identificador de dispositivo
    const clean = jid => {

      if (!jid)
        return ''

      return jid
        .split(':')[0]
        .toLowerCase()
    }


    const cleanA = clean(a)
    const cleanB = clean(b)


    if (cleanA === cleanB)
      return true


    // Comparar números
    const numberA =
      cleanA.replace(
        /[^0-9]/g,
        ''
      )

    const numberB =
      cleanB.replace(
        /[^0-9]/g,
        ''
      )


    return Boolean(
      numberA &&
      numberB &&
      numberA === numberB
    )
  }


  // ============================================================
  // 🔎 BUSCAR ID REAL EN parejas.json
  // ============================================================

  const findUserId = (jid) => {

    if (!jid)
      return null


    if (db[jid])
      return jid


    for (const id of Object.keys(db)) {

      if (sameUser(id, jid))
        return id
    }


    return jid
  }


  // ============================================================
  // 💘 PROPUESTA DE NOVIAZGO
  // ============================================================

  if (command === 'pareja') {

    const targetRaw = getTarget()

    if (!targetRaw)
      return m.reply(
        '💌 Para enviar una propuesta de noviazgo, menciona a la persona o responde a uno de sus mensajes.'
      )


    const target = findUserId(targetRaw)


    if (sameUser(target, sender))
      return m.reply(
        '💭 Una historia de amor necesita dos personas. No puedes enviarte una propuesta a ti mismo.'
      )


    const user = getUser(sender)

    const tu = getUser(target)


    // 🚫 YA TIENE PAREJA
    if (user.pareja)

      return conn.reply(

        m.chat,

        box(
          '💞 RELACIÓN ACTUAL',

          `${tag(sender)} ❤️ ${tag(user.pareja)}

Actualmente tienes una relación registrada. Para realizar una nueva propuesta, primero debes cerrar tu relación actual.`
        ),

        m,

        {
          mentions: [
            sender,
            user.pareja
          ]
        }
      )


    // 🚫 PERSONA OCUPADA
    if (tu.pareja)

      return conn.reply(

        m.chat,

        box(
          '💞 ESTA PERSONA TIENE PAREJA',

          `${tag(target)} ❤️ ${tag(tu.pareja)}

Esta persona mantiene una relación actualmente.
Por favor, respeta su vínculo y su decisión. ❤️`
        ),

        m,

        {
          mentions: [
            target,
            tu.pareja
          ]
        }
      )


    // 💌 GUARDAR PROPUESTA
    tu.propuesta = sender

    tu.propuestaFecha = ahora

    saveDB(db)


    // 💌 CARTA DE AMOR
    return conn.reply(

      m.chat,

      box(

        '💌 PROPUESTA DE NOVIAZGO',

        `💐 Para: ${tag(target)}

A veces, una persona llega a nuestra vida
y aporta momentos que merecen ser recordados. ❤️

Hoy ${tag(sender)} quiere hacerte una propuesta especial.

💖 ¿Te gustaría comenzar una relación juntos?

╭───────────────╮
💌 RESPONDE A LA PROPUESTA
╰───────────────╯

✅ *.aceptar* — Aceptar la propuesta
💔 *.rechazar* — Rechazar la propuesta

🌹 Sea cual sea tu respuesta, que sea sincera y de corazón.`
      ),

      m,

      {
        mentions: [
          sender,
          target
        ]
      }
    )
  }


  // ============================================================
  // 💖 ACEPTAR NOVIAZGO
  // ============================================================

  if (command === 'aceptar') {

    const user = getUser(sender)


    if (!user.propuesta)

      return m.reply(
        '💌 No tienes ninguna propuesta de noviazgo pendiente por responder.'
      )


    const proposer =
      findUserId(user.propuesta)

    const proposerUser =
      getUser(proposer)


    // 🚫 COMPROBAR PAREJAS
    if (
      user.pareja ||
      proposerUser.pareja
    )

      return m.reply(
        '⚠️ No se puede confirmar la relación porque una de las dos personas ya tiene una pareja registrada.'
      )


    // 💞 CREAR RELACIÓN
    user.estado = 'novios'

    proposerUser.estado = 'novios'

    user.pareja = proposer

    proposerUser.pareja = sender

    user.relacionFecha = ahora

    proposerUser.relacionFecha = ahora

    user.propuesta = null

    user.propuestaFecha = null

    proposerUser.propuesta = null

    proposerUser.propuestaFecha = null


    saveDB(db)


    // 💞 CARTA DE NOVIAZGO
    return conn.reply(

      m.chat,

      box(

        '💞 RELACIÓN CONFIRMADA',

        `💖 ${tag(sender)} ❤️ ${tag(proposer)}

╭────────────────────╮
       💞 NOVIAZGO 💞
╰────────────────────╯

Desde ahora, ambos han decidido
comenzar una relación. ❤️

Que esta etapa esté acompañada de
confianza, respeto, comunicación
y momentos felices. 💐

⏳ Después de 3 días de noviazgo
podrán presentar una propuesta de matrimonio.

💍 Para hacerlo, utiliza *.casarse*.`
      ),

      m,

      {
        mentions: [
          sender,
          proposer
        ]
      }
    )
  }


  // ============================================================
  // ❌ RECHAZAR NOVIAZGO
  // ============================================================

  if (command === 'rechazar') {

    const user = getUser(sender)


    if (!user.propuesta)

      return m.reply(
        '💌 No tienes ninguna propuesta de noviazgo pendiente por responder.'
      )


    const proposer =
      user.propuesta


    user.propuesta = null

    user.propuestaFecha = null


    saveDB(db)


    return conn.reply(

      m.chat,

      box(

        '💌 RESPUESTA A LA PROPUESTA',

        `${tag(sender)} ha decidido no aceptar
la propuesta de ${tag(proposer)}.

Cada persona tiene sus propios sentimientos y tiempos.
Gracias por expresar tu decisión con sinceridad. 🤍`
      ),

      m,

      {
        mentions: [
          sender,
          proposer
        ]
      }
    )
  }


  // ============================================================
  // 💑 RELACIÓN
  // ============================================================

  if (command === 'relacion') {

    const user = getUser(sender)


    if (!user.pareja)

      return m.reply(
        '💞 No tienes una relación registrada actualmente.'
      )


    const pareja =
      findUserId(user.pareja)


    const estado =
      user.matrimonioFecha
        ? '💍 Casados'
        : '💑 Novios'


    const tiempoJuntos =
      user.relacionFecha
        ? tiempo(
            ahora -
            user.relacionFecha
          )
        : 'Desconocido'


    return conn.reply(

      m.chat,

      box(

        '💖 INFORMACIÓN DE LA RELACIÓN',

        `${tag(sender)} ❤️ ${tag(pareja)}

Estado actual: ${estado}

Tiempo de relación: ${tiempoJuntos}

Puntos de amor acumulados: ❤️ ${user.amor}`
      ),

      m,

      {
        mentions: [
          sender,
          pareja
        ]
      }
    )
  }


  // ============================================================
  // 💍 CASARSE
  // ============================================================

  if (command === 'casarse') {

    const user = getUser(sender)


    if (!user.pareja)

      return m.reply(
        '💞 Para utilizar esta opción, primero debes tener una pareja registrada.'
      )


    if (user.matrimonioFecha)

      return m.reply(
        '💍 El sistema ya registra un matrimonio entre ustedes.'
      )


    if (!user.relacionFecha)

      return m.reply(
        '⚠️ No se encontró la fecha de inicio de la relación. No es posible verificar el tiempo de noviazgo.'
      )


    const tiempoRelacion =
      ahora -
      user.relacionFecha


    // ============================================================
    // 👑 OWNER
    // LOS OWNERS PUEDEN CASARSE CUANDO QUIERAN
    // ============================================================

    const esOwner =
      ownersJid.some(
        owner => sameUser(
          owner,
          sender
        )
      )


    // ============================================================
    // ⏳ ESPERAR 3 DÍAS
    // SOLO PARA USUARIOS NORMALES
    // ============================================================

    if (
      !esOwner &&
      tiempoRelacion <
      TRES_DIAS
    ) {

      const faltan =
        tiempo(
          TRES_DIAS -
          tiempoRelacion
        )


      return conn.reply(

        m.chat,

        box(

          '⏳ AÚN NO PUEDEN CASARSE',

          `${tag(sender)} ❤️ ${tag(user.pareja)}

💑 Tiempo de relación: ${tiempo(tiempoRelacion)}

Para presentar la propuesta de matrimonio,
deben cumplir al menos 3 días de noviazgo.

⏳ Tiempo restante: ${faltan}

❤️ Disfruten esta etapa y sigan construyendo
su relación con respeto y confianza.`
        ),

        m,

        {
          mentions: [
            sender,
            user.pareja
          ]
        }
      )
    }


    // 💍 CREAR PROPUESTA
    const pareja =
      getUser(
        findUserId(
          user.pareja
        )
      )


    pareja.propuestaMatrimonio =
      sender

    pareja.propuestaMatrimonioFecha =
      ahora


    saveDB(db)


    // 💒 CARTA DE MATRIMONIO
    return conn.reply(

      m.chat,

      box(

        '💒 PROPUESTA DE MATRIMONIO',

        `💐 Para: ${tag(user.pareja)}

Han compartido momentos, experiencias
y recuerdos que forman parte de su historia. ❤️

Hoy ${tag(sender)} desea dar un paso importante
y te propone comenzar una nueva etapa juntos.

💍 ¿Aceptas casarte y continuar construyendo
esta historia con compromiso y respeto?

╭────────────────────╮
💌 RESPONDE A LA PROPUESTA
╰────────────────────╯

✅ *.si* — Aceptar la propuesta
💔 *.no* — Rechazar la propuesta

🤍 Tómate un momento y responde con sinceridad.`
      ),

      m,

      {
        mentions: [
          sender,
          user.pareja
        ]
      }
    )
  }


  // ============================================================
  // 💍 ACEPTAR MATRIMONIO
  // ============================================================

  if (command === 'si') {

    const user = getUser(sender)


    if (!user.propuestaMatrimonio)

      return m.reply(
        '💍 No tienes ninguna propuesta de matrimonio pendiente por responder.'
      )


    const proposer =
      findUserId(
        user.propuestaMatrimonio
      )


    const proposerUser =
      getUser(proposer)


    // 🚫 YA NO SON PAREJA
    if (
      !sameUser(
        user.pareja,
        proposer
      )
    )

      return m.reply(
        '⚠️ La propuesta no puede confirmarse porque ya no figura una relación activa entre ustedes.'
      )


    // 💍 CASAMIENTO
    user.matrimonioFecha =
      ahora

    proposerUser.matrimonioFecha =
      ahora

    user.estado = 'casados'

    proposerUser.estado = 'casados'

    user.propuestaMatrimonio =
      null

    user.propuestaMatrimonioFecha =
      null

    proposerUser.propuestaMatrimonio =
      null

    proposerUser.propuestaMatrimonioFecha =
      null


    saveDB(db)


    return conn.reply(

      m.chat,

      box(

        '💍 MATRIMONIO REGISTRADO',

        `${tag(sender)} 💍 ${tag(proposer)}

╭────────────────────╮
      💍 MATRIMONIO 💍
╰────────────────────╯

Se ha registrado oficialmente su matrimonio. ❤️

Que esta nueva etapa esté marcada por
la confianza, el compañerismo, el respeto
y muchos momentos felices. 💐

✨ ¡Felicidades a ambos por este nuevo comienzo! ✨`
      ),

      m,

      {
        mentions: [
          sender,
          proposer
        ]
      }
    )
  }


  // ============================================================
  // ❌ RECHAZAR MATRIMONIO
  // ============================================================

  if (command === 'no') {

    const user = getUser(sender)


    if (!user.propuestaMatrimonio)

      return m.reply(
        '💍 No tienes ninguna propuesta de matrimonio pendiente por responder.'
      )


    const proposer =
      user.propuestaMatrimonio


    user.propuestaMatrimonio =
      null

    user.propuestaMatrimonioFecha =
      null


    saveDB(db)


    return conn.reply(

      m.chat,

      box(

        '💔 MATRIMONIO RECHAZADO',

        `${tag(sender)} ha rechazado
casarse con ${tag(proposer)}.

💔 La relación continúa como noviazgo.`
      ),

      m,

      {
        mentions: [
          sender,
          proposer
        ]
      }
    )
  }


  // ============================================================
  // 💔 TERMINAR NOVIAZGO
  // ============================================================

  if (command === 'terminar') {

    const user = getUser(sender)


    if (!user.pareja)

      return m.reply(
        '💞 No tienes una pareja registrada para realizar esta acción.'
      )


    if (user.matrimonioFecha)

      return m.reply(
        '💍 El sistema registra que están casados. Para cambiar su estado civil, utiliza *.divorciar*.'
      )


    const exId =
      findUserId(
        user.pareja
      )


    const pareja =
      getUser(exId)


    user.pareja = null

    pareja.pareja = null

    user.estado = 'soltero'

    pareja.estado = 'soltero'

    user.relacionFecha = null

    pareja.relacionFecha = null

    user.amor = 0

    pareja.amor = 0


    saveDB(db)


    return conn.reply(

      m.chat,

      box(

        '🤍 RELACIÓN FINALIZADA',

        `${tag(sender)} 💔 ${tag(exId)}

La relación ha sido finalizada y el registro se ha actualizado.

Ambas personas vuelven a figurar como solteras.
Les deseamos lo mejor en sus próximos caminos. 🤍`
      ),

      m,

      {
        mentions: [
          sender,
          exId
        ]
      }
    )
  }


  // ============================================================
  // 💔 DIVORCIAR
  // ============================================================

  if (command === 'divorciar') {

    const user = getUser(sender)


    if (!user.matrimonioFecha)

      return m.reply(
        '💍 No tienes un matrimonio registrado actualmente.'
      )


    const pareja =
      getUser(
        findUserId(
          user.pareja
        )
      )


    user.matrimonioFecha =
      null

    pareja.matrimonioFecha =
      null

    user.estado = 'novios'

    pareja.estado = 'novios'


    saveDB(db)


    return conn.reply(

      m.chat,

      box(

        '🤍 MATRIMONIO FINALIZADO',

        `${tag(sender)} 💔 ${tag(user.pareja)}

El registro de matrimonio ha sido finalizado.

El vínculo se mantiene como noviazgo en el sistema. 💞`
      ),

      m,

      {
        mentions: [
          sender,
          user.pareja
        ]
      }
    )
  }


  // ============================================================
  // 💕 ACCIONES ROMÁNTICAS
  //
  // amor
  // besar
  // abrazar
  // flores
  // regalo
  // cita
  //
  // TODAS FUNCIONAN POR:
  // 👤 MENCIÓN
  // 💬 RESPUESTA / CITA
  // ============================================================

  if (
    [
      'amor',
      'besar',
      'abrazar',
      'flores',
      'regalo',
      'cita'
    ].includes(command)
  ) {

    const user =
      getUser(sender)


    const targetRaw =
      getTarget()


    if (!targetRaw)

      return m.reply(
        `💌 Para utilizar esta acción, menciona a la persona o responde a uno de sus mensajes.

Comando solicitado: *.${command}*`
      )


    const target =
      findUserId(targetRaw)


    if (
      sameUser(
        target,
        sender
      )
    )

      return m.reply(
        '💭 Esta acción requiere otra persona. No puedes realizarla contigo mismo.'
      )


    const targetUser =
      getUser(target)


    // ========================================================
    // 🚨 TERCERO INTENTA INTERACTUAR CON PERSONA EN PAREJA
    // ========================================================

    if (
      targetUser.pareja &&
      !sameUser(
        targetUser.pareja,
        sender
      )
    ) {

      const parejaDelObjetivo =
        findUserId(
          targetUser.pareja
        )


      return conn.reply(

        m.chat,

        box(

          '⚠️ RESPETO A UNA RELACIÓN REGISTRADA',

          `${tag(sender)} solicitó la acción *.${command}*
con ${tag(target)}.

💞 La persona mencionada mantiene una relación
registrada con ${tag(parejaDelObjetivo)}.

╭────────────────────╮
       ACCIÓN NO REALIZADA
╰────────────────────╯

Por respeto a la relación registrada,
la solicitud ha sido cancelada.

ℹ️ Este aviso informa que se intentó realizar
una interacción romántica con ${tag(target)}.`
        ),

        m,

        {
          mentions: [
            sender,
            target,
            parejaDelObjetivo
          ]
        }
      )
    }


    // ========================================================
    // 🚨 INFIDELIDAD
    //
    // Si quien ejecuta tiene pareja y quiere
    // interactuar con otra persona.
    // ========================================================

    if (
      user.pareja &&
      !sameUser(
        user.pareja,
        target
      )
    ) {

      const parejaDelSender =
        findUserId(
          user.pareja
        )


      return conn.reply(

        m.chat,

        box(

          '⚠️ INTERACCIÓN NO PERMITIDA',

          `${tag(sender)} solicitó la acción *.${command}*
con ${tag(target)}.

💞 Tu pareja registrada es ${tag(parejaDelSender)}.

╭────────────────────╮
       ACCIÓN NO REALIZADA
╰────────────────────╯

Esta acción solo está disponible cuando
la interacción se realiza con tu pareja registrada.

ℹ️ La solicitud ha sido cancelada y no se
modificaron los datos de la relación.`
        ),

        m,

        {
          mentions: [
            sender,
            target,
            parejaDelSender
          ]
        }
      )
    }


    // ========================================================
    // ❌ NO SON PAREJA
    // ========================================================

    if (
      !user.pareja ||
      !sameUser(
        user.pareja,
        target
      )
    ) {

      return m.reply(

        `💞 Esta acción está disponible únicamente
entre personas que tienen una relación registrada.

Para utilizar *.${command}*, primero deben
figurar como pareja en el sistema. ❤️`
      )
    }


    // ========================================================
    // ❤️ PUNTOS DE AMOR
    // ============================================================

    let suma = 0


    if (command === 'amor')
      suma = 10


    if (command === 'besar')
      suma = 5


    if (command === 'abrazar')
      suma = 3


    if (command === 'flores')
      suma = 15


    if (command === 'regalo')
      suma = 20


    if (command === 'cita')
      suma = 25


    user.amor =
      Number(
        user.amor || 0
      )


    targetUser.amor =
      Number(
        targetUser.amor || 0
      )


    user.amor += suma

    targetUser.amor += suma


    saveDB(db)


    return conn.reply(

      m.chat,

      box(

        '💞 MOMENTO COMPARTIDO',

        `${tag(sender)} 💞 ${tag(target)}

✨ Acción realizada: ${{ amor: 'Declaración de amor', besar: 'Beso', abrazar: 'Abrazo', flores: 'Regalo de flores', regalo: 'Regalo especial', cita: 'Cita romántica' }[command] || command}

❤️ Puntos de amor obtenidos: +${suma}

💗 Puntos de amor acumulados: ${user.amor}`
      ),

      m,

      {
        mentions: [
          sender,
          target
        ]
      }
    )
  }


  // ============================================================
  // 👑 LISTA DE PAREJAS
  // ============================================================

  if (command === 'listapareja') {

    if (
      !ownersJid.some(
        owner => sameUser(
          owner,
          sender
        )
      )
    )

      return m.reply(
        '🔒 Acceso restringido. Este comando está disponible únicamente para el propietario del bot.'
      )


    let texto = ''

    let mentions = []


    for (
      let id in db
    ) {

      const user =
        db[id]


      if (
        user.pareja &&
        id < user.pareja
      ) {

        const pareja =
          db[user.pareja]


        const estado =
          user.matrimonioFecha
            ? '💍 Casados'
            : '💑 Novios'


        const tiempoJuntos =
          user.relacionFecha

            ? tiempo(
                ahora -
                user.relacionFecha
              )

            : 'Desconocido'


        texto +=
`╭─────────────⬣
💖 ${tag(id)} ❤️ ${tag(user.pareja)}
Estado: ${estado}
Tiempo juntos: ${tiempoJuntos}
Nivel de amor: ❤️ ${user.amor}
╰─────────────⬣

`


        mentions.push(
          id,
          user.pareja
        )
      }
    }


    if (!texto)

      texto =
        '💞 Actualmente no hay parejas activas registradas en el sistema.'


    return conn.reply(

      m.chat,

      box(
        '💞 REGISTRO DE PAREJAS ACTIVAS',
        texto.trim()
      ),

      m,

      {
        mentions
      }
    )
  }


  // ============================================================
  // 🧹 LIMPIAR TODAS LAS PAREJAS
  // ============================================================

  if (command === 'clearship') {

    if (
      !ownersJid.some(
        owner => sameUser(
          owner,
          sender
        )
      )
    )

      return m.reply(
        '🔒 Acceso restringido. Este comando está disponible únicamente para el propietario del bot.'
      )


    for (
      let id in db
    ) {

      db[id] = {

        pareja: null,

        estado: 'soltero',

        propuesta: null,

        propuestaFecha: null,

        propuestaMatrimonio: null,

        propuestaMatrimonioFecha: null,

        relacionFecha: null,

        matrimonioFecha: null,

        amor: 0

      }
    }


    saveDB(db)


    return m.reply(
      '🧹 La base de datos de parejas se ha limpiado correctamente. Todas las relaciones han sido restablecidas.'
    )
  }

}


// ============================================================
// 📋 LOS 17 COMANDOS
// ============================================================

handler.command = [

  'pareja',

  'aceptar',

  'rechazar',

  'terminar',

  'casarse',

  'si',

  'no',

  'divorciar',

  'relacion',

  'amor',

  'besar',

  'abrazar',

  'flores',

  'regalo',

  'cita',

  'listapareja',

  'clearship'

]


// ============================================================
// 📤 EXPORT
// ============================================================

export default handler
