// 📂 plugins/grupo-configuracion.js — Panel de configuración del grupo

// ============================================================
// 🔄 ALIAS DE CONFIGURACIÓN
// ============================================================

const aliasMap = {
  antifake: ["antifake", "antiFake"],
  antispam: ["antispam", "antiSpam"],
  antilink: ["antilink", "antiLink"],
  antilink2: ["antilink2", "antiLink2"],
  antitagall: ["tagallEnabled", "antitagall"],
  evento: ["evento", "detect"],
  onlyadmin: ["onlyadmin", "onlyAdmin", "soloAdmins", "modoadmin"],
  nsfw: ["nsfw"],
  juegos: ["juegos", "games"],
  welcome: ["welcome", "bienvenida"]
}

// ============================================================
// 🔎 OBTENER ESTADO
// ============================================================

function getChatValue(chat, key) {

  const keys = aliasMap[key]

  if (!keys) return false

  for (const k of keys) {

    if (chat[k] !== undefined) {

      return (
        chat[k] === true ||
        chat[k] === 1 ||
        chat[k] === 'on'
      )
    }
  }

  return false
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (m, { isAdmin, isOwner }) => {

  // ==========================================================
  // 👥 SOLO GRUPOS
  // ==========================================================

  if (!m.isGroup) {
    return m.reply(
      '⚠️ Este comando solo funciona en grupos.'
    )
  }

  // ==========================================================
  // 🛡️ SOLO ADMIN / OWNER
  // ==========================================================

  if (!isAdmin && !isOwner) {
    return m.reply(
      '🚫 Solo administradores pueden usar este panel.'
    )
  }

  // ==========================================================
  // 📂 DATOS DEL GRUPO
  // ==========================================================

  const chat =
    global.db?.data?.chats?.[m.chat] || {}

  // ==========================================================
  // 🟢 / 🔴 ESTADOS
  // ==========================================================

  const on = '🟢 ACTIVADO'
  const off = '🔴 DESACTIVADO'

  // ==========================================================
  // 📋 PANEL
  // ==========================================================

  const panel = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ ⚙️ *CONFIGURACIÓN DEL GRUPO*
╰━━━━━━━━━━━━━━━━━━━━━━╯

📌 *Usá los comandos para activar o desactivar cada función.*

━━━━━━━━━━━━━━━━━━━━━━
🛡️ *SEGURIDAD*
━━━━━━━━━━━━━━━━━━━━━━

🔗 AntiLink       » ${getChatValue(chat, 'antilink') ? on : off}

🌍 AntiLink Social » ${getChatValue(chat, 'antilink2') ? on : off}

🚫 AntiFake       » ${getChatValue(chat, 'antifake') ? on : off}

🛡️ AntiSpam       » ${getChatValue(chat, 'antispam') ? on : off}

⚡ AntiTagAll      » ${getChatValue(chat, 'antitagall') ? on : off}


━━━━━━━━━━━━━━━━━━━━━━
🛠️ *ADMINISTRACIÓN*
━━━━━━━━━━━━━━━━━━━━━━

🎭 Evento del grupo » ${getChatValue(chat, 'evento') ? on : off}

👑 Solo Admins      » ${getChatValue(chat, 'onlyadmin') ? on : off}


━━━━━━━━━━━━━━━━━━━━━━
👋 *BIENVENIDA*
━━━━━━━━━━━━━━━━━━━━━━

👋 Mensaje Welcome  » ${getChatValue(chat, 'welcome') ? on : off}


━━━━━━━━━━━━━━━━━━━━━━
🎮 *EXTRAS*
━━━━━━━━━━━━━━━━━━━━━━

🎮 Juegos           » ${getChatValue(chat, 'juegos') ? on : off}

🔞 NSFW             » ${getChatValue(chat, 'nsfw') ? on : off}


━━━━━━━━━━━━━━━━━━━━━━
📌 *COMANDOS DE CONFIGURACIÓN*
━━━━━━━━━━━━━━━━━━━━━━

🔗 .antilink
🌍 .antilink2
🛡️ .antispam
⚡ .antitagall
👑 .modoadmin
👋 .welcome
🎮 .juegos
🔞 .nsfw

━━━━━━━━━━━━━━━━━━━━━━
`.trim()

  // ==========================================================
  // 📤 ENVIAR PANEL
  // ==========================================================

  return m.reply(panel)
}

// ============================================================
// 📚 AYUDA
// ============================================================

handler.help = [
  'panel',
  'config'
]

// ============================================================
// 🏷️ CATEGORÍA
// ============================================================

handler.tags = [
  'group'
]

// ============================================================
// ⚙️ COMANDOS
// ============================================================

handler.command = [
  'panel',
  'config'
]

// ============================================================
// 👥 SOLO GRUPOS
// ============================================================

handler.group = true

export default handler
