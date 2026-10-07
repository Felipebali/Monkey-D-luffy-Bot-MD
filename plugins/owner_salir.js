// 📂 plugins/salir.js
// 🚪 .salir
// 👑 SOLO OWNERS DE global.owner
// ============================================================

const normalize = (value = '') =>
    String(value)
        .replace(/@s\.whatsapp\.net|@lid/g, '')
        .replace(/:\d+/g, '')
        .trim()

let handler = async (m, { conn }) => {

    // ========================================================
    // SOLO GRUPOS
    // ========================================================

    if (!m.isGroup) {
        return conn.sendMessage(
            m.chat,
            {
                text: '❌ Este comando solo funciona en grupos.'
            },
            { quoted: m }
        )
    }

    // ========================================================
    // OBTENER OWNERS DESDE global.owner
    // ========================================================

    const owners = (global.owner || [])
        .map(owner => {
            if (Array.isArray(owner)) {
                return normalize(owner[0])
            }

            return normalize(owner)
        })
        .filter(Boolean)

    // ========================================================
    // IDENTIFICAR QUIÉN EJECUTÓ EL COMANDO
    // ========================================================

    const senderRaw =
        m.sender ||
        m.participant ||
        ''

    const sender = normalize(senderRaw)

    // ========================================================
    // VERIFICAR OWNER
    // ========================================================

    if (!owners.includes(sender)) {
        return conn.sendMessage(
            m.chat,
            {
                text:
`❌ *ACCESO DENEGADO*

👑 Este comando solamente puede ser utilizado por los owners del bot.`
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
    // SALIR DEL GRUPO
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
