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
        '💌 Menciona o responde a la persona a la que quieres proponerle.'
      )


    const target = findUserId(targetRaw)


    if (sameUser(target, sender))
      return m.reply(
        '😹 No puedes proponerte a ti mismo.'
      )


    const user = getUser(sender)

    const tu = getUser(target)


    // 🚫 YA TIENE PAREJA
    if (user.pareja)

      return conn.reply(

        m.chat,

        box(
          '💞 YA TIENES PAREJA',

          `${tag(sender)} ❤️ ${tag(user.pareja)}

No puedes hacer una propuesta mientras estás en una relación.`
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
          '💔 PERSONA OCUPADA',

          `${tag(target)} ❤️ ${tag(tu.pareja)}

Esta persona ya está en una relación.
Respeta su relación ❤️`
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

        '💌 CARTA DE AMOR',

        `💐 Para: ${tag(target)}

Hay personas que llegan a nuestra vida
y hacen que todo se sienta un poquito más lindo. ❤️

Hoy quiero hacerte una pregunta especial...

💖 ${tag(sender)} quiere estar contigo.

¿Aceptas comenzar una historia juntos? 💕

✨ *.aceptar* — Aceptar
💔 *.rechazar* — Rechazar

🌹 Quizás este sea el comienzo
de una hermosa historia.`
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
        '💭 No tienes propuestas de amor pendientes.'
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
        '❌ Uno de los dos ya tiene pareja.'
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

        '💞 NUEVA PAREJA',

        `💖 ${tag(sender)} ❤️ ${tag(proposer)}

╭───────────────╮
   💌 NOVIOS 💌
╰───────────────╯

Desde este momento están oficialmente
en una relación. 💑

Cuídense, respétense y disfruten
su historia juntos. ❤️

⏳ Podrán casarse después de
3 días de noviazgo.

💍 Cuando llegue el momento,
usen *.casarse*`
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
        '❌ No tienes propuestas pendientes.'
      )


    const proposer =
      user.propuesta


    user.propuesta = null

    user.propuestaFecha = null


    saveDB(db)


    return conn.reply(

      m.chat,

      box(

        '💔 PROPUESTA RECHAZADA',

        `${tag(sender)} ha rechazado
la propuesta de ${tag(proposer)}.

💔 Tal vez no era el momento.`
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
        '💔 No tienes pareja actualmente.'
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

        '💖 ESTADO DE RELACIÓN',

        `${tag(sender)} ❤️ ${tag(pareja)}

Estado: ${estado}

Tiempo juntos: ${tiempoJuntos}

Nivel de amor: ❤️ ${user.amor}`
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
        '💔 No tienes pareja.'
      )


    if (user.matrimonioFecha)

      return m.reply(
        '💍 Ya están casados.'
      )


    if (!user.relacionFecha)

      return m.reply(
        '❌ No se encontró la fecha de inicio de la relación.'
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

          '⏳ TODAVÍA NO',

          `${tag(sender)} ❤️ ${tag(user.pareja)}

💑 Son novios desde hace:
${tiempo(tiempoRelacion)}

💍 Para casarse deben cumplir
3 días de noviazgo.

⏳ Falta:
${faltan}

❤️ Sigan construyendo su historia.`
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

        '💒 CARTA DE MATRIMONIO',

        `💐 Para: ${tag(user.pareja)}

Han pasado momentos,
risas, cariño y recuerdos juntos. ❤️

Y ahora quiero dar un paso más...

💍 ${tag(sender)} quiere casarse contigo.

¿Quieres que nuestra historia
continúe para siempre? 💖

💐 *.si* — Aceptar
💔 *.no* — Rechazar

❤️ Hoy puede comenzar
una nueva etapa de su historia.`
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
        '❌ No tienes propuestas de matrimonio.'
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
        '❌ Ya no son pareja.'
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

        '💍 MATRIMONIO CONFIRMADO',

        `${tag(sender)} 💍 ${tag(proposer)}

╭────────────────╮
    💍 CASADOS 💍
╰────────────────╯

Ahora están oficialmente casados. ❤️

Que esta nueva etapa esté llena
de buenos momentos, cariño y respeto. 💖

🎉 ¡Felicidades! 🎉`
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
        '❌ No tienes propuestas de matrimonio.'
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
        '❌ No tienes pareja.'
      )


    if (user.matrimonioFecha)

      return m.reply(
        '❌ Están casados. Usa *.divorciar* para separarse.'
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

        '💔 RELACIÓN TERMINADA',

        `${tag(sender)} 💔 ${tag(exId)}

La relación ha terminado.

Ahora ambos están solteros. 💔`
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
        '❌ No estás casado.'
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

        '💔 DIVORCIO',

        `${tag(sender)} 💔 ${tag(user.pareja)}

El matrimonio ha terminado.

💑 Siguen siendo novios.`
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
        `💌 Menciona o responde a alguien para usar *.${command}*.`
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
        '😹 No puedes hacer esa acción contigo mismo.'
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

          '🚨 PERSONA EN RELACIÓN',

          `${tag(sender)} intentó usar *.${command}*
con ${tag(target)} 😾

❤️ ${tag(target)} está en pareja con
${tag(parejaDelObjetivo)}.

💌 AVISO A LA PAREJA

${tag(sender)} intentó interactuar
románticamente con ${tag(target)}.

❌ La acción fue bloqueada.

⚠️ ${tag(parejaDelObjetivo)}, tu pareja recibió
un intento de interacción romántica
por parte de ${tag(sender)}.`
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

          '🚨 INFIDELIDAD DETECTADA',

          `${tag(sender)} intentó usar *.${command}*
con ${tag(target)} 😾

❤️ Su pareja es
${tag(parejaDelSender)}.

💌 AVISO DE INFIDELIDAD

${tag(sender)} intentó interactuar
románticamente con otra persona.

❌ La acción fue bloqueada.

⚠️ ${tag(parejaDelSender)}, tu pareja
intentó usar *.${command}* con
${tag(target)}.`
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

        `💔 No son pareja.

Para usar *.${command}*
primero deben estar en una relación. ❤️`
      )
    }


    // ========================================================
    // ❤️ PUNTOS DE AMOR
    // ========================================================

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

        '💞 MOMENTO ROMÁNTICO',

        `${tag(sender)} 💕 ${tag(target)}

Acción: ${command}

❤️ +${suma} amor

Nuevo nivel de amor:
❤️ ${user.amor}`
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
        '❌ Solo el dueño puede utilizar este comando.'
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
        '😿 No hay parejas activas.'


    return conn.reply(

      m.chat,

      box(
        '💞 PAREJAS ACTIVAS',
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
        '❌ Solo el dueño puede utilizar este comando.'
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
      '🧹 Todas las parejas fueron eliminadas correctamente.'
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
