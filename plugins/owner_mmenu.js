// 📂 plugins/mmenu.js
// 👑 MINI MENÚ DE MEDIOS — SOLO OWNER

// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {
    return (global.owner || [])
        .map(o => Array.isArray(o) ? o[0] : o)
        .filter(Boolean)
        .map(v => {
            const number = String(v).replace(/[^0-9]/g, '')
            return number
                ? number + '@s.whatsapp.net'
                : null
        })
        .filter(Boolean)
}

// ============================================================
// 🔐 NORMALIZAR JID
// ============================================================

function normalizeJid(jid) {
    if (!jid) return ''

    return String(jid)
        .replace(/:\d+@/, '@')
        .trim()
}

// ============================================================
// 🚀 HANDLER
// ============================================================

const handler = async (m, { conn }) => {

    try {

        // ========================================================
        // 👤 USUARIO QUE EJECUTA
        // ========================================================

        const sender = conn?.decodeJid
            ? conn.decodeJid(m.sender)
            : normalizeJid(m.sender)

        // ========================================================
        // 👑 VERIFICAR OWNER
        // ========================================================

        const owners =
            getOwners().map(normalizeJid)

        if (!owners.includes(sender)) {
            return
        }

        // ========================================================
        // 📂 MINI MENÚ
        // ========================================================

        const menu =
`╭━━━━━━━━━━━━━━━━━━╮
┃ 📂 *MEDIA MENU*
╰━━━━━━━━━━━━━━━━━━╯

📋 *LISTAR*
• .media
• .media list

📤 *ENVIAR*
• .media <id>

🗑️ *BORRAR*
• .media del <id>
• .media del <id> <id> <id>

🧹 *LIMPIAR TODO*
• .media clear

🔄 *SINCRONIZAR*
• .media sync

╭━━━━━━━━━━━━━━━━━━╮
┃ 👑 *SOLO OWNER*
╰━━━━━━━━━━━━━━━━━━╯`

        // ========================================================
        // 📤 ENVIAR
        // ========================================================

        return conn.reply(
            m.chat,
            menu,
            m
        )

    } catch (e) {

        console.error(
            '❌ MMENU ERROR:',
            e
        )
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
    'mmenu'
]

handler.tags = [
    'owner'
]

handler.command = [
    'mmenu'
]

handler.owner = true

export default handler
