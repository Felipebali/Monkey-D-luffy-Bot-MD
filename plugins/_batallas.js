import fs from 'fs'
import path from 'path'

const file = path.join('./database', 'personajes.json')
const loadDB = () => JSON.parse(fs.readFileSync(file))

// 💥 STATS
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

  "Madara (Raro)": { atk: 110, def: 100, hp: 130 },
  "Sukuna (Raro)": { atk: 115, def: 95, hp: 130 },
  "Goku Ultra Instinto (Raro)": { atk: 130, def: 110, hp: 140 },
  "Gojo Ilimitado (Raro)": { atk: 125, def: 120, hp: 140 },
  "Levi Ackerman Elite (Raro)": { atk: 105, def: 90, hp: 110 }
}

// ⚔️ ATAQUE
function atacar(p1, p2) {
  return Math.max(5, p1.atk - Math.floor(p2.def / 2))
}

let handler = async (m, { conn }) => {

  const db = loadDB()

  // 🔥 DETECTAR USUARIO (MENCIÓN O RESPUESTA)
  let target = m.mentionedJid?.[0] 
    || (m.quoted ? m.quoted.sender : null)

  if (!target)
    return m.reply("⚔️ *Menciona o responde a tu rival para iniciar el combate*")

  const user = m.sender

  if (!db[user])
    return m.reply("❌ *No tienes personaje invocado para luchar* 🐉")

  if (!db[target])
    return m.reply("❌ *Ese usuario no tiene personaje activo*")

  const p1 = db[user]
  const p2 = db[target]

  const s1 = statsBase[p1] || { atk: 80, def: 70, hp: 100 }
  const s2 = statsBase[p2] || { atk: 80, def: 70, hp: 100 }

  let hp1 = s1.hp
  let hp2 = s2.hp

  let log = `╭━━━〔 ⚔️ COMBATE DIMENSIONAL 〕━━━⬣
┃
┃ 👤 @${user.split('@')[0]} invoca a *${p1}*
┃ 🆚
┃ 👤 @${target.split('@')[0]} invoca a *${p2}*
┃
┃ ⚡ ¡El campo de batalla tiembla!
┃━━━━━━━━━━━━━━`

  // 🔁 TURNOS
  for (let i = 1; i <= 3; i++) {

    let daño1 = atacar(s1, s2)
    let daño2 = atacar(s2, s1)

    hp2 -= daño1
    hp1 -= daño2

    log += `

🔥 TURNO ${i}
⚔️ ${p1} ataca → -${daño1} HP
💥 ${p2} responde → -${daño2} HP`
  }

  log += `

┃━━━━━━━━━━━━━━`

  // 🏆 RESULTADO
  let resultado = ""

  if (hp1 > hp2) {
    resultado = `🏆 *VICTORIA:* ${p1}
✨ "Su poder ha superado todos los límites..."`

  } else if (hp2 > hp1) {
    resultado = `🏆 *VICTORIA:* ${p2}
🔥 "Una fuerza imparable ha dominado..."`

  } else {
    resultado = `🤝 *EMPATE*
⚡ "Dos titanes han caído juntos..."`
  }

  log += `

${resultado}
╰━━━━━━━━━━━━━━━━⬣`

  return conn.sendMessage(m.chat, {
    text: log,
    mentions: [user, target]
  })
}

handler.command = ['batalla', 'fight', 'vs']
handler.group = true

export default handler
