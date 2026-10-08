// 📂 plugins/menu-owner.js — PANEL DEL DUEÑO 👑
// WhatsApp-Bot — Control Total
// ============================================================

let handler = async (m, { conn }) => {
  try {

    // ========================================================
    // 👑 REACCIÓN
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: '👑',
          key: m.key
        }
      }
    )


    // ========================================================
    // 📅 FECHA Y HORA
    // ========================================================

    const fecha = new Date().toLocaleString('es-UY', {
      timeZone: 'America/Montevideo',
      hour12: false
    })


    // ========================================================
    // 📋 PANEL DEL OWNER
    // ========================================================

    const menuText = `
╭━━━〔 *👑 PANEL DEL DUEÑO* 〕━━━╮
┃ 🤖 *WhatsApp-Bot — Control Total*
┃ 📆 ${fecha}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯


👥 *GESTIÓN DEL GRUPO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .name <nombre>
  └─ Cambiar el nombre del grupo ✏️

• .nombre <nombre>
  └─ Cambiar el nombre del grupo ✏️

• .setpg
  └─ Cambiar la foto del grupo 🖼️

• .resetlink
  └─ Restablecer/resetear el enlace del grupo 🔗

• .join <link>
  └─ Hacer que el bot se una a un grupo mediante un enlace 🔗


🖼️ *FOTOS Y MULTIMEDIA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .gpu @user
  └─ Obtener la foto de perfil de un usuario 🧑🖼️

• .gpo
  └─ Obtener la foto de perfil del grupo 👥🖼️

• .setpp
  └─ Cambiar la foto de perfil del bot 🤖🖼️

• .setpg
  └─ Cambiar la foto de perfil del grupo 👥🖼️


👑 *GESTIÓN DE OWNERS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .adowner @user
  └─ Agregar un usuario como owner del bot ➕

• .rowner @user
  └─ Quitar un owner agregado del bot ➖

• .clearowner
  └─ Eliminar todos los owners agregados 🧹

• .owners
  └─ Ver la lista de owners agregados 📋


🎖️ *GESTIÓN DE INSIGNIAS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .otorgar @user <insignia>
  └─ Otorgar una insignia a un usuario 🏅

• .quitar @user <número>
  └─ Quitar una insignia específica ❌

• .verinsignias @user
  └─ Ver las insignias de un usuario 📋


🚨 *ADVERTENCIAS DE ADMINISTRADORES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .admad @admin <motivo>
  └─ Dar una advertencia a un administrador ⚠️

• .unadmad @admin
  └─ Quitar una advertencia a un administrador 🟢

• .listadmad
  └─ Ver administradores que tienen advertencias 📋

• .veradmad @admin
  └─ Ver el historial de advertencias 🔎

• .clearadmad
  └─ Eliminar todas las advertencias de administradores 🧹


🚫 *SEGURIDAD Y LISTA NEGRA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .ln @user
  └─ Agregar un usuario a la lista negra 🚫

• .unln @user
  └─ Quitar un usuario de la lista negra ✅

• .vln
  └─ Ver todos los usuarios en lista negra 📋

• .clrn
  └─ Limpiar completamente la lista negra 🗑️

• .resetuser @user
  └─ Reiniciar los datos del usuario 🔄


💡 *SISTEMA DE SUGERENCIAS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .suginfo <ID>
  └─ Consultar una sugerencia específica 🔎

• .suglist
  └─ Ver las sugerencias pendientes 📋

• .sugs
  └─ Ver estadísticas de sugerencias 📊

• .sugaceptar <ID>
  └─ Aceptar una sugerencia 🟢

• .sugrechazar <ID>
  └─ Rechazar una sugerencia 🔴

• .sugdesarrollo <ID>
  └─ Marcar una sugerencia en desarrollo 🔵


⚙️ *CONFIGURACIÓN DEL BOT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .setcmd
  └─ Configurar comandos del bot ⚙️

• .setprefix
  └─ Cambiar el prefijo del bot ✏️

• .restart
  └─ Reiniciar el bot 🔄

• .update
  └─ Actualizar el bot 🆙


💻 *CONTROL AVANZADO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• .exec
  └─ Ejecutar código en el bot 💻

• .exec2
  └─ Ejecutar código mediante el sistema alternativo 💻


━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *WHATSAPP-BOT — PROPIETARIO SUPREMO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💠 Control total del bot.
💠 Gestión de grupos.
💠 Gestión de owners.
💠 Gestión de administradores.
💠 Gestión de usuarios.
💠 Gestión de seguridad.
💠 Gestión de sugerencias.
💠 Gestión de configuración.

🔐 *Todos los comandos de este panel
son exclusivos para Owners.*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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


  } catch (e) {

    console.error(
      '❌ Error en menu-owner:',
      e
    )

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
