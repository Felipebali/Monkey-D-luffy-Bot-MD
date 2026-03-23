import fs from 'fs'
import path from 'path'

const file = path.join('./database', 'personajes.json')

const loadDB = () => JSON.parse(fs.readFileSync(file))

// 💥 STATS BASE (podés expandir esto)
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

  // 🌟 RAROS (ROTOS)
  "Madara (Raro)": { atk: 110, def: 100, hp: 130 },
  "Sukuna (Raro)": { atk: 115, def: 95, hp: 130 },
  "Goku Ultra Instinto (Raro)": { atk: 130, def: 110, hp: 140 },
  "Gojo Ilimitado (Raro)": { atk: 125, def: 120, hp: 140 },
  "Levi Ackerman Elite (Raro)": { atk: 105, def: 90, hp: 110 }
}

// ⚔️ ATAQUE
function atacar(p1, p2) {
  let daño = Math.max(5, p1.atk - Math.floor(p2.def / 2))
  return daño
}

let handler = async (m, { conn }) => {

  const db = loadDB()

  if (!m.mentionedJid[0])
    return m.reply("⚔️ *Menciona a tu rival para iniciar el combate*")

  const user = m.sender
  const target = m.mentionedJid[0]

  if (!db[user])
    return m.reply("❌ No tienes personaje para luchar.")

  if (!db[target])
    return m.reply("❌ El rival no tiene personaje.")

  const p1 = db[user]
  const p2 = db[target]

  const s1 = statsBase[p1] || { atk: 80, def: 70, hp: 100 }
  const s2 = statsBase[p2] || { atk: 80, def: 70, hp: 100 }

  let hp1 = s1.hp
  let hp2 = s2.hp

  let log = `╭━━━〔 ⚔️ BATALLA ANIME 〕━━━⬣\n`
  log += `👤 @${user.split('@')[0]} → ${p1}\n`
  log += `🆚\n`
  log += `👤 @${target.split('@')[0]} → ${p2}\n`
  log += `━━━━━━━━━━━━━━\n`

  // 🔁 3 TURNOS
  for (let i = 1; i <= 3; i++) {

    let daño1 = atacar(s1, s2)
    let daño2 = atacar(s2, s1)

    hp2 -= daño1
    hp1 -= daño2

    log += `\n🔥 TURNO ${i}\n`
    log += `⚔️ ${p1} ataca → -${daño1} HP\n`
    log += `⚔️ ${p2} contraataca → -${daño2} HP\n`
  }

  log += `\n━━━━━━━━━━━━━━\n`

  // 🏆 RESULTADO
  let resultado = ""

  if (hp1 > hp2) {
    resultado = `🏆 *GANADOR:* ${p1}\n✨ "La victoria es suya..."`

  } else if (hp2 > hp1) {
    resultado = `🏆 *GANADOR:* ${p2}\n🔥 "Dominó el combate..."`

  } else {
    resultado = `🤝 *EMPATE*\n⚡ "Ambos colapsaron..."`

  }

  log += resultado + `\n╰━━━━━━━━━━━━━━━━⬣`

  return conn.sendMessage(m.chat, {
    text: log,
    mentions: [user, target]
  })
}

handler.command = ['batalla', 'fight', 'vs']
handler.group = true

export default handler
