/**
 * 📂 plugins/fijar.js
 * 🤖 whatsapp-bot — Sistema avanzado de mensajes fijados
 *
 * 📌 .pin / .fijar       → Fijar mensaje citado
 * 📍 .unpin / .desfijar  → Desfijar mensaje citado
 *
 * 🛡️ Administradores + Owners
 * 🤖 El bot debe ser administrador del grupo
 * 🔐 Protección contra ejecuciones simultáneas
 * 📝 Historial de actividad en memoria
 */

// ============================================================
// 🔐 PROTECCIÓN CONTRA EJECUCIONES SIMULTÁNEAS
// ============================================================

const activeGroups = new Set()

// ============================================================
// 📝 HISTORIAL DE ACTIVIDAD EN MEMORIA
// ============================================================

const history = new Map()
const MAX_HISTORY = 50

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
// 🔧 UTILIDADES
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

function getNumber(jid = '') {
    const value = String(jid || '')

    // Los LID no representan necesariamente números telefónicos.
    if (value.includes('@lid')) return ''

    return value.split('@')[0].replace(/\D/g, '')
}

// ============================================================
// 👑 VERIFICAR OWNER
// ============================================================

function esOwner(m, conn, isOwner) {
    if (isOwner === true || m.isOwner === true) {
        return true
    }

    const sender = decodeJid(conn, m.sender || '')
    const numeroSender = getNumber(sender)

    const owners = Array.isArray(global.owner)
        ? global.owner
        : []

    return owners.some(owner => {
        const value = Array.isArray(owner)
            ? owner[0]
            : owner

        const numeroOwner = String(value || '')
            .replace(/\D/g, '')

        return numeroOwner !== '' &&
            numeroOwner === numeroSender
    })
}

// ============================================================
// 🛡️ OBTENER PERMISOS DEL GRUPO
// ============================================================

async function obtenerPermisos(m, conn) {
    const metadata = await conn.groupMetadata(m.chat)
    const participantes = metadata?.participants || []

    const sender = decodeJid(conn, m.sender || '')

    const participante = participantes.find(p => {
        const jid = decodeJid(conn, p.id || p.jid || '')
        return jid === sender ||
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

    const bot = participantes.find(p => {
        const jid = decodeJid(conn, p.id || p.jid || '')
        return jid === botJid
    })

    const botAdmin = Boolean(
        bot?.admin === 'admin' ||
        bot?.admin === 'superadmin'
    )

    return {
        metadata,
        esAdmin,
        botAdmin
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
    { conn, command, isAdmin, isOwner, isBotAdmin }
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

    // Si el contexto no confirma que sea admin,
    // consultar los participantes del grupo.
    if (!admin && !owner) {
        try {
            const permisos = await obtenerPermisos(m, conn)
            admin = permisos.esAdmin
        } catch (error) {
            console.error('[FIJAR] Error verificando permisos:', error)
        }
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
    // 🤖 VALIDAR ADMINISTRADOR DEL BOT
    // ========================================================

    let botAdmin = isBotAdmin === true

    if (!botAdmin) {
        try {
            const permisos = await obtenerPermisos(m, conn)
            botAdmin = permisos.botAdmin
        } catch (error) {
            console.error('[FIJAR] Error verificando al bot:', error)
        }
    }

    if (!botAdmin) {
        return conn.sendMessage(
            m.chat,
            {
                text:
                    '╭━━━〔 🤖 〕━━━╮\n' +
                    '   *PERMISOS INSUFICIENTES*\n' +
                    '╰━━━━━━━━━━━━━━╯\n\n' +
                    'Necesito ser administrador del grupo para fijar o desfijar mensajes.'
            },
            { quoted: m }
        )
    }

    // ========================================================
    // 🔐 EVITAR EJECUCIONES SIMULTÁNEAS
    // ========================================================

    if (activeGroups.has(m.chat)) {
        return conn.sendMessage(
            m.chat,
            {
                text:
                    '⏳ Ya hay una operación de fijado en curso. Esperá un momento.'
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

        const accion = /^(pin|fijar)$/i.test(command)
            ? 'FIJADO'
            : 'DESFIJADO'

        // ====================================================
        // 📡 SOLICITAR OPERACIÓN A WHATSAPP
        // ====================================================

        if (accion === 'FIJADO') {
            await conn.sendMessage(m.chat, {
                pin: {
                    type: 1,
                    time: 2592000,
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

        const actor =
            m.pushName ||
            m.sender ||
            'Desconocido'

        saveHistory(m.chat, {
            actor,
            action: accion,
            group: m.chat,
            sender: m.sender || null,
            messageId: citado.id
        })

        // ====================================================
        // 🎨 CONFIRMACIÓN
        // ====================================================

        const esFijado = accion === 'FIJADO'

        const mensaje = `
╭━━━〔 ${esFijado ? '📌' : '📍'} 〕━━━╮
   *${esFijado ? 'MENSAJE FIJADO' : 'MENSAJE DESFIJADO'}*
╰━━━━━━━━━━━━━━━━━━╯

${esFijado
    ? '✅ Se envió la solicitud para fijar el mensaje citado.'
    : '✅ Se envió la solicitud para desfijar el mensaje citado.'}

👤 *Ejecutado por:* ${actor}
🛡️ *Permiso:* ${owner ? 'Owner' : 'Administrador'}

${esFijado ? '⏳ Duración solicitada: 30 días.' : ''}

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

        const err = String(
            error?.message || error
        ).toLowerCase()

        let detail =
            'No se pudo completar la operación. Intentá nuevamente.'

        if (
            err.includes('not-authorized') ||
            err.includes('forbidden') ||
            err.includes('not admin') ||
            err.includes('not an admin')
        ) {
            detail =
                'WhatsApp rechazó la operación. Verificá que el bot siga siendo administrador.'
        }

        return await conn.sendMessage(
            m.chat,
            {
                text:
                    '╭━━━〔 ❌ 〕━━━╮\n' +
                    '   *ERROR DE CONFIGURACIÓN*\n' +
                    '╰━━━━━━━━━━━━━━╯\n\n' +
                    detail
            },
            { quoted: m }
        )

    } finally {
        // Liberar el bloqueo siempre.
        activeGroups.delete(m.chat)
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL COMANDO
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
