
// 📂 plugins/antiestado2.js
// 🛡️ WHATSAPP-BOT — ANTIESTADO 2
// • Detecta GroupStatusMessageV2
// • Intenta eliminar usando la clave original
// • Advierte mencionando al usuario
// • Incluye administradores y owners

function getChatData(chatId) {
    if (!global.db) global.db = {}
    if (!global.db.data) global.db.data = {}
    if (!global.db.data.chats) global.db.data.chats = {}

    if (!global.db.data.chats[chatId]) {
        global.db.data.chats[chatId] = {}
    }

    return global.db.data.chats[chatId]
}

function getSender(m) {
    return (
        m?.key?.participant ||
        m?.participant ||
        m?.sender ||
        null
    )
}

function isGroupStatusMessageV2(m) {
    if (!m) return false

    const type = String(m.mtype || '').toLowerCase()

    if (type === 'groupstatusmessagev2') return true

    const message = m.message || m.msg || {}

    return Object.keys(message).some(
        key => key.toLowerCase() === 'groupstatusmessagev2'
    )
}

function getMentionText(jid) {
    if (!jid) return 'Usuario'
    return '@' + jid.split('@')[0].split(':')[0]
}

// ============================================================
// COMANDO
// ============================================================

const handler = async (m, { conn }) => {
    if (!m.isGroup) {
        return m.reply('⚠️ Este comando solo se puede utilizar en grupos.')
    }

    const chatData = getChatData(m.chat)

    chatData.antiestado2 = !chatData.antiestado2

    const message = chatData.antiestado2
        ? `╭━━〔 🛡️ *ANTIESTADO 2* 〕━━╮

✅ *Protección activada*

🚫 No está permitido compartir estados en este grupo.

⚠️ La regla se aplica a todos los miembros, incluidos administradores y owners.

🗑️ El bot intentará eliminar los mensajes detectados.

╰━━━━━━━━━━━━━━━━━━╯`
        : `╭━━〔 🛡️ *ANTIESTADO 2* 〕━━╮

🔓 *Protección desactivada*

La detección quedó desactivada.

╰━━━━━━━━━━━━━━━━━━╯`

    return conn.sendMessage(m.chat, { text: message })
}

// ============================================================
// DETECTOR
// ============================================================

handler.all = async function (m) {
    try {
        if (!m?.message || !m.isGroup) return

        const chatData = getChatData(m.chat)

        if (!chatData.antiestado2) return
        if (!isGroupStatusMessageV2(m)) return

        const conn = this
        const sender = getSender(m)

        console.log('[ANTIESTADO2] Estado detectado:', {
            chat: m.chat,
            sender,
            id: m.key?.id,
            remoteJid: m.key?.remoteJid
        })

        // Intentar eliminar el mensaje original.
        let deleteRequested = false

        const originalKey = m.key

        if (
            originalKey?.id &&
            originalKey?.remoteJid &&
            originalKey?.participant
        ) {
            try {
                await conn.sendMessage(
                    m.chat,
                    { delete: originalKey }
                )

                deleteRequested = true

                console.log('[ANTIESTADO2] Solicitud de eliminación enviada.')
            } catch (error) {
                console.error(
                    '[ANTIESTADO2] No se pudo solicitar eliminación:',
                    error.message || error
                )
            }
        } else {
            console.log('[ANTIESTADO2] Clave incompleta:', originalKey)
        }

        const warning =
            `╭━━〔 🚨 *AVISO DE MODERACIÓN* 〕━━╮

${sender ? `👤 *Usuario:* ${getMentionText(sender)}` : ''}

🚫 *No está permitido compartir estados en este grupo.*

📌 Se detectó un mensaje GroupStatusMessageV2.

${deleteRequested
    ? '🗑️ Se solicitó la eliminación del mensaje.'
    : '⚠️ No se pudo solicitar la eliminación del mensaje.'}

Por favor, respetá las reglas del grupo.

╰━━━━━━━━━━━━━━━━━━╯`

        const options = { text: warning }

        if (sender) {
            options.mentions = [sender]
        }

        await conn.sendMessage(m.chat, options)

    } catch (error) {
        console.error('[ANTIESTADO2] Error:', error)
    }
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

handler.help = ['antiestado2']
handler.tags = ['group']
handler.command = ['antiestado2']
handler.group = true

export default handler
