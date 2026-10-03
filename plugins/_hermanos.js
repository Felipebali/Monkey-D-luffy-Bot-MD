// ============================================================
// 🤝 HERMANOS.JS — WHATSAPP-BOT 2026 PRO
// Sistema de hermandad — MÁXIMO 3 HERMANOS
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const MAX_HERMANOS = 3
const TRES_DIAS = 3 * 24 * 60 * 60 * 1000
const COOLDOWN = 60 * 1000
const DB_DIR = './database'
const DB_FILE = path.join(DB_DIR, 'hermanos.json')

// ============================================================
// 📁 CREAR BASE DE DATOS
// ============================================================

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, '{}')
}

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

function loadDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8')
    const data = JSON.parse(raw || '{}')

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {}
    }

    return data

  } catch (e) {

    console.error('❌ Error leyendo hermanos.json:', e)

    return {}
  }
}

function saveDB(db) {
  try {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(db, null, 2)
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

      if (Array.isArray(v)) {
        v = v[0]
      }

      if (
        typeof v !== 'string' &&
        typeof v !== 'number'
      ) {
        return null
      }

      const number =
        String(v).replace(/[^0-9]/g, '')

      if (!number) {
        return null
      }

      return `${number}@s.whatsapp.net`

    })
    .filter(Boolean)
}

// ============================================================
// 🔧 NORMALIZAR JID
// ============================================================

function normalizeJid(jid, conn) {

  if (!jid) {
    return null
  }

  try {

    if (typeof conn?.decodeJid === 'function') {
      jid = conn.decodeJid(jid)
    }

  } catch {}

  jid = String(jid)

  if (
    jid.includes('@g.us') ||
    jid.includes('@broadcast')
  ) {
    return jid
  }

  if (jid.includes('@')) {
    return jid
  }

  const digits =
    jid.replace(/[^0-9]/g, '')

  if (!digits) {
    return null
  }

  return `${digits}@s.whatsapp.net`
}

// ============================================================
// 🔢 NÚMERO LIMPIO
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

  if (!a || !b) {
    return false
  }

  const A = normalizeJid(a, conn)
  const B = normalizeJid(b, conn)

  if (!A || !B) {
    return false
  }

  if (A === B) {
    return true
  }

  const da = digits(A)
  const db = digits(B)

  return Boolean(
    da &&
    db &&
    da === db
  )
}

// ============================================================
// 🔎 BUSCAR ID REAL EN DB
// ============================================================

function findUserId(db, jid, conn) {

  if (!jid) {
    return null
  }

  const normalized =
    normalizeJid(jid, conn)

  if (!normalized) {
    return null
  }

  if (
    Object.prototype.hasOwnProperty.call(
      db,
      normalized
    )
  ) {
    return normalized
  }

  for (const id of Object.keys(db)) {

    if (
      sameUser(
        id,
        normalized,
        conn
      )
    ) {
      return id
    }
  }

  return normalized
}

// ============================================================
// 👤 ESTRUCTURA NUEVA DE USUARIO
// ============================================================

function defaultUser() {

  return {

    // 🧬 Hasta 3 hermanos
    hermanos: [],

    // 📨 Propuestas recibidas
    propuestas: [],

    // 📊 Estadísticas
    nivel: 0,
    interacciones: 0,

    // ⏳ Cooldown
    cooldown: 0,

    // 📅 Fecha de primera hermandad
    hermandadFecha: null
  }
}

// ============================================================
// 🔄 MIGRACIÓN DE DATOS ANTIGUOS
// ============================================================

function migrateUser(user) {

  if (
    !user ||
    typeof user !== 'object' ||
    Array.isArray(user)
  ) {
    return defaultUser()
  }

  // ==========================================================
  // 🧬 MIGRAR "hermano" ANTIGUO → "hermanos"
  // ==========================================================

  if (
    !Array.isArray(user.hermanos)
  ) {

    let hermanos = []

    if (
      user.hermano &&
      (
        typeof user.hermano === 'string' ||
        typeof user.hermano === 'number'
      )
    ) {
      hermanos.push(
        String(user.hermano)
      )
    }

    user.hermanos = hermanos
  }

  // ==========================================================
  // 📨 MIGRAR propuesta ANTIGUA
  // ==========================================================

  if (
    !Array.isArray(user.propuestas)
  ) {

    user.propuestas = []

    if (user.propuesta) {

      user.propuestas.push({

        de:
          String(user.propuesta),

        fecha:
          Number(
            user.propuestaFecha ||
            Date.now()
          )
      })
    }
  }

  // ==========================================================
  // 🧹 LIMPIAR HERMANOS
  // ==========================================================

  user.hermanos =
    user.hermanos
      .filter(Boolean)
      .map(v => String(v))

  user.hermanos =
    [...new Set(user.hermanos)]
      .slice(0, MAX_HERMANOS)

  // ==========================================================
  // 🧹 LIMPIAR PROPUESTAS
  // ==========================================================

  user.propuestas =
    user.propuestas
      .filter(Boolean)
      .map(p => {

        if (
          typeof p === 'string'
        ) {

          return {
            de: p,
            fecha: Date.now()
          }
        }

        return {
          de:
            p.de
              ? String(p.de)
              : null,

          fecha:
            Number(
              p.fecha ||
              Date.now()
            )
        }
      })
      .filter(p => p.de)

  // ==========================================================
  // 📊 CAMPOS
  // ==========================================================

  if (
    typeof user.nivel !== 'number'
  ) {
    user.nivel =
      Number(user.nivel || 0)
  }

  if (
    typeof user.interacciones !== 'number'
  ) {
    user.interacciones =
      Number(user.interacciones || 0)
  }

  if (
    typeof user.cooldown !== 'number'
  ) {
    user.cooldown =
      Number(user.cooldown || 0)
  }

  if (
    !user.hermandadFecha
  ) {
    user.hermandadFecha = null
  }

  // ==========================================================
  // 🧹 ELIMINAR CAMPOS VIEJOS
  // ==========================================================

  delete user.hermano
  delete user.propuesta
  delete user.propuestaFecha

  return user
}

// ============================================================
// 👤 OBTENER USUARIO
// ============================================================

function getUser(db, jid, conn) {

  const id =
    findUserId(
      db,
      jid,
      conn
    )

  if (!id) {
    return null
  }

  if (!db[id]) {
    db[id] = defaultUser()
  }

  db[id] =
    migrateUser(db[id])

  return db[id]
}

// ============================================================
// 🧬 OBTENER HERMANOS REALES
// ============================================================

function getBrotherIds(user, db, conn) {

  if (
    !user ||
    !Array.isArray(user.hermanos)
  ) {
    return []
  }

  const result = []

  for (const jid of user.hermanos) {

    const id =
      findUserId(
        db,
        jid,
        conn
      )

    if (!id) {
      continue
    }

    if (
      !result.some(
        x => sameUser(x, id, conn)
      )
    ) {
      result.push(id)
    }
  }

  return result.slice(0, MAX_HERMANOS)
}

// ============================================================
// ➕ AGREGAR HERMANO
// ============================================================

function addBrother(
  db,
  userId,
  brotherId,
  conn
) {

  const user =
    getUser(
      db,
      userId,
      conn
    )

  if (!user) {
    return false
  }

  if (
    getBrotherIds(
      user,
      db,
      conn
    ).length >= MAX_HERMANOS
  ) {
    return false
  }

  if (
    getBrotherIds(
      user,
      db,
      conn
    ).some(
      id =>
        sameUser(
          id,
          brotherId,
          conn
        )
    )
  ) {
    return true
  }

  user.hermanos.push(
    normalizeJid(
      brotherId,
      conn
    )
  )

  if (!user.hermandadFecha) {
    user.hermandadFecha =
      Date.now()
  }

  return true
}

// ============================================================
// ➖ QUITAR HERMANO
// ============================================================

function removeBrother(
  db,
  userId,
  brotherId,
  conn
) {

  const user =
    getUser(
      db,
      userId,
      conn
    )

  if (!user) {
    return false
  }

  user.hermanos =
    user.hermanos.filter(
      id =>
        !sameUser(
          id,
          brotherId,
          conn
        )
    )

  if (
    user.hermanos.length === 0
  ) {
    user.hermandadFecha = null
  }

  return true
}

// ============================================================
// 🔎 BUSCAR PROPUESTA
// ============================================================

function findProposal(
  user,
  sender,
  conn
) {

  if (
    !Array.isArray(user?.propuestas)
  ) {
    return null
  }

  return user.propuestas.find(
    p =>
      sameUser(
        p.de,
        sender,
        conn
      )
  )
}

// ============================================================
// 🗑️ ELIMINAR PROPUESTA
// ============================================================

function removeProposal(
  user,
  sender,
  conn
) {

  user.propuestas =
    user.propuestas.filter(
      p =>
        !sameUser(
          p.de,
          sender,
          conn
        )
    )
}

// ============================================================
// 🧹 LIMPIAR PROPUESTAS EXPIRADAS
// ============================================================

function cleanExpiredProposals(
  db,
  conn
) {

  const ahora =
    Date.now()

  for (
    const id of Object.keys(db)
  ) {

    const user =
      getUser(
        db,
        id,
        conn
      )

    if (!user) {
      continue
    }

    user.propuestas =
      user.propuestas.filter(
        p =>
          ahora - Number(p.fecha || 0)
          <= TRES_DIAS
      )
  }
}

// ============================================================
// 🎯 TARGET
// ============================================================

function getTarget(m, conn) {

  if (
    Array.isArray(m.mentionedJid) &&
    m.mentionedJid.length
  ) {

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
// 🏷️ MENCIÓN
// ============================================================

function tag(jid) {

  if (!jid) {
    return '@usuario'
  }

  return '@' +
    String(jid)
      .split('@')[0]
      .split(':')[0]
}

// ============================================================
// 📅 FECHA
// ============================================================

function fechaBonita(ms) {

  if (!ms) {
    return 'Desconocida'
  }

  const d =
    new Date(ms)

  if (
    Number.isNaN(
      d.getTime()
    )
  ) {
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
// ⏱️ DÍAS
// ============================================================

function diasDesde(ms) {

  if (!ms) {
    return 0
  }

  return Math.max(
    0,
    Math.floor(
      (
        Date.now() - ms
      ) / 86400000
    )
  )
}

// ============================================================
// 🏅 RANGO
// ============================================================

function rango(nivel) {

  nivel =
    Number(
      nivel || 0
    )

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

function checkCooldown(user) {

  const ahora =
    Date.now()

  if (
    user.cooldown &&
    ahora - user.cooldown <
    COOLDOWN
  ) {

    return Math.ceil(
      (
        COOLDOWN -
        (
          ahora -
          user.cooldown
        )
      ) / 1000
    )
  }

  user.cooldown =
    ahora

  return 0
}

// ============================================================
// 👑 ES OWNER
// ============================================================

function isOwner(
  sender,
  conn
) {

  return getOwnersJid()
    .some(
      owner =>
        sameUser(
          owner,
          sender,
          conn
        )
    )
}

// ============================================================
// 🤝 TEXTO DE HERMANOS
// ============================================================

function hermanosTexto(
  user,
  db,
  conn
) {

  const hermanos =
    getBrotherIds(
      user,
      db,
      conn
    )

  if (!hermanos.length) {
    return '😹 No tienes hermanos.'
  }

  return hermanos
    .map(
      (id, i) =>
        `${i + 1}. ${tag(id)}`
    )
    .join('\n')
}

// ============================================================
// 🤝 HANDLER PRINCIPAL
// ============================================================

let handler = async (
  m,
  { conn, command }
) => {

  try {

    const db =
      loadDB()

    // ========================================================
    // 🔄 MIGRAR TODA LA BASE
    // ========================================================

    for (
      const id of Object.keys(db)
    ) {

      db[id] =
        migrateUser(
          db[id]
        )
    }

    cleanExpiredProposals(
      db,
      conn
    )

    const sender =
      normalizeJid(
        m.sender,
        conn
      )

    if (!sender) {
      return
    }

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

    const ahora =
      Date.now()

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
          'Menciona a alguien o responde a su mensaje.\n\n' +
          `👥 Máximo: ${MAX_HERMANOS} hermanos.`
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

      const target =
        getUser(
          db,
          targetId,
          conn
        )

      const myBrothers =
        getBrotherIds(
          user,
          db,
          conn
        )

      const targetBrothers =
        getBrotherIds(
          target,
          db,
          conn
        )

      // ======================================================
      // 🚫 LÍMITE PROPIO
      // ======================================================

      if (
        myBrothers.length >=
        MAX_HERMANOS
      ) {

        return conn.reply(
          m.chat,

          `🚫 *LÍMITE DE HERMANOS*\n\n` +
          `Ya tienes ${MAX_HERMANOS} hermanos.\n` +
          `No puedes tener más.`,

          m
        )
      }

      // ======================================================
      // 🚫 LÍMITE TARGET
      // ======================================================

      if (
        targetBrothers.length >=
        MAX_HERMANOS
      ) {

        return conn.reply(
          m.chat,

          `😅 ${tag(targetId)} ya tiene ` +
          `${MAX_HERMANOS} hermanos.\n\n` +
          `No puede aceptar otra hermandad.`,

          m,
          {
            mentions: [
              targetId
            ]
          }
        )
      }

      // ======================================================
      // YA SON HERMANOS
      // ======================================================

      if (
        myBrothers.some(
          id =>
            sameUser(
              id,
              targetId,
              conn
            )
        )
      ) {

        return conn.reply(
          m.chat,

          `😎 ${tag(targetId)} ya es tu hermano.`,

          m,
          {
            mentions: [
              targetId
            ]
          }
        )
      }

      // ======================================================
      // PROPUESTA EXISTENTE
      // ======================================================

      if (
        findProposal(
          target,
          sender,
          conn
        )
      ) {

        return m.reply(
          '⏳ Ya tienes una propuesta pendiente con esa persona.'
        )
      }

      // ======================================================
      // CREAR PROPUESTA
      // ======================================================

      target.propuestas.push({

        de:
          sender,

        fecha:
          ahora
      })

      saveDB(db)

      return conn.reply(
        m.chat,

`🤝 *PROPUESTA DE HERMANDAD*

${tag(sender)} quiere ser hermano de ${tag(targetId)} 🧬

📨 ${tag(targetId)}, tienes una nueva propuesta.

👉 *.aceptarhermano*
👉 *.rechazarhermano*

👥 Cada usuario puede tener hasta ${MAX_HERMANOS} hermanos.

⏰ Esta propuesta dura 3 días.`,

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

      const brothers =
        getBrotherIds(
          target,
          db,
          conn
        )

      if (!brothers.length) {

        return conn.reply(
          m.chat,

          `😹 ${tag(targetId)} no tiene hermanos.`,

          m,
          {
            mentions: [
              targetId
            ]
          }
        )
      }

      const mentions = [
        targetId,
        ...brothers
      ]

      let texto =
`🧬 *HERMANDAD*

👤 ${tag(targetId)}

👥 *Hermanos (${brothers.length}/${MAX_HERMANOS})*
`

      brothers.forEach(
        (id, i) => {

          texto +=
`\n${i + 1}. ${tag(id)}`
        }
      )

      texto +=

`\n\n📅 Primera hermandad: ${fechaBonita(target.hermandadFecha)}

💪 Nivel: ${target.nivel}
🏅 Rango: ${rango(target.nivel)}
🎮 Interacciones: ${target.interacciones || 0}`

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
    // ✅ ACEPTAR HERMANO
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

      // ======================================================
      // 👤 ELEGIR PROPUESTA
      // ======================================================

      let proposal = null

      const targetRaw =
        getTarget(
          m,
          conn
        )

      if (targetRaw) {

        proposal =
          user.propuestas.find(
            p =>
              sameUser(
                p.de,
                targetRaw,
                conn
              )
          )
      }

      if (!proposal) {

        if (
          user.propuestas.length === 1
        ) {

          proposal =
            user.propuestas[0]

        } else {

          const mentions =
            user.propuestas
              .map(
                p => p.de
              )

          let texto =
`📨 *TIENES VARIAS PROPUESTAS*

`

          user.propuestas.forEach(
            (p, i) => {

              texto +=
`${i + 1}. ${tag(p.de)}
📅 ${fechaBonita(p.fecha)}

`
            }
          )

          texto +=
`\n👉 Responde al mensaje de la persona que quieres aceptar.`

          return conn.reply(
            m.chat,
            texto.trim(),
            m,
            {
              mentions
            }
          )
        }
      }

      // ======================================================
      // ⌛ EXPIRACIÓN
      // ======================================================

      if (
        ahora -
        Number(proposal.fecha || 0)
        > TRES_DIAS
      ) {

        removeProposal(
          user,
          proposal.de,
          conn
        )

        saveDB(db)

        return m.reply(
          '⌛ Esa propuesta de hermandad ya expiró.'
        )
      }

      const proposerId =
        findUserId(
          db,
          proposal.de,
          conn
        )

      const proposer =
        getUser(
          db,
          proposerId,
          conn
        )

      // ======================================================
      // 🚫 COMPROBAR LÍMITES
      // ======================================================

      if (
        getBrotherIds(
          user,
          db,
          conn
        ).length >= MAX_HERMANOS
      ) {

        return m.reply(
          `🚫 Ya tienes ${MAX_HERMANOS} hermanos.`
        )
      }

      if (
        getBrotherIds(
          proposer,
          db,
          conn
        ).length >= MAX_HERMANOS
      ) {

        removeProposal(
          user,
          proposerId,
          conn
        )

        saveDB(db)

        return m.reply(
          `😅 ${tag(proposerId)} ya alcanzó el máximo de ${MAX_HERMANOS} hermanos.` 
        )
      }

      // ======================================================
      // 🤝 CREAR HERMANDAD
      // ======================================================

      addBrother(
        db,
        userId,
        proposerId,
        conn
      )

      addBrother(
        db,
        proposerId,
        userId,
        conn
      )

      removeProposal(
        user,
        proposerId,
        conn
      )

      // También eliminar propuestas cruzadas
      removeProposal(
        proposer,
        userId,
        conn
      )

      if (!user.hermandadFecha) {
        user.hermandadFecha =
          ahora
      }

      if (!proposer.hermandadFecha) {
        proposer.hermandadFecha =
          ahora
      }

      saveDB(db)

      return conn.reply(
        m.chat,

`🧬 *¡HERMANDAD CONFIRMADA!*

${tag(userId)} 🤝 ${tag(proposerId)}

🎉 Ahora son hermanos oficiales.

👥 ${tag(userId)} tiene ${getBrotherIds(user, db, conn).length}/${MAX_HERMANOS} hermanos.
👥 ${tag(proposerId)} tiene ${getBrotherIds(proposer, db, conn).length}/${MAX_HERMANOS} hermanos.

📅 Desde: ${fechaBonita(ahora)}

💪 Nivel: ${user.nivel}
🏅 Rango: ${rango(user.nivel)}`,

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

      const targetRaw =
        getTarget(
          m,
          conn
        )

      let proposal = null

      if (targetRaw) {

        proposal =
          user.propuestas.find(
            p =>
              sameUser(
                p.de,
                targetRaw,
                conn
              )
          )
      }

      if (!proposal) {

        if (
          user.propuestas.length === 1
        ) {

          proposal =
            user.propuestas[0]

        } else {

          return m.reply(
            '📨 Tienes varias propuestas. Responde al mensaje de la persona cuya propuesta quieres rechazar.'
          )
        }
      }

      const proposerId =
        findUserId(
          db,
          proposal.de,
          conn
        )

      removeProposal(
        user,
        proposerId,
        conn
      )

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

    if (
      command === 'romperhermandad'
    ) {

      const brothers =
        getBrotherIds(
          user,
          db,
          conn
        )

      if (!brothers.length) {

        return m.reply(
          '😹 No tienes hermanos actualmente.'
        )
      }

      const targetRaw =
        getTarget(
          m,
          conn
        )

      let broId = null

      if (targetRaw) {

        broId =
          brothers.find(
            id =>
              sameUser(
                id,
                targetRaw,
                conn
              )
          )

        if (!broId) {

          return m.reply(
            '❌ La persona seleccionada no es tu hermano.'
          )
        }

      } else {

        if (
          brothers.length === 1
        ) {

          broId =
            brothers[0]

        } else {

          return conn.reply(
            m.chat,

`💔 *TIENES VARIOS HERMANOS*

${hermanosTexto(user, db, conn)}

👉 Responde al mensaje del hermano con quien quieres terminar la hermandad.`,

            m,
            {
              mentions: brothers
            }
          )
        }
      }

      const brother =
        getUser(
          db,
          broId,
          conn
        )

      removeBrother(
        db,
        userId,
        broId,
        conn
      )

      if (brother) {

        removeBrother(
          db,
          broId,
          userId,
          conn
        )
      }

      saveDB(db)

      return conn.reply(
        m.chat,

`💔 *HERMANDAD TERMINADA*

${tag(userId)} terminó su hermandad con ${tag(broId)}.

🧬 La relación fue eliminada.
📊 Las demás hermandades se mantienen intactas.`,

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

    if (
      acciones.includes(command)
    ) {

      const brothers =
        getBrotherIds(
          user,
          db,
          conn
        )

      if (!brothers.length) {

        return m.reply(
          '😹 No tienes hermanos.\n\n' +
          'Usa *.hermano @usuario* para proponer una hermandad.'
        )
      }

      // ======================================================
      // 🎯 ELEGIR HERMANO
      // ======================================================

      const targetRaw =
        getTarget(
          m,
          conn
        )

      let broId = null

      if (targetRaw) {

        broId =
          brothers.find(
            id =>
              sameUser(
                id,
                targetRaw,
                conn
              )
          )

        if (!broId) {

          return m.reply(
            '❌ Esa persona no es uno de tus hermanos.'
          )
        }

      } else {

        if (
          brothers.length === 1
        ) {

          broId =
            brothers[0]

        } else {

          return conn.reply(
            m.chat,

`🤝 *ELIGE A TU HERMANO*

${hermanosTexto(user, db, conn)}

👉 Responde al mensaje del hermano con quien quieres interactuar.`,

            m,
            {
              mentions: brothers
            }
          )
        }
      }

      const bro =
        getUser(
          db,
          broId,
          conn
        )

      // ======================================================
      // ⏳ COOLDOWN
      // ======================================================

      const restante =
        checkCooldown(user)

      if (restante) {

        return m.reply(
          `⏳ Espera *${restante} segundos* para volver a interactuar.`
        )
      }

      let puntos = 0
      let accionTexto = ''

      switch (command) {

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

      // ======================================================
      // 📊 SUBIR ESTADÍSTICAS
      // ======================================================

      user.nivel =
        Number(user.nivel || 0) +
        puntos

      user.interacciones =
        Number(user.interacciones || 0) +
        1

      // El hermano recibe una pequeña parte
      bro.nivel =
        Number(bro.nivel || 0) +
        Math.floor(
          puntos / 2
        )

      bro.interacciones =
        Number(bro.interacciones || 0) +
        1

      saveDB(db)

      return conn.reply(
        m.chat,

`🤝 *INTERACCIÓN DE HERMANOS*

${tag(userId)} ${accionTexto} ${tag(broId)}.

💪 +${puntos} puntos

📊 Nivel de ${tag(userId)}: ${user.nivel}
🏅 ${rango(user.nivel)}

👥 Hermanos: ${getBrotherIds(user, db, conn).length}/${MAX_HERMANOS}
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
    // 🏆 TOP HERMANOS
    // ========================================================

    if (
      command === 'tophermanos'
    ) {

      if (
        !isOwner(
          sender,
          conn
        )
      ) {

        return m.reply(
          '❌ Este comando es exclusivo del dueño.'
        )
      }

      const ranking = []

      const procesados =
        new Set()

      for (
        const id of Object.keys(db)
      ) {

        const data =
          getUser(
            db,
            id,
            conn
          )

        const brothers =
          getBrotherIds(
            data,
            db,
            conn
          )

        for (
          const broId of brothers
        ) {

          const key =
            [
              id,
              broId
            ]
              .sort()
              .join('|')

          if (
            procesados.has(key)
          ) {
            continue
          }

          procesados.add(key)

          ranking.push({

            id,

            broId,

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
      }

      ranking.sort(
        (a, b) =>
          b.nivel -
          a.nivel
      )

      const top =
        ranking.slice(0, 10)

      let texto =
        '🏆 *TOP HERMANOS*\n\n'

      const mentions = []

      if (!top.length) {

        texto +=
          '😹 No hay hermandades activas.'

      } else {

        const medallas = [
          '🥇',
          '🥈',
          '🥉'
        ]

        top.forEach(
          (item, i) => {

            const medal =
              medallas[i] ||
              '🏅'

            texto +=

`${medal} *${i + 1}° Lugar*

${tag(item.id)} 🤝 ${tag(item.broId)}

💪 Nivel: ${item.nivel}
🏅 ${rango(item.nivel)}
🎮 Interacciones: ${item.interacciones}

`

            mentions.push(
              item.id,
              item.broId
            )
          }
        )
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

    if (
      command === 'listahermanos'
    ) {

      if (
        !isOwner(
          sender,
          conn
        )
      ) {

        return m.reply(
          '❌ Este comando es exclusivo del dueño.'
        )
      }

      let texto =
        '🧬 *HERMANDADES ACTIVAS*\n\n'

      const mentions = []

      const procesados =
        new Set()

      let total = 0

      for (
        const id of Object.keys(db)
      ) {

        const data =
          getUser(
            db,
            id,
            conn
          )

        const brothers =
          getBrotherIds(
            data,
            db,
            conn
          )

        for (
          const broId of brothers
        ) {

          const key =
            [
              id,
              broId
            ]
              .sort()
              .join('|')

          if (
            procesados.has(key)
          ) {
            continue
          }

          procesados.add(key)

          total++

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
      }

      if (!total) {

        texto +=
          '😹 No hay hermanos activos.'

      } else {

        texto +=
          `\n📊 Total de hermandades: ${total}`
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
    // 🧹 LIMPIAR BASE
    // ========================================================

    if (
      command === 'clearbro'
    ) {

      if (
        !isOwner(
          sender,
          conn
        )
      ) {

        return m.reply(
          '❌ Este comando es exclusivo del dueño.'
        )
      }

      for (
        const id of Object.keys(db)
      ) {

        db[id] =
          defaultUser()
      }

      saveDB(db)

      return m.reply(

`🧹 *BASE DE HERMANDADES LIMPIADA*

✅ Todas las hermandades fueron eliminadas.
✅ Todas las propuestas fueron eliminadas.
✅ Todos los niveles fueron reiniciados.
✅ Todas las interacciones fueron reiniciadas.

👥 Límite actual: ${MAX_HERMANOS} hermanos por usuario.`

      )
    }

    // ========================================================
    // 📊 MIS HERMANOS
    // ========================================================

    if (
      command === 'mishermanos'
    ) {

      const brothers =
        getBrotherIds(
          user,
          db,
          conn
        )

      if (!brothers.length) {

        return m.reply(
          '😹 No tienes hermanos actualmente.'
        )
      }

      const mentions = [
        userId,
        ...brothers
      ]

      let texto =
`🧬 *MIS HERMANOS*

👤 ${tag(userId)}

👥 ${brothers.length}/${MAX_HERMANOS}

`

      brothers.forEach(
        (id, i) => {

          texto +=
`${i + 1}. ${tag(id)}\n`
        }
      )

      texto +=

`\n💪 Nivel: ${user.nivel}
🏅 Rango: ${rango(user.nivel)}
🎮 Interacciones: ${user.interacciones || 0}`

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
    // 📨 MIS PROPUESTAS
    // ========================================================

    if (
      command === 'propuestashermano'
    ) {

      if (
        !user.propuestas.length
      ) {

        return m.reply(
          '📭 No tienes propuestas pendientes.'
        )
      }

      const mentions =
        user.propuestas.map(
          p => p.de
        )

      let texto =
        '📨 *PROPUESTAS PENDIENTES*\n\n'

      user.propuestas.forEach(
        (p, i) => {

          texto +=

`${i + 1}. ${tag(p.de)}
📅 ${fechaBonita(p.fecha)}

`
        }
      )

      texto +=
        '\n⏰ Las propuestas duran 3 días.'

      return conn.reply(
        m.chat,
        texto.trim(),
        m,
        {
          mentions
        }
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

  // 🤝 Hermandad
  'hermano',
  'aceptarhermano',
  'rechazarhermano',
  'romperhermandad',

  // 👀 Consultas
  'verhermano',
  'relacionhermano',
  'mishermanos',
  'propuestashermano',

  // 🤜 Interacciones
  'abrazohermano',
  'proteger',
  'chocarhermano',
  'entrenarhermano',

  // 👑 Owner
  'tophermanos',
  'listahermanos',
  'clearbro'

]

// ============================================================
// 🏷️ CONFIGURACIÓN
// ============================================================

handler.help = [

  'hermano @usuario',
  'aceptarhermano',
  'rechazarhermano',
  'romperhermandad',
  'verhermano',
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

handler.tags = [
  'fun',
  'juegos',
  'owner'
]

handler.group = true

// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
