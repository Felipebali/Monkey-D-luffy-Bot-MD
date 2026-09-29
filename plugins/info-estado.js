import os from 'os'
import process from 'process'

let handler = async (m, { conn, usedPrefix, command }) => {

    // 🏓 PING SIMPLE
    if (command === 'ping') {
        return m.reply('🏓 Pong!')
    }

    // Medición REAL del ping - enviando un mensaje y midiendo el tiempo
    const startTime = Date.now()
    let loadingMsg = await conn.sendMessage(m.chat, {
        text: '📡 Midiendo ping real...'
    }, { quoted: m })

    const realPing = Date.now() - startTime

    // Información del bot
    let botname = conn.user.name || "FelixCat-Bot"
    let owner = 'Balkoszky🇵🇱'
    let vs = global.vs || '3.2.1'

    // Uptime REAL del bot
    let botUptime = process.uptime()
    let uptimeFormatted = formatUptime(botUptime)

    // Estadísticas REALES de la base de datos
    let totalreg = Object.keys(global.db?.data?.users || {}).length || 0
    let totalchats = Object.keys(global.db?.data?.chats || {}).length || 0

    // Información REAL de conexiones
    const chats = Object.entries(conn.chats || {})
    const groups = chats.filter(([id]) => id.endsWith('@g.us'))
    const privados = chats.filter(([id]) => id.endsWith('@s.whatsapp.net'))
    const broadcasts = chats.filter(([id]) => id.endsWith('@broadcast'))

    // Información REAL del sistema
    let platform = os.platform()
    let arch = os.arch()
    let totalmem = os.totalmem()
    let freemem = os.freemem()
    let usedmem = totalmem - freemem
    let cpus = os.cpus()
    let cpuModel = cpus[0]?.model || 'Desconocido'
    let cpuCores = cpus.length

    // Estado REAL de la conexión WebSocket
    let wsStatus = '🔴 Desconectado'

    if (conn.ws) {
        switch (conn.ws.readyState) {
            case 0:
                wsStatus = '🟡 Conectando'
                break

            case 1:
                wsStatus = '🟢 Conectado'
                break

            case 2:
                wsStatus = '🟠 Desconectando'
                break

            case 3:
                wsStatus = '🔴 Desconectado'
                break
        }
    }

    // Velocidad REAL del procesador
    let speedTestStart = Date.now()
    let operations = 0

    for (let i = 0; i < 1000000; i++) {
        operations += Math.sqrt(i) * Math.random()
    }

    let speedTestEnd = Date.now()
    let cpuSpeed = speedTestEnd - speedTestStart

    // Formatear memoria
    const formatMemory = (bytes) => {
        const gb = bytes / (1024 * 1024 * 1024)
        return gb.toFixed(2) + ' GB'
    }

    // Porcentaje de uso de memoria
    let memoryUsage =
        ((usedmem / totalmem) * 100).toFixed(1)

    let estadoMsg = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃          📊 *ESTADO REAL* 📊           ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

🤖 *INFORMACIÓN DEL BOT*
├─ 🌪️ *Nombre:* ${botname}
├─ 👑 *Creador:* ${owner}
├─ ⚡ *Prefijo:* ${usedPrefix}
├─ 📦 *Versión:* ${vs}
├─ 📡 *Ping Real:* ${realPing} ms
├─ 🔌 *Conexión:* ${wsStatus}

📈 *ESTADÍSTICAS ACTIVAS*
├─ 💬 *Chats Totales:* ${totalchats}
├─ 🏮 *Grupos:* ${groups.length}
├─ 💌 *Privados:* ${privados.length}
├─ 📢 *Broadcasts:* ${broadcasts.length}
├─ 👥 *Usuarios Registrados:* ${totalreg}

⚙️ *RENDIMIENTO DEL SISTEMA*
├─ ⏰ *Uptime Bot:* ${uptimeFormatted}
├─ 🚀 *Velocidad CPU:* ${cpuSpeed} ms
├─ 💻 *Plataforma:* ${platform} ${arch}
├─ 🔧 *Procesador:* ${cpuModel.split('@')[0]}
├─ 🎯 *Núcleos:* ${cpuCores}
├─ 🗂️ *Memoria Usada:* ${formatMemory(usedmem)} (${memoryUsage}%)
├─ 💾 *Memoria Libre:* ${formatMemory(freemem)}
├─ 💰 *Memoria Total:* ${formatMemory(totalmem)}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

    // Editar el mensaje de carga con la información real
    await conn.sendMessage(
        m.chat,
        {
            text: estadoMsg,
            edit: loadingMsg.key
        }
    )
}

handler.help = [
    'status',
    'estado',
    'ping'
]

handler.tags = ['info']

handler.command =
    /^(estado|status|estate|state|stado|stats|ping|speed)$/i

export default handler

function formatUptime(seconds) {

    let days =
        Math.floor(
            seconds / (24 * 60 * 60)
        )

    let hours =
        Math.floor(
            (seconds % (24 * 60 * 60)) /
            (60 * 60)
        )

    let minutes =
        Math.floor(
            (seconds % (60 * 60)) /
            60
        )

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`

    } else if (hours > 0) {
        return `${hours}h ${minutes}m`

    } else {
        return `${minutes}m`
    }
}
