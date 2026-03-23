// 📂 plugins/personajes.js — Sistema PRO Anime 🐉👑

import fs from 'fs'
import path from 'path'

const dir = './database'
const file = path.join(dir, 'personajes.json')

if (!fs.existsSync(dir)) fs.mkdirSync(dir)
if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({}, null, 2))

const loadDB = () => JSON.parse(fs.readFileSync(file))
const saveDB = (data) => fs.writeFileSync(file, JSON.stringify(data, null, 2))

// 🎌 NORMALES
const normales = [
  "Naruto","Sasuke","Goku","Vegeta","Luffy","Zoro",
  "Levi","Eren","Gojo","Itachi","Tanjiro","Zenitsu","Inosuke","Mikasa"
]

// 🌟 RAROS
const raros = [
  "Madara (Raro)",
  "Sukuna (Raro)",
  "Goku Ultra Instinto (Raro)",
  "Gojo Ilimitado (Raro)",
  "Levi Ackerman Elite (Raro)"
]

// 🎲 PROBABILIDAD DE RARO (10%)
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

    let texto = "🎌 PERSONAJES\n\n"

    texto += "🟢 NORMALES:\n"
    normales.forEach(p => {
      let dueño = Object.keys(db).find(u => db[u] === p)
      texto += dueño ? `❌ ${p}\n` : `✅ ${p}\n`
    })

    texto += "\n🌟 RAROS:\n"
    raros.forEach(p => {
      let dueño = Object.keys(db).find(u => db[u] === p)
      texto += dueño ? `🔒 ${p}\n` : `✨ ${p}\n`
    })

    return m.reply(texto)
  }

  // ======================
  // 🎲 CLAIM RANDOM
  // ======================

  if (command === 'claim') {

    if (db[jid])
      return m.reply(`⚠️ Ya tienes a *${db[jid]}*`)

    let pool = chanceRaro() ? raros : normales

    // filtrar libres
    let disponibles = pool.filter(p => !Object.values(db).includes(p))

    if (!disponibles.length)
      return m.reply("❌ No hay personajes disponibles.")

    let personaje = disponibles[Math.floor(Math.random() * disponibles.length)]

    db[jid] = personaje
    saveDB(db)

    return m.reply(
      `🎉 Has obtenido: *${personaje}*\n${raros.includes(personaje) ? "🌟 ¡PERSONAJE RARO!" : ""}`
    )
  }

  // ======================
  // 👤 MI PERSONAJE
  // ======================

  if (command === 'mipersonaje') {

    if (!db[jid])
      return m.reply("❌ No tienes personaje.")

    return m.reply(`🐉 Tu personaje: *${db[jid]}*`)
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

    return m.reply(`💔 Perdiste a *${viejo}*`)
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

    return m.reply(`🔄 Cambiaste *${viejo}* por *${personaje}*`)
  }

  // ======================
  // 👑 OWNER: DAR PERSONAJE
  // ======================

  if (command === 'give') {

    if (!isOwner)
      return m.reply('❌ Solo owners.')

    if (!m.mentionedJid[0])
      return m.reply('⚠️ Menciona usuario.')

    let target = m.mentionedJid[0]
    let personaje = text.replace(/@\d+/g,'').trim()

    if (!personaje)
      return m.reply("⚠️ Escribe personaje.")

    if (Object.values(db).includes(personaje))
      return m.reply("❌ Ya está ocupado.")

    db[target] = personaje
    saveDB(db)

    return conn.sendMessage(m.chat, {
      text: `👑 Personaje asignado\n*${personaje}* → @${target.split('@')[0]}`,
      mentions: [target]
    })
  }

  // ======================
  // 👑 OWNER: QUITAR
  // ======================

  if (command === 'removechar') {

    if (!isOwner)
      return m.reply('❌ Solo owners.')

    if (!m.mentionedJid[0])
      return m.reply('⚠️ Menciona usuario.')

    let target = m.mentionedJid[0]

    if (!db[target])
      return m.reply('❌ No tiene personaje.')

    delete db[target]
    saveDB(db)

    return conn.sendMessage(m.chat, {
      text: `❌ Personaje removido a @${target.split('@')[0]}`,
      mentions: [target]
    })
  }

  // ======================
  // 👑 OWNER: RESET TODO
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
  'give',
  'removechar',
  'resetchars'
]

export default handler
