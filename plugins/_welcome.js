// 📂 plugins/welcome.js
// 🎉 FELIXCAT BOT — WELCOME + LEAVE
// 🔘 Toggle usando: .welcome / .welc / .wl
// 🚫 SIN ON / OFF

// ============================================================
// 🎉 MENSAJE PRINCIPAL
// ============================================================

let handler = async (m, { conn, command, isAdmin }) => {

    try {

        // ========================================================
        // 👥 SOLO GRUPOS
        // ========================================================

        if (!m.isGroup) {
            return await conn.sendMessage(
                m.chat,
                {
                    text: '❌ Este comando solo funciona en grupos.'
                },
                {
                    quoted: m
                }
            )
        }

        // ========================================================
        // 👮 SOLO ADMIN
        // ========================================================

        if (!isAdmin) {
            return await conn.sendMessage(
                m.chat,
                {
                    text: '⚠️ Solo los administradores pueden configurar el Welcome.'
                },
                {
                    quoted: m
                }
            )
        }

        // ========================================================
        // 💾 CREAR CONFIGURACIÓN
        // ========================================================

        if (!global.db) {
            global.db = {}
        }

        if (!global.db.data) {
            global.db.data = {}
        }

        if (!global.db.data.chats) {
            global.db.data.chats = {}
        }

        if (!global.db.data.chats[m.chat]) {
            global.db.data.chats[m.chat] = {}
        }

        const chat =
            global.db.data.chats[m.chat]

        // ========================================================
        // ⚙️ VALORES POR DEFECTO
        // ========================================================

        if (typeof chat.welcome !== 'boolean') {
            chat.welcome = false
        }

        if (!Array.isArray(chat.participants)) {
            chat.participants = []
        }

        // ========================================================
        // 🔘 TOGGLE
        // ========================================================

        chat.welcome = !chat.welcome

        // ========================================================
        // 💬 RESPUESTA
        // ========================================================

        const estado =
            chat.welcome
                ? '🟢 ACTIVADO'
                : '🔴 DESACTIVADO'

        const accion =
            chat.welcome
                ? 'habilitados'
                : 'deshabilitados'

        const usado =
            command
                ? `.${command}`
                : '.welcome'

        return await conn.sendMessage(
            m.chat,
            {
                text:
`╭━━━〔 🎉 WELCOME 〕━━━╮
│
│ ${estado}
│
│ 👋 Bienvenidas y despedidas
│    están ${accion}.
│
│ 🔘 Comando utilizado:
│    ${usado}
│
│ 💡 Usa nuevamente:
│    .welcome
│
╰━━━━━━━━━━━━━━━━━━━━╯`
            },
            {
                quoted: m
            }
        )

    } catch (error) {

        console.error(
            '❌ Error en welcome:',
            error
        )

        return await conn.sendMessage(
            m.chat,
            {
                text:
                    '❌ Ocurrió un error al ejecutar el comando Welcome.'
            },
            {
                quoted: m
            }
        )
    }
}


// ============================================================
// 🔥 DETECTOR DE ENTRADAS / SALIDAS
// ============================================================

handler.before = async function (m) {

    try {

        // ========================================================
        // 👥 SOLO GRUPOS
        // ========================================================

        if (!m.isGroup) {
            return
        }

        const conn = this

        // ========================================================
        // 💾 ASEGURAR DB
        // ========================================================

        if (!global.db) {
            global.db = {}
        }

        if (!global.db.data) {
            global.db.data = {}
        }

        if (!global.db.data.chats) {
            global.db.data.chats = {}
        }

        if (!global.db.data.chats[m.chat]) {
            global.db.data.chats[m.chat] = {}
        }

        const chat =
            global.db.data.chats[m.chat]

        // ========================================================
        // 🔘 SI ESTÁ APAGADO
        // ========================================================

        if (!chat.welcome) {
            return
        }

        // ========================================================
        // 📋 OBTENER METADATA
        // ========================================================

        const meta =
            await conn.groupMetadata(
                m.chat
            )

        const current =
            (meta.participants || [])
                .map(p => p.id)
                .filter(Boolean)

        // ========================================================
        // 🆕 PRIMERA CARGA
        // ========================================================

        if (
            !Array.isArray(
                chat.participants
            ) ||
            chat.participants.length === 0
        ) {

            chat.participants =
                current

            return
        }

        // ========================================================
        // 📋 LISTA ANTERIOR
        // ========================================================

        const old =
            chat.participants || []

        // ========================================================
        // 🎉 NUEVOS
        // ========================================================

        const added =
            current.filter(
                id =>
                    !old.includes(id)
            )

        // ========================================================
        // 👋 SALIERON
        // ========================================================

        const removed =
            old.filter(
                id =>
                    !current.includes(id)
            )

        // ========================================================
        // 🏠 NOMBRE DEL GRUPO
        // ========================================================

        const groupName =
            meta.subject ||
            'este grupo'

        // ========================================================
        // 🎉 BIENVENIDA
        // ========================================================

        for (
            const user of added
        ) {

            const number =
                String(user)
                    .split('@')[0]

            await conn.sendMessage(
                m.chat,
                {
                    text:
`╭━━━〔 🎉 BIENVENIDO/A 〕━━━╮
│
│ 👤 @${number}
│
│ 🏠 Grupo:
│ *${groupName}*
│
│ 👥 Ahora somos:
│ *${current.length} integrantes*
│
│ 🔥 ¡Esperamos que disfrutes
│    tu estadía!
│
╰━━━━━━━━━━━━━━━━━━━━╯`,
                    mentions: [
                        user
                    ]
                }
            )
        }

        // ========================================================
        // 👋 DESPEDIDA
        // ========================================================

        for (
            const user of removed
        ) {

            const number =
                String(user)
                    .split('@')[0]

            await conn.sendMessage(
                m.chat,
                {
                    text:
`╭━━━〔 👋 HASTA PRONTO 〕━━━╮
│
│ 👤 @${number}
│
│ 🏠 Grupo:
│ *${groupName}*
│
│ 👥 Ahora somos:
│ *${current.length} integrantes*
│
│ 😢 ¡Hasta pronto!
│
╰━━━━━━━━━━━━━━━━━━━━╯`,
                    mentions: [
                        user
                    ]
                }
            )
        }

        // ========================================================
        // 💾 ACTUALIZAR LISTA
        // ========================================================

        chat.participants =
            current

    } catch (error) {

        console.error(
            '❌ Error en detector welcome:',
            error
        )
    }
}


// ============================================================
// 📚 AYUDA
// ============================================================

handler.help = [
    'welcome',
    'welc',
    'wl'
]


// ============================================================
// 🏷️ CATEGORÍA
// ============================================================

handler.tags = [
    'grupo',
    'admin'
]


// ============================================================
// ⚙️ COMANDOS
// ============================================================

handler.command = [
    'welcome',
    'welc',
    'wl'
]


// ============================================================
// 👥 SOLO GRUPOS
// ============================================================

handler.group = true


// ============================================================
// 👮 SOLO ADMIN
// ============================================================

handler.admin = true


// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
