// 📂 plugins/update.js
// 🔄 Actualizador de FelixCat-Bot 🐾
// 📦 Actualiza desde GitHub
// 🛡️ Protege archivos importantes
// 🧩 Detecta cambios en plugins
//
// 🔐 PROTEGE:
// - config.js
// - .env
// - owner-ban.js
// - grupo-warn.js
// - database/owners.json
// - LuffySessions

// ============================================================
// 📦 IMPORTACIONES
// ============================================================

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const SNAPSHOT =
  '.last_update_snapshot.json'

const REPO =
  'https://github.com/Felipebali/Monkey-D-luffy-Bot-MD.git'

// ============================================================
// 🧩 ESCANEAR PLUGINS
// ============================================================

function scanPlugins() {

  const dir =
    path.join(
      process.cwd(),
      'plugins'
    )

  if (
    !fs.existsSync(dir)
  ) {
    return []
  }

  return fs
    .readdirSync(dir)
    .filter(
      file =>
        file.endsWith('.js')
    )
    .sort()
    .map(
      file => ({
        name: file,
        mtime:
          fs.statSync(
            path.join(
              dir,
              file
            )
          ).mtimeMs
      })
    )
}

// ============================================================
// 🔧 EJECUTAR GIT
// ============================================================

function git(command) {

  return execSync(
    command,
    {
      encoding: 'utf8',
      stdio: [
        'ignore',
        'pipe',
        'ignore'
      ]
    }
  ).trim()
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (
  m,
  { conn }
) => {

  const startTime =
    Date.now()

  let hasUpdates =
    false

  let updateError =
    null

  let remoteCommit =
    'Desconocido'

  // ==========================================================
  // 📸 SNAPSHOT ANTERIOR
  // ==========================================================

  let before = []

  if (
    fs.existsSync(
      SNAPSHOT
    )
  ) {

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
  //
  // IMPORTANTE:
  //
  // database/owners.json queda protegido para que:
  //
  // .adowner
  // .rowner
  //
  // no pierdan los owners después de usar:
  //
  // .up
  //
  // ==========================================================

  const backupFiles = [

    'config.js',

    '.env',

    'owner-ban.js',

    'grupo-warn.js',

    'database/owners.json'

  ]

  // ==========================================================
  // 📁 CARPETAS PROTEGIDAS
  // ==========================================================

  const backupDirs = [

    'LuffySessions'

  ]

  // ==========================================================
  // 💾 RESPALDOS
  // ==========================================================

  const backups = {}

  // ==========================================================
  // 📄 RESPALDAR ARCHIVOS
  // ==========================================================

  for (
    const file
    of backupFiles
  ) {

    const fullPath =
      path.join(
        process.cwd(),
        file
      )

    if (
      fs.existsSync(
        fullPath
      )
    ) {

      try {

        backups[file] =
          fs.readFileSync(
            fullPath
          )

      } catch (e) {

        console.error(
          `⚠️ No se pudo respaldar ${file}:`,
          e
        )
      }
    }
  }

  // ==========================================================
  // 📁 RESPALDAR CARPETAS
  // ==========================================================

  for (
    const dir
    of backupDirs
  ) {

    const fullPath =
      path.join(
        process.cwd(),
        dir
      )

    if (
      !fs.existsSync(
        fullPath
      )
    ) {
      continue
    }

    backups[dir] =
      fs
        .readdirSync(
          fullPath
        )
        .reduce(
          (
            acc,
            file
          ) => {

            try {

              acc[file] =
                fs.readFileSync(
                  path.join(
                    fullPath,
                    file
                  )
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

    // --------------------------------------------------------
    // 📦 INICIALIZAR GIT
    // --------------------------------------------------------

    try {

      git(
        'git init'
      )

    } catch {}

    // --------------------------------------------------------
    // 🔗 AGREGAR REMOTO
    // --------------------------------------------------------

    try {

      git(
        `git remote add origin ${REPO}`
      )

    } catch {}

    // --------------------------------------------------------
    // 📡 OBTENER ACTUALIZACIÓN
    // --------------------------------------------------------

    git(
      'git fetch origin main'
    )

    // --------------------------------------------------------
    // 📦 COMMIT REMOTO
    // --------------------------------------------------------

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

    if (
      diff
    ) {

      hasUpdates =
        true

      // ------------------------------------------------------
      // 🔄 ACTUALIZAR
      // ------------------------------------------------------

      git(
        'git reset --hard origin/main'
      )

      // ------------------------------------------------------
      // 🛡️ RESTAURAR ARCHIVOS PROTEGIDOS
      // ------------------------------------------------------

      for (
        const file
        of Object.keys(
          backups
        )
      ) {

        // ====================================================
        // 📁 CARPETA
        // ====================================================

        if (
          backupDirs.includes(
            file
          )
        ) {

          const dirPath =
            path.join(
              process.cwd(),
              file
            )

          if (
            !fs.existsSync(
              dirPath
            )
          ) {

            fs.mkdirSync(
              dirPath,
              {
                recursive: true
              }
            )
          }

          for (
            const savedFile
            of Object.keys(
              backups[file]
            )
          ) {

            fs.writeFileSync(
              path.join(
                dirPath,
                savedFile
              ),
              backups[file][
                savedFile
              ]
            )
          }

        }

        // ====================================================
        // 📄 ARCHIVO
        // ====================================================

        else {

          const filePath =
            path.join(
              process.cwd(),
              file
            )

          // --------------------------------------------------
          // 📁 ASEGURAR CARPETA PADRE
          // --------------------------------------------------

          const parentDir =
            path.dirname(
              filePath
            )

          if (
            !fs.existsSync(
              parentDir
            )
          ) {

            fs.mkdirSync(
              parentDir,
              {
                recursive: true
              }
            )
          }

          // --------------------------------------------------
          // 💾 RESTAURAR ARCHIVO
          // --------------------------------------------------

          fs.writeFileSync(
            filePath,
            backups[file]
          )
        }
      }

      // ======================================================
      // 👑 COMPROBAR OWNERS DESPUÉS DE RESTAURAR
      // ======================================================

      const ownersFile =
        path.join(
          process.cwd(),
          'database',
          'owners.json'
        )

      if (
        fs.existsSync(
          ownersFile
        )
      ) {

        try {

          const owners =
            JSON.parse(
              fs.readFileSync(
                ownersFile,
                'utf8'
              )
            )

          console.log(
            `👑 [OWNERS] Base de datos preservada: ${Array.isArray(owners) ? owners.length : 0} owners`
          )

        } catch {

          console.log(
            '⚠️ [OWNERS] owners.json fue restaurado, pero no se pudo verificar su contenido.'
          )
        }

      } else {

        console.log(
          '⚠️ [OWNERS] No existe database/owners.json después de la actualización.'
        )
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

  // ==========================================================
  // ➕ PLUGINS AÑADIDOS
  // ==========================================================

  const added =
    now.filter(
      plugin =>
        !before.find(
          old =>
            old.name ===
            plugin.name
        )
    )

  // ==========================================================
  // ❌ PLUGINS ELIMINADOS
  // ==========================================================

  const removed =
    before.filter(
      old =>
        !now.find(
          plugin =>
            plugin.name ===
            old.name
        )
    )

  // ==========================================================
  // ✏️ PLUGINS MODIFICADOS
  // ==========================================================

  const modified =
    now.filter(
      plugin => {

        const old =
          before.find(
            p =>
              p.name ===
              plugin.name
          )

        return (
          old &&
          old.mtime !==
            plugin.mtime
        )
      }
    )

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
      (
        Date.now() -
        startTime
      ) /
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

  if (
    updateError
  ) {

    msg +=
`╭━━━〔 ❌ ACTUALIZACIÓN 〕━━━⬣
┃ No se pudo completar la actualización.
┃
┃ ⚠️ ${updateError}
╰━━━━━━━━━━━━━━━━━━━━⬣

`

  } else if (
    hasUpdates
  ) {

    msg +=
`╭━━━〔 🟢 ACTUALIZACIÓN 〕━━━⬣
┃ ✅ Nuevos cambios encontrados.
┃
┃ 🔄 Código actualizado
┃ 🛡️ Archivos protegidos restaurados
┃ 👑 Owners preservados
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

    // --------------------------------------------------------
    // ➕ AÑADIDOS
    // --------------------------------------------------------

    if (
      added.length
    ) {

      msg +=
`\n┃ ➕ *Añadidos:* ${added.length}\n`

      for (
        const plugin
        of added
      ) {

        msg +=
`┃   └─ ${plugin.name}\n`
      }
    }

    // --------------------------------------------------------
    // ✏️ MODIFICADOS
    // --------------------------------------------------------

    if (
      modified.length
    ) {

      msg +=
`\n┃ ✏️ *Modificados:* ${modified.length}\n`

      for (
        const plugin
        of modified
      ) {

        msg +=
`┃   └─ ${plugin.name}\n`
      }
    }

    // --------------------------------------------------------
    // ❌ ELIMINADOS
    // --------------------------------------------------------

    if (
      removed.length
    ) {

      msg +=
`\n┃ ❌ *Eliminados:* ${removed.length}\n`

      for (
        const plugin
        of removed
      ) {

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
┃ 👑 Owners preservados
┃ 💾 database/owners.json protegido
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

  if (
    updateError
  ) {

    msg +=
`🔴 *ESTADO: ACTUALIZACIÓN CON ERROR*`

  } else if (
    hasUpdates
  ) {

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

// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
