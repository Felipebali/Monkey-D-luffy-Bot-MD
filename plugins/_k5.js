
/**
 * 📂 plugins/kickall.js
 * 🧹 WHATSAPP-BOT — KICKALL SILENCIOSO
 *
 * • Comando exclusivo de owners
 * • Expulsa hasta 10 participantes por tanda, en una llamada
 * • Espera 10 segundos entre tandas
 * • No envía mensajes al grupo
 * • Protege administradores, owners, creador y bot
 * • Evita ejecuciones simultáneas por grupo
 * • Se detiene ante errores consecutivos
 */

const BATCH_SIZE = 10
const BATCH_DELAY = 10000
const MAX_CONSECUTIVE_ERRORS = 3

const running = new Set()

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

// ============================================================
// 🔧 NORMALIZACIÓN DE JID
// ============================================================

function normalizeJid(jid = '') {
    return String(jid || '')
        .trim()
        .replace(/:\d+(?=@)/g, '')
        .toLowerCase()
}

// ============================================================
// 👑 OWNERS
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
                    id.replace(/^\+/, '') + '@s.whatsapp.net'
                )
                : normalizeJid(id)
        })
        .filter(Boolean)
}

function isOwnerJid(jid, owners) {
    const normalized = normalizeJid(jid)

    if (!normalized) return false

    if (owners.includes(normalized)) return true

    const number = normalized.split('@')[0]

    return owners.some(owner =>
        owner.split('@')[0] === number
    )
}

// ============================================================
// 🔎 PARTICIPANTES
// ============================================================

function idsOf(participant) {
    return [
        participant?.id,
        participant?.jid,
        participant?.lid
    ]
        .filter(Boolean)
        .map(normalizeJid)
}

function findParticipant(participants, jid) {
    const normalized = normalizeJid(jid)

    return participants.find(participant =>
        idsOf(participant).includes(normalized)
    )
}

// ============================================================
// 🧹 COMANDO KICKALL
// ============================================================

const handler = async (m, { conn }) => {
    // Solo grupos.
    if (!m.isGroup) return

    // Solo owners del bot.
    const owners = getOwners()

    const sender = normalizeJid(
        m.sender || m.participant || ''
    )

    if (!isOwnerJid(sender, owners)) return

    // Evitar ejecuciones simultáneas en el mismo grupo.
    if (running.has(m.chat)) return

    let metadata

    try {
        metadata = await conn.groupMetadata(m.chat)
    } catch (error) {
        console.error(
            '[KICKALL] Error obteniendo metadata:',
            error
        )
        return
    }

    const participants = metadata.participants || []

    // Obtener el JID del bot.
    let botJid

    try {
        botJid = normalizeJid(
            conn.decodeJid
                ? conn.decodeJid(conn.user?.id || '')
                : conn.user?.id || ''
        )
    } catch {
        botJid = normalizeJid(conn.user?.id || '')
    }

    // El bot necesita ser administrador.
    const botParticipant = findParticipant(
        participants,
        botJid
    )

    if (!botParticipant?.admin) return

    // Identificar al creador del grupo.
    const creator = participants.find(participant =>
        participant.admin === 'superadmin' ||
        participant.admin === 'creator'
    )

    const creatorIds = new Set(idsOf(creator))

    // Seleccionar usuarios que pueden ser expulsados.
    const targets = participants.filter(participant => {
        if (!participant.id || participant.admin) {
            return false
        }

        const ids = idsOf(participant)

        // Proteger al bot.
        if (ids.includes(botJid)) return false

        // Proteger a los owners.
        if (ids.some(id => isOwnerJid(id, owners))) {
            return false
        }

        // Proteger al creador del grupo.
        if (ids.some(id => creatorIds.has(id))) {
            return false
        }

        return true
    })

    if (!targets.length) return

    running.add(m.chat)

    let consecutiveErrors = 0
    let removed = 0

    try {
        // Procesar tandas de hasta 10 participantes.
        for (
            let i = 0;
            i < targets.length;
            i += BATCH_SIZE
        ) {
            const batch = targets.slice(
                i,
                i + BATCH_SIZE
            )

            try {
                // Actualizar la lista antes de cada tanda.
                const currentMetadata =
                    await conn.groupMetadata(m.chat)

                const currentParticipants =
                    currentMetadata.participants || []

                const validIds = []

                for (const target of batch) {
                    const participant = findParticipant(
                        currentParticipants,
                        target.id
                    )

                    // El participante ya no está en el grupo.
                    if (!participant?.id) continue

                    const ids = idsOf(participant)

                    // Revalidar las protecciones.
                    if (participant.admin) continue

                    if (ids.includes(botJid)) continue

                    if (
                        ids.some(id =>
                            isOwnerJid(id, owners)
                        )
                    ) continue

                    if (
                        ids.some(id =>
                            creatorIds.has(id)
                        )
                    ) continue

                    validIds.push(participant.id)
                }

                // Expulsar la tanda completa en una sola llamada.
                if (validIds.length > 0) {
                    await conn.groupParticipantsUpdate(
                        m.chat,
                        validIds,
                        'remove'
                    )

                    removed += validIds.length
                }

                // La tanda se procesó sin errores.
                consecutiveErrors = 0

            } catch (error) {
                consecutiveErrors++

                console.error(
                    '[KICKALL] Error procesando tanda:',
                    error
                )

                // Detenerse después de varios errores consecutivos.
                if (
                    consecutiveErrors >=
                    MAX_CONSECUTIVE_ERRORS
                ) {
                    return
                }
            }

            // Esperar 10 segundos antes de la siguiente tanda.
            if (i + BATCH_SIZE < targets.length) {
                await sleep(BATCH_DELAY)
            }
        }

    } catch (error) {
        console.error(
            '[KICKALL] Error general:',
            error
        )

    } finally {
        running.delete(m.chat)
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = ['kickall']
handler.group = true
handler.owner = true

export default handler
