// 📂 plugins/personajes.js — FelixCat_Bot
// 🎌 SISTEMA DE PERSONAJES — GOD MODE
// 🔐 Activación exclusiva para OWNERS
// 🔘 Un solo comando de activación: .juegopj
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// 📂 BASE DE DATOS
// ============================================================

const dir = './database'
const file = path.join(dir, 'personajes.json')

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

if (!fs.existsSync(file)) {
  fs.writeFileSync(
    file,
    JSON.stringify({}, null, 2)
  )
}

function loadDB() {
  try {
    return JSON.parse(
      fs.readFileSync(file, 'utf8')
    )
  } catch {
    return {}
  }
}

function saveDB(data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  )
}

// ============================================================
// 🎌 PERSONAJES NORMALES
// ============================================================

let normales = [
  'Naruto',
  'Sasuke',
  'Goku',
  'Vegeta',
  'Luffy',
  'Zoro',
  'Levi',
  'Eren',
  'Gojo',
  'Itachi',
  'Tanjiro',
  'Zenitsu',
  'Inosuke',
  'Mikasa'
]

// ============================================================
// 🌟 PERSONAJES RAROS
// ============================================================

let raros = [
  'Madara (Raro)',
  'Sukuna (Raro)',
  'Goku Ultra Instinto (Raro)',
  'Gojo Ilimitado (Raro)',
  'Levi Ackerman Elite (Raro)'
]

// ============================================================
// 💥 ESTADÍSTICAS
// ============================================================

const statsBase = {

  Naruto: {
    atk: 80,
    def: 70,
    hp: 100
  },

  Sasuke: {
    atk: 85,
    def: 65,
    hp: 95
  },

  Goku: {
    atk: 95,
    def: 80,
    hp: 120
  },

  Vegeta: {
    atk: 90,
    def: 75,
    hp: 110
  },

  Luffy: {
    atk: 85,
    def: 80,
    hp: 110
  },

  Zoro: {
    atk: 88,
    def: 78,
    hp: 105
  },

  Levi: {
    atk: 82,
    def: 60,
    hp: 90
  },

  Eren: {
    atk: 87,
    def: 70,
    hp: 100
  },

  Gojo: {
    atk: 100,
    def: 100,
    hp: 120
  },

  Itachi: {
    atk: 92,
    def: 75,
    hp: 95
  },

  Tanjiro: {
    atk: 85,
    def: 70,
    hp: 100
  },

  Zenitsu: {
    atk: 90,
    def: 60,
    hp: 90
  },

  Inosuke: {
    atk: 88,
    def: 65,
    hp: 95
  },

  Mikasa: {
    atk: 87,
    def: 75,
    hp: 100
  },

  // 🌟 RAROS

  'Madara (Raro)': {
    atk: 110,
    def: 100,
    hp: 130
  },

  'Sukuna (Raro)': {
    atk: 115,
    def: 95,
    hp: 130
  },

  'Goku Ultra Instinto (Raro)': {
    atk: 130,
    def: 110,
    hp: 140
  },

  'Gojo Ilimitado (Raro)': {
    atk: 125,
    def: 120,
    hp: 140
  },

  'Levi Ackerman Elite (Raro)': {
    atk: 105,
    def: 90,
    hp: 110
  }
}

// ============================================================
// 🎲 PROBABILIDADES
// ============================================================

const chanceRaro = () =>
  Math.random() < 0.10

const chanceRaroOwner = () =>
  Math.random() < 0.35

// ============================================================
// 👑 DETECTAR OWNER
// ============================================================

function isUserOwner(jid) {

  const owners =
    global.owner || []

  const numeroUsuario =
    String(jid || '')
      .split('@')[0]
      .replace(/[^0-9]/g, '')

  return owners.some(owner => {

    if (Array.isArray(owner)) {
      owner = owner[0]
    }

    const numeroOwner =
      String(owner || '')
        .split('@')[0]
        .replace(/[^0-9]/g, '')

    return (
      numeroOwner &&
      numeroOwner === numeroUsuario
    )
  })
}

// ============================================================
// 🎮 ESTADO DEL JUEGO
// ============================================================

function getGameState() {

  if (
    !global.db ||
    !global.db.data
  ) {
    return false
  }

  if (
    !global.db.data.personajes
  ) {
    global.db.data.personajes = {}
  }

  if (
    typeof global.db.data.personajes.enabled !== 'boolean'
  ) {
    global.db.data.personajes.enabled = false
  }

  return global.db.data.personajes.enabled
}

function setGameState(value) {

  if (!global.db.data.personajes) {
    global.db.data.personajes = {}
  }

  global.db.data.personajes.enabled =
    Boolean(value)
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (
  m,
  {
    conn,
    command,
    text
  }
) => {

  const cmd =
    String(command || '')
      .toLowerCase()

  const jid =
    m.sender

  const owner =
    isUserOwner(jid)

  // ==========================================================
  // 🔐 ACTIVAR / DESACTIVAR JUEGO
  // SOLO OWNER
  // ==========================================================

  if (cmd === 'juegopj') {

    if (!owner) {

      return m.reply(
`🚫 *ACCESO DENEGADO*

👑 Solo los propietarios del bot
pueden controlar el juego de personajes.`
      )
    }

    const actual =
      getGameState()

    const nuevoEstado =
      !actual

    setGameState(
      nuevoEstado
    )

    return m.reply(
`╭━━━〔 🎌 JUEGO DE PERSONAJES 〕━━━╮

${nuevoEstado
  ? '🟢 *JUEGO ACTIVADO*'
  : '🔴 *JUEGO DESACTIVADO*'}

${nuevoEstado
  ? '🎲 Los usuarios ya pueden reclamar personajes.'
  : '🔒 Los comandos del juego quedan bloqueados.'}

━━━━━━━━━━━━━━━━━━━━

👑 Control exclusivo del Owner

💡 Usa *.juegopj* nuevamente
para cambiar el estado.

╰━━━━━━━━━━━━━━━━━━━━╯`
    )
  }

  // ==========================================================
  // 🔒 VERIFICAR SI EL JUEGO ESTÁ ACTIVO
  // ==========================================================

  if (!getGameState()) {

    return m.reply(
`🔒 *JUEGO DESACTIVADO*

🎌 El sistema de personajes
no está disponible actualmente.

👑 Solo un Owner puede activarlo
usando:

*.juegopj*`
    )
  }

  // ==========================================================
  // 📜 LISTA DE PERSONAJES
  // ==========================================================

  if (cmd === 'personajes') {

    const db =
      loadDB()

    let texto =
`╭━━━〔 🌌 MULTIVERSO ANIME 〕━━━⬣
┃
┃ 🎌 *PERSONAJES DISPONIBLES*
┃
`

    normales.forEach(
      personaje => {

        const dueño =
          Object.keys(db)
            .find(
              user =>
                db[user] === personaje
            )

        const s =
          statsBase[personaje] || {}

        texto += dueño

          ? `┃ ❌ ${personaje} [⚔️${s.atk}|🛡️${s.def}|❤️${s.hp}]
┃    └─ 🔒 Sellado
┃
`

          : `┃ ✨ ${personaje} [⚔️${s.atk}|🛡️${s.def}|❤️${s.hp}]
┃    └─ 🟢 Disponible
┃
`
      }
    )

    texto +=
`┃
┃ 🌟 *PERSONAJES LEGENDARIOS*
┃
`

    raros.forEach(
      personaje => {

        const dueño =
          Object.keys(db)
            .find(
              user =>
                db[user] === personaje
            )

        const s =
          statsBase[personaje] || {}

        texto += dueño

          ? `┃ 🔒 ${personaje} [⚔️${s.atk}|🛡️${s.def}|❤️${s.hp}]
┃    └─ Encadenado
┃
`

          : `┃ 🌟 ${personaje} [⚔️${s.atk}|🛡️${s.def}|❤️${s.hp}]
┃    └─ Disponible
┃
`
      }
    )

    texto +=
`╰━━━━━━━━━━━━━━━━⬣`

    return m.reply(texto)
  }

  // ==========================================================
  // 🎲 CLAIM
  // ==========================================================

  if (cmd === 'claim') {

    const db =
      loadDB()

    if (db[jid]) {

      return m.reply(
`⚠️ *YA TIENES UN PERSONAJE*

🐉 Tu vínculo actual:

✨ *${db[jid]}*

Usa *.cambiar* si quieres buscar otro.`
      )
    }

    const esRaro =
      owner
        ? chanceRaroOwner()
        : chanceRaro()

    const pool =
      esRaro
        ? raros
        : normales

    const disponibles =
      pool.filter(
        personaje =>
          !Object.values(db)
            .includes(personaje)
      )

    if (!disponibles.length) {

      return m.reply(
`💀 *MULTIVERSO AGOTADO*

No quedan personajes disponibles
en esta categoría.`
      )
    }

    const personaje =
      disponibles[
        Math.floor(
          Math.random() *
          disponibles.length
        )
      ]

    db[jid] =
      personaje

    saveDB(db)

    return m.reply(
`╭━━━〔 🎲 INVOCACIÓN DIMENSIONAL 〕━━━⬣
┃
┃ 🔮 Canalizando energía...
┃ ⚡ Rompiendo barreras...
┃
┃ 🐉 *${personaje}*
┃
${raros.includes(personaje)
  ? '┃ 🌟✨ ¡ENTIDAD LEGENDARIA DESPERTADA! ✨🌟'
  : '┃ ✨ Un nuevo vínculo ha sido creado.'}
┃
┃ 🤝 Ahora luchará a tu lado.
┃
╰━━━━━━━━━━━━━━━━⬣`
    )
  }

  // ==========================================================
  // 👤 MI PERSONAJE
  // ==========================================================

  if (cmd === 'mipersonaje') {

    const db =
      loadDB()

    if (!db[jid]) {

      return m.reply(
`❌ *SIN PERSONAJE*

Todavía no tienes un contrato espiritual.

🎲 Usa:

*.claim*`
      )
    }

    const personaje =
      db[jid]

    const s =
      statsBase[personaje] || {}

    return m.reply(
`╭━━━〔 🐉 TU PERSONAJE 〕━━━⬣

✨ *${personaje}*

⚔️ Poder ofensivo: *${s.atk}*
🛡️ Defensa: *${s.def}*
❤️ Vitalidad: *${s.hp}*

╰━━━━━━━━━━━━━━━━⬣`
    )
  }

  // ==========================================================
  // 💔 DROP
  // ==========================================================

  if (cmd === 'drop') {

    const db =
      loadDB()

    if (!db[jid]) {

      return m.reply(
        '❌ No tienes ningún personaje para liberar.'
      )
    }

    const viejo =
      db[jid]

    delete db[jid]

    saveDB(db)

    return m.reply(
`💔 *CONTRATO ROTO*

Has liberado a:

✨ *${viejo}*

🌌 Su vínculo contigo ha terminado.`
    )
  }

  // ==========================================================
  // 🔄 CAMBIAR
  // ==========================================================

  if (cmd === 'cambiar') {

    const db =
      loadDB()

    if (!db[jid]) {

      return m.reply(
`❌ No tienes personaje.

🎲 Primero usa *.claim*.`
      )
    }

    const viejo =
      db[jid]

    const esRaro =
      owner
        ? chanceRaroOwner()
        : chanceRaro()

    const pool =
      esRaro
        ? raros
        : normales

    const disponibles =
      pool.filter(
        personaje =>
          !Object.values(db)
            .includes(personaje) &&
          personaje !== viejo
      )

    if (!disponibles.length) {

      return m.reply(
        '💀 El destino no ofrece nuevas opciones.'
      )
    }

    const personaje =
      disponibles[
        Math.floor(
          Math.random() *
          disponibles.length
        )
      ]

    db[jid] =
      personaje

    saveDB(db)

    return m.reply(
`╭━━━〔 🔄 CAMBIO DE DESTINO 〕━━━⬣

⚔️ Anterior:
*${viejo}*

🌌 Nuevo vínculo:
✨ *${personaje}*

${raros.includes(personaje)
  ? '🌟 ¡HAS OBTENIDO UNA ENTIDAD LEGENDARIA!'
  : ''}

╰━━━━━━━━━━━━━━━━⬣`
    )
  }

  // ==========================================================
  // 👑 OWNER — AGREGAR PERSONAJE
  // ==========================================================

  if (cmd === 'addpj') {

    if (!owner) {

      return m.reply(
        '🚫 Solo los Owners pueden agregar personajes.'
      )
    }

    if (!text?.trim()) {

      return m.reply(
        '⚠️ Escribe el nombre del personaje.'
      )
    }

    const nombre =
      text.trim()

    if (
      normales.includes(nombre) ||
      raros.includes(nombre)
    ) {

      return m.reply(
        '⚠️ Ese personaje ya existe.'
      )
    }

    normales.push(
      nombre
    )

    return m.reply(
`👑 *PERSONAJE CREADO*

✨ *${nombre}*

El personaje fue agregado
al multiverso.`
    )
  }

  // ==========================================================
  // 👑 OWNER — ELIMINAR PERSONAJE
  // ==========================================================

  if (cmd === 'delpj') {

    if (!owner) {

      return m.reply(
        '🚫 Solo los Owners pueden eliminar personajes.'
      )
    }

    if (!text?.trim()) {

      return m.reply(
        '⚠️ Escribe el nombre del personaje.'
      )
    }

    const nombre =
      text.trim()

    normales =
      normales.filter(
        p =>
          p.toLowerCase() !==
          nombre.toLowerCase()
      )

    raros =
      raros.filter(
        p =>
          p.toLowerCase() !==
          nombre.toLowerCase()
      )

    return m.reply(
`💀 *PERSONAJE ELIMINADO*

✨ *${nombre}*

Su existencia fue eliminada
del multiverso.`
    )
  }

  // ==========================================================
  // 👑 OWNER — RESET DE USUARIO
  // ==========================================================

  if (cmd === 'resetpj') {

    if (!owner) {

      return m.reply(
        '🚫 Solo los Owners pueden usar este comando.'
      )
    }

    if (!m.mentionedJid?.[0]) {

      return m.reply(
        '⚠️ Menciona al usuario.'
      )
    }

    const target =
      m.mentionedJid[0]

    const db =
      loadDB()

    if (!db[target]) {

      return m.reply(
        '❌ Ese usuario no tiene personaje.'
      )
    }

    const personaje =
      db[target]

    delete db[target]

    saveDB(db)

    return conn.sendMessage(
      m.chat,
      {
        text:
`🧹 *VÍNCULO ELIMINADO*

👤 Usuario:
@${target.split('@')[0]}

🎌 Personaje liberado:
*${personaje}*`,
        mentions: [
          target
        ]
      },
      {
        quoted: m
      }
    )
  }

  // ==========================================================
  // 📊 LISTA DE JUGADORES
  // ==========================================================

  if (cmd === 'listpj') {

    const db =
      loadDB()

    if (
      !Object.keys(db).length
    ) {

      return m.reply(
        '❌ El multiverso todavía está vacío.'
      )
    }

    let texto =
`╭━━━〔 📊 REGISTRO DEL MULTIVERSO 〕━━━⬣

`

    for (
      const user in db
    ) {

      texto +=
`👤 @${user.split('@')[0]}
🎌 ${db[user]}

`
    }

    texto +=
`╰━━━━━━━━━━━━━━━━⬣`

    return conn.sendMessage(
      m.chat,
      {
        text: texto,
        mentions:
          Object.keys(db)
      },
      {
        quoted: m
      }
    )
  }

  // ==========================================================
  // 👑 OWNER — RESET TOTAL
  // ==========================================================

  if (cmd === 'resetchars') {

    if (!owner) {

      return m.reply(
        '🚫 Solo los Owners pueden reiniciar el multiverso.'
      )
    }

    saveDB({})

    return m.reply(
`🌌 *REINICIO TOTAL*

💥 Todos los contratos fueron eliminados.

✨ El multiverso ha sido reconstruido desde cero.`
    )
  }
}

// ============================================================
// 📋 COMANDOS
// ============================================================

handler.command = [

  // 🎌 Juego
  'personajes',
  'claim',
  'mipersonaje',
  'drop',
  'cambiar',

  // 👑 Owner
  'addpj',
  'delpj',
  'resetpj',
  'listpj',
  'resetchars',

  // 🔐 Control exclusivo Owner
  'juegopj'

]

// ============================================================
// 🏷️ CATEGORÍA
// ============================================================

handler.help = [

  'juegopj',
  'personajes',
  'claim',
  'mipersonaje',
  'drop',
  'cambiar',
  'addpj',
  'delpj',
  'resetpj',
  'listpj',
  'resetchars'

]

handler.tags = [
  'juego',
  'fun',
  'owner'
]

// ============================================================
// 📌 EXPORT
// ============================================================

export default handler
