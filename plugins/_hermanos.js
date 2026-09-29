// ============================================================
// 🤝 HERMANOS.JS — FELI 2026 PRO ULTRA
// Sistema completo de hermandad para FelixCat_Bot
// ============================================================

import fs from 'fs'
import path from 'path'

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
// 💾 FUNCIONES DATABASE
// ============================================================

const loadDB = () => {
  try {
    const data = fs.readFileSync(file, 'utf8')
    return JSON.parse(data || '{}')
  } catch {
    return {}
  }
}

const saveDB = (data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
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
      if (typeof v !== 'string') return null

      const number = v.replace(/[^0-9]/g, '')

      if (!number) return null

      return number + '@s.whatsapp.net'
    })
    .filter(Boolean)
}

// ============================================================
// 🔧 NORMALIZAR JID
// ============================================================

const normalizeJid = (jid, conn) => {
  if (!jid) return null

  try {
    jid = conn.decodeJid(jid)
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
    jid
      .split(':')[0]
      .split('@')[0]
      .replace(/[^0-9]/g, '')

  const A = clean(a)
  const B = clean(b)

  return Boolean(A && B && A === B)
}

// ============================================================
// 🔎 BUSCAR ID REAL EN LA BASE
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
      hermano: null,
      propuesta: null,
      propuestaFecha: null,
      hermandadFecha: null,
      nivel: 0,
      interacciones: 0,
      cooldown: 0
    }

  }

  const user = db[id]

  if (!('hermano' in user)) user.hermano = null
  if (!('propuesta' in user)) user.propuesta = null
  if (!('propuestaFecha' in user)) user.propuestaFecha = null
  if (!('hermandadFecha' in user)) user.hermandadFecha = null
  if (!('nivel' in user)) user.nivel = 0
  if (!('interacciones' in user)) user.interacciones = 0
  if (!('cooldown' in user)) user.cooldown = 0

  return user
}

// ============================================================
// 🎯 OBTENER TARGET
// Mención > mensaje citado
// ============================================================

const getTarget = (m, conn) => {

  if (m.mentionedJid?.length) {
    return normalizeJid(m.mentionedJid[0], conn)
  }

  if (m.quoted?.sender) {
    return normalizeJid(m.quoted.sender, conn)
  }

  return null
}

// ============================================================
// 🏷️ MENCION
// ============================================================

const tag = jid => {

  if (!jid) return '@usuario'

  return '@' + jid
    .split('@')[0]
    .split(':')[0]
}

// ============================================================
// 📅 FECHA BONITA
// ============================================================

const fechaBonita = ms => {

  if (!ms) return 'Desconocida'

  const d = new Date(ms)

  if (isNaN(d.getTime())) {
    return 'Desconocida'
  }

  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
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
    ahora - user.cooldown < 60000
  ) {
    const restante =
      Math.ceil(
        (60000 - (ahora - user.cooldown)) / 1000
      )

    return restante
  }

  user.cooldown = ahora

  return 0
}

// ============================================================
// ⏰ PROPUESTA EXPIRADA
// 3 DÍAS
// ============================================================

const propuestaExpirada = user => {

  if (!user.propuesta || !user.propuestaFecha) {
    return false
  }

  const TRES_DIAS = 3 * 24 * 60 * 60 * 1000

  return Date.now() - user.propuestaFecha > TRES_DIAS
}

// ============================================================
// 🤝 ENCONTRAR PAREJA DE HERMANOS
// ============================================================

const getBrotherId = (user, db, conn) => {

  if (!user?.hermano) {
    return null
  }

  return findUserId(db, user.hermano, conn)
}

// ============================================================
// 📊 TIEMPO DE HERMANDAD
// ============================================================

const diasHermandad = user => {

  if (!user?.hermandadFecha) {
    return 0
  }

  return Math.max(
    0,
    Math.floor(
      (Date.now() - user.hermandadFecha) /
      86400000
    )
  )
}

// ============================================================
// 🤝 HANDLER
// ============================================================

let handler = async (m, { conn, command }) => {

  try {

    const db = loadDB()

    const sender = normalizeJid(m.sender, conn)

    const ahora = Date.now()

    const ownersJid = getOwnersJid()

    // ========================================================
    // 👤 USUARIO ACTUAL
    // ========================================================

    const userId = findUserId(db, sender, conn)

    const user = getUser(db, userId, conn)

    // ========================================================
    // 🤝 PROPONER HERMANDAD
    // ========================================================

    if (command === 'hermano') {

      const targetRaw = getTarget(m, conn)

      if (!targetRaw) {

        return m.reply(
          '🤝 *¿Quieres un hermano?*\n\n' +
          'Menciona a alguien o responde a su mensaje.'
        )

      }

      const targetId = findUserId(db, targetRaw, conn)

      if (sameUser(targetId, sender, conn)) {

        return m.reply(
          '😹 No puedes ser tu propio hermano.'
        )

      }

      const target = getUser(db, targetId, conn)

      // ---------------------------------------------
      // YA TIENE HERMANO
      // ---------------------------------------------

      if (user.hermano) {

        const broId =
          getBrotherId(user, db, conn)

        return conn.reply(
          m.chat,
          `😎 Ya tienes hermano:\n\n` +
          `${tag(broId)}`,
          m,
          {
            mentions: [broId]
          }
        )

      }

      // ---------------------------------------------
      // TARGET YA TIENE HERMANO
      // ---------------------------------------------

      if (target.hermano) {

        return conn.reply(
          m.chat,
          `😅 ${tag(targetId)} ya tiene hermano.\n\n` +
          `No puedes formar otra hermandad con esa persona.`,
          m,
          {
            mentions: [targetId]
          }
        )

      }

      // ---------------------------------------------
      // PROPUESTA DUPLICADA
      // ---------------------------------------------

      if (
        target.propuesta &&
        sameUser(
          target.propuesta,
          sender,
          conn
        )
      ) {

        return m.reply(
          '⏳ Ya le hiciste una propuesta a esa persona.'
        )

      }

      // ---------------------------------------------
      // PROPUESTA NUEVA
      // ---------------------------------------------

      target.propuesta = sender
      target.propuestaFecha = ahora

      saveDB(db)

      return conn.reply(
        m.chat,

`🤝 *PROPUESTA DE HERMANDAD*

${tag(sender)} quiere ser hermano de ${tag(targetId)} 🧬

📨 ${tag(targetId)}, tienes una propuesta.

Responde:

👉 *.aceptarhermano*
👉 *.rechazarhermano*

⏰ La propuesta dura 3 días.`,

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
    // 👀 VER HERMANO
    // ========================================================

    if (command === 'verhermano') {

      const targetRaw = getTarget(m, conn)

      const targetId =
        targetRaw
          ? findUserId(db, targetRaw, conn)
          : userId

      const target =
        getUser(db, targetId, conn)

      if (!target.hermano) {

        return conn.reply(
          m.chat,
          `😹 ${tag(targetId)} no tiene hermano.`,
          m,
          {
            mentions: [targetId]
          }
        )

      }

      const broId =
        getBrotherId(target, db, conn)

      const dias =
        diasHermandad(target)

      return conn.reply(
        m.chat,

`🧬 *HERMANDAD*

${tag(targetId)} 🤝 ${tag(broId)}

🕒 Tiempo: ${dias} días
📅 Desde: ${fechaBonita(target.hermandadFecha)}

💪 Nivel: ${target.nivel}
🏅 Rango: ${rango(target.nivel)}
🎮 Interacciones: ${target.interacciones || 0}`,

        m,
        {
          mentions: [
            targetId,
            broId
          ]
        }
      )
    }

    // ========================================================
    // ✅ ACEPTAR
    // ========================================================

    if (command === 'aceptarhermano') {

      if (!user.propuesta) {

        return m.reply(
          '💭 No tienes ninguna propuesta de hermandad.'
        )

      }

      // ---------------------------------------------
      // VERIFICAR EXPIRACIÓN
      // ---------------------------------------------

      if (propuestaExpirada(user)) {

        user.propuesta = null
        user.propuestaFecha = null

        saveDB(db)

        return m.reply(
          '⌛ Esa propuesta de hermandad ya expiró.'
        )

      }

      const proposerId =
        findUserId(
          db,
          user.propuesta,
          conn
        )

      const proposer =
        getUser(
          db,
          proposerId,
          conn
        )

      // ---------------------------------------------
      // VERIFICAR QUE EL PROPONENTE SIGA LIBRE
      // ---------------------------------------------

      if (proposer.hermano) {

        user.propuesta = null
        user.propuestaFecha = null

        saveDB(db)

        return m.reply(
          '😅 La propuesta ya no puede aceptarse porque esa persona ya tiene hermano.'
        )

      }

      // ---------------------------------------------
      // CREAR HERMANDAD
      // ---------------------------------------------

      user.hermano = proposerId

      proposer.hermano = userId

      user.hermandadFecha = ahora

      proposer.hermandadFecha = ahora

      user.propuesta = null
      user.propuestaFecha = null

      proposer.propuesta = null
      proposer.propuestaFecha = null

      user.nivel = 0
      proposer.nivel = 0

      user.interacciones = 0
      proposer.interacciones = 0

      saveDB(db)

      return conn.reply(
        m.chat,

`🧬 *¡HERMANDAD CONFIRMADA!*

${tag(userId)} 🤝 ${tag(proposerId)}

🎉 Ahora son hermanos oficiales.

📅 Desde: ${fechaBonita(ahora)}

💪 Nivel inicial: 0
👶 Rango: Hermanos Nuevos`,

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

    if (command === 'rechazarhermano') {

      if (!user.propuesta) {

        return m.reply(
          '💭 No tienes propuestas de hermandad.'
        )

      }

      const proposerId =
        findUserId(
          db,
          user.propuesta,
          conn
        )

      user.propuesta = null
      user.propuestaFecha = null

      saveDB(db)

      return conn.reply(
        m.chat,

`😅 ${tag(userId)} rechazó la propuesta de hermandad de ${tag(proposerId)}.

🧬 La hermandad no fue creada.`,

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
    // 💔 ROMPER HERMANDAD
    // ========================================================

    if (command === 'romperhermandad') {

      if (!user.hermano) {

        return m.reply(
          '😹 No tienes hermano actualmente.'
        )

      }

      const broId =
        getBrotherId(user, db, conn)

      const bro =
        getUser(
          db,
          broId,
          conn
        )

      // ---------------------------------------------
      // LIMPIAR AMBOS
      // ---------------------------------------------

      user.hermano = null
      user.hermandadFecha = null

      user.nivel = 0
      user.interacciones = 0
      user.cooldown = 0

      if (bro) {

        bro.hermano = null
        bro.hermandadFecha = null

        bro.nivel = 0
        bro.interacciones = 0
        bro.cooldown = 0

      }

      saveDB(db)

      return conn.reply(
        m.chat,

`💔 *HERMANDAD TERMINADA*

${tag(userId)} rompió su hermandad con ${tag(broId)}.

🧬 La relación de hermanos fue eliminada.
💪 El nivel volvió a 0.
🎮 Las interacciones fueron reiniciadas.`,

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
    // 🤜 INTERACCIONES
    // ========================================================

    const acciones = [
      'abrazohermano',
      'proteger',
      'chocarhermano',
      'entrenarhermano'
    ]

    if (acciones.includes(command)) {

      if (!user.hermano) {

        return m.reply(
          '😹 No tienes hermano.\n\n' +
          'Usa *.hermano @usuario* para proponer una hermandad.'
        )

      }

      const broId =
        getBrotherId(user, db, conn)

      const bro =
        getUser(
          db,
          broId,
          conn
        )

      // ---------------------------------------------
      // COOLDOWN
      // ---------------------------------------------

      const restante =
        checkCooldown(user)

      if (restante) {

        return m.reply(
          `⏳ Espera *${restante} segundos* para volver a interactuar con tu hermano.`
        )

      }

      let puntos = 0
      let accionTexto = ''

      switch (command) {

        case 'abrazohermano':

          puntos = 5
          accionTexto = '🤗 dio un abrazo'

          break

        case 'proteger':

          puntos = 10
          accionTexto = '🛡️ protegió'

          break

        case 'chocarhermano':

          puntos = 7
          accionTexto = '🤜 chocó el puño con'

          break

        case 'entrenarhermano':

          puntos = 15
          accionTexto = '🏋️ entrenó con'

          break

      }

      // ---------------------------------------------
      // SUBIR NIVEL EN AMBOS
      // ---------------------------------------------

      user.nivel += puntos
      user.interacciones++

      bro.nivel = user.nivel
      bro.interacciones = user.interacciones

      saveDB(db)

      return conn.reply(
        m.chat,

`🤝 *INTERACCIÓN DE HERMANOS*

${tag(userId)} ${accionTexto} ${tag(broId)}.

💪 +${puntos} puntos

📊 Nivel: ${user.nivel}
🏅 Rango: ${rango(user.nivel)}
🎮 Interacciones: ${user.interacciones}`,

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
    // 🧬 RELACIÓN
    // ========================================================

    if (command === 'relacionhermano') {

      if (!user.hermano) {

        return m.reply(
          '😹 No tienes hermano.'
        )

      }

      const broId =
        getBrotherId(user, db, conn)

      const dias =
        diasHermandad(user)

      return conn.reply(
        m.chat,

`🧬 *RELACIÓN DE HERMANOS*

${tag(userId)} 🤝 ${tag(broId)}

🕒 Tiempo: ${dias} días
📅 Desde: ${fechaBonita(user.hermandadFecha)}

💪 Nivel: ${user.nivel}
🏅 Rango: ${rango(user.nivel)}
🎮 Interacciones: ${user.interacciones || 0}`,

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

    if (command === 'tophermanos') {

      const isOwner =
        ownersJid.some(owner =>
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

      const procesados = new Set()

      for (const [id, data] of Object.entries(db)) {

        if (!data.hermano) continue

        const broId =
          findUserId(
            db,
            data.hermano,
            conn
          )

        if (!broId) continue

        const key =
          [id, broId]
            .sort()
            .join('|')

        if (procesados.has(key)) {
          continue
        }

        procesados.add(key)

        ranking.push({
          id,
          broId,
          nivel: Number(data.nivel || 0),
          interacciones:
            Number(data.interacciones || 0)
        })
      }

      ranking.sort(
        (a, b) =>
          b.nivel - a.nivel
      )

      const top =
        ranking.slice(0, 5)

      let texto =
        '🏆 *TOP HERMANOS*\n\n'

      const mentions = []

      if (!top.length) {

        texto +=
          '😹 No hay hermanos activos.'

      } else {

        top.forEach((item, i) => {

          const medallas = [
            '🥇',
            '🥈',
            '🥉',
            '🏅',
            '🏅'
          ]

          texto +=
`${medallas[i]} *${i + 1}° Lugar*

${tag(item.id)} 🤝 ${tag(item.broId)}

💪 Nivel: ${item.nivel}
🏅 ${rango(item.nivel)}
🎮 Interacciones: ${item.interacciones}

`

          mentions.push(
            item.id,
            item.broId
          )
        })
      }

      return conn.reply(
        m.chat,
        texto.trim(),
        m,
        {
          mentions
        }
      )
    }

    // ========================================================
    // 📜 LISTA DE HERMANOS
    // ========================================================

    if (command === 'listahermanos') {

      const isOwner =
        ownersJid.some(owner =>
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
        '🧬 *HERMANOS ACTIVOS*\n\n'

      const mentions = []

      const procesados = new Set()

      for (const [id, data] of Object.entries(db)) {

        if (!data.hermano) {
          continue
        }

        const broId =
          findUserId(
            db,
            data.hermano,
            conn
          )

        if (!broId) {
          continue
        }

        const key =
          [id, broId]
            .sort()
            .join('|')

        if (procesados.has(key)) {
          continue
        }

        procesados.add(key)

        texto +=
`🤝 ${tag(id)} 🧬 ${tag(broId)}

💪 Nivel: ${data.nivel || 0}
🏅 ${rango(data.nivel || 0)}
🎮 Interacciones: ${data.interacciones || 0}

`

        mentions.push(
          id,
          broId
        )
      }

      if (!mentions.length) {

        texto +=
          '😹 No hay hermanos activos.'

      }

      return conn.reply(
        m.chat,
        texto.trim(),
        m,
        {
          mentions
        }
      )
    }

    // ========================================================
    // 🧹 CLEAR BRO
    // ========================================================

    if (command === 'clearbro') {

      const isOwner =
        ownersJid.some(owner =>
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

      for (const id of Object.keys(db)) {

        db[id] = {
          hermano: null,
          propuesta: null,
          propuestaFecha: null,
          hermandadFecha: null,
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
        '✅ Todas las interacciones fueron reiniciadas.'
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
// 📋 COMANDOS — 13 EN TOTAL
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
// 📤 EXPORT
// ============================================================

export default handler
