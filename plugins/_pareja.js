// 📂 plugins/parejas.js
// 💕 Sistema de parejas — FelixCat_Bot

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
  } catch {
    return {}
  }
}

const saveDB = data =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2))

const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000


// ============================================================
// 👑 OWNERS
// ============================================================

function getOwnersJid() {
  return (global.owner || [])
    .map(v => {

      if (Array.isArray(v)) v = v[0]
      if (typeof v !== 'string') return null

      const numero = v.replace(/[^0-9]/g, '')

      if (!numero) return null

      return numero + '@s.whatsapp.net'
    })
    .filter(Boolean)
}


// ============================================================
// 🔧 LIMPIAR JID
// ============================================================

function limpiarJid(conn, jid) {

  if (!jid) return null

  try {

    let id = String(jid)

    if (typeof conn.decodeJid === 'function') {
      id = conn.decodeJid(id)
    }

    return id
      .trim()
      .toLowerCase()

  } catch {

    return String(jid)
      .trim()
      .toLowerCase()
  }
}


// ============================================================
// 📱 OBTENER NÚMERO
// ============================================================

function obtenerNumero(conn, jid) {

  if (!jid) return null

  try {

    let id = limpiarJid(conn, jid)

    if (!id) return null

    id = id.split('@')[0]
    id = id.split(':')[0]

    const numero = id.replace(/\D/g, '')

    return numero || null

  } catch {

    return null
  }
}


// ============================================================
// 🧠 OBTENER TODAS LAS IDENTIDADES
// ============================================================

async function obtenerIdentidades(conn, jid, chat) {

  const identidades = new Set()

  if (!jid) return identidades

  try {

    const original =
      limpiarJid(conn, jid)

    if (!original)
      return identidades

    identidades.add(original)


    // ========================================================
    // 📱 NÚMERO
    // ========================================================

    const numero =
      obtenerNumero(conn, original)

    if (numero) {

      identidades.add(numero)

      identidades.add(
        `${numero}@s.whatsapp.net`
      )
    }


    // ========================================================
    // 🔄 LID → PHONE
    // ========================================================

    if (
      original.endsWith('@lid') &&
      typeof conn.getPNForLID === 'function'
    ) {

      try {

        const pn =
          await conn.getPNForLID(original)

        if (pn) {

          const limpio =
            limpiarJid(conn, pn)

          if (limpio)
            identidades.add(limpio)

          const num =
            obtenerNumero(conn, limpio)

          if (num) {

            identidades.add(num)

            identidades.add(
              `${num}@s.whatsapp.net`
            )
          }
        }

      } catch {}
    }


    // ========================================================
    // 🔄 PHONE → LID
    // ========================================================

    if (
      original.endsWith('@s.whatsapp.net') &&
      typeof conn.getLIDForPN === 'function'
    ) {

      try {

        const lid =
          await conn.getLIDForPN(original)

        if (lid) {

          const limpio =
            limpiarJid(conn, lid)

          if (limpio)
            identidades.add(limpio)
        }

      } catch {}
    }


    // ========================================================
    // 👥 PARTICIPANTES DEL GRUPO
    // ========================================================

    if (
      chat &&
      chat.endsWith('@g.us') &&
      typeof conn.groupMetadata === 'function'
    ) {

      try {

        const metadata =
          await conn.groupMetadata(chat)

        const participantes =
          metadata?.participants || []

        for (const participante of participantes) {

          const campos = [
            participante?.id,
            participante?.jid,
            participante?.lid,
            participante?.phoneNumber
          ].filter(Boolean)

          let coincide = false

          for (const campo of campos) {

            const limpio =
              limpiarJid(conn, campo)

            if (!limpio)
              continue

            if (limpio === original) {

              coincide = true
              break
            }

            const numeroCampo =
              obtenerNumero(conn, limpio)

            if (
              numero &&
              numeroCampo &&
              numero === numeroCampo
            ) {

              coincide = true
              break
            }
          }

          if (!coincide)
            continue

          for (const campo of campos) {

            const limpio =
              limpiarJid(conn, campo)

            if (limpio)
              identidades.add(limpio)

            const num =
              obtenerNumero(conn, limpio)

            if (num) {

              identidades.add(num)

              identidades.add(
                `${num}@s.whatsapp.net`
              )
            }
          }

          break
        }

      } catch {}
    }

  } catch {}

  return identidades
}


// ============================================================
// ❤️ COMPARAR PERSONAS
// ============================================================

async function esMismaPersona(
  conn,
  a,
  b,
  chat
) {

  if (!a || !b)
    return false

  const identidadesA =
    await obtenerIdentidades(
      conn,
      a,
      chat
    )

  const identidadesB =
    await obtenerIdentidades(
      conn,
      b,
      chat
    )

  for (const identidad of identidadesA) {

    if (identidadesB.has(identidad))
      return true
  }

  return false
}


// ============================================================
// 🔎 BUSCAR USUARIO REAL EN DB
// ============================================================

async function buscarUsuarioId(
  conn,
  db,
  jid,
  chat
) {

  if (!jid)
    return null

  const limpio =
    limpiarJid(conn, jid)


  // ==========================================================
  // Coincidencia exacta
  // ==========================================================

  if (
    limpio &&
    db[limpio]
  ) {
    return limpio
  }


  // ==========================================================
  // Coincidencia por identidad
  // ==========================================================

  for (const id of Object.keys(db)) {

    if (
      await esMismaPersona(
        conn,
        id,
        jid,
        chat
      )
    ) {

      return id
    }
  }

  return null
}


// ============================================================
// 👤 USUARIO NUEVO
// ============================================================

const crearUsuario = () => ({

  pareja: null,

  estado: 'soltero',

  propuesta: null,

  propuestaFecha: null,

  propuestaMatrimonio: null,

  propuestaMatrimonioFecha: null,

  relacionFecha: null,

  matrimonioFecha: null,

  amor: 0
})


// ============================================================
// 🤝 COMPROBAR SI DOS USUARIOS SON PAREJA
//
// ESTA ES LA ÚNICA LÓGICA UTILIZADA POR:
//
// .amor
// .besar
// .abrazar
// .regalo
//
// Acepta JID/LID y resuelve la identidad real.
// ============================================================

async function comprobarPareja(
  conn,
  db,
  senderId,
  senderUser,
  target,
  targetId,
  targetUser,
  chat
) {

  if (!senderId || !targetId)
    return false


  // ==========================================================
  // 🔎 RESOLVER IDENTIDADES CANÓNICAS
  // ==========================================================

  const senderReal =
    await buscarUsuarioId(
      conn,
      db,
      senderId,
      chat
    ) || senderId


  const targetReal =
    await buscarUsuarioId(
      conn,
      db,
      targetId,
      chat
    ) || targetId


  // ==========================================================
  // ❤️ 1. sender.pareja → target
  // ==========================================================

  if (senderUser?.pareja) {

    const parejaReal =
      await buscarUsuarioId(
        conn,
        db,
        senderUser.pareja,
        chat
      ) || senderUser.pareja


    if (
      parejaReal === targetReal ||
      parejaReal === targetId ||
      parejaReal === target
    ) {

      return true
    }


    if (
      await esMismaPersona(
        conn,
        parejaReal,
        targetReal,
        chat
      )
    ) {

      return true
    }


    if (
      await esMismaPersona(
        conn,
        parejaReal,
        target,
        chat
      )
    ) {

      return true
    }
  }


  // ==========================================================
  // ❤️ 2. target.pareja → sender
  // ==========================================================

  if (targetUser?.pareja) {

    const parejaReal =
      await buscarUsuarioId(
        conn,
        db,
        targetUser.pareja,
        chat
      ) || targetUser.pareja


    if (
      parejaReal === senderReal ||
      parejaReal === senderId
    ) {

      return true
    }


    if (
      await esMismaPersona(
        conn,
        parejaReal,
        senderReal,
        chat
      )
    ) {

      return true
    }


    if (
      await esMismaPersona(
        conn,
        parejaReal,
        senderId,
        chat
      )
    ) {

      return true
    }
  }


  // ==========================================================
  // 🔍 3. RESPALDO: BUSCAR LA RELACIÓN EN TODA LA DB
  // ==========================================================

  for (const id of Object.keys(db)) {

    const registro =
      db[id]

    if (!registro?.pareja)
      continue


    const esSender =
      id === senderReal ||
      id === senderId ||
      await esMismaPersona(
        conn,
        id,
        senderReal,
        chat
      )


    if (!esSender)
      continue


    const parejaReal =
      await buscarUsuarioId(
        conn,
        db,
        registro.pareja,
        chat
      ) || registro.pareja


    if (
      parejaReal === targetReal ||
      parejaReal === targetId ||
      parejaReal === target
    ) {

      return true
    }


    if (
      await esMismaPersona(
        conn,
        parejaReal,
        targetReal,
        chat
      )
    ) {

      return true
    }


    if (
      await esMismaPersona(
        conn,
        parejaReal,
        target,
        chat
      )
    ) {

      return true
    }
  }


  return false
}


// ============================================================
// 🤖 HANDLER
// ============================================================

let handler = async (
  m,
  {
    conn,
    command
  }
) => {

  try {

    const db =
      loadDB()

    const sender =
      limpiarJid(
        conn,
        m.sender
      )

    const ahora =
      Date.now()

    const ownersJid =
      getOwnersJid()


    // ========================================================
    // 👤 GET USER
    // ========================================================

    const getUser = id => {

      if (!id)
        return null

      if (!db[id]) {

        db[id] =
          crearUsuario()
      }

      return db[id]
    }


    // ========================================================
    // 🏷️ TAG
    // ========================================================

    const tag = id => {

      if (!id)
        return '@usuario'

      const numero =
        obtenerNumero(
          conn,
          id
        )

      return '@' + (
        numero ||
        String(id)
          .split('@')[0]
          .split(':')[0]
      )
    }


    // ========================================================
    // ⏱️ TIEMPO
    // ========================================================

    const tiempo = ms => {

      const dias =
        Math.floor(
          ms / 86400000
        )

      const horas =
        Math.floor(
          (ms % 86400000) /
          3600000
        )

      return `${dias} día(s) y ${horas} hora(s)`
    }


    // ========================================================
    // 📦 BOX
    // ========================================================

    const box = (
      title,
      text
    ) =>
      `╭━━━〔 ${title} 〕━━━⬣
${text}
╰━━━━━━━━━━━━━━━━⬣`


    // ========================================================
    // 🎯 TARGET
    //
    // FUNCIONA IGUAL PARA TODOS LOS COMANDOS:
    //
    // .amor @usuario
    // .amor respondiendo un mensaje
    //
    // .besar @usuario
    // .besar respondiendo un mensaje
    //
    // .abrazar @usuario
    // .abrazar respondiendo un mensaje
    //
    // .regalo @usuario
    // .regalo respondiendo un mensaje
    // ========================================================

    const getTarget = () => {

      // 👤 MENCIONADO

      if (
        m.mentionedJid?.length
      ) {

        return conn.decodeJid(
          m.mentionedJid[0]
        )
      }


      // 💬 MENSAJE CITADO

      if (
        m.quoted?.sender
      ) {

        return conn.decodeJid(
          m.quoted.sender
        )
      }


      return null
    }


    // ========================================================
    // 💘 PAREJA
    // ========================================================

    if (
      command === 'pareja'
    ) {

      const target =
        getTarget()

      if (!target)
        return m.reply(
          '💌 Menciona o responde a alguien.'
        )

      if (
        await esMismaPersona(
          conn,
          target,
          sender,
          m.chat
        )
      ) {

        return m.reply(
          '😹 No puedes proponerte a ti mismo.'
        )
      }

      const senderId =
        await buscarUsuarioId(
          conn,
          db,
          sender,
          m.chat
        ) || sender

      const targetId =
        await buscarUsuarioId(
          conn,
          db,
          target,
          m.chat
        ) || target

      const user =
        getUser(senderId)

      const tu =
        getUser(targetId)


      if (user.pareja) {

        return conn.reply(
          m.chat,

          box(
            '💞 YA TIENES PAREJA',

            `${tag(sender)} ❤️ ${tag(user.pareja)}
No puedes proponer estando en relación.`
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


      if (tu.pareja) {

        return conn.reply(
          m.chat,

          box(
            '💔 PERSONA OCUPADA',

            `${tag(target)} ❤️ ${tag(tu.pareja)}
Respeta relaciones ajenas.`
          ),

          m,

          {
            mentions: [
              target,
              tu.pareja
            ]
          }
        )
      }


      tu.propuesta =
        senderId

      tu.propuestaFecha =
        ahora

      saveDB(db)

      return conn.reply(
        m.chat,

        box(
          '💘 PROPUESTA DE AMOR',

          `${tag(sender)} quiere estar con ${tag(target)} ❤️
Responde:
✨ *.aceptar*
✨ *.rechazar*`
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


    // ========================================================
    // 💖 ACEPTAR
    // ========================================================

    if (
      command === 'aceptar'
    ) {

      const senderId =
        await buscarUsuarioId(
          conn,
          db,
          sender,
          m.chat
        ) || sender

      const user =
        getUser(senderId)

      if (!user.propuesta)
        return m.reply(
          '💭 No tienes propuestas.'
        )

      const proposer =
        user.propuesta

      const proposerId =
        await buscarUsuarioId(
          conn,
          db,
          proposer,
          m.chat
        ) || proposer

      const proposerUser =
        getUser(proposerId)


      if (
        user.pareja ||
        proposerUser.pareja
      ) {

        return m.reply(
          '❌ Uno de los dos ya tiene pareja.'
        )
      }


      user.estado =
        'novios'

      proposerUser.estado =
        'novios'

      user.pareja =
        proposerId

      proposerUser.pareja =
        senderId

      user.relacionFecha =
        ahora

      proposerUser.relacionFecha =
        ahora

      user.propuesta =
        null

      proposerUser.propuesta =
        null

      saveDB(db)

      return conn.reply(
        m.chat,

        box(
          '💞 NUEVA PAREJA',

          `${tag(sender)} ❤️ ${tag(proposer)}
Ahora son novios 💑
Deben esperar 7 días para casarse.`
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


    // ========================================================
    // ❌ RECHAZAR
    // ========================================================

    if (
      command === 'rechazar'
    ) {

      const senderId =
        await buscarUsuarioId(
          conn,
          db,
          sender,
          m.chat
        ) || sender

      const user =
        getUser(senderId)

      if (!user.propuesta)
        return m.reply(
          '❌ No tienes propuestas.'
        )

      const proposer =
        user.propuesta

      user.propuesta =
        null

      saveDB(db)

      return conn.reply(
        m.chat,

        box(
          '💔 PROPUESTA RECHAZADA',

          `${tag(sender)} ha rechazado a ${tag(proposer)}.`
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


    // ========================================================
    // 💑 RELACION
    // ========================================================

    if (
      command === 'relacion'
    ) {

      const senderId =
        await buscarUsuarioId(
          conn,
          db,
          sender,
          m.chat
        ) || sender

      const user =
        getUser(senderId)

      if (!user.pareja)
        return m.reply(
          '💔 No tienes pareja.'
        )

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

          `${tag(sender)} ❤️ ${tag(user.pareja)}
Estado: ${estado}
Tiempo juntos: ${tiempoJuntos}
Nivel de amor: ❤️ ${user.amor}`
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


    // ========================================================
    // 💍 CASARSE
    // ========================================================

    if (
      command === 'casarse'
    ) {

      const senderId =
        await buscarUsuarioId(
          conn,
          db,
          sender,
          m.chat
        ) || sender

      const user =
        getUser(senderId)

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
          '❌ No se pudo determinar cuándo comenzó la relación.'
        )

      const tiempoRelacion =
        ahora -
        user.relacionFecha

      if (
        tiempoRelacion <
        SIETE_DIAS
      ) {

        const faltan =
          tiempo(
            SIETE_DIAS -
            tiempoRelacion
          )

        return conn.reply(
          m.chat,

          box(
            '⏳ AÚN NO PUEDEN CASARSE',

            `${tag(sender)} ❤️ ${tag(user.pareja)}
Deben esperar 7 días.
Faltan ${faltan}.`
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

      const parejaId =
        await buscarUsuarioId(
          conn,
          db,
          user.pareja,
          m.chat
        ) || user.pareja

      const pareja =
        getUser(parejaId)

      pareja.propuestaMatrimonio =
        senderId

      pareja.propuestaMatrimonioFecha =
        ahora

      saveDB(db)

      return conn.reply(
        m.chat,

        box(
          '💒 PROPUESTA DE MATRIMONIO',

          `${tag(sender)} 💍 ${tag(user.pareja)}
Responde:
✨ *.si*
✨ *.no*`
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


    // ========================================================
    // 💍 SI
    // ========================================================

    if (
      command === 'si'
    ) {

      const senderId =
        await buscarUsuarioId(
          conn,
          db,
          sender,
          m.chat
        ) || sender

      const user =
        getUser(senderId)

      if (!user.propuestaMatrimonio)
        return m.reply(
          '❌ No tienes propuestas.'
        )

      const proposer =
        user.propuestaMatrimonio

      const proposerId =
        await buscarUsuarioId(
          conn,
          db,
          proposer,
          m.chat
        ) || proposer

      const proposerUser =
        getUser(proposerId)

      const siguenSiendoPareja =
        await comprobarPareja(
          conn,
          db,
          senderId,
          user,
          proposer,
          proposerId,
          proposerUser,
          m.chat
        )

      if (!siguenSiendoPareja) {

        return m.reply(
          '❌ Ya no son pareja.'
        )
      }

      user.matrimonioFecha =
        ahora

      proposerUser.matrimonioFecha =
        ahora

      user.propuestaMatrimonio =
        null

      proposerUser.propuestaMatrimonio =
        null

      saveDB(db)

      return conn.reply(
        m.chat,

        box(
          '💍 MATRIMONIO CONFIRMADO',

          `${tag(sender)} 💍 ${tag(proposer)}
Ahora están oficialmente casados 💖`
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


    // ========================================================
    // ❌ NO
    // ========================================================

    if (
      command === 'no'
    ) {

      const senderId =
        await buscarUsuarioId(
          conn,
          db,
          sender,
          m.chat
        ) || sender

      const user =
        getUser(senderId)

      if (!user.propuestaMatrimonio)
        return m.reply(
          '❌ No tienes propuestas.'
        )

      const proposer =
        user.propuestaMatrimonio

      user.propuestaMatrimonio =
        null

      saveDB(db)

      return conn.reply(
        m.chat,

        box(
          '💔 MATRIMONIO RECHAZADO',

          `${tag(sender)} ha rechazado casarse con ${tag(proposer)}.`
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


    // ========================================================
    // 💔 TERMINAR
    // ========================================================

    if (
      command === 'terminar'
    ) {

      const senderId =
        await buscarUsuarioId(
          conn,
          db,
          sender,
          m.chat
        ) || sender

      const user =
        getUser(senderId)

      if (!user.pareja)
        return m.reply(
          '❌ No tienes pareja.'
        )

      if (user.matrimonioFecha)
        return m.reply(
          '❌ Están casados, usa .divorciar para separarse.'
        )

      const exId =
        await buscarUsuarioId(
          conn,
          db,
          user.pareja,
          m.chat
        ) || user.pareja

      const pareja =
        getUser(exId)

      user.pareja =
        null

      pareja.pareja =
        null

      user.estado =
        'soltero'

      pareja.estado =
        'soltero'

      user.relacionFecha =
        null

      pareja.relacionFecha =
        null

      user.amor =
        0

      pareja.amor =
        0

      saveDB(db)

      return conn.reply(
        m.chat,

        box(
          '💔 RELACIÓN TERMINADA',

          `${tag(sender)} 💔 ${tag(exId)}
Ahora ambos están solteros.`
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


    // ========================================================
    // 💔 DIVORCIAR
    // ========================================================

    if (
      command === 'divorciar'
    ) {

      const senderId =
        await buscarUsuarioId(
          conn,
          db,
          sender,
          m.chat
        ) || sender

      const user =
        getUser(senderId)

      if (!user.matrimonioFecha)
        return m.reply(
          '❌ No estás casado.'
        )

      const parejaId =
        await buscarUsuarioId(
          conn,
          db,
          user.pareja,
          m.chat
        ) || user.pareja

      const pareja =
        getUser(parejaId)

      user.matrimonioFecha =
        null

      pareja.matrimonioFecha =
        null

      user.estado =
        'novios'

      pareja.estado =
        'novios'

      saveDB(db)

      return conn.reply(
        m.chat,

        box(
          '💔 DIVORCIO',

          `${tag(sender)} 💔 ${tag(parejaId)}
Siguen siendo novios.`
        ),

        m,

        {
          mentions: [
            sender,
            parejaId
          ]
        }
      )
    }


    // ========================================================
    // 💕 INTERACCIONES
    //
    // .amor
    // .besar
    // .abrazar
    // .regalo
    //
    // LOS 4 USAN EXACTAMENTE EL MISMO TARGET:
    // 👤 mención
    // 💬 mensaje citado/respondido
    // ========================================================

    if (
      [
        'amor',
        'besar',
        'abrazar',
        'regalo'
      ].includes(command)
    ) {

      // ======================================================
      // 👤 SENDER REAL
      // ======================================================

      const senderId =
        await buscarUsuarioId(
          conn,
          db,
          sender,
          m.chat
        ) || sender

      const user =
        getUser(senderId)


      // ======================================================
      // 🎯 TARGET
      //
      // EXACTAMENTE IGUAL PARA LOS 4 COMANDOS.
      // ======================================================

      const target =
        getTarget()


      if (!target) {

        return m.reply(
          '💌 Menciona a alguien o responde/cita su mensaje.'
        )
      }


      // ======================================================
      // 🔎 BUSCAR USUARIO REAL
      // ======================================================

      const targetId =
        await buscarUsuarioId(
          conn,
          db,
          target,
          m.chat
        ) || target

      const targetUser =
        getUser(targetId)


      // ======================================================
      // ❤️ ÚNICA COMPROBACIÓN DE PAREJA
      // ======================================================

      const sonPareja =
        await comprobarPareja(
          conn,
          db,
          senderId,
          user,
          target,
          targetId,
          targetUser,
          m.chat
        )


      // ======================================================
      // 💞 SON PAREJA
      //
      // MISMO BLOQUE PARA LOS 4.
      // ======================================================

      if (sonPareja) {

        const suma = {

          amor: 10,

          besar: 5,

          abrazar: 3,

          regalo: 15

        }[command]


        user.amor =
          Number(user.amor || 0) + suma

        targetUser.amor =
          Number(targetUser.amor || 0) + suma


        // ====================================================
        // 🔗 MANTENER RELACIÓN ENLAZADA
        // ====================================================

        user.pareja =
          targetId

        targetUser.pareja =
          senderId


        user.estado =
          user.estado || 'novios'

        targetUser.estado =
          targetUser.estado || 'novios'


        saveDB(db)


        // ====================================================
        // 💬 TEXTO
        // ====================================================

        const texto = {

          amor:
            `${tag(sender)} ❤️ le demostró todo su amor a su pareja ${tag(target)}.`,

          besar:
            `${tag(sender)} 💋 le dio un beso a su pareja ${tag(target)}.`,

          abrazar:
            `${tag(sender)} 🤗 abrazó con mucho cariño a su pareja ${tag(target)}.`,

          regalo:
            `${tag(sender)} 🎁 le hizo un regalo a su pareja ${tag(target)}.`

        }[command]


        // ====================================================
        // 📢 MENCIONES
        // ====================================================

        return conn.reply(

          m.chat,

          box(
            '💞 MOMENTO ROMÁNTICO',

            `${texto}

Acción: ${command}
Amor ganado: +${suma} ❤️
Nuevo nivel de amor: ❤️ ${user.amor}`
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


      // ======================================================
      // 🚨 NO SON PAREJA
      //
      // SOLO AHORA SE REVISA SI EL TARGET TIENE OTRA PAREJA.
      // ======================================================

      if (targetUser.pareja) {

        const parejaDelTarget =
          await buscarUsuarioId(
            conn,
            db,
            targetUser.pareja,
            m.chat
          ) || targetUser.pareja


        const esParejaDelSender =
          parejaDelTarget === senderId ||
          parejaDelTarget === sender ||
          await esMismaPersona(
            conn,
            parejaDelTarget,
            senderId,
            m.chat
          ) ||
          await esMismaPersona(
            conn,
            parejaDelTarget,
            sender,
            m.chat
          )


        if (!esParejaDelSender) {

          return conn.reply(

            m.chat,

            box(
              '🚨 PERSONA EN RELACIÓN',

              `${tag(target)} está en pareja con ${tag(targetUser.pareja)} ❤️
Respeta relaciones ajenas 😾`
            ),

            m,

            {
              mentions: [
                target,
                targetUser.pareja
              ]
            }
          )
        }
      }


      // ======================================================
      // 🚨 SENDER TIENE OTRA PAREJA
      // ======================================================

      if (user.pareja) {

        const parejaActual =
          await buscarUsuarioId(
            conn,
            db,
            user.pareja,
            m.chat
          ) || user.pareja


        return conn.reply(

          m.chat,

          box(
            '🚨 INFIDELIDAD DETECTADA',

            `${tag(sender)} intentó ${command} a ${tag(target)} 😾
Pero su pareja es ${tag(parejaActual)} ❤️`
          ),

          m,

          {
            mentions: [
              sender,
              target,
              parejaActual
            ]
          }
        )
      }


      // ======================================================
      // 💔 NO SON PAREJA
      // ======================================================

      return conn.reply(

        m.chat,

        box(
          '💔 NO SON PAREJA',

          `${tag(sender)} y ${tag(target)} todavía no son pareja.`
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


    // ========================================================
    // 👑 LISTA DE PAREJAS
    // ========================================================

    if (
      command === 'listapareja'
    ) {

      if (
        !ownersJid.includes(sender)
      ) {

        const esOwner =
          ownersJid.some(owner =>
            obtenerNumero(
              conn,
              owner
            ) ===
            obtenerNumero(
              conn,
              sender
            )
          )

        if (!esOwner) {

          return m.reply(
            '❌ Solo el dueño.'
          )
        }
      }


      let texto = ''

      let mentions = []


      for (
        const id of Object.keys(db)
      ) {

        const user =
          db[id]


        if (
          user.pareja &&
          id < user.pareja
        ) {

          const pareja =
            db[user.pareja]


          if (!pareja)
            continue


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


      if (!texto) {

        texto =
          '😿 No hay parejas activas.'
      }


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


    // ========================================================
    // 🧹 CLEARSHIP
    // ========================================================

    if (
      command === 'clearship'
    ) {

      if (
        !ownersJid.includes(sender)
      ) {

        const esOwner =
          ownersJid.some(owner =>
            obtenerNumero(
              conn,
              owner
            ) ===
            obtenerNumero(
              conn,
              sender
            )
          )

        if (!esOwner) {

          return m.reply(
            '❌ Solo el dueño.'
          )
        }
      }


      for (
        const id of Object.keys(db)
      ) {

        db[id] =
          crearUsuario()
      }


      saveDB(db)


      return m.reply(
        '🧹 Todas las parejas fueron eliminadas.'
      )
    }


  } catch (error) {

    console.error(
      '❌ Error en parejas.js:',
      error
    )


    return m.reply(
      '❌ Ocurrió un error en el sistema de parejas.'
    )
  }
}


// ============================================================
// 📌 COMANDOS
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

  'regalo',

  'listapareja',

  'clearship'

]


handler.group = true

export default handler
