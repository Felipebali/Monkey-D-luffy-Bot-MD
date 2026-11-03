
/**
 * 📂 plugins/fijar.js
 * 🤖 WHATSAPP-BOT — SISTEMA DE MENSAJES FIJADOS
 *
 * 📌 .pin / .fijar
 * 📍 .unpin / .desfijar
 *
 * 🔐 Solo owners y administradores
 * 📩 Funciona respondiendo a un mensaje
 * 📌 Fijado por 30 días
 * 🛡️ Evita operaciones simultáneas
 *
 * Baileys ES Modules
 */

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const PIN_DURATION = 30 * 24 * 60 * 60
const activeGroups = new Set()

// ============================================================
// 🔧 NORMALIZAR JID
// ============================================================

function normalizeJid(jid = '') {
    return String(jid || '')
        .trim()
        .replace(/:\d+(?=@)/g, '')
        .toLowerCase()
}

function decodeJid(conn, jid = '') {
    try {
        if (typeof conn.decodeJid === 'function') {
            return normalizeJid(
                conn.decodeJid(jid) || jid
            )
        }
    } catch (error) {
        console.error(
            '[FIJAR] Error decodificando JID:',
            error
        )
    }

    return normalizeJid(jid)
}

// ============================================================
// 👑 VERIFICAR OWNERS
// ============================================================

function getOwners() {
    const owners = Array.isArray(global.owner)
        ? global.owner
        : global.owner
            ? [global.owner]
            : []

    return owners
        .map(owner => {
            const value = Array.isArray(owner)
                ? owner[0]
                : owner

            if (!value) return null

            const id = String(value).trim()

            return /^\+?\d+$/.test(id)
                ? normalizeJid(
                    id.replace(/^\+/, '') +
                    '@s.whatsapp.net'
                )
                : normalizeJid(id)
        })
        .filter(Boolean)
}

function esOwner(m, conn, isOwner) {
    if (isOwner === true || m.isOwner === true) {
        return true
    }

    const sender = decodeJid(
        conn,
        m.sender || m.participant || ''
    )

    const owners = getOwners()

    if (owners.includes(sender)) return true

    // Evitar comparar números con identificadores LID.
    if (sender.endsWith('@lid')) return false

    const senderNumber = sender.split('@')[0]

    return owners.some(owner =>
        !owner.endsWith('@lid') &&
        owner.split('@')[0] === senderNumber
    )
}

// ============================================================
// 🛡️ VERIFICAR ADMINISTRADOR
// ============================================================

async function esAdministrador(m, conn, isAdmin) {
    if (isAdmin === true) return true

    try {
        const metadata = await conn.groupMetadata(m.chat)

        const participants = metadata.participants || []

        const sender = decodeJid(
            conn,
            m.sender || m.participant || ''
        )

        const participant = participants.find(p => {
            const ids = [
                p.id,
                p.jid,
                p.lid
            ]
                .filter(Boolean)
                .map(id => decodeJid(conn, id))

            return ids.includes(sender)
        })

        return Boolean(participant?.admin)

    } catch (error) {
        console.error(
            '[FIJAR] Error verificando administrador:',
            error
        )

        return false
    }
}

// ============================================================
// 📩 OBTENER MENSAJE CITADO
// ============================================================

function obtenerCitado(m) {
    if (m.quoted?.id) {
        return {
            id: m.quoted.id,
            sender: m.quoted.sender ||
                m.quoted.participant ||
                '',
            fromMe: Boolean(m.quoted.fromMe)
        }
    }

    const context =
        m.message?.extendedTextMessage?.contextInfo ||
        m.msg?.contextInfo ||
        {}

    if (!context.stanzaId) return null

    return {
        id: context.stanzaId,
        sender: context.participant || '',
        fromMe: false
    }
}

// ============================================================
// 🔑 CONSTRUIR CLAVE DEL MENSAJE
// ============================================================

function construirKey(m, conn, citado) {
    const botJid = decodeJid(
        conn,
        conn.user?.id || ''
    )

    const sender = decodeJid(
        conn,
        citado.sender || ''
    )

    const key = {
        remoteJid: m.chat,
        id: citado.id,
        fromMe: Boolean(
            citado.fromMe ||
            (sender && sender === botJid)
        )
    }

    if (sender) {
        key.participant = sender
    }

    return key
}

// ============================================================
// 📤 RESPONDER
// ============================================================

async function responder(conn, m, text) {
    return conn.sendMessage(
        m.chat,
        { text },
        { quoted: m }
    )
}

// ============================================================
// 📌 HANDLER PRINCIPAL
// ============================================================

const handler = async (
    m,
    { conn, command, isAdmin, isOwner }
) => {

    // ========================================================
    // 👥 SOLO GRUPOS
    // ========================================================

    if (!m.isGroup) {
        return responder(
            conn,
            m,
            '❌ Este comando solo funciona en grupos.'
        )
    }

    // ========================================================
    // 👑 PERMISOS
    // ========================================================

    const owner = esOwner(m, conn, isOwner)

    const admin = owner
        ? false
        : await esAdministrador(m, conn, isAdmin)

    if (!owner && !admin) {
        return responder(
            conn,
            m,
            `╭━━━〔 🛡️ 〕━━━╮
   *ACCESO DENEGADO*
╰━━━━━━━━━━━━━━╯

❌ Solo los administradores del grupo y los owners del bot pueden utilizar este comando.`
        )
    }

    // ========================================================
    // 📩 VALIDAR MENSAJE CITADO
    // ========================================================

    const citado = obtenerCitado(m)

    if (!citado?.id) {
        return responder(
            conn,
            m,
            `╭━━━〔 📌 〕━━━╮
   *MENSAJES FIJADOS*
╰━━━━━━━━━━━━━━╯

📩 Respondé al mensaje que querés fijar o desfijar.

📌 *.pin* — Fijar mensaje
📌 *.fijar* — Fijar mensaje

📍 *.unpin* — Desfijar mensaje
📍 *.desfijar* — Desfijar mensaje

⏳ *Duración del fijado:* 30 días.

🤖 *whatsapp-bot*`
        )
    }

    // ========================================================
    // 🔐 EVITAR OPERACIONES SIMULTÁNEAS
    // ========================================================

    if (activeGroups.has(m.chat)) {
        return responder(
            conn,
            m,
            '⏳ Ya hay una operación en curso. Esperá un momento.'
        )
    }

    activeGroups.add(m.chat)

    try {
        // ====================================================
        // 🔑 CONSTRUIR CLAVE
        // ====================================================

        const key = construirKey(
            m,
            conn,
            citado
        )

        // ====================================================
        // ⚙️ DETERMINAR ACCIÓN
        // ====================================================

        const fijar = /^(pin|fijar)$/i.test(command)

        // ====================================================
        // 📌 PIN IN CHAT — BAILEYS
        // ====================================================

        if (fijar) {
            await conn.sendMessage(m.chat, {
                pin: {
                    type: 1,
                    time: PIN_DURATION,
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
        // 🎨 CONFIRMACIÓN
        // ====================================================

        const actor =
            m.pushName ||
            m.sender ||
            'Desconocido'

        const mensaje = fijar
            ? `╭━━━〔 📌 〕━━━╮
   *MENSAJE FIJADO*
╰━━━━━━━━━━━━━━╯

✅ Se envió la solicitud para fijar el mensaje.

📌 *Acción:* Fijar mensaje
⏳ *Duración:* 30 días
👤 *Ejecutado por:* ${actor}
🛡️ *Permiso:* ${owner ? 'Owner' : 'Administrador'}

🤖 *whatsapp-bot*`
            : `╭━━━〔 📍 〕━━━╮
   *MENSAJE DESFIJADO*
╰━━━━━━━━━━━━━━╯

✅ Se envió la solicitud para desfijar el mensaje.

📍 *Acción:* Desfijar mensaje
👤 *Ejecutado por:* ${actor}
🛡️ *Permiso:* ${owner ? 'Owner' : 'Administrador'}

🤖 *whatsapp-bot*`

        return responder(
            conn,
            m,
            mensaje
        )

    } catch (error) {
        console.error(
            '[FIJAR] Error:',
            error
        )

        const errorText = String(
            error?.message || error
        ).toLowerCase()

        let detalle =
            'No se pudo completar la operación. Revisá la terminal del bot.'

        if (
            errorText.includes('forbidden') ||
            errorText.includes('not-authorized') ||
            errorText.includes('not admin') ||
            errorText.includes('not an admin')
        ) {
            detalle =
                'WhatsApp rechazó la operación por permisos insuficientes.'
        }

        return responder(
            conn,
            m,
            `╭━━━〔 ❌ 〕━━━╮
   *ERROR DE FIJADO*
╰━━━━━━━━━━━━━━╯

${detalle}

🤖 *whatsapp-bot*`
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

// Permisos comprobados dentro del handler.
handler.admin = false
handler.botAdmin = false
handler.rowner = false

export default handler
