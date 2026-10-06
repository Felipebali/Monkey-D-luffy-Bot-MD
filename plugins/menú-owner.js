// 📂 plugins/menu-owner.js
// 👑 PANEL DEL OWNER — WhatsApp-Bot
// ============================================================

let handler = async (m, { conn }) => {

  try {

    // ==========================================================
    // 👑 REACCIÓN
    // ==========================================================

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: '👑',
          key: m.key
        }
      }
    )

    // ==========================================================
    // 📅 FECHA Y HORA
    // ==========================================================

    const fecha = new Date().toLocaleString('es-UY', {
      timeZone: 'America/Montevideo',
      hour12: false
    })

    // ==========================================================
    // 📋 MENÚ
    // ==========================================================

    const menuText = `
╭━━━〔 👑 *PANEL DEL OWNER* 〕━━━╮
┃ 🤖 *WhatsApp-Bot*
┃ 🛡️ Centro de control administrativo
┃ 📆 ${fecha}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 🖼️ MULTIMEDIA / PERFIL 〕━━╮

┃ 🧑‍💻 *.gpu @user*
┃ └─ Obtener foto de perfil del usuario

┃ 🏞️ *.gpo*
┃ └─ Obtener foto de perfil del grupo

┃ 🤖 *.setpp*
┃ └─ Cambiar foto de perfil del bot

┃ 👥 *.setpg*
┃ └─ Cambiar foto del grupo

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━〔 🎖️ SISTEMA DE INSIGNIAS 〕━━╮

┃ 🏅 *.otorgar @user <insignia>*
┃ └─ Otorgar una insignia

┃ ❌ *.quitar @user <número>*
┃ └─ Quitar una insignia por número

┃ 📋 *.verinsignias @user*
┃ └─ Ver las insignias del usuario

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━〔 🚨 ADVERTENCIAS DE ADMINS 〕━━╮

┃ ⚠️ *.admad @admin <motivo>*
┃ └─ Dar una advertencia

┃ 🟢 *.unadmad @admin*
┃ └─ Quitar la última advertencia

┃ 📋 *.listadmad*
┃ └─ Ver administradores advertidos

┃ 🔎 *.veradmad @admin*
┃ └─ Ver historial completo

┃ 🧹 *.clearadmad*
┃ └─ Limpiar todas las advertencias

┃
┃ 🚨 *Límite: 3 advertencias*
┃ └─ 3/3 → Despromoción automática

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━〔 🚫 LISTA NEGRA 〕━━╮

┃ 🚫 *.ln @user*
┃ └─ Agregar usuario a la lista negra

┃ ✅ *.unln @user*
┃ └─ Quitar usuario de la lista negra

┃ 📋 *.vln*
┃ └─ Ver lista negra

┃ 🗑️ *.clrn*
┃ └─ Limpiar lista negra

┃ 🔄 *.resetuser @user*
┃ └─ Reiniciar datos del usuario

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━〔 ⚙️ CONTROL DEL BOT 〕━━╮

┃ 🔁 *.restart*
┃ └─ Reiniciar WhatsApp-Bot

┃ 🆙 *.update*
┃ └─ Actualizar el bot

┃ 💻 *.exec*
┃ └─ Ejecutar código

┃ 💻 *.exec2*
┃ └─ Ejecutar código avanzado

┃ ⚙️ *.setcmd*
┃ └─ Configurar comandos

┃ ✏️ *.setprefix*
┃ └─ Cambiar prefijo del bot

┃ 👑 *.dsowner*
┃ └─ Gestionar propietario

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━〔 👥 CONTROL DE GRUPOS 〕━━╮

┃ 🔗 *.join <link>*
┃ └─ Unirse a un grupo

┃ ♻️ *.resetlink*
┃ └─ Restablecer enlace del grupo

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━〔 🛡️ ADMINISTRACIÓN 〕━━╮

┃ 👑 *Acceso exclusivo Owner*
┃
┃ 🔐 Este panel contiene comandos
┃ de administración avanzada.
┃
┃ ⚠️ Algunos comandos pueden afectar
┃ directamente al funcionamiento del bot.

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━〔 📚 RESUMEN RÁPIDO 〕━━╮

┃ 🎖️ INSIGNIAS
┃ ├─ .otorgar
┃ ├─ .quitar
┃ └─ .verinsignias
┃
┃ 🚨 ADVERTENCIAS
┃ ├─ .admad
┃ ├─ .unadmad
┃ ├─ .listadmad
┃ ├─ .veradmad
┃ └─ .clearadmad
┃
┃ 🚫 LISTA NEGRA
┃ ├─ .ln
┃ ├─ .unln
┃ ├─ .vln
┃ ├─ .clrn
┃ └─ .resetuser
┃
┃ ⚙️ BOT
┃ ├─ .restart
┃ ├─ .update
┃ ├─ .exec
┃ ├─ .exec2
┃ ├─ .setcmd
┃ ├─ .setprefix
┃ └─ .dsowner

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯


╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃ 👑 *WhatsApp-Bot*
┃ 🛡️ *Panel exclusivo del Owner*
┃ ⚡ *Control • Seguridad • Gestión*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    // ==========================================================
    // 📤 ENVIAR MENÚ
    // ==========================================================

    await conn.sendMessage(
      m.chat,
      {
        text: menuText
      },
      {
        quoted: m
      }
    )

  } catch (e) {

    console.error(
      '[MENU-OWNER]',
      e
    )

    await m.reply(
      '✖️ Ocurrió un error al mostrar el panel del Owner.'
    )
  }
}

// ============================================================
// ⚙️ COMANDOS
// ============================================================

handler.command = [
  'menuow',
  'mw'
]

// ============================================================
// 👑 SOLO OWNER
// ============================================================

handler.owner = true

// ============================================================
// 📚 AYUDA
// ============================================================

handler.help = [
  'menuow',
  'mw'
]

// ============================================================
// 🏷️ TAG
// ============================================================

handler.tags = [
  'owner'
]

// ============================================================
// 📤 EXPORT
// ============================================================

export default handler
