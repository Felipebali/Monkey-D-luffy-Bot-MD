
/**
 * 📂 plugins/anticall.js
 * 🛡️ WHATSAPP-BOT — ANTICALL
 *
 * • Detecta mensajes de tipo Call
 * • Intenta eliminar usando la clave original
 * • Advierte mencionando al usuario
 * • Incluye administradores y owners
 * • Configuración independiente por grupo
 * • Usa global.db.data.chats
 *
 * Baileys ES Modules
 */

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

function getChatData(chatId) {
    if (!global.db) global.db = {}
    if (!global.db.data) global.db.data = {}
    if (!global.db.data.chats) {
        global.db.data.chats = {}
    }

    if (!global.db.data.chats[chatId]) {
        global.db.data.chats[chatId] = {}
    }

    return global.db.data.chats[chatId]
}

// ============================================================
// 👤 OBTENER REMITENTE
// ============================================================

function getSender(m) {
    return (
        m?.key?.participant ||
        m?.participant ||
        m?.sender ||
        null
    )
}

// ============================================================
// 📞 DETECTAR MENSAJES CALL
// ============================================================

function isCallMessage(m) {
    if (!m) return false

    const type = String(
        m.mtype || ''
    ).toLowerCase()

    if (
        type === 'call' ||
        type === 'callmessage' ||
        type === 'calllogmessage'
    ) {
        return true
    }

    const message = m.message || m.msg || {}

    const callTypes = [
        'call',
        'callmessage',
        'calllogmessage',
        'calllogmess'
    ]

    return Object.keys(message).some(key =>
        callTypes.includes(key.toLowerCase())
    )
}

// ============================================================
// 👤 TEXTO DE MENCIÓN
// ============================================================

function getMentionText(jid) {
    if (!jid) return 'Usuario'

    return '@' +
        String(jid)
            .split('@')[0]
            .split(':')[0]
}

// ============================================================
// 🛡️ COMANDO .ANTICALL
// ============================================================

const handler = async (m, { conn }) => {
    if (!m.isGroup) {
        return m.reply(
            '⚠️ Este comando solo se puede utilizar en grupos.'
        )
    }

    const chatData = getChatData(m.chat)

    // Activar o desactivar.
    chatData.anticall = !chatData.anticall

    const message = chatData.anticall
        ? `╭━━〔 📞 *ANTICALL* 〕━━╮

✅ *Protección activada*

🚫 No está permitido compartir mensajes de tipo Call en este grupo.

⚠️ La regla se aplica a todos los miembros, incluidos administradores y owners.

🗑️ El bot intentará eliminar los mensajes detectados.

📢 Se mencionará al usuario responsable.

╰━━━━━━━━━━━━━━━━━━╯`
        : `╭━━〔 📞 *ANTICALL* 〕━━╮

🔓 *Protección desactivada*

La detección de mensajes Call quedó desactivada.

╰━━━━━━━━━━━━━━━━━━╯`

    return conn.sendMessage(
        m.chat,
        { text: message }
    )
}

// ============================================================
// 🔎 DETECTOR AUTOMÁTICO
// ============================================================

handler.all = async function (m) {
    try {
        // Solo grupos.
        if (!m?.message || !m.isGroup) return

        const chatData = getChatData(m.chat)

        // Protección desactivada.
        if (!chatData.anticall) return

        // Detectar exclusivamente Call.
        if (!isCallMessage(m)) return

        const conn = this
        const sender = getSender(m)

        console.log(
            '[ANTICALL] Mensaje Call detectado:',
            {
                chat: m.chat,
                sender,
                id: m.key?.id,
                remoteJid: m.key?.remoteJid
            }
        )

        // ====================================================
        // 🗑️ INTENTAR ELIMINAR MENSAJE ORIGINAL
        // ====================================================

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
                    {
                        delete: originalKey
                    }
                )

                deleteRequested = true

                console.log(
                    '[ANTICALL] Solicitud de eliminación enviada.'
                )

            } catch (error) {
                console.error(
                    '[ANTICALL] No se pudo solicitar eliminación:',
                    error.message || error
                )
            }

        } else {
            console.log(
                '[ANTICALL] Clave incompleta:',
                originalKey
            )
        }

        // ====================================================
        // 🚨 ADVERTENCIA AL USUARIO
        // ====================================================

        const warning =
            `╭━━〔 🚨 *AVISO DE MODERACIÓN* 〕━━╮

${sender
    ? `👤 *Usuario:* ${getMentionText(sender)}`
    : ''}

🚫 *No está permitido compartir mensajes Call en este grupo.*

📞 Se detectó un mensaje de tipo Call.

${deleteRequested
    ? '🗑️ Se solicitó la eliminación del mensaje.'
    : '⚠️ No se pudo solicitar la eliminación del mensaje.'}

⚠️ Esta regla se aplica a todos los participantes, incluidos administradores y owners.

Por favor, respetá las reglas del grupo.

╰━━━━━━━━━━━━━━━━━━╯`

        const options = {
            text: warning
        }

        if (sender) {
            options.mentions = [sender]
        }

        await conn.sendMessage(
            m.chat,
            options
        )

    } catch (error) {
        console.error(
            '[ANTICALL] Error:',
            error
        )
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = ['anticall']
handler.tags = ['group']
handler.command = ['anticall']

handler.group = true

export default handler
