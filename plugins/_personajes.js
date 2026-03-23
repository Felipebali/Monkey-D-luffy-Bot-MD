// 📂 plugins/personajes.js — Sistema PRO Anime GOD MODE 🐉👑✨

import fs from 'fs'
import path from 'path'

const dir = './database'
const file = path.join(dir, 'personajes.json')

if (!fs.existsSync(dir)) fs.mkdirSync(dir)
if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({}, null, 2))

const loadDB = () => JSON.parse(fs.readFileSync(file))
const saveDB = (data) => fs.writeFileSync(file, JSON.stringify(data, null, 2))

// 🎌 PERSONAJES NORMALES
let normales = [
  "Naruto","Sasuke","Goku","Vegeta","Luffy","Zoro",
  "Levi","Eren","Gojo","Itachi","Tanjiro","Zenitsu","Inosuke","Mikasa"
]

// 🌟 PERSONAJES RAROS
let raros = [
  "Madara (Raro)",
  "Sukuna (Raro)",
  "Goku Ultra Instinto (Raro)",
  "Gojo Ilimitado (Raro)",
  "Levi Ackerman Elite (Raro)"
]

// 💥 STATS (para mostrar y usar en batalla)
const statsBase = {
  "Naruto": { atk: 80, def: 70, hp: 100 },
  "Sasuke": { atk: 85, def: 65, hp: 95 },
  "Goku": { atk: 95, def: 80, hp: 120 },
  "Vegeta": { atk: 90, def: 75, hp: 110 },
  "Luffy": { atk: 85, def: 80, hp: 110 },
  "Zoro": { atk: 88, def: 78, hp: 105 },
  "Levi": { atk: 82, def: 60, hp: 90 },
  "Eren": { atk: 87, def: 70, hp: 100 },
  "Gojo": { atk: 100, def: 100, hp: 120 },
  "Itachi": { atk: 92, def: 75, hp: 95 },
  "Tanjiro": { atk: 85, def: 70, hp: 100 },
  "Zenitsu": { atk: 90, def: 60, hp: 90 },
  "Inosuke": { atk: 88, def: 65, hp: 95 },
  "Mikasa": { atk: 87, def: 75, hp: 100 },

  // 🌟 RAROS
  "Madara (Raro)": { atk: 110, def: 100, hp: 130 },
  "Sukuna (Raro)": { atk: 115, def: 95, hp: 130 },
  "Goku Ultra Instinto (Raro)": { atk: 130, def: 110, hp: 140 },
  "Gojo Ilimitado (Raro)": { atk: 125, def: 120, hp: 140 },
  "Levi Ackerman Elite (Raro)": { atk: 105, def: 90, hp: 110 }
}

// 🎲 PROBABILIDADES
const chanceRaro = () => Math.random() < 0.10
const chanceRaroOwner = () => Math.random() < 0.35

let handler = async (m, { conn, command, text }) => {

  const db = loadDB()
  const jid = m.sender

  const owners = (global.owner || []).map(v => {
    if (Array.isArray(v)) v = v[0]
    return String(v).replace(/[^0-9]/g, '') + '@s.whatsapp.net'
  })

  const isOwner = owners.includes(jid)

  // ======================
  // 📜 LISTA OTAKU + STATS
  // ======================

  if (command === 'personajes') {

    let texto = `
╭━━━〔 🌌 PORTAL DEL ANIME 〕━━━⬣
┃ "El multiverso está en equilibrio..."
┃
┃ 🟢 *CLASE NORMAL*
`

    normales.forEach(p => {
      let dueño = Object.keys(db).find(u => db[u] === p)
      let s = statsBase[p] || {}

      texto += dueño
        ? `┃ ❌ ${p} [⚔️${s.atk}|🛡️${s.def}|❤️${s.hp}] → Ocupado\n`
        : `┃ ✨ ${p} [⚔️${s.atk}|🛡️${s.def}|❤️${s.hp}] → Libre\n`
    })

    texto += `
┃
┃ 🌟 *CLASE LEGENDARIA*
┃ "Solo los dignos pueden obtenerlos..."
`

    raros.forEach(p => {
      let dueño = Object.keys(db).find(u => db[u] === p)
      let s = statsBase[p] || {}

      texto += dueño
        ? `┃ 🔒 ${p} [⚔️${s.atk}|🛡️${s.def}|❤️${s.hp}]\n`
        : `┃ 🌟 ${p} [⚔️${s.atk}|🛡️${s.def}|❤️${s.hp}]\n`
    })

    texto += `╰━━━━━━━━━━━━━━━━⬣`

    return m.reply(texto)
  }

  // ======================
  // 🎲 CLAIM
  // ======================

  if (command === 'claim') {

    if (db[jid])
      return m.reply(`⚠️ Ya tienes un contrato con *${db[jid]}* 🐉`)

    let esRaro = isOwner ? chanceRaroOwner() : chanceRaro()
    let pool = esRaro ? raros : normales

    let disponibles = pool.filter(p => !Object.values(db).includes(p))

    if (!disponibles.length)
      return m.reply("💀 No quedan personajes...")

    let personaje = disponibles[Math.floor(Math.random() * disponibles.length)]

    db[jid] = personaje
    saveDB(db)

    return m.reply(
`╭━━━〔 🎲 INVOCACIÓN 〕━━━⬣
┃ 🐉 *${personaje}*
${raros.includes(personaje) ? "┃ 🌟✨ LEGENDARIO ✨🌟" : ""}
┃ "Tu destino ha sido elegido..."
╰━━━━━━━━━━━━━━━━⬣`)
  }

  // ======================
  // 👤 MI PERSONAJE
  // ======================

  if (command === 'mipersonaje') {

    if (!db[jid])
      return m.reply("❌ No tienes personaje.")

    let s = statsBase[db[jid]] || {}

    return m.reply(
`╭━━━〔 🐉 VÍNCULO ACTIVO 〕━━━⬣
┃ ✨ ${db[jid]}
┃ ⚔️ ATK: ${s.atk}
┃ 🛡️ DEF: ${s.def}
┃ ❤️ HP: ${s.hp}
╰━━━━━━━━━━━━━━━━⬣`)
  }

  // ======================
  // 💔 DROP
  // ======================

  if (command === 'drop') {

    if (!db[jid])
      return m.reply("❌ No tienes personaje.")

    let viejo = db[jid]
    delete db[jid]
    saveDB(db)

    return m.reply(`💔 Has liberado a *${viejo}*`)
  }

  // ======================
  // 🔄 CAMBIAR
  // ======================

  if (command === 'cambiar') {

    if (!db[jid])
      return m.reply("❌ No tienes personaje.")

    let viejo = db[jid]

    let esRaro = isOwner ? chanceRaroOwner() : chanceRaro()
    let pool = esRaro ? raros : normales

    let disponibles = pool.filter(p =>
      !Object.values(db).includes(p) && p !== viejo
    )

    if (!disponibles.length)
      return m.reply("💀 No hay personajes disponibles.")

    let personaje = disponibles[Math.floor(Math.random() * disponibles.length)]

    db[jid] = personaje
    saveDB(db)

    return m.reply(
`╭━━━〔 🔄 REENCARNACIÓN 〕━━━⬣
┃ ${viejo} ❌
┃ ✨ ${personaje}
${raros.includes(personaje) ? "┃ 🌟 LEGENDARIO 🌟" : ""}
╰━━━━━━━━━━━━━━━━⬣`)
  }

  // ======================
  // 👑 OWNER
  // ======================

  if (command === 'addpj') {
    if (!isOwner) return m.reply('❌ Solo dioses 👑')
    if (!text) return m.reply('⚠️ Escribe nombre')

    normales.push(text.trim())
    return m.reply(`👑 Creaste: *${text}*`)
  }

  if (command === 'delpj') {
    if (!isOwner) return m.reply('❌ Solo dioses 👑')
    if (!text) return m.reply('⚠️ Escribe nombre')

    normales = normales.filter(p => p.toLowerCase() !== text.toLowerCase())
    raros = raros.filter(p => p.toLowerCase() !== text.toLowerCase())

    return m.reply(`💀 Eliminado: *${text}*`)
  }

  if (command === 'resetpj') {
    if (!isOwner) return m.reply('❌ Solo dioses 👑')
    if (!m.mentionedJid[0]) return m.reply('⚠️ Menciona usuario')

    let target = m.mentionedJid[0]

    if (!db[target])
      return m.reply('❌ No tiene personaje.')

    delete db[target]
    saveDB(db)

    return conn.sendMessage(m.chat, {
      text: `🧹 Eliminado personaje de @${target.split('@')[0]}`,
      mentions: [target]
    })
  }

  if (command === 'listpj') {

    if (!Object.keys(db).length)
      return m.reply("❌ Nadie tiene personajes.")

    let texto = `╭━━━〔 📊 REGISTRO DEL MULTIVERSO 〕━━━⬣\n\n`

    for (let user in db) {
      texto += `👤 @${user.split('@')[0]} → ${db[user]}\n`
    }

    texto += `\n╰━━━━━━━━━━━━━━━━⬣`

    return conn.sendMessage(m.chat, {
      text: texto,
      mentions: Object.keys(db)
    })
  }

  if (command === 'resetchars') {
    if (!isOwner) return m.reply('❌ Solo dioses 👑')

    saveDB({})
    return m.reply("🌌 Universo reiniciado.")
  }

}

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
