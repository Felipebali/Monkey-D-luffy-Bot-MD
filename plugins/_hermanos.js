// ============================================================
// 🤝 HERMANOS.JS — WHATSAPP-BOT 2026 ULTRA
// 👥 Hasta 3 hermanos por usuario
// 💾 Compatible con hermanos.json antiguo
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const MAX_HERMANOS = 3
const COOLDOWN_MS = 60 * 1000
const PROPUESTA_MS = 3 * 24 * 60 * 60 * 1000

// ============================================================
// 📁 BASE DE DATOS
// ============================================================

const dir = './database'

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

const file = path.join(dir, 'hermanos.json')

if (!fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify({}, null, 2))
}

// ============================================================
// 💾 DATABASE
// ============================================================

const loadDB = () => {
  try {
    const data = fs.readFileSync(file, 'utf8')
    return JSON.parse(data || '{}')
  } catch {
    return {}
  }
}

const saveDB = data => {
  try {
    fs.writeFileSync(
      file,
      JSON.stringify(data, null, 2)
    )
  } catch (e) {
    console.error('❌ Error guardando hermanos.json:', e)
  }
}

// ============================================================
// 👑 OWNERS
// ============================================================

function getOwnersJid() {
  return (global.owner || [])
    .map(v => {
      if (Array.isArray(v)) v = v[0]

      if (
        typeof v !== 'string' &&
        typeof v !== 'number'
      ) return null

      const number =
        String(v).replace(/[^0-9]/g, '')

      if (!number) return null

      return `${number}@s.whatsapp.net`
    })
    .filter(Boolean)
}

// ============================================================
// 🔧 NORMALIZAR JID
// ============================================================

const normalizeJid = (jid, conn) => {
  if (!jid) return null

  try {
    if (conn?.decodeJid) {
      jid = conn.decodeJid(jid)
    }
  } catch {}

  return jid
}

// ============================================================
// 🔍 COMPARAR USUARIOS
// ============================================================

const sameUser = (a, b, conn) => {
  if (!a || !b) return false

  a = normalizeJid(a, conn)
  b = normalizeJid(b, conn)

  if (!a || !b) return false

  if (a === b) return true

  const clean = jid =>
    String(jid)
      .split(':')[0]
      .split('@')[0]
      .replace(/[^0-9]/g, '')

  const A = clean(a)
  const B = clean(b)

  return Boolean(A && B && A === B)
}

// ============================================================
// 🔎 BUSCAR ID REAL
// ============================================================

const findUserId = (db, jid, conn) => {
  if (!jid) return null

  jid = normalizeJid(jid, conn)

  if (!jid) return null

  if (db[jid]) return jid

  for (const id of Object.keys(db)) {
    if (sameUser(id, jid, conn)) {
      return id
    }
  }

  return jid
}

// ============================================================
// 👤 CREAR / OBTENER USUARIO
// ============================================================

const getUser = (db, jid, conn) => {
  const id = findUserId(db, jid, conn)

  if (!id) return null

  if (!db[id]) {
    db[id] = {
      hermanos: [],
      propuestas: [],
      propuestaFecha: {},
      hermandadFecha: {},
      nivel: 0,
      interacciones: 0,
      cooldown: 0
    }
  }

  const user = db[id]

  // ========================================================
  // 🔄 MIGRACIÓN DEL SISTEMA ANTIGUO
  // ========================================================

  if (!Array.isArray(user.hermanos)) {
    user.hermanos = []

    if (user.hermano) {
      user.hermanos.push(user.hermano)
    }

    delete user.hermano
  }

  if (!Array.isArray(user.propuestas)) {
    user.propuestas = []

    if (user.propuesta) {
      user.propuestas.push(user.propuesta)
    }

    delete user.propuesta
  }

  if (!user.propuestaFecha) {
    user.propuestaFecha = {}
  }

  if (!user.hermandadFecha) {
    user.hermandadFecha = {}
  }

  if (typeof user.nivel !== 'number') {
    user.nivel = Number(user.nivel || 0)
  }

  if (typeof user.interacciones !== 'number') {
    user.interacciones =
      Number(user.interacciones || 0)
  }

  if (typeof user.cooldown !== 'number') {
    user.cooldown =
      Number(user.cooldown || 0)
  }

  // Limitar máximo
  user.hermanos =
    user.hermanos
      .filter(Boolean)
      .slice(0, MAX_HERMANOS)

  return user
}

// ============================================================
// 🎯 OBTENER TARGET
// ============================================================

const getTarget = (m, conn) => {

  if (m.mentionedJid?.length) {
    return normalizeJid(
      m.mentionedJid[0],
      conn
    )
  }

  if (m.quoted?.sender) {
    return normalizeJid(
      m.quoted.sender,
      conn
    )
  }

  return null
}

// ============================================================
// 🏷️ MENCION
// ============================================================

const tag = jid => {

  if (!jid) {
    return '@usuario'
  }

  return '@' +
    String(jid)
      .split('@')[0]
      .split(':')[0]
}

// ============================================================
// 📅 FECHA BONITA
// ============================================================

const fechaBonita = ms => {

  if (!ms) {
    return 'Desconocida'
  }

  const d = new Date(ms)

  if (isNaN(d.getTime())) {
    return 'Desconocida'
  }

  return d.toLocaleDateString(
    'es-ES',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }
  )
}

// ============================================================
// 🏅 RANGOS
// ============================================================

const rango = nivel => {

  nivel = Number(nivel || 0)

  if (nivel >= 300)
    return '👑 Hermanos Supremos'

  if (nivel >= 200)
    return '🔥 Hermanos Legendarios'

  if (nivel >= 120)
    return '💪 Hermanos Fuertes'

  if (nivel >= 60)
    return '🤝 Hermanos Reales'

  if (nivel >= 30)
    return '🙂 Hermanos Cercanos'

  return '👶 Hermanos Nuevos'
}

// ============================================================
// ⏳ COOLDOWN
// ============================================================

const checkCooldown = user => {

  const ahora = Date.now()

  if (
    user.cooldown &&
    ahora - user.cooldown < COOLDOWN_MS
  ) {

    return Math.ceil(
      (
        COOLDOWN_MS -
        (ahora - user.cooldown)
      ) / 1000
    )
  }

  user.cooldown = ahora

  return 0
}

// ============================================================
// ⏰ PROPUESTA EXPIRADA
// ============================================================

const propuestaExpirada = (
  user,
  proposerId,
  conn
) => {

  if (
    !user?.propuestaFecha ||
    !proposerId
  ) {
    return false
  }

  const fecha =
    user.propuestaFecha[proposerId]

  if (!fecha) {
    return false
  }

  return (
    Date.now() - fecha >
    PROPUESTA_MS
  )
}

// ============================================================
// 🧹 LIMPIAR PROPUESTA
// ============================================================

const eliminarPropuesta = (
  user,
  proposerId,
  conn
) => {

  if (!user) return

  user.propuestas =
    user.propuestas.filter(
      id => !sameUser(
        id,
        proposerId,
        conn
      )
    )

  if (user.propuestaFecha) {
    delete user.propuestaFecha[
      proposerId
    ]

    // Limpiar posibles claves equivalentes
    for (
      const key of Object.keys(
        user.propuestaFecha
      )
    ) {
      if (
        sameUser(
          key,
          proposerId,
          conn
        )
      ) {
        delete user.propuestaFecha[key]
      }
    }
  }
}

// ============================================================
// 🤝 BUSCAR HERMANO REAL
// ============================================================

const getBrotherIds = (
  user,
  db,
  conn
) => {

  if (!user?.hermanos?.length) {
    return []
  }

  return user.hermanos
    .map(id =>
      findUserId(
        db,
        id,
        conn
      )
    )
    .filter(Boolean)
}

// ============================================================
// 🔍 ¿YA SON HERMANOS?
// ============================================================

const areBrothers = (
  user,
  targetId,
  conn
) => {

  return user.hermanos.some(
    id =>
      sameUser(
        id,
        targetId,
        conn
      )
  )
}

// ============================================================
// 🤝 AÑADIR HERMANDAD
// ============================================================

const addBrother = (
  user,
  targetId,
  fecha
) => {

  if (!user.hermanos.includes(targetId)) {
    user.hermanos.push(targetId)
  }

  user.hermandadFecha[targetId] = fecha
}

// ============================================================
// 💔 ELIMINAR HERMANDAD
// ============================================================

const removeBrother = (
  user,
  targetId,
  conn
) => {

  const old = [
    ...user.hermanos
  ]

  user.hermanos =
    user.hermanos.filter(
      id =>
        !sameUser(
          id,
          targetId,
          conn
        )
    )

  for (
    const key of Object.keys(
      user.hermandadFecha || {}
    )
  ) {

    if (
      sameUser(
        key,
        targetId,
        conn
      )
    ) {
      delete user.hermandadFecha[key]
    }
  }

  return old.length !==
    user.hermanos.length
}

// ============================================================
// 🤝 HANDLER
// ============================================================

let handler = async (
  m,
  { conn, command }
) => {

  try {

    const db = loadDB()

    const sender =
      normalizeJid(
        m.sender,
        conn
      )

    const ahora =
      Date.now()

    const ownersJid =
      getOwnersJid()

    const userId =
      findUserId(
        db,
        sender,
        conn
      )

    const user =
      getUser(
        db,
        userId,
        conn
      )

    // ========================================================
    // 🤝 PROPONER HERMANO
    // ========================================================

    if (command === 'hermano') {

      const targetRaw =
        getTarget(
          m,
          conn
        )

      if (!targetRaw) {

        return m.reply(
          '🤝 *PROPUESTA DE HERMANDAD*\n\n' +
          'Menciona a la persona o responde a su mensaje.\n\n' +
          `👥 Puedes tener hasta *${MAX_HERMANOS} hermanos*.`
        )
      }

      const targetId =
        findUserId(
          db,
          targetRaw,
          conn
        )

      if (
        sameUser(
          targetId,
          sender,
          conn
        )
      ) {

        return m.reply(
          '😹 No puedes ser tu propio hermano.'
        )
      }

      // ------------------------------------------------------
      // LÍMITE DEL SOLICITANTE
      // ------------------------------------------------------

      if (
        user.hermanos.length >=
        MAX_HERMANOS
      ) {

        return m.reply(
          `🧬 *LÍMITE ALCANZADO*\n\n` +
          `Ya tienes tus *${MAX_HERMANOS} hermanos*.\n` +
          `Primero rompe una hermandad para poder formar otra.`
        )
      }

      const target =
        getUser(
          db,
          targetId,
          conn
        )

      // ------------------------------------------------------
      // LÍMITE DEL OBJETIVO
      // ------------------------------------------------------

      if (
        target.hermanos.length >=
        MAX_HERMANOS
      ) {

        return conn.reply(
          m.chat,
          `😅 ${tag(targetId)} ya tiene sus *${MAX_HERMANOS} hermanos*.\n\n` +
          `No puede aceptar otra hermandad hasta liberar un espacio.`,
          m,
          {
            mentions: [
              targetId
            ]
          }
        )
      }

      // ------------------------------------------------------
      // YA SON HERMANOS
      // ------------------------------------------------------

      if (
        areBrothers(
          user,
          targetId,
          conn
        )
      ) {

        return conn.reply(
          m.chat,
          `🤝 ${tag(targetId)} ya forma parte de tus hermanos.`,
          m,
          {
            mentions: [
              targetId
            ]
          }
        )
      }

      // ------------------------------------------------------
      // PROPUESTA DUPLICADA
      // ------------------------------------------------------

      const propuestaExistente =
        target.propuestas.some(
          id =>
            sameUser(
              id,
              sender,
              conn
            )
        )

      if (
        propuestaExistente
      ) {

        return m.reply(
          '⏳ Ya le enviaste una propuesta de hermandad a esa persona.'
        )
      }

      // ------------------------------------------------------
      // CREAR PROPUESTA
      // ------------------------------------------------------

      target.propuestas.push(
        sender
      )

      target.propuestaFecha[sender] =
        ahora

      saveDB(db)

      return conn.reply(
        m.chat,

        `🤝 *NUEVA PROPUESTA DE HERMANDAD*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +

        `${tag(sender)} quiere ser hermano de ${tag(targetId)} 🧬\n\n` +

        `👥 Espacios disponibles:\n` +
        `• ${MAX_HERMANOS - target.hermanos.length}/${MAX_HERMANOS}\n\n` +

        `📨 ${tag(targetId)}, tienes una propuesta.\n\n` +

        `👉 *.aceptarhermano*\n` +
        `👉 *.rechazarhermano*\n\n` +

        `⏰ La propuesta dura 3 días.\n` +
        `━━━━━━━━━━━━━━━━━━━━`,

        m,
        {
          mentions: [
            sender,
            targetId
          ]
        }
      )
    }

    // ========================================================
    // 👀 VER HERMANOS
    // ========================================================

    if (
      command === 'verhermano' ||
      command === 'relacionhermano'
    ) {

      const targetRaw =
        getTarget(
          m,
          conn
        )

      const targetId =
        targetRaw
          ? findUserId(
              db,
              targetRaw,
              conn
            )
          : userId

      const target =
        getUser(
          db,
          targetId,
          conn
        )

      const hermanos =
        getBrotherIds(
          target,
          db,
          conn
        )

      if (!hermanos.length) {

        return conn.reply(
          m.chat,
          `😹 ${tag(targetId)} todavía no tiene hermanos.`,
          m,
          {
            mentions: [
              targetId
            ]
          }
        )
      }

      let texto =
        `🧬 *HERMANOS DE ${tag(targetId)}*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n`

      const mentions = [
        targetId
      ]

      hermanos.forEach(
        (broId, i) => {

          const fecha =
            target.hermandadFecha?.[broId] ||
            target.hermandadFecha?.[
              target.hermanos[i]
            ]

          texto +=
            `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ` +
            `*Hermano ${i + 1}:* ${tag(broId)}\n` +
            `📅 Desde: ${fechaBonita(fecha)}\n\n`

          mentions.push(
            broId
          )
        }
      )

      texto +=
        `👥 Total: *${hermanos.length}/${MAX_HERMANOS}*\n` +
        `💪 Nivel: *${target.nivel}*\n` +
        `🏅 Rango: *${rango(target.nivel)}*\n` +
        `🎮 Interacciones: *${target.interacciones || 0}*\n` +
        `━━━━━━━━━━━━━━━━━━━━`

      return conn.reply(
        m.chat,
        texto,
        m,
        {
          mentions
        }
      )
    }

    // ========================================================
    // ✅ ACEPTAR
    // ========================================================

    if (
      command === 'aceptarhermano'
    ) {

      if (
        !user.propuestas.length
      ) {

        return m.reply(
          '💭 No tienes ninguna propuesta de hermandad pendiente.'
        )
      }

      // ------------------------------------------------------
      // SI HAY VARIAS PROPUESTAS
      // ------------------------------------------------------

      let propuestasValidas = []

      for (
        const proposerRaw
        of user.propuestas
      ) {

        const proposerId =
          findUserId(
            db,
            proposerRaw,
            conn
          )

        if (
          !proposerId
        ) continue

        if (
          propuestaExpirada(
            user,
            proposerRaw,
            conn
          )
        ) {

          eliminarPropuesta(
            user,
            proposerRaw,
            conn
          )

          continue
        }

        propuestasValidas.push(
          proposerId
        )
      }

      if (
        !propuestasValidas.length
      ) {

        saveDB(db)

        return m.reply(
          '⌛ Todas tus propuestas pendientes ya expiraron.'
        )
      }

      // ------------------------------------------------------
      // SI HAY MÁS DE UNA, MOSTRAR LISTA
      // ------------------------------------------------------

      if (
        propuestasValidas.length > 1
      ) {

        let texto =
          `📨 *TIENES ${propuestasValidas.length} PROPUESTAS*\n\n` +
          `Responde mencionando a la persona que quieres aceptar:\n\n`

        const mentions = []

        propuestasValidas.forEach(
          (id, i) => {

            texto +=
              `${i + 1}. ${tag(id)}\n`

            mentions.push(
              id
            )
          }
        )

        texto +=
          `\n💡 Ejemplo:\n` +
          `*.aceptarhermano @usuario*`

        return conn.reply(
          m.chat,
          texto,
          m,
          {
            mentions
          }
        )
      }

      const proposerId =
        propuestasValidas[0]

      const proposer =
        getUser(
          db,
          proposerId,
          conn
        )

      // ------------------------------------------------------
      // VERIFICAR ESPACIO
      // ------------------------------------------------------

      if (
        user.hermanos.length >=
        MAX_HERMANOS
      ) {

        return m.reply(
          `❌ Ya tienes ${MAX_HERMANOS} hermanos.\n\n` +
          `Rompe una hermandad antes de aceptar otra.`
        )
      }

      if (
        proposer.hermanos.length >=
        MAX_HERMANOS
      ) {

        eliminarPropuesta(
          user,
          proposerId,
          conn
        )

        saveDB(db)

        return m.reply(
          `😅 La persona que te propuso ya tiene ${MAX_HERMANOS} hermanos.`
        )
      }

      // ------------------------------------------------------
      // CREAR HERMANDAD
      // ------------------------------------------------------

      addBrother(
        user,
        proposerId,
        ahora
      )

      addBrother(
        proposer,
        userId,
        ahora
      )

      eliminarPropuesta(
        user,
        proposerId,
        conn
      )

      eliminarPropuesta(
        proposer,
        userId,
        conn
      )

      user.nivel =
        Number(user.nivel || 0)

      proposer.nivel =
        Number(proposer.nivel || 0)

      user.interacciones =
        Number(user.interacciones || 0)

      proposer.interacciones =
        Number(proposer.interacciones || 0)

      saveDB(db)

      return conn.reply(
        m.chat,

        `🧬 *¡HERMANDAD CONFIRMADA!*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +

        `${tag(userId)} 🤝 ${tag(proposerId)}\n\n` +

        `🎉 Ahora son hermanos oficiales.\n\n` +

        `📅 Desde: ${fechaBonita(ahora)}\n` +

        `👥 Hermanos de ${tag(userId)}: ` +
        `${user.hermanos.length}/${MAX_HERMANOS}\n\n` +

        `👥 Hermanos de ${tag(proposerId)}: ` +
        `${proposer.hermanos.length}/${MAX_HERMANOS}\n\n` +

        `💪 Nivel inicial: 0\n` +
        `👶 Rango: Hermanos Nuevos\n` +

        `━━━━━━━━━━━━━━━━━━━━`,

        m,
        {
          mentions: [
            userId,
            proposerId
          ]
        }
      )
    }

    // ========================================================
    // ❌ RECHAZAR
    // ========================================================

    if (
      command === 'rechazarhermano'
    ) {

      if (
        !user.propuestas.length
      ) {

        return m.reply(
          '💭 No tienes propuestas de hermandad.'
        )
      }

      let targetRaw =
        getTarget(
          m,
          conn
        )

      // ------------------------------------------------------
      // SI MENCIONA A ALGUIEN, RECHAZAR ESA
      // ------------------------------------------------------

      if (targetRaw) {

        const proposerId =
          findUserId(
            db,
            targetRaw,
            conn
          )

        const existe =
          user.propuestas.some(
            id =>
              sameUser(
                id,
                proposerId,
                conn
              )
          )

        if (!existe) {

          return m.reply(
            '❌ Esa persona no te hizo una propuesta de hermandad.'
          )
        }

        eliminarPropuesta(
          user,
          proposerId,
          conn
        )

        saveDB(db)

        return conn.reply(
          m.chat,

          `😅 ${tag(userId)} rechazó la propuesta de hermandad de ${tag(proposerId)}.\n\n` +
          `🧬 La propuesta fue eliminada.`,

          m,
          {
            mentions: [
              userId,
              proposerId
            ]
          }
        )
      }

      // ------------------------------------------------------
      // SI SOLO HAY UNA
      // ------------------------------------------------------

      if (
        user.propuestas.length === 1
      ) {

        const proposerId =
          findUserId(
            db,
            user.propuestas[0],
            conn
          )

        eliminarPropuesta(
          user,
          proposerId,
          conn
        )

        saveDB(db)

        return conn.reply(
          m.chat,

          `😅 ${tag(userId)} rechazó la propuesta de hermandad de ${tag(proposerId)}.\n\n` +
          `🧬 La propuesta fue eliminada.`,

          m,
          {
            mentions: [
              userId,
              proposerId
            ]
          }
        )
      }

      // ------------------------------------------------------
      // VARIAS PROPUESTAS
      // ------------------------------------------------------

      let texto =
        `📨 *Tienes varias propuestas pendientes*\n\n`

      const mentions = []

      user.propuestas.forEach(
        (id, i) => {

          texto +=
            `${i + 1}. ${tag(id)}\n`

          mentions.push(
            id
          )
        }
      )

      texto +=
        `\n💡 Menciona a la persona que quieres rechazar.`

      return conn.reply(
        m.chat,
        texto,
        m,
        {
          mentions
        }
      )
    }

    // ========================================================
    // 💔 ROMPER HERMANDAD
    // ========================================================

    if (
      command === 'romperhermandad'
    ) {

      const hermanos =
        getBrotherIds(
          user,
          db,
          conn
        )

      if (!hermanos.length) {

        return m.reply(
          '😹 No tienes hermanos actualmente.'
        )
      }

      let targetId = null

      const targetRaw =
        getTarget(
          m,
          conn
        )

      // ------------------------------------------------------
      // CON MENCIÓN / RESPUESTA
      // ------------------------------------------------------

      if (targetRaw) {

        const posible =
          findUserId(
            db,
            targetRaw,
            conn
          )

        if (
          areBrothers(
            user,
            posible,
            conn
          )
        ) {

          targetId =
            posible

        } else {

          return m.reply(
            '❌ Esa persona no es uno de tus hermanos.'
          )
        }

      }

      // ------------------------------------------------------
      // SOLO UN HERMANO
      // ------------------------------------------------------

      else if (
        hermanos.length === 1
      ) {

        targetId =
          hermanos[0]

      }

      // ------------------------------------------------------
      // VARIOS HERMANOS
      // ------------------------------------------------------

      else {

        let texto =
          `💔 *TIENES VARIOS HERMANOS*\n\n` +
          `Menciona al hermano con quien quieres terminar la hermandad:\n\n`

        const mentions = []

        hermanos.forEach(
          (id, i) => {

            texto +=
              `${i + 1}. ${tag(id)}\n`

            mentions.push(
              id
            )
          }
        )

        return conn.reply(
          m.chat,
          texto,
          m,
          {
            mentions
          }
        )
      }

      const bro =
        getUser(
          db,
          targetId,
          conn
        )

      removeBrother(
        user,
        targetId,
        conn
      )

      if (bro) {

        removeBrother(
          bro,
          userId,
          conn
        )
      }

      saveDB(db)

      return conn.reply(
        m.chat,

        `💔 *HERMANDAD TERMINADA*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +

        `${tag(userId)} terminó su hermandad con ${tag(targetId)}.\n\n` +

        `🧬 La relación fue eliminada.\n` +
        `👥 Hermanos restantes: ${user.hermanos.length}/${MAX_HERMANOS}\n\n` +

        `💪 El nivel general se mantiene.\n` +
        `🎮 Las demás hermandades siguen activas.\n\n` +

        `━━━━━━━━━━━━━━━━━━━━`,

        m,
        {
          mentions: [
            userId,
            targetId
          ]
        }
      )
    }

    // ========================================================
    // 🤜 INTERACCIONES
    // ========================================================

    const acciones = [
      'abrazohermano',
      'proteger',
      'chocarhermano',
      'entrenarhermano'
    ]

    if (
      acciones.includes(command)
    ) {

      const hermanos =
        getBrotherIds(
          user,
          db,
          conn
        )

      if (!hermanos.length) {

        return m.reply(
          '😹 No tienes hermanos.\n\n' +
          'Usa *.hermano @usuario* para formar una hermandad.'
        )
      }

      let broId = null

      const targetRaw =
        getTarget(
          m,
          conn
        )

      // ------------------------------------------------------
      // TARGET ESPECÍFICO
      // ------------------------------------------------------

      if (targetRaw) {

        const targetId =
          findUserId(
            db,
            targetRaw,
            conn
          )

        if (
          !areBrothers(
            user,
            targetId,
            conn
          )
        ) {

          return m.reply(
            '❌ Esa persona no es uno de tus hermanos.'
          )
        }

        broId =
          targetId

      }

      // ------------------------------------------------------
      // UN SOLO HERMANO
      // ------------------------------------------------------

      else if (
        hermanos.length === 1
      ) {

        broId =
          hermanos[0]

      }

      // ------------------------------------------------------
      // VARIOS HERMANOS
      // ------------------------------------------------------

      else {

        return conn.reply(
          m.chat,

          `🤝 *ELIGE A TU HERMANO*\n\n` +
          `Tienes ${hermanos.length} hermanos.\n` +
          `Menciona al hermano con quien quieres realizar la acción.`,

          m,
          {
            mentions:
              hermanos
          }
        )
      }

      const bro =
        getUser(
          db,
          broId,
          conn
        )

      // ------------------------------------------------------
      // COOLDOWN
      // ------------------------------------------------------

      const restante =
        checkCooldown(
          user
        )

      if (restante) {

        return m.reply(
          `⏳ Espera *${restante} segundos* para volver a interactuar.`
        )
      }

      let puntos = 0
      let accionTexto = ''

      switch (
        command
      ) {

        case 'abrazohermano':

          puntos = 5
          accionTexto =
            '🤗 dio un abrazo a'

          break

        case 'proteger':

          puntos = 10
          accionTexto =
            '🛡️ protegió a'

          break

        case 'chocarhermano':

          puntos = 7
          accionTexto =
            '🤜 chocó el puño con'

          break

        case 'entrenarhermano':

          puntos = 15
          accionTexto =
            '🏋️ entrenó con'

          break
      }

      // ------------------------------------------------------
      // SUBIR NIVEL
      // ------------------------------------------------------

      user.nivel =
        Number(user.nivel || 0) +
        puntos

      user.interacciones =
        Number(
          user.interacciones || 0
        ) + 1

      // El vínculo individual también recibe actividad
      bro.nivel =
        Number(bro.nivel || 0) +
        puntos

      bro.interacciones =
        Number(
          bro.interacciones || 0
        ) + 1

      saveDB(db)

      return conn.reply(
        m.chat,

        `🤝 *INTERACCIÓN DE HERMANOS*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +

        `${tag(userId)} ${accionTexto} ${tag(broId)}.\n\n` +

        `💪 +${puntos} puntos\n` +
        `📊 Nivel: ${user.nivel}\n` +
        `🏅 Rango: ${rango(user.nivel)}\n` +
        `👥 Hermanos: ${user.hermanos.length}/${MAX_HERMANOS}\n` +
        `🎮 Interacciones: ${user.interacciones}\n\n` +

        `━━━━━━━━━━━━━━━━━━━━`,

        m,
        {
          mentions: [
            userId,
            broId
          ]
        }
      )
    }

    // ========================================================
    // 🏆 TOP HERMANOS
    // ========================================================

    if (
      command === 'tophermanos'
    ) {

      const isOwner =
        ownersJid.some(
          owner =>
            sameUser(
              owner,
              sender,
              conn
            )
        )

      if (!isOwner) {

        return m.reply(
          '❌ Este comando es exclusivo del dueño.'
        )
      }

      const ranking = []

      for (
        const [id, data]
        of Object.entries(db)
      ) {

        if (
          !Array.isArray(
            data.hermanos
          )
        ) continue

        if (
          !data.hermanos.length
        ) continue

        ranking.push({
          id,
          hermanos:
            data.hermanos.length,
          nivel:
            Number(
              data.nivel || 0
            ),
          interacciones:
            Number(
              data.interacciones || 0
            )
        })
      }

      ranking.sort(
        (a, b) =>
          b.nivel -
          a.nivel
      )

      const top =
        ranking.slice(
          0,
          10
        )

      let texto =
        '🏆 *TOP HERMANOS*\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n'

      const mentions = []

      if (!top.length) {

        texto +=
          '😹 No hay hermanos activos.'

      } else {

        const medallas = [
          '🥇',
          '🥈',
          '🥉',
          '🏅',
          '🏅',
          '🏅',
          '🏅',
          '🏅',
          '🏅',
          '🏅'
        ]

        top.forEach(
          (item, i) => {

            texto +=
              `${medallas[i]} *${i + 1}° Lugar*\n` +
              `${tag(item.id)}\n` +
              `👥 Hermanos: ${item.hermanos}/${MAX_HERMANOS}\n` +
              `💪 Nivel: ${item.nivel}\n` +
              `🏅 ${rango(item.nivel)}\n` +
              `🎮 Interacciones: ${item.interacciones}\n\n`

            mentions.push(
              item.id
            )
          }
        )
      }

      texto +=
        '━━━━━━━━━━━━━━━━━━━━'

      return conn.reply(
        m.chat,
        texto,
        m,
        {
          mentions
        }
      )
    }

    // ========================================================
    // 📜 LISTA DE HERMANOS
    // ========================================================

    if (
      command === 'listahermanos'
    ) {

      const isOwner =
        ownersJid.some(
          owner =>
            sameUser(
              owner,
              sender,
              conn
            )
        )

      if (!isOwner) {

        return m.reply(
          '❌ Este comando es exclusivo del dueño.'
        )
      }

      let texto =
        '🧬 *HERMANOS ACTIVOS*\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n'

      const mentions = []

      for (
        const [id, data]
        of Object.entries(db)
      ) {

        if (
          !Array.isArray(
            data.hermanos
          )
        ) continue

        if (
          !data.hermanos.length
        ) continue

        const hermanos =
          data.hermanos
            .map(
              brother =>
                findUserId(
                  db,
                  brother,
                  conn
                )
            )
            .filter(Boolean)

        if (!hermanos.length) {
          continue
        }

        texto +=
          `👤 ${tag(id)}\n`

        hermanos.forEach(
          (broId, i) => {

            texto +=
              `   ${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${tag(broId)}\n`

            mentions.push(
              broId
            )
          }
        )

        texto +=
          `   👥 ${hermanos.length}/${MAX_HERMANOS}\n` +
          `   💪 Nivel: ${data.nivel || 0}\n` +
          `   🎮 Interacciones: ${data.interacciones || 0}\n\n`

        mentions.push(
          id
        )
      }

      if (!mentions.length) {

        texto +=
          '😹 No hay hermanos activos.\n'
      }

      texto +=
        '━━━━━━━━━━━━━━━━━━━━'

      return conn.reply(
        m.chat,
        texto.trim(),
        m,
        {
          mentions: [
            ...new Set(
              mentions
            )
          ]
        }
      )
    }

    // ========================================================
    // 🧹 CLEAR BRO
    // ========================================================

    if (
      command === 'clearbro'
    ) {

      const isOwner =
        ownersJid.some(
          owner =>
            sameUser(
              owner,
              sender,
              conn
            )
        )

      if (!isOwner) {

        return m.reply(
          '❌ Este comando es exclusivo del dueño.'
        )
      }

      for (
        const id
        of Object.keys(db)
      ) {

        db[id] = {
          hermanos: [],
          propuestas: [],
          propuestaFecha: {},
          hermandadFecha: {},
          nivel: 0,
          interacciones: 0,
          cooldown: 0
        }
      }

      saveDB(db)

      return m.reply(
        '🧹 *BASE DE HERMANDADES LIMPIADA*\n\n' +
        '✅ Todas las hermandades fueron eliminadas.\n' +
        '✅ Todas las propuestas fueron eliminadas.\n' +
        '✅ Todos los niveles fueron reiniciados.\n' +
        '✅ Todas las interacciones fueron reiniciadas.\n\n' +
        `👥 Límite actual: ${MAX_HERMANOS} hermanos por persona.`
      )
    }

  } catch (e) {

    console.error(
      '❌ Error en hermanos.js:',
      e
    )

    return m.reply(
      '❌ Ocurrió un error interno en el sistema de hermanos.'
    )
  }
}

// ============================================================
// 📋 COMANDOS
// ============================================================

handler.command = [

  'hermano',

  'aceptarhermano',
  'rechazarhermano',

  'romperhermandad',

  'abrazohermano',
  'proteger',
  'chocarhermano',
  'entrenarhermano',

  'relacionhermano',
  'verhermano',

  'tophermanos',
  'listahermanos',

  'clearbro'

]

// ============================================================
// 🏷️ CONFIG
// ============================================================

handler.tags = [
  'fun',
  'hermanos'
]

handler.help = [

  'hermano @usuario',
  'aceptarhermano',
  'rechazarhermano',
  'romperhermandad @usuario',

  'abrazohermano @usuario',
  'proteger @usuario',
  'chocarhermano @usuario',
  'entrenarhermano @usuario',

  'verhermano',
  'relacionhermano',

  'tophermanos',
  'listahermanos',

  'clearbro'

]

handler.group = true

export default handler
