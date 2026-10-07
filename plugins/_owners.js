// 📂 plugins/owner.js — FelixCat-Bot 🐾
// 👑 SISTEMA COMPLETO DE OWNERS
//
// .adowner → agregar owner respondiendo/citando
// .rowner  → eliminar owner respondiendo/citando
// .owners  → ver lista de owners agregados
//
// Los OWNERS ORIGINALES quedan protegidos.
// No se pueden agregar nuevamente ni eliminar.
//
// 💾 OWNERS AGREGADOS → ./database/owners.json
// 🔄 Se cargan automáticamente al iniciar el bot.
//
// 🧹 LIMPIEZA AUTOMÁTICA:
// - Elimina LIDs de la database
// - Elimina duplicados
// - Elimina registros inválidos
// - Mantiene solamente NÚMERO + NOMBRE
//
// Guarda:
//
// ['NUMERO', 'Nombre', true]

// ============================================================
// 📦 IMPORTACIONES
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// 📁 CONFIGURACIÓN DE BASE DE DATOS
// ============================================================

const DATABASE_FOLDER =
  './database'

const OWNERS_DB_FILE =
  path.join(
    DATABASE_FOLDER,
    'owners.json'
  )

// ============================================================
// 📂 CREAR CARPETA DATABASE
// ============================================================

if (
  !fs.existsSync(
    DATABASE_FOLDER
  )
) {

  fs.mkdirSync(
    DATABASE_FOLDER,
    {
      recursive: true
    }
  )
}

// ============================================================
// 👑 GUARDAR OWNERS ORIGINALES
// ============================================================

const ORIGINAL_OWNERS =
  Array.isArray(
    global.owner
  )

    ? global.owner
        .filter(
          o =>
            Array.isArray(o) &&
            o[0]
        )
        .map(
          o => ({
            id:
              String(o[0])
                .split('@')[0]
                .split(':')[0]
                .replace(
                  /[^0-9]/g,
                  ''
                ),

            name:
              o[1] ||
              'Owner'
          })
        )

    : []

// ============================================================
// 🔢 LIMPIAR ID
// ============================================================

function cleanId(id) {

  if (!id)
    return null

  return String(id)
    .split('@')[0]
    .split(':')[0]
    .replace(
      /[^0-9]/g,
      ''
    ) || null
}

// ============================================================
// 📱 OBTENER SOLAMENTE NÚMERO
// ============================================================

function getNumber(id) {

  if (!id)
    return null

  const value =
    String(id)

  // ----------------------------------------------------------
  // ❌ NO ACEPTAR LID
  // ----------------------------------------------------------

  if (
    value
      .toLowerCase()
      .includes('@lid')
  ) {

    return null
  }

  // ----------------------------------------------------------
  // 📱 SOLO WHATSAPP NORMAL
  // ----------------------------------------------------------

  const number =
    cleanId(
      value
    )

  if (
    !number
  ) {

    return null
  }

  return number
}

// ============================================================
// 🛡️ COMPROBAR SI ES OWNER ORIGINAL
// ============================================================

function isOriginalOwner(id) {

  const clean =
    cleanId(id)

  if (
    !clean
  ) {

    return false
  }

  return ORIGINAL_OWNERS.some(
    owner =>
      owner.id === clean
  )
}

// ============================================================
// 📋 LISTA DE OWNERS ORIGINALES
// ============================================================

function originalOwnersText() {

  if (
    !ORIGINAL_OWNERS.length
  ) {

    return (
      '⚠️ No hay owners originales configurados.'
    )
  }

  return ORIGINAL_OWNERS
    .map(
      (owner, index) =>
        `${index + 1}. 👑 ${owner.name}\n   🆔 ${owner.id}`
    )
    .join(
      '\n'
    )
}

// ============================================================
// 💾 LIMPIAR DATABASE DE OWNERS
// ============================================================
//
// Esta función elimina:
//
// ❌ LIDs
// ❌ duplicados
// ❌ registros vacíos
// ❌ owners originales
// ❌ entradas corruptas
//
// Y deja:
//
// ['NUMERO', 'Nombre', true]
//
// ============================================================

function cleanOwnersDatabase(
  owners
) {

  if (
    !Array.isArray(
      owners
    )
  ) {

    return []
  }

  const cleaned = []
  const seen = new Set()

  for (
    const owner
    of owners
  ) {

    if (
      !Array.isArray(owner)
    ) {

      continue
    }

    if (
      !owner[0]
    ) {

      continue
    }

    // --------------------------------------------------------
    // 📱 OBTENER NÚMERO
    // --------------------------------------------------------

    const number =
      getNumber(
        owner[0]
      )

    // --------------------------------------------------------
    // ❌ ELIMINAR LID
    // --------------------------------------------------------

    if (
      !number
    ) {

      continue
    }

    // --------------------------------------------------------
    // ❌ NO GUARDAR OWNER ORIGINAL
    // --------------------------------------------------------

    if (
      isOriginalOwner(
        number
      )
    ) {

      continue
    }

    // --------------------------------------------------------
    // ❌ ELIMINAR DUPLICADOS
    // --------------------------------------------------------

    if (
      seen.has(
        number
      )
    ) {

      continue
    }

    seen.add(
      number
    )

    // --------------------------------------------------------
    // 👤 NOMBRE
    // --------------------------------------------------------

    const name =
      String(
        owner[1] ||
        'Owner'
      )
        .replace(
          /LID$/i,
          ''
        )
        .trim() ||
      'Owner'

    // --------------------------------------------------------
    // 💾 REGISTRO LIMPIO
    // --------------------------------------------------------

    cleaned.push([
      number,
      name,
      true
    ])
  }

  return cleaned
}

// ============================================================
// 💾 CARGAR OWNERS DESDE DATABASE
// ============================================================

function loadOwnersDatabase() {

  try {

    // --------------------------------------------------------
    // CREAR ARCHIVO SI NO EXISTE
    // --------------------------------------------------------

    if (
      !fs.existsSync(
        OWNERS_DB_FILE
      )
    ) {

      fs.writeFileSync(
        OWNERS_DB_FILE,
        '[]',
        'utf8'
      )

      return []
    }

    // --------------------------------------------------------
    // LEER
    // --------------------------------------------------------

    const data =
      fs.readFileSync(
        OWNERS_DB_FILE,
        'utf8'
      )

    if (
      !data.trim()
    ) {

      fs.writeFileSync(
        OWNERS_DB_FILE,
        '[]',
        'utf8'
      )

      return []
    }

    // --------------------------------------------------------
    // PARSEAR
    // --------------------------------------------------------

    const parsed =
      JSON.parse(
        data
      )

    if (
      !Array.isArray(
        parsed
      )
    ) {

      fs.writeFileSync(
        OWNERS_DB_FILE,
        '[]',
        'utf8'
      )

      return []
    }

    // ========================================================
    // 🧹 LIMPIEZA AUTOMÁTICA
    // ========================================================

    const cleaned =
      cleanOwnersDatabase(
        parsed
      )

    // --------------------------------------------------------
    // COMPROBAR SI HABÍA BASURA
    // --------------------------------------------------------

    const changed =
      JSON.stringify(
        parsed
      ) !==
      JSON.stringify(
        cleaned
      )

    if (
      changed
    ) {

      fs.writeFileSync(
        OWNERS_DB_FILE,
        JSON.stringify(
          cleaned,
          null,
          2
        ),
        'utf8'
      )

      console.log(
        `🧹 [OWNERS] Database limpiada. ${cleaned.length} owners válidos conservados.`
      )

      console.log(
        '🗑️ [OWNERS] Se eliminaron LIDs, duplicados y registros inválidos.'
      )
    }

    return cleaned

  } catch (e) {

    console.error(
      '❌ Error cargando owners.json:',
      e
    )

    return []
  }
}

// ============================================================
// 💾 GUARDAR OWNERS EN DATABASE
// ============================================================

function saveOwnersDatabase() {

  try {

    if (
      !Array.isArray(
        global.owner
      )
    ) {

      global.owner = []
    }

    // ========================================================
    // 👑 OBTENER SOLAMENTE OWNERS AGREGADOS
    // ========================================================

    const addedOwners =
      global.owner
        .filter(
          owner => {

            if (
              !Array.isArray(owner) ||
              !owner[0]
            ) {

              return false
            }

            const number =
              getNumber(
                owner[0]
              )

            if (
              !number
            ) {

              return false
            }

            return !isOriginalOwner(
              number
            )
          }
        )
        .map(
          owner => {

            const number =
              getNumber(
                owner[0]
              )

            const name =
              String(
                owner[1] ||
                'Owner'
              )
                .replace(
                  /LID$/i,
                  ''
                )
                .trim() ||
              'Owner'

            return [
              number,
              name,
              true
            ]
          }
        )

    // ========================================================
    // 🧹 ELIMINAR DUPLICADOS
    // ========================================================

    const cleaned =
      cleanOwnersDatabase(
        addedOwners
      )

    // ========================================================
    // 💾 GUARDAR
    // ========================================================

    fs.writeFileSync(
      OWNERS_DB_FILE,
      JSON.stringify(
        cleaned,
        null,
        2
      ),
      'utf8'
    )

    console.log(
      `💾 [OWNERS] ${cleaned.length} owners guardados en ${OWNERS_DB_FILE}`
    )

    return true

  } catch (e) {

    console.error(
      '❌ Error guardando owners.json:',
      e
    )

    return false
  }
}

// ============================================================
// 🔄 CARGAR OWNERS GUARDADOS AL INICIAR
// ============================================================

function restoreOwners() {

  try {

    if (
      !Array.isArray(
        global.owner
      )
    ) {

      global.owner = []
    }

    // ========================================================
    // 📂 CARGAR + LIMPIAR DATABASE
    // ========================================================

    const savedOwners =
      loadOwnersDatabase()

    let restored =
      0

    // ========================================================
    // 🔄 RESTAURAR
    // ========================================================

    for (
      const owner
      of savedOwners
    ) {

      if (
        !Array.isArray(owner) ||
        !owner[0]
      ) {

        continue
      }

      const number =
        getNumber(
          owner[0]
        )

      if (
        !number
      ) {

        continue
      }

      // ------------------------------------------------------
      // 🛡️ NO RESTAURAR ORIGINALES
      // ------------------------------------------------------

      if (
        isOriginalOwner(
          number
        )
      ) {

        continue
      }

      // ------------------------------------------------------
      // 🔍 EVITAR DUPLICADOS
      // ------------------------------------------------------

      const exists =
        global.owner.some(
          current => {

            if (
              !Array.isArray(
                current
              )
            ) {

              return false
            }

            const currentId =
              cleanId(
                current[0]
              )

            return (
              currentId ===
              number
            )
          }
        )

      if (
        exists
      ) {

        continue
      }

      // ------------------------------------------------------
      // 👑 RESTAURAR SOLO NÚMERO
      // ------------------------------------------------------

      global.owner.push([
        number,
        owner[1] ||
          'Owner',
        true
      ])

      restored++
    }

    console.log(
      `🔄 [OWNERS] ${restored} owners restaurados desde ${OWNERS_DB_FILE}`
    )

  } catch (e) {

    console.error(
      '❌ Error restaurando owners:',
      e
    )
  }
}

// ============================================================
// 🚀 RESTAURAR AL CARGAR EL PLUGIN
// ============================================================

restoreOwners()

// ============================================================
// 👑 OBTENER OWNERS ACTUALES
// ============================================================

function getOwners() {

  if (
    !Array.isArray(
      global.owner
    )
  ) {

    global.owner = []
  }

  return global.owner
}

// ============================================================
// 🛡️ COMPROBAR SI QUIEN USA EL COMANDO ES OWNER
// ============================================================

function isOwner(m) {

  const sender =
    String(
      m.sender || ''
    )

  const senderId =
    cleanId(
      sender
    )

  if (
    !senderId
  ) {

    return false
  }

  return getOwners().some(
    owner => {

      if (
        !Array.isArray(
          owner
        )
      ) {

        return false
      }

      return (
        cleanId(
          owner[0]
        ) ===
        senderId
      )
    }
  )
}

// ============================================================
// 🎯 OBTENER USUARIO CITADO
// ============================================================

async function getQuotedUser(
  m,
  conn
) {

  if (
    !m.quoted
  ) {

    return null
  }

  let number =
    null

  let lid =
    null

  // ==========================================================
  // 👤 ID DEL MENSAJE CITADO
  // ==========================================================

  const quotedSender =
    m.quoted.sender ||
    m.quoted.participant ||
    m.quoted.key?.participant ||
    null

  // ==========================================================
  // 📱 DETECTAR NÚMERO / LID
  // ==========================================================

  if (
    quotedSender
  ) {

    const senderString =
      String(
        quotedSender
      )

    if (
      senderString.includes(
        '@s.whatsapp.net'
      )
    ) {

      number =
        cleanId(
          senderString
        )
    }

    if (
      senderString.includes(
        '@lid'
      )
    ) {

      lid =
        cleanId(
          senderString
        )
    }
  }

  // ==========================================================
  // 👥 BUSCAR EN PARTICIPANTES
  // ==========================================================

  if (
    m.isGroup
  ) {

    try {

      const metadata =
        await conn.groupMetadata(
          m.chat
        )

      const participants =
        metadata?.participants ||
        []

      const participant =
        participants.find(
          p => {

            const ids = [
              p.id,
              p.jid,
              p.lid
            ]

            return ids.some(
              id => {

                if (
                  !id ||
                  !quotedSender
                ) {

                  return false
                }

                return (
                  String(id) ===
                  String(
                    quotedSender
                  )
                )
              }
            )
          }
        )

      if (
        participant
      ) {

        // ----------------------------------------------------
        // 📱 NÚMERO
        // ----------------------------------------------------

        const possibleJid =
          participant.jid ||
          (
            String(
              participant.id ||
              ''
            ).includes(
              '@s.whatsapp.net'
            )
              ? participant.id
              : null
          )

        if (
          possibleJid
        ) {

          number =
            cleanId(
              possibleJid
            )
        }

        // ----------------------------------------------------
        // 🆔 LID
        // ----------------------------------------------------

        const possibleLid =
          participant.lid ||
          (
            String(
              participant.id ||
              ''
            ).includes(
              '@lid'
            )
              ? participant.id
              : null
          )

        if (
          possibleLid
        ) {

          lid =
            cleanId(
              possibleLid
            )
        }
      }

    } catch (e) {

      console.log(
        '⚠️ Error obteniendo participante:',
        e
      )
    }
  }

  // ==========================================================
  // 🏷️ NOMBRE
  // ==========================================================

  const name =
    m.quoted.pushName ||
    m.quoted.name ||
    'Owner'

  // ==========================================================
  // ❌ NO SE ENCONTRÓ NADA
  // ==========================================================

  if (
    !number &&
    !lid
  ) {

    return null
  }

  return {
    number,
    lid,
    name
  }
}

// ============================================================
// 🔍 COMPROBAR SI UN ID YA EXISTE
// ============================================================

function ownerExists(id) {

  if (
    !id
  ) {

    return false
  }

  const clean =
    cleanId(
      id
    )

  return getOwners().some(
    owner => {

      if (
        !Array.isArray(
          owner
        )
      ) {

        return false
      }

      return (
        cleanId(
          owner[0]
        ) ===
        clean
      )
    }
  )
}

// ============================================================
// 👑 ADOWNER
// ============================================================

async function addOwner(
  m,
  { conn }
) {

  if (
    !isOwner(m)
  ) {

    return conn.reply(
      m.chat,
      '❌ Solo los owners pueden usar este comando.',
      m
    )
  }

  // ==========================================================
  // 💬 OBLIGATORIO CITAR
  // ==========================================================

  if (
    !m.quoted
  ) {

    return conn.reply(
      m.chat,
`⚠️ *ADOWNER*

Tenés que responder/citar el mensaje del usuario.

📌 Ejemplo:

Respondé a su mensaje y escribí:

*.adowner*`,
      m
    )
  }

  // ==========================================================
  // 🎯 OBTENER USUARIO
  // ==========================================================

  const user =
    await getQuotedUser(
      m,
      conn
    )

  if (
    !user
  ) {

    return conn.reply(
      m.chat,
      '❌ No pude obtener el número o LID del usuario citado.',
      m
    )
  }

  // ==========================================================
  // 🛡️ PROTEGER OWNER ORIGINAL
  // ==========================================================

  const originalTarget =
    (
      user.number &&
      isOriginalOwner(
        user.number
      )
    ) ||
    (
      user.lid &&
      isOriginalOwner(
        user.lid
      )
    )

  if (
    originalTarget
  ) {

    return conn.reply(
      m.chat,
`🛡️ *OWNER ORIGINAL*

❌ No se puede usar *.adowner* con un owner original.

👤 *${user.name}*

👑 *Owners originales:*
${originalOwnersText()}`,
      m
    )
  }

  // ==========================================================
  // 🔍 COMPROBAR SI YA EXISTE
  // ==========================================================

  const numberExists =
    user.number &&
    ownerExists(
      user.number
    )

  const lidExists =
    user.lid &&
    ownerExists(
      user.lid
    )

  if (
    numberExists ||
    lidExists
  ) {

    return conn.reply(
      m.chat,
`⚠️ *${user.name}* ya figura como owner.

📱 Número: ${user.number || 'No encontrado'}

💾 Este owner ya está guardado en la base de datos.`,
      m
    )
  }

  // ==========================================================
  // 📱 AGREGAR SOLAMENTE EL NÚMERO
  // ==========================================================

  if (
    user.number
  ) {

    global.owner.push([
      user.number,
      user.name,
      true
    ])

  } else {

    // --------------------------------------------------------
    // ⚠️ SI SOLO TENEMOS LID
    // --------------------------------------------------------

    return conn.reply(
      m.chat,
`⚠️ *NO SE PUDO OBTENER EL NÚMERO*

👤 *${user.name}*

El usuario fue identificado mediante LID, pero para evitar la lista bugueada necesito su número de WhatsApp.

📌 Citá nuevamente un mensaje del usuario e intentá *.adowner* otra vez.`,
      m
    )
  }

  // ==========================================================
  // 💾 GUARDAR DATABASE
  // ==========================================================

  const saved =
    saveOwnersDatabase()

  // ==========================================================
  // ✅ REACCIÓN
  // ==========================================================

  await m.react(
    saved
      ? '👑'
      : '⚠️'
  )

  // ==========================================================
  // 📤 RESULTADO
  // ==========================================================

  return conn.reply(
    m.chat,
`👑 *OWNER AGREGADO*

━━━━━━━━━━━━━━━━━━

👤 *Nombre:*
${user.name}

📱 *Número:*
\`${user.number}\`

━━━━━━━━━━━━━━━━━━

${saved
  ? '💾 *Guardado permanentemente en la base de datos.*\n\n🔄 Aunque reinicies el bot o uses *.up*, este owner seguirá registrado.'
  : '⚠️ *El owner fue agregado, pero ocurrió un error al guardar la base de datos.*'}

🧹 Los registros LID ya no se guardan.`,
    m
  )
}

// ============================================================
// 🗑️ ROWNER
// ============================================================

async function removeOwner(
  m,
  { conn }
) {

  if (
    !isOwner(m)
  ) {

    return conn.reply(
      m.chat,
      '❌ Solo los owners pueden usar este comando.',
      m
    )
  }

  // ==========================================================
  // 💬 OBLIGATORIO CITAR
  // ==========================================================

  if (
    !m.quoted
  ) {

    return conn.reply(
      m.chat,
`⚠️ *ROWNER*

Tenés que responder/citar el mensaje del owner.

📌 Ejemplo:

Respondé a su mensaje y escribí:

*.rowner*`,
      m
    )
  }

  // ==========================================================
  // 🎯 OBTENER USUARIO
  // ==========================================================

  const user =
    await getQuotedUser(
      m,
      conn
    )

  if (
    !user
  ) {

    return conn.reply(
      m.chat,
      '❌ No pude obtener el número o LID del usuario citado.',
      m
    )
  }

  // ==========================================================
  // 🛡️ PROTEGER OWNER ORIGINAL
  // ==========================================================

  const originalTarget =
    (
      user.number &&
      isOriginalOwner(
        user.number
      )
    ) ||
    (
      user.lid &&
      isOriginalOwner(
        user.lid
      )
    )

  if (
    originalTarget
  ) {

    return conn.reply(
      m.chat,
`🛡️ *OWNER ORIGINAL*

❌ No se puede usar *.rowner* con un owner original.

👤 *${user.name}*

👑 *Owners originales:*
${originalOwnersText()}`,
      m
    )
  }

  // ==========================================================
  // 🔍 BUSCAR OWNER
  // ==========================================================

  const currentOwners =
    getOwners()

  const targetIds =
    [
      user.number,
      user.lid
    ]
      .filter(Boolean)
      .map(
        id =>
          cleanId(id)
      )

  const remaining =
    currentOwners.filter(
      owner => {

        if (
          !Array.isArray(
            owner
          )
        ) {

          return true
        }

        const id =
          cleanId(
            owner[0]
          )

        return !targetIds.includes(
          id
        )
      }
    )

  // ==========================================================
  // ❌ NO ENCONTRADO
  // ==========================================================

  if (
    remaining.length ===
    currentOwners.length
  ) {

    return conn.reply(
      m.chat,
`⚠️ *${user.name}* no figura como owner agregado.

📱 Número: ${user.number || 'No encontrado'}`,
      m
    )
  }

  // ==========================================================
  // 🛡️ NO DEJAR SIN OWNER
  // ==========================================================

  const originalCount =
    ORIGINAL_OWNERS.length

  const addedRemaining =
    remaining.filter(
      owner =>
        Array.isArray(owner) &&
        !isOriginalOwner(
          owner[0]
        )
    )

  if (
    originalCount === 0 &&
    addedRemaining.length === 0
  ) {

    return conn.reply(
      m.chat,
      '🛡️ No podés eliminar al último owner.',
      m
    )
  }

  // ==========================================================
  // 🗑️ ACTUALIZAR GLOBAL.OWNER
  // ==========================================================

  global.owner =
    remaining

  // ==========================================================
  // 💾 ACTUALIZAR DATABASE
  // ==========================================================

  const saved =
    saveOwnersDatabase()

  // ==========================================================
  // ✅ RESULTADO
  // ==========================================================

  await m.react(
    saved
      ? '🗑️'
      : '⚠️'
  )

  return conn.reply(
    m.chat,
`🗑️ *OWNER ELIMINADO*

━━━━━━━━━━━━━━━━━━

👤 *Nombre:*
${user.name}

📱 *Número:*
${user.number
  ? `\`${user.number}\``
  : '❌ No encontrado'}

━━━━━━━━━━━━━━━━━━

${saved
  ? '💾 *La eliminación también fue guardada en la base de datos.*'
  : '⚠️ *Se eliminó de la memoria, pero ocurrió un error guardando la base de datos.*'}

🛡️ Los owners originales permanecen protegidos.`,
    m
  )
}

// ============================================================
// 📋 LISTAR OWNERS AGREGADOS
// ============================================================

async function listOwners(
  m,
  { conn }
) {

  if (
    !isOwner(m)
  ) {

    return conn.reply(
      m.chat,
      '❌ Solo los owners pueden usar este comando.',
      m
    )
  }

  // ==========================================================
  // 📋 OBTENER OWNERS
  // ==========================================================

  const currentOwners =
    getOwners()

  // ==========================================================
  // 🛡️ FILTRAR
  // ==========================================================

  const addedOwners =
    currentOwners.filter(
      owner => {

        if (
          !Array.isArray(owner) ||
          !owner[0]
        ) {

          return false
        }

        const number =
          getNumber(
            owner[0]
          )

        // ----------------------------------------------------
        // ❌ NUNCA MOSTRAR LID
        // ----------------------------------------------------

        if (
          !number
        ) {

          return false
        }

        // ----------------------------------------------------
        // 🛡️ NO MOSTRAR ORIGINALES
        // ----------------------------------------------------

        return !isOriginalOwner(
          number
        )
      }
    )

  // ==========================================================
  // ❌ NO HAY OWNERS
  // ==========================================================

  if (
    !addedOwners.length
  ) {

    return conn.reply(
      m.chat,
`👑 *OWNERS AGREGADOS*

━━━━━━━━━━━━━━━━━━━━

⚠️ No hay owners agregados actualmente.

🗄️ Base de datos:
\`${OWNERS_DB_FILE}\`

🛡️ Los owners originales no aparecen en esta lista.

━━━━━━━━━━━━━━━━━━━━`,
      m
    )
  }

  // ==========================================================
  // 📋 GENERAR LISTA
  // ==========================================================

  const list =
    addedOwners
      .map(
        (owner, index) => {

          const number =
            getNumber(
              owner[0]
            )

          const name =
            String(
              owner[1] ||
              'Owner'
            )
              .replace(
                /LID$/i,
                ''
              )
              .trim() ||
            'Owner'

          return (
`*${index + 1}.* 👑 *${name}*
📱 Número: \`${number}\``
          )
        }
      )
      .join(
        '\n\n'
      )

  // ==========================================================
  // 📊 RESULTADO
  // ==========================================================

  await m.react(
    '📋'
  )

  return conn.reply(
    m.chat,
`👑 *LISTA DE OWNERS AGREGADOS*

━━━━━━━━━━━━━━━━━━━━

${list}

━━━━━━━━━━━━━━━━━━━━

📊 *Total:* ${addedOwners.length}

🛡️ *Owners originales:* ${ORIGINAL_OWNERS.length}

💾 *Base de datos:*
\`${OWNERS_DB_FILE}\`

🔄 Los owners agregados se mantienen aunque reinicies el bot.

━━━━━━━━━━━━━━━━━━━━

ℹ️ Los owners originales están protegidos y no pueden eliminarse con *.rowner*.`,
    m
  )
}

// ============================================================
// 🔧 HANDLER
// ============================================================

let handler = async (
  m,
  {
    conn,
    command
  }
) => {

  try {

    command =
      String(
        command || ''
      )
        .toLowerCase()

    // ========================================================
    // 👑 ADOWNER
    // ========================================================

    if (
      command ===
      'adowner'
    ) {

      return await addOwner(
        m,
        { conn }
      )
    }

    // ========================================================
    // 🗑️ ROWNER
    // ========================================================

    if (
      command ===
      'rowner'
    ) {

      return await removeOwner(
        m,
        { conn }
      )
    }

    // ========================================================
    // 📋 OWNERS
    // ========================================================

    if (
      command ===
      'owners'
    ) {

      return await listOwners(
        m,
        { conn }
      )
    }

  } catch (e) {

    console.error(
      '❌ Error en owner.js:',
      e
    )

    return conn.reply(
      m.chat,
      '❌ Ocurrió un error al modificar o consultar los owners.',
      m
    )
  }
}

// ============================================================
// 📋 CONFIGURACIÓN
// ============================================================

handler.help = [
  'adowner',
  'rowner',
  'owners'
]

handler.tags = [
  'owner'
]

handler.command = [
  'adowner',
  'rowner',
  'owners'
]

// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
