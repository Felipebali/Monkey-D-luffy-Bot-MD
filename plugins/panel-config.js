// 📂 plugins/grupo-configuracion.js
// ⚙️ PANEL DE CONFIGURACIÓN DEL GRUPO
// ============================================================

// ============================================================
// 🔄 ALIAS DE CONFIGURACIÓN
// ============================================================

const aliasMap = {

  antifake: [
    'antifake',
    'antiFake'
  ],

  antispam: [
    'antispam',
    'antiSpam'
  ],

  antilink: [
    'antilink',
    'antiLink'
  ],

  antilink2: [
    'antilink2',
    'antiLink2'
  ],

  antitagall: [
    'tagallEnabled',
    'antitagall'
  ],

  evento: [
    'evento',
    'detect'
  ],

  onlyadmin: [
    'onlyadmin',
    'onlyAdmin',
    'soloAdmins',
    'modoadmin'
  ],

  nsfw: [
    'nsfw'
  ],

  juegos: [
    'juegos',
    'games'
  ],

  welcome: [
    'welcome',
    'bienvenida'
  ]

}

// ============================================================
// 🔎 OBTENER ESTADO
// ============================================================

function getChatValue(chat, key) {

  const keys = aliasMap[key]

  if (!keys) return false

  for (const k of keys) {

    if (chat[k] !== undefined) {

      const value = chat[k]

      return (
        value === true ||
        value === 1 ||
        value === '1' ||
        value === 'on' ||
        value === 'true' ||
        value === 'activo' ||
        value === 'activado'
      )
    }
  }

  return false
}

// ============================================================
// 🟢 / 🔴 ESTADO
// ============================================================

function status(value) {

  return value
    ? '🟢 ACTIVADO'
    : '🔴 DESACTIVADO'
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (
  m,
  {
    isAdmin,
    isOwner
  }
) => {

  // ==========================================================
  // 👥 SOLO GRUPOS
  // ==========================================================

  if (!m.isGroup) {

    return m.reply(
      '⚠️ Este comando solo funciona en grupos.'
    )
  }

  // ==========================================================
  // 🛡️ ADMIN / OWNER
  // ==========================================================

  if (!isAdmin && !isOwner) {

    return m.reply(
      '🚫 Solo administradores pueden usar este panel.'
    )
  }

  // ==========================================================
  // 📂 BASE DE DATOS
  // ==========================================================

  if (!global.db?.data) {

    return m.reply(
      '❌ La base de datos no está disponible.'
    )
  }

  if (!global.db.data.chats) {
    global.db.data.chats = {}
  }

  if (!global.db.data.chats[m.chat]) {
    global.db.data.chats[m.chat] = {}
  }

  const chat =
    global.db.data.chats[m.chat]

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

🔗 AntiLink
└─ ${status(getChatValue(chat, 'antilink'))}
   └─ *.antilink*

🌍 AntiLink Social
└─ ${status(getChatValue(chat, 'antilink2'))}
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

🎭 .evento
👑 .modoadmin

👋 .welcome

🎮 .juegos
🔞 .nsfw

━━━━━━━━━━━━━━━━━━━━━━
💡 *FUNCIONAMIENTO*

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
  'grupo'
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

// ============================================================
// 👮 SOLO ADMIN
// ============================================================

handler.admin = true

// ============================================================
// 📤 EXPORT
// ============================================================

export default handler
