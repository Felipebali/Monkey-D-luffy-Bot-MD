
/**
 * 📂 plugins/anticall.js
 * 🤖 WHATSAPP-BOT — ANTICALL
 *
 * 📞 Detecta llamadas mediante el evento Call
 * 🚫 Rechaza llamadas entrantes
 * 👑 Exclusivo para owners
 * ⚙️ .anticall — Activa o desactiva
 * 💾 Guarda la configuración en JSON
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
        console.error('[ANTICALL] Error leyendo DB:', error)
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
// 📞 DETECTAR LLAMADAS
// ============================================================

function registerCallListener(conn) {
    if (!conn?.ev?.on) return

    const previous = globalThis.__anticallListener

    // No volver a registrar el mismo listener.
    if (
        previous?.conn === conn &&
        previous?.listener
    ) {
        return
    }

    // Eliminar listener anterior.
    if (previous?.conn?.ev?.off) {
        previous.conn.ev.off(
            'call',
            previous.listener
        )
    }

    const listener = async calls => {
        if (!config.enabled) return

        for (const call of calls || []) {
            try {
                if (
                    call.status !== 'offer' &&
                    call.status !== 'ringing'
                ) continue

                if (!call.id || !call.from) continue

                if (typeof conn.rejectCall !== 'function') {
                    console.error(
                        '[ANTICALL] rejectCall no disponible.'
                    )
                    continue
                }

                await conn.rejectCall(
                    call.id,
                    call.from
                )

                console.log(
                    `[ANTICALL] Llamada rechazada: ${call.from}`
                )

            } catch (error) {
                console.error(
                    '[ANTICALL] Error:',
                    error
                )
            }
        }
    }

    conn.ev.on('call', listener)

    globalThis.__anticallListener = {
        conn,
        listener
    }

    console.log('[ANTICALL] Evento Call registrado.')
}

// ============================================================
// ⚙️ COMANDO .anticall
// ============================================================

const handler = async (m, { conn, isOwner }) => {
    if (!isOwner) {
        return m.reply(
            '⛔ Este comando es exclusivo para owners.'
        )
    }

    registerCallListener(conn)

    // Alternar estado.
    config.enabled = !config.enabled

    saveConfig(config)

    if (config.enabled) {
        return m.reply(
            `╭━━━〔 📞 ANTICALL 〕━━━╮
┃
┃ 🟢 *SISTEMA ACTIVADO*
┃
╰━━━━━━━━━━━━━━━━━━╯

🚫 Las llamadas entrantes serán rechazadas automáticamente.

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

✅ El bot dejará de rechazar llamadas entrantes.

👑 *Configurado por:* Owner
🤖 *whatsapp-bot*`
    )
}

// ============================================================
// 🔄 REGISTRAR EVENTO AUTOMÁTICAMENTE
// ============================================================

handler.before = async function (m, { conn }) {
    registerCallListener(conn)
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
