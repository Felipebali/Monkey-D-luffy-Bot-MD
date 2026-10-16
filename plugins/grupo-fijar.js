
/**
 * 📂 plugins/fijar.js
 * 🤖 whatsapp-bot — Sistema avanzado de mensajes fijados
 *
 * 📌 .pin / .fijar       → Fijar mensaje citado
 * 📍 .unpin / .desfijar  → Desfijar mensaje citado
 *
 * 👑 Owners y administradores
 * 🤖 El bot debe ser administrador
 * 🔐 Protección contra operaciones simultáneas
 * 📝 Historial de actividad en memoria
 */

const activeGroups = new Set()
const history = new Map()
const MAX_HISTORY = 50
const TIEMPO_PIN = 2592000 // 30 días

// ============================================================
// 📝 HISTORIAL
// ============================================================

function saveHistory(chat, entry) {
    if (!history.has(chat)) history.set(chat, [])

    const records = history.get(chat)

    records.unshift({
        ...entry,
        timestamp: new Date().toISOString()
    })

    if (records.length > MAX_HISTORY) {
        records.length = MAX_HISTORY
    }
}

// ============================================================
// 👑 VERIFICAR OWNER
// ============================================================

function esOwner(m, conn, isOwner) {
    if (isOwner === true || m.isOwner === true) return true

    const sender = conn.decodeJid?.(m.sender || '') || m.sender || ''
    const numeroSender = String(sender)
        .split('@')[0]
        .replace(/\D/g, '')

    const owners = Array.isArray(global.owner)
        ? global.owner
        : []

    return owners.some(owner => {
        const valor = Array.isArray(owner) ? owner[0] : owner
        const numeroOwner = String(valor || '').replace(/\D/g, '')

        return numeroOwner !== '' && numeroOwner === numeroSender
    })
}

// ============================================================
// 📩 OBTENER MENSAJE CITADO
// ============================================================

function obtenerCitado(m) {
    if (m.quoted?.id) return m.quoted

    const contexto =
        m.message?.extendedTextMessage?.contextInfo ||
        m.msg?.contextInfo ||
        {}

    if (!contexto.stanzaId) return null

    return {
        id: contexto.stanzaId,
        sender: contexto.participant || '',
        fromMe: false
    }
}

// ============================================================
// 📌 HANDLER PRINCIPAL
// ============================================================

const handler = async (
    m,
    { conn, command, isAdmin, isOwner, isBotAdmin }
) => {
    // ========================================================
    // 🏢 VALIDAR GRUPO
    // ========================================================

    if (!m.isGroup) {
        return conn.sendMessage(
            m.chat,
            { text: '❌ Este comando solo funciona en grupos.' },
            { quoted: m }
        )
    }

    // ========================================================
    // 👑 VALIDAR OWNER O ADMINISTRADOR
    // ========================================================

    const owner = esOwner(m, conn, isOwner)

    if (!isAdmin && !owner) {
        return conn.sendMessage(
            m.chat,
            {
                text:
                    '╭━━━〔 🛡️ 〕━━━╮\n' +
                    '   *ACCESO DENEGADO*\n' +
                    '╰━━━━━━━━━━━━━━╯\n\n' +
                    '❌ Solo los administradores del grupo o owners del bot pueden usar este comando.'
            },
            { quoted: m }
        )
    }

    // ========================================================
    // 🤖 VALIDAR ADMINISTRADOR DEL BOT
    // ========================================================

    if (!isBotAdmin) {
        return conn.sendMessage(
            m.chat,
            {
                text:
                    '╭━━━〔 🤖 〕━━━╮\n' +
                    '   *EL BOT NO ES ADMINISTRADOR*\n' +
                    '╰━━━━━━━━━━━━━━╯\n\n' +
                    'Necesito ser administrador del grupo para fijar o desfijar mensajes.\n\n' +
                    '👑 Hacé administrador al bot y volvé a intentarlo.'
            },
            { quoted: m }
        )
    }

    // ========================================================
    // 🔐 EVITAR OPERACIONES SIMULTÁNEAS
    // ========================================================

    if (activeGroups.has(m.chat)) {
        return conn.sendMessage(
            m.chat,
            {
                text: '⏳ Ya hay una operación de fijado en curso. Esperá un momento.'
            },
            { quoted: m }
        )
    }

    activeGroups.add(m.chat)

    try {
        // ====================================================
        // 📩 VALIDAR MENSAJE CITADO
        // ====================================================

        const citado = obtenerCitado(m)

        if (!citado?.id) {
            return await conn.sendMessage(
                m.chat,
                {
                    text:
                        '╭━━━〔 📌 〕━━━╮\n' +
                        '   *MENSAJES FIJADOS*\n' +
                        '╰━━━━━━━━━━━━━━╯\n\n' +
                        'Respondé al mensaje que querés modificar.\n\n' +
                        '📌 *.pin* — Fijar mensaje\n' +
                        '📌 *.fijar* — Fijar mensaje\n' +
                        '📍 *.unpin* — Desfijar mensaje\n' +
                        '📍 *.desfijar* — Desfijar mensaje'
                },
                { quoted: m }
            )
        }

        // ====================================================
        // 🔑 CONSTRUIR CLAVE DEL MENSAJE
        // ====================================================

        const key = {
            remoteJid: m.chat,
            fromMe: Boolean(citado.fromMe),
            id: citado.id
        }

        if (citado.sender) {
            key.participant =
                conn.decodeJid?.(citado.sender) || citado.sender
        }

        // ====================================================
        // ⚙️ EJECUTAR OPERACIÓN
        // ====================================================

        const fijar = /^(pin|fijar)$/i.test(command)

        if (fijar) {
            await conn.sendMessage(m.chat, {
                pin: {
                    type: 1,
                    time: TIEMPO_PIN,
                    key
                }
            })
        } else {
            await conn.sendMessage(m.chat, {
                pin: {
                    type: 2,
                    time: 0,
                    key
                }
            })
        }

        // ====================================================
        // 📝 REGISTRAR ACTIVIDAD
        // ====================================================

        const actor = m.pushName || m.sender || 'Desconocido'

        saveHistory(m.chat, {
            actor,
            action: fijar ? 'FIJADO' : 'DESFIJADO',
            sender: m.sender || null,
            messageId: citado.id
        })

        // ====================================================
        // 🎨 CONFIRMACIÓN
        // ====================================================

        const mensaje = `
╭━━━〔 ${fijar ? '📌' : '📍'} 〕━━━╮
   *${fijar ? 'FIJAR MENSAJE' : 'DESFIJAR MENSAJE'}*
╰━━━━━━━━━━━━━━━━━━╯

✅ Solicitud enviada correctamente.

📌 *Operación:* ${fijar ? 'Fijar mensaje' : 'Desfijar mensaje'}
👤 *Ejecutado por:* ${actor}
🛡️ *Permiso:* ${owner ? 'Owner' : 'Administrador'}

${fijar ? '⏳ Duración solicitada: 30 días.' : ''}

━━━━━━━━━━━━━━━━━━
🤖 *whatsapp-bot*
`.trim()

        return await conn.sendMessage(
            m.chat,
            { text: mensaje },
            { quoted: m }
        )

    } catch (error) {
        console.error('[FIJAR]', error)

        const err = String(error?.message || error).toLowerCase()

        let detalle =
            'No se pudo completar la operación. Verificá la compatibilidad de tu versión de Baileys.'

        if (
            err.includes('not-authorized') ||
            err.includes('forbidden') ||
            err.includes('not admin') ||
            err.includes('not an admin')
        ) {
            detalle =
                'WhatsApp rechazó la operación. Comprobá que el bot sea administrador del grupo.'
        }

        return await conn.sendMessage(
            m.chat,
            {
                text:
                    '╭━━━〔 ❌ 〕━━━╮\n' +
                    '   *ERROR AL MODIFICAR EL FIJADO*\n' +
                    '╰━━━━━━━━━━━━━━╯\n\n' +
                    detalle
            },
            { quoted: m }
        )

    } finally {
        activeGroups.delete(m.chat)
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

handler.tags = ['grupo']
handler.command = /^(pin|fijar|unpin|desfijar)$/i

handler.group = true
handler.admin = false
handler.botAdmin = true
handler.rowner = false

export default handler
