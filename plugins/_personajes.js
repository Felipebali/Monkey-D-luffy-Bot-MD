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

// 🎲 PROBABILIDAD GACHA
const chanceRaro = () => Math.random() < 0.10

// ======================
// HANDLER
// ======================

let handler = async (m, { conn, command }) => {

  const db = loadDB()
  const jid = m.sender

  const owners = (global.owner || []).map(v => {
    if (Array.isArray(v)) v = v[0]
    return String(v).replace(/[^0-9]/g, '') + '@s.whatsapp.net'
  })

  const isOwner = owners.includes(jid)

  // ======================
  // 📜 LISTA OTAKU
  // ======================

  if (command === 'personajes') {

    let texto = `
╭━━━〔 🌌 PORTAL DEL ANIME 〕━━━⬣
┃ "Solo los elegidos pueden invocar..."
┃
┃ 🟢 *CLASE NORMAL*
`

    normales.forEach(p => {
      let dueño = Object.keys(db).find(u => db[u] === p)
      texto += dueño 
      ? `┃ ❌ ${p} → Ya tiene dueño... 💀\n`
      : `┃ ✨ ${p} → Disponible para invocar\n`
    })

    texto += `┃
┃ 🌟 *CLASE LEGENDARIA*
┃ "Solo el destino decide si te toca..."
`

    raros.forEach(p => {
      let dueño = Object.keys(db).find(u => db[u] === p)
      texto += dueño 
      ? `┃ 🔒 ${p} → Sellado por otro usuario\n`
      : `┃ 🌟 ${p} → Energía detectable...\n`
    })

    texto += `╰━━━━━━━━━━━━━━━━⬣`

    return m.reply(texto)
  }

  // ======================
  // 🎲 CLAIM GACHA
  // ======================

  if (command === 'claim') {

    if (db[jid])
      return m.reply(`⚠️ Ya tienes un contrato activo con *${db[jid]}* 🐉`)

    let pool = chanceRaro() ? raros : normales
    let disponibles = pool.filter(p => !Object.values(db).includes(p))

    if (!disponibles.length)
      return m.reply("💀 El sistema gacha ha colapsado... no quedan personajes.")

    let personaje = disponibles[Math.floor(Math.random() * disponibles.length)]

    db[jid] = personaje
    saveDB(db)

    return m.reply(
`╭━━━〔 🎲 INVOCACIÓN GACHA 〕━━━⬣
┃
┃ 🔮 Canalizando chakra...
┃ ⚡ Abriendo portal dimensional...
┃
┃ 🐉 *${personaje}* ha respondido a tu llamado
┃
${raros.includes(personaje) ? "┃ 🌟✨ ¡HAS DESPERTADO UNA ENTIDAD LEGENDARIA! ✨🌟\n┃" : ""}
┃ "A partir de ahora... luchará a tu lado"
╰━━━━━━━━━━━━━━━━⬣`
    )
  }

  // ======================
  // 👤 MI PERSONAJE
  // ======================

  if (command === 'mipersonaje') {

    if (!db[jid])
      return m.reply("❌ No tienes ningún contrato espiritual activo.")

    return m.reply(
`╭━━━〔 🐉 VÍNCULO ACTIVO 〕━━━⬣
┃
┃ Tu espíritu aliado es:
┃ ✨ *${db[jid]}*
┃
┃ "El lazo entre ustedes es irrompible..."
╰━━━━━━━━━━━━━━━━⬣`
    )
  }

  // ======================
  // 💔 DROP
  // ======================

  if (command === 'drop') {

    if (!db[jid])
      return m.reply("❌ No tienes personaje que liberar.")

    let viejo = db[jid]
    delete db[jid]
    saveDB(db)

    return m.reply(
`💔 Has roto el contrato con *${viejo}*
🌌 Su alma regresa al plano anime...

"Algunos vínculos... no están destinados a durar"`
    )
  }

  // ======================
  // 🔄 CAMBIO AUTOMÁTICO
  // ======================

  if (command === 'cambiar') {

    if (!db[jid])
      return m.reply("❌ No tienes personaje.")

    let viejo = db[jid]

    let pool = chanceRaro() ? raros : normales
    let disponibles = pool.filter(p =>
      !Object.values(db).includes(p) && p !== viejo
    )

    if (!disponibles.length) {
      disponibles = [...normales, ...raros].filter(p =>
        !Object.values(db).includes(p) && p !== viejo
      )
    }

    if (!disponibles.length)
      return m.reply("💀 No hay entidades disponibles en el sistema.")

    let personaje = disponibles[Math.floor(Math.random() * disponibles.length)]

    db[jid] = personaje
    saveDB(db)

    return m.reply(
`╭━━━〔 🔄 REENCARNACIÓN 〕━━━⬣
┃
┃ ⚔️ *${viejo}* ha desaparecido...
┃ 🌌 Nuevo vínculo establecido:
┃ ✨ *${personaje}*
┃
${raros.includes(personaje) ? "┃ 🌟 ¡REENCARNACIÓN LEGENDARIA ACTIVADA! 🔥\n┃" : ""}
┃ "Tu destino acaba de cambiar..."
╰━━━━━━━━━━━━━━━━⬣`
    )
  }

  // ======================
  // 👑 OWNER
  // ======================

  if (command === 'addpj') {
    if (!isOwner) return m.reply('❌ Solo los dioses pueden crear vida 👑')

    normales.push(text.trim())
    return m.reply(`👑 Has creado un nuevo ser:\n✨ *${text}*`)
  }

  if (command === 'delpj') {
    if (!isOwner) return m.reply('❌ Solo los dioses pueden borrar existencia 👑')

    normales = normales.filter(p => p.toLowerCase() !== text.toLowerCase())
    raros = raros.filter(p => p.toLowerCase() !== text.toLowerCase())

    return m.reply(`💀 Has borrado a *${text}* del universo`)
  }

  if (command === 'resetpj') {
    if (!isOwner) return m.reply('❌ Solo los dioses 👑')

    let target = m.mentionedJid[0]
    delete db[target]
    saveDB(db)

    return m.reply(`🧹 Has borrado el vínculo de ese usuario.`)
  }

  if (command === 'listpj') {

    if (!Object.keys(db).length)
      return m.reply("❌ Nadie ha invocado personajes.")

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
    return m.reply("🌌 REINICIO TOTAL: El universo ha sido reiniciado.")
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
