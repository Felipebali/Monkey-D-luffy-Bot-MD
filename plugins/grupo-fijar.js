
/**
 * 📂 plugins/fijar.js
 * 🤖 whatsapp-bot — Sistema avanzado de mensajes fijados
 *
 * 📌 .pin / .fijar       → Fijar mensaje citado
 * 📍 .unpin / .desfijar  → Desfijar mensaje citado
 *
 * 👑 Owners y administradores del grupo
 * 🔐 Protección contra operaciones simultáneas
 * 📝 Historial de actividad en memoria
 *
 * IMPORTANTE:
 * No se bloquea el comando por una comprobación
 * automática de isBotAdmin que pueda dar falsos negativos.
 */

// ============================================================
// 🔐 PROTECCIÓN CONTRA EJECUCIONES SIMULTÁNEAS
// ============================================================

const activeGroups = new Set()

// ============================================================
// 📝 HISTORIAL DE ACTIVIDAD
// ============================================================

const history = new Map()
const MAX_HISTORY = 50
const TIEMPO_PIN = 2592000 // 30 días

function saveHistory(chat, entry) {
    if (!history.has(chat)) {
        history.set(chat, [])
    }

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
// 🔧 NORMALIZAR JID
// ============================================================

function decodeJid(conn, jid = '') {
    try {
        if (typeof conn.decodeJid === 'function') {
            return conn.decodeJid(jid) || jid
        }
    } catch (error) {
        console.error('[FIJAR] Error normalizando JID:', error)
    }

    return jid
}

// ============================================================
// 👑 VERIFICAR OWNER
// ============================================================

function esOwner(m, conn, isOwner) {
    if (isOwner === true || m.isOwner === true) {
        return true
    }

    const sender = decodeJid(conn, m.sender || '')

    // No tratar un LID como si fuera un número telefónico.
    if (String(sender).includes('@lid')) {
        return false
    }

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
// 🛡️ VERIFICAR ADMINISTRADOR DEL USUARIO
// ============================================================

async function esAdministrador(m, conn) {
    try {
        const metadata = await conn.groupMetadata(m.chat)
        const participantes = metadata?.participants || []

        const sender = decodeJid(conn, m.sender || '')

        const participante = participantes.find(p => {
            const jid = decodeJid(conn, p.id || p.jid || '')

            return jid === sender ||
                p.id === m.sender ||
                p.jid === m.sender
        })

        return Boolean(
            participante?.admin === 'admin' ||
            participante?.admin === 'superadmin'
        )
    } catch (error) {
        console.error('[FIJAR] Error verificando administrador:', error)
        return false
    }
}

// ============================================================
// 📩 OBTENER MENSAJE CITADO
// ============================================================

function obtenerCitado(m) {
    if (m.quoted?.id) {
        return m.quoted
    }

    const contexto =
        m.message?.extendedTextMessage?.contextInfo ||
        m.msg?.contextInfo ||
        {}

    if (!contexto.stanzaId) {
        return null
    }

    return {
        id: contexto.stanzaId,
        sender: contexto.participant || '',
        fromMe: false
    }
}

// ============================================================
// 🔑 CONSTRUIR CLAVE DEL MENSAJE CITADO
// ============================================================

function construirKey(m, conn, citado) {
    const key = {
        remoteJid: m.chat,
        fromMe: Boolean(citado.fromMe),
        id: citado.id
    }

    if (citado.sender) {
        key.participant = decodeJid(conn, citado.sender)
    }

    return key
}

// ============================================================
// 📌 HANDLER PRINCIPAL
// ============================================================

const handler = async (
    m,
    { conn, command, isAdmin, isOwner }
) => {
    // ========================================================
    // 🏢 VALIDAR GRUPO
    // ========================================================

    if (!m.isGroup) {
        return conn.sendMessage(
            m.chat,
            {
                text: '❌ Este comando solo funciona en grupos.'
            },
            { quoted: m }
        )
    }

    // ========================================================
    // 👑 VALIDAR OWNER O ADMINISTRADOR
    // ========================================================

    const owner = esOwner(m, conn, isOwner)

    let admin = isAdmin === true

    if (!admin && !owner) {
        admin = await esAdministrador(m, conn)
    }

    if (!admin && !owner) {
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
    // 🔐 EVITAR OPERACIONES SIMULTÁNEAS
    // ========================================================

    if (activeGroups.has(m.chat)) {
        return conn.sendMessage(
            m.chat,
            {
                text:
                    '⏳ Ya hay una operación en curso. Esperá un momento.'
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
        // 🔑 PREPARAR CLAVE DEL MENSAJE
        // ====================================================

        const key = construirKey(m, conn, citado)

        // ====================================================
        // ⚙️ DETERMINAR OPERACIÓN
        // ====================================================

        const fijar = /^(pin|fijar)$/i.test(command)

        // ====================================================
        // 📡 EJECUTAR OPERACIÓN DE WHATSAPP MEDIANTE BAILEYS
        // ====================================================

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
   *${fijar ? 'SOLICITUD DE FIJADO ENVIADA' : 'SOLICITUD DE DESFIJADO ENVIADA'}*
╰━━━━━━━━━━━━━━━━━━╯

✅ Baileys aceptó el envío de la solicitud.

📌 *Operación:* ${fijar ? 'Fijar mensaje citado' : 'Desfijar mensaje citado'}
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
        console.error('[FIJAR] Error completo:', error)

        const err = String(
            error?.message || error
        ).toLowerCase()

        let detalle =
            'No se pudo completar la operación. Revisá el error de Baileys en la terminal.'

        if (
            err.includes('not-authorized') ||
            err.includes('forbidden') ||
            err.includes('not admin') ||
            err.includes('not an admin')
        ) {
            detalle =
                'WhatsApp rechazó la operación por permisos insuficientes.'
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

// Los permisos se verifican dentro del handler.
handler.admin = false
handler.botAdmin = false
handler.rowner = false

export default handler
