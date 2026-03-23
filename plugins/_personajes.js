// 📂 plugins/personajes.js — Sistema PRO Anime 🐉👑✨

import fs from 'fs'
import path from 'path'

const dir = './database'
const file = path.join(dir, 'personajes.json')

if (!fs.existsSync(dir)) fs.mkdirSync(dir)
if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({}, null, 2))

const loadDB = () => JSON.parse(fs.readFileSync(file))
const saveDB = (data) => fs.writeFileSync(file, JSON.stringify(data, null, 2))

// 🎌 NORMALES
let normales = [
  "Naruto","Sasuke","Goku","Vegeta","Luffy","Zoro",
  "Levi","Eren","Gojo","Itachi","Tanjiro","Zenitsu","Inosuke","Mikasa"
]

// 🌟 RAROS
let raros = [
  "Madara (Raro)",
  "Sukuna (Raro)",
  "Goku Ultra Instinto (Raro)",
  "Gojo Ilimitado (Raro)",
  "Levi Ackerman Elite (Raro)"
]

// 🎲 PROBABILIDAD DE RARO
const chanceRaro = () => Math.random() < 0.10

// ======================
// HANDLER
// ======================

let handler = async (m, { conn, text, command }) => {

  const db = loadDB()
  const jid = m.sender

  // 🔐 OWNERS
  const owners = (global.owner || []).map(v => {
    if (Array.isArray(v)) v = v[0]
    return String(v).replace(/[^0-9]/g, '') + '@s.whatsapp.net'
  })

  const isOwner = owners.includes(jid)

  // ======================
  // 📜 VER LISTA
  // ======================

  if (command === 'personajes') {

    let texto = `
╭━━━〔 🎌 *PERSONAJES DISPONIBLES* 〕━━━⬣

🟢 *NORMALES*
`

    normales.forEach(p => {
      let dueño = Object.keys(db).find(u => db[u] === p)
      texto += dueño ? `┃ ❌ ${p}\n` : `┃ ✅ ${p}\n`
    })

    texto += `
┃
🌟 *RAROS*
`

    raros.forEach(p => {
      let dueño = Object.keys(db).find(u => db[u] === p)
      texto += dueño ? `┃ 🔒 ${p}\n` : `┃ ✨ ${p}\n`
    })

    texto += `╰━━━━━━━━━━━━━━━━━━⬣`

    return m.reply(texto.trim())
  }

  // ======================
  // 🎲 CLAIM RANDOM
  // ======================

  if (command === 'claim') {

    if (db[jid])
      return m.reply(`⚠️ Ya posees a *${db[jid]}*`)

    let pool = chanceRaro() ? raros : normales
    let disponibles = pool.filter(p => !Object.values(db).includes(p))

    if (!disponibles.length)
      return m.reply("❌ No hay personajes disponibles.")

    let personaje = disponibles[Math.floor(Math.random() * disponibles.length)]

    db[jid] = personaje
    saveDB(db)

    return m.reply(`
╭━━━〔 🎉 *INVOCACIÓN EXITOSA* 〕━━━⬣
┃ 🐉 Has obtenido:
┃ ✨ *${personaje}*
┃
${raros.includes(personaje) ? "┃ 🌟 ¡UN PERSONAJE RARO HA APARECIDO!" : "┃ 🔥 Personaje normal obtenido"}
╰━━━━━━━━━━━━━━━━━━⬣
`.trim())
  }

  // ======================
  // 👤 MI PERSONAJE
  // ======================

  if (command === 'mipersonaje') {

    if (!db[jid])
      return m.reply("❌ No tienes personaje.")

    return m.reply(`
╭━━━〔 🐉 *TU PERSONAJE* 〕━━━⬣
┃ 👤 Usuario: @${jid.split('@')[0]}
┃ ⚔️ Personaje: *${db[jid]}*
╰━━━━━━━━━━━━━━━━━━⬣
`.trim(), null, { mentions: [jid] })
  }

  // ======================
  // 🗑️ DROP
  // ======================

  if (command === 'drop') {

    if (!db[jid])
      return m.reply("❌ No tienes personaje.")

    let viejo = db[jid]
    delete db[jid]
    saveDB(db)

    return m.reply(`
╭━━━〔 💔 *DESPEDIDA* 〕━━━⬣
┃ Has liberado a:
┃ ❌ *${viejo}*
┃
┃ 🔓 Ahora está disponible nuevamente
╰━━━━━━━━━━━━━━━━━━⬣
`.trim())
  }

  // ======================
  // 🔄 CAMBIAR
  // ======================

  if (command === 'cambiar') {

    if (!db[jid])
      return m.reply("❌ No tienes personaje.")

    if (!text)
      return m.reply("⚠️ Escribe el personaje.")

    let personaje = [...normales, ...raros].find(
      p => p.toLowerCase() === text.toLowerCase()
    )

    if (!personaje)
      return m.reply("❌ No existe.")

    if (Object.values(db).includes(personaje))
      return m.reply("❌ Está ocupado.")

    let viejo = db[jid]
    db[jid] = personaje
    saveDB(db)

    return m.reply(`
╭━━━〔 🔄 *CAMBIO REALIZADO* 〕━━━⬣
┃ ❌ Antes: *${viejo}*
┃ ✅ Ahora: *${personaje}*
╰━━━━━━━━━━━━━━━━━━⬣
`.trim())
  }

  // ======================
  // 👑 OWNER: AGREGAR PJ
  // ======================

  if (command === 'addpj') {

    if (!isOwner) return m.reply('❌ Solo owners.')
    if (!text) return m.reply('⚠️ Escribe el nombre.')

    normales.push(text.trim())

    return m.reply(`👑 Nuevo personaje agregado:\n✨ *${text}*`)
  }

  // ======================
  // 👑 OWNER: ELIMINAR PJ
  // ======================

  if (command === 'delpj') {

    if (!isOwner) return m.reply('❌ Solo owners.')
    if (!text) return m.reply('⚠️ Escribe el nombre.')

    normales = normales.filter(p => p.toLowerCase() !== text.toLowerCase())
    raros = raros.filter(p => p.toLowerCase() !== text.toLowerCase())

    return m.reply(`❌ Personaje eliminado:\n*${text}*`)
  }

  // ======================
  // 👑 OWNER: RESET USER
  // ======================

  if (command === 'resetpj') {

    if (!isOwner) return m.reply('❌ Solo owners.')
    if (!m.mentionedJid[0]) return m.reply('⚠️ Menciona usuario.')

    let target = m.mentionedJid[0]

    if (!db[target])
      return m.reply('❌ No tiene personaje.')

    delete db[target]
    saveDB(db)

    return conn.sendMessage(m.chat, {
      text: `🧹 Personaje eliminado a @${target.split('@')[0]}`,
      mentions: [target]
    })
  }

  // ======================
  // 👑 OWNER: LISTA GLOBAL
  // ======================

  if (command === 'listpj') {

    let texto = `
╭━━━〔 📊 *PERSONAJES EN USO* 〕━━━⬣
`

    for (let user in db) {
      texto += `┃ 👤 @${user.split('@')[0]} → ${db[user]}\n`
    }

    if (Object.keys(db).length === 0)
      return m.reply("❌ Nadie tiene personajes.")

    texto += `╰━━━━━━━━━━━━━━━━━━⬣`

    return conn.sendMessage(m.chat, {
      text: texto.trim(),
      mentions: Object.keys(db)
    })
  }

  // ======================
  // 👑 OWNER: RESET TOTAL
  // ======================

  if (command === 'resetchars') {

    if (!isOwner)
      return m.reply('❌ Solo owners.')

    saveDB({})
    return m.reply('🧹 Todos los personajes fueron liberados.')
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
