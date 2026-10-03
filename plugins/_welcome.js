// ============================================================
// 📂 plugins/welcome.js
// 🎉 WELCOME / LEAVE — FELIXCAT BOT
// 🔘 TOGGLE SIN ON / OFF
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
// 🔧 ASEGURAR CONFIGURACIÓN DEL CHAT
// ============================================================

function ensureChat(chatId) {

    if (!global.db) {
        global.db = { data: { chats: {} } }
    }

    if (!global.db.data) {
        global.db.data = {}
    }

    if (!global.db.data.chats) {
        global.db.data.chats = {}
    }

    if (!global.db.data.chats[chatId]) {
        global.db.data.chats[chatId] = {}
    }

    const chat = global.db.data.chats[chatId]

    if (typeof chat.welcome !== 'boolean') {
        chat.welcome = false
    }

    if (!chat.welcomeMsg) {
        chat.welcomeMsg = DEFAULT_WELCOME
    }

    if (!chat.leaveMsg) {
        chat.leaveMsg = DEFAULT_LEAVE
    }

    if (!Array.isArray(chat.participants)) {
        chat.participants = []
    }

    if (typeof chat.welcomePhoto !== 'boolean') {
        chat.welcomePhoto = false
    }

    if (typeof chat.welcomeGroupPhoto !== 'boolean') {
        chat.welcomeGroupPhoto = false
    }

    if (typeof chat.welcomeMention !== 'boolean') {
        chat.welcomeMention = true
    }

    if (typeof chat.welcomeAntiSpam !== 'boolean') {
        chat.welcomeAntiSpam = true
    }

    if (!chat.welcomeLastEvent) {
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
// 🔢 NÚMERO
// ============================================================

function getNumber(jid) {

    if (!jid) {
        return ''
    }

    return String(jid)
        .split('@')[0]
        .split(':')[0]
}


// ============================================================
// 🏷️ MENCIÓN
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

        if (
            result.some(
                x =>
                    sameJid(
                        x,
                        normalized,
                        conn
                    )
            )
        ) {
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
// 👥 MIEMBROS
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
// 📸 FOTO USUARIO
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
// 🏠 FOTO GRUPO
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
// 🎉 MENSAJE DE BIENVENIDA
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

    const members =
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
                members,
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
│ 👥 Grupo: *${groupName}*
│ 👤 Integrantes: *${count}*
│
${body
    .split('\n')
    .map(line => `│ ${line}`)
    .join('\n')}
│
╰━━━━━━━━━━━━━━━━━━━━╯`

    return {
        message,
        mentions: list
    }
}


// ============================================================
// 👋 MENSAJE DE DESPEDIDA
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

    const members =
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
                members,
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
        mentions: list
    }
}


// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

let handler = async (
    m,
    {
        conn,
        text,
        command,
        isAdmin,
        isOwner
    }
) => {

    try {

        // ====================================================
        // 👥 SOLO GRUPOS
        // ====================================================

        if (!m.isGroup) {

            return m.reply(
                '❌ Este comando solamente funciona en grupos.'
            )
        }

        // ====================================================
        // 👮 ADMIN / OWNER
        // ====================================================

        if (!isAdmin && !isOwner) {

            return m.reply(
                '⚠️ Solo los administradores pueden configurar el sistema de bienvenida.'
            )
        }

        const chat =
            ensureChat(m.chat)

        const cmd =
            String(command || '')
                .toLowerCase()
                .trim()

        const args =
            String(text || '')
                .trim()


        // ====================================================
        // 🎉 WELCOME — TOGGLE
        // ====================================================

        if (
            [
                'welcome',
                'welc',
                'wl',
                'wlecom'
            ].includes(cmd)
        ) {

            chat.welcome =
                !chat.welcome

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
╰━━━━━━━━━━━━━━━━━━━━╯`
            )
        }


        // ====================================================
        // ✏️ SET1
        // ====================================================

        if (cmd === 'set1') {

            if (!args) {

                return m.reply(
`╭━━━〔 ✏️ SET1 〕━━━╮
│
│ Configura el mensaje de bienvenida.
│
│ Uso:
│ *.set1 <mensaje>*
│
│ Variables:
│
│ 👤 @user
│ 🏠 @group
│ 👥 @count
│ 🧑‍🤝‍🧑 @members
│ 🤖 @bot
│
│ Ejemplo:
│
│ *.set1 🎉 Bienvenido @user a @group*
│
╰━━━━━━━━━━━━━━━━━━━━╯`
                )
            }

            chat.welcomeMsg =
                args

            return m.reply(
`✅ *BIENVENIDA ACTUALIZADA*

📝 ${args}`
            )
        }


        // ====================================================
        // ✏️ SETWELCOME
        // ====================================================

        if (cmd === 'setwelcome') {

            if (!args) {
                return m.reply(
                    '❌ Escribe el nuevo mensaje de bienvenida.'
                )
            }

            chat.welcomeMsg =
                args

            return m.reply(
                '✅ Mensaje de bienvenida actualizado.'
            )
        }


        // ====================================================
        // ✏️ SET2
        // ====================================================

        if (cmd === 'set2') {

            if (!args) {

                return m.reply(
`╭━━━〔 ✏️ SET2 〕━━━╮
│
│ Configura el mensaje de despedida.
│
│ Uso:
│ *.set2 <mensaje>*
│
│ Variables:
│
│ 👤 @user
│ 🏠 @group
│ 👥 @count
│ 🧑‍🤝‍🧑 @members
│ 🤖 @bot
│
╰━━━━━━━━━━━━━━━━━━━━╯`
                )
            }

            chat.leaveMsg =
                args

            return m.reply(
`✅ *DESPEDIDA ACTUALIZADA*

📝 ${args}`
            )
        }


        // ====================================================
        // ✏️ SETLEAVE
        // ====================================================

        if (cmd === 'setleave') {

            if (!args) {

                return m.reply(
                    '❌ Escribe el nuevo mensaje de despedida.'
                )
            }

            chat.leaveMsg =
                args

            return m.reply(
                '✅ Mensaje de despedida actualizado.'
            )
        }


        // ====================================================
        // 🖼️ FOTO USUARIO
        // ====================================================

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

💡 Escribe *.welcomefoto* nuevamente para cambiarlo.`
            )
        }


        // ====================================================
        // 🏠 FOTO GRUPO
        // ====================================================

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

💡 Escribe *.welcomegroup* nuevamente para cambiarlo.`
            )
        }


        // ====================================================
        // 🧪 TEST WELCOME
        // ====================================================

        if (cmd === 'testwelcome') {

            const meta =
                await conn.groupMetadata(
                    m.chat
                )

            const members =
                meta.participants
                    ?.map(p => p.id)
                    .filter(Boolean) ||
                []

            const data =
                buildWelcomeMessage({
                    users: [
                        m.sender
                    ],
                    groupName:
                        meta.subject ||
                        'este grupo',
                    count:
                        members.length,
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
                        data.message,
                    mentions:
                        data.mentions
                },
                {
                    quoted: m
                }
            )
        }


        // ====================================================
        // 🧪 TEST LEAVE
        // ====================================================

        if (cmd === 'testleave') {

            const meta =
                await conn.groupMetadata(
                    m.chat
                )

            const members =
                meta.participants
                    ?.map(p => p.id)
                    .filter(Boolean) ||
                []

            const data =
                buildLeaveMessage({
                    users: [
                        m.sender
                    ],
                    groupName:
                        meta.subject ||
                        'este grupo',
                    count:
                        members.length,
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
                        data.message,
                    mentions:
                        data.mentions
                },
                {
                    quoted: m
                }
            )
        }


        // ====================================================
        // 📋 STATUS
        // ====================================================

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

🎉 *BIENVENIDA*

${chat.welcomeMsg}

━━━━━━━━━━━━━━━━━━━━

👋 *DESPEDIDA*

${chat.leaveMsg}`
            )
        }


        // ====================================================
        // 🧹 RESET
        // ====================================================

        if (cmd === 'clearwel') {

            chat.welcome = false

            chat.welcomeMsg =
                DEFAULT_WELCOME

            chat.leaveMsg =
                DEFAULT_LEAVE

            chat.welcomePhoto = false

            chat.welcomeGroupPhoto = false

            chat.welcomeMention = true

            chat.welcomeAntiSpam = true

            chat.participants = []

            chat.welcomeLastEvent = 0

            return m.reply(
`╭━━━〔 🧹 RESET WELCOME 〕━━━╮
│
│ 🔴 Sistema desactivado
│ 🔄 Mensajes restaurados
│ 🖼️ Fotos desactivadas
│ 👥 Participantes reiniciados
│ ⚙️ Configuración restaurada
│
╰━━━━━━━━━━━━━━━━━━━━╯`
            )
        }

    } catch (error) {

        console.error(
            '❌ ERROR welcome.js:',
            error
        )

        return m.reply(
            '❌ Ocurrió un error ejecutando el comando.'
        )
    }
}


// ============================================================
// 🔥 DETECTOR AUTOMÁTICO
// ============================================================

handler.before = async function (m) {

    if (!m.isGroup) {
        return
    }

    const conn = this

    try {

        const chat =
            ensureChat(m.chat)

        if (!chat.welcome) {
            return
        }

        const meta =
            await conn.groupMetadata(
                m.chat
            )

        const current =
            uniqueJids(
                meta.participants
                    ?.map(p => p.id)
                    .filter(Boolean) ||
                [],
                conn
            )

        // Primera sincronización
        if (
            !Array.isArray(chat.participants) ||
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

        const now =
            Date.now()

        const canSend =
            !chat.welcomeAntiSpam ||
            (
                now -
                Number(
                    chat.welcomeLastEvent || 0
                )
                > 3000
            )


        // ====================================================
        // 🎉 BIENVENIDA
        // ====================================================

        if (
            added.length &&
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

            let photo = null

            // Primero intenta foto del usuario
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

            // Si no hay, intenta foto del grupo
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
                            url: photo
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
            removed.length &&
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
            '❌ Error detector welcome:',
            error
        )
    }
}


// ============================================================
// 📋 COMANDOS
// ============================================================

handler.command = [
    'welcome',
    'welc',
    'wl',
    'wlecom',

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
// 📚 AYUDA
// ============================================================

handler.help = [
    'welcome',
    'welc',
    'wl',
    'wlecom',

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
// 🏷️ CATEGORÍAS
// ============================================================

handler.tags = [
    'fun',
    'grupo',
    'admin'
]


// ============================================================
// 👥 GRUPOS
// ============================================================

handler.group = true


// ============================================================
// 📤 EXPORT
// ============================================================

export default handler
