
/**
 * 📂 plugins/anticall.js
 * 🤖 WHATSAPP-BOT — ANTICALL AUTOMÁTICO
 *
 * 📞 Detecta llamadas entrantes
 * 🚫 Rechaza llamadas automáticamente
 * 🗑️ Detecta registros de llamada
 * 🧹 Intenta eliminarlos cuando sea posible
 * 👑 Exclusivo para owners
 * ⚙️ .anticall — Activar / Desactivar
 * 💾 Configuración persistente
 *
 * Baileys ES Modules
 */

import fs from 'fs'

const DB_FILE = './database/anticall.json'

fs.mkdirSync('./database', { recursive: true })

// ============================================================
// 💾 CONFIGURACIÓN
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
// 🔐 CONTROL DE EVENTOS
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
// 🗑️ IDENTIFICAR REGISTROS DE LLAMADAS
// ============================================================

function isCallMessage(message) {
    if (!message) return false

    const content = message.message || {}

    const types = [
        'call',
        'callLogMessage',
        'callMessage',
        'callLogMess',
        'callLog'
    ]

    if (
        types.some(type =>
            Object.prototype.hasOwnProperty.call(
                content,
                type
            )
        )
    ) {
        return true
    }

    const stubType = String(
        message.messageStubType || ''
    ).toUpperCase()

    return stubType.includes('CALL')
}

// ============================================================
// 🗑️ INTENTAR ELIMINAR REGISTRO
// ============================================================

async function deleteCallRecord(conn, message) {
    try {
        if (!message?.key?.id) return false

        const key = message.key

        if (!key.remoteJid) return false

        // La eliminación para todos solo funciona
        // sobre mensajes que la cuenta puede revocar.
        if (key.fromMe) {
            await conn.sendMessage(
                key.remoteJid,
                { delete: key }
            )

            console.log(
                '[ANTICALL] Registro propio eliminado:',
                key.id
            )

            return true
        }

        // Para mensajes ajenos no se intenta una
        // revocación global que WhatsApp pueda rechazar.
        console.log(
            '[ANTICALL] Registro ajeno detectado:',
            key.id
        )

        return false

    } catch (error) {
        console.error(
            '[ANTICALL] Error eliminando registro:',
            error
        )

        return false
    }
}

// ============================================================
// 📞 PROCESAR LLAMADAS
// ============================================================

async function processCall(conn, call) {
    if (!config.enabled || !call) return

    if (
        call.status !== 'offer' &&
        call.status !== 'ringing'
    ) return

    if (!call.id || !call.from) return

    const callId = `${call.from}:${call.id}`

    if (!remember(processedCalls, callId)) return

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

        // Algunos eventos incluyen una clave
        // asociada al registro de llamada.
        if (call.messageKey) {
            await deleteCallRecord(conn, {
                key: call.messageKey
            })
        }

    } catch (error) {
        processedCalls.delete(callId)

        console.error(
            '[ANTICALL] Error procesando llamada:',
            error
        )
    }
}

// ============================================================
// 🔄 REGISTRAR LISTENERS
// ============================================================

function registerListeners(conn) {
    if (!conn?.ev?.on) return

    const previous = globalThis.__anticallListeners

    // Evitar duplicados en la misma conexión.
    if (
        previous?.conn === conn &&
        previous?.callListener &&
        previous?.messageListener
    ) return

    // Eliminar listeners anteriores.
    if (previous?.conn?.ev?.off) {
        if (previous.callListener) {
            previous.conn.ev.off(
                'call',
                previous.callListener
            )
        }

        if (previous.messageListener) {
            previous.conn.ev.off(
                'messages.upsert',
                previous.messageListener
            )
        }
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

        const messages = update?.messages || []

        for (const message of messages) {
            try {
                if (!isCallMessage(message)) continue

                const id = message.key?.id

                if (!id) continue

                if (!remember(processedMessages, id)) {
                    continue
                }

                console.log(
                    '[ANTICALL] Registro de llamada detectado:',
                    id
                )

                await deleteCallRecord(
                    conn,
                    message
                )

            } catch (error) {
                console.error(
                    '[ANTICALL] Error procesando registro:',
                    error
                )
            }
        }
    }

    conn.ev.on('call', callListener)

    conn.ev.on(
        'messages.upsert',
        messageListener
    )

    globalThis.__anticallListeners = {
        conn,
        callListener,
        messageListener
    }

    console.log(
        '[ANTICALL] Detectores Call y messages.upsert activos.'
    )
}

// ============================================================
// ⚙️ COMANDO .ANTICALL
// ============================================================

const handler = async (m, { conn, isOwner }) => {
    if (!isOwner) {
        return m.reply(
            '⛔ Este comando es exclusivo para owners.'
        )
    }

    registerListeners(conn)

    config.enabled = !config.enabled

    saveConfig(config)

    if (config.enabled) {
        return m.reply(
            `╭━━━〔 📞 ANTICALL 〕━━━╮
┃
┃ 🟢 *SISTEMA ACTIVADO*
┃
╰━━━━━━━━━━━━━━━━━━╯

🚫 Rechazo automático de llamadas.
🔎 Detección de registros de llamada.
🗑️ Eliminación cuando WhatsApp lo permita.
🔕 Sin mensajes al contacto que llama.

👑 *Configurado por:* Owner
🤖 *whatsapp-bot*`
        )
    }

    return m.reply(
        `╭━━━〔 📞 ANTICALL 〕━━━╮
┃
┃ 🔴 *SISTEMA DESACTIVADO*
┃
╰━━━━━━━━━━━━━━━━━━╯

✅ El bot dejará de rechazar llamadas.
✅ Se desactiva la limpieza automática.

👑 *Configurado por:* Owner
🤖 *whatsapp-bot*`
    )
}

// ============================================================
// 🔄 INICIALIZACIÓN
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
