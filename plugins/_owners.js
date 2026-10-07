// 📂 plugins/owner.js — FelixCat-Bot 🐾
// 👑 SISTEMA COMPLETO DE OWNERS
//
// .adowner → agregar owner respondiendo/citando
// .rowner  → eliminar owner respondiendo/citando
// .owners  → ver lista de owners agregados
//
// ============================================================
// REGLAS
// ============================================================
//
// ✅ Owners originales protegidos
// ✅ Owners agregados guardados en ./database/owners.json
// ✅ SOLO se guarda el número real
// ❌ Los LID nunca se guardan como owners
// ❌ Los LID nunca aparecen en .owners
// ❌ No se crean duplicados
// ✅ Los owners sobreviven a reinicios
//
// FORMATO owners.json:
//
// [
//   ["598XXXXXXXX", "Nombre", true]
// ]
//
// ============================================================


// ============================================================
// 📦 IMPORTACIONES
// ============================================================

import fs from 'fs'
import path from 'path'


// ============================================================
// 📁 CONFIGURACIÓN
// ============================================================

const DATABASE_FOLDER = './database'

const OWNERS_DB_FILE = path.join(
  DATABASE_FOLDER,
  'owners.json'
)


// ============================================================
// 📂 CREAR CARPETA DATABASE
// ============================================================

if (!fs.existsSync(DATABASE_FOLDER)) {

  fs.mkdirSync(
    DATABASE_FOLDER,
    {
      recursive: true
    }
  )
}


// ============================================================
// 👑 CAPTURAR OWNERS ORIGINALES
// ============================================================
//
// MUY IMPORTANTE:
//
// Esto se ejecuta al cargar el plugin.
//
// Los owners originales son exclusivamente
// los que ya estaban definidos en global.owner.
//
// Los owners agregados posteriormente NO pasan
// a formar parte de ORIGINAL_OWNERS.
//
// ============================================================

const ORIGINAL_OWNERS = Array.isArray(global.owner)

  ? global.owner

      .filter(owner => {

        if (
          !Array.isArray(owner)
        ) {
          return false
        }

        if (
          !owner[0]
        ) {
          return false
        }

        const id =
          String(owner[0])

        // ❌ Un LID nunca es owner original
        if (
          id.includes('@lid')
        ) {
          return false
        }

        return true
      })

      .map(owner => {

        let id =
          String(owner[0])

        // ======================================================
        // 📱 NORMALIZAR JID
        // ======================================================

        if (
          id.includes('@s.whatsapp.net')
        ) {

          id =
            id.split('@')[0]
        }

        // ======================================================
        // 📱 QUITAR DEVICE
        // ======================================================

        id =
          id.split(':')[0]

        // ======================================================
        // 🔢 SOLO NÚMEROS
        // ======================================================

        id =
          id.replace(
            /\D/g,
            ''
          )

        return {

          id,

          name:
            owner[1] ||
            'Owner'
        }
      })

      .filter(
        owner =>
          owner.id
      )

  : []


// ============================================================
// 🔢 NORMALIZAR NÚMERO
// ============================================================

function normalizePhone(id) {

  if (
    !id
  ) {
    return null
  }

  let value =
    String(id)

  // ==========================================================
  // ❌ JAMÁS CONVERTIR UN LID EN TELÉFONO
  // ==========================================================

  if (
    value.includes('@lid')
  ) {

    return null
  }

  // ==========================================================
  // 📱 QUITAR DOMINIOS
  // ==========================================================

  value =
    value
      .replace(
        '@s.whatsapp.net',
        ''
      )
      .replace(
        '@c.us',
        ''
      )

  // ==========================================================
  // 📱 QUITAR DEVICE
  // ==========================================================

  value =
    value.split(':')[0]

  // ==========================================================
  // 📱 QUITAR @
  // ==========================================================

  value =
    value.split('@')[0]

  // ==========================================================
  // 🔢 SOLO NÚMEROS
  // ==========================================================

  value =
    value.replace(
      /\D/g,
      ''
    )

  return (
    value ||
    null
  )
}


// ============================================================
// 🆔 NORMALIZAR LID
// ============================================================

function normalizeLid(id) {

  if (
    !id
  ) {
    return null
  }

  const value =
    String(id)

  if (
    !value.includes('@lid')
  ) {
    return null
  }

  const lid =
    value
      .split('@')[0]
      .split(':')[0]
      .replace(
        /\D/g,
        ''
      )

  return (
    lid ||
    null
  )
}


// ============================================================
// 🛡️ COMPROBAR OWNER ORIGINAL
// ============================================================
//
// IMPORTANTE:
//
// SOLO recibe números.
//
// Si recibe un LID devuelve false.
//
// ============================================================

function isOriginalOwner(id) {

  if (
    !id
  ) {
    return false
  }

  let value =
    String(id)

  // ==========================================================
  // ❌ LOS LID NO SON OWNERS ORIGINALES
  // ==========================================================

  if (
    value.includes('@lid')
  ) {

    return false
  }

  // ==========================================================
  // 📱 NORMALIZAR
  // ==========================================================

  if (
    value.includes(
      '@s.whatsapp.net'
    )
  ) {

    value =
      value.split('@')[0]
  }

  value =
    value.split(':')[0]

  value =
    value.replace(
      /\D/g,
      ''
    )

  if (
    !value
  ) {
    return false
  }

  // ==========================================================
  // 👑 COMPARAR SOLO CONTRA ORIGINALES
  // ==========================================================

  return ORIGINAL_OWNERS.some(
    owner =>
      owner.id === value
  )
}


// ============================================================
// 📋 MOSTRAR OWNERS ORIGINALES
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
      (owner, index) => {

        return (
          `${index + 1}. 👑 ${owner.name}\n` +
          `   📱 ${owner.id}`
        )
      }
    )

    .join('\n')
}


// ============================================================
// 📂 CREAR OWNERS.JSON
// ============================================================

function ensureOwnersDatabase() {

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
  }
}


// ============================================================
// 💾 LEER OWNERS.JSON
// ============================================================

function loadOwnersDatabase() {

  try {

    ensureOwnersDatabase()

    const data =
      fs.readFileSync(
        OWNERS_DB_FILE,
        'utf8'
      )

    if (
      !data.trim()
    ) {

      return []
    }

    const parsed =
      JSON.parse(
        data
      )

    if (
      !Array.isArray(parsed)
    ) {

      return []
    }

    const result = []

    const used =
      new Set()

    // ========================================================
    // 🧹 LIMPIAR REGISTROS
    // ========================================================

    for (
      const owner of parsed
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

      const phone =
        normalizePhone(
          owner[0]
        )

      // ❌ LID
      if (
        !phone
      ) {
        continue
      }

      // ❌ Owner original
      if (
        isOriginalOwner(
          phone
        )
      ) {
        continue
      }

      // ❌ Duplicado
      if (
        used.has(phone)
      ) {
        continue
      }

      used.add(
        phone
      )

      result.push([
        phone,
        owner[1] ||
          'Owner',
        true
      ])
    }

    return result

  } catch (error) {

    console.error(
      '❌ [OWNERS] Error leyendo owners.json:',
      error
    )

    return []
  }
}


// ============================================================
// 🧹 LIMPIAR Y REESCRIBIR OWNERS.JSON
// ============================================================

function cleanOwnersDatabase() {

  try {

    const owners =
      loadOwnersDatabase()

    fs.writeFileSync(
      OWNERS_DB_FILE,
      JSON.stringify(
        owners,
        null,
        2
      ),
      'utf8'
    )

    return owners

  } catch (error) {

    console.error(
      '❌ [OWNERS] Error limpiando owners.json:',
      error
    )

    return []
  }
}


// ============================================================
// 💾 GUARDAR OWNERS
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

    const result = []

    const used =
      new Set()

    // ========================================================
    // 🔎 RECORRER GLOBAL.OWNER
    // ========================================================

    for (
      const owner of
      global.owner
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

      const phone =
        normalizePhone(
          owner[0]
        )

      // ❌ LID
      if (
        !phone
      ) {
        continue
      }

      // ❌ Owner original
      if (
        isOriginalOwner(
          phone
        )
      ) {
        continue
      }

      // ❌ Duplicado
      if (
        used.has(phone)
      ) {
        continue
      }

      used.add(
        phone
      )

      result.push([
        phone,
        owner[1] ||
          'Owner',
        true
      ])
    }

    // ========================================================
    // 💾 ESCRIBIR
    // ========================================================

    fs.writeFileSync(
      OWNERS_DB_FILE,
      JSON.stringify(
        result,
        null,
        2
      ),
      'utf8'
    )

    console.log(
      `💾 [OWNERS] ${result.length} owners guardados en ${OWNERS_DB_FILE}`
    )

    return true

  } catch (error) {

    console.error(
      '❌ [OWNERS] Error guardando owners.json:',
      error
    )

    return false
  }
}


// ============================================================
// 🔄 RESTAURAR OWNERS AL INICIAR
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
    // 🧹 LIMPIAR DATABASE
    // ========================================================

    const savedOwners =
      cleanOwnersDatabase()

    let restored =
      0

    // ========================================================
    // 🔄 RESTAURAR
    // ========================================================

    for (
      const owner of
      savedOwners
    ) {

      if (
        !Array.isArray(owner)
      ) {
        continue
      }

      const phone =
        normalizePhone(
          owner[0]
        )

      if (
        !phone
      ) {
        continue
      }

      // ❌ Original
      if (
        isOriginalOwner(
          phone
        )
      ) {
        continue
      }

      // ======================================================
      // 🔍 YA EXISTE
      // ======================================================

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

            const currentPhone =
              normalizePhone(
                current[0]
              )

            return (
              currentPhone ===
              phone
            )
          }
        )

      if (
        exists
      ) {
        continue
      }

      // ======================================================
      // 👑 AGREGAR
      // ======================================================

      global.owner.push([
        phone,
        owner[1] ||
          'Owner',
        true
      ])

      restored++
    }

    console.log(
      `🔄 [OWNERS] ${restored} owners restaurados desde ${OWNERS_DB_FILE}`
    )

  } catch (error) {

    console.error(
      '❌ [OWNERS] Error restaurando owners:',
      error
    )
  }
}


// ============================================================
// 🚀 RESTAURAR AL CARGAR
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

  // ==========================================================
  // 📱 SOLO NÚMERO
  // ==========================================================

  const senderPhone =
    normalizePhone(
      sender
    )

  if (
    !senderPhone
  ) {

    return false
  }

  // ==========================================================
  // 👑 COMPROBAR
  // ==========================================================

  return getOwners().some(
    owner => {

      if (
        !Array.isArray(
          owner
        )
      ) {
        return false
      }

      const ownerPhone =
        normalizePhone(
          owner[0]
        )

      return (
        ownerPhone ===
        senderPhone
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
  // 🔎 ANALIZAR ID DEL MENSAJE
  // ==========================================================

  if (
    quotedSender
  ) {

    const value =
      String(
        quotedSender
      )

    const phone =
      normalizePhone(
        value
      )

    const foundLid =
      normalizeLid(
        value
      )

    if (
      phone
    ) {

      number =
        phone
    }

    if (
      foundLid
    ) {

      lid =
        foundLid
    }
  }

  // ==========================================================
  // 👥 BUSCAR PARTICIPANTE REAL
  // ==========================================================

  if (
    m.isGroup &&
    quotedSender
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
              p?.id,
              p?.jid,
              p?.lid
            ]
              .filter(Boolean)
              .map(
                String
              )

            return ids.includes(
              String(
                quotedSender
              )
            )
          }
        )

      if (
        participant
      ) {

        // ====================================================
        // 📱 BUSCAR NÚMERO REAL
        // ====================================================

        const possibleNumbers = [
          participant.jid,
          participant.id
        ]

        for (
          const possible
          of possibleNumbers
        ) {

          if (
            !possible
          ) {
            continue
          }

          const value =
            String(
              possible
            )

          // ❌ No aceptar LID
          if (
            value.includes(
              '@lid'
            )
          ) {
            continue
          }

          const phone =
            normalizePhone(
              value
            )

          if (
            phone
          ) {

            number =
              phone

            break
          }
        }

        // ====================================================
        // 🆔 BUSCAR LID
        // ====================================================

        const possibleLids = [
          participant.lid,
          participant.id
        ]

        for (
          const possible
          of possibleLids
        ) {

          if (
            !possible
          ) {
            continue
          }

          const found =
            normalizeLid(
              possible
            )

          if (
            found
          ) {

            lid =
              found

            break
          }
        }
      }

    } catch (error) {

      console.log(
        '⚠️ [OWNERS] Error obteniendo participante:',
        error
      )
    }
  }

  // ==========================================================
  // 👤 NOMBRE
  // ==========================================================

  const name =
    m.quoted.pushName ||
    m.quoted.name ||
    'Owner'

  // ==========================================================
  // 📤 DEVOLVER DATOS
  // ==========================================================

  return {
    number,
    lid,
    name
  }
}


// ============================================================
// 🔍 COMPROBAR SI YA ES OWNER
// ============================================================

function ownerExists(
  phone
) {

  const clean =
    normalizePhone(
      phone
    )

  if (
    !clean
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

      const ownerPhone =
        normalizePhone(
          owner[0]
        )

      return (
        ownerPhone ===
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
  {
    conn
  }
) {

  // ==========================================================
  // 🔐 SOLO OWNER
  // ==========================================================

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
      '❌ No pude obtener los datos del usuario citado.',
      m
    )
  }

  // ==========================================================
  // 📱 NÚMERO OBLIGATORIO
  // ==========================================================

  if (
    !user.number
  ) {

    return conn.reply(
      m.chat,
      `❌ *NO PUDE OBTENER EL NÚMERO*

👤 *Nombre:*
${user.name}

🆔 *LID detectado:*
\`${user.lid || 'No encontrado'}\`

⚠️ El LID no se guarda como owner.

Respondé directamente a un mensaje del usuario dentro del grupo e intentá nuevamente.`,
      m
    )
  }

  // ==========================================================
  // 🛡️ OWNER ORIGINAL
  // ==========================================================
  //
  // SOLO SE COMPRUEBA EL NÚMERO.
  //
  // JAMÁS EL LID.
  //
  // ==========================================================

  if (
    isOriginalOwner(
      user.number
    )
  ) {

    return conn.reply(
      m.chat,
      `🛡️ *OWNER ORIGINAL*

❌ No se puede usar *.adowner* con un owner original.

👤 *${user.name}*

📱 Número:
\`${user.number}\`

👑 *Owners originales:*
${originalOwnersText()}`,
      m
    )
  }

  // ==========================================================
  // 🔍 COMPROBAR SI YA EXISTE
  // ==========================================================

  if (
    ownerExists(
      user.number
    )
  ) {

    return conn.reply(
      m.chat,
      `⚠️ *YA ES OWNER*

👤 *${user.name}*

📱 Número:
\`${user.number}\`

💾 Este número ya está registrado como owner.

📋 Usá *.owners* para ver la lista.`,
      m
    )
  }

  // ==========================================================
  // 👑 AGREGAR
  // ==========================================================

  global.owner.push([
    user.number,
    user.name,
    true
  ])

  // ==========================================================
  // 💾 GUARDAR
  // ==========================================================

  const saved =
    saveOwnersDatabase()

  if (
    !saved
  ) {

    // Revertir si no se pudo guardar
    global.owner =
      global.owner.filter(
        owner => {

          if (
            !Array.isArray(
              owner
            )
          ) {
            return true
          }

          return (
            normalizePhone(
              owner[0]
            ) !==
            user.number
          )
        }
      )

    return conn.reply(
      m.chat,
      `❌ *ERROR GUARDANDO OWNER*

No se pudo guardar:

\`${OWNERS_DB_FILE}\`

El owner no fue agregado.`,
      m
    )
  }

  // ==========================================================
  // 🧹 LIMPIAR DATABASE
  // ==========================================================

  cleanOwnersDatabase()

  // ==========================================================
  // ✅ REACCIÓN
  // ==========================================================

  try {

    await m.react(
      '👑'
    )

  } catch {}

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

💾 *Guardado correctamente.*

🗄️ Base de datos:
\`${OWNERS_DB_FILE}\`

🔄 Este owner seguirá registrado aunque reinicies el bot.

📋 Usá *.owners* para verlo.`,
    m
  )
}


// ============================================================
// 🗑️ ROWNER
// ============================================================

async function removeOwner(
  m,
  {
    conn
  }
) {

  // ==========================================================
  // 🔐 SOLO OWNER
  // ==========================================================

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
      '❌ No pude obtener los datos del usuario citado.',
      m
    )
  }

  // ==========================================================
  // 📱 NECESITAMOS NÚMERO
  // ==========================================================

  if (
    !user.number
  ) {

    return conn.reply(
      m.chat,
      `❌ *NO PUDE OBTENER EL NÚMERO*

👤 *Nombre:*
${user.name}

🆔 *LID:*
\`${user.lid || 'No encontrado'}\`

⚠️ El LID no se utiliza para eliminar owners.`,
      m
    )
  }

  // ==========================================================
  // 🛡️ OWNER ORIGINAL
  // ==========================================================

  if (
    isOriginalOwner(
      user.number
    )
  ) {

    return conn.reply(
      m.chat,
      `🛡️ *OWNER ORIGINAL*

❌ No se puede eliminar un owner original.

👤 *${user.name}*

📱 Número:
\`${user.number}\`

👑 *Owners originales:*
${originalOwnersText()}`,
      m
    )
  }

  // ==========================================================
  // 🔍 COMPROBAR EXISTENCIA
  // ==========================================================

  const target =
    user.number

  const currentOwners =
    getOwners()

  const exists =
    currentOwners.some(
      owner => {

        if (
          !Array.isArray(
            owner
          )
        ) {
          return false
        }

        return (
          normalizePhone(
            owner[0]
          ) ===
          target
        )
      }
    )

  // ==========================================================
  // ❌ NO EXISTE
  // ==========================================================

  if (
    !exists
  ) {

    return conn.reply(
      m.chat,
      `⚠️ *NO ES OWNER AGREGADO*

👤 *${user.name}*

📱 Número:
\`${target}\`

📋 Usá *.owners* para consultar la lista.`,
      m
    )
  }

  // ==========================================================
  // 🛡️ NO DEJAR SIN OWNER
  // ==========================================================

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

        return (
          normalizePhone(
            owner[0]
          ) !==
          target
        )
      }
    )

  // ==========================================================
  // 🛡️ PROTECCIÓN
  // ==========================================================

  const originalCount =
    ORIGINAL_OWNERS.length

  if (
    originalCount === 0 &&
    remaining.length === 0
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
  // 💾 GUARDAR
  // ==========================================================

  const saved =
    saveOwnersDatabase()

  if (
    !saved
  ) {

    return conn.reply(
      m.chat,
      `⚠️ *ERROR*

El owner fue eliminado de memoria, pero no se pudo actualizar:

\`${OWNERS_DB_FILE}\``,
      m
    )
  }

  // ==========================================================
  // 🧹 LIMPIAR
  // ==========================================================

  cleanOwnersDatabase()

  // ==========================================================
  // ✅ REACCIÓN
  // ==========================================================

  try {

    await m.react(
      '🗑️'
    )

  } catch {}

  // ==========================================================
  // 📤 RESULTADO
  // ==========================================================

  return conn.reply(
    m.chat,
    `🗑️ *OWNER ELIMINADO*

━━━━━━━━━━━━━━━━━━

👤 *Nombre:*
${user.name}

📱 *Número:*
\`${target}\`

━━━━━━━━━━━━━━━━━━

💾 *Eliminado correctamente de la base de datos.*

🛡️ Los owners originales permanecen protegidos.`,
    m
  )
}


// ============================================================
// 📋 LISTAR OWNERS
// ============================================================

async function listOwners(
  m,
  {
    conn
  }
) {

  // ==========================================================
  // 🔐 SOLO OWNER
  // ==========================================================

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
  // 🧹 LIMPIAR DATABASE
  // ==========================================================

  const databaseOwners =
    cleanOwnersDatabase()

  // ==========================================================
  // 📋 CREAR LISTA
  // ==========================================================

  const addedOwners = []

  const used =
    new Set()

  for (
    const owner of
    databaseOwners
  ) {

    if (
      !Array.isArray(
        owner
      )
    ) {
      continue
    }

    const phone =
      normalizePhone(
        owner[0]
      )

    if (
      !phone
    ) {
      continue
    }

    // ❌ Original
    if (
      isOriginalOwner(
        phone
      )
    ) {
      continue
    }

    // ❌ Duplicado
    if (
      used.has(phone)
    ) {
      continue
    }

    used.add(
      phone
    )

    addedOwners.push([
      phone,
      owner[1] ||
        'Owner',
      true
    ])
  }

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

          const phone =
            normalizePhone(
              owner[0]
            )

          const name =
            owner[1] ||
            'Owner'

          return (
            `*${index + 1}.* 👑 *${name}*\n` +
            `📱 Número: \`${phone}\``
          )
        }
      )
      .join(
        '\n\n'
      )

  // ==========================================================
  // ✅ REACCIÓN
  // ==========================================================

  try {

    await m.react(
      '📋'
    )

  } catch {}

  // ==========================================================
  // 📤 RESULTADO
  // ==========================================================

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

    const cmd =
      String(
        command || ''
      )
        .toLowerCase()

    // ========================================================
    // 👑 ADOWNER
    // ========================================================

    if (
      cmd === 'adowner'
    ) {

      return await addOwner(
        m,
        {
          conn
        }
      )
    }

    // ========================================================
    // 🗑️ ROWNER
    // ========================================================

    if (
      cmd === 'rowner'
    ) {

      return await removeOwner(
        m,
        {
          conn
        }
      )
    }

    // ========================================================
    // 📋 OWNERS
    // ========================================================

    if (
      cmd === 'owners'
    ) {

      return await listOwners(
        m,
        {
          conn
        }
      )
    }

  } catch (error) {

    console.error(
      '❌ [OWNER] Error:',
      error
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
