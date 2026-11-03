
/**
 * 📂 plugins/anticall.js
 * 🤖 WHATSAPP-BOT — ANTICALL SILENCIOSO
 *
 * 📞 Detecta llamadas entrantes
 * 🚫 Rechaza llamadas
 * 🗑️ Intenta eliminar registros Call
 * 📢 Menciona al usuario si elimina un registro
 * 👑 Exclusivo para owners
 * ⚙️ .anticall activa/desactiva sin responder
 * 💾 Configuración persistente
 *
 * Baileys ES Modules
 */

import fs from 'fs'

const DB_FILE = './database/anticall.json'

fs.mkdirSync('./database', { recursive: true })

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

function loadConfig() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = JSON.parse(
                fs.readFileSync(DB_FILE, 'utf8')
            )

            return {
                enabled: data.enabled === true
            }
        }
    } catch (error) {
        console.error('[ANTICALL] Error leyendo JSON:', error)
    }

    return { enabled: false }
}

function saveConfig(config) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(config, null, 2),
        'utf8'
    )
}

const config = loadConfig()

// ============================================================
// 🛡️ EVITAR PROCESAR EVENTOS REPETIDOS
// ============================================================

const processedCalls = new Set()
const processedMessages = new Set()

function remember(set, id) {
    if (set.has(id)) return false

    set.add(id)

    if (set.size > 500) {
        const first = set.values().next().value
        set.delete(first)
    }

    return true
}

// ============================================================
// 🔎 IDENTIFICAR MENSAJES CALL
// ============================================================

function isCallMessage(message) {
    if (!message) return false

    const content = message.message || {}

    const callTypes = [
        'call',
        'callLogMessage',
        'callMessage',
        'callLogMess',
        'callLog'
    ]

    if (
        callTypes.some(type =>
            Object.prototype.hasOwnProperty.call(
                content,
                type
            )
        )
    ) {
        return true
    }

    const stub = String(
        message.messageStubType || ''
    ).toUpperCase()

    return stub.includes('CALL')
}

// ============================================================
// 👤 IDENTIFICAR USUARIO
// ============================================================

function getCallerJid(message) {
    return (
        message?.key?.participant ||
        message?.key?.remoteJid ||
        ''
    )
}

function getMentionText(jid) {
    const number = String(jid)
        .split('@')[0]
        .replace(/\D/g, '')

    return number
        ? `@${number}`
        : 'Usuario'
}

// ============================================================
// 📢 AVISAR ELIMINACIÓN
// ============================================================

async function notifyDeletion(conn, chat, caller) {
    if (!chat || !caller) return

    const mention = getMentionText(caller)

    await conn.sendMessage(chat, {
        text:
            `╭━━━〔 📞 ANTICALL 〕━━━╮
┃
┃ 🚫 *LLAMADA DETECTADA*
┃
╰━━━━━━━━━━━━━━━━━━╯

👤 ${mention}

🗑️ Se procesó la eliminación del registro de llamada.

⚠️ Las llamadas al bot no están permitidas.

🤖 *whatsapp-bot*`,
        mentions: [caller]
    })
}

// ============================================================
// 🗑️ INTENTAR ELIMINAR REGISTRO
// ============================================================

async function deleteCallRecord(conn, message) {
    try {
        const key = message?.key

        if (!key?.id || !key?.remoteJid) {
            return false
        }

        // Solo se intenta revocar mensajes propios.
        // Los registros ajenos no pueden borrarse
        // globalmente mediante esta operación.
        if (!key.fromMe) {
            console.log(
                '[ANTICALL] Registro ajeno detectado:',
                key.id
            )
            return false
        }

        await conn.sendMessage(
            key.remoteJid,
            { delete: key }
        )

        console.log(
            '[ANTICALL] Solicitud de eliminación enviada:',
            key.id
        )

        return true

    } catch (error) {
        console.error(
            '[ANTICALL] Error eliminando registro:',
            error
        )

        return false
    }
}

// ============================================================
// 📞 RECHAZAR LLAMADAS
// ============================================================

async function processCall(conn, call) {
    if (!config.enabled || !call) return

    if (
        call.status !== 'offer' &&
        call.status !== 'ringing'
    ) return

    if (!call.id || !call.from) return

    const id = `${call.from}:${call.id}`

    if (!remember(processedCalls, id)) return

    try {
        if (typeof conn.rejectCall !== 'function') {
            console.error(
                '[ANTICALL] rejectCall no disponible.'
            )
            return
        }

        await conn.rejectCall(
            call.id,
            call.from
        )

        console.log(
            `[ANTICALL] Llamada rechazada: ${call.from}`
        )

        // Intentar eliminar el registro si existe
        // una clave de mensaje válida.
        if (call.messageKey) {
            const message = {
                key: call.messageKey
            }

            const deleted = await deleteCallRecord(
                conn,
                message
            )

            if (deleted) {
                await notifyDeletion(
                    conn,
                    call.from,
                    call.from
                )
            }
        }

    } catch (error) {
        processedCalls.delete(id)

        console.error(
            '[ANTICALL] Error procesando llamada:',
            error
        )
    }
}

// ============================================================
// 🔄 REGISTRAR EVENTOS
// ============================================================

function registerListeners(conn) {
    if (!conn?.ev?.on) return

    const previous = globalThis.__anticallListeners

    if (
        previous?.conn === conn &&
        previous?.callListener &&
        previous?.messageListener
    ) {
        return
    }

    if (previous?.conn?.ev?.off) {
        previous.conn.ev.off(
            'call',
            previous.callListener
        )

        previous.conn.ev.off(
            'messages.upsert',
            previous.messageListener
        )
    }

    // ========================================================
    // 📞 EVENTO CALL
    // ========================================================

    const callListener = async calls => {
        if (!config.enabled) return

        const events = Array.isArray(calls)
            ? calls
            : [calls]

        for (const call of events) {
            await processCall(conn, call)
        }
    }

    // ========================================================
    // 🗑️ EVENTO MESSAGES.UPSERT
    // ========================================================

    const messageListener = async update => {
        if (!config.enabled) return

        for (const message of update?.messages || []) {
            try {
                if (!isCallMessage(message)) continue

                const id = message.key?.id

                if (!id) continue

                if (!remember(processedMessages, id)) {
                    continue
                }

                const caller = getCallerJid(message)

                console.log(
                    '[ANTICALL] Registro Call detectado:',
                    id
                )

                const deleted = await deleteCallRecord(
                    conn,
                    message
                )

                if (deleted) {
                    await notifyDeletion(
                        conn,
                        message.key.remoteJid,
                        caller
                    )
                }

            } catch (error) {
                console.error(
                    '[ANTICALL] Error procesando Call:',
                    error
                )
            }
        }
    }

    conn.ev.on('call', callListener)
    conn.ev.on('messages.upsert', messageListener)

    globalThis.__anticallListeners = {
        conn,
        callListener,
        messageListener
    }

    console.log(
        '[ANTICALL] Detectores de llamadas activos.'
    )
}

// ============================================================
// ⚙️ COMANDO .ANTICALL
// ============================================================

const handler = async (m, { conn, isOwner }) => {
    if (!isOwner) return

    registerListeners(conn)

    // Activar/desactivar sin enviar mensajes.
    config.enabled = !config.enabled

    saveConfig(config)

    console.log(
        `[ANTICALL] Sistema ${
            config.enabled ? 'ACTIVADO' : 'DESACTIVADO'
        }`
    )
}

// ============================================================
// 🔄 INICIALIZACIÓN AUTOMÁTICA
// ============================================================

handler.before = async function (m, { conn }) {
    registerListeners(conn)
    return false
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = ['anticall']
handler.tags = ['owner']
handler.command = /^anticall$/i
handler.owner = true

export default handler
