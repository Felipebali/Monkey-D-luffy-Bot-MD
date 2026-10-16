
/**
 * 📂 plugins/fijar.js
 * 🤖 whatsapp-bot — Sistema avanzado de mensajes fijados
 *
 * 📌 .pin / .fijar       → Fijar mensaje citado
 * 📍 .unpin / .desfijar  → Desfijar mensaje citado
 *
 * 👑 Administradores + Owners
 * 🤖 El bot debe ser administrador
 * 🔐 Protección contra operaciones simultáneas
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
// 🛡️ VERIFICAR ADMINISTRADOR DEL GRUPO
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

    // Obtener el JID del bot.
    const botJid = decodeJid(
        conn,
        conn.user?.id || conn.user?.jid || ''
    )

    const numeroBot = String(botJid)
        .split('@')[0]
        .replace(/\D/g, '')

    const bot = participantes.find(p => {
        const jid = decodeJid(conn, p.id || p.jid || '')

        if (jid === botJid) return true

        // Comparación telefónica cuando ambos JID
        // representan números de teléfono.
        const numeroParticipante = String(jid)
            .split('@')[0]
            .replace(/\D/g, '')

        return (
            !String(jid).includes('@lid') &&
            !String(botJid).includes('@lid') &&
            numeroBot !== '' &&
            numeroParticipante === numeroBot
        )
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
// 🔑 CONSTRUIR CLAVE DEL MENSAJE
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

    // Consultar los participantes si el contexto
    // no confirma que el usuario sea administrador.
    if (!admin && !owner) {
        try {
            const permisos = await obtenerPermisos(m, conn)
            admin = permisos.esAdmin
        } catch (error) {
            console.error('[FIJAR] Error verificando administrador:', error)
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

    // Si el contexto no lo confirma, consultar los metadatos.
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
                    '   *EL BOT NO ES ADMINISTRADOR*\n' +
                    '╰━━━━━━━━━━━━━━╯\n\n' +
                    'No pude verificar que el bot sea administrador del grupo.\n\n' +
                    '👑 Comprobá sus permisos y volvé a intentarlo.'
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
        // 🔑 CONSTRUIR CLAVE DEL MENSAJE
        // ====================================================

        const key = construirKey(m, conn, citado)

        // ====================================================
        // ⚙️ DETERMINAR OPERACIÓN
        // ====================================================

        const fijar = /^(pin|fijar)$/i.test(command)

        // ====================================================
        // 📡 ENVIAR SOLICITUD DE FIJADO
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
                'WhatsApp rechazó la operación. Comprobá los permisos del bot y del grupo.'
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
handler.botAdmin = false
handler.rowner = false

export default handler
