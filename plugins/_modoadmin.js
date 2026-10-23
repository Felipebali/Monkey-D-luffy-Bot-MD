
/**
 * 📂 plugins/_modoadmin-filter.js
 * 🛡️ WHATSAPP-BOT — MODO ADMINISTRADOR
 *
 * .modoadmin → Activar / desactivar
 *
 * • Solo admins y owners pueden cambiar el estado
 * • Los usuarios normales no pueden ejecutar comandos
 *   mientras esté activado
 * • Comandos permitidos: .modoadmin, .menu y .bot
 * • Permite agregar comandos a chat.modoadminAllow
 */

// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {
  return (global.owner || [])
    .map(owner => Array.isArray(owner) ? owner[0] : owner)
    .filter(Boolean)
    .map(owner => String(owner).replace(/\D/g, ''))
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
  const number = normalizeJid(jid).replace(/\D/g, '')
  return getOwners().includes(number)
}

// ============================================================
// 🔘 COMANDO .MODOADMIN — ACTIVAR / DESACTIVAR
// ============================================================

let handler = async (m, { conn, isAdmin, isOwner }) => {
  try {
    if (!m.isGroup) {
      return m.reply('⚠️ Este comando solo funciona en grupos.')
    }

    const chat =
      global.db.data.chats[m.chat] ||
      (global.db.data.chats[m.chat] = {})

    const owner =
      isOwner || isGlobalOwner(m.sender)

    // Solo admins y owners pueden cambiarlo
    if (!owner && !isAdmin) {
      return m.reply(
        '⛔ Solo los administradores y owners pueden activar o desactivar el modo admin.'
      )
    }

    // Alternar estado
    chat.modoadmin = !chat.modoadmin

    return conn.sendMessage(m.chat, {
      text: chat.modoadmin
        ? '🔒 *MODO ADMIN ACTIVADO*\n\n🚫 Solo los administradores y owners pueden utilizar comandos.\n\n✅ Comandos permitidos para todos: .modoadmin, .menu y .bot'
        : '🔓 *MODO ADMIN DESACTIVADO*\n\n✅ Los usuarios pueden volver a utilizar los comandos normalmente.'
    })

  } catch (e) {
    console.error('❌ Error en comando modoadmin:', e)
    return m.reply('❌ Ocurrió un error al cambiar el modo admin.')
  }
}

handler.command = /^modoadmin$/i
handler.group = true

// ============================================================
// 🛡️ FILTRO GLOBAL DE COMANDOS
// ============================================================

handler.all = async function (m, { conn, isAdmin, isOwner }) {
  try {
    if (!m.isGroup) return
    if (m.key?.fromMe) return
    if (!m.text) return

    const chat = global.db?.data?.chats?.[m.chat]

    // Modo admin desactivado
    if (!chat?.modoadmin) return

    const body = String(m.text).trim()

    // Solo filtrar comandos con prefijo punto
    if (!body.startsWith('.')) return

    const command = body
      .slice(1)
      .trim()
      .split(/\s+/)[0]
      .toLowerCase()

    if (!command) return

    // Comandos permitidos aunque el modo admin esté activo
    const permitidosBase = [
      'modoadmin',
      'menu',
      'bot'
    ]

    const permitidosExtra =
      Array.isArray(chat.modoadminAllow)
        ? chat.modoadminAllow
            .map(x => String(x).toLowerCase().trim())
            .filter(Boolean)
        : []

    const permitidos = [
      ...new Set([...permitidosBase, ...permitidosExtra])
    ]

    if (permitidos.includes(command)) return

    // Owners con acceso total
    if (isOwner || isGlobalOwner(m.sender)) return

    // Administradores con acceso total
    if (isAdmin) return

    // Bloquear al usuario normal
    await conn.sendMessage(m.chat, {
      text:
        `🚫 *MODO ADMIN ACTIVADO*\n\n` +
        `👑 Solo los administradores pueden utilizar comandos.\n\n` +
        `⛔ Comando bloqueado: *.${command}*\n\n` +
        `💡 Pedile a un administrador que desactive el modo admin.`,
      mentions: [m.sender]
    })

    // Detiene el procesamiento si el cargador respeta el retorno true
    return true

  } catch (e) {
    console.error('❌ Error en filtro modoadmin:', e)
  }
}

// ============================================================
// 📌 EXPORTACIÓN
// ============================================================

handler.help = ['modoadmin']
handler.tags = ['group']
handler.command = /^modoadmin$/i
handler.group = true

export default handler
