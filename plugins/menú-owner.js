// 📂 plugins/menu-owner.js — PANEL DEL DUEÑO 👑
// WhatsApp-Bot — Control Total
// ============================================================

let handler = async (m, { conn }) => {
  try {

    // 👑 REACCIÓN
    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: '👑',
          key: m.key
        }
      }
    )

    // 📅 FECHA Y HORA
    const fecha = new Date().toLocaleString('es-UY', {
      timeZone: 'America/Montevideo',
      hour12: false
    })

    // ==========================================================
    // 📋 MENÚ DEL OWNER
    // ==========================================================

    const menuText = `
╭━━━〔 *👑 PANEL DEL DUEÑO* 〕━━━╮
┃ 🤖 *WhatsApp-Bot – Control Total*
┃ 📆 ${fecha}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

🖼️ *MULTIMEDIA / PERFIL*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .gpu — Descargar foto de perfil de usuario 🧑🖼️
• .gpo — Descargar foto del grupo 🏞️

🎖️ *GESTIÓN DE INSIGNIAS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .otorgar @user <insignia>
  └─ Otorgar una insignia 🏅

• .quitar @user <número>
  └─ Quitar una insignia por número ❌

• .verinsignias @user
  └─ Ver insignias del usuario 📋


🚨 *ADVERTENCIAS PARA ADMINISTRADORES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .admad @admin <motivo>
  └─ Dar advertencia ⚠️

• .unadmad @admin
  └─ Quitar 1 advertencia 🟢

• .listadmad
  └─ Ver administradores advertidos 📋

• .veradmad @admin
  └─ Ver historial completo 🔎

• .clearadmad
  └─ Eliminar todas las advertencias 🧹


👑 *GESTIÓN DE OWNERS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .adowner @user
  └─ Agregar usuario a global.owner ➕

• .rowner @user
  └─ Quitar usuario de global.owner ➖


🚫 *LISTA NEGRA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .ln @user
  └─ Agregar a lista negra ⚠️

• .unln @user
  └─ Quitar de lista negra ✅

• .vln
  └─ Ver lista negra 📋

• .clrn
  └─ Limpiar lista negra 🗑️

• .resetuser @user
  └─ Reiniciar datos del usuario 🔄


⚙️ *GESTIÓN DEL BOT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .restart
  └─ Reiniciar el bot 🔁

• .update
  └─ Actualizar el bot 🆙

• .exec / .exec2
  └─ Ejecutar código 💻

• .setcmd
  └─ Configurar comandos ⚙️

• .setprefix
  └─ Cambiar prefijo ✏️

• .join <link>
  └─ Unirse a un grupo 🔗

• .resetlink
  └─ Resetear link del grupo ♻️

• .setpp
  └─ Cambiar foto del bot 🤖🖼️

• .setpg
  └─ Cambiar foto del grupo 👥🖼️


━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *WHATSAPP-BOT — PROPIETARIO SUPREMO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💠 Control total del sistema.
💠 Gestión de owners.
💠 Gestión de administradores.
💠 Gestión de seguridad.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim()

    // 📤 ENVIAR MENÚ
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

    console.error('❌ Error en menu-owner:', e)

    await m.reply(
      '✖️ Ocurrió un error al mostrar el menú del dueño.'
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

export default handler
