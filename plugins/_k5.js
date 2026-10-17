
/**
 * 📂 plugins/kickall.js
 * 🧹 WHATSAPP-BOT — ELIMINACIÓN POR TANDAS
 *
 * Comando: .kickall
 *
 * • Exclusivo de los owners del bot
 * • Elimina participantes de 10 en 10
 * • Pausa entre tandas
 * • Procesa los usuarios individualmente
 * • Protege administradores, owners, creador y bot
 * • Evita procesos simultáneos
 * • Se detiene ante errores consecutivos
 */

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const BATCH_SIZE = 10
const ACTION_DELAY = 1000
const BATCH_DELAY = 10000
const MAX_CONSECUTIVE_ERRORS = 3

const kickallRunning = new Set()

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// ============================================================
// 🔧 NORMALIZAR JID
// ============================================================

function normalizeJid(jid = '') {
    return String(jid || '')
        .trim()
        .replace(/:\d+(?=@)/g, '')
        .toLowerCase()
}

// ============================================================
// 👑 OBTENER OWNERS
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

            // Si global.owner contiene números sin sufijo.
            if (/^\+?\d+$/.test(id)) {
                return normalizeJid(
                    id.replace(/^\+/, '') + '@s.whatsapp.net'
                )
            }

            return normalizeJid(id)
        })
        .filter(Boolean)
}

// ============================================================
// 🔎 COMPROBAR SI UN JID PERTENECE A UN OWNER
// ============================================================

function isOwnerJid(jid, owners) {
    const normalized = normalizeJid(jid)

    if (!normalized) return false

    if (owners.includes(normalized)) return true

    const number = normalized.split('@')[0]

    return owners.some(owner => {
        const ownerNumber = owner.split('@')[0]
        return number === ownerNumber
    })
}

// ============================================================
// 📩 ENVIAR MENSAJE
// ============================================================

async function reply(conn, m, text) {
    return conn.sendMessage(
        m.chat,
        { text },
        { quoted: m }
    )
}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn }) => {

    // --------------------------------------------------------
    // 👥 SOLO GRUPOS
    // --------------------------------------------------------

    if (!m.isGroup) {
        return reply(
            conn,
            m,
            '❌ *COMANDO NO DISPONIBLE*\n\nEste comando solo funciona en grupos.'
        )
    }

    // --------------------------------------------------------
    // 👑 SOLO OWNERS DEL BOT
    // --------------------------------------------------------

    const owners = getOwners()

    const sender = normalizeJid(
        m.sender || m.participant || ''
    )

    if (!isOwnerJid(sender, owners)) {
        return reply(
            conn,
            m,
            '🔐 *ACCESO DENEGADO*\n\n' +
            'Este comando es exclusivo de los propietarios del bot.'
        )
    }

    // --------------------------------------------------------
    // 🔒 EVITAR PROCESOS SIMULTÁNEOS
    // --------------------------------------------------------

    if (kickallRunning.has(m.chat)) {
        return reply(
            conn,
            m,
            '⚠️ *PROCESO EN EJECUCIÓN*\n\n' +
            'Ya hay un proceso `.kickall` activo en este grupo.'
        )
    }

    // --------------------------------------------------------
    // 📋 OBTENER PARTICIPANTES
    // --------------------------------------------------------

    let metadata

    try {
        metadata = await conn.groupMetadata(m.chat)
    } catch (error) {
        console.error('[KICKALL] Error obteniendo grupo:', error)

        return reply(
            conn,
            m,
            '❌ No pude obtener los participantes del grupo.'
        )
    }

    const participants = metadata.participants || []

    // --------------------------------------------------------
    // 🤖 IDENTIFICAR BOT
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // 🛡️ VERIFICAR ADMINISTRADOR DEL BOT
    // --------------------------------------------------------

    const botParticipant = participants.find(p => {
        const ids = [p.id, p.jid, p.lid]
            .filter(Boolean)
            .map(normalizeJid)

        return ids.includes(botJid)
    })

    if (!botParticipant?.admin) {
        return reply(
            conn,
            m,
            '🤖 *NECESITO SER ADMINISTRADOR*\n\n' +
            'Promocioná al bot a administrador para poder expulsar participantes.'
        )
    }

    // --------------------------------------------------------
    // 👑 IDENTIFICAR CREADOR
    // --------------------------------------------------------

    const creator = participants.find(p =>
        p.admin === 'superadmin' ||
        p.admin === 'creator'
    )

    const creatorIds = [
        creator?.id,
        creator?.jid,
        creator?.lid
    ]
        .filter(Boolean)
        .map(normalizeJid)

    // --------------------------------------------------------
    // 🛡️ FILTRAR PARTICIPANTES PROTEGIDOS
    // --------------------------------------------------------

    const protectedParticipants = new Set([
        botJid,
        ...owners,
        ...creatorIds
    ])

    const targets = participants.filter(p => {
        const ids = [p.id, p.jid, p.lid]
            .filter(Boolean)
            .map(normalizeJid)

        // Proteger al bot, los owners y el creador.
        if (ids.some(id => protectedParticipants.has(id))) {
            return false
        }

        // Proteger a todos los administradores.
        if (p.admin) return false

        // Evitar actuar sobre participantes sin identificador.
        if (!p.id) return false

        return true
    })

    if (!targets.length) {
        return reply(
            conn,
            m,
            'ℹ️ *KICKALL*\n\n' +
            'No encontré participantes que puedan ser expulsados.\n\n' +
            '🛡️ Los administradores, owners, creador y bot están protegidos.'
        )
    }

    // --------------------------------------------------------
    // 🚀 INICIAR PROCESO
    // --------------------------------------------------------

    kickallRunning.add(m.chat)

    let removed = 0
    let errors = 0
    let consecutiveErrors = 0
    let batchNumber = 0
    let stoppedByErrors = false

    try {
        await reply(
            conn,
            m,
            '╭━━━〔 🧹 〕━━━╮\n' +
            '   *KICKALL INICIADO*\n' +
            '╰━━━━━━━━━━━━━━╯\n\n' +
            `👥 *Participantes seleccionados:* ${targets.length}\n` +
            `🔢 *Por tanda:* ${BATCH_SIZE}\n` +
            `⏱️ *Pausa entre tandas:* ${BATCH_DELAY / 1000} segundos\n\n` +
            '🛡️ Administradores, owners, creador y bot protegidos.\n\n' +
            '⚙️ El proceso ha comenzado.'
        )

        // ----------------------------------------------------
        // 🔄 PROCESAR DE 10 EN 10
        // ----------------------------------------------------

        for (let i = 0; i < targets.length; i += BATCH_SIZE) {
            const batch = targets.slice(i, i + BATCH_SIZE)

            batchNumber++

            let batchRemoved = 0

            for (const participant of batch) {
                const jid = participant.id

                try {
                    // Actualizar los participantes antes de expulsar.
                    // Si ya no está, se omite.
                    const currentMetadata = await conn.groupMetadata(m.chat)

                    const stillPresent = currentMetadata.participants?.some(p => {
                        const ids = [p.id, p.jid, p.lid]
                            .filter(Boolean)
                            .map(normalizeJid)

                        return ids.includes(normalizeJid(jid))
                    })

                    if (!stillPresent) {
                        consecutiveErrors = 0
                        continue
                    }

                    // Protección adicional frente a cambios de permisos.
                    const currentParticipant = currentMetadata.participants.find(p => {
                        const ids = [p.id, p.jid, p.lid]
                            .filter(Boolean)
                            .map(normalizeJid)

                        return ids.includes(normalizeJid(jid))
                    })

                    if (
                        !currentParticipant ||
                        currentParticipant.admin ||
                        isOwnerJid(jid, owners) ||
                        normalizeJid(jid) === botJid ||
                        [currentParticipant.id, currentParticipant.jid, currentParticipant.lid]
                            .filter(Boolean)
                            .some(id => creatorIds.includes(normalizeJid(id)))
                    ) {
                        continue
                    }

                    await conn.groupParticipantsUpdate(
                        m.chat,
                        [jid],
                        'remove'
                    )

                    removed++
                    batchRemoved++
                    consecutiveErrors = 0

                    await sleep(ACTION_DELAY)

                } catch (error) {
                    errors++
                    consecutiveErrors++

                    console.error(
                        `[KICKALL] Error con ${jid}:`,
                        error
                    )

                    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                        stoppedByErrors = true
                        break
                    }
                }
            }

            // -----------------------------------------------
            // 📊 INFORME DE LA TANDA
            // -----------------------------------------------

            await reply(
                conn,
                m,
                '╭━━━〔 🔄 〕━━━╮\n' +
                `   *KICKALL — TANDA ${batchNumber}*\n` +
                '╰━━━━━━━━━━━━━━╯\n\n' +
                `✅ *Eliminados en esta tanda:* ${batchRemoved}\n` +
                `📊 *Total eliminados:* ${removed}\n` +
                `❌ *Errores:* ${errors}\n` +
                `👥 *Participantes seleccionados:* ${targets.length}`
            )

            if (stoppedByErrors) break

            if (i + BATCH_SIZE < targets.length) {
                await sleep(BATCH_DELAY)
            }
        }

        // ----------------------------------------------------
        // 🛑 RESULTADO FINAL
        // ----------------------------------------------------

        if (stoppedByErrors) {
            await reply(
                conn,
                m,
                '╭━━━〔 🛑 〕━━━╮\n' +
                '   *KICKALL DETENIDO*\n' +
                '╰━━━━━━━━━━━━━━╯\n\n' +
                'Se alcanzó el límite de errores consecutivos.\n\n' +
                `✅ *Eliminados:* ${removed}\n` +
                `❌ *Errores:* ${errors}\n` +
                `🔢 *Tandas procesadas:* ${batchNumber}\n\n` +
                '⚠️ Revisá los permisos y la conexión antes de volver a intentarlo.'
            )
        } else {
            await reply(
                conn,
                m,
                '╭━━━〔 ✅ 〕━━━╮\n' +
                '   *KICKALL FINALIZADO*\n' +
                '╰━━━━━━━━━━━━━━╯\n\n' +
                `🧹 *Eliminados:* ${removed}\n` +
                `❌ *Errores:* ${errors}\n` +
                `🔢 *Tandas procesadas:* ${batchNumber}\n\n` +
                '🛡️ Los administradores, owners, creador y bot fueron protegidos.'
            )
        }

    } catch (error) {
        console.error('[KICKALL] Error general:', error)

        await reply(
            conn,
            m,
            '❌ *KICKALL INTERRUMPIDO*\n\n' +
            `✅ Eliminados: ${removed}\n` +
            `❌ Errores: ${errors}\n\n` +
            'Ocurrió un error inesperado durante el proceso.'
        )

    } finally {
        kickallRunning.delete(m.chat)
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = ['kickall']
handler.group = true
handler.owner = true

export default handler
