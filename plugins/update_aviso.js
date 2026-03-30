// 📂 plugins/autoupdate-notify.js — FIXED 🚀🐾

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const SNAPSHOT = '.last_update_snapshot.json'
const NOTIFY_TO = '120363424917153708@g.us'

function scanPlugins() {
  const dir = path.join(process.cwd(), 'plugins')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.js'))
    .sort()
    .map(f => ({
      name: f,
      mtime: fs.statSync(path.join(dir, f)).mtimeMs
    }))
}

let handler = async () => {}

handler.all = async function (m, { conn }) {
  if (global._updateChecked) return
  global._updateChecked = true

  try {
    let before = []
    let firstRun = false

    if (fs.existsSync(SNAPSHOT)) {
      try {
        before = JSON.parse(fs.readFileSync(SNAPSHOT))
      } catch {}
    } else {
      firstRun = true
    }

    const now = scanPlugins()

    const added = now.filter(n => !before.find(b => b.name === n.name))
    const removed = before.filter(b => !now.find(n => n.name === b.name))
    const modified = now.filter(n => {
      const b = before.find(b => b.name === n.name)
      return b && b.mtime !== n.mtime
    })

    // 📦 Commit
    let commit = ''
    try {
      commit = execSync('git log -1 --pretty=format:"%h - %s"', { encoding: 'utf8' })
    } catch {
      commit = 'Sin info de commit'
    }

    let msg = `
╭━━━〔 🚀 *ESTADO DEL BOT* 〕━━━╮
┃ 📦 ${commit}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯
`

    if (firstRun) {
      msg += `\n🟡 Primera ejecución detectada.\n`
    }

    if (added.length || removed.length || modified.length) {
      msg += `\n🧩 *Cambios detectados:*\n`
      added.forEach(p => msg += `• ➕ ${p.name}\n`)
      removed.forEach(p => msg += `• ❌ ${p.name}\n`)
      modified.forEach(p => msg += `• ✏️ ${p.name}\n`)
    } else {
      msg += `\n🟢 Sin cambios en plugins.\n`
    }

    msg += `
━━━━━━━━━━━━━━━━━━━
📊 *Resumen*
• Nuevos: ${added.length}
• Eliminados: ${removed.length}
• Modificados: ${modified.length}
• Fecha: ${new Date().toLocaleString()}

🐾 FelixCat listo y funcionando 😼
`

    await conn.sendMessage(NOTIFY_TO, { text: msg })

    fs.writeFileSync(SNAPSHOT, JSON.stringify(now, null, 2))

  } catch (e) {
    console.error(e)
  }
}

export default handler
