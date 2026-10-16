
/**
 * 📂 plugins/evento.js
 * ✨ DETECTOR DE EVENTOS DE GRUPO
 * ⚙️ Activar/desactivar | LID/JID | Avisos premium
 *
 * Detecta:
 * • Cambio de nombre, foto, enlace y descripción
 * • Cambios en los permisos del grupo
 * • Grupo cerrado/abierto para mensajes
 * • Promociones y degradaciones
 */

// ============================================================
// 🗃️ CACHÉ LID/JID
// ============================================================

const lidCache = new Map()

// ============================================================
// 🔧 UTILIDADES
// ============================================================

function normalizeJid(jid = '') {
    return String(jid || '')
        .trim()
        .replace(/:\d+(?=@)/g, '')
}

function getTag(jid) {
    const id = normalizeJid(jid)

    if (!id || !id.includes('@')) return null

    return '@' + id.split('@')[0]
}

function getMentions(ids = []) {
    return [...new Set(
        ids
            .filter(Boolean)
            .map(normalizeJid)
            .filter(id => id.includes('@'))
    )]
}

function getText(value, fallback = 'No disponible') {
    if (Array.isArray(value)) value = value[0]

    if (value === undefined || value === null || value === '') {
        return fallback
    }

    return String(value)
}

function getGroupData(m) {
    if (!global.db || !global.db.data) return null

    if (!global.db.data.chats) {
        global.db.data.chats = {}
    }

    if (!global.db.data.chats[m.chat]) {
        global.db.data.chats[m.chat] = {}
    }

    return global.db.data.chats[m.chat]
}

// ============================================================
// 🆔 RESOLVER JID / LID
// ============================================================

async function resolveUserId(id, conn, chat) {
    const input = normalizeJid(id)

    if (!input) return null

    if (lidCache.has(input)) {
        return lidCache.get(input)
    }

    if (!input.includes('@')) {
        return `${input}@s.whatsapp.net`
    }

    if (!input.endsWith('@lid')) {
        return input
    }

    try {
        const metadata = await conn.groupMetadata(chat)
        const participants = metadata?.participants || []

        const participant = participants.find(p => {
            const ids = [p.id, p.jid, p.lid]
                .filter(Boolean)
                .map(normalizeJid)

            return ids.includes(input)
        })

        if (participant) {
            const phoneJid = [
                participant.phoneNumber,
                participant.jid,
                participant.id
            ]
                .filter(Boolean)
                .map(normalizeJid)
                .find(jid => jid.endsWith('@s.whatsapp.net'))

            if (phoneJid) {
                lidCache.set(input, phoneJid)
                return phoneJid
            }
        }

        // Intentar el mapeo LID → número disponible en Baileys.
        const mapping = conn.signalRepository?.lidMapping

        if (typeof mapping?.getPNForLID === 'function') {
            const phoneJid = await mapping.getPNForLID(input)

            if (phoneJid) {
                const resolved = normalizeJid(phoneJid)
                lidCache.set(input, resolved)
                return resolved
            }
        }
    } catch (error) {
        console.error('[EVENTO-LID]', error)
    }

    // Conservar el LID si no se puede resolver.
    return input
}

// ============================================================
// ⚙️ COMANDO .EVENTO
// ============================================================

const handler = async function (m, { conn, isAdmin, isOwner }) {
    if (!m.isGroup) {
        return m.reply('❌ Este comando solo funciona en grupos.')
    }

    if (!isAdmin && !isOwner && !m.isOwner) {
        return m.reply(
            '🛡️ Solo los administradores o propietarios del bot pueden cambiar esta configuración.'
        )
    }

    const chat = getGroupData(m)

    if (!chat) {
        return m.reply('❌ No se pudo acceder a la base de datos.')
    }

    chat.detect = chat.detect !== true

    const estado = chat.detect
        ? '🟢 ACTIVADO'
        : '🔴 DESACTIVADO'

    const mensaje = `
╭━━━〔 ⚙️ 〕━━━╮
   *SISTEMA DE EVENTOS*
╰━━━━━━━━━━━━━━╯

📡 *Estado:* ${estado}

${chat.detect
    ? '✅ Se notificarán los cambios detectados en el grupo.'
    : '🔕 Las notificaciones de eventos están desactivadas.'}

👤 *Configurado por:* ${m.pushName || 'Administrador'}
`.trim()

    return conn.sendMessage(
        m.chat,
        { text: mensaje },
        { quoted: m }
    )
}

handler.command = ['evento']
handler.group = true
handler.admin = false
handler.rowner = false

// ============================================================
// 📡 DETECTOR DE EVENTOS
// ============================================================

handler.before = async function (m, { conn }) {
    if (!m.isGroup || !m.messageStubType) return

    const chat = global.db?.data?.chats?.[m.chat]

    if (!chat || chat.detect !== true) return

    // --------------------------------------------------------
    // 🤖 BOT PRINCIPAL DEL GRUPO
    // --------------------------------------------------------

    const primaryBot = chat.primaryBot

    if (
        primaryBot &&
        normalizeJid(conn.user?.id) !== normalizeJid(primaryBot)
    ) {
        return
    }

    // --------------------------------------------------------
    // 🛡️ EVITAR EVENTOS PROPIOS DEL BOT
    // --------------------------------------------------------

    const botJid = normalizeJid(conn.user?.id)
    const actorRaw = m.participant || m.sender || null

    if (
        actorRaw &&
        normalizeJid(actorRaw) === botJid
    ) {
        return
    }

    // --------------------------------------------------------
    // 📋 DATOS DEL EVENTO
    // --------------------------------------------------------

    const type = Number(m.messageStubType)
    const params = m.messageStubParameters || []

    const targetRaw = params.find(value =>
        typeof value === 'string' &&
        (value.includes('@') || /^\d{5,20}$/.test(value))
    )

    const actor = actorRaw
        ? await resolveUserId(actorRaw, conn, m.chat)
        : null

    const target = targetRaw
        ? await resolveUserId(targetRaw, conn, m.chat)
        : null

    const actorTag = getTag(actor) || 'Un administrador'
    const targetTag = getTag(target) || 'Un participante'

    const mentions = getMentions([actor, target])

    const subject = params[0]
    const safeSubject = getText(subject, 'Sin información')

    const header =
        '╭━━━〔 ✨ 〕━━━╮\n' +
        '   *EVENTO DEL GRUPO*\n' +
        '╰━━━━━━━━━━━━━━╯\n\n'

    let message = null
    let sendOptions = {}

    // ========================================================
    // 📝 21 — CAMBIO DE NOMBRE
    // ========================================================

    if (type === 21) {
        message =
            header +
            '📝 *NOMBRE DEL GRUPO ACTUALIZADO*\n\n' +
            `👤 *Realizado por:* ${actorTag}\n` +
            `🏷️ *Nuevo nombre:* ${safeSubject}`
    }

    // ========================================================
    // 🖼️ 22 — CAMBIO DE FOTO
    // ========================================================

    else if (type === 22) {
        message =
            header +
            '🖼️ *FOTO DEL GRUPO ACTUALIZADA*\n\n' +
            `📸 *Realizado por:* ${actorTag}`

        try {
            const pp = await conn.profilePictureUrl(m.chat, 'image')

            if (pp) {
                sendOptions = {
                    image: { url: pp },
                    caption: message,
                    mentions
                }
            }
        } catch (error) {
            console.error('[EVENTO-FOTO]', error)
        }
    }

    // ========================================================
    // 🔗 23 — ENLACE DEL GRUPO ACTUALIZADO
    // ========================================================

    else if (type === 23) {
        message =
            header +
            '🔗 *ENLACE DEL GRUPO ACTUALIZADO*\n\n' +
            `👤 *Realizado por:* ${actorTag}\n\n` +
            'ℹ️ El enlace de invitación del grupo fue renovado.'
    }

    // ========================================================
    // 📄 24 — DESCRIPCIÓN ACTUALIZADA
    // ========================================================

    else if (type === 24) {
        message =
            header +
            '📄 *DESCRIPCIÓN ACTUALIZADA*\n\n' +
            `✏️ *Realizado por:* ${actorTag}\n` +
            `📝 *Información:* ${safeSubject}`
    }

    // ========================================================
    // ⚙️ 25 — CONFIGURACIÓN DE INFORMACIÓN DEL GRUPO
    // No confundir con el permiso para enviar mensajes.
    // ========================================================

    else if (type === 25) {
        const setting = String(subject || '').toLowerCase()

        let permission =
            'Se modificó la configuración de información del grupo.'

        if (setting === 'on') {
            permission =
                'Solo los administradores pueden editar la información del grupo.'
        } else if (setting === 'off') {
            permission =
                'Todos los participantes pueden editar la información del grupo.'
        }

        message =
            header +
            '⚙️ *CONFIGURACIÓN MODIFICADA*\n\n' +
            `👤 *Realizado por:* ${actorTag}\n` +
            `🛡️ *Detalle:* ${permission}`
    }

    // ========================================================
    // 🔒 17 — CIERRE / APERTURA PARA MENSAJES
    // ========================================================

    else if (type === 17) {
        const setting = String(params[0] || '').toLowerCase()

        const cerrado = [
            'on',
            'true',
            'announcement',
            'locked'
        ].includes(setting)

        const abierto = [
            'off',
            'false',
            'not_announcement',
            'unlocked'
        ].includes(setting)

        if (cerrado) {
            message =
                header +
                '🔒 *GRUPO CERRADO PARA MENSAJES*\n\n' +
                `👤 *Realizado por:* ${actorTag}\n\n` +
                '🛡️ Solo los administradores pueden enviar mensajes.'
        } else if (abierto) {
            message =
                header +
                '🔓 *GRUPO ABIERTO PARA MENSAJES*\n\n' +
                `👤 *Realizado por:* ${actorTag}\n\n` +
                '💬 Todos los participantes pueden enviar mensajes.'
        }
    }

    // ========================================================
    // 👑 29 — PROMOCIÓN
    // ========================================================

    else if (type === 29) {
        message =
            header +
            '👑 *NUEVO ADMINISTRADOR*\n\n' +
            `🎖️ *Usuario:* ${targetTag}\n` +
            `🛡️ *Acción realizada por:* ${actorTag}\n\n` +
            '✅ Se detectó una promoción a administrador.'
    }

    // ========================================================
    // ⚠️ 30 — DEGRADACIÓN
    // ========================================================

    else if (type === 30) {
        message =
            header +
            '⚠️ *ADMINISTRADOR DEGRADADO*\n\n' +
            `👤 *Usuario:* ${targetTag}\n` +
            `🛡️ *Acción realizada por:* ${actorTag}\n\n` +
            'ℹ️ Se detectó la retirada de permisos de administrador.'
    }

    // ========================================================
    // 🚫 IGNORAR EVENTOS NO CONTEMPLADOS
    // ========================================================

    if (!message) return

    // ========================================================
    // 📤 ENVIAR NOTIFICACIÓN
    // ========================================================

    try {
        const payload = sendOptions.caption
            ? sendOptions
            : {
                text: message,
                mentions
            }

        return await conn.sendMessage(
            m.chat,
            payload,
            { quoted: m }
        )
    } catch (error) {
        console.error('[EVENTO-SEND]', error)
    }
}

// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
