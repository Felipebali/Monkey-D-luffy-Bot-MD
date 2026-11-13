
/**
 * 📂 plugins/menugp.js
 * 🤖 WHATSAPP-BOT — MENÚ DE ADMINISTRADORES
 *
 * ✅ Menú organizado
 * ✅ Comandos de administración
 * ✅ Moderación y seguridad
 * ✅ Sin estados del grupo
 * ✅ Baileys ES Modules
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

    const p = usedPrefix

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

╭─〔 🐾 *WHATSAPP-BOT* 〕
│ 👑 Panel administrativo
│ 🛡️ Seguridad y moderación
╰━━━━━━━━━━━━━━━━━━━━
`.trim()

    await conn.sendMessage(
      m.chat,
      { text: menuText },
      { quoted: m }
    )

  } catch (error) {
    console.error('[MENUGP] Error:', error)

    await m.reply(
      '❌ Ocurrió un error al mostrar el menú de administradores.'
    )
  }
}

handler.help = ['menugp']
handler.tags = ['group']
handler.command = /^(menugp)$/i

handler.group = true
handler.admin = true

export default handler
