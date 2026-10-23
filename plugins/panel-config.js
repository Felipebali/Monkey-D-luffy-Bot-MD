
/**
 * 📂 plugins/grupo-configuracion.js
 * ⚙️ WHATSAPP-BOT — PANEL DE CONFIGURACIÓN DEL GRUPO
 */

import fs from 'fs'
import path from 'path'

// ============================================================
// 🔄 ALIAS DE CONFIGURACIÓN
// ============================================================

const aliasMap = {
  antifake: ['antifake', 'antiFake'],
  antispam: ['antispam', 'antiSpam'],
  antilink: ['antilink', 'antiLink'],
  antilink2: ['antilink2', 'antiLink2'],
  antitagall: ['tagallEnabled', 'antitagall'],
  evento: ['evento', 'detect'],
  onlyadmin: ['onlyadmin', 'onlyAdmin', 'soloAdmins', 'modoadmin'],
  nsfw: ['nsfw'],
  juegos: ['juegos', 'games'],
  welcome: ['welcome', 'bienvenida']
}

// ============================================================
// 📁 ARCHIVOS DE CONFIGURACIÓN
// ============================================================

const antiestadoFile = path.join('./database', 'antiestado.json')
const anticanalFile = path.join('./database', 'anticanal.json')
const antilink2File = path.join('./database', 'antilink2.json')

// ============================================================
// 🛡️ ANTIESTADO
// Formato esperado: { "ID_DEL_GRUPO@g.us": true }
// ============================================================

function getAntiEstadoValue(groupJid) {
  try {
    if (!fs.existsSync(antiestadoFile)) return false

    const data = JSON.parse(
      fs.readFileSync(antiestadoFile, 'utf8')
    )

    return data[groupJid] === true
  } catch (error) {
    console.error('[PANEL] Error leyendo antiestado.json:', error)
    return false
  }
}

// ============================================================
// 📢 ANTICANAL
// Formato esperado: { "grupos": { "ID_DEL_GRUPO@g.us": true } }
// ============================================================

function getAntiCanalValue(groupJid) {
  try {
    if (!fs.existsSync(anticanalFile)) return false

    const data = JSON.parse(
      fs.readFileSync(anticanalFile, 'utf8')
    )

    return data.grupos?.[groupJid] === true
  } catch (error) {
    console.error('[PANEL] Error leyendo anticanal.json:', error)
    return false
  }
}

// ============================================================
// 🌍 ANTILINK2 — ENLACES SOCIALES
// Formato esperado: { "grupos": { "ID_DEL_GRUPO@g.us": true } }
// ============================================================

function getAntiLink2Value(groupJid) {
  try {
    if (!fs.existsSync(antilink2File)) return false

    const data = JSON.parse(
      fs.readFileSync(antilink2File, 'utf8')
    )

    return data.grupos?.[groupJid] === true
  } catch (error) {
    console.error('[PANEL] Error leyendo antilink2.json:', error)
    return false
  }
}

// ============================================================
// 🔎 OBTENER ESTADO DESDE LA BASE DE DATOS
// ============================================================

function getChatValue(chat, key) {
  const keys = aliasMap[key]

  if (!keys) return false

  for (const k of keys) {
    if (chat[k] !== undefined) {
      const value = chat[k]

      if (
        value === true ||
        value === 1 ||
        value === '1' ||
        value === 'on' ||
        value === 'true' ||
        value === 'activo' ||
        value === 'activado'
      ) {
        return true
      }

      if (
        value === false ||
        value === 0 ||
        value === '0' ||
        value === 'off' ||
        value === 'false' ||
        value === 'desactivado'
      ) {
        return false
      }
    }
  }

  return false
}

// ============================================================
// 🟢 / 🔴 MOSTRAR ESTADO
// ============================================================

function status(value) {
  return value ? '🟢 ACTIVADO' : '🔴 DESACTIVADO'
}

// ============================================================
// 🚀 HANDLER DEL PANEL
// ============================================================

const handler = async (m, { isAdmin, isOwner }) => {
  if (!m.isGroup) {
    return m.reply('⚠️ Este comando solo funciona en grupos.')
  }

  if (!isAdmin && !isOwner) {
    return m.reply('🚫 Solo administradores pueden usar este panel.')
  }

  if (!global.db?.data) {
    return m.reply('❌ La base de datos no está disponible.')
  }

  if (!global.db.data.chats) {
    global.db.data.chats = {}
  }

  if (!global.db.data.chats[m.chat]) {
    global.db.data.chats[m.chat] = {}
  }

  const chat = global.db.data.chats[m.chat]

  // Leer estados de archivos independientes
  const antiestado = getAntiEstadoValue(m.chat)
  const anticanal = getAntiCanalValue(m.chat)
  const antilink2 = getAntiLink2Value(m.chat)

  const panel = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ ⚙️ *CONFIGURACIÓN DEL GRUPO*
╰━━━━━━━━━━━━━━━━━━━━━━╯

📌 *Usá los comandos para activar o desactivar cada función.*

━━━━━━━━━━━━━━━━━━━━━━
🛡️ *SEGURIDAD*
━━━━━━━━━━━━━━━━━━━━━━

🔗 AntiLink
└─ ${status(getChatValue(chat, 'antilink'))}
   └─ *.antilink*

🌍 AntiLink Social
└─ ${status(antilink2)}
   └─ *.antilink2*

🚫 AntiFake
└─ ${status(getChatValue(chat, 'antifake'))}
   └─ *.antifake*

🛡️ AntiSpam
└─ ${status(getChatValue(chat, 'antispam'))}
   └─ *.antispam*

⚡ AntiTagAll
└─ ${status(getChatValue(chat, 'antitagall'))}
   └─ *.antitagall*

🚨 AntiEstado
└─ ${status(antiestado)}
   └─ *.antiestado*

📢 AntiCanal
└─ ${status(anticanal)}
   └─ *.anticanal*

━━━━━━━━━━━━━━━━━━━━━━
🛠️ *ADMINISTRACIÓN*
━━━━━━━━━━━━━━━━━━━━━━

🎭 Evento del grupo
└─ ${status(getChatValue(chat, 'evento'))}
   └─ *.evento*

👑 Solo Administradores
└─ ${status(getChatValue(chat, 'onlyadmin'))}
   └─ *.modoadmin*

━━━━━━━━━━━━━━━━━━━━━━
👋 *WELCOME / LEAVE*
━━━━━━━━━━━━━━━━━━━━━━

🎉 Welcome
└─ ${status(getChatValue(chat, 'welcome'))}
   └─ *.welcome*

━━━━━━━━━━━━━━━━━━━━━━
🎮 *EXTRAS*
━━━━━━━━━━━━━━━━━━━━━━

🎮 Juegos
└─ ${status(getChatValue(chat, 'juegos'))}
   └─ *.juegos*

🔞 NSFW
└─ ${status(getChatValue(chat, 'nsfw'))}
   └─ *.nsfw*

━━━━━━━━━━━━━━━━━━━━━━
📌 *COMANDOS DE CONFIGURACIÓN*
━━━━━━━━━━━━━━━━━━━━━━

🔗 .antilink
🌍 .antilink2
🚫 .antifake
🛡️ .antispam
⚡ .antitagall
🚨 .antiestado
📢 .anticanal

🎭 .evento
👑 .modoadmin
👋 .welcome
🎮 .juegos
🔞 .nsfw

━━━━━━━━━━━━━━━━━━━━━━
💡 *FUNCIONAMIENTO*
━━━━━━━━━━━━━━━━━━━━━━

Los comandos funcionan como interruptor.

Ejemplo:

*.welcome*
🟢 ACTIVADO

Volvés a usar:

*.welcome*
🔴 DESACTIVADO

━━━━━━━━━━━━━━━━━━━━━━
⚙️ *PANEL DE CONFIGURACIÓN*
━━━━━━━━━━━━━━━━━━━━━━
`.trim()

  return m.reply(panel)
}

// ============================================================
// 📚 AYUDA Y COMANDOS
// ============================================================

handler.help = ['panel', 'config']
handler.tags = ['grupo']
handler.command = ['panel', 'config']
handler.group = true
handler.admin = true

export default handler
