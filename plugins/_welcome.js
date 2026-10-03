// ============================================================
// 📂 plugins/welcome.js
// 🎉 WELCOME / LEAVE — WHATSAPP-BOT PRO ULTRA
// 🔘 ACTIVACIÓN POR TOGGLE — SIN ON / OFF
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
// 🔧 UTILIDADES
// ============================================================

function ensureChat(chatId) {

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

    if (typeof chat.welcomeMention !== 'boolean') {
        chat.welcomeMention = true
    }

    if (typeof chat.welcomeGroupPhoto !== 'boolean') {
        chat.welcomeGroupPhoto = false
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
// 🔢 OBTENER NÚMERO
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
// 🏷️ MENCION
// ============================================================

function mention(jid) {
    return `@${getNumber(jid)}`
}

// ============================================================
// 🧹 ELIMINAR DUPLICADOS
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
        bot = 'WhatsApp-Bot'
    } = {}
) {

    let result =
        String(text || '')

    result = result.replace(
        /@user/gi,
        user
    )

    result = result.replace(
        /@group/gi,
        group
    )

    result = result.replace(
        /@count/gi,
        String(count)
    )

    result = result.replace(
        /@members/gi,
        members
    )

    result = result.replace(
        /@bot/gi,
        bot
    )

    return result
}

// ============================================================
// 👥 LISTA DE MIEMBROS
// ============================================================

function buildMembers(users, conn) {

    return uniqueJids(
        users,
        conn
    )
        .map(
            jid =>
                mention(jid)
        )
        .join('\n')
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
// 🖼️ FOTO GRUPO
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
// 🤖 NOMBRE BOT
// ============================================================

function getBotName() {

    return (
        global.botname ||
        global.botName ||
        'WhatsApp-Bot'
    )
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

    const isMultiple =
        list.length > 1

    const userText =
        isMultiple
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
        isMultiple
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

    const isMultiple =
        list.length > 1

    const userText =
        isMultiple
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
        isMultiple
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
        isAdmin
    }
) => {

    if (!m.isGroup) {

        return conn.sendMessage(
            m.chat,
            {
                text:
                    '❌ Este sistema solamente funciona en grupos.'
            },
            {
                quoted: m
            }
        )
    }

    if (!isAdmin) {

        return conn.sendMessage(
            m.chat,
            {
                text:
                    '⚠️ Solo los administradores pueden configurar el sistema.'
            },
            {
                quoted: m
            }
        )
    }

    const chat =
        ensureChat(m.chat)

    const cmd =
        String(command || '')
            .toLowerCase()

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

        return m.reply(
`╭━━━〔 🎉 WELCOME 〕━━━╮

${
    chat.welcome
        ? '🟢 *SISTEMA ACTIVADO*'
        : '🔴 *SISTEMA DESACTIVADO*'
}

🎉 Bienvenidas:
${
    chat.welcome
        ? 'ACTIVADAS'
        : 'DESACTIVADAS'
}

👋 Despedidas:
${
    chat.welcome
        ? 'ACTIVADAS'
        : 'DESACTIVADAS'
}

━━━━━━━━━━━━━━━━━━━━

💡 Usa nuevamente:
*.${cmd}*

para cambiar el estado.

╰━━━━━━━━━━━━━━━━━━━━╯`
        )
    }

    // ========================================================
    // ✏️ SET1 — BIENVENIDA
    // ========================================================

    if (cmd === 'set1') {

        if (!args) {

            return m.reply(
`✏️ *CONFIGURAR BIENVENIDA*

Usa:

*.set1 <mensaje>*

Variables:

👤 @user
🏠 @group
👥 @count
🧑‍🤝‍🧑 @members
🤖 @bot

Ejemplo:

*.set1 🎉 Bienvenido @user a @group! Somos @count integrantes.`
            )
        }

        chat.welcomeMsg =
            args

        return m.reply(
`✅ *BIENVENIDA ACTUALIZADA*

📝 ${args}`
        )
    }

    // ========================================================
    // ✏️ SETWELCOME
    // ========================================================

    if (cmd === 'setwelcome') {

        if (!args) {

            return m.reply(
                '❌ Debes escribir el nuevo mensaje.'
            )
        }

        chat.welcomeMsg =
            args

        return m.reply(
            '✅ Mensaje de bienvenida actualizado.'
        )
    }

    // ========================================================
    // ✏️ SET2 — DESPEDIDA
    // ========================================================

    if (cmd === 'set2') {

        if (!args) {

            return m.reply(
`✏️ *CONFIGURAR DESPEDIDA*

Usa:

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
`✅ *DESPEDIDA ACTUALIZADA*

📝 ${args}`
        )
    }

    // ========================================================
    // ✏️ SETLEAVE
    // ========================================================

    if (cmd === 'setleave') {

        if (!args) {

            return m.reply(
                '❌ Debes escribir el nuevo mensaje.'
            )
        }

        chat.leaveMsg =
            args

        return m.reply(
            '✅ Mensaje de despedida actualizado.'
        )
    }

    // ========================================================
    // 🖼️ FOTO USUARIO — TOGGLE
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

💡 Usa *.welcomefoto* nuevamente para cambiarlo.`
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

💡 Usa *.welcomegroup* nuevamente para cambiarlo.`
        )
    }

    // ========================================================
    // 🧪 TEST WELCOME
    // ========================================================

    if (cmd === 'testwelcome') {

        const meta =
            await conn.groupMetadata(
                m.chat
            )

        const groupName =
            meta.subject ||
            'este grupo'

        const members =
            meta.participants
                ?.map(p => p.id)
                .filter(Boolean) ||
            []

        const data =
            buildWelcomeMessage({
                users: [m.sender],
                groupName,
                count: members.length,
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

    // ========================================================
    // 🧪 TEST LEAVE
    // ========================================================

    if (cmd === 'testleave') {

        const meta =
            await conn.groupMetadata(
                m.chat
            )

        const groupName =
            meta.subject ||
            'este grupo'

        const members =
            meta.participants
                ?.map(p => p.id)
                .filter(Boolean) ||
            []

        const data =
            buildLeaveMessage({
                users: [m.sender],
                groupName,
                count: members.length,
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

    // ========================================================
    // 📋 ESTADO
    // ========================================================

    if (cmd === 'welcomestatus') {

        return m.reply(
`╭━━━〔 ⚙️ WELCOME STATUS 〕━━━╮

🎉 Sistema:
${
    chat.welcome
        ? '🟢 ACTIVADO'
        : '🔴 DESACTIVADO'
}

🖼️ Foto usuario:
${
    chat.welcomePhoto
        ? '🟢 ACTIVADA'
        : '🔴 DESACTIVADA'
}

🏠 Foto grupo:
${
    chat.welcomeGroupPhoto
        ? '🟢 ACTIVADA'
        : '🔴 DESACTIVADA'
}

📢 Menciones:
${
    chat.welcomeMention
        ? '🟢 ACTIVADAS'
        : '🔴 DESACTIVADAS'
}

🛡️ Anti-duplicados:
${
    chat.welcomeAntiSpam
        ? '🟢 ACTIVADO'
        : '🔴 DESACTIVADO'
}

━━━━━━━━━━━━━━━━━━━━

🎉 Bienvenida:

${chat.welcomeMsg}

━━━━━━━━━━━━━━━━━━━━

👋 Despedida:

${chat.leaveMsg}

╰━━━━━━━━━━━━━━━━━━━━╯`
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

        chat.participants =
            []

        chat.welcomeLastEvent =
            0

        return m.reply(
`🧹 *WELCOME REINICIADO*

🔴 Sistema desactivado.
🔄 Mensajes restaurados.
🖼️ Fotos desactivadas.
👥 Lista de participantes reiniciada.
⚙️ Configuración restaurada.`
        )
    }
}

// ============================================================
// 🔥 DETECTOR DE ENTRADAS / SALIDAS
// ============================================================

handler.before =
async function (m) {

    if (!m.isGroup) {
        return
    }

    const conn =
        this

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
                    ?.map(
                        p =>
                            p.id
                    )
                    .filter(Boolean) ||
                    [],
                conn
            )

        if (
            !Array.isArray(
                chat.participants
            ) ||
            !chat.participants.length
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
                    chat.welcomeLastEvent ||
                    0
                )
                > 3000
            )

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

            const photoUser =
                added.length === 1 &&
                chat.welcomePhoto
                    ? await getUserPhoto(
                        conn,
                        added[0]
                    )
                    : null

            const groupPhoto =
                chat.welcomeGroupPhoto
                    ? await getGroupPhoto(
                        conn,
                        m.chat
                    )
                    : null

            if (photoUser) {

                await conn.sendMessage(
                    m.chat,
                    {
                        image: {
                            url:
                                photoUser
                        },
                        caption:
                            data.message,
                        mentions:
                            data.mentions
                    }
                )

            } else if (groupPhoto) {

                await conn.sendMessage(
                    m.chat,
                    {
                        image: {
                            url:
                                groupPhoto
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
// 📋 COMANDOS
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

handler.tags = [
    'grupo',
    'admin'
]

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

handler.group = true
handler.admin = true

export default handler
