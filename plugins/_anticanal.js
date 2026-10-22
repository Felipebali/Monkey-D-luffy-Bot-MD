
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
 * Borra el mensaje y avisa al grupo.
 * No exceptúa administradores ni owner al detectar enlaces.
 * Solo administradores y owner pueden cambiar la configuración.
 */

import fs from 'fs'
import path from 'path'

const DIR = './database'
const FILE = path.join(DIR, 'anticanal.json')

if (!fs.existsSync(DIR)) {
  fs.mkdirSync(DIR, { recursive: true })
}

if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, JSON.stringify({ grupos: {} }, null, 2))
}

function cargarConfig() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    if (!data.grupos) data.grupos = {}
    return data
  } catch (e) {
    console.error('[ANTICANAL] Error leyendo configuración:', e)
    return { grupos: {} }
  }
}

function guardarConfig(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

function limpiarTexto(texto) {
  return String(texto || '')
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .replace(/[：]/g, ':')
    .replace(/[．。]/g, '.')
    .replace(/[\u2024\u2025\u2215\u2044]/g, '/')
}

const CANAL_REGEX =
  /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/channel(?:\/[^\s<>"']*)?/i

function obtenerTexto(m) {
  const msg = m.message || {}
  const contenido =
    msg.ephemeralMessage?.message ||
    msg.viewOnceMessage?.message ||
    msg.viewOnceMessageV2?.message ||
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

function obtenerAutor(m) {
  return m.key?.participant || m.participant || m.sender || ''
}

function esOwner(sender) {
  const numero = String(sender || '').split('@')[0].split(':')[0]

  return (global.owner || []).some(owner => {
    const id = Array.isArray(owner) ? owner[0] : owner
    return String(id || '').replace(/\D/g, '') === numero.replace(/\D/g, '')
  })
}

async function esAdmin(conn, chat, sender) {
  try {
    const metadata = await conn.groupMetadata(chat)
    const participante = metadata.participants.find(p => {
      const ids = [p.id, p.jid, p.lid].filter(Boolean)
      return ids.some(id => {
        const a = String(id).split(':')[0]
        const b = String(sender).split(':')[0]
        return a === b ||
          (a.includes('@s.whatsapp.net') &&
           b.includes('@s.whatsapp.net') &&
           a.split('@')[0] === b.split('@')[0])
      })
    })

    return Boolean(
      participante?.admin === 'admin' ||
      participante?.admin === 'superadmin'
    )
  } catch (e) {
    console.error('[ANTICANAL] No se pudieron verificar administradores:', e)
    return false
  }
}

const handler = async (m, { conn, command, args }) => {
  const chat = m.chat || m.key?.remoteJid

  if (!chat || !chat.endsWith('@g.us')) {
    return m.reply('⚠️ Este comando solo funciona en grupos.')
  }

  const sender = m.sender || m.key?.participant
  const config = cargarConfig()
  const subcomando = String(args?.[0] || '').toLowerCase()

  // ACTIVAR / DESACTIVAR
  if (command === 'anticanal') {
    if (!esOwner(sender) && !(await esAdmin(conn, chat, sender))) {
      return m.reply(
        '⛔ Solo los administradores del grupo o el owner pueden cambiar el anticanal.'
      )
    }

    const estadoActual = config.grupos[chat] === true
    let nuevoEstado

    if (['on', 'activar', 'activado', 'si', 'sí'].includes(subcomando)) {
      nuevoEstado = true
    } else if (['off', 'desactivar', 'desactivado', 'no'].includes(subcomando)) {
      nuevoEstado = false
    } else {
      nuevoEstado = !estadoActual
    }

    config.grupos[chat] = nuevoEstado
    guardarConfig(config)

    return m.reply(
      nuevoEstado
        ? '✅ Anticanal ACTIVADO.\n\n🚫 Se eliminarán los mensajes que contengan enlaces de canales de WhatsApp.'
        : '🔕 Anticanal DESACTIVADO.\n\nLos enlaces de canales de WhatsApp ya no serán bloqueados.'
    )
  }
}

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

    let borrado = false

    try {
      await conn.sendMessage(chat, {
        delete: {
          remoteJid: chat,
          fromMe: Boolean(m.key.fromMe),
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
      : `🚫 @${autor.split('@')[0]}, no se permiten enlaces de canales de WhatsApp en este grupo.\n\n⚠️ No pude eliminar el mensaje. Verificá los permisos del bot.`

    await conn.sendMessage(chat, {
      text: aviso,
      mentions: [autor]
    })
  } catch (e) {
    console.error('[ANTICANAL] Error:', e)
  }
}

handler.command = ['anticanal']
handler.group = true

export default handler
