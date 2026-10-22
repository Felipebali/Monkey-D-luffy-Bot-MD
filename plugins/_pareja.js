// 📂 plugins/parejas.js
// 💞 Sistema completo de parejas, noviazgo, matrimonio e infidelidad
// WHATSAPP-BOT ❤️

import fs from 'fs'
import path from 'path'

const dir = './database'

if (!fs.existsSync(dir))
  fs.mkdirSync(dir, { recursive: true })

const file = path.join(dir, 'parejas.json')

if (!fs.existsSync(file))
  fs.writeFileSync(file, JSON.stringify({}, null, 2))

const loadDB = () => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

const saveDB = data => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

const TRES_DIAS = 3 * 24 * 60 * 60 * 1000

// ============================================================
// 🔔 AVISO AUTOMÁTICO: YA PUEDEN CASARSE
// Se avisa una sola vez en el grupo donde comenzó el noviazgo.
// No se envían mensajes privados.
// ============================================================

function registerMarriageNotifier(conn) {
  if (!conn || (typeof conn !== 'object' && typeof conn !== 'function')) return

  if (!global.parejasMarriageNotifierConnections) {
    global.parejasMarriageNotifierConnections = new WeakSet()
  }

  if (global.parejasMarriageNotifierConnections.has(conn)) return
  global.parejasMarriageNotifierConnections.add(conn)

  const timer = setInterval(async () => {
    try {
      const db = loadDB()
      const ahora = Date.now()

      for (const id of Object.keys(db)) {
        const user = db[id]

        if (!user?.pareja || !user.relacionFecha || user.matrimonioFecha) continue
        if (id >= user.pareja) continue

        const parejaId = Object.keys(db).find(otherId => {
          if (otherId === user.pareja) return true

          const a = String(otherId).split(':')[0].replace(/[^0-9]/g, '')
          const b = String(user.pareja).split(':')[0].replace(/[^0-9]/g, '')

          return a && b && a === b
        }) || user.pareja

        const pareja = db[parejaId]

        if (!pareja || pareja.matrimonioFecha) continue

        const fecha = Number(user.relacionFecha)

        if (!Number.isFinite(fecha) || ahora - fecha < TRES_DIAS) continue
        if (user.avisoCasarseEnviado || pareja.avisoCasarseEnviado) continue

        const grupo = user.grupoRelacion || pareja.grupoRelacion

        // Solo enviar en un grupo conocido.
        if (typeof grupo !== 'string' || !grupo.endsWith('@g.us')) continue

        // Marcar para evitar avisos duplicados.
        user.avisoCasarseEnviado = true
        pareja.avisoCasarseEnviado = true
        saveDB(db)

        const mentionA = id
        const mentionB = parejaId

        await conn.sendMessage(grupo, {
          text: `╭━━━〔 💍 YA PUEDEN CASARSE 〕━━━⬣

💞 ¡Atención, parejita! @${String(mentionA).split('@')[0]} y @${String(mentionB).split('@')[0]}

⏳ ¡Ya cumplieron 3 días de noviazgo!

💐 Si ambos quieren dar el siguiente paso, ya pueden usar *.casarse* y responder la propuesta con *.si* o *.no*.

❤️ Recuerden: el matrimonio es opcional; ¡que decidan los dos corazones!

╰━━━━━━━━━━━━━━━━⬣
        💜 WHATSAPP-BOT`,
          mentions: [mentionA, mentionB]
        })
      }
    } catch (error) {
      console.error('[PAREJAS] Error en aviso automático de matrimonio:', error)
    }
  }, 60 * 1000)

  if (typeof timer.unref === 'function') timer.unref()
}

// ============================================================
// 👑 DUEÑOS
// ============================================================

function getOwnersJid() {
  return (global.owner || [])
    .map(v => {
      if (Array.isArray(v)) v = v[0]
      if (typeof v !== 'string') return null

      return v.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    })
    .filter(Boolean)
}

// ============================================================
// 💕 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn, command }) => {
  registerMarriageNotifier(conn)

  const db = loadDB()
  const sender = conn.decodeJid(m.sender)
  const ahora = Date.now()
  const ownersJid = getOwnersJid()

  // Crear u obtener usuario.
  const getUser = id => {
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
        grupoRelacion: null,
        avisoCasarseEnviado: false,
        amor: 0
      }
    }

    // Compatibilidad con usuarios guardados antes de esta versión.
    const user = db[id]
    if (user.grupoRelacion === undefined) user.grupoRelacion = null
    if (user.avisoCasarseEnviado === undefined) user.avisoCasarseEnviado = false
    if (user.amor === undefined) user.amor = 0

    return user
  }

  const tag = id => id ? '@' + id.split('@')[0] : ''

  const tiempo = ms => {
    const dias = Math.floor(ms / 86400000)
    const horas = Math.floor((ms % 86400000) / 3600000)
    return `${dias} día(s) y ${horas} hora(s)`
  }

  const box = (title, text) => `
╭━━━〔 ${title} 〕━━━⬣
${text}
╰━━━━━━━━━━━━━━━━⬣`

  // Obtener objetivo por mención o respondiendo a un mensaje.
  const getTarget = () => {
    if (m.mentionedJid?.length)
      return conn.decodeJid(m.mentionedJid[0])

    if (m.quoted?.sender)
      return conn.decodeJid(m.quoted.sender)

    return null
  }

  const sameUser = (a, b) => {
    if (!a || !b) return false

    a = conn.decodeJid(a)
    b = conn.decodeJid(b)

    if (a === b) return true

    const clean = jid => String(jid || '').split(':')[0].toLowerCase()
    const cleanA = clean(a)
    const cleanB = clean(b)

    if (cleanA === cleanB) return true

    const numberA = cleanA.replace(/[^0-9]/g, '')
    const numberB = cleanB.replace(/[^0-9]/g, '')

    return Boolean(numberA && numberB && numberA === numberB)
  }

  const findUserId = jid => {
    if (!jid) return null
    if (db[jid]) return jid

    for (const id of Object.keys(db)) {
      if (sameUser(id, jid)) return id
    }

    return jid
  }

  // ============================================================
  // 💌 PROPUESTA DE NOVIAZGO
  // Comando: .pareja @persona o responder a un mensaje
  // ============================================================

  if (command === 'pareja') {
    const targetRaw = getTarget()

    if (!targetRaw)
      return m.reply(
        '💌 ¿Hay alguien que te haga sonreír sin motivo? Menciónalo o responde a uno de sus mensajes y deja que Cupido haga lo suyo. 🏹💘'
      )

    const target = findUserId(targetRaw)

    if (sameUser(target, sender))
      return m.reply(
        '😹 ¡El amor propio es importante, pero para esta propuesta necesitamos a alguien más! Menciona a esa personita especial. 💘'
      )

    const user = getUser(sender)
    const tu = getUser(target)

    if (user.pareja)
      return conn.reply(
        m.chat,
        box(
          '💞 TU CORAZÓN YA TIENE DUEÑO',
          `${tag(sender)} ❤️ ${tag(user.pareja)}

Tu corazón ya eligió a alguien especial. ❤️
Cuida esa historia tan bonita antes de comenzar otra. 💐`
        ),
        m,
        { mentions: [sender, user.pareja] }
      )

    if (tu.pareja)
      return conn.reply(
        m.chat,
        box(
          '💞 ESE CORAZÓN YA ESTÁ OCUPADO',
          `${tag(target)} ❤️ ${tag(tu.pareja)}

Parece que ese corazoncito ya late por alguien más. 💕
Respetemos su historia de amor. 🌹`
        ),
        m,
        { mentions: [target, tu.pareja] }
      )

    tu.propuesta = sender
    tu.propuestaFecha = ahora

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💌 UNA PREGUNTA DEL CORAZÓN',
        `💐 Para: ${tag(target)}

Dicen que las historias más lindas empiezan
con una pregunta y un poquito de valentía. 💗

Hoy ${tag(sender)} quiere decirte algo especial...

💘 Le gustaría compartir sonrisas, abrazos,
pequeños detalles y momentos contigo.

💕 ¿Le das una oportunidad a esta historia?

╭───────────────╮
💌 TU CORAZÓN DECIDE
╰───────────────╯

💖 *.aceptar* — ¡Comenzar esta historia!
🥺 *.rechazar* — Decir que no, con cariño

🌹 Quién sabe... quizá este sea el comienzo
de algo muy bonito. ✨`
      ),
      m,
      { mentions: [sender, target] }
    )
  }

  // ============================================================
  // 💖 ACEPTAR NOVIAZGO
  // ============================================================

  if (command === 'aceptar') {
    const user = getUser(sender)

    if (!user.propuesta)
      return m.reply(
        '💌 Por ahora no tienes cartitas de amor esperando respuesta. ¡Quizás Cupido todavía esté preparando la próxima! 🏹💘'
      )

    const proposer = findUserId(user.propuesta)
    const proposerUser = getUser(proposer)

    if (user.pareja || proposerUser.pareja)
      return m.reply(
        '💔 ¡Uy! Parece que uno de los dos ya tiene el corazón acompañado. No se pudo comenzar esta historia. 💕'
      )

    user.estado = 'novios'
    proposerUser.estado = 'novios'

    user.pareja = proposer
    proposerUser.pareja = sender

    user.relacionFecha = ahora
    proposerUser.relacionFecha = ahora

    // Guardar el grupo donde comenzó el noviazgo.
    const grupoRelacion = typeof m.chat === 'string' && m.chat.endsWith('@g.us')
      ? m.chat
      : null

    user.grupoRelacion = grupoRelacion
    proposerUser.grupoRelacion = grupoRelacion

    user.avisoCasarseEnviado = false
    proposerUser.avisoCasarseEnviado = false

    user.propuesta = null
    user.propuestaFecha = null
    proposerUser.propuesta = null
    proposerUser.propuestaFecha = null

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💞 ¡NACIÓ UNA HISTORIA DE AMOR!',
        `💖 ${tag(sender)} ❤️ ${tag(proposer)}

╭────────────────────╮
       💞 NOVIAZGO 💞
╰────────────────────╯

¡Y así comienza una nueva aventura para dos! ❤️

Que nunca falten las risas tontas,
los mensajes bonitos, los detalles inesperados
y las ganas de elegirse cada día. 🥹💞

Cuídense mucho y hagan que cada recuerdo
juntos tenga un lugar especial en el corazón. 🌷

💍 Después de 3 días de noviazgo podrán
soñar con el siguiente paso usando *.casarse*.`
      ),
      m,
      { mentions: [sender, proposer] }
    )
  }

  // ============================================================
  // 💔 RECHAZAR NOVIAZGO
  // ============================================================

  if (command === 'rechazar') {
    const user = getUser(sender)

    if (!user.propuesta)
      return m.reply(
        '💌 No hay ninguna propuesta esperando tu respuesta. ¡El buzón de Cupido está tranquilito por ahora! 🏹'
      )

    const proposer = user.propuesta

    user.propuesta = null
    user.propuestaFecha = null

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💌 UNA RESPUESTA DEL CORAZÓN',
        `${tag(sender)} ha decidido no aceptar
la propuesta de ${tag(proposer)}.

A veces los corazones sienten distinto, y está bien. 🤍
Que cada quien encuentre una historia que le haga sonreír. 🌷`
      ),
      m,
      { mentions: [sender, proposer] }
    )
  }

  // ============================================================
  // 💑 VER RELACIÓN
  // ============================================================

  if (command === 'relacion') {
    const user = getUser(sender)

    if (!user.pareja)
      return m.reply(
        '💔 Todavía no tienes una personita especial registrada. ¡Nunca se sabe cuándo Cupido va a sorprenderte! 🏹💘'
      )

    const pareja = findUserId(user.pareja)
    const estado = user.matrimonioFecha ? '💍 Casados' : '💑 Novios'
    const tiempoJuntos = user.relacionFecha
      ? tiempo(ahora - user.relacionFecha)
      : 'Desconocido'

    return conn.reply(
      m.chat,
      box(
        '💖 SU PEQUEÑA HISTORIA',
        `${tag(sender)} ❤️ ${tag(pareja)}

Estado de la historia: ${estado}

Tiempo compartido: ${tiempoJuntos}

Amor acumulado: ❤️ ${user.amor}

✨ Que sigan sumando recuerdos bonitos.`
      ),
      m,
      { mentions: [sender, pareja] }
    )
  }

  // ============================================================
  // 💍 PROPONER MATRIMONIO
  // ============================================================

  if (command === 'casarse') {
    const user = getUser(sender)

    if (!user.pareja)
      return m.reply(
        '💔 Para llegar al altar primero hace falta encontrar a esa personita que te robe sonrisas. 💘'
      )

    if (user.matrimonioFecha)
      return m.reply(
        '💍 ¡Pero si ya dieron el sí! Que viva el amor y que nunca falten los detalles. 🥂❤️'
      )

    if (!user.relacionFecha)
      return m.reply(
        '🥺 Parece que se perdió la fecha en que comenzó esta historia. No podemos calcular cuánto tiempo llevan juntos. 💌'
      )

    const tiempoRelacion = ahora - user.relacionFecha
    const esOwner = ownersJid.some(owner => sameUser(owner, sender))

    // Los owners pueden proponer matrimonio sin esperar 3 días.
    if (!esOwner && tiempoRelacion < TRES_DIAS) {
      const faltan = tiempo(TRES_DIAS - tiempoRelacion)

      return conn.reply(
        m.chat,
        box(
          '⏳ ¡TODAVÍA FALTA UN POQUITO!',
          `${tag(sender)} ❤️ ${tag(user.pareja)}

💑 Ya llevan compartiendo: ${tiempo(tiempoRelacion)}

¡Qué lindo es ir construyendo una historia de a poquito! 💞
Para pedir matrimonio deben cumplir 3 días
de noviazgo y disfrutar este tiempo juntos. 🌷

⏳ Falta para poder dar ese paso: ${faltan}

Mientras tanto, ¡más abrazos, más risas
y más recuerdos para guardar en el corazón! 💖`
        ),
        m,
        { mentions: [sender, user.pareja] }
      )
    }

    const pareja = getUser(findUserId(user.pareja))

    pareja.propuestaMatrimonio = sender
    pareja.propuestaMatrimonioFecha = ahora

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💒 ¿QUIERES COMPARTIR LA VIDA CONMIGO?',
        `💐 Para: ${tag(user.pareja)}

Entre risas, mensajes, momentos y recuerdos,
esta historia se ha vuelto muy especial. ❤️

Hoy ${tag(sender)} quiere hacerte una pregunta
que puede convertir un sueño en realidad... 🥹💍

💖 ¿Quieres casarte y seguir escribiendo
esta historia de amor a su lado?

╭────────────────────╮
💌 UNA RESPUESTA PARA SIEMPRE
╰────────────────────╯

💍 *.si* — ¡Decir que sí!
🥺 *.no* — Responder con cariño

🌹 Que la respuesta salga del corazón,
porque los momentos más bonitos se sienten. 💞`
      ),
      m,
      { mentions: [sender, user.pareja] }
    )
  }

  // ============================================================
  // 💍 ACEPTAR MATRIMONIO
  // ============================================================

  if (command === 'si') {
    const user = getUser(sender)

    if (!user.propuestaMatrimonio)
      return m.reply(
        '💍 No tienes una propuesta de matrimonio esperando respuesta. ¡Quizás todavía no llegó ese momento de película! 🎬❤️'
      )

    const proposer = findUserId(user.propuestaMatrimonio)
    const proposerUser = getUser(proposer)

    if (!sameUser(user.pareja, proposer))
      return m.reply(
        '🥺 Esta propuesta ya no se puede confirmar porque la historia entre ustedes cambió. 💔'
      )

    user.matrimonioFecha = ahora
    proposerUser.matrimonioFecha = ahora

    user.estado = 'casados'
    proposerUser.estado = 'casados'

    user.propuestaMatrimonio = null
    user.propuestaMatrimonioFecha = null
    proposerUser.propuestaMatrimonio = null
    proposerUser.propuestaMatrimonioFecha = null

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💍 ¡DIJERON QUE SÍ!',
        `${tag(sender)} 💍 ${tag(proposer)}

╭────────────────────╮
      💍 MATRIMONIO 💍
╰────────────────────╯

¡Dos corazones, una promesa y un montón
de aventuras por vivir! ❤️💍

Hoy comienza un capítulo aún más especial.
Que nunca falten los besos, las risas,
los abrazos inesperados y el compañerismo. 🥹💐

✨ ¡Que su amor siga creciendo con cada día! ✨
🥂 ¡Felicidades a los recién casados!`
      ),
      m,
      { mentions: [sender, proposer] }
    )
  }

  // ============================================================
  // 💔 RECHAZAR MATRIMONIO
  // ============================================================

  if (command === 'no') {
    const user = getUser(sender)

    if (!user.propuestaMatrimonio)
      return m.reply(
        '💍 No tienes una propuesta de matrimonio esperando respuesta. ❤️'
      )

    const proposer = user.propuestaMatrimonio

    user.propuestaMatrimonio = null
    user.propuestaMatrimonioFecha = null

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💌 UNA RESPUESTA SINCERA',
        `${tag(sender)} ha decidido no aceptar
la propuesta de matrimonio de ${tag(proposer)}.

💞 Aunque hoy no sea el momento de dar ese paso,
la relación continúa como noviazgo. Cada historia
avanza a su propio ritmo. 🌷`
      ),
      m,
      { mentions: [sender, proposer] }
    )
  }

  // ============================================================
  // 💔 TERMINAR NOVIAZGO
  // ============================================================

  if (command === 'terminar') {
    const user = getUser(sender)

    if (!user.pareja)
      return m.reply(
        '💔 No tienes pareja registrada en este momento. Si el amor vuelve a llamar a tu puerta, ¡que te encuentre con una sonrisa! 💘'
      )

    if (user.matrimonioFecha)
      return m.reply(
        '💍 Como ya están casados, para cambiar esta etapa de su historia pueden utilizar *.divorciar*. ❤️'
      )

    const exId = findUserId(user.pareja)
    const pareja = getUser(exId)

    user.pareja = null
    pareja.pareja = null

    user.estado = 'soltero'
    pareja.estado = 'soltero'

    user.relacionFecha = null
    pareja.relacionFecha = null

    user.grupoRelacion = null
    pareja.grupoRelacion = null

    user.avisoCasarseEnviado = false
    pareja.avisoCasarseEnviado = false

    user.amor = 0
    pareja.amor = 0

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💔 UNA HISTORIA LLEGA A SU FIN',
        `${tag(sender)} 💔 ${tag(exId)}

Toda historia deja recuerdos, aprendizajes
y momentos que siempre tendrán su lugar. 💔

La relación ha terminado y ambos vuelven
a figurar como solteros en el sistema.

Que el tiempo les regale tranquilidad,
sonrisas nuevas y caminos llenos de cosas bonitas. 🤍🌷`
      ),
      m,
      { mentions: [sender, exId] }
    )
  }

  // ============================================================
  // 💔 DIVORCIAR
  // ============================================================

  if (command === 'divorciar') {
    const user = getUser(sender)

    if (!user.matrimonioFecha)
      return m.reply(
        '💍 No tienes un matrimonio registrado. ¡Todavía no hay anillos que guardar en esta historia! 💕'
      )

    const pareja = getUser(findUserId(user.pareja))

    user.matrimonioFecha = null
    pareja.matrimonioFecha = null

    user.estado = 'novios'
    pareja.estado = 'novios'

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💔 UN NUEVO CAPÍTULO',
        `${tag(sender)} 💔 ${tag(user.pareja)}

El capítulo del matrimonio llega a su fin,
pero en el sistema todavía continúan como novios. 💞

Que puedan encontrar la forma de seguir adelante,
con calma y respeto por lo que compartieron. 🌷`
      ),
      m,
      { mentions: [sender, user.pareja] }
    )
  }

  // ============================================================
  // 💕 ACCIONES ROMÁNTICAS
  // .amor, .besar, .abrazar, .flores, .regalo, .cita
  // Aceptan mención o respuesta a un mensaje.
  // ============================================================

  if (['amor', 'besar', 'abrazar', 'flores', 'regalo', 'cita'].includes(command)) {
    const user = getUser(sender)
    const targetRaw = getTarget()

    if (!targetRaw)
      return m.reply(
        `💌 ¿A quién quieres llenar de cariño? Menciona a esa personita o responde a uno de sus mensajes.

💕 Acción elegida: *.${command}*`
      )

    const target = findUserId(targetRaw)

    if (sameUser(target, sender))
      return m.reply(
        '😹 ¡Un poquito de amor propio siempre viene bien! Pero para esta acción romántica necesitas a otra personita. 💘'
      )

    const targetUser = getUser(target)

    // Avisar si alguien intenta interactuar con una persona que ya tiene pareja.
    if (targetUser.pareja && !sameUser(targetUser.pareja, sender)) {
      const parejaDelObjetivo = findUserId(targetUser.pareja)

      return conn.reply(
        m.chat,
        box(
          '💘 ¡CUPIDO SE EQUIVOCÓ DE DIRECCIÓN!',
          `${tag(sender)} quiso usar *.${command}*
con ${tag(target)}. 💌

💞 ${tag(target)} comparte una historia bonita
con ${tag(parejaDelObjetivo)}.

╭────────────────────╮
   💌 MENSAJE DE CUPIDO
╰────────────────────╯

¡Alto ahí, corazón aventurero! 😅💘
La acción se ha detenido para respetar ese vínculo.

¡Mejor dejemos que Cupido apunte a otro lado! 🏹💕`
        ),
        m,
        { mentions: [sender, target, parejaDelObjetivo] }
      )
    }

    // Avisar si quien ejecuta tiene pareja e intenta interactuar con otra persona.
    if (user.pareja && !sameUser(user.pareja, target)) {
      const parejaDelSender = findUserId(user.pareja)

      return conn.reply(
        m.chat,
        box(
          '💔 ¡CUIDADO, CORAZÓN ENAMORADO!',
          `${tag(sender)} quiso usar *.${command}*
con ${tag(target)}. 💌

💞 Tu personita especial es ${tag(parejaDelSender)}.

╭────────────────────╮
   💌 UN CONSEJITO DE CUPIDO
╰────────────────────╯

¡Uy! Parece que tu corazón quiso salir de paseo. 😅
Estas acciones son para compartirlas con tu pareja. ❤️

La acción se ha cancelado y los puntos de amor
siguen esperando para ustedes dos. 💞`
        ),
        m,
        { mentions: [sender, target, parejaDelSender] }
      )
    }

    if (!user.pareja || !sameUser(user.pareja, target)) {
      return m.reply(
        `💞 ¡Esta acción tiene más magia cuando se comparte con tu personita especial! ❤️

Para usar *.${command}*, primero deben figurar como pareja.
¡Después podrán llenar su historia de cariño y momentos bonitos! 🌹`
      )
    }

    let suma = 0

    if (command === 'amor') suma = 10
    if (command === 'besar') suma = 5
    if (command === 'abrazar') suma = 3
    if (command === 'flores') suma = 15
    if (command === 'regalo') suma = 20
    if (command === 'cita') suma = 25

    user.amor = Number(user.amor || 0)
    targetUser.amor = Number(targetUser.amor || 0)

    user.amor += suma
    targetUser.amor += suma

    saveDB(db)

    const acciones = {
      amor: 'Declaración de amor 💌',
      besar: 'Beso 😘',
      abrazar: 'Abrazo lleno de cariño 🫂',
      flores: 'Ramo de flores 💐',
      regalo: 'Regalo especial 🎁',
      cita: 'Cita romántica 🌹'
    }

    return conn.reply(
      m.chat,
      box(
        '💖 UN MOMENTITO DE AMOR',
        `${tag(sender)} 💞 ${tag(target)}

✨ Detalle compartido: ${acciones[command] || command}

💌 El cariño se demuestra en los pequeños detalles.
❤️ Amor ganado: +${suma}
💗 Amor acumulado: ${user.amor}

🌷 ¡Sigan creando recuerdos que les hagan sonreír!`
      ),
      m,
      { mentions: [sender, target] }
    )
  }

  // ============================================================
  // 👑 LISTA DE PAREJAS — SOLO OWNER
  // ============================================================

  if (command === 'listapareja') {
    if (!ownersJid.some(owner => sameUser(owner, sender))) {
      return m.reply(
        '🔒 Este rinconcito está reservado para el propietario del bot. 💌'
      )
    }

    let texto = ''
    const mentions = []

    for (const id in db) {
      const user = db[id]

      if (user.pareja && id < user.pareja) {
        const pareja = db[user.pareja]
        const estado = user.matrimonioFecha ? '💍 Casados' : '💑 Novios'
        const tiempoJuntos = user.relacionFecha
          ? tiempo(ahora - user.relacionFecha)
          : 'Desconocido'

        texto += `╭─────────────⬣
💖 ${tag(id)} ❤️ ${tag(user.pareja)}
Estado: ${estado}
Tiempo juntos: ${tiempoJuntos}
Nivel de amor: ❤️ ${user.amor}
╰─────────────⬣

`

        mentions.push(id, user.pareja)
      }
    }

    if (!texto) {
      texto = '🥺 Todavía no hay parejitas registradas. ¡Seguro que Cupido anda preparando alguna sorpresa! 🏹💞'
    }

    return conn.reply(
      m.chat,
      box('💞 EL RINCÓN DE LAS PAREJITAS', texto.trim()),
      m,
      { mentions }
    )
  }

  // ============================================================
  // 🧹 BORRAR TODAS LAS PAREJAS — SOLO OWNER
  // ============================================================

  if (command === 'clearship') {
    if (!ownersJid.some(owner => sameUser(owner, sender))) {
      return m.reply(
        '🔒 Este rinconcito está reservado para el propietario del bot. 💌'
      )
    }

    for (const id in db) {
      db[id] = {
        pareja: null,
        estado: 'soltero',
        propuesta: null,
        propuestaFecha: null,
        propuestaMatrimonio: null,
        propuestaMatrimonioFecha: null,
        relacionFecha: null,
        matrimonioFecha: null,
        grupoRelacion: null,
        avisoCasarseEnviado: false,
        amor: 0
      }
    }

    saveDB(db)

    return m.reply(
      '🧹 Se reinició el rinconcito del amor y todas las relaciones fueron restablecidas. 💌 ¡Cupido tiene la libreta en blanco otra vez!'
    )
  }
}

// ============================================================
// 📋 COMANDOS
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

export default handler
