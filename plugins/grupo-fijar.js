
/**
 * 📂 plugins/fijar.js
 * 🤖 whatsapp-bot — Sistema de mensajes fijados
 *
 * 📌 .pin / .fijar
 *    Fija el mensaje citado.
 *
 * 📍 .unpin / .desfijar
 *    Desfija el mensaje citado.
 *
 * 🔒 Permisos:
 *    • Owners del bot
 *    • Administradores del grupo
 *
 * 🛡️ El bot debe ser administrador del grupo.
 * ⏳ Duración del fijado: 30 días.
 */

const TIEMPO_PIN = 2592000 // 30 días en segundos

// ============================================================
// 🔧 OBTENER JID NORMALIZADO
// ============================================================

function decodeJid(conn, jid = '') {
    try {
        if (typeof conn.decodeJid === 'function') {
            return conn.decodeJid(jid) || jid
        }
    } catch (error) {
        console.error('[FIJAR] Error al normalizar JID:', error)
    }

    return jid
}

// ============================================================
// 👑 VERIFICAR OWNER
// ============================================================

function esOwner(m, conn) {
    if (m.isOwner === true) return true

    const sender = decodeJid(conn, m.sender || '')
    const numeroSender = String(sender)
        .split('@')[0]
        .replace(/\D/g, '')

    const owners = Array.isArray(global.owner)
        ? global.owner
        : []

    return owners.some(owner => {
        const valor = Array.isArray(owner)
            ? owner[0]
            : owner

        const numeroOwner = String(valor || '')
            .replace(/\D/g, '')

        return numeroOwner !== '' &&
            numeroOwner === numeroSender
    })
}

// ============================================================
// 🛡️ OBTENER PARTICIPANTES Y VERIFICAR ADMINISTRADORES
// ============================================================

async function obtenerPermisos(m, conn) {
    try {
        const metadata = await conn.groupMetadata(m.chat)
        const participantes = metadata?.participants || []

        const senderJid = decodeJid(conn, m.sender || '')

        const participante = participantes.find(p => {
            const jid = decodeJid(conn, p.id || p.jid || '')
            return jid === senderJid ||
                p.id === m.sender ||
                p.jid === m.sender
        })

        const esAdmin = Boolean(
            participante?.admin === 'admin' ||
            participante?.admin === 'superadmin'
        )

        const botJid = decodeJid(
            conn,
            conn.user?.id || conn.user?.jid || ''
        )

        const botParticipante = participantes.find(p => {
            const jid = decodeJid(conn, p.id || p.jid || '')
            return jid === botJid
        })

        const botAdmin = Boolean(
            botParticipante?.admin === 'admin' ||
            botParticipante?.admin === 'superadmin'
        )

        return { esAdmin, botAdmin }
    } catch (error) {
        console.error('[FIJAR] Error obteniendo permisos:', error)
        return { esAdmin: false, botAdmin: false }
    }
}

// ============================================================
// 📩 OBTENER MENSAJE CITADO
// ============================================================

function obtenerCitado(m) {
    if (m.quoted) return m.quoted

    const contexto =
        m.message?.extendedTextMessage?.contextInfo ||
        m.msg?.contextInfo ||
        {}

    if (!contexto.stanzaId) return null

    return {
        id: contexto.stanzaId,
        sender: contexto.participant || m.chat,
        fromMe: false
    }
}

// ============================================================
// 📌 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn, command }) => {
    try {
        // ----------------------------------------------------
        // 1. VALIDAR GRUPO
        // ----------------------------------------------------

        if (!m.isGroup) {
            return m.reply(
                '❌ Este comando solamente funciona en grupos.'
            )
        }

        // ----------------------------------------------------
        // 2. VALIDAR OWNER O ADMINISTRADOR
        // ----------------------------------------------------

        const owner = esOwner(m, conn)

        let permisos = { esAdmin: false, botAdmin: false }

        // Los owners pueden usar el comando aunque no sean
        // administradores del grupo; el bot sí debe ser admin.
        permisos = await obtenerPermisos(m, conn)

        if (!owner && !permisos.esAdmin) {
            return m.reply(
                '🚫 *ACCESO DENEGADO*\n\n' +
                'Este comando es exclusivo para:\n' +
                '👑 Owners del bot\n' +
                '🛡️ Administradores del grupo.'
            )
        }

        // ----------------------------------------------------
        // 3. VALIDAR ADMINISTRADOR DEL BOT
        // ----------------------------------------------------

        if (!permisos.botAdmin) {
            return m.reply(
                '❌ *Necesito ser administrador del grupo.*\n\n' +
                'Dame permisos de administrador para fijar o desfijar mensajes.'
            )
        }

        // ----------------------------------------------------
        // 4. VALIDAR MENSAJE CITADO
        // ----------------------------------------------------

        const citado = obtenerCitado(m)

        if (!citado?.id) {
            return m.reply(
                '📌 *SISTEMA DE MENSAJES FIJADOS*\n\n' +
                'Respondé al mensaje que querés modificar.\n\n' +
                '📍 *Comandos disponibles:*\n' +
                '• `.pin` — Fijar mensaje\n' +
                '• `.fijar` — Fijar mensaje\n' +
                '• `.unpin` — Desfijar mensaje\n' +
                '• `.desfijar` — Desfijar mensaje'
            )
        }

        // ----------------------------------------------------
        // 5. CONSTRUIR CLAVE DEL MENSAJE
        // ----------------------------------------------------

        const key = {
            remoteJid: m.chat,
            fromMe: Boolean(citado.fromMe),
            id: citado.id
        }

        if (citado.sender) {
            key.participant = decodeJid(conn, citado.sender)
        }

        // ----------------------------------------------------
        // 6. FIJAR MENSAJE
        // ----------------------------------------------------

        if (/^(pin|fijar)$/i.test(command)) {
            await conn.sendMessage(m.chat, {
                pin: {
                    type: 1,
                    time: TIEMPO_PIN,
                    key
                }
            })

            return m.reply(
                '📌 *SOLICITUD DE FIJADO ENVIADA*\n\n' +
                '✅ Se solicitó fijar el mensaje citado.\n' +
                '⏳ Duración solicitada: 30 días.\n' +
                `👤 Acción realizada por: ${owner ? 'Owner' : 'Administrador'}.`
            )
        }

        // ----------------------------------------------------
        // 7. DESFIJAR MENSAJE
        // ----------------------------------------------------

        if (/^(unpin|desfijar)$/i.test(command)) {
            await conn.sendMessage(m.chat, {
                pin: {
                    type: 2,
                    time: 0,
                    key
                }
            })

            return m.reply(
                '📍 *SOLICITUD DE DESFIJADO ENVIADA*\n\n' +
                '✅ Se solicitó quitar el fijado del mensaje citado.'
            )
        }

    } catch (error) {
        console.error('[FIJAR] Error:', error)

        return m.reply(
            '❌ *No se pudo completar la operación.*\n\n' +
            'Verificá que el bot sea administrador y que tu versión de Baileys admita mensajes fijados.'
        )
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.help = [
    'pin',
    'fijar',
    'unpin',
    'desfijar'
]

handler.tags = ['group']

handler.command = /^(pin|fijar|unpin|desfijar)$/i

handler.group = true

export default handler
