// ============================================================
// 📂 plugins/hermanos.js — whatsapp-bot 2026 PRO
// 🤝 SISTEMA COMPLETO DE HERMANDAD
// 🧬 Máximo 3 hermanos por usuario
// 💾 Base de datos protegida
// 🏆 Niveles, rangos, interacciones y rankings
// 👑 Herramientas exclusivas para Owners
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const MAX_HERMANOS = 3
const DURACION_PROPUESTA = 3 * 24 * 60 * 60 * 1000
const COOLDOWN = 60 * 1000

const DB_DIR = './database'
const DB_FILE = path.join(DB_DIR, 'hermanos.json')
const DB_TEMP = path.join(DB_DIR, 'hermanos.tmp.json')

// ============================================================
// 📁 PREPARAR ARCHIVOS
// ============================================================

function prepararDB() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, '{}', 'utf8')
  }
}

// ============================================================
// 💾 CARGAR BASE DE DATOS
// ============================================================

function loadDB() {
  try {
    prepararDB()

    const contenido = fs.readFileSync(DB_FILE, 'utf8')
    const db = JSON.parse(contenido || '{}')

    if (
      !db ||
      typeof db !== 'object' ||
      Array.isArray(db)
    ) {
      throw new Error('Formato de base de datos inválido.')
    }

    return db
  } catch (error) {
    console.error('[HERMANOS] Error leyendo la base de datos:', error)
    return null
  }
}

// ============================================================
// 💾 GUARDAR DE FORMA SEGURA
// ============================================================

function saveDB(db) {
  try {
    prepararDB()

    const contenido = JSON.stringify(db, null, 2)

    fs.writeFileSync(DB_TEMP, contenido, 'utf8')
    fs.renameSync(DB_TEMP, DB_FILE)

    return true
  } catch (error) {
    console.error('[HERMANOS] Error guardando la base de datos:', error)

    try {
      if (fs.existsSync(DB_TEMP)) {
        fs.unlinkSync(DB_TEMP)
      }
    } catch {}

    return false
  }
}

// ============================================================
// 👤 USUARIO NUEVO
// ============================================================

function defaultUser() {
  return {
    hermanos: [],
    propuestas: [],
    nivel: 0,
    interacciones: 0,
    cooldown: 0,
    hermandadFecha: null
  }
}

// ============================================================
// 🔧 NORMALIZAR JID
// ============================================================

function normalizeJid(jid, conn) {
  if (!jid) return null

  try {
    if (typeof conn?.decodeJid === 'function') {
      jid = conn.decodeJid(jid)
    }
  } catch {}

  jid = String(jid).trim()

  if (!jid) return null

  if (jid.includes('@')) {
    return jid
  }

  const numero = jid.replace(/[^0-9]/g, '')

  return numero ? `${numero}@s.whatsapp.net` : null
}

// ============================================================
// 🔢 OBTENER NÚMERO
// ============================================================

function digits(jid = '') {
  return String(jid)
    .split(':')[0]
    .split('@')[0]
    .replace(/[^0-9]/g, '')
}

// ============================================================
// 👥 COMPARAR USUARIOS
// ============================================================

function sameUser(a, b, conn) {
  if (!a || !b) return false

  const A = normalizeJid(a, conn)
  const B = normalizeJid(b, conn)

  if (!A || !B) return false
  if (A === B) return true

  // Comparar números solo entre identificadores telefónicos.
  // Evita confundir números de un LID con números de teléfono.
  const dominioA = A.split('@')[1]
  const dominioB = B.split('@')[1]

  if (
    dominioA !== 's.whatsapp.net' ||
    dominioB !== 's.whatsapp.net'
  ) {
    return false
  }

  return digits(A) === digits(B)
}

// ============================================================
// 🔎 BUSCAR ID EXISTENTE
// ============================================================

function findUserId(db, jid, conn) {
  const normalized = normalizeJid(jid, conn)

  if (!normalized) return null

  if (Object.prototype.hasOwnProperty.call(db, normalized)) {
    return normalized
  }

  for (const id of Object.keys(db)) {
    if (sameUser(id, normalized, conn)) {
      return id
    }
  }

  return normalized
}

// ============================================================
// 🔄 MIGRAR USUARIOS ANTIGUOS
// ============================================================

function migrateUser(user) {
  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    return defaultUser()
  }

  if (!Array.isArray(user.hermanos)) {
    user.hermanos = user.hermano
      ? [String(user.hermano)]
      : []
  }

  if (!Array.isArray(user.propuestas)) {
    user.propuestas = []

    if (user.propuesta) {
      user.propuestas.push({
        de: String(user.propuesta),
        fecha: Number(user.propuestaFecha) || Date.now()
      })
    }
  }

  user.hermanos = [
    ...new Set(
      user.hermanos
        .filter(Boolean)
        .map(String)
    )
  ].slice(0, MAX_HERMANOS)

  user.propuestas = user.propuestas
    .filter(Boolean)
    .map(p => {
      if (typeof p === 'string') {
        return {
          de: p,
          fecha: Date.now()
        }
      }

      return {
        de: p.de ? String(p.de) : null,
        fecha: Number(p.fecha) || Date.now()
      }
    })
    .filter(p => p.de)

  user.nivel = Math.max(0, Number(user.nivel) || 0)
  user.interacciones = Math.max(
    0,
    Number(user.interacciones) || 0
  )
  user.cooldown = Math.max(0, Number(user.cooldown) || 0)

  user.hermandadFecha = user.hermandadFecha || null

  delete user.hermano
  delete user.propuesta
  delete user.propuestaFecha

  return user
}

// ============================================================
// 👤 OBTENER USUARIO
// ============================================================

function getUser(db, jid, conn) {
  const id = findUserId(db, jid, conn)

  if (!id) return null

  if (!db[id]) {
    db[id] = defaultUser()
  }

  db[id] = migrateUser(db[id])

  return db[id]
}

// ============================================================
// 🧬 OBTENER HERMANOS
// ============================================================

function getBrotherIds(user, db, conn) {
  if (!user || !Array.isArray(user.hermanos)) {
    return []
  }

  const result = []

  for (const jid of user.hermanos) {
    const id = findUserId(db, jid, conn)

    if (!id || !db[id]) continue

    if (result.some(x => sameUser(x, id, conn))) {
      continue
    }

    result.push(id)
  }

  return result.slice(0, MAX_HERMANOS)
}

// ============================================================
// ➕ CREAR HERMANDAD RECÍPROCA
// ============================================================

function addBrother(db, userId, brotherId, conn) {
  if (sameUser(userId, brotherId, conn)) {
    return false
  }

  const user = getUser(db, userId, conn)
  const brother = getUser(db, brotherId, conn)

  if (!user || !brother) return false

  const myBrothers = getBrotherIds(user, db, conn)
  const theirBrothers = getBrotherIds(brother, db, conn)

  const alreadyRelated = myBrothers.some(
    id => sameUser(id, brotherId, conn)
  )

  if (alreadyRelated) return true

  if (
    myBrothers.length >= MAX_HERMANOS ||
    theirBrothers.length >= MAX_HERMANOS
  ) {
    return false
  }

  user.hermanos.push(
    normalizeJid(brotherId, conn)
  )

  brother.hermanos.push(
    normalizeJid(userId, conn)
  )

  const ahora = Date.now()

  if (!user.hermandadFecha) {
    user.hermandadFecha = ahora
  }

  if (!brother.hermandadFecha) {
    brother.hermandadFecha = ahora
  }

  return true
}

// ============================================================
// ➖ ELIMINAR HERMANDAD
// ============================================================

function removeBrother(db, userId, brotherId, conn) {
  const user = getUser(db, userId, conn)

  if (!user) return false

  user.hermanos = user.hermanos.filter(
    id => !sameUser(id, brotherId, conn)
  )

  if (user.hermanos.length === 0) {
    user.hermandadFecha = null
  }

  return true
}

// ============================================================
// 📨 PROPUESTAS
// ============================================================

function findProposal(user, sender, conn) {
  return user?.propuestas?.find(
    p => sameUser(p.de, sender, conn)
  ) || null
}

function removeProposal(user, sender, conn) {
  if (!user) return

  user.propuestas = user.propuestas.filter(
    p => !sameUser(p.de, sender, conn)
  )
}

// ============================================================
// 🧹 EXPIRAR PROPUESTAS
// ============================================================

function cleanExpiredProposals(db, conn) {
  let changed = false
  const ahora = Date.now()

  for (const id of Object.keys(db)) {
    const user = getUser(db, id, conn)

    if (!user) continue

    const anteriores = user.propuestas.length

    user.propuestas = user.propuestas.filter(
      p => ahora - Number(p.fecha || 0) <= DURACION_PROPUESTA
    )

    if (user.propuestas.length !== anteriores) {
      changed = true
    }
  }

  return changed
}

// ============================================================
// 🎯 OBTENER PERSONA MENCIONADA O CITADA
// ============================================================

function getTarget(m, conn) {
  if (Array.isArray(m.mentionedJid) && m.mentionedJid.length) {
    return normalizeJid(m.mentionedJid[0], conn)
  }

  if (m.quoted?.sender) {
    return normalizeJid(m.quoted.sender, conn)
  }

  return null
}

// ============================================================
// 🏷️ ETIQUETAS
// ============================================================

function tag(jid) {
  if (!jid) return '@usuario'

  return '@' + String(jid)
    .split('@')[0]
    .split(':')[0]
}

// ============================================================
// 📅 FECHAS
// ============================================================

function fechaBonita(ms) {
  if (!ms) return 'Sin registrar'

  const fecha = new Date(Number(ms))

  if (Number.isNaN(fecha.getTime())) {
    return 'Sin registrar'
  }

  return fecha.toLocaleDateString('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function diasDesde(ms) {
  if (!ms) return 0

  return Math.max(
    0,
    Math.floor((Date.now() - Number(ms)) / 86400000)
  )
}

// ============================================================
// 🏅 RANGOS
// ============================================================

function rango(nivel) {
  nivel = Number(nivel) || 0

  if (nivel >= 300) return '👑 Hermanos Supremos'
  if (nivel >= 200) return '🔥 Hermanos Legendarios'
  if (nivel >= 120) return '💪 Hermanos Fuertes'
  if (nivel >= 60) return '🤝 Hermanos Reales'
  if (nivel >= 30) return '🙂 Hermanos Cercanos'

  return '👶 Hermanos Nuevos'
}

// ============================================================
// 👑 OWNERS
// ============================================================

function getOwnersJid() {
  return (global.owner || [])
    .map(owner => {
      if (Array.isArray(owner)) {
        owner = owner[0]
      }

      if (
        typeof owner !== 'string' &&
        typeof owner !== 'number'
      ) {
        return null
      }

      const numero = String(owner).replace(/[^0-9]/g, '')

      return numero ? `${numero}@s.whatsapp.net` : null
    })
    .filter(Boolean)
}

function isOwner(sender, conn) {
  return getOwnersJid().some(
    owner => sameUser(owner, sender, conn)
  )
}

// ============================================================
// 🤝 LISTA DE HERMANOS
// ============================================================

function hermanosTexto(user, db, conn) {
  const hermanos = getBrotherIds(user, db, conn)

  if (!hermanos.length) {
    return '😹 No tienes hermanos registrados.'
  }

  return hermanos
    .map((id, i) => `${i + 1}. ${tag(id)}`)
    .join('\n')
}

// ============================================================
// ⏳ COMPROBAR COOLDOWN
// ============================================================

function tiempoRestante(user) {
  const transcurrido = Date.now() - Number(user.cooldown || 0)

  if (transcurrido >= COOLDOWN) return 0

  return Math.ceil((COOLDOWN - transcurrido) / 1000)
}

// ============================================================
// 🧬 HANDLER PRINCIPAL
// ============================================================

let handler = async (m, { conn, command, text }) => {
  try {
    const db = loadDB()

    if (!db) {
      return m.reply(
        '❌ No pude leer `database/hermanos.json`.\n\n' +
        '🛡️ No modifiqué el archivo para evitar perder tus datos.'
      )
    }

    const propuestasLimpiadas = cleanExpiredProposals(db, conn)

    const sender = normalizeJid(m.sender, conn)

    if (!sender) return

    const userId = findUserId(db, sender, conn)
    const user = getUser(db, userId, conn)

    if (!user) return

    if (propuestasLimpiadas && !saveDB(db)) {
      return m.reply('❌ No pude guardar los cambios de la base de datos.')
    }

    const targetRaw = getTarget(m, conn)

    // ========================================================
    // 🤝 PROPONER HERMANDAD
    // ========================================================

    if (command === 'hermano') {
      if (!targetRaw) {
        return m.reply(
          '🤝 *PROPUESTA DE HERMANDAD*\n\n' +
          'Menciona a una persona o responde a su mensaje.\n\n' +
          `👥 Máximo: ${MAX_HERMANOS} hermanos por persona.\n` +
          '💌 ¡Invita a alguien a formar parte de tu familia!'
        )
      }

      const targetId = findUserId(db, targetRaw, conn)

      if (sameUser(targetId, userId, conn)) {
        return m.reply('😹 No puedes proponerte una hermandad a ti mismo.')
      }

      const target = getUser(db, targetId, conn)

      if (!target) return m.reply('❌ No pude identificar a esa persona.')

      const myBrothers = getBrotherIds(user, db, conn)
      const theirBrothers = getBrotherIds(target, db, conn)

      if (myBrothers.some(id => sameUser(id, targetId, conn))) {
        return m.reply('🤝 ¡Ya son hermanos! Cuida esa amistad. 💙')
      }

      if (myBrothers.length >= MAX_HERMANOS) {
        return m.reply(
          `🚫 Ya tienes el máximo de ${MAX_HERMANOS} hermanos.`
        )
      }

      if (theirBrothers.length >= MAX_HERMANOS) {
        return conn.reply(
          m.chat,
          `😅 ${tag(targetId)} ya tiene ${MAX_HERMANOS} hermanos y no puede aceptar otra propuesta.`,
          m,
          { mentions: [targetId] }
        )
      }

      if (findProposal(target, userId, conn)) {
        return m.reply('⏳ Ya tienes una propuesta pendiente con esa persona.')
      }

      target.propuestas.push({
        de: userId,
        fecha: Date.now()
      })

      if (!saveDB(db)) {
        return m.reply('❌ No pude guardar la propuesta. Inténtalo nuevamente.')
      }

      return conn.reply(
        m.chat,
        `╭━━━〔 🤝 HERMANDAD 〕━━━⬣
│
│ 🧬 *¡NUEVA PROPUESTA!*
│
│ ${tag(userId)} quiere ser hermano de ${tag(targetId)}.
│
│ 💌 ¿Aceptas formar parte de su familia?
│
│ ✅ *.aceptarhermano*
│ ❌ *.rechazarhermano*
│
│ 👥 Máximo: ${MAX_HERMANOS} hermanos.
│ ⏳ La propuesta vence en 3 días.
╰━━━━━━━━━━━━━━━━━━━━⬣`,
        m,
        { mentions: [userId, targetId] }
      )
    }

    // ========================================================
    // 👀 VER HERMANOS
    // ========================================================

    if (
      command === 'verhermano' ||
      command === 'relacionhermano'
    ) {
      const targetId = targetRaw
        ? findUserId(db, targetRaw, conn)
        : userId

      const target = getUser(db, targetId, conn)
      const brothers = getBrotherIds(target, db, conn)

      if (!brothers.length) {
        return conn.reply(
          m.chat,
          `😹 ${tag(targetId)} todavía no tiene hermanos registrados.`,
          m,
          { mentions: [targetId] }
        )
      }

      const mentions = [targetId, ...brothers]

      let texto =
        `╭━━━〔 🧬 HERMANDAD 〕━━━⬣\n` +
        `│\n` +
        `│ 👤 ${tag(targetId)}\n` +
        `│ 👥 Hermanos: ${brothers.length}/${MAX_HERMANOS}\n` +
        `│\n`

      brothers.forEach((id, i) => {
        texto += `│ ${i + 1}. ${tag(id)}\n`
      })

      texto +=
        `│\n` +
        `│ 📅 Desde: ${fechaBonita(target.hermandadFecha)}\n` +
        `│ 💪 Nivel: ${target.nivel}\n` +
        `│ 🏅 Rango: ${rango(target.nivel)}\n` +
        `│ 🎮 Interacciones: ${target.interacciones}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━⬣`

      return conn.reply(m.chat, texto, m, { mentions })
    }

    // ========================================================
    // ✅ ACEPTAR PROPUESTA
    // ========================================================

    if (command === 'aceptarhermano') {
      if (!user.propuestas.length) {
        return m.reply('📭 No tienes propuestas de hermandad pendientes.')
      }

      let proposal = targetRaw
        ? findProposal(user, targetRaw, conn)
        : null

      if (!proposal && user.propuestas.length === 1) {
        proposal = user.propuestas[0]
      }

      if (!proposal) {
        let texto = '📨 *TUS PROPUESTAS PENDIENTES*\n\n'

        user.propuestas.forEach((p, i) => {
          texto += `${i + 1}. ${tag(p.de)}\n📅 ${fechaBonita(p.fecha)}\n\n`
        })

        texto += '👉 Responde al mensaje de la persona que quieres aceptar.'

        return conn.reply(
          m.chat,
          texto,
          m,
          { mentions: user.propuestas.map(p => p.de) }
        )
      }

      const proposerId = findUserId(db, proposal.de, conn)
      const proposer = getUser(db, proposerId, conn)

      if (!proposer) {
        removeProposal(user, proposal.de, conn)
        saveDB(db)

        return m.reply('❌ No pude encontrar a la persona que envió la propuesta.')
      }

      if (sameUser(proposerId, userId, conn)) {
        removeProposal(user, proposerId, conn)
        saveDB(db)

        return m.reply('❌ No puedes aceptar una propuesta de ti mismo.')
      }

      if (getBrotherIds(user, db, conn).some(
        id => sameUser(id, proposerId, conn)
      )) {
        removeProposal(user, proposerId, conn)
        saveDB(db)

        return m.reply('🤝 ¡Ya son hermanos! La propuesta fue cerrada.')
      }

      if (getBrotherIds(user, db, conn).length >= MAX_HERMANOS) {
        return m.reply(`🚫 Ya tienes ${MAX_HERMANOS} hermanos. No puedes aceptar otra propuesta.`)
      }

      if (getBrotherIds(proposer, db, conn).length >= MAX_HERMANOS) {
        removeProposal(user, proposerId, conn)
        saveDB(db)

        return m.reply(
          `😅 ${tag(proposerId)} ya alcanzó el límite de hermanos. La propuesta fue cerrada.`
        )
      }

      const agregado = addBrother(db, userId, proposerId, conn)

      if (!agregado) {
        return m.reply('❌ No pude crear la hermandad. Revisa los límites de ambos usuarios.')
      }

      removeProposal(user, proposerId, conn)
      removeProposal(proposer, userId, conn)

      if (!saveDB(db)) {
        return m.reply('❌ No pude guardar la hermandad. Inténtalo nuevamente.')
      }

      return conn.reply(
        m.chat,
        `╭━━━〔 🧬 HERMANDAD 〕━━━⬣
│
│ 🎉 *¡AHORA SON HERMANOS!*
│
│ ${tag(userId)} 🤝 ${tag(proposerId)}
│
│ 💙 ¡Una nueva familia se ha formado!
│
│ 👥 ${tag(userId)}: ${getBrotherIds(user, db, conn).length}/${MAX_HERMANOS}
│ 👥 ${tag(proposerId)}: ${getBrotherIds(proposer, db, conn).length}/${MAX_HERMANOS}
│
│ 📅 Desde: ${fechaBonita(Date.now())}
│ 💪 Nivel de ${tag(userId)}: ${user.nivel}
│ 🏅 ${rango(user.nivel)}
╰━━━━━━━━━━━━━━━━━━━━⬣`,
        m,
        { mentions: [userId, proposerId] }
      )
    }

    // ========================================================
    // ❌ RECHAZAR PROPUESTA
    // ========================================================

    if (command === 'rechazarhermano') {
      if (!user.propuestas.length) {
        return m.reply('📭 No tienes propuestas de hermandad pendientes.')
      }

      let proposal = targetRaw
        ? findProposal(user, targetRaw, conn)
        : null

      if (!proposal && user.propuestas.length === 1) {
        proposal = user.propuestas[0]
      }

      if (!proposal) {
        return conn.reply(
          m.chat,
          '📨 Tienes varias propuestas. Responde al mensaje de la persona cuya propuesta quieres rechazar.',
          m,
          { mentions: user.propuestas.map(p => p.de) }
        )
      }

      const proposerId = findUserId(db, proposal.de, conn)

      removeProposal(user, proposerId, conn)

      if (!saveDB(db)) {
        return m.reply('❌ No pude guardar los cambios.')
      }

      return conn.reply(
        m.chat,
        `💬 ${tag(userId)} rechazó la propuesta de hermandad de ${tag(proposerId)}.\n\n🧬 La hermandad no fue creada.`,
        m,
        { mentions: [userId, proposerId] }
      )
    }

    // ========================================================
    // 💔 ROMPER HERMANDAD
    // ========================================================

    if (command === 'romperhermandad') {
      const brothers = getBrotherIds(user, db, conn)

      if (!brothers.length) {
        return m.reply('😹 No tienes hermanos actualmente.')
      }

      let broId = null

      if (targetRaw) {
        broId = brothers.find(
          id => sameUser(id, targetRaw, conn)
        )

        if (!broId) {
          return m.reply('❌ Esa persona no es uno de tus hermanos.')
        }
      } else if (brothers.length === 1) {
        broId = brothers[0]
      } else {
        return conn.reply(
          m.chat,
          `💔 *ELIGE A TU HERMANO*\n\n${hermanosTexto(user, db, conn)}\n\n👉 Responde al mensaje del hermano con quien quieres terminar la hermandad.`,
          m,
          { mentions: brothers }
        )
      }

      removeBrother(db, userId, broId, conn)
      removeBrother(db, broId, userId, conn)

      if (!saveDB(db)) {
        return m.reply('❌ No pude guardar los cambios.')
      }

      return conn.reply(
        m.chat,
        `💔 *HERMANDAD TERMINADA*\n\n${tag(userId)} terminó su hermandad con ${tag(broId)}.\n\n🧬 La relación fue eliminada.\n📊 Las demás hermandades se mantienen intactas.`,
        m,
        { mentions: [userId, broId] }
      )
    }

    // ========================================================
    // 🤜 INTERACCIONES ENTRE HERMANOS
    // ========================================================

    const acciones = [
      'abrazohermano',
      'proteger',
      'chocarhermano',
      'entrenarhermano'
    ]

    if (acciones.includes(command)) {
      const brothers = getBrotherIds(user, db, conn)

      if (!brothers.length) {
        return m.reply(
          '😹 No tienes hermanos.\n\nUsa *.hermano @usuario* para proponer una hermandad.'
        )
      }

      let broId = null

      if (targetRaw) {
        broId = brothers.find(
          id => sameUser(id, targetRaw, conn)
        )

        if (!broId) {
          return m.reply('❌ Esa persona no es uno de tus hermanos.')
        }
      } else if (brothers.length === 1) {
        broId = brothers[0]
      } else {
        return conn.reply(
          m.chat,
          `🤝 *ELIGE A TU HERMANO*\n\n${hermanosTexto(user, db, conn)}\n\n👉 Responde al mensaje del hermano con quien quieres interactuar.`,
          m,
          { mentions: brothers }
        )
      }

      const bro = getUser(db, broId, conn)

      const restante = tiempoRestante(user)

      if (restante > 0) {
        return m.reply(
          `⏳ Espera *${restante} segundos* para volver a interactuar.`
        )
      }

      let puntos = 0
      let accionTexto = ''

      switch (command) {
        case 'abrazohermano':
          puntos = 5
          accionTexto = '🤗 abrazó a'
          break

        case 'proteger':
          puntos = 10
          accionTexto = '🛡️ protegió a'
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

      user.cooldown = Date.now()
      user.nivel += puntos
      user.interacciones += 1

      // El hermano recibe la mitad de los puntos.
      bro.nivel += Math.floor(puntos / 2)
      bro.interacciones += 1

      if (!saveDB(db)) {
        return m.reply('❌ No pude guardar la interacción.')
      }

      return conn.reply(
        m.chat,
        `╭━━━〔 🤝 HERMANOS 〕━━━⬣
│
│ ${tag(userId)} ${accionTexto} ${tag(broId)}.
│
│ 💪 +${puntos} puntos para ti.
│ 💙 +${Math.floor(puntos / 2)} puntos para tu hermano.
│
│ 📊 Tu nivel: ${user.nivel}
│ 🏅 ${rango(user.nivel)}
│ 🎮 Interacciones: ${user.interacciones}
╰━━━━━━━━━━━━━━━━━━━━⬣`,
        m,
        { mentions: [userId, broId] }
      )
    }

    // ========================================================
    // 🏆 TOP HERMANOS — OWNERS
    // ========================================================

    if (command === 'tophermanos') {
      if (!isOwner(sender, conn)) {
        return m.reply('👑 Este comando es exclusivo de los Owners.')
      }

      const ranking = []
      const procesados = new Set()

      for (const id of Object.keys(db)) {
        const data = getUser(db, id, conn)
        const brothers = getBrotherIds(data, db, conn)

        for (const broId of brothers) {
          const ids = [id, broId].sort()
          const key = ids.join('|')

          if (procesados.has(key)) continue
          procesados.add(key)

          const bro = getUser(db, broId, conn)

          ranking.push({
            id,
            broId,
            nivel1: Number(data.nivel) || 0,
            nivel2: Number(bro.nivel) || 0,
            nivelTotal:
              (Number(data.nivel) || 0) +
              (Number(bro.nivel) || 0),
            interacciones:
              (Number(data.interacciones) || 0) +
              (Number(bro.interacciones) || 0)
          })
        }
      }

      ranking.sort((a, b) => b.nivelTotal - a.nivelTotal)

      const top = ranking.slice(0, 10)
      const medallas = ['🥇', '🥈', '🥉']

      if (!top.length) {
        return m.reply('😹 Todavía no hay hermandades para el ranking.')
      }

      let texto = '╭━━━〔 🏆 TOP HERMANOS 〕━━━⬣\n│\n'
      const mentions = []

      top.forEach((p, i) => {
        texto +=
          `│ ${medallas[i] || '🏅'} *PUESTO ${i + 1}*\n` +
          `│ ${tag(p.id)} 🤝 ${tag(p.broId)}\n` +
          `│ 💪 Nivel conjunto: ${p.nivelTotal}\n` +
          `│ 🎮 Interacciones: ${p.interacciones}\n│\n`

        mentions.push(p.id, p.broId)
      })

      texto += '╰━━━━━━━━━━━━━━━━━━━━⬣'

      return conn.reply(
        m.chat,
        texto,
        m,
        { mentions: [...new Set(mentions)] }
      )
    }

    // ========================================================
    // 📜 LISTA DE HERMANDADES — OWNERS
    // ========================================================

    if (command === 'listahermanos') {
      if (!isOwner(sender, conn)) {
        return m.reply('👑 Este comando es exclusivo de los Owners.')
      }

      let texto = '╭━━━〔 🧬 HERMANDADES ACTIVAS 〕━━━⬣\n│\n'
      const procesados = new Set()
      const mentions = []
      let total = 0

      for (const id of Object.keys(db)) {
        const data = getUser(db, id, conn)
        const brothers = getBrotherIds(data, db, conn)

        for (const broId of brothers) {
          const key = [id, broId].sort().join('|')

          if (procesados.has(key)) continue
          procesados.add(key)

          const bro = getUser(db, broId, conn)
          total++

          texto +=
            `│ 🤝 ${tag(id)} 🧬 ${tag(broId)}\n` +
            `│ 💪 Niveles: ${data.nivel} / ${bro.nivel}\n` +
            `│ 🎮 Interacciones: ${data.interacciones + bro.interacciones}\n│\n`

          mentions.push(id, broId)
        }
      }

      texto += `│ 📊 Total de hermandades: ${total}\n╰━━━━━━━━━━━━━━━━━━━━⬣`

      return conn.reply(
        m.chat,
        texto,
        m,
        { mentions: [...new Set(mentions)] }
      )
    }

    // ========================================================
    // 🧹 REINICIAR BASE — OWNER
    // Uso: .clearbro confirmar
    // ========================================================

    if (command === 'clearbro') {
      if (!isOwner(sender, conn)) {
        return m.reply('👑 Este comando es exclusivo de los Owners.')
      }

      if (String(text || '').trim().toLowerCase() !== 'confirmar') {
        return m.reply(
          '⚠️ *REINICIO DE HERMANDADES*\n\n' +
          'Esta acción eliminará todas las hermandades, propuestas, niveles e interacciones.\n\n' +
          'Para confirmar, escribe:\n' +
          '*.clearbro confirmar*'
        )
      }

      for (const id of Object.keys(db)) {
        db[id] = defaultUser()
      }

      if (!saveDB(db)) {
        return m.reply('❌ No pude guardar el reinicio.')
      }

      return m.reply(
        `🧹 *BASE DE HERMANDADES REINICIADA*\n\n` +
        `✅ Hermandades eliminadas.\n` +
        `✅ Propuestas eliminadas.\n` +
        `✅ Niveles e interacciones reiniciados.\n\n` +
        `👥 Límite: ${MAX_HERMANOS} hermanos por usuario.`
      )
    }

    // ========================================================
    // 🧬 MIS HERMANOS
    // ========================================================

    if (command === 'mishermanos') {
      const brothers = getBrotherIds(user, db, conn)

      if (!brothers.length) {
        return m.reply(
          '😹 Todavía no tienes hermanos.\n\n' +
          'Usa *.hermano @usuario* para enviar una propuesta.'
        )
      }

      let texto =
        `╭━━━〔 🧬 MIS HERMANOS 〕━━━⬣\n` +
        `│ 👤 ${tag(userId)}\n` +
        `│ 👥 ${brothers.length}/${MAX_HERMANOS}\n│\n`

      brothers.forEach((id, i) => {
        texto += `│ ${i + 1}. ${tag(id)}\n`
      })

      texto +=
        `│\n` +
        `│ 💪 Nivel: ${user.nivel}\n` +
        `│ 🏅 Rango: ${rango(user.nivel)}\n` +
        `│ 🎮 Interacciones: ${user.interacciones}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━⬣`

      return conn.reply(
        m.chat,
        texto,
        m,
        { mentions: [userId, ...brothers] }
      )
    }

    // ========================================================
    // 📨 MIS PROPUESTAS
    // ========================================================

    if (command === 'propuestashermano') {
      if (!user.propuestas.length) {
        return m.reply('📭 No tienes propuestas pendientes.')
      }

      let texto = '╭━━━〔 📨 PROPUESTAS 〕━━━⬣\n│\n'

      user.propuestas.forEach((p, i) => {
        texto +=
          `│ ${i + 1}. ${tag(p.de)}\n` +
          `│ 📅 Recibida: ${fechaBonita(p.fecha)}\n│\n`
      })

      texto +=
        `│ ⏳ Las propuestas duran 3 días.\n` +
        `╰━━━━━━━━━━━━━━━━━━━━⬣`

      return conn.reply(
        m.chat,
        texto,
        m,
        { mentions: user.propuestas.map(p => p.de) }
      )
    }

  } catch (error) {
    console.error('[whatsapp-bot] Error en hermanos.js:', error)

    return m.reply(
      '❌ Ocurrió un error interno en el sistema de hermandad. Inténtalo nuevamente.'
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

  'verhermano',
  'relacionhermano',
  'mishermanos',
  'propuestashermano',

  'abrazohermano',
  'proteger',
  'chocarhermano',
  'entrenarhermano',

  'tophermanos',
  'listahermanos',
  'clearbro'
]

// ============================================================
// 🏷️ AYUDA
// ============================================================

handler.help = [
  'hermano @usuario',
  'aceptarhermano',
  'rechazarhermano',
  'romperhermandad',
  'verhermano',
  'relacionhermano',
  'mishermanos',
  'propuestashermano',
  'abrazohermano',
  'proteger',
  'chocarhermano',
  'entrenarhermano',
  'tophermanos',
  'listahermanos',
  'clearbro confirmar'
]

handler.tags = ['fun', 'juegos', 'owner']
handler.group = true

export default handler
