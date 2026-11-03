
/**
 * 📂 plugins/anticall.js
 * 🛡️ WHATSAPP-BOT — ANTICALL GRUPAL
 *
 * 📞 Detecta mensajes Call
 * 📞 Detecta posibles avisos de llamadas grupales
 * 🗑️ Intenta eliminar el mensaje original
 * 👤 Advierte mencionando al responsable
 * 👑 Incluye administradores y owners
 * 💾 Configuración independiente por grupo
 *
 * Comando: .anticall
 * Baileys ES Modules
 */

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

function getChatData(chatId) {
    global.db = global.db || {}
    global.db.data = global.db.data || {}
    global.db.data.chats = global.db.data.chats || {}

    global.db.data.chats[chatId] =
        global.db.data.chats[chatId] || {}

    return global.db.data.chats[chatId]
}

// ============================================================
// 🔧 UTILIDADES
// ============================================================

function getSender(m) {
    return (
        m?.key?.participant ||
        m?.participant ||
        m?.sender ||
        null
    )
}

function getMentionText(jid) {
    if (!jid) return 'Usuario'

    return '@' + String(jid)
        .split('@')[0]
        .split(':')[0]
}

function getMessageContent(m) {
    let content = m?.message || {}

    // Desenvolver mensajes encapsulados.
    for (let i = 0; i < 4; i++) {
        if (content.ephemeralMessage?.message) {
            content = content.ephemeralMessage.message
        } else if (
            content.viewOnceMessage?.message
        ) {
            content = content.viewOnceMessage.message
        } else if (
            content.viewOnceMessageV2?.message
        ) {
            content = content.viewOnceMessageV2.message
        } else if (
            content.documentWithCaptionMessage?.message
        ) {
            content =
                content.documentWithCaptionMessage.message
        } else {
            break
        }
    }

    return content
}

// ============================================================
// 📞 DETECTAR CALL
// ============================================================

function isCallMessage(m) {
    if (!m) return false

    const type = String(
        m.mtype || ''
    ).toLowerCase()

    const supportedTypes = [
        'call',
        'callmessage',
        'calllogmessage',
        'calllogmess',
        'groupcallmessage',
        'groupcall',
        'groupcallstartedmessage'
    ]

    if (supportedTypes.includes(type)) {
        return true
    }

    const content = getMessageContent(m)

    const keys = Object.keys(content)

    if (
        keys.some(key =>
            supportedTypes.includes(
                key.toLowerCase()
            )
        )
    ) {
        return true
    }

    // Algunos avisos de llamada llegan como
    // mensajes de sistema, no como texto normal.
    const stub = String(
        m.messageStubType || ''
    ).toUpperCase()

    if (
        stub.includes('CALL') ||
        stub.includes('GROUP_CALL')
    ) {
        return true
    }

    return false
}

// ============================================================
// 🛡️ EVITAR AVISOS DUPLICADOS
// ============================================================

const processed = new Set()

function markProcessed(chat, id) {
    const key = `${chat}:${id}`

    if (processed.has(key)) return false

    processed.add(key)

    if (processed.size > 500) {
        const oldest = processed.values().next().value
        processed.delete(oldest)
    }

    return true
}

// ============================================================
// ⚙️ COMANDO .ANTICALL
// ============================================================

const handler = async (m, { conn, isAdmin, isOwner }) => {
    if (!m.isGroup) {
        return m.reply(
            '⚠️ Este comando solo funciona en grupos.'
        )
    }

    // Solo administradores y owners pueden configurar.
    if (!isAdmin && !isOwner) {
        return m.reply(
            '⛔ Solo administradores y owners pueden configurar AntiCall.'
        )
    }

    const chatData = getChatData(m.chat)

    chatData.anticall = !chatData.anticall

    const message = chatData.anticall
        ? `╭━━〔 📞 *ANTICALL* 〕━━╮

✅ *PROTECCIÓN ACTIVADA*

🚫 No se permiten avisos de llamadas grupales.

📞 Detección de mensajes Call activada.
🗑️ Eliminación automática cuando sea posible.
👤 Advertencias con mención al responsable.

⚠️ Se aplica también a administradores y owners.

╰━━━━━━━━━━━━━━━━━━╯`
        : `╭━━〔 📞 *ANTICALL* 〕━━╮

🔓 *PROTECCIÓN DESACTIVADA*

📞 La detección de Call quedó desactivada.

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
        if (!m?.isGroup) return

        const chatData = getChatData(m.chat)

        if (!chatData.anticall) return

        if (!isCallMessage(m)) return

        const conn = this
        const sender = getSender(m)

        const originalKey = m.key

        const id = originalKey?.id

        if (!id) {
            console.log(
                '[ANTICALL] Aviso Call sin ID de mensaje.'
            )
            return
        }

        if (!markProcessed(m.chat, id)) return

        console.log(
            '[ANTICALL] Aviso de llamada detectado:',
            {
                chat: m.chat,
                sender,
                id,
                type: m.mtype,
                stub: m.messageStubType
            }
        )

        // ====================================================
        // 🗑️ ELIMINAR MENSAJE ORIGINAL
        // ====================================================

        let deleteRequested = false

        if (
            originalKey?.id &&
            originalKey?.remoteJid
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
                    '[ANTICALL] Error eliminando Call:',
                    error
                )
            }
        }

        // ====================================================
        // 🚨 ADVERTENCIA CON MENCIÓN
        // ====================================================

        const warning =
            `╭━━〔 🚨 *ANTICALL* 〕━━╮

${sender
    ? `👤 *Usuario:* ${getMentionText(sender)}`
    : '👤 *Usuario no identificado*'}

📞 *Se detectó un aviso de llamada.*

🚫 No está permitido iniciar o compartir llamadas en este grupo.

${deleteRequested
    ? '🗑️ Se solicitó la eliminación de la notificación.'
    : '⚠️ No fue posible solicitar la eliminación.'}

⚠️ Esta regla también se aplica a administradores y owners.

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
            '[ANTICALL] Error general:',
            error
        )
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = ['anticall']
handler.tags = ['group']
handler.command = /^anticall$/i

handler.group = true

export default handler
