// 📂 plugins/bot.js — STATUS BOT PRO 👑

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
  const uptime = process.uptime() * 1000
  const seconds = Math.floor(uptime / 1000) % 60
  const minutes = Math.floor(uptime / (1000 * 60)) % 60
  const hours = Math.floor(uptime / (1000 * 60 * 60))
  const tiempo = `${hours}h ${minutes}m ${seconds}s`

  // 💻 INFO DEL SISTEMA
  const platform = os.platform()
  const cpu = os.cpus()[0].model
  const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2)
  const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2)

  // 📊 LATENCIA
  const speed = (performance.now()).toFixed(2)

  // 💎 MENSAJE PRO
  let texto = `
╭━━━〔 👑 FELIXCAT BOT 〕━━━⬣
┃ 🚀 Estado: *ONLINE*
┃ ⚡ Rendimiento: *ÓPTIMO*
┃
┃ ⏱️ Uptime: ${tiempo}
┃ 📡 Latencia: ${speed} ms
┃
┃ 💻 Sistema: ${platform}
┃ 🧠 CPU: ${cpu}
┃
┃ 🗄️ RAM Total: ${totalMem} GB
┃ 📉 RAM Libre: ${freeMem} GB
┃
┃ 🤖 Versión: 1.0 PRO
╰━━━━━━━━━━━━━━━━⬣
`.trim()

  await conn.sendMessage(m.chat, {
    text: texto
  }, { quoted: m })
}

handler.command = ['bot']

export default handler
