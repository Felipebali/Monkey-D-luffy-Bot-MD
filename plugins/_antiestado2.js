
// 📂 plugins/antiestado2.js
// 🛡️ WHATSAPP-BOT — ANTIESTADO 2
// 🚫 Detecta GroupStatusMessageV2 en grupos
// 🗑️ Intenta eliminar el mensaje detectado
// ⚠️ Advierte al autor, sin expulsiones
// 👥 Se aplica a todos, incluidos admins y owners
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
    return m?.key?.participant ||
        m?.participant ||
        m?.sender ||
        null
}

function isGroupStatusMessageV2(m) {
    if (!m) return false

    // Tipo normalizado por algunos handlers de Baileys.
    if (
        String(m.mtype || '').toLowerCase() ===
        'groupstatusmessagev2'
    ) {
        return true
    }

    // Tipo dentro del objeto message.
    const message = m.message || m.msg || {}

    if (
        Object.keys(message).some(
            key => key.toLowerCase() === 'groupstatusmessagev2'
        )
    ) {
        return true
    }

    // Algunos wrappers exponen el tipo como nombre del evento.
    if (
        String(m.messageStubType || '').toLowerCase() ===
        'groupstatusmessagev2'
    ) {
        return true
    }

    return false
}

// ============================================================
// 📡 COMANDO: .antiestado2
// Activa o desactiva la protección en el grupo
// ============================================================

const handler = async (m, { conn }) => {
    if (!m.isGroup) {
        return conn.reply(
            m.chat,
            '⚠️ Este comando solo funciona en grupos.',
            m
        )
    }

    const chatData = getChatData(m.chat)

    chatData.antiestado2 = !chatData.antiestado2

    const message = chatData.antiestado2
        ? '╭━━〔 🛡️ *ANTIESTADO 2* 〕━━╮\n\n' +
          '✅ Protección activada.\n\n' +
          '🚫 No se permiten estados compartidos en este grupo mediante GroupStatusMessageV2.\n' +
          '⚠️ Se aplica a todos los miembros, incluidos administradores y owners.\n' +
          '🗑️ El bot intentará eliminar los mensajes detectados.\n\n' +
          '╰━━━━━━━━━━━━━━━━━━╯'
        : '╭━━〔 🛡️ *ANTIESTADO 2* 〕━━╮\n\n' +
          '❌ Protección desactivada.\n\n' +
          'Los mensajes GroupStatusMessageV2 ya no serán moderados por este plugin.\n\n' +
          '╰━━━━━━━━━━━━━━━━━━╯'

    // Sin citar el comando original.
    return conn.sendMessage(m.chat, { text: message })
}

handler.all = async function (m) {
    try {
        if (!m?.message || !m.isGroup) return

        const chatData = getChatData(m.chat)

        if (!chatData.antiestado2) return
        if (!isGroupStatusMessageV2(m)) return

        const conn = this
        const sender = getSender(m)

        // Intentar borrar el mensaje detectado.
        let deleted = false

        if (m.key?.id && m.key?.remoteJid) {
            try {
                await conn.sendMessage(m.chat, {
                    delete: m.key
                })

                deleted = true
            } catch (error) {
                console.error(
                    '[ANTIESTADO2] No se pudo eliminar el mensaje:',
                    error
                )
            }
        }

        // Advertencia mencionando al autor, si se conoce.
        const warning =
            '╭━━〔 🚫 *ANTIESTADO 2* 〕━━╮\n\n' +
            (sender ? `⚠️ @${sender.split('@')[0].split(':')[0]},\n\n` : '') +
            'No se permite compartir estados en este grupo mediante GroupStatusMessageV2.\n\n' +
            (deleted
                ? '🗑️ Se intentó eliminar el mensaje compartido.'
                : '⚠️ No fue posible confirmar la eliminación del mensaje.') +
            '\n\nPor favor, respetá las reglas del grupo.\n\n' +
            '╰━━━━━━━━━━━━━━━━━━╯'

        const sendOptions = sender
            ? { mentions: [sender] }
            : {}

        await conn.sendMessage(
            m.chat,
            {
                text: warning,
                ...sendOptions
            }
        )
    } catch (error) {
        console.error('[ANTIESTADO2] Error:', error)
    }
}

handler.help = ['antiestado2']
handler.tags = ['group']
handler.command = ['antiestado2']
handler.group = true

export default handler
