// 📂 plugins/admin-warn.js
// ⚠️ SISTEMA PRO DE ADVERTENCIAS PARA ADMINISTRADORES
// WhatsApp-Bot — 2026
// ============================================================
// .admad @usuario motivo       → Dar advertencia
// .unadmad @usuario            → Quitar 1 advertencia
// .listadmad                   → Ver advertencias
// .veradmad @usuario            → Ver historial
// .clearadmad                  → Limpiar todas
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// 📂 BASE DE DATOS
// ============================================================

const DATA_PATH = path.join(process.cwd(), 'data')

if (!fs.existsSync(DATA_PATH)) {
  fs.mkdirSync(DATA_PATH, { recursive: true })
}

const warnsFile = path.join(DATA_PATH, 'admin_warns.json')

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const MAX_WARNS = 3

// ============================================================
// 📥 CARGAR BASE DE DATOS
// ============================================================

function loadWarns() {

  if (!fs.existsSync(warnsFile)) {
    return {}
  }

  try {

    const data = fs.readFileSync(
      warnsFile,
      'utf8'
    )

    return JSON.parse(data)

  } catch (e) {

    console.error(
      '[ADMIN-WARN] Error leyendo la base:',
      e
    )

    return {}
  }
}

// ============================================================
// 💾 GUARDAR BASE DE DATOS
// ============================================================

function saveWarns(data) {

  try {

    fs.writeFileSync(
      warnsFile,
      JSON.stringify(data, null, 2),
      'utf8'
    )

  } catch (e) {

    console.error(
      '[ADMIN-WARN] Error guardando la base:',
      e
    )
  }
}

// ============================================================
// 📱 NORMALIZAR JID
// ============================================================

function normalizeJid(jid) {

  if (!jid) return null

  return String(jid)
    .replace(/@c\.us$/i, '@s.whatsapp.net')
    .replace(/@s\.whatsapp\.net$/i, '@s.whatsapp.net')
}

// ============================================================
// 🔢 OBTENER NÚMERO
// ============================================================

function getNumber(jid) {

  return String(jid || '')
    .split('@')[0]
}

// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {

  return (global.owner || [])
    .map(owner => {

      if (Array.isArray(owner)) {
        owner = owner[0]
      }

      return normalizeJid(
        String(owner)
          .replace(/[^0-9]/g, '') +
        '@s.whatsapp.net'
      )
    })
    .filter(Boolean)
}

// ============================================================
// 👑 VERIFICAR OWNER
// ============================================================

function isOwner(jid) {

  const owners = getOwners()

  return owners.includes(
    normalizeJid(jid)
  )
}

// ============================================================
// 👥 OBTENER TARGET
// ============================================================

function getTarget(m) {

  let target =
    m.quoted?.sender ||
    m.mentionedJid?.[0] ||
    null

  return normalizeJid(target)
}

// ============================================================
// 📝 OBTENER MOTIVO
// ============================================================

function getReason(text, target) {

  let motivo = String(text || '').trim()

  if (target) {

    motivo = motivo.replace(
      new RegExp(`@${getNumber(target)}`, 'g'),
      ''
    )
  }

  return motivo.trim() || 'Sin motivo especificado.'
}

// ============================================================
// 📊 CREAR REGISTRO
// ============================================================

function createRecord() {

  return {
    count: 0,
    motivos: [],
    updatedAt: null
  }
}

// ============================================================
// 🚀 HANDLER
// ============================================================

const handler = async (
  m,
  {
    conn,
    text = '',
    command
  }
) => {

  // ==========================================================
  // 👥 SOLO GRUPOS
  // ==========================================================

  if (!m.isGroup) {

    return m.reply(
      '🚫 Este sistema solo funciona en grupos.'
    )
  }

  // ==========================================================
  // 📂 CARGAR BASE
  // ==========================================================

  const warnsDB = loadWarns()

  if (!warnsDB[m.chat]) {
    warnsDB[m.chat] = {}
  }

  const warns = warnsDB[m.chat]

  // ==========================================================
  // 👤 REMITENTE
  // ==========================================================

  const sender = normalizeJid(
    m.sender
  )

  // ==========================================================
  // 🎯 TARGET
  // ==========================================================

  const target = getTarget(m)

  // ==========================================================
  // ⚠️ DAR ADVERTENCIA
  // ==========================================================

  if (command === 'admad') {

    if (!target) {

      return m.reply(
`⚠️ *Debes indicar un administrador.*

Ejemplos:

.admad @usuario Falta de respeto
.admad motivo respondiendo al mensaje del usuario`
      )
    }

    // ========================================================
    // 🚫 NO ADVERTIRSE A SÍ MISMO
    // ========================================================

    if (target === sender) {

      return m.reply(
        '🚫 No puedes colocarte una advertencia a ti mismo.'
      )
    }

    // ========================================================
    // 👑 PROTEGER OWNER
    // ========================================================

    if (isOwner(target)) {

      return m.reply(
        '👑 No puedes colocar advertencias a un Owner.'
      )
    }

    // ========================================================
    // 👮 VERIFICAR QUE SEA ADMIN
    // ========================================================

    try {

      const metadata =
        await conn.groupMetadata(m.chat)

      const participant =
        metadata.participants.find(
          p => normalizeJid(p.id) === target
        )

      if (!participant) {

        return m.reply(
          '❌ El usuario no pertenece al grupo.'
        )
      }

      const isAdminTarget =
        participant.admin === 'admin' ||
        participant.admin === 'superadmin'

      if (!isAdminTarget) {

        return m.reply(
          '⚠️ Este sistema está destinado únicamente a administradores.'
        )
      }

    } catch (e) {

      console.error(
        '[ADMIN-WARN] Error obteniendo metadata:',
        e
      )

      return m.reply(
        '❌ No pude comprobar si el usuario es administrador.'
      )
    }

    // ========================================================
    // 📝 MOTIVO
    // ========================================================

    const motivo =
      getReason(text, target)

    // ========================================================
    // 📊 CREAR REGISTRO
    // ========================================================

    if (!warns[target]) {

      warns[target] =
        createRecord()
    }

    const registro =
      warns[target]

    // ========================================================
    // 🛡️ LIMPIAR ESTRUCTURA ANTIGUA
    // ========================================================

    if (!Array.isArray(registro.motivos)) {
      registro.motivos = []
    }

    if (
      typeof registro.count !== 'number'
    ) {
      registro.count =
        registro.motivos.length
    }

    // ========================================================
    // 🔢 AUMENTAR ADVERTENCIA
    // ========================================================

    registro.count += 1

    const fecha =
      new Date().toLocaleString(
        'es-UY',
        {
          timeZone: 'America/Montevideo'
        }
      )

    registro.motivos.push({
      motivo,
      fecha,
      otorgadaPor: sender
    })

    registro.updatedAt = fecha

    saveWarns(warnsDB)

    // ========================================================
    // ⚠️ REACCIÓN
    // ========================================================

    try {

      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '⚠️',
            key: m.key
          }
        }
      )

    } catch {}

    // ========================================================
    // 🔥 3 ADVERTENCIAS
    // ========================================================

    if (registro.count >= MAX_WARNS) {

      try {

        await conn.groupParticipantsUpdate(
          m.chat,
          [target],
          'demote'
        )

      } catch (e) {

        console.error(
          '[ADMIN-WARN] Error despromoviendo:',
          e
        )

        return conn.sendMessage(
          m.chat,
          {
            text:
`⚠️ *Límite de advertencias alcanzado*

👤 @${getNumber(target)}
📋 Advertencias: *${registro.count}/${MAX_WARNS}*

❌ No pude despromover al administrador.
Verifica que el bot sea administrador y tenga permisos.`,
            mentions: [target]
          },
          { quoted: m }
        )
      }

      // ======================================================
      // 🧹 BORRAR ADVERTENCIAS DESPUÉS DE DESPROMOVER
      // ======================================================

      delete warns[target]

      saveWarns(warnsDB)

      return conn.sendMessage(
        m.chat,
        {
          text:
`🚫 *ADMINISTRADOR DESPROMOVIDO*

👤 Usuario: @${getNumber(target)}
⚠️ Motivo final: ${motivo}

📋 Ha alcanzado *${MAX_WARNS}/${MAX_WARNS}* advertencias.

👮 Acción:
↳ Administrador despromovido
🧹 Advertencias reiniciadas`,
          mentions: [target]
        },
        { quoted: m }
      )
    }

    // ========================================================
    // 📊 ADVERTENCIA NORMAL
    // ========================================================

    const restantes =
      MAX_WARNS - registro.count

    return conn.sendMessage(
      m.chat,
      {
        text:
`⚠️ *ADVERTENCIA DE ADMINISTRADOR*

👤 Usuario: @${getNumber(target)}

📝 Motivo:
${motivo}

📋 Advertencias:
*${registro.count}/${MAX_WARNS}*

⏳ Restantes:
*${restantes}*

${restantes === 1
  ? '🚨 ¡La próxima advertencia provocará la despromoción!'
  : '⚠️ Al alcanzar 3 advertencias será despromovido.'}`,
        mentions: [target]
      },
      { quoted: m }
    )
  }

  // ==========================================================
  // 🟢 QUITAR UNA ADVERTENCIA
  // ==========================================================

  if (command === 'unadmad') {

    if (!target) {

      return m.reply(
`⚠️ Debes mencionar o responder al administrador.

Ejemplo:
.unadmad @usuario`
      )
    }

    if (!warns[target]) {

      return m.reply(
        `✅ @${getNumber(target)} no tiene advertencias.`,
        null,
        { mentions: [target] }
      )
    }

    const registro =
      warns[target]

    if (
      !registro.count ||
      registro.count <= 0
    ) {

      delete warns[target]
      saveWarns(warnsDB)

      return m.reply(
        `✅ @${getNumber(target)} no tiene advertencias.`,
        null,
        { mentions: [target] }
      )
    }

    // ========================================================
    // ⬇️ QUITAR LA ÚLTIMA
    // ========================================================

    registro.count =
      Math.max(
        0,
        registro.count - 1
      )

    if (
      Array.isArray(registro.motivos) &&
      registro.motivos.length
    ) {

      registro.motivos.pop()
    }

    if (registro.count === 0) {

      delete warns[target]

    } else {

      registro.updatedAt =
        new Date().toLocaleString(
          'es-UY',
          {
            timeZone:
              'America/Montevideo'
          }
        )
    }

    saveWarns(warnsDB)

    try {

      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '🟢',
            key: m.key
          }
        }
      )

    } catch {}

    const nuevoTotal =
      warns[target]?.count || 0

    return conn.sendMessage(
      m.chat,
      {
        text:
`🟢 *ADVERTENCIA RETIRADA*

👤 Usuario: @${getNumber(target)}

📋 Advertencias actuales:
*${nuevoTotal}/${MAX_WARNS}*

✅ Se retiró la última advertencia registrada.`,
        mentions: [target]
      },
      { quoted: m }
    )
  }

  // ==========================================================
  // 📜 LISTA GENERAL
  // ==========================================================

  if (command === 'listadmad') {

    const entries =
      Object.entries(warns)
        .filter(
          ([, data]) =>
            data &&
            Number(data.count) > 0
        )

    if (!entries.length) {

      return m.reply(
        '✅ No hay administradores con advertencias activas.'
      )
    }

    let texto =
`╭━━〔 ⚠️ ADVERTENCIAS DE ADMINS 〕━━⬣

`

    const mentions = []

    entries.forEach(
      ([jid, data], index) => {

        const ultimo =
          Array.isArray(data.motivos) &&
          data.motivos.length
            ? data.motivos[
                data.motivos.length - 1
              ]
            : null

        const motivo =
          ultimo?.motivo ||
          'Sin motivo'

        texto +=
`┃ ${index + 1}. 👤 @${getNumber(jid)}
┃    ⚠️ ${data.count}/${MAX_WARNS}
┃    📝 ${motivo}

`

        mentions.push(jid)
      }
    )

    texto +=
`╰━━━━━━━━━━━━━━━━━━⬣

⚠️ Al llegar a ${MAX_WARNS}/${MAX_WARNS} se despromueve al administrador.`

    return conn.sendMessage(
      m.chat,
      {
        text: texto,
        mentions
      },
      { quoted: m }
    )
  }

  // ==========================================================
  // 🔎 VER HISTORIAL DE UN ADMIN
  // ==========================================================

  if (command === 'veradmad') {

    if (!target) {

      return m.reply(
`⚠️ Menciona o responde al administrador.

Ejemplo:
.veradmad @usuario`
      )
    }

    const registro =
      warns[target]

    if (
      !registro ||
      !registro.count
    ) {

      return m.reply(
        `✅ @${getNumber(target)} no tiene advertencias activas.`,
        null,
        { mentions: [target] }
      )
    }

    let texto =
`╭━━〔 📜 HISTORIAL DE ADVERTENCIAS 〕━━⬣

👤 Usuario: @${getNumber(target)}
📊 Total: *${registro.count}/${MAX_WARNS}*

`

    const motivos =
      Array.isArray(registro.motivos)
        ? registro.motivos
        : []

    motivos.forEach(
      (item, index) => {

        texto +=
`⚠️ *Advertencia ${index + 1}*
📝 ${item.motivo}
🕒 ${item.fecha || 'Fecha desconocida'}
👮 Por: @${getNumber(item.otorgadaPor)}

`
      }
    )

    texto +=
`╰━━━━━━━━━━━━━━━━━━⬣`

    const mentions = [
      target,
      ...motivos
        .map(x => x.otorgadaPor)
        .filter(Boolean)
    ]

    return conn.sendMessage(
      m.chat,
      {
        text: texto,
        mentions: [
          ...new Set(
            mentions.map(normalizeJid)
          )
        ]
      },
      { quoted: m }
    )
  }

  // ==========================================================
  // 🧹 LIMPIAR TODAS
  // ==========================================================

  if (command === 'clearadmad') {

    const cantidad =
      Object.keys(warns).length

    if (!cantidad) {

      return m.reply(
        '✅ No existen advertencias activas para eliminar.'
      )
    }

    warnsDB[m.chat] = {}

    saveWarns(warnsDB)

    try {

      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '🧹',
            key: m.key
          }
        }
      )

    } catch {}

    return conn.sendMessage(
      m.chat,
      {
        text:
`🧹 *ADVERTENCIAS LIMPIADAS*

✅ Se eliminaron todas las advertencias activas de este grupo.

📊 Registros eliminados: *${cantidad}*`
      },
      { quoted: m }
    )
  }
}

// ============================================================
// 📚 COMANDOS
// ============================================================

handler.command = [
  'admad',
  'unadmad',
  'listadmad',
  'veradmad',
  'clearadmad'
]

// ============================================================
// 👥 SOLO GRUPOS
// ============================================================

handler.group = true

// ============================================================
// 👮 SOLO ADMINISTRADORES
// ============================================================

handler.admin = true

// ============================================================
// 📖 AYUDA
// ============================================================

handler.help = [
  'admad @usuario <motivo>',
  'unadmad @usuario',
  'listadmad',
  'veradmad @usuario',
  'clearadmad'
]

// ============================================================
// 🏷️ CATEGORÍA
// ============================================================

handler.tags = [
  'admin'
]

// ============================================================
// 📤 EXPORT
// ============================================================

export default handler
