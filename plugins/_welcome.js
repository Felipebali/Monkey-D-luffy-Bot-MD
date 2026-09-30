// 📂 plugins/welcome.js
// 🎉 Sistema de bienvenida y despedida
// FelixCat_Bot 🐈

let handler = async (m, { conn, text, command, isAdmin }) => {

    // ============================================================
    // 👥 SOLO GRUPOS
    // ============================================================

    if (!m.isGroup) {
        return conn.sendMessage(
            m.chat,
            {
                text: "❌ Solo funciona en grupos."
            }
        )
    }

    // ============================================================
    // 🔐 SOLO ADMIN
    // ============================================================

    if (!isAdmin) {
        return conn.sendMessage(
            m.chat,
            {
                text:
                    "⚠️ Solo los administradores pueden usar este comando."
            }
        )
    }

    // ============================================================
    // 💾 CREAR CONFIGURACIÓN
    // ============================================================

    if (!global.db.data.chats[m.chat])
        global.db.data.chats[m.chat] = {}

    let chat = global.db.data.chats[m.chat]

    // ============================================================
    // 🔧 VALORES POR DEFECTO
    // ============================================================

    const defaultWelcome =
        "🎉 ¡Bienvenido/a!"

    const defaultLeave =
        "👋 Se fue del grupo."

    if (typeof chat.welcome === "undefined")
        chat.welcome = false

    if (!chat.welcomeMsg)
        chat.welcomeMsg = defaultWelcome

    if (!chat.leaveMsg)
        chat.leaveMsg = defaultLeave

    // ============================================================
    // 🔘 ACTIVAR / DESACTIVAR
    // ============================================================

    if (
        command === "welcome" ||
        command === "welc" ||
        command === "wl"
    ) {

        chat.welcome = !chat.welcome

        return conn.sendMessage(
            m.chat,
            {
                text:
                    `✨ *WELCOME ${chat.welcome ? "ACTIVADO" : "DESACTIVADO"}*\n\n` +
                    `📢 Los mensajes de entrada y salida están ` +
                    `${chat.welcome ? "*habilitados*" : "*deshabilitados*"}.`
            }
        )
    }

    // ============================================================
    // ✏️ EDITAR BIENVENIDA
    // ============================================================

    if (command === "set1") {

        if (!text) {
            return m.reply(
                `✏️ *CONFIGURAR BIENVENIDA*\n\n` +
                `Usa:\n` +
                `*.set1 texto*`
            )
        }

        chat.welcomeMsg = text

        return m.reply(
            `✅ *Bienvenida actualizada correctamente.*\n\n` +
            `📝 ${text}`
        )
    }

    // ============================================================
    // ✏️ EDITAR DESPEDIDA
    // ============================================================

    if (command === "set2") {

        if (!text) {
            return m.reply(
                `✏️ *CONFIGURAR DESPEDIDA*\n\n` +
                `Usa:\n` +
                `*.set2 texto*`
            )
        }

        chat.leaveMsg = text

        return m.reply(
            `✅ *Despedida actualizada correctamente.*\n\n` +
            `📝 ${text}`
        )
    }

    // ============================================================
    // 🧹 RESET TOTAL
    // ============================================================

    if (command === "clearwel") {

        chat.welcome = false
        chat.welcomeMsg = defaultWelcome
        chat.leaveMsg = defaultLeave

        return conn.sendMessage(
            m.chat,
            {
                text:
                    `🧹 *MENSAJES REINICIADOS*\n\n` +
                    `🔴 Welcome quedó *DESACTIVADO*.\n` +
                    `🔄 Se restauraron los mensajes por defecto.`
            }
        )
    }
}

// ================================================================
// 🔥 DETECTOR DE ENTRADAS Y SALIDAS
// ================================================================

handler.before = async function (m, { conn }) {

    if (!m.isGroup)
        return

    // ============================================================
    // 💾 CREAR CONFIGURACIÓN
    // ============================================================

    if (!global.db.data.chats[m.chat])
        global.db.data.chats[m.chat] = {}

    let chat = global.db.data.chats[m.chat]

    // ============================================================
    // 🔧 VALORES POR DEFECTO
    // ============================================================

    const defaultWelcome =
        "🎉 ¡Bienvenido/a!"

    const defaultLeave =
        "👋 Se fue del grupo."

    if (typeof chat.welcome === "undefined")
        chat.welcome = false

    if (!chat.welcomeMsg)
        chat.welcomeMsg = defaultWelcome

    if (!chat.leaveMsg)
        chat.leaveMsg = defaultLeave

    // ============================================================
    // 🚫 SI ESTÁ DESACTIVADO
    // ============================================================

    if (!chat.welcome)
        return

    try {

        // ========================================================
        // 👥 PARTICIPANTES ACTUALES
        // ========================================================

        const meta =
            await conn.groupMetadata(m.chat)

        const current =
            meta.participants
                .map(p => p.id)
                .filter(Boolean)

        // ========================================================
        // 🆕 PRIMERA CARGA
        // ========================================================

        if (!Array.isArray(chat.participants)) {
            chat.participants = current
            return
        }

        const old = chat.participants

        // ========================================================
        // 🎉 NUEVOS
        // ========================================================

        const added =
            current.filter(
                user => !old.includes(user)
            )

        // ========================================================
        // 👋 SALIERON
        // ========================================================

        const removed =
            old.filter(
                user => !current.includes(user)
            )

        const groupName =
            meta.subject || "este grupo"

        // ========================================================
        // 🎉 BIENVENIDA — UNO
        // ========================================================

        if (added.length === 1) {

            const user = added[0]

            const username =
                `@${user.split("@")[0]}`

            let texto =
                chat.welcomeMsg ||
                defaultWelcome

            texto = texto
                .replace(/@user/g, username)
                .replace(/@group/g, groupName)

            const finalText = `
╭━━━〔 🎉 BIENVENIDO 〕━━━⬣
┃ 👤 Usuario: ${username}
┃ 🏷️ Grupo: *${groupName}*
┃━━━━━━━━━━━━━━━━━━━━
┃ ${texto}
╰━━━━━━━━━━━━━━━━━━━━⬣
`.trim()

            await conn.sendMessage(
                m.chat,
                {
                    text: finalText,
                    mentions: [user]
                }
            )
        }

        // ========================================================
        // 🎉 BIENVENIDA — VARIOS
        // ========================================================

        else if (added.length > 1) {

            let texto =
                chat.welcomeMsg ||
                defaultWelcome

            texto = texto
                .replace(
                    /@user/g,
                    "los nuevos integrantes"
                )
                .replace(
                    /@group/g,
                    groupName
                )

            const finalText = `
╭━━━〔 🎉 BIENVENIDOS 〕━━━⬣
┃ 🏷️ Grupo: *${groupName}*
┃ 👥 Nuevos integrantes: *${added.length}*
┃━━━━━━━━━━━━━━━━━━━━
┃ ${texto}
╰━━━━━━━━━━━━━━━━━━━━⬣
`.trim()

            await conn.sendMessage(
                m.chat,
                {
                    text: finalText
                }
            )
        }

        // ========================================================
        // 👋 DESPEDIDA — UNO
        // ========================================================

        if (removed.length === 1) {

            const user = removed[0]

            const username =
                `@${user.split("@")[0]}`

            let texto =
                chat.leaveMsg ||
                defaultLeave

            texto = texto
                .replace(/@user/g, username)
                .replace(/@group/g, groupName)

            const finalText = `
╭━━━〔 👋 DESPEDIDA 〕━━━⬣
┃ 👤 Usuario: ${username}
┃ 🏷️ Grupo: *${groupName}*
┃━━━━━━━━━━━━━━━━━━━━
┃ ${texto}
╰━━━━━━━━━━━━━━━━━━━━⬣
`.trim()

            await conn.sendMessage(
                m.chat,
                {
                    text: finalText,
                    mentions: [user]
                }
            )
        }

        // ========================================================
        // 👋 DESPEDIDA — VARIOS
        // ========================================================

        else if (removed.length > 1) {

            let texto =
                chat.leaveMsg ||
                defaultLeave

            texto = texto
                .replace(
                    /@user/g,
                    "los integrantes que salieron"
                )
                .replace(
                    /@group/g,
                    groupName
                )

            const finalText = `
╭━━━〔 👋 DESPEDIDA 〕━━━⬣
┃ 🏷️ Grupo: *${groupName}*
┃ 👥 Integrantes que salieron: *${removed.length}*
┃━━━━━━━━━━━━━━━━━━━━
┃ ${texto}
╰━━━━━━━━━━━━━━━━━━━━⬣
`.trim()

            await conn.sendMessage(
                m.chat,
                {
                    text: finalText
                }
            )
        }

        // ========================================================
        // 💾 ACTUALIZAR LISTA
        // ========================================================

        chat.participants = current

    } catch (error) {

        console.error(
            "❌ Error en sistema de bienvenida:",
            error
        )
    }
}

// ================================================================
// 📌 COMANDOS
// ================================================================

handler.command = [
    "welcome",
    "welc",
    "wl",
    "set1",
    "set2",
    "clearwel"
]

handler.group = true
handler.admin = true

export default handler
