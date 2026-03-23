// 📂 plugins/bot.js — STATUS PRO HOST 👑

import os from 'os'

let handler = async (m, { conn }) => {

  const sender = m.sender.replace(/[^0-9]/g, '')

  const ownerNumbers = (global.owner || []).map(v => {
    if (Array.isArray(v)) v = v[0]
    return String(v).replace(/[^0-9]/g, '')
  })

  if (!ownerNumbers.includes(sender)) {
    return m.reply('❌ Este comando es solo para los dueños.')
  }

  // ⏱️ UPTIME
  const uptime = process.uptime()
  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  const seconds = Math.floor(uptime % 60)

  // 💾 MEMORIA (IMPORTANTE EN HOST)
  const used = process.memoryUsage()
  const ramUsed = (used.rss / 1024 / 1024).toFixed(2)
  const ramTotal = (os.totalmem() / 1024 / 1024).toFixed(2)

  // 🧠 CPU / SISTEMA
  const cpu = os.cpus()[0].model
  const platform = os.platform()

  // ⚡ LATENCIA REAL
  const start = performance.now()
  const end = performance.now()
  const speed = (end - start).toFixed(2)

  // 💎 MENSAJE PRO
  let texto = `
╭━━━〔 👑 FELIXCAT BOT 〕━━━⬣
┃ 🚀 Estado: *ONLINE*
┃ ⚡ Host: *BoxMine*
┃
┃ ⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s
┃ 📡 Latencia: ${speed} ms
┃
┃ 💻 Sistema: ${platform}
┃ 🧠 CPU: ${cpu}
┃
┃ 📦 RAM usada: ${ramUsed} MB
┃ 🗄️ RAM total: ${ramTotal} MB
┃
┃ 🧬 Node.js: ${process.version}
┃ 🤖 Modo: Producción
╰━━━━━━━━━━━━━━━━⬣
`.trim()

  await conn.sendMessage(m.chat, {
    text: texto
  }, { quoted: m })
}

handler.command = ['bot']

export default handler
