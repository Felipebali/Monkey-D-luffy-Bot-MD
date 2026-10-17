
/**
 * 📂 plugins/kickall.js
 * 🧹 WHATSAPP-BOT — KICKALL SILENCIOSO
 *
 * • Comando exclusivo de owners
 * • Expulsa hasta 10 participantes por tanda
 * • Espera 10 segundos entre tandas
 * • No envía mensajes de inicio, progreso ni finalización
 * • Protege administradores, owners, creador y bot
 * • Evita ejecuciones simultáneas por grupo
 * • Se detiene ante errores consecutivos
 */

const BATCH_SIZE = 10
const ACTION_DELAY = 1000
const BATCH_DELAY = 10000
const MAX_CONSECUTIVE_ERRORS = 3

const running = new Set()

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function normalizeJid(jid = '') {
    return String(jid || '')
        .trim()
        .replace(/:\d+(?=@)/g, '')
        .toLowerCase()
}

function getOwners() {
    const owners = Array.isArray(global.owner)
        ? global.owner
        : global.owner
            ? [global.owner]
            : []

    return owners
        .map(owner => {
            const value = Array.isArray(owner) ? owner[0] : owner
            if (!value) return null

            const id = String(value).trim()

            return /^\+?\d+$/.test(id)
                ? normalizeJid(id.replace(/^\+/, '') + '@s.whatsapp.net')
                : normalizeJid(id)
        })
        .filter(Boolean)
}

function isOwnerJid(jid, owners) {
    const normalized = normalizeJid(jid)
    if (!normalized) return false

    if (owners.includes(normalized)) return true

    const number = normalized.split('@')[0]

    return owners.some(owner => owner.split('@')[0] === number)
}

function idsOf(participant) {
    return [
        participant?.id,
        participant?.jid,
        participant?.lid
    ].filter(Boolean).map(normalizeJid)
}

function findParticipant(participants, jid) {
    const jidNormalized = normalizeJid(jid)

    return participants.find(p =>
        idsOf(p).includes(jidNormalized)
    )
}

const handler = async (m, { conn }) => {
    // Solo grupos.
    if (!m.isGroup) return

    // Solo owners del bot.
    const owners = getOwners()
    const sender = normalizeJid(m.sender || m.participant || '')

    if (!isOwnerJid(sender, owners)) return

    // Evitar dos procesos simultáneos en el mismo grupo.
    if (running.has(m.chat)) return

    let metadata

    try {
        metadata = await conn.groupMetadata(m.chat)
    } catch (error) {
        console.error('[KICKALL] Error obteniendo metadata:', error)
        return
    }

    const participants = metadata.participants || []

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

    const botParticipant = findParticipant(participants, botJid)

    // El bot necesita ser administrador.
    if (!botParticipant?.admin) return

    // Identificar al creador del grupo.
    const creator = participants.find(p =>
        p.admin === 'superadmin' || p.admin === 'creator'
    )

    const creatorIds = new Set(idsOf(creator))

    // Seleccionar participantes que no sean administradores
    // ni cuentas protegidas.
    const targets = participants.filter(p => {
        if (!p.id || p.admin) return false

        const ids = idsOf(p)

        if (ids.includes(botJid)) return false
        if (ids.some(id => isOwnerJid(id, owners))) return false
        if (ids.some(id => creatorIds.has(id))) return false

        return true
    })

    if (!targets.length) return

    running.add(m.chat)

    let consecutiveErrors = 0
    let removed = 0

    try {
        // Procesar hasta 10 participantes por tanda.
        for (let i = 0; i < targets.length; i += BATCH_SIZE) {
            const batch = targets.slice(i, i + BATCH_SIZE)

            for (const target of batch) {
                try {
                    // Actualizar metadata antes de cada expulsión.
                    const currentMetadata = await conn.groupMetadata(m.chat)
                    const currentParticipants = currentMetadata.participants || []

                    const participant = findParticipant(
                        currentParticipants,
                        target.id
                    )

                    // Ya no está en el grupo.
                    if (!participant) {
                        consecutiveErrors = 0
                        continue
                    }

                    const ids = idsOf(participant)

                    // Revalidar las protecciones.
                    if (
                        participant.admin ||
                        ids.includes(botJid) ||
                        ids.some(id => isOwnerJid(id, owners)) ||
                        ids.some(id => creatorIds.has(id))
                    ) {
                        consecutiveErrors = 0
                        continue
                    }

                    await conn.groupParticipantsUpdate(
                        m.chat,
                        [participant.id],
                        'remove'
                    )

                    removed++
                    consecutiveErrors = 0

                } catch (error) {
                    consecutiveErrors++

                    console.error(
                        '[KICKALL] Error al expulsar participante:',
                        error
                    )

                    // Detenerse si WhatsApp rechaza varias acciones seguidas.
                    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                        return
                    }
                }

                // Pausa entre expulsiones individuales.
                await sleep(ACTION_DELAY)
            }

            // Esperar 10 segundos antes de la siguiente tanda.
            if (i + BATCH_SIZE < targets.length) {
                await sleep(BATCH_DELAY)
            }
        }

    } catch (error) {
        console.error('[KICKALL] Error general:', error)

    } finally {
        running.delete(m.chat)
    }
}

handler.command = ['kickall']
handler.group = true
handler.owner = true

export default handler
