// 📂 plugins/menu-personajes.js
// 🎌 MENÚ DEL SISTEMA DE PERSONAJES
// ============================================================

let handler = async (m, { conn }) => {

  const menu = `
╭━━━〔 🎴 *GREMIO ANIME* 〕━━━⬣
┃
┃ 🌌 *SISTEMA DE PERSONAJES*
┃ Recluta • Colecciona • Cambia
┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 🎌 *COMANDOS PRINCIPALES*
┣━━━━━━━━━━━━━━━━━━━━━━━━━━
┃
┃ 📜 *.personajes*
┃ ➤ Activar / desactivar el sistema
┃ 👑 Solo owners
┃
┃ 🎲 *.claim*
┃ ➤ Invocar un personaje
┃
┃ 👤 *.mipersonaje*
┃ ➤ Ver tu personaje y estadísticas
┃
┃ 💔 *.drop*
┃ ➤ Liberar tu personaje
┃
┃ 🔄 *.cambiar*
┃ ➤ Cambiar tu personaje
┃
┃ 📊 *.listpj*
┃ ➤ Ver personajes actualmente asignados
┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 👑 *COMANDOS DE OWNER*
┣━━━━━━━━━━━━━━━━━━━━━━━━━━
┃
┃ ⚡ *.addpj <nombre>*
┃ ➤ Agregar un personaje
┃
┃ ❌ *.delpj <nombre>*
┃ ➤ Eliminar un personaje
┃
┃ 🔓 *.resetpj @usuario*
┃ ➤ Quitar personaje a un usuario
┃
┃ 🧹 *.resetchars*
┃ ➤ Liberar todos los personajes
┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 🌟 *RAREZA*
┣━━━━━━━━━━━━━━━━━━━━━━━━━━
┃
┃ ✨ Personajes normales
┃ ➤ 90% de probabilidad
┃
┃ 🌟 Personajes raros
┃ ➤ 10% de probabilidad
┃
┃ 👑 Owner
┃ ➤ 35% de probabilidad de raro
┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 🎴 *FLUJO*
┣━━━━━━━━━━━━━━━━━━━━━━━━━━
┃
┃ 1️⃣ El owner activa el sistema
┃ 2️⃣ Los usuarios usan *.claim*
┃ 3️⃣ Cada personaje es único
┃ 4️⃣ *.mipersonaje* muestra tus stats
┃ 5️⃣ *.drop* libera tu personaje
┃ 6️⃣ *.cambiar* busca otro personaje
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━⬣

🤖 *WhatsApp-Bot* — Anime RPG
`.trim()

  return conn.sendMessage(
    m.chat,
    {
      text: menu
    },
    {
      quoted: m
    }
  )
}

handler.help = [
  'menupj',
  'menupersonajes'
]

handler.tags = [
  'anime',
  'juego'
]

handler.command = [
  'menupj',
  'menupersonajes'
]

export default handler
