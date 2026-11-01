
// 📂 plugins/_play.js
// 🎵 WHATSAPP-BOT — PLAY EN MANTENIMIENTO

let handler = async (m, { conn }) => {
  await conn.sendMessage(m.chat, {
    text: '🔄 Se está actualizando por fallos técnicos.'
  }, { quoted: m })
}

handler.help = ['play', 'play2', 'play3']
handler.tags = ['downloader']
handler.command = /^(play|play2|play3)$/i

export default handler
