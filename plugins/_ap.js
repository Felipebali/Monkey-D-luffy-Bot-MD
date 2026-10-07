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
                text: "❌ Solo funciona en grupos."
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
                text: "⛔ Solo admins u owners pueden usar este comando."
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
                    text: "📋 No hay solicitudes pendientes."
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
                    text: "❌ No pude obtener los usuarios."
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
        // ✅ RESULTADO
        // ====================================================

        await m.react(
            aprobados > 0
                ? "✅"
                : "❌"
        )

        let resultado =
            `✅ *APROBACIÓN COMPLETADA*\n` +
            `👥 ${aprobados} aprobados`

        if (fallidos > 0) {
            resultado += `\n❌ ${fallidos} fallidos`
        }

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
                text: "⚠️ No se pudieron aprobar las solicitudes."
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
