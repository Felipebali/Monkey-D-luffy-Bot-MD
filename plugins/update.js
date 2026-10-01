// 📂 plugins/update.js
// 🔄 Actualizador de FelixCat-Bot 🐾
// 📦 Actualiza desde GitHub
// 🛡️ Protege archivos importantes
// 🧩 Detecta cambios en plugins

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const SNAPSHOT = '.last_update_snapshot.json'

const REPO =
  'https://github.com/Felipebali/Monkey-D-luffy-Bot-MD.git'

// ============================================================
// 🧩 ESCANEAR PLUGINS
// ============================================================

function scanPlugins() {

  const dir =
    path.join(process.cwd(), 'plugins')

  if (!fs.existsSync(dir))
    return []

  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.js'))
    .sort()
    .map(file => ({
      name: file,
      mtime: fs.statSync(
        path.join(dir, file)
      ).mtimeMs
    }))
}

// ============================================================
// 🔧 EJECUTAR GIT
// ============================================================

function git(command) {

  return execSync(
    command,
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }
  ).trim()
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (m, { conn }) => {

  const startTime = Date.now()

  let hasUpdates = false
  let updateError = null

  let remoteCommit = 'Desconocido'

  // ==========================================================
  // 📸 SNAPSHOT ANTERIOR
  // ==========================================================

  let before = []

  if (fs.existsSync(SNAPSHOT)) {

    try {

      before =
        JSON.parse(
          fs.readFileSync(
            SNAPSHOT,
            'utf8'
          )
        )

    } catch {

      before = []
    }
  }

  // ==========================================================
  // 🧩 ESTADO ACTUAL DE PLUGINS
  // ==========================================================

  const pluginsBeforeUpdate =
    scanPlugins()

  // ==========================================================
  // 🛡️ ARCHIVOS PROTEGIDOS
  // ==========================================================

  const backupFiles = [
    'config.js',
    '.env',
    'owner-ban.js',
    'grupo-warn.js'
  ]

  const backupDirs = [
    'LuffySessions'
  ]

  const backups = {}

  // ----------------------------------------------------------
  // 📄 RESPALDAR ARCHIVOS
  // ----------------------------------------------------------

  for (const file of backupFiles) {

    if (fs.existsSync(file)) {

      backups[file] =
        fs.readFileSync(file)
    }
  }

  // ----------------------------------------------------------
  // 📁 RESPALDAR CARPETAS
  // ----------------------------------------------------------

  for (const dir of backupDirs) {

    if (!fs.existsSync(dir))
      continue

    backups[dir] =
      fs.readdirSync(dir).reduce(
        (acc, file) => {

          try {

            acc[file] =
              fs.readFileSync(
                path.join(dir, file)
              )

          } catch {}

          return acc

        },
        {}
      )
  }

  // ==========================================================
  // 🔄 ACTUALIZACIÓN GIT
  // ==========================================================

  try {

    try {
      git('git init')
    } catch {}

    try {
      git(`git remote add origin ${REPO}`)
    } catch {}

    // --------------------------------------------------------
    // 📡 OBTENER ACTUALIZACIÓN
    // --------------------------------------------------------

    git('git fetch origin main')

    remoteCommit =
      git(
        'git log -1 origin/main --pretty=format:"%h - %s"'
      )

    // --------------------------------------------------------
    // 🔎 COMPROBAR CAMBIOS
    // --------------------------------------------------------

    const diff =
      git(
        'git diff --name-status origin/main'
      )

    if (diff) {

      hasUpdates = true

      // ------------------------------------------------------
      // 🔄 ACTUALIZAR
      // ------------------------------------------------------

      git(
        'git reset --hard origin/main'
      )

      // ------------------------------------------------------
      // 🛡️ RESTAURAR ARCHIVOS PROTEGIDOS
      // ------------------------------------------------------

      for (const file of Object.keys(backups)) {

        // Carpeta
        if (backupDirs.includes(file)) {

          if (!fs.existsSync(file)) {

            fs.mkdirSync(
              file,
              {
                recursive: true
              }
            )
          }

          for (
            const savedFile
            of Object.keys(backups[file])
          ) {

            fs.writeFileSync(
              path.join(
                file,
                savedFile
              ),
              backups[file][savedFile]
            )
          }

        }

        // Archivo
        else {

          fs.writeFileSync(
            file,
            backups[file]
          )
        }
      }
    }

  } catch (err) {

    console.error(
      '❌ Error actualizando:',
      err
    )

    updateError =
      err?.message ||
      'Error desconocido'
  }

  // ==========================================================
  // 🧩 COMPARAR PLUGINS
  // ==========================================================

  const now =
    scanPlugins()

  const added =
    now.filter(
      plugin =>
        !before.find(
          old =>
            old.name === plugin.name
        )
    )

  const removed =
    before.filter(
      old =>
        !now.find(
          plugin =>
            plugin.name === old.name
        )
    )

  const modified =
    now.filter(plugin => {

      const old =
        before.find(
          p =>
            p.name === plugin.name
        )

      return (
        old &&
        old.mtime !== plugin.mtime
      )
    })

  // ==========================================================
  // 💾 GUARDAR SNAPSHOT
  // ==========================================================

  try {

    fs.writeFileSync(
      SNAPSHOT,
      JSON.stringify(
        now,
        null,
        2
      )
    )

  } catch {}

  // ==========================================================
  // ⏱️ TIEMPO
  // ==========================================================

  const duration =
    (
      (Date.now() - startTime) /
      1000
    ).toFixed(2)

  // ==========================================================
  // 🧱 CONSTRUIR MENSAJE
  // ==========================================================

  let msg = ''

  msg +=
`╭━━━〔 🔄 ACTUALIZADOR 〕━━━⬣
┃ 🤖 *Whatsapp-Bot*
┃ 📡 *Repositorio conectado*
╰━━━━━━━━━━━━━━━━━━━━⬣

`

  // ==========================================================
  // 📦 INFORMACIÓN REMOTA
  // ==========================================================

  msg +=
`╭━━━〔 📦 VERSIÓN REMOTA 〕━━━⬣
┃ ${remoteCommit}
╰━━━━━━━━━━━━━━━━━━━━⬣

`

  // ==========================================================
  // 🔄 ESTADO
  // ==========================================================

  if (updateError) {

    msg +=
`╭━━━〔 ❌ ACTUALIZACIÓN 〕━━━⬣
┃ No se pudo completar la actualización.
┃
┃ ⚠️ ${updateError}
╰━━━━━━━━━━━━━━━━━━━━⬣

`

  } else if (hasUpdates) {

    msg +=
`╭━━━〔 🟢 ACTUALIZACIÓN 〕━━━⬣
┃ ✅ Nuevos cambios encontrados.
┃
┃ 🔄 Código actualizado
┃ 🛡️ Archivos protegidos restaurados
╰━━━━━━━━━━━━━━━━━━━━⬣

`

  } else {

    msg +=
`╭━━━〔 🟡 ACTUALIZACIÓN 〕━━━⬣
┃ El bot ya está actualizado.
┃
┃ ℹ️ No se encontraron cambios.
╰━━━━━━━━━━━━━━━━━━━━⬣

`
  }

  // ==========================================================
  // 🧩 CAMBIOS EN PLUGINS
  // ==========================================================

  if (
    added.length ||
    removed.length ||
    modified.length
  ) {

    msg +=
`╭━━━〔 🧩 CAMBIOS EN PLUGINS 〕━━━⬣
`

    if (added.length) {

      msg +=
`\n┃ ➕ *Añadidos:* ${added.length}\n`

      for (const plugin of added) {

        msg +=
`┃   └─ ${plugin.name}\n`
      }
    }

    if (modified.length) {

      msg +=
`\n┃ ✏️ *Modificados:* ${modified.length}\n`

      for (const plugin of modified) {

        msg +=
`┃   └─ ${plugin.name}\n`
      }
    }

    if (removed.length) {

      msg +=
`\n┃ ❌ *Eliminados:* ${removed.length}\n`

      for (const plugin of removed) {

        msg +=
`┃   └─ ${plugin.name}\n`
      }
    }

    msg +=
`╰━━━━━━━━━━━━━━━━━━━━⬣

`

  } else {

    msg +=
`╭━━━〔 🧩 PLUGINS 〕━━━⬣
┃ ✅ Sin cambios detectados
╰━━━━━━━━━━━━━━━━━━━━⬣

`
  }

  // ==========================================================
  // 🛡️ PROTECCIÓN
  // ==========================================================

  msg +=
`╭━━━〔 🛡️ PROTECCIÓN 〕━━━⬣
┃ 📄 Archivos protegidos: ${backupFiles.length}
┃ 📁 Carpetas protegidas: ${backupDirs.length}
┃
┃ ✅ Configuración preservada
┃ ✅ Sesiones preservadas
╰━━━━━━━━━━━━━━━━━━━━⬣

`

  // ==========================================================
  // 📊 RESUMEN
  // ==========================================================

  msg +=
`╭━━━〔 📊 RESUMEN 〕━━━⬣
┃ 🔄 Actualización: ${
    hasUpdates
      ? '🟢 Aplicada'
      : '🟡 Sin cambios'
  }
┃ ➕ Añadidos: ${added.length}
┃ ✏️ Modificados: ${modified.length}
┃ ❌ Eliminados: ${removed.length}
┃ 📦 Plugins actuales: ${now.length}
┃ 🕐 Fecha: ${new Date().toLocaleString()}
┃ ⏱️ Tiempo: ${duration}s
╰━━━━━━━━━━━━━━━━━━━━⬣

`

  // ==========================================================
  // 🟢 ESTADO FINAL
  // ==========================================================

  if (updateError) {

    msg +=
`🔴 *ESTADO: ACTUALIZACIÓN CON ERROR*`

  } else if (hasUpdates) {

    msg +=
`🟢 *ESTADO: BOT ACTUALIZADO CORRECTAMENTE*`

  } else {

    msg +=
`🟡 *ESTADO: BOT YA ACTUALIZADO*`
  }

  // ==========================================================
  // 📤 ENVIAR
  // ==========================================================

  await conn.reply(
    m.chat,
    msg,
    m
  )
}

// ============================================================
// 📋 CONFIGURACIÓN
// ============================================================

handler.command = [
  'update',
  'up'
]

handler.rowner = true

export default handler
