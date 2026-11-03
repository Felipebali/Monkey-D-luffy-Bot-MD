
/**
 * 📂 plugins/anticanal.js
 * 🛡️ WHATSAPP-BOT — ANTICANAL ACTIVABLE
 *
 * Comandos:
 * .anticanal
 * .anticanal on
 * .anticanal off
 *
 * 🚫 Elimina enlaces de canales de WhatsApp
 * 👤 Modera usuarios comunes
 * 🛡️ Administradores exentos
 * 👑 Owners exentos
 * 💾 Configuración permanente por grupo
 * 🔕 Sin mensajes informativos innecesarios
 *
 * Baileys ES Modules
 */

import fs from 'fs'
import path from 'path'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const DIR = './database'
const FILE = path.join(DIR, 'anticanal.json')

fs.mkdirSync(DIR, { recursive: true })

if (!fs.existsSync(FILE)) {
  fs.writeFileSync(
    FILE,
    JSON.stringify({ grupos: {} }, null, 2),
    'utf8'
  )
}

// ============================================================
// 📂 BASE DE DATOS
// ============================================================

function cargarConfig() {
  try {
    const data = JSON.parse(
      fs.readFileSync(FILE, 'utf8')
    )

    if (!data.grupos || typeof data.grupos !== 'object') {
      data.grupos = {}
    }

    return data
  } catch {
    return { grupos: {} }
  }
}

function guardarConfig(data) {
  fs.writeFileSync(
    FILE,
    JSON.stringify(data, null, 2),
    'utf8'
  )
}

// ============================================================
// 🧹 NORMALIZAR TEXTO
// ============================================================

function limpiarTexto(texto) {
  return String(texto || '')
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .replace(/[：]/g, ':')
    .replace(/[．。]/g, '.')
    .replace(/[\u2024\u2025\u2215\u2044]/g, '/')
}

// ============================================================
// 🔎 DETECTAR ENLACES DE CANALES
// ============================================================

const CANAL_REGEX =
  /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/channel(?:\/[^\s<>"']*)?/i

// ============================================================
// 📝 OBTENER TEXTO
// ============================================================

function obtenerTexto(m) {
  let contenido = m.message || {}

  for (let i = 0; i < 4; i++) {
    const interno =
      contenido.ephemeralMessage?.message ||
      contenido.viewOnceMessage?.message ||
      contenido.viewOnceMessageV2?.message ||
      contenido.viewOnceMessageV2Extension?.message

    if (!interno) break

    contenido = interno
  }

  return String(
    contenido.conversation ||
    contenido.extendedTextMessage?.text ||
    contenido.imageMessage?.caption ||
    contenido.videoMessage?.caption ||
    contenido.documentMessage?.caption ||
    contenido.documentWithCaptionMessage
      ?.message?.documentMessage?.caption ||
    m.text ||
    ''
  )
}

// ============================================================
// 👤 OBTENER AUTOR
// ============================================================

function obtenerAutor(m) {
  return (
    m.key?.participant ||
    m.participant ||
    m.sender ||
    ''
  )
}

// ============================================================
// 🔎 NORMALIZAR JID
// ============================================================

function normalizarJid(id, conn) {
  const valor = String(id || '').trim()

  try {
    return conn?.decodeJid?.(valor) || valor
  } catch {
    return valor
  }
}

function normalizarNumero(id) {
  return String(id || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

function mismoJid(a, b, conn) {
  const primero = normalizarJid(a, conn)
  const segundo = normalizarJid(b, conn)

  if (!primero || !segundo) return false
  if (primero === segundo) return true

  const tipoA = primero.split('@')[1]
  const tipoB = segundo.split('@')[1]

  const telefonico = tipo =>
    tipo === 's.whatsapp.net' ||
    tipo === 'c.us'

  if (telefonico(tipoA) && telefonico(tipoB)) {
    return normalizarNumero(primero) === normalizarNumero(segundo)
  }

  return false
}

// ============================================================
// 👑 VERIFICAR OWNER
// ============================================================

function esOwner(m, conn) {
  if (m.isOwner === true) return true

  const sender = obtenerAutor(m)

  const owners = [
    ...(Array.isArray(global.owner)
      ? global.owner
      : global.owner ? [global.owner] : []),
    ...(Array.isArray(global.owners)
      ? global.owners
      : [])
  ]

  return owners.some(owner => {
    const valor = Array.isArray(owner)
      ? owner[0]
      : owner?.jid || owner?.id || owner

    if (!valor) return false

    const id = String(valor)

    const jid = id.includes('@')
      ? id
      : `${normalizarNumero(id)}@s.whatsapp.net`

    return mismoJid(sender, jid, conn)
  })
}

// ============================================================
// 🛡️ VERIFICAR ADMINISTRADORES
// ============================================================

async function esAdmin(conn, chat, sender, participants = []) {
  let miembros = participants

  if (!Array.isArray(miembros) || !miembros.length) {
    try {
      const metadata = await conn.groupMetadata(chat)
      miembros = metadata.participants || []
    } catch {
      return null
    }
  }

  const participante = miembros.find(p => {
    const identificadores = [
      p.id,
      p.jid,
      p.lid,
      p.phoneNumber
    ].filter(Boolean)

    return identificadores.some(id =>
      mismoJid(sender, id, conn)
    )
  })

  if (!participante) return null

  return (
    participante.admin === 'admin' ||
    participante.admin === 'superadmin' ||
    participante.admin === 'owner'
  )
}

// ============================================================
// 🔘 COMANDO .ANTICANAL
// ============================================================

const handler = async (m, {
  conn,
  command,
  args,
  isAdmin,
  isOwner: ownerFramework
}) => {
  const chat = m.chat || m.key?.remoteJid

  if (!chat || !chat.endsWith('@g.us')) {
    return m.reply(
      '⚠️ Este comando solo funciona en grupos.'
    )
  }

  if (command !== 'anticanal') return

  const sender = obtenerAutor(m)

  const owner =
    ownerFramework === true ||
    esOwner(m, conn)

  const admin =
    isAdmin === true ||
    await esAdmin(conn, chat, sender)

  if (!owner && admin !== true) {
    return m.reply(
      '⛔ Solo los administradores del grupo o los owners pueden cambiar el anticanal.'
    )
  }

  const config = cargarConfig()

  const subcomando = String(
    args?.[0] || ''
  ).toLowerCase()

  const estadoActual = config.grupos[chat] === true

  let nuevoEstado

  if (
    ['on', 'activar', 'activado', 'si', 'sí']
      .includes(subcomando)
  ) {
    nuevoEstado = true

  } else if (
    ['off', 'desactivar', 'desactivado', 'no']
      .includes(subcomando)
  ) {
    nuevoEstado = false

  } else {
    nuevoEstado = !estadoActual
  }

  config.grupos[chat] = nuevoEstado

  try {
    guardarConfig(config)
  } catch {
    return conn.sendMessage(chat, {
      text: '❌ No se pudo guardar la configuración del anticanal.'
    })
  }

  // Confirmación sin citar el comando
  await conn.sendMessage(chat, {
    text: nuevoEstado
      ? '✅ *ANTICANAL ACTIVADO*\n\n🚫 Los enlaces de canales de WhatsApp enviados por usuarios comunes serán eliminados.\n\n🛡️ Administradores y owners están exentos.'
      : '🔕 *ANTICANAL DESACTIVADO*\n\nLos enlaces de canales de WhatsApp ya no serán bloqueados.'
  })
}

// ============================================================
// 🚫 DETECTAR Y ELIMINAR ENLACES
// ============================================================

handler.before = async function (m, { conn, participants = [] }) {
  try {
    const chat = m.chat || m.key?.remoteJid

    if (!chat || !chat.endsWith('@g.us')) return
    if (m.fromMe || m.key?.fromMe) return

    const config = cargarConfig()

    if (config.grupos[chat] !== true) return

    const texto = limpiarTexto(obtenerTexto(m))

    if (!texto) return
    if (!CANAL_REGEX.test(texto)) return

    const autor = obtenerAutor(m)

    if (!autor || !m.key?.id) return

    // 👑 Owners exentos
    if (esOwner(m, conn)) return

    // 🛡️ Administradores exentos
    const admin = await esAdmin(
      conn,
      chat,
      autor,
      participants
    )

    // Si no se puede verificar el rol, no eliminar
    if (admin !== false) return

    // ========================================================
    // 🗑️ ELIMINAR MENSAJE
    // ========================================================

    let borrado = false

    try {
      await conn.sendMessage(chat, {
        delete: {
          remoteJid: chat,
          fromMe: false,
          id: m.key.id,
          participant: autor
        }
      })

      borrado = true
    } catch {
      borrado = false
    }

    // ========================================================
    // 📢 AVISO AL GRUPO
    // ========================================================

    const aviso = borrado
      ? `🚫 @${autor.split('@')[0]}, no se permiten enlaces de canales de WhatsApp en este grupo.\n\n🗑️ Mensaje eliminado.`
      : `🚫 @${autor.split('@')[0]}, no se permiten enlaces de canales de WhatsApp en este grupo.\n\n⚠️ No pude eliminar el mensaje. Verificá que el bot sea administrador.`

    await conn.sendMessage(chat, {
      text: aviso,
      mentions: [autor]
    })

  } catch {
    // Evitar mensajes informativos innecesarios
  }
}

// ============================================================
// 📌 EXPORTACIÓN
// ============================================================

handler.command = ['anticanal']
handler.group = true
handler.help = [
  'anticanal',
  'anticanal on',
  'anticanal off'
]
handler.tags = ['group']

export default handler
