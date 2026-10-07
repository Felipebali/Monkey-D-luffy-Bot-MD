// 📂 plugins/k5.js
// 🧹 K5 — Eliminación por tandas
// ============================================================
// .k5
//
// • Elimina participantes de a 10
// • Pausa entre cada tanda
// • No elimina administradores
// • No elimina al creador del grupo
// • No elimina owners
// • No elimina al propio bot
// • Detiene el proceso ante demasiados errores
// • Solo OWNER
// • Solo grupos
// ============================================================

const BATCH_SIZE = 10
const BATCH_DELAY = 10000 // 10 segundos entre tandas
const MAX_ERRORS = 3

const k5Running = new Set()

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms))

// ============================================================
// NORMALIZAR JID
// ============================================================

function normalizeJid(jid = '') {
    return jid
        .toString()
        .replace(/:\d+@/, '@')
        .trim()
        .toLowerCase()
}

// ============================================================
// OBTENER OWNERS
// ============================================================

function getOwners() {
    const owners = global.owner || []

    return owners
        .map(owner => {
            if (Array.isArray(owner))
                return owner[0]

            return owner
        })
        .filter(Boolean)
        .map(normalizeJid)
}

// ============================================================
// HANDLER
// ============================================================

let handler = async (m, { conn }) => {

    // ========================================================
    // SOLO GRUPOS
    // ========================================================

    if (!m.isGroup) {
        return conn.sendMessage(
            m.chat,
            {
                text: '❌ Este comando solo puede utilizarse en grupos.'
            },
            { quoted: m }
        )
    }

    // ========================================================
    // OWNER
    // ========================================================

    const owners = getOwners()

    const sender = normalizeJid(
        m.sender || m.participant || ''
    )

    if (!owners.includes(sender)) {
        return conn.sendMessage(
            m.chat,
            {
                text: '❌ Este comando es exclusivo del propietario del bot.'
            },
            { quoted: m }
        )
    }

    // ========================================================
    // EVITAR DOS K5 AL MISMO TIEMPO
    // ========================================================

    if (k5Running.has(m.chat)) {
        return conn.sendMessage(
            m.chat,
            {
                text: '⚠️ Ya hay un proceso `.k5` ejecutándose en este grupo.'
            },
            { quoted: m }
        )
    }

    // ========================================================
    // METADATA
    // ========================================================

    let metadata

    try {
        metadata = await conn.groupMetadata(m.chat)
    } catch (e) {

        console.error('[K5] Error obteniendo metadata:', e)

        return conn.sendMessage(
            m.chat,
            {
                text: '❌ No pude obtener la información del grupo.'
            },
            { quoted: m }
        )
    }

    const participants = metadata.participants || []

    // ========================================================
    // JID DEL BOT
    // ========================================================

    let botJid = ''

    try {
        botJid = normalizeJid(
            conn.decodeJid
                ? conn.decodeJid(conn.user?.id || '')
                : conn.user?.id || ''
        )
    } catch {
        botJid = normalizeJid(conn.user?.id || '')
    }

    // ========================================================
    // IDENTIFICAR CREADOR
    // ========================================================

    const creator =
        participants.find(
            p =>
                p.admin === 'superadmin' ||
                p.admin === 'creator'
        )?.id || ''

    const creatorJid = normalizeJid(creator)

    // ========================================================
    // VERIFICAR QUE EL BOT SEA ADMIN
    // ========================================================

    const botParticipant = participants.find(
        p => normalizeJid(p.id) === botJid
    )

    if (!botParticipant?.admin) {
        return conn.sendMessage(
            m.chat,
            {
                text:
`❌ *No soy administrador.*

Para utilizar \`.k5\` necesito tener permisos de administrador en el grupo.`
            },
            { quoted: m }
        )
    }

    // ========================================================
    // FILTRAR PARTICIPANTES
    // ========================================================

    const targets = participants.filter(p => {

        const jid = normalizeJid(p.id)

        // Bot
        if (jid === botJid)
            return false

        // Owner
        if (owners.includes(jid))
            return false

        // Creador
        if (jid === creatorJid)
            return false

        // Cualquier administrador
        if (p.admin)
            return false

        return true
    })

    if (!targets.length) {
        return conn.sendMessage(
            m.chat,
            {
                text:
`ℹ️ *K5*

No encontré participantes que puedan ser eliminados.

🛡️ Los administradores, owners, creador y bot están protegidos.`
            },
            { quoted: m }
        )
    }

    // ========================================================
    // INICIAR
    // ========================================================

    k5Running.add(m.chat)

    let removed = 0
    let skipped = 0
    let errors = 0
    let batchNumber = 0

    try {

        await conn.sendMessage(
            m.chat,
            {
                text:
`🧹 *K5 INICIADO*

👥 Participantes encontrados: *${targets.length}*
🔢 Tamaño de tanda: *10*
⏳ Pausa entre tandas: *10 segundos*

🛡️ Administradores y owners protegidos.`
            },
            { quoted: m }
        )

        // ====================================================
        // PROCESAR DE 10 EN 10
        // ====================================================

        for (
            let i = 0;
            i < targets.length;
            i += BATCH_SIZE
        ) {

            const batch =
                targets.slice(i, i + BATCH_SIZE)

            batchNumber++

            let batchRemoved = 0

            // ------------------------------------------------
            // ELIMINAR UNO POR UNO
            // ------------------------------------------------

            for (const participant of batch) {

                const jid = participant.id

                try {

                    await conn.groupParticipantsUpdate(
                        m.chat,
                        [jid],
                        'remove'
                    )

                    removed++
                    batchRemoved++

                    // Pequeña separación entre acciones
                    await sleep(1000)

                } catch (error) {

                    errors++
                    skipped++

                    console.error(
                        `[K5] Error eliminando ${jid}:`,
                        error
                    )

                    // ----------------------------------------
                    // SI HAY DEMASIADOS ERRORES, DETENER
                    // ----------------------------------------

                    if (errors >= MAX_ERRORS) {

                        await conn.sendMessage(
                            m.chat,
                            {
                                text:
`🛑 *K5 DETENIDO*

Se produjeron demasiados errores consecutivos.

✅ Eliminados: *${removed}*
⚠️ Omitidos: *${skipped}*
❌ Errores: *${errors}*

El proceso fue detenido para evitar seguir realizando acciones si WhatsApp está rechazando las operaciones.`
                            },
                            { quoted: m }
                        )

                        return
                    }
                }
            }

            // =================================================
            // INFORMAR TANDA
            // =================================================

            const remaining =
                Math.max(
                    targets.length - removed - skipped,
                    0
                )

            await conn.sendMessage(
                m.chat,
                {
                    text:
`🔄 *K5 — TANDA ${batchNumber}*

✅ Eliminados en esta tanda: *${batchRemoved}*
📊 Total eliminados: *${removed}*
⏭️ Omitidos: *${skipped}*
👥 Restantes aproximados: *${remaining}*`
                }
            )

            // =================================================
            // PAUSA ENTRE TANDAS
            // =================================================

            if (i + BATCH_SIZE < targets.length) {

                await sleep(BATCH_DELAY)
            }
        }

        // ====================================================
        // FINALIZAR
        // ====================================================

        await conn.sendMessage(
            m.chat,
            {
                text:
`✅ *K5 FINALIZADO*

🧹 Eliminados: *${removed}*
⏭️ Omitidos: *${skipped}*
❌ Errores: *${errors}*
🔢 Tandas procesadas: *${batchNumber}*

🛡️ Administradores, owners, creador y bot fueron protegidos.`
            }
        )

    } catch (error) {

        console.error('[K5] Error general:', error)

        await conn.sendMessage(
            m.chat,
            {
                text:
`❌ *K5 INTERRUMPIDO*

Ocurrió un error durante el proceso.

✅ Eliminados: *${removed}*
⏭️ Omitidos: *${skipped}*
❌ Errores: *${errors}*`
            },
            { quoted: m }
        )

    } finally {

        // ====================================================
        // LIBERAR BLOQUEO
        // ====================================================

        k5Running.delete(m.chat)
    }
}

// ============================================================
// CONFIGURACIÓN DEL HANDLER
// ============================================================

handler.command = ['k5']
handler.owner = true

export default handler
