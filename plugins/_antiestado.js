// 📂 plugins/antiestado.js
// 🤖 WHATSAPP-BOT — ANTIESTADO
// Comando: .antiestado
// Configuración independiente por grupo

import fs from 'fs'
import path from 'path'

const ARCHIVO = path.resolve('./database/antiestado.json')

// ============================================================
// 📁 CONFIGURACIÓN
// ============================================================

function leerConfig() {
  try {
    if (!fs.existsSync(ARCHIVO)) return {}

    return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'))
  } catch (error) {
    console.error('[ANTIESTADO] Error leyendo configuración:', error)
    return {}
  }
}

function guardarConfig(config) {
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true })
  fs.writeFileSync(ARCHIVO, JSON.stringify(config, null, 2), 'utf8')
}

function digits(jid = '') {
  return String(jid)
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

// ============================================================
// 👑 ADMINISTRADORES Y OWNERS
// ============================================================

function esAdminOOwner(m) {
  if (m.isAdmin || m.isOwner || m.isROwner) return true

  const sender = digits(m.sender)
  const owners = Array.isArray(global.owner) ? global.owner : []

  return owners.some(owner => {
    const valor = Array.isArray(owner) ? owner[0] : owner
    return digits(valor) === sender && sender !== ''
  })
}

// ============================================================
// 🚫 AVISO AL GRUPO
// ============================================================

async function sendWarning(conn, groupJid, senderJid) {
  try {
    await conn.sendMessage(groupJid, {
      text: `╭━━━〔 🚫 ANTIESTADO 〕━━━⬣

⚠️ Atención: @${digits(senderJid)}

📢 *No se permiten estados mencionando a este grupo.*

🛡️ Por favor, respetá las reglas del grupo y evitá publicar estados que lo mencionen.

╰━━━━━━━━━━━━━━━━⬣
        💜 WHATSAPP-BOT`,
      mentions: [senderJid]
    })

    console.log('[ANTIESTADO] Aviso enviado al grupo.')
  } catch (error) {
    console.error('[ANTIESTADO] Error enviando el aviso:', error)
  }
}

// ============================================================
// ⚙️ ACTIVAR / DESACTIVAR
// ============================================================

const handler = async (m, { conn }) => {
  if (!m.isGroup) {
    return m.reply('❌ Este comando solo funciona en grupos.')
  }

  if (!esAdminOOwner(m)) {
    return m.reply('⛔ Solo los administradores pueden cambiar esta configuración.')
  }

  const config = leerConfig()
  const grupo = m.chat

  config[grupo] = config[grupo] !== true
  guardarConfig(config)

  // Sin quoted: no cita el comando .antiestado.
  await conn.sendMessage(m.chat, {
    text: config[grupo]
      ? '✅ *ANTIESTADO ACTIVADO*\n\n🛡️ Se vigilarán las menciones de estados detectables en este grupo.'
      : '❌ *ANTIESTADO DESACTIVADO*\n\nLa protección quedó desactivada.'
  })
}

// ============================================================
// 🔎 DETECTAR GROUP STATUS MENTION
// ============================================================

handler.all = async function (m) {
  try {
    if (!m || !m.isGroup || m.fromMe) return

    const conn = global.conn || this
    if (!conn?.sendMessage) return

    const config = leerConfig()
    if (config[m.chat] !== true) return

    const mensaje = m.message || {}

    const tipo = String(
      m.mtype ||
      Object.keys(mensaje)[0] ||
      ''
    ).toLowerCase()

    const esMencionEstado =
      tipo.includes('groupstatusmention') ||
      Boolean(mensaje.groupStatusMentionMessage) ||
      Boolean(mensaje.groupStatusMention)

    if (!esMencionEstado) return

    const senderJid =
      m.sender ||
      m.key?.participant ||
      m.key?.remoteJid

    if (!senderJid) return

    // Intentar eliminar el mensaje de mención del grupo.
    // Esto no elimina el estado original de WhatsApp.
    let eliminado = false

    try {
      if (m.key?.id && m.key?.remoteJid === m.chat) {
        await conn.sendMessage(m.chat, {
          delete: m.key
        })

        eliminado = true
      }
    } catch (error) {
      console.error(
        '[ANTIESTADO] No se pudo eliminar el mensaje:',
        error.message || error
      )
    }

    await sendWarning(conn, m.chat, senderJid)

    console.log(
      `[ANTIESTADO] Mención detectada. Mensaje eliminado: ${eliminado}`
    )
  } catch (error) {
    console.error('[ANTIESTADO] Error procesando mensaje:', error)
  }
}

// ============================================================
// ⚙️ COMANDOS
// ============================================================

handler.help = ['antiestado']
handler.tags = ['group']
handler.command = ['antiestado']
handler.group = true
handler.admin = true

export default handler
