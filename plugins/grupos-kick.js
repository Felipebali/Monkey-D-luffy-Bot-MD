
/**
 * 🤖 WHATSAPP-BOT — KICK SYSTEM
 *
 * 👑 Compatible con owners y rowners
 * 🆔 Compatibilidad JID y LID
 * 🛡️ Protección de propietarios
 * 🔪 Expulsión silenciosa
 * 🔇 Sin mensajes privados
 */

// ============================================================
// 🆔 NORMALIZAR IDENTIFICADORES
// ============================================================

function normalizar(jid) {

    if (!jid) return null

    jid = String(jid)
        .trim()
        .toLowerCase()
        .replace(/:\d+@/, '@')
        .replace(/@c\.us$/, '@s.whatsapp.net')

    if (/^\d+$/.test(jid)) {
        jid += '@s.whatsapp.net'
    }

    if (!/^\d+@(s\.whatsapp\.net|lid)$/.test(jid)) {
        return null
    }

    return jid
}

function obtenerIds(...valores) {

    return [...new Set(
        valores
            .flat(Infinity)
            .map(normalizar)
            .filter(Boolean)
    )]
}

// ============================================================
// 🔄 RESOLVER JID Y LID
// ============================================================

async function resolverIds(conn, ids) {

    const resultado = new Set(ids)

    const mapping = conn.signalRepository
        ? conn.signalRepository.lidMapping
        : null

    if (!mapping) return [...resultado]

    for (const id of ids) {

        try {

            let alternativo

            if (
                id.endsWith('@lid') &&
                typeof mapping.getPNForLID === 'function'
            ) {

                alternativo =
                    await mapping.getPNForLID(id)

            } else if (
                id.endsWith('@s.whatsapp.net') &&
                typeof mapping.getLIDForPN === 'function'
            ) {

                alternativo =
                    await mapping.getLIDForPN(id)
            }

            const jid = normalizar(alternativo)

            if (jid) {
                resultado.add(jid)
            }

        } catch (error) {}
    }

    return [...resultado]
}

// ============================================================
// 👥 IDENTIFICADORES DE PARTICIPANTES
// ============================================================

function idsParticipante(p) {

    if (!p) return []

    return obtenerIds(
        p.id,
        p.jid,
        p.lid,
        p.phoneNumber,
        p.pn
    )
}

function coinciden(idsA, idsB) {

    return idsA.some(id =>
        idsB.includes(id)
    )
}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, {

    conn,
    isAdmin,
    isOwner,
    isROwner,
    groupMetadata

}) => {

    // 🔇 Sin mensajes privados.

    if (!m.isGroup) return

    const emoji = '🔪'

    try {

        // ====================================================
        // 👥 INFORMACIÓN DEL GRUPO
        // ====================================================

        const groupInfo =
            groupMetadata ||
            await conn.groupMetadata(m.chat)

        const participantes =
            groupInfo.participants || []

        // ====================================================
        // 👑 IDENTIFICAR OWNERS DEL BOT
        // ====================================================

        const ownersBot = []

        for (const owner of global.owner || []) {

            const valor = Array.isArray(owner)
                ? owner[0]
                : owner

            const ids = await resolverIds(
                conn,
                obtenerIds(valor)
            )

            ownersBot.push(...ids)
        }

        // ====================================================
        // 👤 IDENTIFICAR AL REMITENTE
        // ====================================================

        const key = m.key || {}

        let senderIds = await resolverIds(
            conn,
            obtenerIds(
                m.sender,
                m.senderPn,
                m.senderLid,
                key.participant,
                key.participantAlt
            )
        )

        const senderParticipante =
            participantes.find(p =>
                coinciden(
                    idsParticipante(p),
                    senderIds
                )
            )

        if (senderParticipante) {

            senderIds = await resolverIds(
                conn,
                obtenerIds(
                    senderIds,
                    idsParticipante(senderParticipante)
                )
            )
        }

        // ====================================================
        // 👑 IDENTIFICAR DUEÑO DEL GRUPO
        // ====================================================

        const creador = participantes.find(
            p => p.admin === 'superadmin'
        )

        const ownerGroup = await resolverIds(
            conn,
            obtenerIds(
                groupInfo.owner,
                groupInfo.ownerPn,
                idsParticipante(creador)
            )
        )

        // ====================================================
        // 🤖 IDENTIFICAR AL BOT
        // ====================================================

        const bot = conn.user || {}

        const botIds = await resolverIds(
            conn,
            obtenerIds(
                bot.id,
                bot.jid,
                bot.lid
            )
        )

        // ====================================================
        // 🔐 PERMISOS
        // ====================================================

        const esOwnerBot = Boolean(

            isOwner ||

            isROwner ||

            coinciden(senderIds, ownersBot)
        )

        const esOwnerGrupo =
            coinciden(senderIds, ownerGroup)

        const esAdminGrupo = Boolean(

            isAdmin ||

            (
                senderParticipante &&
                (
                    senderParticipante.admin === 'admin' ||
                    senderParticipante.admin === 'superadmin'
                )
            )
        )

        if (
            !esAdminGrupo &&
            !esOwnerBot &&
            !esOwnerGrupo
        ) {

            return conn.reply(
                m.chat,
                '❌ Solo admins, el dueño del grupo o los owners del bot pueden usar este comando.',
                m
            )
        }

        // ====================================================
        // 🎯 DETECTAR USUARIO
        // ====================================================

        const mencionados =
            m.mentionedJid || []

        const citado =
            m.quoted || {}

        const user =
            mencionados[0] ||
            citado.sender

        if (!user) {

            return conn.reply(
                m.chat,
                '📌 Debes mencionar o citar un mensaje para expulsar.',
                m
            )
        }

        // ====================================================
        // 🆔 IDENTIFICAR USUARIO OBJETIVO
        // ====================================================

        let userIds = await resolverIds(
            conn,
            obtenerIds(user)
        )

        const participante =
            participantes.find(p =>
                coinciden(
                    idsParticipante(p),
                    userIds
                )
            )

        if (!participante) {

            return conn.reply(
                m.chat,
                '❌ El usuario no se encuentra en el grupo.',
                m
            )
        }

        userIds = await resolverIds(
            conn,
            obtenerIds(
                userIds,
                idsParticipante(participante)
            )
        )

        const userJid =
            participante.id || user

        // ====================================================
        // 👑 PROTEGER AL DUEÑO DEL GRUPO
        // ====================================================

        if (
            participante.admin === 'superadmin' ||
            coinciden(userIds, ownerGroup)
        ) {

            return conn.sendMessage(m.chat, {

                text:
                    `😏 Tranquilo campeón... ` +
                    `@${userJid.split('@')[0]} es el dueño del grupo.\n` +
                    `Ni los dioses del código pueden echarlo.`,

                mentions: [userJid]

            })
        }

        // ====================================================
        // 🛡️ PROTEGER OWNERS DEL BOT
        // ====================================================

        if (coinciden(userIds, ownersBot)) {

            return conn.reply(
                m.chat,
                '😎 Es imposible eliminar a un owner protegido.',
                m
            )
        }

        // ====================================================
        // 🤖 PROTEGER AL PROPIO BOT
        // ====================================================

        if (coinciden(userIds, botIds)) {

            return conn.reply(
                m.chat,
                '😂 ¿Me querés expulsar a mí? Buen intento.',
                m
            )
        }

        // ====================================================
        // 🔪 EXPULSAR USUARIO
        // ====================================================

        const resultado =
            await conn.groupParticipantsUpdate(
                m.chat,
                [userJid],
                'remove'
            )

        // Comprobar que WhatsApp aceptó la expulsión.

        if (
            Array.isArray(resultado) &&
            resultado.length
        ) {

            const estado =
                Number(resultado[0].status)

            if (estado !== 200) {

                throw new Error(
                    `WhatsApp rechazó la expulsión: ${estado}`
                )
            }
        }

        // ====================================================
        // 🎭 REACCIÓN DE ÉXITO
        // ====================================================

        try {

            await conn.sendMessage(m.chat, {

                react: {
                    text: emoji,
                    key: m.key
                }

            })

        } catch (error) {}

        console.log(
            `[KICK] Usuario expulsado: ${userJid} | ` +
            `Grupo: ${m.chat} | ` +
            `Owner: ${esOwnerBot ? 'Sí' : 'No'}`
        )

        // 🔇 Sin mensaje de aviso de expulsión.

    } catch (error) {

        console.error(
            '[KICK] ERROR:',
            error.message || error
        )

        const status = error.output
            ? error.output.statusCode
            : error.statusCode

        if (
            Number(status) === 428 ||
            /connection closed/i.test(
                String(error.message || '')
            )
        ) {

            return
        }

        try {

            await conn.reply(
                m.chat,
                '❌ No se pudo expulsar al usuario. Verificá los permisos del bot.',
                m
            )

        } catch (sendError) {}
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL HANDLER
// ============================================================

handler.help = ['k']

handler.tags = ['grupo']

handler.command = [
    'k',
    'echar',
    'hechar',
    'sacar'
]

handler.admin = false
handler.owner = false
handler.rowner = false
handler.group = true
handler.botAdmin = true
handler.register = false
handler.limit = false

export default handler
