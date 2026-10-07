// 📂 plugins/salir.js
// 🚪 .salir — El bot abandona el grupo
// 👑 SOLO OWNERS
// ============================================================

function normalizeJid(jid = '') {
    return jid
        .toString()
        .replace(/:\d+@/, '@')
        .trim()
        .toLowerCase()
}

function getOwners() {
    return (global.owner || [])
        .map(owner => Array.isArray(owner) ? owner[0] : owner)
        .filter(Boolean)
        .map(normalizeJid)
}

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
    // VERIFICAR OWNER
    // ========================================================

    const owners = getOwners()

    const sender = normalizeJid(
        m.sender || m.participant || ''
    )

    if (!owners.includes(sender)) {
        return conn.sendMessage(
            m.chat,
            {
                text: '❌ Solo los *owners* pueden utilizar este comando.'
            },
            { quoted: m }
        )
    }

    // ========================================================
    // AVISO
    // ========================================================

    await conn.sendMessage(
        m.chat,
        {
            text: '👋 *El bot está saliendo del grupo...*'
        },
        { quoted: m }
    )

    // ========================================================
    // SALIR
    // ========================================================

    try {

        await conn.groupLeave(m.chat)

    } catch (error) {

        console.error('[SALIR] Error:', error)

        await conn.sendMessage(
            m.chat,
            {
                text: '❌ No pude salir del grupo.'
            },
            { quoted: m }
        )
    }
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

handler.command = ['salir']
handler.owner = true

export default handler
