import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execFileAsync = promisify(execFile)

async function git(command, args = []) {
  try {
    const { stdout } = await execFileAsync(command, args, {
      cwd: process.cwd(),
      timeout: 10000,
      maxBuffer: 1024 * 1024
    })

    return stdout.trim()
  } catch (e) {
    return null
  }
}

function formatDate(date) {
  if (!date) return 'Desconocida'

  try {
    return new Date(date).toLocaleString('es-UY', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  } catch {
    return date
  }
}

let handler = async (m, { conn }) => {
  try {
    const gitDir = path.join(process.cwd(), '.git')

    if (!fs.existsSync(gitDir)) {
      return conn.reply(
        m.chat,
        `❌ *REPOSITORIO GIT NO DETECTADO*\n\n` +
        `📁 No se encontró la carpeta *.git* en:\n` +
        `\`${process.cwd()}\`\n\n` +
        `💡 El bot debe estar ejecutándose dentro de un repositorio Git.`,
        m
      )
    }

    // ==============================
    // 📦 INFORMACIÓN DEL REPOSITORIO
    // ==============================

    let remote =
      await git('git', ['config', '--get', 'remote.origin.url']) ||
      'No configurado'

    // Ocultar credenciales si alguna vez aparecen en la URL
    remote = remote.replace(
      /https:\/\/[^@]+@/i,
      'https://***@'
    )

    const branch =
      await git('git', ['branch', '--show-current']) ||
      'HEAD separado'

    const commit =
      await git('git', ['rev-parse', 'HEAD']) ||
      'Desconocido'

    const shortCommit =
      await git('git', ['rev-parse', '--short', 'HEAD']) ||
      'Desconocido'

    const commitMessage =
      await git('git', ['log', '-1', '--pretty=%s']) ||
      'Desconocido'

    const author =
      await git('git', ['log', '-1', '--pretty=%an']) ||
      'Desconocido'

    const authorEmail =
      await git('git', ['log', '-1', '--pretty=%ae']) ||
      'Desconocido'

    const commitDate =
      await git('git', ['log', '-1', '--format=%cI'])

    const totalCommits =
      await git('git', ['rev-list', '--count', 'HEAD']) ||
      '0'

    // ==============================
    // 📊 ESTADO
    // ==============================

    const status =
      await git('git', ['status', '--porcelain'])

    const clean = !status

    let modified = 0
    let added = 0
    let deleted = 0
    let renamed = 0
    let untracked = 0

    if (status) {
      const lines = status
        .split('\n')
        .filter(Boolean)

      for (const line of lines) {
        const code = line.substring(0, 2)

        if (code.includes('?')) {
          untracked++
        } else if (code.includes('A')) {
          added++
        } else if (code.includes('D')) {
          deleted++
        } else if (code.includes('R')) {
          renamed++
        } else {
          modified++
        }
      }
    }

    // ==============================
    // 📦 PACKAGE.JSON
    // ==============================

    let packageName = 'Desconocido'
    let packageVersion = 'Desconocida'

    try {
      const packagePath = path.join(process.cwd(), 'package.json')

      if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(
          fs.readFileSync(packagePath, 'utf8')
        )

        packageName = pkg.name || 'Sin nombre'
        packageVersion = pkg.version || 'Sin versión'
      }
    } catch {}

    // ==============================
    // 🖥️ NODE
    // ==============================

    const nodeVersion = process.version

    // ==============================
    // 📁 RESULTADO
    // ==============================

    const estado = clean
      ? '🟢 Limpio'
      : '🟠 Tiene cambios locales'

    const mensaje = `
╭━━━〔 🐙 *GIT INFO* 〕━━━╮

📦 *Repositorio*
┌────────────────────
│ 🏷️ Nombre: ${packageName}
│ 🔢 Versión: ${packageVersion}
│ 🌿 Rama: ${branch}
└────────────────────

🔗 *Remoto*
┌────────────────────
│ ${remote}
└────────────────────

📝 *Último Commit*
┌────────────────────
│ 🔹 Hash: ${shortCommit}
│ 👤 Autor: ${author}
│ 📧 Email: ${authorEmail}
│ 📅 Fecha: ${formatDate(commitDate)}
│ 💬 Mensaje:
│ ${commitMessage}
└────────────────────

📊 *Estado*
┌────────────────────
│ ${estado}
│ ✏️ Modificados: ${modified}
│ ➕ Agregados: ${added}
│ ➖ Eliminados: ${deleted}
│ 🔄 Renombrados: ${renamed}
│ ❓ Sin seguimiento: ${untracked}
└────────────────────

📚 *Historial*
┌────────────────────
│ 🔢 Commits totales: ${totalCommits}
│ 🔐 Commit actual:
│ ${commit}
└────────────────────

⚙️ *Sistema*
┌────────────────────
│ 🟢 Node.js: ${nodeVersion}
│ 📁 Directorio:
│ ${process.cwd()}
└────────────────────

╰━━━━━━━━━━━━━━━━━━╯
🐈 *FelixCat_Bot*
`

    await conn.reply(m.chat, mensaje, m)

  } catch (error) {
    console.error('Error en plugin git:', error)

    await conn.reply(
      m.chat,
      `❌ *Error obteniendo información de Git*\n\n` +
      `\`\`\`${error.message}\`\`\``,
      m
    )
  }
}

handler.help = ['git']
handler.tags = ['info']
handler.command = ['git']

export default handler
