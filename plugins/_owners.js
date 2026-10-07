// 📂 plugins/owner.js — FelixCat-Bot 🐾
// 👑 SISTEMA COMPLETO DE OWNERS
//
// .adowner    → agregar owner respondiendo/citando
// .rowner     → eliminar owner respondiendo/citando
// .owners     → ver lista de owners agregados
// .clearowner → borrar TODOS los owners agregados
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
// ✅ .clearowner elimina todos los owners agregados
// ❌ .clearowner NO elimina owners originales
//
// FORMATO owners.json:
//
// [
//   ["598XXXXXXXX", "Nombre", true]
// ]
//
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
// 📂 CREAR DATABASE
// ============================================================

if (!fs.existsSync(DATABASE_FOLDER)) {
  fs.mkdirSync(DATABASE_FOLDER, {
    recursive: true
  })
}

// ============================================================
// 👑 CAPTURAR OWNERS ORIGINALES
// ============================================================

const ORIGINAL_OWNERS = Array.isArray(global.owner)
  ? global.owner
      .filter(owner => {

        if (!Array.isArray(owner)) {
          return false
        }

        if (!owner[0]) {
          return false
        }

        const id = String(owner[0])

        if (id.includes('@lid')) {
          return false
        }

        return true
      })
      .map(owner => {

        let id = String(owner[0])

        if (id.includes('@s.whatsapp.net')) {
          id = id.split('@')[0]
        }

        if (id.includes('@c.us')) {
          id = id.split('@')[0]
        }

        id = id.split(':')[0]
        id = id.replace(/\D/g, '')

        return {
          id,
          name: owner[1] || 'Owner'
        }
      })
      .filter(owner => owner.id)
  : []

// ============================================================
// 📱 NORMALIZAR NÚMERO
// ============================================================

function normalizePhone(id) {

  if (!id) {
    return null
  }

  let value = String(id)

  if (value.includes('@lid')) {
    return null
  }

  value = value
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')

  value = value.split(':')[0]
  value = value.split('@')[0]

  value = value.replace(/\D/g, '')

  return value || null
}

// ============================================================
// 🆔 NORMALIZAR LID
// ============================================================

function normalizeLid(id) {

  if (!id) {
    return null
  }

  const value = String(id)

  if (!value.includes('@lid')) {
    return null
  }

  const lid = value
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')

  return lid || null
}

// ============================================================
// 🛡️ COMPROBAR OWNER ORIGINAL
// ============================================================

function isOriginalOwner(id) {

  if (!id) {
    return false
  }

  let value = String(id)

  if (value.includes('@lid')) {
    return false
  }

  if (value.includes('@s.whatsapp.net')) {
    value = value.split('@')[0]
  }

  if (value.includes('@c.us')) {
    value = value.split('@')[0]
  }

  value = value.split(':')[0]
  value = value.replace(/\D/g, '')

  if (!value) {
    return false
  }

  return ORIGINAL_OWNERS.some(
    owner => owner.id === value
  )
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

      return (
        `${index + 1}. 👑 ${owner.name}\n` +
        `   📱 ${owner.id}`
      )
    })
    .join('\n')
}

// ============================================================
// 📂 ASEGURAR OWNERS.JSON
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
// 💾 LEER OWNERS.JSON
// ============================================================

function loadOwnersDatabase() {

  try {

    ensureOwnersDatabase()

    const data = fs.readFileSync(
      OWNERS_DB_FILE,
      'utf8'
    )

    if (!data.trim()) {
      return []
    }

    const parsed = JSON.parse(data)

    if (!Array.isArray(parsed)) {
      return []
    }

    const result = []
    const used = new Set()

    for (const owner of parsed) {

      if (
        !Array.isArray(owner) ||
        !owner[0]
      ) {
        continue
      }

      const phone = normalizePhone(owner[0])

      if (!phone) {
        continue
      }

      if (isOriginalOwner(phone)) {
        continue
      }

      if (used.has(phone)) {
        continue
      }

      used.add(phone)

      result.push([
        phone,
        owner[1] || 'Owner',
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
// 🧹 LIMPIAR DATABASE
// ============================================================

function cleanOwnersDatabase() {

  try {

    const owners = loadOwnersDatabase()

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

    if (!Array.isArray(global.owner)) {
      global.owner = []
    }

    const result = []
    const used = new Set()

    for (const owner of global.owner) {

      if (
        !Array.isArray(owner) ||
        !owner[0]
      ) {
        continue
      }

      const phone = normalizePhone(owner[0])

      if (!phone) {
        continue
      }

      if (isOriginalOwner(phone)) {
        continue
      }

      if (used.has(phone)) {
        continue
      }

      used.add(phone)

      result.push([
        phone,
        owner[1] || 'Owner',
        true
      ])
    }

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
      `💾 [OWNERS] ${result.length} owners guardados`
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

    if (!Array.isArray(global.owner)) {
      global.owner = []
    }

    const savedOwners =
      cleanOwnersDatabase()

    let restored = 0

    for (const owner of savedOwners) {

      if (
        !Array.isArray(owner) ||
        !owner[0]
      ) {
        continue
      }

      const phone =
        normalizePhone(owner[0])

      if (!phone) {
        continue
      }

      if (isOriginalOwner(phone)) {
        continue
      }

      const exists =
        global.owner.some(current => {

          if (
            !Array.isArray(current) ||
            !current[0]
          ) {
            return false
          }

          return (
            normalizePhone(current[0]) ===
            phone
          )
        })

      if (exists) {
        continue
      }

      global.owner.push([
        phone,
        owner[1] || 'Owner',
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

  if (!Array.isArray(global.owner)) {
    global.owner = []
  }

  return global.owner
}

// ============================================================
// 🛡️ COMPROBAR SI EL USUARIO ES OWNER
// ============================================================

function isOwner(m) {

  const sender =
    String(m.sender || '')

  const senderPhone =
    normalizePhone(sender)

  if (!senderPhone) {
    return false
  }

  return getOwners().some(owner => {

    if (
      !Array.isArray(owner) ||
      !owner[0]
    ) {
      return false
    }

    const ownerPhone =
      normalizePhone(owner[0])

    return (
      ownerPhone ===
      senderPhone
    )
  })
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

  const quotedSender =
    m.quoted.sender ||
    m.quoted.participant ||
    m.quoted.key?.participant ||
    null

  // ==========================================================
  // 🔎 ANALIZAR ID DEL MENSAJE
  // ==========================================================

  if (quotedSender) {

    const value =
      String(quotedSender)

    const phone =
      normalizePhone(value)

    const foundLid =
      normalizeLid(value)

    if (phone) {
      number = phone
    }

    if (foundLid) {
      lid = foundLid
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
        metadata?.participants || []

      const participant =
        participants.find(p => {

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
        })

      if (participant) {

        // ====================================================
        // 📱 BUSCAR NÚMERO
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

          if (
            value.includes('@lid')
          ) {
            continue
          }

          const phone =
            normalizePhone(value)

          if (phone) {

            number = phone
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
          const possible of
          possibleLids
        ) {

          if (!possible) {
            continue
          }

          const found =
            normalizeLid(possible)

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

  return {
    number,
    lid,
    name
  }
}

// ============================================================
// 🔍 COMPROBAR SI YA ES OWNER
// ============================================================

function ownerExists(phone) {

  const clean =
    normalizePhone(phone)

  if (!clean) {
    return false
  }

  return getOwners().some(owner => {

    if (
      !Array.isArray(owner) ||
      !owner[0]
    ) {
      return false
    }

    return (
      normalizePhone(owner[0]) ===
      clean
    )
  })
}

// ============================================================
// 👑 ADOWNER
// ============================================================

async function addOwner(
  m,
  { conn }
) {

  if (!isOwner(m)) {

    return conn.reply(
      m.chat,
      '❌ Solo los owners pueden usar este comando.',
      m
    )
  }

  if (!m.quoted) {

    return conn.reply(
      m.chat,
      `⚠️ *ADOWNER*

Tenés que responder/citar el mensaje del usuario.

📌 Respondé a su mensaje y escribí:

*.adowner*`,
      m
    )
  }

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

  if (!user.number) {

    return conn.reply(
      m.chat,
      `❌ *NO PUDE OBTENER EL NÚMERO*

👤 *Nombre:*
${user.name}

🆔 *LID detectado:*
\`${user.lid || 'No encontrado'}\`

⚠️ El LID no se guarda como owner.

Respondé directamente al mensaje del usuario dentro del grupo e intentá nuevamente.`,
      m
    )
  }

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

📋 Usá *.owners* para verlo.`,
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

    global.owner =
      global.owner.filter(owner => {

        if (!Array.isArray(owner)) {
          return true
        }

        return (
          normalizePhone(owner[0]) !==
          user.number
        )
      })

    return conn.reply(
      m.chat,
      `❌ *ERROR GUARDANDO OWNER*

No se pudo guardar:

\`${OWNERS_DB_FILE}\`

El owner no fue agregado.`,
      m
    )
  }

  cleanOwnersDatabase()

  try {
    await m.react('👑')
  } catch {}

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
  { conn }
) {

  if (!isOwner(m)) {

    return conn.reply(
      m.chat,
      '❌ Solo los owners pueden usar este comando.',
      m
    )
  }

  if (!m.quoted) {

    return conn.reply(
      m.chat,
      `⚠️ *ROWNER*

Tenés que responder/citar el mensaje del owner.

📌 Respondé a su mensaje y escribí:

*.rowner*`,
      m
    )
  }

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

  if (!user.number) {

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

  const target =
    user.number

  const currentOwners =
    getOwners()

  const exists =
    currentOwners.some(owner => {

      if (
        !Array.isArray(owner) ||
        !owner[0]
      ) {
        return false
      }

      return (
        normalizePhone(owner[0]) ===
        target
      )
    })

  if (!exists) {

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
  // 🗑️ ELIMINAR
  // ==========================================================

  global.owner =
    currentOwners.filter(owner => {

      if (
        !Array.isArray(owner) ||
        !owner[0]
      ) {
        return true
      }

      return (
        normalizePhone(owner[0]) !==
        target
      )
    })

  // ==========================================================
  // 💾 GUARDAR
  // ==========================================================

  const saved =
    saveOwnersDatabase()

  if (!saved) {

    return conn.reply(
      m.chat,
      `⚠️ *ERROR*

El owner fue eliminado de memoria, pero no se pudo actualizar:

\`${OWNERS_DB_FILE}\``,
      m
    )
  }

  cleanOwnersDatabase()

  try {
    await m.react('🗑️')
  } catch {}

  return conn.reply(
    m.chat,
    `🗑️ *OWNER ELIMINADO*

━━━━━━━━━━━━━━━━━━

👤 *Nombre:*
${user.name}

📱 *Número:*
\`${target}\`

━━━━━━━━━━━━━━━━━━

💾 *Eliminado correctamente.*

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

  if (!isOwner(m)) {

    return conn.reply(
      m.chat,
      '❌ Solo los owners pueden usar este comando.',
      m
    )
  }

  const databaseOwners =
    cleanOwnersDatabase()

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
      isOriginalOwner(
        phone
      )
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
      owner[1] || 'Owner',
      true
    ])
  }

  if (!addedOwners.length) {

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

  try {
    await m.react('📋')
  } catch {}

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
// 🧹 CLEAROWNER
// ============================================================
//
// Borra TODOS los owners agregados.
// Los owners originales permanecen protegidos.
//

async function clearOwners(
  m,
  { conn }
) {

  if (!isOwner(m)) {

    return conn.reply(
      m.chat,
      '❌ Solo los owners pueden usar este comando.',
      m
    )
  }

  try {

    const before =
      loadOwnersDatabase()

    const deleted =
      before.length

    // ========================================================
    // 🗑️ VACIAR DATABASE
    // ========================================================

    fs.writeFileSync(
      OWNERS_DB_FILE,
      '[]',
      'utf8'
    )

    // ========================================================
    // 🛡️ DEJAR SOLAMENTE LOS ORIGINALES EN MEMORIA
    // ========================================================

    if (!Array.isArray(global.owner)) {
      global.owner = []
    }

    global.owner =
      global.owner.filter(owner => {

        if (
          !Array.isArray(owner) ||
          !owner[0]
        ) {
          return false
        }

        return isOriginalOwner(
          owner[0]
        )
      })

    try {
      await m.react('🧹')
    } catch {}

    return conn.reply(
      m.chat,
      `🧹 *OWNERS LIMPIADOS*

━━━━━━━━━━━━━━━━━━

✅ Se eliminaron todos los owners agregados.

🗑️ *Eliminados:* ${deleted}

📁 Base de datos:
\`${OWNERS_DB_FILE}\`

🛡️ Los owners originales permanecen protegidos.

━━━━━━━━━━━━━━━━━━

🔄 Los owners originales siguen funcionando normalmente.`,
      m
    )

  } catch (error) {

    console.error(
      '❌ [CLEAROWNER] Error:',
      error
    )

    return conn.reply(
      m.chat,
      `❌ *ERROR*

No se pudieron limpiar los owners agregados.

📁 Archivo:
\`${OWNERS_DB_FILE}\``,
      m
    )
  }
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

    if (
      cmd === 'adowner'
    ) {

      return await addOwner(
        m,
        { conn }
      )
    }

    if (
      cmd === 'rowner'
    ) {

      return await removeOwner(
        m,
        { conn }
      )
    }

    if (
      cmd === 'owners'
    ) {

      return await listOwners(
        m,
        { conn }
      )
    }

    if (
      cmd === 'clearowner'
    ) {

      return await clearOwners(
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
  'owners',
  'clearowner'
]

handler.tags = [
  'owner'
]

handler.command = [
  'adowner',
  'rowner',
  'owners',
  'clearowner'
]

// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
