// 📂 plugins/menu-personajes.js — MENÚ PERSONAJES 🎌

let handler = async (m, { conn }) => {

  let menu = `
╭━━━〔 🎌 SISTEMA DE PERSONAJES 〕━━━⬣
┃
┃ 🐉 *COMANDOS PRINCIPALES*
┃
┃ 📜 .personajes
┃ ➤ Ver lista de personajes disponibles
┃
┃ 🎯 .claim <nombre>
┃ ➤ Reclamar un personaje
┃
┃ 👤 .mipersonaje
┃ ➤ Ver tu personaje actual
┃
┃ 💔 .drop
┃ ➤ Abandonar tu personaje
┃
┃ 🔄 .cambiar <nombre>
┃ ➤ Cambiar de personaje
┃
┃━━━━━━━━━━━━━━
┃ 👑 *COMANDOS DE OWNER*
┃
┃ ⚡ .addpj <nombre>
┃ ➤ Agregar personaje nuevo
┃
┃ ❌ .delpj <nombre>
┃ ➤ Eliminar personaje
┃
┃ 🔓 .resetpj @user
┃ ➤ Quitar personaje a un usuario
┃
┃ 📊 .listpj
┃ ➤ Ver quién tiene cada personaje
┃
╰━━━━━━━━━━━━━━━━⬣
  `.trim()

  conn.sendMessage(m.chat, { text: menu }, { quoted: m })
}

handler.command = ['menupj', 'menupersonajes']

export default handler
