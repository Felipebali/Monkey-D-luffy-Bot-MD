// 📂 plugins/aprobar.js
// ✅ Aprueba todas las solicitudes pendientes
// FelixCat_Bot 🐈

// ============================================================
// 👑 SISTEMA UNIVERSAL DE OWNERS
// ============================================================

function getOwners() {
    return (global.owner || [])
        .map(v => {
            if (Array.isArray(v)) v = v[0]

            if (
                typeof v !== "string" &&
                typeof v !== "number"
            ) return null

            return String(v).replace(/[^0-9]/g, "")
        })
        .filter(Boolean)
}

function getOwnersJid() {
    return getOwners().map(number => `${number}@s.whatsapp.net`)
}

// ============================================================
// 🔧 NORMALIZAR JID
// ============================================================

function normalizeJid(jid) {
    if (!jid) return ""

    try {
        return String(jid)
            .replace(/:\d+(?=@)/, "")
            .trim()
    } catch {
        return ""
    }
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (m, { conn, isAdmin }) => {

    // ========================================================
    // 👥 SOLO GRUPOS
    // ========================================================

    if (!m.isGroup) {
        return conn.sendMessage(
            m.chat,
            {
                text: "❌ Este comando solamente funciona en grupos."
            },
            { quoted: m }
        )
    }

    // ========================================================
    // 👑 COMPROBAR OWNER
    // ========================================================

    const ownersJid = getOwnersJid()
        .map(normalizeJid)

    const sender = normalizeJid(
        conn.decodeJid
            ? conn.decodeJid(m.sender)
            : m.sender
    )

    const isOwner = ownersJid.includes(sender)

    // ========================================================
    // 🔐 ADMIN U OWNER
    // ========================================================

    if (!isAdmin && !isOwner) {
        return conn.sendMessage(
            m.chat,
            {
                text:
                    `⛔ *ACCESO DENEGADO*\n\n` +
                    `👮 Este comando solamente puede ser utilizado ` +
                    `por administradores del grupo u owners del bot.`
            },
            { quoted: m }
        )
    }

    // ========================================================
    // 🔎 OBTENER SOLICITUDES
    // ========================================================

    try {

        const pendingList =
            await conn.groupRequestParticipantsList(m.chat)

        // ====================================================
        // 📭 SIN SOLICITUDES
        // ====================================================

        if (
            !Array.isArray(pendingList) ||
            pendingList.length === 0
        ) {

            return conn.sendMessage(
                m.chat,
                {
                    text:
                        `📋 *SOLICITUDES DE INGRESO*\n\n` +
                        `✅ No hay solicitudes pendientes.`
                },
                { quoted: m }
            )
        }

        // ====================================================
        // 👥 OBTENER JIDS
        // ====================================================

        const users = pendingList
            .map(user => user?.jid)
            .filter(Boolean)
            .map(normalizeJid)
            .filter(Boolean)

        if (!users.length) {

            return conn.sendMessage(
                m.chat,
                {
                    text:
                        `❌ Encontré solicitudes pendientes, ` +
                        `pero no pude obtener sus JID.`
                },
                { quoted: m }
            )
        }

        // ====================================================
        // ⚡ APROBAR
        // ====================================================

        let aprobados = 0
        let fallidos = 0

        const batchSize = 10

        for (
            let i = 0;
            i < users.length;
            i += batchSize
        ) {

            const batch = users.slice(
                i,
                i + batchSize
            )

            try {

                await conn.groupRequestParticipantsUpdate(
                    m.chat,
                    batch,
                    "approve"
                )

                aprobados += batch.length

            } catch (error) {

                console.error(
                    "❌ Error aprobando lote:",
                    error
                )

                // Intentar individualmente
                for (const jid of batch) {

                    try {

                        await conn.groupRequestParticipantsUpdate(
                            m.chat,
                            [jid],
                            "approve"
                        )

                        aprobados++

                    } catch (individualError) {

                        console.error(
                            `❌ No se pudo aprobar ${jid}:`,
                            individualError
                        )

                        fallidos++
                    }
                }
            }
        }

        // ====================================================
        // ✅ ÚNICO MENSAJE FINAL
        // ====================================================

        await m.react(
            aprobados > 0
                ? "✅"
                : "❌"
        )

        let resultado =
            `🎉 *SOLICITUDES PROCESADAS*\n\n` +
            `👥 Encontradas: *${users.length}*\n` +
            `✅ Aprobadas: *${aprobados}*\n`

        if (fallidos > 0) {
            resultado +=
                `❌ No aprobadas: *${fallidos}*\n`
        }

        resultado +=
            `\n━━━━━━━━━━━━━━━━━━━━\n` +
            `📌 *Proceso finalizado.*`

        return conn.sendMessage(
            m.chat,
            {
                text: resultado
            },
            { quoted: m }
        )

    } catch (err) {

        console.error(
            "❌ Error general en aprobar:",
            err
        )

        await m.react("❌")

        return conn.sendMessage(
            m.chat,
            {
                text:
                    `⚠️ *ERROR AL APROBAR SOLICITUDES*\n\n` +
                    `No fue posible procesar las solicitudes.\n\n` +
                    `👮 Asegúrate de que el bot sea administrador ` +
                    `del grupo y tenga permisos para aprobar solicitudes.`
            },
            { quoted: m }
        )
    }
}

// ============================================================
// 📌 CONFIGURACIÓN
// ============================================================

handler.help = [
    "ap",
    "aprobar"
]

handler.tags = [
    "group"
]

handler.command = [
    "ap",
    "aprobar"
]

handler.group = true
handler.botAdmin = true

export default handler
