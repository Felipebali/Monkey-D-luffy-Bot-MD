// 📂 plugins/parejas.js
// 💞 Sistema completo de parejas, noviazgo, matrimonio e infidelidad
// WHATSAPP-BOT ❤️

import fs from 'fs'
import path from 'path'

const dir = './database'
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

const file = path.join(dir, 'parejas.json')
if (!fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify({}, null, 2))
}

const loadDB = () => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    console.error('[PAREJAS] Error leyendo parejas.json:', error)
    return {}
  }
}

const saveDB = data => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

const TRES_DIAS = 3 * 24 * 60 * 60 * 1000
const INTERVALO_AVISO = 15 * 1000

// ============================================================
// 🔧 UTILIDADES DE JID
// ============================================================

const normalizarJid = jid =>
  String(jid || '').split(':')[0].toLowerCase()

const numeroJid = jid => {
  const id = normalizarJid(jid)

  if (!id.endsWith('@s.whatsapp.net')) return ''

  return id.split('@')[0].replace(/[^0-9]/g, '')
}

const mismoJid = (a, b) => {
  if (!a || !b) return false

  const A = normalizarJid(a)
  const B = normalizarJid(b)

  if (A === B) return true

  const numeroA = numeroJid(A)
  const numeroB = numeroJid(B)

  return Boolean(numeroA && numeroB && numeroA === numeroB)
}

const buscarUsuario = (db, jid) => {
  if (!jid) return null
  if (db[jid]) return jid

  const idNormalizado = normalizarJid(jid)

  const exacto = Object.keys(db).find(
    id => normalizarJid(id) === idNormalizado
  )

  if (exacto) return exacto

  const numero = numeroJid(jid)

  if (numero) {
    return Object.keys(db).find(
      id => numeroJid(id) === numero
    ) || null
  }

  return null
}

const getOwnersJid = () => {
  return (global.owner || [])
    .map(owner => {
      if (Array.isArray(owner)) owner = owner[0]
      if (typeof owner !== 'string') return null

      const numero = owner.replace(/[^0-9]/g, '')
      return numero ? `${numero}@s.whatsapp.net` : null
    })
    .filter(Boolean)
}

// ============================================================
// 🔔 AVISO AUTOMÁTICO DE MATRIMONIO
// Avisa en el grupo después de 3 días.
// No envía mensajes privados.
// Reintenta si falla el envío.
// ============================================================

function registerMarriageNotifier(conn) {
  if (!conn || (typeof conn !== 'object' && typeof conn !== 'function')) {
    return
  }

  if (!global.parejasMarriageNotifierConnections) {
    global.parejasMarriageNotifierConnections = new WeakSet()
  }

  if (global.parejasMarriageNotifierConnections.has(conn)) return

  global.parejasMarriageNotifierConnections.add(conn)

  let revisando = false

  const revisarAvisos = async () => {
    if (revisando) return
    revisando = true

    try {
      const db = loadDB()
      const ahora = Date.now()
      const procesadas = new Set()

      for (const id of Object.keys(db)) {
        const usuario = db[id]

        if (
          !usuario?.pareja ||
          !usuario.relacionFecha ||
          usuario.matrimonioFecha
        ) continue

        const idPareja = buscarUsuario(db, usuario.pareja)
        if (!idPareja || idPareja === id) continue

        const pareja = db[idPareja]

        if (!pareja?.pareja || pareja.matrimonioFecha) continue

        // Confirmar que la relación sea recíproca.
        const parejaDeUsuario = buscarUsuario(db, usuario.pareja)
        const parejaDePareja = buscarUsuario(db, pareja.pareja)

        if (
          parejaDeUsuario !== idPareja ||
          parejaDePareja !== id
        ) continue

        const llave = [normalizarJid(id), normalizarJid(idPareja)]
          .sort()
          .join('|')

        if (procesadas.has(llave)) continue
        procesadas.add(llave)

        const fechaA = Number(usuario.relacionFecha)
        const fechaB = Number(pareja.relacionFecha)

        const fecha = Number.isFinite(fechaA) && fechaA > 0
          ? fechaA
          : fechaB

        if (!Number.isFinite(fecha) || fecha <= 0) continue
        if (ahora - fecha < TRES_DIAS) continue

        // Compatibilidad con versiones anteriores que podían marcar
        // el aviso como enviado antes de confirmar el envío.
        if (
          usuario.avisoCasarseEnviado &&
          !usuario.avisoCasarseEnviadoEn
        ) {
          usuario.avisoCasarseEnviado = false
        }

        if (
          pareja.avisoCasarseEnviado &&
          !pareja.avisoCasarseEnviadoEn
        ) {
          pareja.avisoCasarseEnviado = false
        }

        if (
          usuario.avisoCasarseEnviado ||
          pareja.avisoCasarseEnviado
        ) continue

        const grupo = usuario.grupoRelacion || pareja.grupoRelacion

        // El aviso solo se envía a grupos.
        if (typeof grupo !== 'string' || !grupo.endsWith('@g.us')) {
          console.log(
            `[PAREJAS] ${id} y ${idPareja} cumplieron 3 días, ` +
            'pero todavía no tienen un grupo registrado.'
          )
          continue
        }

        try {
          await conn.sendMessage(grupo, {
            text: `╭━━━〔 💍 YA PUEDEN CASARSE 〕━━━⬣

💞 ¡Atención, parejita! @${id.split('@')[0]} y @${idPareja.split('@')[0]}

⏳ ¡Ya cumplieron 3 días de noviazgo!

💐 Si ambos quieren dar el siguiente paso, ya pueden usar *.casarse* y responder la propuesta con *.si* o *.no*.

❤️ Recuerden: el matrimonio es opcional; ¡que decidan los dos corazones!

╰━━━━━━━━━━━━━━━━⬣
        💜 WHATSAPP-BOT`,
            mentions: [id, idPareja]
          })

          // Guardar el aviso solo después de un envío exitoso.
          const dbActualizada = loadDB()

          if (dbActualizada[id]) {
            dbActualizada[id].avisoCasarseEnviado = true
            dbActualizada[id].avisoCasarseEnviadoEn = Date.now()
          }

          if (dbActualizada[idPareja]) {
            dbActualizada[idPareja].avisoCasarseEnviado = true
            dbActualizada[idPareja].avisoCasarseEnviadoEn = Date.now()
          }

          saveDB(dbActualizada)

          console.log(
            `[PAREJAS] Aviso de matrimonio enviado al grupo ${grupo}`
          )
        } catch (errorEnvio) {
          console.error(
            '[PAREJAS] Falló el aviso de matrimonio; se reintentará:',
            errorEnvio
          )
        }
      }
    } catch (error) {
      console.error('[PAREJAS] Error revisando avisos:', error)
    } finally {
      revisando = false
    }
  }

  // Revisión inmediata y luego cada 15 segundos.
  void revisarAvisos()

  const timer = setInterval(() => {
    void revisarAvisos()
  }, INTERVALO_AVISO)

  if (typeof timer.unref === 'function') timer.unref()
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

    const user = db[id]

    if (user.grupoRelacion === undefined) user.grupoRelacion = null
    if (user.avisoCasarseEnviado === undefined) user.avisoCasarseEnviado = false
    if (user.amor === undefined) user.amor = 0

    return user
  }

  const tag = id => id ? '@' + String(id).split('@')[0] : ''

  const tiempo = ms => {
    const dias = Math.floor(ms / 86400000)
    const horas = Math.floor((ms % 86400000) / 3600000)
    return `${dias} día(s) y ${horas} hora(s)`
  }

  const box = (title, text) => `
╭━━━〔 ${title} 〕━━━⬣
${text}
╰━━━━━━━━━━━━━━━━⬣`

  const getTarget = () => {
    if (m.mentionedJid?.length) {
      return conn.decodeJid(m.mentionedJid[0])
    }

    if (m.quoted?.sender) {
      return conn.decodeJid(m.quoted.sender)
    }

    return null
  }

  const sameUser = (a, b) => mismoJid(
    conn.decodeJid(a),
    conn.decodeJid(b)
  )

  const findUserId = jid => buscarUsuario(db, jid) || jid

  // Si una relación nació por privado, registrar el primer grupo
  // donde alguno de los dos use un comando del sistema.
  if (typeof m.chat === 'string' && m.chat.endsWith('@g.us')) {
    const idActual = findUserId(sender)
    const usuarioActual = db[idActual]

    if (usuarioActual?.pareja && !usuarioActual.grupoRelacion) {
      const idPareja = findUserId(usuarioActual.pareja)
      const usuarioPareja = db[idPareja]

      if (usuarioPareja) {
        usuarioActual.grupoRelacion = m.chat
        usuarioPareja.grupoRelacion = m.chat
        saveDB(db)
      }
    }
  }

  // ============================================================
  // 💌 PROPONER NOVIAZGO
  // ============================================================

  if (command === 'pareja') {
    const targetRaw = getTarget()

    if (!targetRaw) {
      return m.reply(
        '💌 Menciona a la persona o responde a uno de sus mensajes para proponerle noviazgo. 🏹💘'
      )
    }

    const target = findUserId(targetRaw)

    if (sameUser(target, sender)) {
      return m.reply(
        '😹 ¡El amor propio es importante! Pero para esta propuesta necesitamos a alguien más. 💘'
      )
    }

    const user = getUser(sender)
    const tu = getUser(target)

    if (user.pareja) {
      return conn.reply(
        m.chat,
        box(
          '💞 TU CORAZÓN YA TIENE DUEÑO',
          `${tag(sender)} ❤️ ${tag(user.pareja)}

Tu corazón ya eligió a alguien especial. ❤️
Cuida esa historia antes de comenzar otra. 💐`
        ),
        m,
        { mentions: [sender, user.pareja] }
      )
    }

    if (tu.pareja) {
      return conn.reply(
        m.chat,
        box(
          '💞 ESE CORAZÓN YA ESTÁ OCUPADO',
          `${tag(target)} ❤️ ${tag(tu.pareja)}

Esa persona ya tiene una relación registrada. 💕`
        ),
        m,
        { mentions: [target, tu.pareja] }
      )
    }

    tu.propuesta = sender
    tu.propuestaFecha = ahora

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💌 UNA PREGUNTA DEL CORAZÓN',
        `💐 Para: ${tag(target)}

${tag(sender)} quiere compartir sonrisas,
detalles y momentos especiales contigo. 💗

💕 ¿Le das una oportunidad a esta historia?

💖 *.aceptar* — Aceptar la propuesta
🥺 *.rechazar* — Rechazar con cariño`
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

    if (!user.propuesta) {
      return m.reply('💌 No tienes ninguna propuesta de noviazgo pendiente.')
    }

    const proposer = findUserId(user.propuesta)
    const proposerUser = getUser(proposer)

    if (user.pareja || proposerUser.pareja) {
      user.propuesta = null
      user.propuestaFecha = null
      saveDB(db)

      return m.reply(
        '💔 Uno de los dos ya tiene una relación registrada. No se pudo aceptar la propuesta.'
      )
    }

    user.estado = 'novios'
    proposerUser.estado = 'novios'

    user.pareja = proposer
    proposerUser.pareja = sender

    user.relacionFecha = ahora
    proposerUser.relacionFecha = ahora

    const grupoRelacion =
      typeof m.chat === 'string' && m.chat.endsWith('@g.us')
        ? m.chat
        : null

    user.grupoRelacion = grupoRelacion
    proposerUser.grupoRelacion = grupoRelacion

    user.avisoCasarseEnviado = false
    proposerUser.avisoCasarseEnviado = false
    delete user.avisoCasarseEnviadoEn
    delete proposerUser.avisoCasarseEnviadoEn

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

¡Comienza una nueva aventura para dos! ❤️

Que nunca falten las risas, los mensajes bonitos
y los detalles inesperados. 🥹💞

💍 Después de 3 días podrán usar *.casarse*.`
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

    if (!user.propuesta) {
      return m.reply('💌 No tienes ninguna propuesta esperando respuesta.')
    }

    const proposer = findUserId(user.propuesta)

    user.propuesta = null
    user.propuestaFecha = null

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💌 UNA RESPUESTA DEL CORAZÓN',
        `${tag(sender)} ha decidido no aceptar
la propuesta de ${tag(proposer)}.

A veces los corazones sienten distinto, y está bien. 🤍`
      ),
      m,
      { mentions: [sender, proposer] }
    )
  }

  // ============================================================
  // 💑 CONSULTAR RELACIÓN
  // ============================================================

  if (command === 'relacion') {
    const user = getUser(sender)

    if (!user.pareja) {
      return m.reply('💔 Todavía no tienes una pareja registrada.')
    }

    const pareja = findUserId(user.pareja)
    const estado = user.matrimonioFecha ? '💍 Casados' : '💑 Novios'
    const tiempoJuntos = user.relacionFecha
      ? tiempo(ahora - Number(user.relacionFecha))
      : 'Desconocido'

    return conn.reply(
      m.chat,
      box(
        '💖 SU PEQUEÑA HISTORIA',
        `${tag(sender)} ❤️ ${tag(pareja)}

Estado: ${estado}
Tiempo juntos: ${tiempoJuntos}
Amor acumulado: ❤️ ${Number(user.amor || 0)}`
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

    if (!user.pareja) {
      return m.reply('💔 Primero necesitas tener una pareja registrada.')
    }

    if (user.matrimonioFecha) {
      return m.reply('💍 ¡Ya estás casado con tu pareja registrada!')
    }

    if (!user.relacionFecha) {
      return m.reply('🥺 No se encuentra registrada la fecha de inicio del noviazgo.')
    }

    const tiempoRelacion = ahora - Number(user.relacionFecha)
    const esOwner = ownersJid.some(owner => sameUser(owner, sender))

    if (!esOwner && tiempoRelacion < TRES_DIAS) {
      return conn.reply(
        m.chat,
        box(
          '⏳ ¡TODAVÍA FALTA UN POQUITO!',
          `💑 Tiempo de noviazgo: ${tiempo(tiempoRelacion)}

Para proponer matrimonio deben cumplir 3 días.
⏳ Tiempo restante: ${tiempo(TRES_DIAS - tiempoRelacion)}`
        ),
        m,
        { mentions: [sender, user.pareja] }
      )
    }

    const idPareja = findUserId(user.pareja)
    const pareja = getUser(idPareja)

    pareja.propuestaMatrimonio = sender
    pareja.propuestaMatrimonioFecha = ahora

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💒 ¿QUIERES CASARTE CONMIGO?',
        `💐 Para: ${tag(idPareja)}

${tag(sender)} quiere dar el siguiente paso
y te pregunta si quieres casarte. ❤️💍

💍 *.si* — Aceptar
🥺 *.no* — Rechazar`
      ),
      m,
      { mentions: [sender, idPareja] }
    )
  }

  // ============================================================
  // 💍 ACEPTAR MATRIMONIO
  // ============================================================

  if (command === 'si') {
    const user = getUser(sender)

    if (!user.propuestaMatrimonio) {
      return m.reply('💍 No tienes ninguna propuesta de matrimonio pendiente.')
    }

    const proposer = findUserId(user.propuestaMatrimonio)
    const proposerUser = getUser(proposer)

    if (!sameUser(user.pareja, proposer)) {
      user.propuestaMatrimonio = null
      user.propuestaMatrimonioFecha = null
      saveDB(db)

      return m.reply(
        '🥺 Esta propuesta ya no se puede confirmar porque la relación cambió.'
      )
    }

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

¡Felicidades a los recién casados! ❤️💍
Que nunca falten las risas, el respeto
y los momentos bonitos. 🥹💐`
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

    if (!user.propuestaMatrimonio) {
      return m.reply('💍 No tienes ninguna propuesta de matrimonio pendiente.')
    }

    const proposer = findUserId(user.propuestaMatrimonio)

    user.propuestaMatrimonio = null
    user.propuestaMatrimonioFecha = null

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💌 UNA RESPUESTA SINCERA',
        `${tag(sender)} ha decidido no aceptar
la propuesta de matrimonio de ${tag(proposer)}.

La relación continúa como noviazgo. 💞`
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

    if (!user.pareja) {
      return m.reply('💔 No tienes pareja registrada en este momento.')
    }

    if (user.matrimonioFecha) {
      return m.reply('💍 Para terminar el matrimonio utiliza *.divorciar*.')
    }

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

    delete user.avisoCasarseEnviadoEn
    delete pareja.avisoCasarseEnviadoEn

    user.amor = 0
    pareja.amor = 0

    user.propuestaMatrimonio = null
    pareja.propuestaMatrimonio = null

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💔 UNA HISTORIA LLEGA A SU FIN',
        `${tag(sender)} 💔 ${tag(exId)}

La relación ha terminado y ambos vuelven
a figurar como solteros. 🤍`
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

    if (!user.matrimonioFecha) {
      return m.reply('💍 No tienes un matrimonio registrado.')
    }

    const idPareja = findUserId(user.pareja)
    const pareja = getUser(idPareja)

    user.matrimonioFecha = null
    pareja.matrimonioFecha = null

    user.estado = 'novios'
    pareja.estado = 'novios'

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💔 UN NUEVO CAPÍTULO',
        `${tag(sender)} 💔 ${tag(idPareja)}

El matrimonio ha terminado, pero el sistema
todavía los registra como novios. 💞`
      ),
      m,
      { mentions: [sender, idPareja] }
    )
  }

  // ============================================================
  // 💕 ACCIONES ROMÁNTICAS
  // .amor .besar .abrazar .flores .regalo .cita
  // Aceptan mención o respuesta a un mensaje.
  // ============================================================

  if (['amor', 'besar', 'abrazar', 'flores', 'regalo', 'cita'].includes(command)) {
    const user = getUser(sender)
    const targetRaw = getTarget()

    if (!targetRaw) {
      return m.reply(
        `💌 Menciona a tu pareja o responde a uno de sus mensajes.\n\nAcción: *.${command}*`
      )
    }

    const target = findUserId(targetRaw)

    if (sameUser(target, sender)) {
      return m.reply('😹 Para esta acción necesitas mencionar a otra persona.')
    }

    const targetUser = getUser(target)

    if (targetUser.pareja && !sameUser(targetUser.pareja, sender)) {
      const parejaObjetivo = findUserId(targetUser.pareja)

      return conn.reply(
        m.chat,
        box(
          '💘 ¡CUPIDO SE EQUIVOCÓ DE DIRECCIÓN!',
          `${tag(target)} ya tiene una relación con
${tag(parejaObjetivo)}. La acción fue cancelada. 💞`
        ),
        m,
        { mentions: [sender, target, parejaObjetivo] }
      )
    }

    if (user.pareja && !sameUser(user.pareja, target)) {
      const parejaSender = findUserId(user.pareja)

      return conn.reply(
        m.chat,
        box(
          '💔 ¡CUIDADO, CORAZÓN ENAMORADO!',
          `${tag(sender)}, tu pareja registrada es
${tag(parejaSender)}. La acción fue cancelada. ❤️`
        ),
        m,
        { mentions: [sender, target, parejaSender] }
      )
    }

    if (!user.pareja || !sameUser(user.pareja, target)) {
      return m.reply(
        `💞 Para usar *.${command}*, primero deben figurar como pareja. ❤️`
      )
    }

    const puntos = {
      amor: 10,
      besar: 5,
      abrazar: 3,
      flores: 15,
      regalo: 20,
      cita: 25
    }

    const acciones = {
      amor: 'Declaración de amor 💌',
      besar: 'Beso 😘',
      abrazar: 'Abrazo lleno de cariño 🫂',
      flores: 'Ramo de flores 💐',
      regalo: 'Regalo especial 🎁',
      cita: 'Cita romántica 🌹'
    }

    const suma = puntos[command]

    user.amor = Number(user.amor || 0) + suma
    targetUser.amor = Number(targetUser.amor || 0) + suma

    saveDB(db)

    return conn.reply(
      m.chat,
      box(
        '💖 UN MOMENTITO DE AMOR',
        `${tag(sender)} 💞 ${tag(target)}

✨ Detalle: ${acciones[command]}
❤️ Amor ganado: +${suma}
💗 Amor acumulado: ${user.amor}

¡Sigan creando recuerdos bonitos! 🌷`
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
      return m.reply('🔒 Este comando es exclusivo del owner.')
    }

    let texto = ''
    const mentions = []
    const procesadas = new Set()

    for (const id of Object.keys(db)) {
      const user = db[id]
      if (!user?.pareja) continue

      const idPareja = findUserId(user.pareja)
      if (!idPareja || !db[idPareja]) continue

      const llave = [id, idPareja].sort().join('|')
      if (procesadas.has(llave)) continue
      procesadas.add(llave)

      const pareja = db[idPareja]
      const estado = user.matrimonioFecha ? '💍 Casados' : '💑 Novios'
      const juntos = user.relacionFecha
        ? tiempo(ahora - Number(user.relacionFecha))
        : 'Desconocido'

      texto += `╭─────────────⬣
💖 ${tag(id)} ❤️ ${tag(idPareja)}
Estado: ${estado}
Tiempo juntos: ${juntos}
Nivel de amor: ${Number(user.amor || 0)}
╰─────────────⬣

`

      mentions.push(id, idPareja)
    }

    if (!texto) {
      texto = '🥺 Todavía no hay parejitas registradas. 🏹💞'
    }

    return conn.reply(
      m.chat,
      box('💞 EL RINCÓN DE LAS PAREJITAS', texto.trim()),
      m,
      { mentions: [...new Set(mentions)] }
    )
  }

  // ============================================================
  // 🧹 BORRAR TODAS LAS PAREJAS — SOLO OWNER
  // ============================================================

  if (command === 'clearship') {
    if (!ownersJid.some(owner => sameUser(owner, sender))) {
      return m.reply('🔒 Este comando es exclusivo del owner.')
    }

    for (const id of Object.keys(db)) {
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
      '🧹 Se reiniciaron las relaciones registradas. ¡Cupido tiene la libreta en blanco! 💌'
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
