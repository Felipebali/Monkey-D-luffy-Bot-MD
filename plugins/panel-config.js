// 📂 plugins/grupo-configuracion.js
// ⚙️ PANEL DE CONFIGURACIÓN DEL GRUPO
// 🔗 Integrado con welcome.js PRO ULTRA
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
  ],

  welcomePhoto: [
    'welcomePhoto'
  ],

  welcomeGroupPhoto: [
    'welcomeGroupPhoto'
  ],

  welcomeMention: [
    'welcomeMention'
  ],

  welcomeAntiSpam: [
    'welcomeAntiSpam'
  ]

}


// ============================================================
// 🔎 OBTENER ESTADO
// ============================================================

function getChatValue(chat, key) {

  const keys =
    aliasMap[key]

  if (!keys) {
    return false
  }

  for (const k of keys) {

    if (
      chat[k] !== undefined
    ) {

      const value =
        chat[k]

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

  if (
    !isAdmin &&
    !isOwner
  ) {

    return m.reply(
      '🚫 Solo administradores pueden usar este panel.'
    )
  }


  // ==========================================================
  // 📂 BASE DE DATOS
  // ==========================================================

  if (
    !global.db ||
    !global.db.data
  ) {

    return m.reply(
      '❌ La base de datos no está disponible.'
    )
  }


  if (
    !global.db.data.chats
  ) {

    global.db.data.chats = {}
  }


  if (
    !global.db.data.chats[m.chat]
  ) {

    global.db.data.chats[m.chat] = {}
  }


  const chat =
    global.db.data.chats[m.chat]


  // ==========================================================
  // 📊 ESTADOS
  // ==========================================================

  const welcome =
    getChatValue(
      chat,
      'welcome'
    )

  const welcomePhoto =
    getChatValue(
      chat,
      'welcomePhoto'
    )

  const welcomeGroupPhoto =
    getChatValue(
      chat,
      'welcomeGroupPhoto'
    )

  const welcomeMention =
    getChatValue(
      chat,
      'welcomeMention'
    )

  const welcomeAntiSpam =
    getChatValue(
      chat,
      'welcomeAntiSpam'
    )


  // ==========================================================
  // 📋 PANEL
  // ==========================================================

  const panel = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃ ⚙️ *CONFIGURACIÓN DEL GRUPO*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📌 *Panel central de configuración*

Usá los comandos para cambiar cada
función. No necesitás escribir ON/OFF.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ *SEGURIDAD*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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


━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ *ADMINISTRACIÓN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎭 Evento del grupo
└─ ${status(getChatValue(chat, 'evento'))}
   └─ *.evento*

👑 Solo Administradores
└─ ${status(getChatValue(chat, 'onlyadmin'))}
   └─ *.modoadmin*


━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👋 *WELCOME / LEAVE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Sistema Welcome
└─ ${status(welcome)}
   └─ *.welcome*

🖼️ Foto del usuario
└─ ${status(welcomePhoto)}
   └─ *.welcomefoto*

🏠 Foto del grupo
└─ ${status(welcomeGroupPhoto)}
   └─ *.welcomegroup*

📢 Menciones
└─ ${status(welcomeMention)}
   └─ Configuración interna

🛡️ Anti-duplicados
└─ ${status(welcomeAntiSpam)}
   └─ Configuración interna


━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 *MENSAJES WELCOME*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Bienvenida personalizada
└─ *.set1 <mensaje>*

🎉 Alias de bienvenida
└─ *.setwelcome <mensaje>*

👋 Despedida personalizada
└─ *.set2 <mensaje>*

👋 Alias de despedida
└─ *.setleave <mensaje>*


━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 *PRUEBAS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Probar bienvenida
└─ *.testwelcome*

👋 Probar despedida
└─ *.testleave*

📊 Ver configuración
└─ *.welcomestatus*

🧹 Restaurar Welcome
└─ *.clearwel*


━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 *EXTRAS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎮 Juegos
└─ ${status(getChatValue(chat, 'juegos'))}
   └─ *.juegos*

🔞 NSFW
└─ ${status(getChatValue(chat, 'nsfw'))}
   └─ *.nsfw*


━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 *RESUMEN DE COMANDOS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡️ SEGURIDAD

🔗 .antilink
🌍 .antilink2
🚫 .antifake
🛡️ .antispam
⚡ .antitagall

🛠️ ADMINISTRACIÓN

🎭 .evento
👑 .modoadmin

👋 WELCOME

🎉 .welcome
🖼️ .welcomefoto
🏠 .welcomegroup

📝 MENSAJES

🎉 .set1
🎉 .setwelcome
👋 .set2
👋 .setleave

🧪 PRUEBAS

🧪 .testwelcome
🧪 .testleave
📊 .welcomestatus
🧹 .clearwel

🎮 EXTRAS

🎮 .juegos
🔞 .nsfw


━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 *IMPORTANTE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Los comandos funcionan como interruptor.

Ejemplo:

*.welcome*

🟢 Activado
⬇️
*.welcome*
⬇️
🔴 Desactivado

Lo mismo:

*.welcomefoto*

*.welcomegroup*

*.antilink*

*.antispam*

etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ *PANEL DE CONFIGURACIÓN*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim()


  // ==========================================================
  // 📤 ENVIAR
  // ==========================================================

  return m.reply(
    panel
  )
}


// ============================================================
// 📚 AYUDA
// ============================================================

handler.help = [

  'panel',
  'config',
  'configuracion',
  'configuración'

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
  'config',
  'configuracion',
  'configuración'

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
