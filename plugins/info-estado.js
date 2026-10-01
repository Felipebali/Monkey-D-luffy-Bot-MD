// 📂 plugins/ping.js — PING GAME 🏓
// FelixCat_Bot

let handler = async (m, { conn }) => {

    const inicio = Date.now()

    // 💤 El bot está despertando
    let msg = await conn.sendMessage(
        m.chat,
        {
            text: '🏓 *PING TEST*\n\n😴 Despertando al bot...'
        },
        {
            quoted: m
        }
    )

    // ⚡ Medir respuesta
    const ping = Date.now() - inicio

    let estado = ''
    let emoji = ''

    if (ping < 100) {
        emoji = '🚀'
        estado = '¡Velocidad increíble!'
    } else if (ping < 300) {
        emoji = '⚡'
        estado = '¡El bot está rápido!'
    } else if (ping < 600) {
        emoji = '🏃'
        estado = 'Respuesta normal.'
    } else {
        emoji = '🐢'
        estado = 'Está un poco lento...'
    }

    // 🏓 Resultado
    const resultado = `
🏓 *PING TEST*

━━━━━━━━━━━━━━━━━━

🤖 *Whatsapp-Bot*
🟢 *¡Estoy funcionando!*

📡 *Ping:* ${ping} ms
${emoji} *Estado:* ${estado}

━━━━━━━━━━━━━━━━━━

💬 *Pong!* 🏓
`.trim()

    // ✏️ Actualizar mensaje
    await conn.sendMessage(
        m.chat,
        {
            text: resultado,
            edit: msg.key
        }
    )
}

handler.help = ['ping']
handler.tags = ['info']
handler.command = /^ping$/i

export default handler
