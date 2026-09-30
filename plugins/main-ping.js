import os from 'os'

let handler = async (m, { conn }) => {
    // Medición real del ping
    const startTime = Date.now()
    let sentMsg = await conn.sendMessage(m.chat, { text: '🏓 Calculando ping real...' }, { quoted: m })
    const endTime = Date.now()
    const realPing = endTime - startTime

    // Información del sistema
    const arch = os.arch()
    const platform = os.platform()
    const release = os.release()
    const hostname = os.hostname()
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2)
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2)
    const uptime = formatUptime(os.uptime())
    const cpus = os.cpus()
    const cpuModel = cpus[0].model
    const cpuCores = cpus.length
    const botUptime = formatUptime(process.uptime())

    // Información adicional de WhatsApp
    const connectionState = conn.ws.readyState
    const connectionStatus = getConnectionStatus(connectionState)

    let result = `
╭━━━〔 ⚡ 𝚂𝙸𝚂𝚃𝙴𝙼𝙰 𝙸𝙽𝙵𝙾 ⚡ 〕━━━╮
┃ 📡 *Ping Real:* ${realPing} ms
┃ 🔌 *Conexión:* ${connectionStatus}
┃ 💻 *Plataforma:* ${platform} ${arch}
┃ 🖥️ *Sistema:* ${release}
┃ 🌐 *Hostname:* ${hostname}
┃ 🔧 *CPU:* ${cpuModel.split('@')[0].trim()} (${cpuCores} núcleos)
┃ 🗂️ *RAM:* ${freeMem} GB libres de ${totalMem} GB
┃ ⏳ *Uptime Sistema:* ${uptime}
┃ 🤖 *Uptime Bot:* ${botUptime}
╰━━━━━━━━━━━━━━━━━━━╯
    `.trim()

    // Editar el mensaje original con los resultados
    await conn.sendMessage(m.chat, { 
        text: result, 
        edit: sentMsg.key 
    })
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60))
    seconds %= 24 * 60 * 60
    const hours = Math.floor(seconds / (60 * 60))
    seconds %= 60 * 60
    const minutes = Math.floor(seconds / 60)
    return `${days}d ${hours}h ${minutes}m`
}

function getConnectionStatus(state) {
    const states = {
        0: '🟡 Conectando',
        1: '🟢 Conectado',
        2: '🟠 Desconectando',
        3: '🔴 Desconectado'
    }
    return states[state] || '❓ Desconocido'
}

handler.help = ['info']
handler.tags = ['main', 'info']
handler.command = ['speed', 'info'] // <- .p eliminado

export default handler
