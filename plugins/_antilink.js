
/**
 * 📂 plugins/antilink.js
 * 🛡️ WHATSAPP-BOT — ANTILINK ACTIVABLE
 *
 * Comando:
 * .antilink → Activar / desactivar
 *
 * • Detecta enlaces de invitación de grupos
 * • Elimina el mensaje y expulsa al usuario
 * • Permite el enlace del grupo actual
 * • Administradores, superadministradores y owners exentos
 * • Solo administradores y owners pueden cambiar el estado
 * • Confirmaciones sin citar el comando
 */

import fs from 'fs'
import path from 'path'

const DIR = './database'
const FILE = path.join(DIR, 'antilink.json')

if (!fs.existsSync(DIR)) {
  fs.mkdirSync(DIR, { recursive: true })
}

if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, JSON.stringify({ grupos: {} }, null, 2))
}

// ============================================================
// 📂 CONFIGURACIÓN
// ============================================================

function cargarConfig() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))

    if (!data.grupos || typeof data.grupos !== 'object') {
      data.grupos = {}
    }

    return data
  } catch (e) {
    console.error('[ANTILINK] Error leyendo configuración:', e)
    return { grupos: {} }
  }
}

function guardarConfig(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

// ============================================================
// 🔎 REGEX DE ENLACES
// ============================================================

const GROUP_LINK_REGEX =
  /chat\.whatsapp\.com\/(?:invite\/)?([0-9a-z]{20,24})/i

const GENERIC_GROUP_REGEX =
  /(?:chat\.whatsapp\.com|whatsapp\.com\/invite)/i

// ============================================================
// 🧹 LIMPIAR TEXTO
// ============================================================

function limpiarTexto(texto) {
  return String(texto || '')
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .replace(/[：]/g, ':')
    .replace(/[．。]/g, '.')
    .replace(/[\u2024\u2025\u2215\u2044]/g, '/')
}

// ============================================================
// 📝 OBTENER TEXTO
// ============================================================

function obtenerTexto(m) {
  const msg = m.message || {}

  const contenido =
    msg.ephemeralMessage?.message ||
    msg.viewOnceMessage?.message ||
    msg.viewOnceMessageV2?.message ||
    msg.viewOnceMessageV2Extension?.message ||
    msg

  return String(
    contenido.conversation ||
    contenido.extendedTextMessage?.text ||
    contenido.imageMessage?.caption ||
    contenido.videoMessage?.caption ||
    contenido.documentMessage?.caption ||
    contenido.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    ''
  )
}

// ============================================================
// 👤 IDENTIFICAR USUARIOS
// ============================================================

function obtenerAutor(m) {
  return m.key?.participant || m.participant || m.sender || ''
}

function normalizarNumero(id) {
  return String(id || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

function esOwner(sender) {
  const numero = normalizarNumero(sender)

  if (!numero) return false

  return (global.owner || []).some(owner => {
    const id = Array.isArray(owner) ? owner[0] : owner
    return normalizarNumero(id) === numero
  })
}

// ============================================================
// 🛡️ VERIFICAR ADMINISTRADORES
// ============================================================

async function obtenerParticipante(conn, chat, sender) {
  try {
    const metadata = await conn.groupMetadata(chat)
    const autor = String(sender || '')
    const numeroAutor = normalizarNumero(autor)

    return metadata.participants.find(p => {
      const ids = [p.id, p.jid, p.lid].filter(Boolean)

      return ids.some(id => {
        const idTexto = String(id)

        if (idTexto === autor) return true

        return (
          idTexto.includes('@s.whatsapp.net') &&
          autor.includes('@s.whatsapp.net') &&
          normalizarNumero(idTexto) === numeroAutor
        )
      })
    })
  } catch (e) {
    console.error('[ANTILINK] Error obteniendo participantes:', e)
    return null
  }
}

async function esAdmin(conn, chat, sender) {
  const participante = await obtenerParticipante(conn, chat, sender)

  return Boolean(
    participante?.admin === 'admin' ||
    participante?.admin === 'superadmin'
  )
}

// ============================================================
// 🔘 COMANDO .ANTILINK — ALTERNAR
// ============================================================

const handler = async (m, { conn }) => {
  const chat = m.chat || m.key?.remoteJid

  if (!chat || !chat.endsWith('@g.us')) {
    return m.reply('⚠️ Este comando solo funciona en grupos.')
  }

  const sender = m.sender || m.key?.participant

  if (!esOwner(sender) && !(await esAdmin(conn, chat, sender))) {
    return m.reply(
      '⛔ Solo los administradores del grupo o el owner pueden cambiar el antilink.'
    )
  }

  const participanteBot = await obtenerParticipante(
    conn,
    chat,
    conn.user?.id
  )

  if (
    !participanteBot ||
    !['admin', 'superadmin'].includes(participanteBot.admin)
  ) {
    return m.reply(
      '⚠️ Necesito ser administrador para eliminar mensajes y expulsar usuarios.'
    )
  }

  const config = cargarConfig()
  const estadoActual = config.grupos[chat] === true
  const nuevoEstado = !estadoActual

  config.grupos[chat] = nuevoEstado

  try {
    guardarConfig(config)
  } catch (e) {
    console.error('[ANTILINK] Error guardando configuración:', e)

    await conn.sendMessage(chat, {
      text: '❌ No se pudo guardar la configuración del antilink.'
    })

    return
  }

  await conn.sendMessage(chat, {
    text: nuevoEstado
      ? '✅ *ANTILINK ACTIVADO*\n\n🚫 Se eliminarán los enlaces de invitación de otros grupos y se expulsará a quienes los envíen.\n\n🛡️ Administradores y owners están exentos.'
      : '🔕 *ANTILINK DESACTIVADO*\n\nLos enlaces de invitación de grupos ya no serán moderados.'
  })
}

// ============================================================
// 🚫 DETECTAR, BORRAR Y EXPULSAR
// ============================================================

handler.before = async function (m, { conn }) {
  try {
    const chat = m.chat || m.key?.remoteJid

    if (!chat || !chat.endsWith('@g.us')) return
    if (m.key?.fromMe || !m.message) return

    const config = cargarConfig()

    if (config.grupos[chat] !== true) return

    const texto = limpiarTexto(obtenerTexto(m))

    if (!texto || !GENERIC_GROUP_REGEX.test(texto)) return

    const autor = obtenerAutor(m)

    if (!autor || !m.key?.id) return

    // 👑 Owners exentos
    if (esOwner(autor)) return

    // 🛡️ Administradores y superadministradores exentos
    if (await esAdmin(conn, chat, autor)) return

    // 🔐 Comprobar el enlace del grupo actual
    const coincidencia = texto.match(GROUP_LINK_REGEX)

    if (coincidencia) {
      try {
        const codigoActual = await conn.groupInviteCode(chat)

        if (coincidencia[1] === codigoActual) return
      } catch (e) {
        console.error('[ANTILINK] No se pudo verificar el enlace actual:', e)
      }
    }

    // 🗑️ Borrar el mensaje
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
    } catch (e) {
      console.error('[ANTILINK] Error borrando mensaje:', e)
    }

    // 🚫 Expulsar al usuario
    let expulsado = false

    try {
      await conn.groupParticipantsUpdate(chat, [autor], 'remove')
      expulsado = true
    } catch (e) {
      console.error('[ANTILINK] Error expulsando usuario:', e)
    }

    // 📢 Aviso sin citar el mensaje original
    let aviso = `🚫 @${autor.split('@')[0]}, no se permiten enlaces de otros grupos.\n\n`

    aviso += borrado
      ? '🗑️ Mensaje eliminado.'
      : '⚠️ No pude eliminar el mensaje.'

    aviso += '\n'

    aviso += expulsado
      ? '⛔ Usuario expulsado del grupo.'
      : '⚠️ No pude expulsar al usuario. Verificá los permisos del bot.'

    await conn.sendMessage(chat, {
      text: aviso,
      mentions: [autor]
    })

  } catch (e) {
    console.error('[ANTILINK] Error en moderación:', e)
  }
}

// ============================================================
// 📌 EXPORTACIÓN
// ============================================================

handler.command = ['antilink']
handler.group = true

export default handler
