
// 📂 plugins/antiestado2.js
// 🛡️ WHATSAPP-BOT — ANTIESTADO 2
// 🚫 Detecta GroupStatusMessageV2
// 🗑️ Intenta eliminar el mensaje detectado
// ⚠️ Advierte mencionando al usuario
// 👥 Incluye administradores y owners
// ============================================================

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

    if (
        String(m.mtype || '').toLowerCase() ===
        'groupstatusmessagev2'
    ) {
        return true
    }

    const message = m.message || m.msg || {}

    if (
        Object.keys(message).some(
            key => key.toLowerCase() === 'groupstatusmessagev2'
        )
    ) {
        return true
    }

    if (
        String(m.messageStubType || '').toLowerCase() ===
        'groupstatusmessagev2'
    ) {
        return true
    }

    return false
}

function getMentionText(jid) {
    if (!jid) return 'Usuario'
    return '@' + jid.split('@')[0].split(':')[0]
}

// ============================================================
// 📡 COMANDO: .antiestado2
// ============================================================

const handler = async (m, { conn }) => {
    if (!m.isGroup) {
        return conn.sendMessage(m.chat, {
            text: '⚠️ Este comando solo se puede utilizar en grupos.'
        })
    }

    const chatData = getChatData(m.chat)

    chatData.antiestado2 = !chatData.antiestado2

    const message = chatData.antiestado2
        ? '╭━━〔 🛡️ *ANTIESTADO 2* 〕━━╮\n\n' +
          '✅ *Protección activada*\n\n' +
          '🚫 No está permitido compartir estados en este grupo mediante GroupStatusMessageV2.\n\n' +
          '⚠️ La regla se aplica a todos los miembros, incluidos administradores y owners.\n' +
          '🗑️ El bot intentará eliminar los mensajes detectados y avisará al responsable.\n\n' +
          '╰━━━━━━━━━━━━━━━━━━╯'
        : '╭━━〔 🛡️ *ANTIESTADO 2* 〕━━╮\n\n' +
          '🔓 *Protección desactivada*\n\n' +
          'La detección de GroupStatusMessageV2 quedó desactivada para este grupo.\n\n' +
          '╰━━━━━━━━━━━━━━━━━━╯'

    return conn.sendMessage(m.chat, { text: message })
}

// ============================================================
// 🔍 DETECTOR DE ESTADOS COMPARTIDOS
// ============================================================

handler.all = async function (m) {
    try {
        if (!m?.message || !m.isGroup) return

        const chatData = getChatData(m.chat)

        if (!chatData.antiestado2) return
        if (!isGroupStatusMessageV2(m)) return

        const conn = this
        const sender = getSender(m)

        // Intentar eliminar el mensaje compartido.
        let deleted = false

        if (m.key?.id && m.key?.remoteJid) {
            try {
                await conn.sendMessage(m.chat, {
                    delete: m.key
                })

                deleted = true
            } catch (error) {
                console.error(
                    '[ANTIESTADO2] Error al eliminar el mensaje:',
                    error
                )
            }
        }

        const mention = getMentionText(sender)

        const warning =
            '╭━━〔 🚨 *AVISO DE MODERACIÓN* 〕━━╮\n\n' +
            (sender ? `👤 *Usuario:* ${mention}\n\n` : '') +
            '🚫 *No está permitido compartir estados en este grupo.*\n\n' +
            '📌 Se detectó un mensaje del tipo `GroupStatusMessageV2`.\n\n' +
            (
                deleted
                    ? '🗑️ Se solicitó la eliminación del mensaje.'
                    : '⚠️ No se pudo confirmar la eliminación del mensaje.'
            ) +
            '\n\nPor favor, respetá las reglas del grupo para evitar nuevas advertencias.\n\n' +
            '╰━━━━━━━━━━━━━━━━━━╯'

        const messageOptions = {
            text: warning
        }

        if (sender) {
            messageOptions.mentions = [sender]
        }

        await conn.sendMessage(m.chat, messageOptions)
    } catch (error) {
        console.error('[ANTIESTADO2] Error:', error)
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.help = ['antiestado2']
handler.tags = ['group']
handler.command = ['antiestado2']
handler.group = true

export default handler
