
/**
 * 📂 plugins/anticanal.js
 * 🛡️ WHATSAPP-BOT — ANTICANAL ACTIVABLE
 *
 * Comandos:
 * .anticanal       Activar / desactivar
 * .anticanal on    Activar
 * .anticanal off   Desactivar
 *
 * Detecta enlaces whatsapp.com/channel/
 * Elimina mensajes de usuarios comunes y avisa al grupo.
 *
 * 🛡️ Administradores y superadministradores: exentos.
 * 👑 Owners: exentos.
 * 🔐 Solo administradores y owners pueden cambiar la configuración.
 * 🔕 Las confirmaciones de activación/desactivación no citan el comando.
 */

import fs from 'fs'
import path from 'path'

const DIR = './database'
const FILE = path.join(DIR, 'anticanal.json')

// ============================================================
// ⚙️ CREAR CONFIGURACIÓN
// ============================================================

if (!fs.existsSync(DIR)) {
  fs.mkdirSync(DIR, { recursive: true })
}

if (!fs.existsSync(FILE)) {
  fs.writeFileSync(
    FILE,
    JSON.stringify({ grupos: {} }, null, 2)
  )
}

// ============================================================
// 📂 CARGAR Y GUARDAR CONFIGURACIÓN
// ============================================================

function cargarConfig() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))

    if (!data.grupos || typeof data.grupos !== 'object') {
      data.grupos = {}
    }

    return data
  } catch (e) {
    console.error('[ANTICANAL] Error leyendo configuración:', e)
    return { grupos: {} }
  }
}

function guardarConfig(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

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
// 🔎 DETECTAR ENLACES DE CANALES
// ============================================================

const CANAL_REGEX =
  /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/channel(?:\/[^\s<>"']*)?/i

// ============================================================
// 📝 OBTENER TEXTO DEL MENSAJE
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
// 👤 OBTENER AUTOR
// ============================================================

function obtenerAutor(m) {
  return m.key?.participant || m.participant || m.sender || ''
}

// ============================================================
// 👑 VERIFICAR OWNER
// ============================================================

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

async function esAdmin(conn, chat, sender) {
  try {
    const metadata = await conn.groupMetadata(chat)
    const autor = String(sender || '')
    const numeroAutor = normalizarNumero(autor)

    const participante = metadata.participants.find(p => {
      const ids = [p.id, p.jid, p.lid].filter(Boolean)

      return ids.some(id => {
        const idTexto = String(id)

        if (idTexto === autor) return true

        if (
          idTexto.includes('@s.whatsapp.net') &&
          autor.includes('@s.whatsapp.net')
        ) {
          return normalizarNumero(idTexto) === numeroAutor
        }

        return false
      })
    })

    return Boolean(
      participante?.admin === 'admin' ||
      participante?.admin === 'superadmin'
    )
  } catch (e) {
    console.error(
      '[ANTICANAL] Error verificando administradores:',
      e
    )

    return false
  }
}

// ============================================================
// 🔘 COMANDO .ANTICANAL
// ============================================================

const handler = async (m, { conn, command, args }) => {
  const chat = m.chat || m.key?.remoteJid

  if (!chat || !chat.endsWith('@g.us')) {
    return m.reply('⚠️ Este comando solo funciona en grupos.')
  }

  const sender = m.sender || m.key?.participant
  const config = cargarConfig()
  const subcomando = String(args?.[0] || '').toLowerCase()

  if (command !== 'anticanal') return

  // Solo owners o administradores pueden cambiar la configuración.
  if (!esOwner(sender) && !(await esAdmin(conn, chat, sender))) {
    return m.reply(
      '⛔ Solo los administradores del grupo o el owner pueden cambiar el anticanal.'
    )
  }

  const estadoActual = config.grupos[chat] === true
  let nuevoEstado

  if (['on', 'activar', 'activado', 'si', 'sí'].includes(subcomando)) {
    nuevoEstado = true
  } else if (
    ['off', 'desactivar', 'desactivado', 'no'].includes(subcomando)
  ) {
    nuevoEstado = false
  } else {
    nuevoEstado = !estadoActual
  }

  config.grupos[chat] = nuevoEstado

  try {
    guardarConfig(config)
  } catch (e) {
    console.error('[ANTICANAL] Error guardando configuración:', e)

    await conn.sendMessage(chat, {
      text: '❌ No se pudo guardar la configuración del anticanal.'
    })

    return
  }

  // 📢 Confirmación independiente, sin citar el comando original.
  await conn.sendMessage(chat, {
    text: nuevoEstado
      ? '✅ Anticanal ACTIVADO.\n\n🚫 Se eliminarán los enlaces de canales enviados por usuarios comunes.\n\n🛡️ Administradores y owners están exentos.'
      : '🔕 Anticanal DESACTIVADO.\n\nLos enlaces de canales de WhatsApp ya no serán bloqueados.'
  })

  return
}

// ============================================================
// 🚫 DETECTAR Y ELIMINAR ENLACES
// ============================================================

handler.before = async function (m, { conn }) {
  try {
    const chat = m.chat || m.key?.remoteJid

    if (!chat || !chat.endsWith('@g.us')) return
    if (m.key?.fromMe) return

    const config = cargarConfig()

    // Solo moderar grupos donde el anticanal está activado.
    if (config.grupos[chat] !== true) return

    const texto = limpiarTexto(obtenerTexto(m))

    if (!texto || !CANAL_REGEX.test(texto)) return

    const autor = obtenerAutor(m)

    if (!autor || !m.key?.id) return

    // 👑 Los owners pueden compartir enlaces.
    if (esOwner(autor)) return

    // 🛡️ Los administradores y superadministradores están exentos.
    if (await esAdmin(conn, chat, autor)) return

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
      console.error('[ANTICANAL] Error borrando mensaje:', e)
    }

    const aviso = borrado
      ? `🚫 @${autor.split('@')[0]}, no se permiten enlaces de canales de WhatsApp en este grupo.\n\n🗑️ Mensaje eliminado.`
      : `🚫 @${autor.split('@')[0]}, no se permiten enlaces de canales de WhatsApp en este grupo.\n\n⚠️ No pude eliminar el mensaje. Verificá que el bot sea administrador.`

    // Aviso de moderación independiente, sin citar el enlace original.
    await conn.sendMessage(chat, {
      text: aviso,
      mentions: [autor]
    })

  } catch (e) {
    console.error('[ANTICANAL] Error:', e)
  }
}

// ============================================================
// 📌 EXPORTACIÓN
// ============================================================

handler.command = ['anticanal']
handler.group = true

export default handler
