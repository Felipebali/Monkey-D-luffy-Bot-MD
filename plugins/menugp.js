
/**
 * 📂 plugins/menugp.js
 * 🤖 WHATSAPP-BOT — MENÚ DE ADMINISTRADORES
 *
 * ✅ Diseño actualizado
 * ✅ Configuraciones del grupo
 * ✅ Estado de funciones
 * ✅ Comandos de moderación
 * ✅ Compatible con Baileys ES Modules
 */

const handler = async (
  m,
  {
    conn,
    usedPrefix = '.',
    isAdmin,
    isOwner,
    isROwner
  }
) => {
  try {
    if (!m.isGroup) {
      return m.reply(
        '❌ Este menú solo funciona en grupos.'
      )
    }

    if (!isAdmin && !isOwner && !isROwner) {
      return m.reply(
        '⛔ Solo los administradores pueden utilizar este menú.'
      )
    }

    // ========================================================
    // 🗃️ BASE DE DATOS
    // ========================================================

    global.db = global.db || {}
    global.db.data = global.db.data || {}
    global.db.data.chats =
      global.db.data.chats || {}

    const chat = global.db.data.chats[m.chat] || {}

    // ========================================================
    // ⚙️ ESTADOS
    // ========================================================

    const estado = (valor) =>
      valor ? '🟢 Activado' : '🔴 Desactivado'

    const bienvenida = estado(chat.welcome)
    const despedida = estado(chat.leave)
    const antifake = estado(chat.antifake)
    const antispam = estado(chat.antispam)
    const antilink = estado(chat.antilink)
    const juegos = estado(chat.juegos || chat.games)
    const autoFrase = estado(chat.autoFrase)
    const aprobar = estado(chat.aprobar)

    const p = usedPrefix

    // ========================================================
    // 📋 MENÚ
    // ========================================================

    const menuText = `
╭━━━〔 🤖 *WHATSAPP-BOT* 〕━━━╮
┃ 🛡️ *PANEL DE ADMINISTRADORES*
╰━━━━━━━━━━━━━━━━━━━━╯

╭─〔 👑 *ADMINISTRACIÓN* 〕
│
│ ${p}p @usuario
│ ↳ Promover a administrador
│
│ ${p}d @usuario
│ ↳ Quitar administrador
│
│ ${p}k @usuario
│ ↳ Expulsar usuario
│
╰────────────────────

╭─〔 🔐 *CONTROL DEL GRUPO* 〕
│
│ ${p}g
│ ↳ Abrir / cerrar grupo
│
│ ${p}aprobar
│ ↳ Activar aprobación automática
│
│ ${p}desaprobar
│ ↳ Desactivar aprobación automática
│
│ ${p}grupo-configuracion
│ ↳ Configurar funciones del grupo
│
╰────────────────────

╭─〔 🔇 *SILENCIAR USUARIOS* 〕
│
│ ${p}mute @usuario
│ ↳ Silenciar usuario
│
│ ${p}unmute @usuario
│ ↳ Quitar silencio
│
│ ${p}silenciar @usuario
│ ↳ Alias de mute
│
│ ${p}desilenciar @usuario
│ ↳ Alias de unmute
│
╰────────────────────

╭─〔 📢 *MENCIONES* 〕
│
│ ${p}tagall
│ ↳ Mencionar a todos
│
│ ${p}ht
│ ↳ Mención oculta
│
╰────────────────────

╭─〔 🧹 *MODERACIÓN* 〕
│
│ ${p}del
│ ↳ Eliminar mensaje citado
│
│ ${p}warn @usuario
│ ↳ Dar advertencia
│
│ ${p}unwarn @usuario
│ ↳ Quitar advertencia
│
│ ${p}warnlist
│ ↳ Ver usuarios advertidos
│
╰────────────────────

╭─〔 ⚙️ *ESTADO DEL GRUPO* 〕
│
│ 👋 Bienvenida: ${bienvenida}
│ 👋 Despedida: ${despedida}
│ 🛡️ Antifake: ${antifake}
│ 🚫 Antispam: ${antispam}
│ 🔗 Antilink: ${antilink}
│ 🎮 Juegos: ${juegos}
│ 💬 AutoFrase: ${autoFrase}
│ 📥 Aprobación: ${aprobar}
│
╰────────────────────

╭─〔 🐾 *WHATSAPP-BOT* 〕
│ 👑 Panel administrativo
│ 🛡️ Seguridad y moderación
╰━━━━━━━━━━━━━━━━━━━━
`.trim()

    // ========================================================
    // 📤 ENVIAR MENÚ
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        text: menuText
      },
      {
        quoted: m
      }
    )

  } catch (error) {
    console.error(
      '[MENUGP] Error:',
      error
    )

    await m.reply(
      '❌ Ocurrió un error al mostrar el menú de administradores.'
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = ['menugp']
handler.tags = ['group']
handler.command = /^(menugp)$/i

handler.group = true
handler.admin = true

export default handler
