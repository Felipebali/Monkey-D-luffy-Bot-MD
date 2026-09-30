// 📂 plugins/_modoadmin-filter.js
// 🛡️ FELIXCAT BOT — MODO ADMINISTRADOR
// 🔒 Bloquea comandos para usuarios que no sean Admin/Owner

// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {

  return (global.owner || [])
    .map(owner =>
      Array.isArray(owner)
        ? owner[0]
        : owner
    )
    .filter(Boolean)
    .map(owner =>
      String(owner)
        .replace(/\D/g, '')
    )
    .filter(Boolean)
}

// ============================================================
// 🔐 NORMALIZAR JID
// ============================================================

function normalizeJid(jid) {

  if (!jid) return ''

  return String(jid)
    .replace(/:\d+@/, '@')
    .trim()
}

// ============================================================
// 👑 COMPROBAR OWNER
// ============================================================

function isGlobalOwner(jid) {

  const number =
    normalizeJid(jid)
      .replace(/\D/g, '')

  return getOwners()
    .includes(number)
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (
  m,
  {
    conn,
    isAdmin,
    isOwner
  }
) => {

  try {

    // ========================================================
    // 👥 SOLO GRUPOS
    // ========================================================

    if (!m.isGroup) return

    // ========================================================
    // 📂 DATOS DEL GRUPO
    // ========================================================

    const chat =
      global.db?.data?.chats?.[m.chat]

    if (!chat) return

    // ========================================================
    // 🔘 MODO ADMIN DESACTIVADO
    // ========================================================

    if (!chat.modoadmin) return

    // ========================================================
    // 📝 OBTENER TEXTO
    // ========================================================

    if (!m.text) return

    const body =
      String(m.text).trim()

    if (!body) return

    // ========================================================
    // 🔎 SOLO COMANDOS
    // ========================================================

    if (!body.startsWith('.')) return

    // ========================================================
    // 🧹 LIMPIAR COMANDO
    // ========================================================

    const command =
      body
        .slice(1)
        .trim()
        .split(/\s+/)[0]
        .toLowerCase()

    if (!command) return

    // ========================================================
    // 📋 COMANDOS PERMITIDOS
    // ========================================================
    //
    // Estos funcionan aunque Modo Admin esté activo.
    //
    // Se pueden agregar comandos desde:
    //
    // chat.modoadminAllow = ['menu', 'bot']
    //
    // ========================================================

    const permitidosBase = [
      'modoadmin',
      'menu',
      'bot'
    ]

    const permitidosExtra =
      Array.isArray(chat.modoadminAllow)
        ? chat.modoadminAllow
            .map(x =>
              String(x)
                .toLowerCase()
                .trim()
            )
            .filter(Boolean)
        : []

    const permitidos = [
      ...new Set([
        ...permitidosBase,
        ...permitidosExtra
      ])
    ]

    // ========================================================
    // ✅ COMANDO PERMITIDO
    // ========================================================

    if (
      permitidos.includes(command)
    ) {
      return
    }

    // ========================================================
    // 👑 OWNER → ACCESO TOTAL
    // ========================================================

    const globalOwner =
      isGlobalOwner(m.sender)

    if (
      isOwner ||
      globalOwner
    ) {
      return
    }

    // ========================================================
    // 🛡️ ADMIN → ACCESO TOTAL
    // ========================================================

    if (isAdmin) {
      return
    }

    // ========================================================
    // 🚫 USUARIO NORMAL → BLOQUEAR
    // ========================================================

    await conn.reply(
      m.chat,
`🚫 *MODO ADMIN ACTIVADO*

━━━━━━━━━━━━━━━━━━

👑 Solo los administradores pueden utilizar comandos.

⛔ *Comando bloqueado:*
*.${command}*

━━━━━━━━━━━━━━━━━━

💡 Si necesitás utilizar un comando, pedile a un administrador que desactive el modo admin.`,
      m
    )

    // ========================================================
    // 🔥 BLOQUEO REAL
    // ========================================================

    return true

  } catch (e) {

    console.error(
      '❌ Error en _modoadmin-filter:',
      e
    )

    return
  }
}

// ============================================================
// ⚙️ LOADER
// ============================================================

handler.all = true

export default handler
