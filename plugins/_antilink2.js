
/**
 * 📂 plugins/_antilink2.js
 * 🛡️ WHATSAPP-BOT — ANTILINK2 ACTIVABLE
 *
 * Comando:
 * .antilink2 → Activar / desactivar
 *
 * • Bloquea Instagram, TikTok y YouTube
 * • Elimina el mensaje y avisa al grupo
 * • NO expulsa al usuario
 * • Administradores, superadministradores y owners exentos
 * • Solo administradores y owners pueden cambiar el estado
 * • Configuración independiente por grupo
 * • Confirmaciones sin citar el comando
 */

import fs from 'fs'
import path from 'path'

const DIR = './database'
const FILE = path.join(DIR, 'antilink2.json')

// ============================================================
// ⚙️ CREAR CONFIGURACIÓN
// ============================================================

if (!fs.existsSync(DIR)) {
  fs.mkdirSync(DIR, { recursive: true })
}

if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, JSON.stringify({ grupos: {} }, null, 2))
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
    console.error('[ANTILINK2] Error leyendo configuración:', e)
    return { grupos: {} }
  }
}

function guardarConfig(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

// ============================================================
// 🔎 DETECTAR ENLACES
// ============================================================

const blockedLinks =
  /(instagram\.com|instagr\.am|tiktok\.com|youtube\.com|youtu\.be)/i

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
// 👤 IDENTIFICAR AUTOR
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

// ============================================================
// 👑 VERIFICAR OWNER
// ============================================================

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

        return (
          idTexto.includes('@s.whatsapp.net') &&
          autor.includes('@s.whatsapp.net') &&
          normalizarNumero(idTexto) === numeroAutor
        )
      })
    })

    return Boolean(
      participante?.admin === 'admin' ||
      participante?.admin === 'superadmin'
    )
  } catch (e) {
    console.error('[ANTILINK2] Error verificando administradores:', e)
    return false
  }
}

// ============================================================
// 🔘 COMANDO .ANTILINK2 — ACTIVAR / DESACTIVAR
// ============================================================

const handler = async (m, { conn }) => {
  const chat = m.chat || m.key?.remoteJid

  if (!chat || !chat.endsWith('@g.us')) {
    return m.reply('⚠️ Este comando solo funciona en grupos.')
  }

  const sender = m.sender || m.key?.participant

  if (!esOwner(sender) && !(await esAdmin(conn, chat, sender))) {
    return m.reply(
      '⛔ Solo los administradores del grupo o el owner pueden cambiar el AntiLink2.'
    )
  }

  const config = cargarConfig()
  const estadoActual = config.grupos[chat] === true
  const nuevoEstado = !estadoActual

  config.grupos[chat] = nuevoEstado

  try {
    guardarConfig(config)
  } catch (e) {
    console.error('[ANTILINK2] Error guardando configuración:', e)

    await conn.sendMessage(chat, {
      text: '❌ No se pudo guardar la configuración de AntiLink2.'
    })

    return
  }

  await conn.sendMessage(chat, {
    text: nuevoEstado
      ? '✅ *ANTILINK2 ACTIVADO*\n\n🚫 Se eliminarán los enlaces de Instagram, TikTok y YouTube.\n\n⚠️ Los usuarios recibirán un aviso, pero NO serán expulsados.'
      : '🔕 *ANTILINK2 DESACTIVADO*\n\nLos enlaces de Instagram, TikTok y YouTube ya no serán moderados.'
  })
}

// ============================================================
// 🚫 DETECTAR Y BORRAR MENSAJES
// ============================================================

handler.before = async function (m, { conn, isBotAdmin }) {
  try {
    if (!m?.isGroup || !m.message) return
    if (m.key?.fromMe || m.isBaileys) return
    if (!isBotAdmin) return

    const chat = m.chat || m.key?.remoteJid
    if (!chat || !chat.endsWith('@g.us')) return

    const config = cargarConfig()

    if (config.grupos[chat] !== true) return

    const texto = limpiarTexto(obtenerTexto(m))

    if (!texto || !blockedLinks.test(texto)) return

    const autor = obtenerAutor(m)

    if (!autor || !m.key?.id) return

    // 👑 Owners exentos
    if (esOwner(autor)) return

    // 🛡️ Administradores y superadministradores exentos
    if (await esAdmin(conn, chat, autor)) return

    // 🗑️ Eliminar mensaje; NO expulsar al usuario
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
      console.error('[ANTILINK2] Error borrando mensaje:', e)
    }

    // 📢 Aviso independiente, sin citar el mensaje original
    const aviso = borrado
      ? `⚠️ @${autor.split('@')[0]}, ese enlace de Instagram, TikTok o YouTube no está permitido.\n\n🗑️ Mensaje eliminado.`
      : `⚠️ @${autor.split('@')[0]}, ese enlace de Instagram, TikTok o YouTube no está permitido.\n\n❌ No pude eliminar el mensaje. Verificá que el bot sea administrador.`

    await conn.sendMessage(chat, {
      text: aviso,
      mentions: [autor]
    })

  } catch (e) {
    console.error('[ANTILINK2] Error en moderación:', e)
  }
}

// ============================================================
// 📌 EXPORTACIÓN
// ============================================================

handler.command = ['antilink2']
handler.group = true

export default handler
