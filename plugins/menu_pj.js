// 📂 plugins/menu-personajes.js — MENÚ PERSONAJES 🎌✨

let handler = async (m, { conn }) => {

  let menu = `
╭━━━〔 🎴 *GREMIO ANIME* 〕━━━⬣
┃ 🐉 Bienvenido al sistema de invocación
┃ ⚔️ Recluta, colecciona y domina personajes
┃
┃━━━━━━━━━━━━━━
┃ 🎌 *COMANDOS PRINCIPALES*
┃
┃ 📜 *.personajes*
┃ ➤ Ver personajes disponibles
┃
┃ 🎲 *.claim*
┃ ➤ Invocar un personaje aleatorio
┃
┃ 👤 *.mipersonaje*
┃ ➤ Ver tu personaje actual
┃
┃ 💔 *.drop*
┃ ➤ Liberar tu personaje
┃
┃ 🔄 *.cambiar*
┃ ➤ Cambiar personaje automáticamente
┃
┃━━━━━━━━━━━━━━
┃ 👑 *PODER DE LOS OWNERS*
┃
┃ ⚡ *.addpj <nombre>*
┃ ➤ Invocar nuevo personaje al mundo
┃
┃ ❌ *.delpj <nombre>*
┃ ➤ Borrar personaje del sistema
┃
┃ 🔓 *.resetpj @user*
┃ ➤ Quitar personaje a un usuario
┃
┃ 📊 *.listpj*
┃ ➤ Ver todos los personajes en uso
┃
┃ 🧹 *.resetchars*
┃ ➤ Liberar TODOS los personajes
┃
┃━━━━━━━━━━━━━━
┃ 🌟 *RAREZA*
┃ ✨ Normales → Comunes
┃ 🌟 Raros → 10% probabilidad
┃
┃ 🎴 ¡Colecciona los más poderosos!
╰━━━━━━━━━━━━━━━━━━⬣

🐾 *FelixCat-Bot* — Sistema Anime RPG ⚔️
`.trim()

  conn.sendMessage(m.chat, { text: menu }, { quoted: m })
}

handler.command = ['menupj', 'menupersonajes']

export default handler
