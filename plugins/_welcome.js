// 📂 plugins/welcome.js
// 🎉 WELCOME + LEAVE — FELIXCAT BOT
// 🔘 Toggle usando solamente: .welcome / .welc / .wl
// ❌ NO usa on/off

// ============================================================
// ⚙️ MENSAJES POR DEFECTO
// ============================================================

const DEFAULT_WELCOME =
`🎉 ¡Bienvenido/a @user a @group!
👥 Ahora somos @count integrantes.
🔥 ¡Esperamos que disfrutes del grupo!`

const DEFAULT_LEAVE =
`👋 @user abandonó @group.
👥 Ahora somos @count integrantes.
😢 ¡Hasta pronto!`

// ============================================================
// 🔧 ASEGURAR CONFIGURACIÓN
// ============================================================

function ensureChat(chatId) {

    if (!global.db) return null

    if (!global.db.data) {
        global.db.data = {}
    }

    if (!global.db.data.chats) {
        global.db.data.chats = {}
    }

    if (!global.db.data.chats[chatId]) {
        global.db.data.chats[chatId] = {}
    }

    const chat =
        global.db.data.chats[chatId]

    // Estado principal
    if (typeof chat.welcome !== 'boolean') {
        chat.welcome = false
    }

    // Mensaje bienvenida
    if (!chat.welcomeMsg) {
        chat.welcomeMsg =
            DEFAULT_WELCOME
    }

    // Mensaje despedida
    if (!chat.leaveMsg) {
        chat.leaveMsg =
            DEFAULT_LEAVE
    }

    // Participantes conocidos
    if (!Array.isArray(chat.participants)) {
        chat.participants = []
    }

    // Fotos
    if (typeof chat.welcomePhoto !== 'boolean') {
        chat.welcomePhoto = false
    }

    if (typeof chat.welcomeGroupPhoto !== 'boolean') {
        chat.welcomeGroupPhoto = false
    }

    // Menciones
    if (typeof chat.welcomeMention !== 'boolean') {
        chat.welcomeMention = true
    }

    // Anti spam
    if (typeof chat.welcomeAntiSpam !== 'boolean') {
        chat.welcomeAntiSpam = true
    }

    if (typeof chat.welcomeLastEvent !== 'number') {
        chat.welcomeLastEvent = 0
    }

    return chat
}

// ============================================================
// 🧹 NORMALIZAR JID
// ============================================================

function normalizeJid(jid, conn) {

    if (!jid) return null

    try {

        if (conn?.decodeJid) {
            jid = conn.decodeJid(jid)
        }

    } catch {}

    jid = String(jid)

    if (jid.includes('@')) {
        return jid
    }

    const number =
        jid.replace(/[^0-9]/g, '')

    if (!number) {
        return null
    }

    return `${number}@s.whatsapp.net`
}

// ============================================================
// 🔢 COMPARAR JIDS
// ============================================================

function sameJid(a, b, conn) {

    a = normalizeJid(a, conn)
    b = normalizeJid(b, conn)

    if (!a || !b) {
        return false
    }

    if (a === b) {
        return true
    }

    const clean = jid =>
        String(jid)
            .split(':')[0]
            .split('@')[0]
            .replace(/[^0-9]/g, '')

    return clean(a) === clean(b)
}

// ============================================================
// 👤 OBTENER NÚMERO
// ============================================================

function getNumber(jid) {

    if (!jid) return ''

    return String(jid)
        .split('@')[0]
        .split(':')[0]
}

// ============================================================
// 👤 MENCION
// ============================================================

function mention(jid) {

    return `@${getNumber(jid)}`
}

// ============================================================
// 🧹 JIDS ÚNICOS
// ============================================================

function uniqueJids(list, conn) {

    const result = []

    for (const jid of list || []) {

        const normalized =
            normalizeJid(jid, conn)

        if (!normalized) {
            continue
        }

        const exists =
            result.some(
                x =>
                    sameJid(
                        x,
                        normalized,
                        conn
                    )
            )

        if (exists) {
            continue
        }

        result.push(normalized)
    }

    return result
}

// ============================================================
// 📝 VARIABLES
// ============================================================

function replaceVariables(
    text,
    {
        user = '',
        group = '',
        count = 0,
        members = '',
        bot = 'FelixCat_Bot'
    } = {}
) {

    return String(text || '')
        .replace(/@user/gi, user)
        .replace(/@group/gi, group)
        .replace(/@count/gi, String(count))
        .replace(/@members/gi, members)
        .replace(/@bot/gi, bot)
}

// ============================================================
// 🤖 NOMBRE DEL BOT
// ============================================================

function getBotName() {

    return (
        global.botname ||
        global.botName ||
        'FelixCat_Bot'
    )
}

// ============================================================
// 👥 LISTA DE MIEMBROS
// ============================================================

function buildMembers(users, conn) {

    return uniqueJids(
        users,
        conn
    )
        .map(jid => mention(jid))
        .join('\n')
}

// ============================================================
// 🎉 CONSTRUIR BIENVENIDA
// ============================================================

function buildWelcomeMessage({
    users,
    groupName,
    count,
    custom,
    botName,
    conn
}) {

    const list =
        uniqueJids(
            users,
            conn
        )

    const multiple =
        list.length > 1

    const userText =
        multiple
            ? 'los nuevos integrantes'
            : mention(list[0])

    const membersText =
        buildMembers(
            list,
            conn
        )

    const body =
        replaceVariables(
            custom,
            {
                user: userText,
                group: groupName,
                count,
                members: membersText,
                bot: botName
            }
        )

    const title =
        multiple
            ? '🎉 NUEVOS INTEGRANTES'
            : '🎉 BIENVENIDO/A'

    const message =
`╭━━━〔 ${title} 〕━━━╮
│
│ 🏠 Grupo: *${groupName}*
│ 👥 Integrantes: *${count}*
│
${body
    .split('\n')
    .map(line => `│ ${line}`)
    .join('\n')}
│
╰━━━━━━━━━━━━━━━━━━━━╯`

    return {
        message,
        mentions:
            chatMentions(
                list
            )
    }
}

// ============================================================
// 👋 CONSTRUIR DESPEDIDA
// ============================================================

function buildLeaveMessage({
    users,
    groupName,
    count,
    custom,
    botName,
    conn
}) {

    const list =
        uniqueJids(
            users,
            conn
        )

    const multiple =
        list.length > 1

    const userText =
        multiple
            ? 'los integrantes que salieron'
            : mention(list[0])

    const membersText =
        buildMembers(
            list,
            conn
        )

    const body =
        replaceVariables(
            custom,
            {
                user: userText,
                group: groupName,
                count,
                members: membersText,
                bot: botName
            }
        )

    const title =
        multiple
            ? '👋 INTEGRANTES QUE SALIERON'
            : '👋 HASTA PRONTO'

    const message =
`╭━━━〔 ${title} 〕━━━╮
│
│ 🏠 Grupo: *${groupName}*
│ 👥 Integrantes: *${count}*
│
${body
    .split('\n')
    .map(line => `│ ${line}`)
    .join('\n')}
│
╰━━━━━━━━━━━━━━━━━━━━╯`

    return {
        message,
        mentions:
            chatMentions(
                list
            )
    }
}

// ============================================================
// 📌 MENCIONES
// ============================================================

function chatMentions(list) {
    return Array.isArray(list)
        ? list
        : []
}

// ============================================================
// 📸 FOTO DE USUARIO
// ============================================================

async function getUserPhoto(conn, jid) {

    try {

        return await conn.profilePictureUrl(
            jid,
            'image'
        )

    } catch {

        return null
    }
}

// ============================================================
// 🖼️ FOTO DEL GRUPO
// ============================================================

async function getGroupPhoto(conn, jid) {

    try {

        return await conn.profilePictureUrl(
            jid,
            'image'
        )

    } catch {

        return null
    }
}

// ============================================================
// 📋 OBTENER PARTICIPANTES ACTUALES
// ============================================================

async function getCurrentParticipants(conn, chatId) {

    const meta =
        await conn.groupMetadata(
            chatId
        )

    const participants =
        meta?.participants || []

    return {
        meta,
        ids:
            uniqueJids(
                participants
                    .map(p => p.id)
                    .filter(Boolean),
                conn
            )
    }
}

// ============================================================
// 🚀 COMANDO PRINCIPAL
// ============================================================

let handler = async (
    m,
    {
        conn,
        command,
        text,
        isAdmin
    }
) => {

    // ========================================================
    // 👥 SOLO GRUPOS
    // ========================================================

    if (!m.isGroup) {

        return conn.sendMessage(
            m.chat,
            {
                text:
                    '❌ Este comando solamente funciona en grupos.'
            },
            {
                quoted: m
            }
        )
    }

    // ========================================================
    // 👮 ADMIN
    // ========================================================

    if (!isAdmin) {

        return conn.sendMessage(
            m.chat,
            {
                text:
                    '⚠️ Solo los administradores pueden configurar el Welcome.'
            },
            {
                quoted: m
            }
        )
    }

    const chat =
        ensureChat(
            m.chat
        )

    if (!chat) {
        return m.reply(
            '❌ No se pudo acceder a la base de datos.'
        )
    }

    const cmd =
        String(command || '')
            .toLowerCase()
            .trim()

    const args =
        String(text || '')
            .trim()

    // ========================================================
    // 🎉 WELCOME — TOGGLE
    // ========================================================

    if (
        [
            'welcome',
            'welc',
            'wl'
        ].includes(cmd)
    ) {

        chat.welcome =
            !chat.welcome

        // Actualizar participantes al activar
        if (chat.welcome) {

            try {

                const data =
                    await getCurrentParticipants(
                        conn,
                        m.chat
                    )

                chat.participants =
                    data.ids

            } catch (e) {

                console.error(
                    'Error actualizando participantes:',
                    e
                )
            }
        }

        return m.reply(
`╭━━━〔 🎉 WELCOME 〕━━━╮
│
│ ${
    chat.welcome
        ? '🟢 *SISTEMA ACTIVADO*'
        : '🔴 *SISTEMA DESACTIVADO*'
}
│
│ 🎉 Bienvenidas:
│ ${
    chat.welcome
        ? '🟢 ACTIVADAS'
        : '🔴 DESACTIVADAS'
}
│
│ 👋 Despedidas:
│ ${
    chat.welcome
        ? '🟢 ACTIVADAS'
        : '🔴 DESACTIVADAS'
}
│
╰━━━━━━━━━━━━━━━━━━━━╯

💡 Usa *.welcome* nuevamente para cambiar el estado.`
        )
    }

    // ========================================================
    // ✏️ SET1
    // ========================================================

    if (cmd === 'set1') {

        if (!args) {

            return m.reply(
`✏️ *CONFIGURAR BIENVENIDA*

Uso:

*.set1 <mensaje>*

Variables:

👤 @user
🏠 @group
👥 @count
🧑‍🤝‍🧑 @members
🤖 @bot

Ejemplo:

*.set1 🎉 Bienvenido @user a @group. Somos @count integrantes.*`
            )
        }

        chat.welcomeMsg =
            args

        return m.reply(
`╭━━━〔 ✅ WELCOME ACTUALIZADO 〕━━━╮

📝 Nuevo mensaje:

${args}

╰━━━━━━━━━━━━━━━━━━━━╯`
        )
    }

    // ========================================================
    // ✏️ SETWELCOME
    // ========================================================

    if (cmd === 'setwelcome') {

        if (!args) {

            return m.reply(
                '❌ Debes escribir el nuevo mensaje de bienvenida.'
            )
        }

        chat.welcomeMsg =
            args

        return m.reply(
            '✅ Mensaje de bienvenida actualizado.'
        )
    }

    // ========================================================
    // ✏️ SET2
    // ========================================================

    if (cmd === 'set2') {

        if (!args) {

            return m.reply(
`✏️ *CONFIGURAR DESPEDIDA*

Uso:

*.set2 <mensaje>*

Variables:

👤 @user
🏠 @group
👥 @count
🧑‍🤝‍🧑 @members
🤖 @bot`
            )
        }

        chat.leaveMsg =
            args

        return m.reply(
`╭━━━〔 ✅ LEAVE ACTUALIZADO 〕━━━╮

📝 Nuevo mensaje:

${args}

╰━━━━━━━━━━━━━━━━━━━━╯`
        )
    }

    // ========================================================
    // ✏️ SETLEAVE
    // ========================================================

    if (cmd === 'setleave') {

        if (!args) {

            return m.reply(
                '❌ Debes escribir el nuevo mensaje de despedida.'
            )
        }

        chat.leaveMsg =
            args

        return m.reply(
            '✅ Mensaje de despedida actualizado.'
        )
    }

    // ========================================================
    // 🖼️ FOTO DE USUARIO — TOGGLE
    // ========================================================

    if (cmd === 'welcomefoto') {

        chat.welcomePhoto =
            !chat.welcomePhoto

        return m.reply(
`🖼️ *FOTO DEL USUARIO*

Estado:

${
    chat.welcomePhoto
        ? '🟢 ACTIVADA'
        : '🔴 DESACTIVADA'
}

💡 Usa *.welcomefoto* nuevamente para cambiar.`
        )
    }

    // ========================================================
    // 🏠 FOTO GRUPO — TOGGLE
    // ========================================================

    if (cmd === 'welcomegroup') {

        chat.welcomeGroupPhoto =
            !chat.welcomeGroupPhoto

        return m.reply(
`🏠 *FOTO DEL GRUPO*

Estado:

${
    chat.welcomeGroupPhoto
        ? '🟢 ACTIVADA'
        : '🔴 DESACTIVADA'
}

💡 Usa *.welcomegroup* nuevamente para cambiar.`
        )
    }

    // ========================================================
    // 🧪 TEST WELCOME
    // ========================================================

    if (cmd === 'testwelcome') {

        const data =
            await getCurrentParticipants(
                conn,
                m.chat
            )

        const groupName =
            data.meta.subject ||
            'este grupo'

        const message =
            buildWelcomeMessage({
                users: [
                    m.sender
                ],
                groupName,
                count:
                    data.ids.length,
                custom:
                    chat.welcomeMsg,
                botName:
                    getBotName(),
                conn
            })

        return conn.sendMessage(
            m.chat,
            {
                text:
                    message.message,
                mentions:
                    message.mentions
            },
            {
                quoted: m
            }
        )
    }

    // ========================================================
    // 🧪 TEST LEAVE
    // ========================================================

    if (cmd === 'testleave') {

        const data =
            await getCurrentParticipants(
                conn,
                m.chat
            )

        const groupName =
            data.meta.subject ||
            'este grupo'

        const message =
            buildLeaveMessage({
                users: [
                    m.sender
                ],
                groupName,
                count:
                    data.ids.length,
                custom:
                    chat.leaveMsg,
                botName:
                    getBotName(),
                conn
            })

        return conn.sendMessage(
            m.chat,
            {
                text:
                    message.message,
                mentions:
                    message.mentions
            },
            {
                quoted: m
            }
        )
    }

    // ========================================================
    // 📋 STATUS
    // ========================================================

    if (cmd === 'welcomestatus') {

        return m.reply(
`╭━━━〔 ⚙️ WELCOME STATUS 〕━━━╮
│
│ 🎉 Sistema:
│ ${
    chat.welcome
        ? '🟢 ACTIVADO'
        : '🔴 DESACTIVADO'
}
│
│ 🖼️ Foto usuario:
│ ${
    chat.welcomePhoto
        ? '🟢 ACTIVADA'
        : '🔴 DESACTIVADA'
}
│
│ 🏠 Foto grupo:
│ ${
    chat.welcomeGroupPhoto
        ? '🟢 ACTIVADA'
        : '🔴 DESACTIVADA'
}
│
│ 📢 Menciones:
│ ${
    chat.welcomeMention
        ? '🟢 ACTIVADAS'
        : '🔴 DESACTIVADAS'
}
│
│ 🛡️ Anti-duplicados:
│ ${
    chat.welcomeAntiSpam
        ? '🟢 ACTIVADO'
        : '🔴 DESACTIVADO'
}
│
╰━━━━━━━━━━━━━━━━━━━━╯

🎉 *MENSAJE DE BIENVENIDA*

${chat.welcomeMsg}

━━━━━━━━━━━━━━━━━━━━

👋 *MENSAJE DE DESPEDIDA*

${chat.leaveMsg}`
        )
    }

    // ========================================================
    // 🧹 RESET
    // ========================================================

    if (cmd === 'clearwel') {

        chat.welcome =
            false

        chat.welcomeMsg =
            DEFAULT_WELCOME

        chat.leaveMsg =
            DEFAULT_LEAVE

        chat.welcomePhoto =
            false

        chat.welcomeGroupPhoto =
            false

        chat.welcomeMention =
            true

        chat.welcomeAntiSpam =
            true

        try {

            const data =
                await getCurrentParticipants(
                    conn,
                    m.chat
                )

            chat.participants =
                data.ids

        } catch {

            chat.participants = []
        }

        chat.welcomeLastEvent =
            0

        return m.reply(
`╭━━━〔 🧹 WELCOME REINICIADO 〕━━━╮

🔴 Sistema desactivado
🔄 Mensajes restaurados
🖼️ Fotos desactivadas
📢 Menciones activadas
🛡️ Anti-duplicados activado
👥 Participantes actualizados

╰━━━━━━━━━━━━━━━━━━━━╯`
        )
    }
}

// ============================================================
// 🔥 DETECTOR DE ENTRADAS / SALIDAS
// ============================================================

handler.before =
async function (m) {

    if (!m?.isGroup) {
        return
    }

    const conn =
        this

    try {

        const chat =
            ensureChat(
                m.chat
            )

        if (!chat) {
            return
        }

        // Sistema apagado
        if (!chat.welcome) {
            return
        }

        // ====================================================
        // 📊 OBTENER METADATA
        // ====================================================

        const meta =
            await conn.groupMetadata(
                m.chat
            )

        const current =
            uniqueJids(
                (meta.participants || [])
                    .map(p => p.id)
                    .filter(Boolean),
                conn
            )

        // ====================================================
        // 🆕 PRIMERA VEZ
        // ====================================================

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

        const old =
            uniqueJids(
                chat.participants,
                conn
            )

        // ====================================================
        // 🎉 ENTRARON
        // ====================================================

        const added =
            current.filter(
                user =>
                    !old.some(
                        oldUser =>
                            sameJid(
                                oldUser,
                                user,
                                conn
                            )
                    )
            )

        // ====================================================
        // 👋 SALIERON
        // ====================================================

        const removed =
            old.filter(
                user =>
                    !current.some(
                        currentUser =>
                            sameJid(
                                currentUser,
                                user,
                                conn
                            )
                    )
            )

        const groupName =
            meta.subject ||
            'este grupo'

        const botName =
            getBotName()

        // ====================================================
        // 🛡️ ANTI DUPLICADO
        // ====================================================

        const now =
            Date.now()

        const last =
            Number(
                chat.welcomeLastEvent ||
                0
            )

        const canSend =
            !chat.welcomeAntiSpam ||
            (
                now - last > 3000
            )

        // ====================================================
        // 🎉 BIENVENIDA
        // ====================================================

        if (
            added.length > 0 &&
            canSend
        ) {

            const data =
                buildWelcomeMessage({
                    users:
                        added,
                    groupName,
                    count:
                        current.length,
                    custom:
                        chat.welcomeMsg ||
                        DEFAULT_WELCOME,
                    botName,
                    conn
                })

            let photo =
                null

            // Primero foto del usuario
            if (
                added.length === 1 &&
                chat.welcomePhoto
            ) {

                photo =
                    await getUserPhoto(
                        conn,
                        added[0]
                    )
            }

            // Si no existe, foto grupo
            if (
                !photo &&
                chat.welcomeGroupPhoto
            ) {

                photo =
                    await getGroupPhoto(
                        conn,
                        m.chat
                    )
            }

            if (photo) {

                await conn.sendMessage(
                    m.chat,
                    {
                        image: {
                            url:
                                photo
                        },
                        caption:
                            data.message,
                        mentions:
                            data.mentions
                    }
                )

            } else {

                await conn.sendMessage(
                    m.chat,
                    {
                        text:
                            data.message,
                        mentions:
                            data.mentions
                    }
                )
            }

            chat.welcomeLastEvent =
                now
        }

        // ====================================================
        // 👋 DESPEDIDA
        // ====================================================

        if (
            removed.length > 0 &&
            canSend
        ) {

            const data =
                buildLeaveMessage({
                    users:
                        removed,
                    groupName,
                    count:
                        current.length,
                    custom:
                        chat.leaveMsg ||
                        DEFAULT_LEAVE,
                    botName,
                    conn
                })

            await conn.sendMessage(
                m.chat,
                {
                    text:
                        data.message,
                    mentions:
                        data.mentions
                }
            )

            chat.welcomeLastEvent =
                Date.now()
        }

        // ====================================================
        // 💾 GUARDAR PARTICIPANTES
        // ====================================================

        chat.participants =
            current

    } catch (error) {

        console.error(
            '❌ Error en welcome.js:',
            error
        )
    }
}

// ============================================================
// 📋 AYUDA
// ============================================================

handler.help = [

    'welcome',
    'welc',
    'wl',

    'set1',
    'setwelcome',

    'set2',
    'setleave',

    'welcomefoto',
    'welcomegroup',

    'testwelcome',
    'testleave',

    'welcomestatus',

    'clearwel'

]

// ============================================================
// 🏷️ TAGS
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
    'wl',

    'set1',
    'setwelcome',

    'set2',
    'setleave',

    'welcomefoto',
    'welcomegroup',

    'testwelcome',
    'testleave',

    'welcomestatus',

    'clearwel'

]

// ============================================================
// 👥 GRUPO
// ============================================================

handler.group = true

// ============================================================
// 👮 ADMIN
// ============================================================

handler.admin = true

// ============================================================
// 📤 EXPORT
// ============================================================

export default handler
