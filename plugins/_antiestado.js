// 📂 plugins/antiestado.js
// 🤖 WHATSAPP-BOT — ANTIESTADO
// Comandos: .antiestado
// Activa/desactiva la protección por grupo.

import fs from 'fs'
import path from 'path'

const ARCHIVO = path.resolve('./database/antiestado.json')

function leerConfig() {
  try {
    if (!fs.existsSync(ARCHIVO)) {
      fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true })
      fs.writeFileSync(ARCHIVO, '{}', 'utf8')
    }

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
  return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

// Envía el aviso al grupo
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
    console.error('[ANTIESTADO] No se pudo enviar el aviso:', error)
  }
}

const handler = async (m, { conn, command, isAdmin, isOwner, participants }) => {
  if (!m.isGroup) {
    return m.reply('❌ Este comando solo funciona en grupos.')
  }

  const config = leerConfig()
  const grupo = m.chat

  // Activar/desactivar
  if (command === 'antiestado') {
    if (!isAdmin && !isOwner) {
      return m.reply('⛔ Solo los administradores del grupo pueden usar este comando.')
    }

    config[grupo] = !config[grupo]
    guardarConfig(config)

    return m.reply(
      config[grupo]
        ? '✅ *ANTIESTADO ACTIVADO*\n\n🛡️ La protección quedó activada en este grupo.'
        : '❌ *ANTIESTADO DESACTIVADO*\n\nLa protección quedó desactivada en este grupo.'
    )
  }
}

// Escucha mensajes de estado mencionando grupos.
// La detección de estados requiere que el bot reciba los eventos de WhatsApp Status.
handler.all = async function (m) {
  try {
    if (!m || m.fromMe) return
    if (m.chat !== 'status@broadcast') return

    const config = leerConfig()
    const conn = global.conn || this

    if (!conn) return

    const senderJid = m.sender || m.key?.participant || m.key?.remoteJid
    if (!senderJid) return

    // Obtener los grupos que están protegidos.
    const gruposActivos = Object.keys(config).filter(grupo => config[grupo] === true)
    if (!gruposActivos.length) return

    const texto = String(
      m.text ||
      m.message?.extendedTextMessage?.text ||
      m.message?.imageMessage?.caption ||
      m.message?.videoMessage?.caption ||
      ''
    )

    const menciones =
      m.mentionedJid ||
      m.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
      m.message?.imageMessage?.contextInfo?.mentionedJid ||
      m.message?.videoMessage?.contextInfo?.mentionedJid ||
      []

    for (const grupoJid of gruposActivos) {
      const coincide = menciones.some(jid => {
        const normalizado = conn.decodeJid?.(jid) || jid
        return normalizado === grupoJid
      }) || texto.includes(grupoJid)

      if (coincide) {
        await sendWarning(conn, grupoJid, senderJid)
      }
    }
  } catch (error) {
    console.error('[ANTIESTADO] Error procesando estado:', error)
  }
}

handler.help = ['antiestado']
handler.tags = ['group']
handler.command = ['antiestado']
handler.group = true
handler.admin = true

export default handler
