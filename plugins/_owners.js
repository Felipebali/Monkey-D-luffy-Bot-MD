// 📂 plugins/owner.js — FelixCat-Bot 🐾
// 👑 SISTEMA DE OWNERS DESDE CERO
//
// .adowner → agregar owner respondiendo/citando
// .rowner  → eliminar owner respondiendo/citando
// .owners  → ver owners agregados
//
// ============================================================
// REGLAS
// ============================================================
//
// ✅ Los owners originales quedan protegidos
// ✅ Los owners agregados se guardan SOLO por número
// ❌ Los LID NO se guardan en owners.json
// ❌ Los LID NO aparecen en .owners
// ✅ No permite duplicados
// ✅ Se mantienen después de reiniciar el bot
//
// DATABASE:
// ./database/owners.json
//
// FORMATO:
//
// [
//   ["598XXXXXXXX", "Nombre", true]
// ]
//
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// 📁 DATABASE
// ============================================================

const DATABASE_FOLDER = './database'

const OWNERS_DB_FILE = path.join(
  DATABASE_FOLDER,
  'owners.json'
)

// ============================================================
// 📂 CREAR DATABASE
// ============================================================

if (!fs.existsSync(DATABASE_FOLDER)) {
  fs.mkdirSync(DATABASE_FOLDER, {
    recursive: true
  })
}

// ============================================================
// 🔧 NORMALIZAR NÚMERO
// ============================================================

function normalizePhone(id) {
  if (!id) return null

  let value = String(id)

  // Nunca aceptar LID como número
  if (value.includes('@lid')) {
    return null
  }

  // Eliminar dominio WhatsApp
  value = value
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')

  // Eliminar device/sufijos
  value = value.split(':')[0]
  value = value.split('@')[0]

  // Dejar solamente números
  value = value.replace(/\D/g, '')

  return value || null
}

// ============================================================
// 🔧 NORMALIZAR LID
// ============================================================

function normalizeLid(id) {
  if (!id) return null

  const value = String(id)

  if (!value.includes('@lid')) {
    return null
  }

  return (
    value
      .split('@')[0]
      .split(':')[0]
      .replace(/\D/g, '') || null
  )
}

// ============================================================
// 👑 OBTENER OWNERS ORIGINALES
// ============================================================

const ORIGINAL_OWNERS = Array.isArray(global.owner)
  ? global.owner
      .filter(owner => {
        return (
          Array.isArray(owner) &&
          owner[0]
        )
      })
      .map(owner => ({
        raw: String(owner[0]),

        phone:
          normalizePhone(owner[0]),

        lid:
          normalizeLid(owner[0]),

        name:
          owner[1] ||
          'Owner'
      }))
  : []

// ============================================================
// 🛡️ COMPROBAR OWNER ORIGINAL
// ============================================================

function isOriginalOwner(id) {

  const phone =
    normalizePhone(id)

  const lid =
    normalizeLid(id)

  if (phone) {
    return ORIGINAL_OWNERS.some(
      owner =>
        owner.phone === phone
    )
  }

  if (lid) {
    return ORIGINAL_OWNERS.some(
      owner =>
        owner.lid === lid
    )
  }

  return false
}

// ============================================================
// 📋 TEXTO OWNERS ORIGINALES
// ============================================================

function originalOwnersText() {

  if (!ORIGINAL_OWNERS.length) {
    return '⚠️ No hay owners originales configurados.'
  }

  return ORIGINAL_OWNERS
    .map((owner, index) => {

      const id =
        owner.phone ||
        owner.lid ||
        owner.raw

      return (
        `${index + 1}. 👑 ${owner.name}\n` +
        `   🆔 ${id}`
      )
    })
    .join('\n')
}

// ============================================================
// 💾 CREAR OWNERS.JSON
// ============================================================

function ensureOwnersDatabase() {

  if (!fs.existsSync(OWNERS_DB_FILE)) {

    fs.writeFileSync(
      OWNERS_DB_FILE,
      '[]',
      'utf8'
    )
  }
}

// ============================================================
// 💾 CARGAR DATABASE
// ============================================================

function loadOwnersDatabase() {

  try {

    ensureOwnersDatabase()

    const raw =
      fs.readFileSync(
        OWNERS_DB_FILE,
        'utf8'
      )

    if (!raw.trim()) {
      return []
    }

    const data =
      JSON.parse(raw)

    if (!Array.isArray(data)) {
      return []
    }

    return data

      // Solo arrays válidos
      .filter(owner => {
        return (
          Array.isArray(owner) &&
          owner[0]
        )
      })

      // Solo números
      .map(owner => {

        const phone =
          normalizePhone(owner[0])

        if (!phone) {
          return null
        }

        return [
          phone,
          owner[1] ||
            'Owner',
          true
        ]
      })

      .filter(Boolean)

  } catch (error) {

    console.error(
      '❌ [OWNERS] Error leyendo owners.json:',
      error
    )

    return []
  }
}

// ============================================================
// 🧹 LIMPIAR DATABASE
// ============================================================

function cleanOwnersDatabase() {

  try {

    const owners =
      loadOwnersDatabase()

    const unique = []

    const used = new Set()

    for (const owner of owners) {

      const phone =
        normalizePhone(owner[0])

      if (!phone) {
        continue
      }

      // Nunca guardar owners originales
      if (
        isOriginalOwner(phone)
      ) {
        continue
      }

      // Evitar duplicados
      if (
        used.has(phone)
      ) {
        continue
      }

      used.add(phone)

      unique.push([
        phone,
        owner[1] ||
          'Owner',
        true
      ])
    }

    fs.writeFileSync(
      OWNERS_DB_FILE,
      JSON.stringify(
        unique,
        null,
        2
      ),
      'utf8'
    )

    return unique

  } catch (error) {

    console.error(
      '❌ [OWNERS] Error limpiando owners.json:',
      error
    )

    return []
  }
}

// ============================================================
// 💾 GUARDAR DATABASE
// ============================================================

function saveOwnersDatabase() {

  try {

    const owners =
      Array.isArray(global.owner)
        ? global.owner
        : []

    const unique = []

    const used = new Set()

    for (const owner of owners) {

      if (
        !Array.isArray(owner) ||
        !owner[0]
      ) {
        continue
      }

      const phone =
        normalizePhone(owner[0])

      // ❌ Nunca guardar LID
      if (!phone) {
        continue
      }

      // ❌ Nunca guardar owner original
      if (
        isOriginalOwner(phone)
      ) {
        continue
      }

      // ❌ Evitar duplicados
      if (
        used.has(phone)
      ) {
        continue
      }

      used.add(phone)

      unique.push([
        phone,
        owner[1] ||
          'Owner',
        true
      ])
    }

    fs.writeFileSync(
      OWNERS_DB_FILE,
      JSON.stringify(
        unique,
        null,
        2
      ),
      'utf8'
    )

    console.log(
      `💾 [OWNERS] ${unique.length} owners guardados`
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
// 🔄 RESTAURAR OWNERS
// ============================================================

function restoreOwners() {

  try {

    if (
      !Array.isArray(global.owner)
    ) {
      global.owner = []
    }

    // Primero limpiar database
    const savedOwners =
      cleanOwnersDatabase()

    let restored = 0

    for (
      const owner of savedOwners
    ) {

      const phone =
        normalizePhone(owner[0])

      if (!phone) {
        continue
      }

      // No restaurar originales
      if (
        isOriginalOwner(phone)
      ) {
        continue
      }

      // Comprobar si ya está
      const exists =
        global.owner.some(
          current => {

            if (
              !Array.isArray(current) ||
              !current[0]
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

      if (exists) {
        continue
      }

      // Guardar SOLO número
      global.owner.push([
        phone,
        owner[1] ||
          'Owner',
        true
      ])

      restored++
    }

    console.log(
      `🔄 [OWNERS] ${restored} owners restaurados`
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
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {

  if (
    !Array.isArray(global.owner)
  ) {
    global.owner = []
  }

  return global.owner
}

// ============================================================
// 🛡️ COMPROBAR SI ES OWNER
// ============================================================

function isOwner(m) {

  const sender =
    String(
      m.sender || ''
    )

  const senderPhone =
    normalizePhone(sender)

  const senderLid =
    normalizeLid(sender)

  if (!senderPhone && !senderLid) {
    return false
  }

  return getOwners().some(
    owner => {

      if (
        !Array.isArray(owner) ||
        !owner[0]
      ) {
        return false
      }

      const ownerPhone =
        normalizePhone(
          owner[0]
        )

      if (
        senderPhone &&
        ownerPhone
      ) {
        return (
          senderPhone ===
          ownerPhone
        )
      }

      return false
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

  if (!m.quoted) {
    return null
  }

  let number = null
  let lid = null

  // ==========================================================
  // 👤 ID DEL MENSAJE CITADO
  // ==========================================================

  const quotedSender =
    m.quoted.sender ||
    m.quoted.participant ||
    m.quoted.key?.participant ||
    null

  // ==========================================================
  // 📱 SI YA VIENE COMO NÚMERO
  // ==========================================================

  if (quotedSender) {

    const sender =
      String(quotedSender)

    const phone =
      normalizePhone(sender)

    const senderLid =
      normalizeLid(sender)

    if (phone) {
      number = phone
    }

    if (senderLid) {
      lid = senderLid
    }
  }

  // ==========================================================
  // 👥 BUSCAR EN PARTICIPANTES
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
              .map(String)

            return ids.includes(
              String(quotedSender)
            )
          }
        )

      if (participant) {

        // ====================================================
        // 📱 OBTENER NÚMERO REAL
        // ====================================================

        const possibleNumbers = [
          participant.jid,
          participant.id
        ]

        for (
          const possible of
          possibleNumbers
        ) {

          if (!possible) {
            continue
          }

          const value =
            String(possible)

          const phone =
            normalizePhone(
              value
            )

          if (
            phone &&
            !value.includes('@lid')
          ) {

            number = phone
            break
          }
        }

        // ====================================================
        // 🆔 LID
        // ====================================================

        const possibleLids = [
          participant.lid,
          participant.id
        ]

        for (
          const possible of
          possibleLids
        ) {

          if (!possible) {
            continue
          }

          const found =
            normalizeLid(
              possible
            )

          if (found) {
            lid = found
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
  // ❌ NO HAY NÚMERO
  // ==========================================================

  if (!number) {

    return {
      number: null,
      lid,
      name
    }
  }

  return {
    number,
    lid,
    name
  }
}

// ============================================================
// 🔍 COMPROBAR SI EXISTE OWNER POR NÚMERO
// ============================================================

function ownerExists(phone) {

  const clean =
    normalizePhone(phone)

  if (!clean) {
    return false
  }

  return getOwners().some(
    owner => {

      if (
        !Array.isArray(owner) ||
        !owner[0]
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
  { conn }
) {

  // ==========================================================
  // 🔐 SOLO OWNER
  // ==========================================================

  if (!isOwner(m)) {

    return conn.reply(
      m.chat,
      '❌ Solo los owners pueden usar este comando.',
      m
    )
  }

  // ==========================================================
  // 💬 OBLIGATORIO CITAR
  // ==========================================================

  if (!m.quoted) {

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

  if (!user) {

    return conn.reply(
      m.chat,
      '❌ No pude obtener los datos del usuario citado.',
      m
    )
  }

  // ==========================================================
  // 📱 EL NÚMERO ES OBLIGATORIO
  // ==========================================================

  if (!user.number) {

    return conn.reply(
      m.chat,
      `❌ *NO PUDE OBTENER EL NÚMERO*

👤 Nombre: ${user.name}

🆔 LID detectado:
\`${user.lid || 'No encontrado'}\`

⚠️ No voy a guardar el LID como owner.

Respondé directamente a un mensaje del usuario dentro del grupo e intentá nuevamente.`,
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

❌ No se puede usar *.adowner* con un owner original.

👤 *${user.name}*

👑 *Owners originales:*
${originalOwnersText()}`,
      m
    )
  }

  // ==========================================================
  // 🔍 YA EXISTE
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
  // 👑 AGREGAR SOLO NÚMERO
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

  if (!saved) {

    // Si falló la base de datos,
    // revertimos el agregado de memoria.

    global.owner =
      global.owner.filter(
        owner => {

          if (
            !Array.isArray(owner)
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
      `❌ *ERROR*

No se pudo guardar el owner en:

\`${OWNERS_DB_FILE}\`

No se agregó el owner.`,
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
    await m.react('👑')
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

🗄️ Base:
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
  { conn }
) {

  // ==========================================================
  // 🔐 SOLO OWNER
  // ==========================================================

  if (!isOwner(m)) {

    return conn.reply(
      m.chat,
      '❌ Solo los owners pueden usar este comando.',
      m
    )
  }

  // ==========================================================
  // 💬 OBLIGATORIO CITAR
  // ==========================================================

  if (!m.quoted) {

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

  if (!user) {

    return conn.reply(
      m.chat,
      '❌ No pude obtener los datos del usuario citado.',
      m
    )
  }

  // ==========================================================
  // 📱 NECESITAMOS NÚMERO
  // ==========================================================

  if (!user.number) {

    return conn.reply(
      m.chat,
      `❌ *NO PUDE OBTENER EL NÚMERO*

👤 Nombre:
${user.name}

🆔 LID:
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

👑 *Owners originales:*
${originalOwnersText()}`,
      m
    )
  }

  // ==========================================================
  // 🔍 BUSCAR OWNER
  // ==========================================================

  const target =
    user.number

  const currentOwners =
    getOwners()

  const exists =
    currentOwners.some(
      owner => {

        if (
          !Array.isArray(owner) ||
          !owner[0]
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

  if (!exists) {

    return conn.reply(
      m.chat,
      `⚠️ *NO ES OWNER AGREGADO*

👤 *${user.name}*

📱 Número:
\`${target}\`

📋 Usá *.owners* para consultar los owners agregados.`,
      m
    )
  }

  // ==========================================================
  // 🗑️ ELIMINAR
  // ==========================================================

  global.owner =
    currentOwners.filter(
      owner => {

        if (
          !Array.isArray(owner) ||
          !owner[0]
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
  // 💾 GUARDAR
  // ==========================================================

  const saved =
    saveOwnersDatabase()

  if (!saved) {

    return conn.reply(
      m.chat,
      `⚠️ *OWNER ELIMINADO DE MEMORIA*

Pero no se pudo actualizar:

\`${OWNERS_DB_FILE}\`

Revisá los permisos del archivo.`,
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
    await m.react('🗑️')
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
  { conn }
) {

  // ==========================================================
  // 🔐 SOLO OWNER
  // ==========================================================

  if (!isOwner(m)) {

    return conn.reply(
      m.chat,
      '❌ Solo los owners pueden usar este comando.',
      m
    )
  }

  // ==========================================================
  // 🧹 LIMPIAR ANTES DE MOSTRAR
  // ==========================================================

  const databaseOwners =
    cleanOwnersDatabase()

  // ==========================================================
  // 🔄 SINCRONIZAR MEMORIA
  // ==========================================================

  const addedOwners = []

  const used = new Set()

  for (
    const owner of
    databaseOwners
  ) {

    if (
      !Array.isArray(owner) ||
      !owner[0]
    ) {
      continue
    }

    const phone =
      normalizePhone(
        owner[0]
      )

    if (!phone) {
      continue
    }

    if (
      isOriginalOwner(phone)
    ) {
      continue
    }

    if (
      used.has(phone)
    ) {
      continue
    }

    used.add(phone)

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
      .join('\n\n')

  // ==========================================================
  // ✅ REACCIÓN
  // ==========================================================

  try {
    await m.react('📋')
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
      ).toLowerCase()

    // ========================================================
    // 👑 ADOWNER
    // ========================================================

    if (
      cmd === 'adowner'
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
      cmd === 'rowner'
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
      cmd === 'owners'
    ) {

      return await listOwners(
        m,
        { conn }
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
