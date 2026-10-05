// 📂 plugins/personajes.js
// 🎌 SISTEMA DE PERSONAJES — ANIME RPG
// 👑 ACTIVACIÓN EXCLUSIVA PARA OWNERS
// 🔘 SIN ON / OFF
// ============================================================

import fs from 'fs'
import path from 'path'

const dir = './database'
const file = path.join(dir, 'personajes.json')

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

if (!fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify({
    enabled: false,
    players: {}
  }, null, 2))
}

function loadDB() {

  try {

    const data =
      JSON.parse(
        fs.readFileSync(file, 'utf8')
      )

    // Compatibilidad con formato anterior
    if (
      !data.players &&
      typeof data === 'object'
    ) {

      const oldPlayers = {}

      for (const key of Object.keys(data)) {

        if (
          key !== 'enabled' &&
          typeof data[key] === 'string'
        ) {
          oldPlayers[key] = data[key]
        }
      }

      return {
        enabled: data.enabled || false,
        players: oldPlayers
      }
    }

    return {
      enabled:
        data.enabled === true,

      players:
        data.players || {}
    }

  } catch {

    return {
      enabled: false,
      players: {}
    }
  }
}

function saveDB(data) {

  fs.writeFileSync(
    file,
    JSON.stringify(
      data,
      null,
      2
    )
  )
}

// ============================================================
// 👑 OWNER
// ============================================================

function isOwner(m) {

  const owners =
    global.owner || []

  const sender =
    String(m.sender || '')
      .split('@')[0]
      .replace(/[^0-9]/g, '')

  return owners.some(owner => {

    if (Array.isArray(owner)) {
      owner = owner[0]
    }

    return (
      String(owner)
        .replace(/[^0-9]/g, '') === sender
    )
  })
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

  Naruto:
    { atk: 80, def: 70, hp: 100 },

  Sasuke:
    { atk: 85, def: 65, hp: 95 },

  Goku:
    { atk: 95, def: 80, hp: 120 },

  Vegeta:
    { atk: 90, def: 75, hp: 110 },

  Luffy:
    { atk: 85, def: 80, hp: 110 },

  Zoro:
    { atk: 88, def: 78, hp: 105 },

  Levi:
    { atk: 82, def: 60, hp: 90 },

  Eren:
    { atk: 87, def: 70, hp: 100 },

  Gojo:
    { atk: 100, def: 100, hp: 120 },

  Itachi:
    { atk: 92, def: 75, hp: 95 },

  Tanjiro:
    { atk: 85, def: 70, hp: 100 },

  Zenitsu:
    { atk: 90, def: 60, hp: 90 },

  Inosuke:
    { atk: 88, def: 65, hp: 95 },

  Mikasa:
    { atk: 87, def: 75, hp: 100 },

  'Madara (Raro)':
    { atk: 110, def: 100, hp: 130 },

  'Sukuna (Raro)':
    { atk: 115, def: 95, hp: 130 },

  'Goku Ultra Instinto (Raro)':
    { atk: 130, def: 110, hp: 140 },

  'Gojo Ilimitado (Raro)':
    { atk: 125, def: 120, hp: 140 },

  'Levi Ackerman Elite (Raro)':
    { atk: 105, def: 90, hp: 110 }

}

// ============================================================
// 🎲 PROBABILIDADES
// ============================================================

const chanceRaro =
  () => Math.random() < 0.10

const chanceRaroOwner =
  () => Math.random() < 0.35

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

  const db =
    loadDB()

  const owner =
    isOwner(m)

  // ==========================================================
  // 👑 ACTIVAR / DESACTIVAR SISTEMA
  // ==========================================================

  if (cmd === 'personajes') {

    if (!owner) {

      return m.reply(
        '🚫 Solo los owners pueden administrar el sistema de personajes.'
      )
    }

    db.enabled =
      !db.enabled

    saveDB(db)

    return m.reply(
`╭━━━〔 🎌 SISTEMA DE PERSONAJES 〕━━━╮

${db.enabled
  ? '🟢 *SISTEMA ACTIVADO*'
  : '🔴 *SISTEMA DESACTIVADO*'}

${db.enabled
  ? '🎴 Los usuarios ya pueden reclamar personajes.'
  : '🎴 El sistema de personajes quedó bloqueado para los usuarios.'}

👑 Solo los owners pueden cambiar este estado.

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
    )
  }

  // ==========================================================
  // 🛡️ COMANDOS DE USUARIOS
  // ==========================================================

  const comandosUsuarios = [

    'claim',
    'mipersonaje',
    'drop',
    'cambiar',
    'listpj'

  ]

  if (
    comandosUsuarios.includes(cmd) &&
    !db.enabled
  ) {

    return m.reply(
      '🔒 El sistema de personajes no está disponible actualmente.'
    )
  }

  // ==========================================================
  // 🎲 CLAIM
  // ==========================================================

  if (cmd === 'claim') {

    const jid =
      m.sender

    if (db.players[jid]) {

      return m.reply(
`⚠️ Ya tienes un personaje.

🎴 Personaje:
✨ *${db.players[jid]}*

Usa *.mipersonaje* para ver sus estadísticas.`
      )
    }

    const players =
      db.players

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
        p =>
          !Object.values(players)
            .includes(p)
      )

    if (!disponibles.length) {

      return m.reply(
        '💀 No quedan personajes disponibles de esta categoría.'
      )
    }

    const personaje =
      disponibles[
        Math.floor(
          Math.random() *
          disponibles.length
        )
      ]

    players[m.sender] =
      personaje

    saveDB(db)

    return m.reply(
`╭━━━〔 🎲 INVOCACIÓN DIMENSIONAL 〕━━━╮

🔮 Canalizando energía...
⚡ Rompiendo barreras...
🌌 Buscando un alma compatible...

🎴 *${personaje}*

${raros.includes(personaje)
  ? '🌟✨ ¡UNA ENTIDAD LEGENDARIA HA DESPERTADO! ✨🌟'
  : '✨ Un nuevo guerrero se ha unido a tu colección.'}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
    )
  }

  // ==========================================================
  // 👤 MI PERSONAJE
  // ==========================================================

  if (cmd === 'mipersonaje') {

    const personaje =
      db.players[m.sender]

    if (!personaje) {

      return m.reply(
        '❌ Todavía no tienes ningún personaje.'
      )
    }

    const s =
      statsBase[personaje] || {}

    return m.reply(
`╭━━━〔 🐉 TU PERSONAJE 〕━━━╮

🎴 *${personaje}*

⚔️ Ataque: *${s.atk || 0}*
🛡️ Defensa: *${s.def || 0}*
❤️ Vitalidad: *${s.hp || 0}*

${raros.includes(personaje)
  ? '🌟 Rareza: *LEGENDARIO*'
  : '✨ Rareza: *NORMAL*'}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
    )
  }

  // ==========================================================
  // 💔 DROP
  // ==========================================================

  if (cmd === 'drop') {

    const personaje =
      db.players[m.sender]

    if (!personaje) {

      return m.reply(
        '❌ No tienes ningún personaje que liberar.'
      )
    }

    delete db.players[m.sender]

    saveDB(db)

    return m.reply(
`💔 Has liberado a:

🎴 *${personaje}*

🌌 Su contrato espiritual ha terminado.
✨ El personaje vuelve a estar disponible.`
    )
  }

  // ==========================================================
  // 🔄 CAMBIAR
  // ==========================================================

  if (cmd === 'cambiar') {

    const viejo =
      db.players[m.sender]

    if (!viejo) {

      return m.reply(
        '❌ Primero debes tener un personaje.'
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
        p =>
          !Object.values(db.players)
            .includes(p) &&
          p !== viejo
      )

    if (!disponibles.length) {

      return m.reply(
        '💀 No hay otro personaje disponible en esta categoría.'
      )
    }

    const nuevo =
      disponibles[
        Math.floor(
          Math.random() *
          disponibles.length
        )
      ]

    db.players[m.sender] =
      nuevo

    saveDB(db)

    return m.reply(
`╭━━━〔 🔄 REENCARNACIÓN 〕━━━╮

💔 Anterior:
*${viejo}*

✨ Nuevo personaje:
*${nuevo}*

${raros.includes(nuevo)
  ? '🌟 ¡Has obtenido una entidad legendaria!'
  : '🎴 Un nuevo destino comienza.'}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
    )
  }

  // ==========================================================
  // 👑 ADD PERSONAJE
  // ==========================================================

  if (cmd === 'addpj') {

    if (!owner) {

      return m.reply(
        '🚫 Solo los owners pueden agregar personajes.'
      )
    }

    const nombre =
      String(text || '')
        .trim()

    if (!nombre) {

      return m.reply(
        '⚠️ Usa: *.addpj <nombre>*'
      )
    }

    if (
      normales.includes(nombre) ||
      raros.includes(nombre)
    ) {

      return m.reply(
        '⚠️ Ese personaje ya existe.'
      )
    }

    normales.push(nombre)

    return m.reply(
`👑 *PERSONAJE CREADO*

🎴 Nombre:
*${nombre}*

✨ El personaje ha sido agregado al multiverso.`
    )
  }

  // ==========================================================
  // ❌ DELETE PERSONAJE
  // ==========================================================

  if (cmd === 'delpj') {

    if (!owner) {

      return m.reply(
        '🚫 Solo los owners pueden eliminar personajes.'
      )
    }

    const nombre =
      String(text || '')
        .trim()

    if (!nombre) {

      return m.reply(
        '⚠️ Usa: *.delpj <nombre>*'
      )
    }

    const indexNormal =
      normales.findIndex(
        p =>
          p.toLowerCase() ===
          nombre.toLowerCase()
      )

    const indexRaro =
      raros.findIndex(
        p =>
          p.toLowerCase() ===
          nombre.toLowerCase()
      )

    if (
      indexNormal === -1 &&
      indexRaro === -1
    ) {

      return m.reply(
        '❌ Ese personaje no existe.'
      )
    }

    if (indexNormal !== -1) {

      normales.splice(
        indexNormal,
        1
      )
    }

    if (indexRaro !== -1) {

      raros.splice(
        indexRaro,
        1
      )
    }

    return m.reply(
`💀 *PERSONAJE ELIMINADO*

🎴 *${nombre}*

🌌 Su existencia ha sido borrada del multiverso.`
    )
  }

  // ==========================================================
  // 🔓 RESET USUARIO
  // ==========================================================

  if (cmd === 'resetpj') {

    if (!owner) {

      return m.reply(
        '🚫 Solo los owners pueden quitar personajes.'
      )
    }

    const target =
      m.mentionedJid?.[0]

    if (!target) {

      return m.reply(
        '⚠️ Menciona al usuario.\n\nEjemplo:\n*.resetpj @usuario*'
      )
    }

    if (!db.players[target]) {

      return m.reply(
        '❌ Ese usuario no tiene personaje.'
      )
    }

    const personaje =
      db.players[target]

    delete db.players[target]

    saveDB(db)

    return conn.sendMessage(
      m.chat,
      {
        text:
`🧹 *CONTRATO DESTRUIDO*

👤 Usuario:
@${target.split('@')[0]}

🎴 Personaje liberado:
*${personaje}*

✨ El personaje vuelve a estar disponible.`,
        mentions: [target]
      },
      {
        quoted: m
      }
    )
  }

  // ==========================================================
  // 📊 LISTA
  // ==========================================================

  if (cmd === 'listpj') {

    const users =
      Object.keys(
        db.players
      )

    if (!users.length) {

      return m.reply(
        '🌌 El multiverso todavía está vacío.'
      )
    }

    let texto =
`╭━━━〔 📊 REGISTRO DEL MULTIVERSO 〕━━━╮

`

    for (
      const user of users
    ) {

      texto +=
`👤 @${user.split('@')[0]}
🎴 ${db.players[user]}

`
    }

    texto +=
`╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    return conn.sendMessage(
      m.chat,
      {
        text: texto,
        mentions: users
      },
      {
        quoted: m
      }
    )
  }

  // ==========================================================
  // 🧹 RESET TOTAL
  // ==========================================================

  if (cmd === 'resetchars') {

    if (!owner) {

      return m.reply(
        '🚫 Solo los owners pueden reiniciar el sistema.'
      )
    }

    db.players =
      {}

    saveDB(db)

    return m.reply(
`🌌 *MULTIVERSO REINICIADO*

🧹 Todos los personajes fueron liberados.

✨ El registro de jugadores quedó vacío.`
    )
  }

}

handler.help = [

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
  'anime',
  'juego'
]

handler.command = [

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

export default handler
