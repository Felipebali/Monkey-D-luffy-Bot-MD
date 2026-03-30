// 📂 plugins/autoupdate-notify.js — FelixCat Auto Update 🚀🐾

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const SNAPSHOT = '.last_update_snapshot.json'

// 📢 GRUPO DONDE ENVÍA EL AVISO
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

let handler = async (m, { conn }) => {}

// 🔥 SE EJECUTA AUTOMÁTICAMENTE
handler.all = async function (m, { conn }) {
  if (global._updateChecked) return
  global._updateChecked = true

  try {
    let before = []
    if (fs.existsSync(SNAPSHOT)) {
      try {
        before = JSON.parse(fs.readFileSync(SNAPSHOT))
      } catch {}
    }

    const now = scanPlugins()

    const added = now.filter(n => !before.find(b => b.name === n.name))
    const removed = before.filter(b => !now.find(n => n.name === b.name))
    const modified = now.filter(n => {
      const b = before.find(b => b.name === n.name)
      return b && b.mtime !== n.mtime
    })

    // ❌ Si no hay cambios → no avisa
    if (!added.length && !removed.length && !modified.length) return

    // 📦 Obtener último commit
    let commit = ''
    try {
      commit = execSync('git log -1 --pretty=format:"%h - %s"', { encoding: 'utf8' })
    } catch {
      commit = 'Sin información de commit'
    }

    let msg = `
╭━━━〔 🚀 *ACTUALIZACIÓN DETECTADA* 〕━━━╮
┃ 📦 ${commit}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

🧩 *Cambios en plugins:*
`

    added.forEach(p => msg += `• ➕ ${p.name}\n`)
    removed.forEach(p => msg += `• ❌ ${p.name} (eliminado)\n`)
    modified.forEach(p => msg += `• ✏️ ${p.name} (modificado)\n`)

    msg += `
━━━━━━━━━━━━━━━━━━━
📊 *Resumen*
• Nuevos: ${added.length}
• Eliminados: ${removed.length}
• Modificados: ${modified.length}
• Fecha: ${new Date().toLocaleString()}

🐾 *FelixCat actualizado correctamente* 😼
`

    // 📢 ENVÍO AL GRUPO
    await conn.sendMessage(NOTIFY_TO, { text: msg })

    // 💾 Guardar snapshot nuevo
    fs.writeFileSync(SNAPSHOT, JSON.stringify(now, null, 2))

  } catch (e) {
    console.error('AutoUpdate Error:', e)
  }
}

export default handler
