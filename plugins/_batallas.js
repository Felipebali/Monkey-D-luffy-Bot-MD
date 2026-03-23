import fs from 'fs'
import path from 'path'

const file = path.join('./database', 'personajes.json')
const loadDB = () => JSON.parse(fs.readFileSync(file))

// 💥 STATS COMPLETOS
const statsBase = {

  // 🟢 NORMALES
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
  "Tanjiro": { atk: 84, def: 70, hp: 100 },
  "Zenitsu": { atk: 90, def: 60, hp: 95 },
  "Inosuke": { atk: 88, def: 65, hp: 105 },
  "Mikasa": { atk: 86, def: 72, hp: 100 },

  // 🌟 RAROS (OP)
  "Madara (Raro)": { atk: 110, def: 100, hp: 130 },
  "Sukuna (Raro)": { atk: 115, def: 95, hp: 130 },
  "Goku Ultra Instinto (Raro)": { atk: 130, def: 110, hp: 140 },
  "Gojo Ilimitado (Raro)": { atk: 125, def: 120, hp: 140 },
  "Levi Ackerman Elite (Raro)": { atk: 105, def: 90, hp: 110 }
}

// ⚔️ SISTEMA DE ATAQUE REALISTA
function atacar(p1, p2) {

  // ⚡ variación aleatoria
  let variacion = 0.85 + Math.random() * 0.3

  // 🧠 cálculo balanceado
  let dañoBase = (p1.atk * variacion) - (p2.def * 0.6)

  let daño = Math.max(8, Math.floor(dañoBase))

  // 💥 crítico
  let crit = false
  if (Math.random() < 0.15) {
    daño = Math.floor(daño * 1.8)
    crit = true
  }

  // 🌀 esquiva
  let dodge = false
  if (Math.random() < 0.10) {
    daño = 0
    dodge = true
  }

  return { daño, crit, dodge }
}

let handler = async (m, { conn }) => {

  const db = loadDB()

  // 🔥 detectar rival (mención o respuesta)
  let target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null)

  if (!target)
    return m.reply("⚔️ *Menciona o responde a tu rival para luchar*")

  const user = m.sender

  if (!db[user])
    return m.reply("❌ *No tienes personaje invocado* 🐉")

  if (!db[target])
    return m.reply("❌ *Ese usuario no tiene personaje*")

  const p1 = db[user]
  const p2 = db[target]

  const s1 = statsBase[p1] || { atk: 80, def: 70, hp: 100 }
  const s2 = statsBase[p2] || { atk: 80, def: 70, hp: 100 }

  let hp1 = s1.hp
  let hp2 = s2.hp

  // 🌟 BONUS RAROS
  if (p1.includes("(Raro)")) hp1 += 20
  if (p2.includes("(Raro)")) hp2 += 20

  let log = `╭━━━〔 ⚔️ BATALLA LEGENDARIA 〕━━━⬣
┃ 👤 @${user.split('@')[0]} → *${p1}*
┃ 🆚
┃ 👤 @${target.split('@')[0]} → *${p2}*
┃━━━━━━━━━━━━━━`

  // 🔁 TURNOS
  for (let i = 1; i <= 3; i++) {

    let atk1 = atacar(s1, s2)
    let atk2 = atacar(s2, s1)

    hp2 -= atk1.daño
    hp1 -= atk2.daño

    log += `

🔥 TURNO ${i}

⚔️ ${p1} → ${
      atk1.dodge 
        ? "🌀 ESQUIVADO" 
        : `-${atk1.daño} HP ${atk1.crit ? "💥 CRÍTICO!" : ""}`
    }

⚔️ ${p2} → ${
      atk2.dodge 
        ? "🌀 ESQUIVADO" 
        : `-${atk2.daño} HP ${atk2.crit ? "💥 CRÍTICO!" : ""}`
    }`
  }

  log += `

┃━━━━━━━━━━━━━━`

  // 🏆 RESULTADO
  let resultado = ""

  if (hp1 > hp2) {
    resultado = `🏆 *GANADOR:* ${p1}
✨ "Su poder supera los límites del anime..."`

  } else if (hp2 > hp1) {
    resultado = `🏆 *GANADOR:* ${p2}
🔥 "Una fuerza devastadora domina el campo..."`

  } else {
    resultado = `🤝 *EMPATE*
⚡ "Ambos guerreros cayeron como leyendas..."`
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
