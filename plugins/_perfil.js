// ============================================================
// 📂 plugins/perfil.js
// 👤 PERFIL COMPLETO — WHATSAPP-BOT
// 🧬 Compatible con hermanos.js — hasta 3 hermanos
// ❤️ Pareja + hermanos + insignias + bio + género + cumpleaños
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// 📁 ARCHIVOS
// ============================================================

const DATABASE_DIR = './database'

const PERFIL_FILE = path.join(DATABASE_DIR, 'perfiles.json')
const PAREJAS_FILE = path.join(DATABASE_DIR, 'parejas.json')
const HERMANOS_FILE = path.join(DATABASE_DIR, 'hermanos.json')

if (!fs.existsSync(DATABASE_DIR)) {
    fs.mkdirSync(DATABASE_DIR, { recursive: true })
}

if (!fs.existsSync(PERFIL_FILE)) {
    fs.writeFileSync(PERFIL_FILE, JSON.stringify({}, null, 2))
}

if (!fs.existsSync(PAREJAS_FILE)) {
    fs.writeFileSync(PAREJAS_FILE, JSON.stringify({}, null, 2))
}

if (!fs.existsSync(HERMANOS_FILE)) {
    fs.writeFileSync(HERMANOS_FILE, JSON.stringify({}, null, 2))
}

// ============================================================
// 💾 JSON
// ============================================================

function loadJSON(file) {
    try {
        const data = fs.readFileSync(file, 'utf8')
        return JSON.parse(data || '{}')
    } catch {
        return {}
    }
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(
            file,
            JSON.stringify(data, null, 2)
        )
    } catch (e) {
        console.error(`❌ Error guardando ${file}:`, e)
    }
}

// ============================================================
// 🔧 NORMALIZAR JID
// ============================================================

function normalizeJid(jid, conn) {
    if (!jid) return null

    try {
        if (conn?.decodeJid) {
            jid = conn.decodeJid(jid)
        }
    } catch {}

    jid = String(jid).trim()

    if (!jid) return null

    if (jid.endsWith('@c.us')) {
        return jid.replace('@c.us', '@s.whatsapp.net')
    }

    if (jid.includes('@')) {
        return jid
    }

    const number = jid.replace(/[^0-9]/g, '')

    if (!number) return null

    return `${number}@s.whatsapp.net`
}

// ============================================================
// 🔍 COMPARAR USUARIOS
// ============================================================

function sameUser(a, b, conn) {
    a = normalizeJid(a, conn)
    b = normalizeJid(b, conn)

    if (!a || !b) return false

    if (a === b) return true

    const clean = jid =>
        String(jid)
            .split(':')[0]
            .split('@')[0]
            .replace(/[^0-9]/g, '')

    const A = clean(a)
    const B = clean(b)

    return Boolean(A && B && A === B)
}

// ============================================================
// 🔎 BUSCAR JID DENTRO DEL JSON
// ============================================================

function findJid(data, jid, conn) {
    if (!jid) return null

    jid = normalizeJid(jid, conn)

    if (!jid) return null

    if (data[jid]) {
        return jid
    }

    for (const id of Object.keys(data)) {
        if (sameUser(id, jid, conn)) {
            return id
        }
    }

    return jid
}

// ============================================================
// 🏷️ MENCION
// ============================================================

function tag(jid) {
    if (!jid) return '@usuario'

    return '@' +
        String(jid)
            .split('@')[0]
            .split(':')[0]
}

// ============================================================
// 🎯 OBTENER OBJETIVO
// ============================================================

function getTarget(m, conn) {
    if (m.mentionedJid?.length) {
        return normalizeJid(
            m.mentionedJid[0],
            conn
        )
    }

    if (m.quoted?.sender) {
        return normalizeJid(
            m.quoted.sender,
            conn
        )
    }

    return null
}

// ============================================================
// 📅 FORMATEAR FECHA
// ============================================================

function formatDate(value) {
    if (!value) {
        return 'No registrada'
    }

    const date = new Date(value)

    if (isNaN(date.getTime())) {
        return 'No registrada'
    }

    return date.toLocaleDateString(
        'es-UY',
        {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }
    )
}

// ============================================================
// ⏳ DÍAS ENTRE FECHAS
// ============================================================

function daysBetween(value) {
    if (!value) return 0

    const date = new Date(value)

    if (isNaN(date.getTime())) {
        return 0
    }

    return Math.max(
        0,
        Math.floor(
            (
                Date.now() -
                date.getTime()
            ) / 86400000
        )
    )
}

// ============================================================
// 🎂 EDAD
// ============================================================

function calculateAge(birth) {
    if (!birth) return null

    const date = new Date(birth)

    if (isNaN(date.getTime())) {
        return null
    }

    const now = new Date()

    let age =
        now.getFullYear() -
        date.getFullYear()

    const month =
        now.getMonth() -
        date.getMonth()

    if (
        month < 0 ||
        (
            month === 0 &&
            now.getDate() < date.getDate()
        )
    ) {
        age--
    }

    return age
}

// ============================================================
// ♑ SIGNO
// ============================================================

function zodiac(day, month) {
    if (!day || !month) {
        return '❔ Desconocido'
    }

    const signs = [
        ['♑ Capricornio', 20],
        ['♒ Acuario', 19],
        ['♓ Piscis', 20],
        ['♈ Aries', 20],
        ['♉ Tauro', 21],
        ['♊ Géminis', 21],
        ['♋ Cáncer', 22],
        ['♌ Leo', 23],
        ['♍ Virgo', 23],
        ['♎ Libra', 23],
        ['♏ Escorpio', 22],
        ['♐ Sagitario', 21]
    ]

    const index = month - 1

    if (
        day <=
        signs[index][1]
    ) {
        return signs[index][0]
    }

    return signs[
        (index + 1) % 12
    ][0]
}

// ============================================================
// 🎂 DÍAS PARA CUMPLEAÑOS
// ============================================================

function daysToBirthday(birth) {
    if (!birth) return null

    const date = new Date(birth)

    if (isNaN(date.getTime())) {
        return null
    }

    const now = new Date()

    const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    )

    let next = new Date(
        now.getFullYear(),
        date.getMonth(),
        date.getDate()
    )

    if (next < today) {
        next = new Date(
            now.getFullYear() + 1,
            date.getMonth(),
            date.getDate()
        )
    }

    return Math.ceil(
        (
            next.getTime() -
            today.getTime()
        ) / 86400000
    )
}

// ============================================================
// 👑 OWNERS
// ============================================================

function getOwners(conn) {
    return (global.owner || [])
        .map(v => {
            if (Array.isArray(v)) {
                v = v[0]
            }

            return normalizeJid(
                v,
                conn
            )
        })
        .filter(Boolean)
}

// ============================================================
// 🛡️ ES OWNER
// ============================================================

function isOwner(m, conn) {
    const owners = getOwners(conn)

    return owners.some(
        owner =>
            sameUser(
                owner,
                m.sender,
                conn
            )
    )
}

// ============================================================
// 👮 ROL
// ============================================================

async function getRole(m, conn, target) {
    try {
        const owners = getOwners(conn)

        if (
            owners.some(
                owner =>
                    sameUser(
                        owner,
                        target,
                        conn
                    )
            )
        ) {
            return '👑 Dueño'
        }

        if (!m.isGroup) {
            return '👤 Usuario'
        }

        const metadata =
            await conn.groupMetadata(
                m.chat
            )

        const participant =
            metadata.participants.find(
                p =>
                    sameUser(
                        p.id,
                        target,
                        conn
                    )
            )

        if (
            participant?.admin ===
            'superadmin'
        ) {
            return '👑 Creador'
        }

        if (participant?.admin) {
            return '🛡️ Administrador'
        }

    } catch {}

    return '👤 Usuario'
}

// ============================================================
// 🧬 OBTENER TODOS LOS HERMANOS
//
// Compatible con:
//
// 1. hermano: "jid"
//
// 2. hermanos: []
//
// 3. Busca relaciones inversas
//
// Máximo 3
// ============================================================

function getAllBrothers(
    hermanosDB,
    target,
    conn
) {
    const result = []

    const addBrother = (
        jid,
        data = {}
    ) => {
        if (!jid) return

        const normalized =
            normalizeJid(
                jid,
                conn
            )

        if (!normalized) return

        if (
            sameUser(
                normalized,
                target,
                conn
            )
        ) {
            return
        }

        if (
            result.some(
                x =>
                    sameUser(
                        x.jid,
                        normalized,
                        conn
                    )
            )
        ) {
            return
        }

        if (result.length >= 3) {
            return
        }

        result.push({
            jid: normalized,
            data
        })
    }

    const id =
        findJid(
            hermanosDB,
            target,
            conn
        )

    const data =
        hermanosDB[id]

    // ========================================================
    // 🆕 FORMATO NUEVO
    // ========================================================

    if (data) {

        if (
            Array.isArray(
                data.hermanos
            )
        ) {
            for (
                const brother
                of data.hermanos
            ) {
                const jid =
                    typeof brother === 'string'
                        ? brother
                        : brother?.jid ||
                          brother?.id

                addBrother(
                    jid,
                    typeof brother === 'object'
                        ? brother
                        : data
                )
            }
        }

        // ====================================================
        // 🔄 FORMATO ANTIGUO
        // ====================================================

        if (
            data.hermano
        ) {
            addBrother(
                data.hermano,
                data
            )
        }
    }

    // ========================================================
    // 🔍 RELACIONES INVERSAS
    // ========================================================

    for (
        const [
            userId,
            userData
        ] of Object.entries(
            hermanosDB
        )
    ) {
        if (result.length >= 3) {
            break
        }

        if (!userData) {
            continue
        }

        const lista = []

        if (
            Array.isArray(
                userData.hermanos
            )
        ) {
            for (
                const brother
                of userData.hermanos
            ) {
                const jid =
                    typeof brother === 'string'
                        ? brother
                        : brother?.jid ||
                          brother?.id

                if (jid) {
                    lista.push(jid)
                }
            }
        }

        if (
            userData.hermano
        ) {
            lista.push(
                userData.hermano
            )
        }

        const pertenece =
            lista.some(
                brother =>
                    sameUser(
                        brother,
                        target,
                        conn
                    )
            )

        if (!pertenece) {
            continue
        }

        addBrother(
            userId,
            userData
        )
    }

    return result.slice(0, 3)
}

// ============================================================
// 🧬 INFORMACIÓN DE HERMANO
// ============================================================

function brotherInfo(
    brother,
    hermanosDB,
    conn
) {
    const jid = brother.jid

    const realId =
        findJid(
            hermanosDB,
            jid,
            conn
        )

    const ownData =
        hermanosDB[realId] || {}

    const data =
        brother.data || {}

    const nivel =
        Number(
            data.nivel ??
            ownData.nivel ??
            0
        )

    const interacciones =
        Number(
            data.interacciones ??
            ownData.interacciones ??
            0
        )

    const fecha =
        data.hermandadFecha ||
        data.fecha ||
        data.relacionFecha ||
        ownData.hermandadFecha ||
        ownData.fecha ||
        ownData.relacionFecha ||
        null

    return {
        jid,
        nivel,
        interacciones,
        fecha
    }
}

// ============================================================
// 🏅 RANGO HERMANO
// ============================================================

function rangoHermano(nivel) {
    nivel = Number(nivel || 0)

    if (nivel >= 300) {
        return '👑 Hermanos Supremos'
    }

    if (nivel >= 200) {
        return '🔥 Hermanos Legendarios'
    }

    if (nivel >= 120) {
        return '💪 Hermanos Fuertes'
    }

    if (nivel >= 60) {
        return '🤝 Hermanos Reales'
    }

    if (nivel >= 30) {
        return '🙂 Hermanos Cercanos'
    }

    return '👶 Hermanos Nuevos'
}

// ============================================================
// 🏆 INSIGNIAS
// ============================================================

const insigniasDisponibles = {

    fundador:
        '👑 Fundador',

    vip:
        '💎 VIP',

    legendario:
        '🔥 Legendario',

    activo:
        '⚡ Activo',

    veterano:
        '🎖️ Veterano',

    creador:
        '🛠️ Creador',

    gamer:
        '🎮 Gamer',

    especial:
        '🌟 Especial'
}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

let handler = async (
    m,
    {
        conn,
        command,
        text
    }
) => {

    try {

        const perfiles =
            loadJSON(
                PERFIL_FILE
            )

        const parejas =
            loadJSON(
                PAREJAS_FILE
            )

        const hermanosDB =
            loadJSON(
                HERMANOS_FILE
            )

        const sender =
            normalizeJid(
                m.sender,
                conn
            )

        // ====================================================
        // 🎯 TARGET
        // ====================================================

        const target =
            getTarget(
                m,
                conn
            ) ||
            sender

        const targetId =
            findJid(
                perfiles,
                target,
                conn
            )

        // ====================================================
        // 👤 CREAR PERFIL
        // ====================================================

        if (!perfiles[targetId]) {

            perfiles[targetId] = {
                bio: '',
                genero: '',
                birth: null,
                registered: Date.now(),
                insignias: []
            }

            saveJSON(
                PERFIL_FILE,
                perfiles
            )
        }

        const perfil =
            perfiles[targetId]

        if (
            !Array.isArray(
                perfil.insignias
            )
        ) {
            perfil.insignias = []
        }

        // ====================================================
        // 🎂 SETBR
        // ====================================================

        if (
            command === 'setbr'
        ) {

            const nuevo =
                text?.trim()

            if (!nuevo) {
                return m.reply(
                    '✏️ Usa:\n\n' +
                    '*.setbr <fecha de nacimiento>*\n\n' +
                    'Ejemplo:\n' +
                    '*.setbr 31/12/1998*'
                )
            }

            let fecha = null

            // DD/MM/YYYY
            const match =
                nuevo.match(
                    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
                )

            if (match) {

                const dia =
                    Number(match[1])

                const mes =
                    Number(match[2]) - 1

                const año =
                    Number(match[3])

                fecha =
                    new Date(
                        año,
                        mes,
                        dia
                    )

            } else {

                fecha =
                    new Date(nuevo)
            }

            if (
                !fecha ||
                isNaN(
                    fecha.getTime()
                )
            ) {

                return m.reply(
                    '❌ Fecha no válida.\n\n' +
                    'Ejemplo:\n' +
                    '*.setbr 31/12/1998*'
                )
            }

            perfil.birth =
                fecha.toISOString()

            saveJSON(
                PERFIL_FILE,
                perfiles
            )

            return m.reply(
                `🎂 *FECHA DE NACIMIENTO ACTUALIZADA*\n\n` +
                `📅 ${formatDate(perfil.birth)}`
            )
        }

        // ====================================================
        // 📝 BIO
        // ====================================================

        if (
            command === 'bio'
        ) {

            const nuevaBio =
                text?.trim()

            if (!nuevaBio) {

                if (perfil.bio) {
                    return m.reply(
                        `📝 *TU BIOGRAFÍA*\n\n${perfil.bio}`
                    )
                }

                return m.reply(
                    '📝 No tienes una biografía.\n\n' +
                    'Usa *.bio <texto>*'
                )
            }

            perfil.bio =
                nuevaBio

            saveJSON(
                PERFIL_FILE,
                perfiles
            )

            return m.reply(
                '✅ *Biografía actualizada correctamente.*'
            )
        }

        // ====================================================
        // ⚧️ GÉNERO
        // ====================================================

        if (
            command === 'genero'
        ) {

            const genero =
                text?.trim()

            if (!genero) {

                return m.reply(
                    `⚧️ Tu género actual: ${
                        perfil.genero ||
                        'No especificado'
                    }\n\n` +
                    `Usa *.genero <género>*`
                )
            }

            perfil.genero =
                genero

            saveJSON(
                PERFIL_FILE,
                perfiles
            )

            return m.reply(
                `✅ Género actualizado: *${genero}*`
            )
        }

        // ====================================================
        // 🏅 OTORGAR INSIGNIA
        // ====================================================

        if (
            command === 'otorgar'
        ) {

            if (
                !isOwner(
                    m,
                    conn
                )
            ) {
                return m.reply(
                    '🚫 Solo el dueño puede otorgar insignias.'
                )
            }

            const objetivo =
                getTarget(
                    m,
                    conn
                )

            if (!objetivo) {
                return m.reply(
                    '❌ Menciona o responde al usuario.'
                )
            }

            const partes =
                String(text || '')
                    .trim()
                    .split(/\s+/)

            const insignia =
                partes
                    .map(
                        x =>
                            x.toLowerCase()
                    )
                    .find(
                        x =>
                            insigniasDisponibles[x]
                    )

            if (!insignia) {

                return m.reply(
                    `🏅 *INSIGNIAS DISPONIBLES*\n\n` +
                    Object.entries(
                        insigniasDisponibles
                    )
                        .map(
                            ([id, nombre]) =>
                                `• ${id} — ${nombre}`
                        )
                        .join('\n')
                )
            }

            const jid =
                findJid(
                    perfiles,
                    objetivo,
                    conn
                )

            if (
                !Array.isArray(
                    perfiles[jid].insignias
                )
            ) {
                perfiles[jid].insignias = []
            }

            if (
                perfiles[jid]
                    .insignias
                    .includes(insignia)
            ) {
                return m.reply(
                    '⚠️ Ese usuario ya tiene esa insignia.'
                )
            }

            perfiles[jid]
                .insignias
                .push(
                    insignia
                )

            saveJSON(
                PERFIL_FILE,
                perfiles
            )

            return conn.sendMessage(
                m.chat,
                {
                    text:
`🏅 *INSIGNIA OTORGADA*

👤 ${tag(jid)}
🎖️ ${insigniasDisponibles[insignia]}`,
                    mentions: [jid]
                },
                {
                    quoted: m
                }
            )
        }

        // ====================================================
        // ❌ QUITAR INSIGNIA
        // ====================================================

        if (
            command === 'quitar'
        ) {

            if (
                !isOwner(
                    m,
                    conn
                )
            ) {
                return m.reply(
                    '🚫 Solo el dueño puede quitar insignias.'
                )
            }

            const objetivo =
                getTarget(
                    m,
                    conn
                )

            if (!objetivo) {
                return m.reply(
                    '❌ Menciona o responde al usuario.'
                )
            }

            const partes =
                String(text || '')
                    .trim()
                    .split(/\s+/)

            const insignia =
                partes
                    .map(
                        x =>
                            x.toLowerCase()
                    )
                    .find(
                        x =>
                            insigniasDisponibles[x]
                    )

            if (!insignia) {

                return m.reply(
                    `❌ Debes indicar una insignia.\n\n` +
                    Object.entries(
                        insigniasDisponibles
                    )
                        .map(
                            ([id, nombre]) =>
                                `• ${id} — ${nombre}`
                        )
                        .join('\n')
                )
            }

            const jid =
                findJid(
                    perfiles,
                    objetivo,
                    conn
                )

            if (
                !Array.isArray(
                    perfiles[jid].insignias
                )
            ) {
                return m.reply(
                    '❌ Ese usuario no tiene insignias.'
                )
            }

            const index =
                perfiles[jid]
                    .insignias
                    .indexOf(
                        insignia
                    )

            if (
                index === -1
            ) {
                return m.reply(
                    '❌ Ese usuario no tiene esa insignia.'
                )
            }

            perfiles[jid]
                .insignias
                .splice(
                    index,
                    1
                )

            saveJSON(
                PERFIL_FILE,
                perfiles
            )

            return conn.sendMessage(
                m.chat,
                {
                    text:
`🗑️ *INSIGNIA ELIMINADA*

👤 ${tag(jid)}
🎖️ ${insigniasDisponibles[insignia]}`,
                    mentions: [jid]
                },
                {
                    quoted: m
                }
            )
        }

        // ====================================================
        // 🏅 VER INSIGNIAS
        // ====================================================

        if (
            command === 'insignias' ||
            command === 'verinsignias'
        ) {

            const lista =
                Array.isArray(
                    perfil.insignias
                )
                    ? perfil.insignias
                    : []

            if (!lista.length) {

                return conn.sendMessage(
                    m.chat,
                    {
                        text:
`🏅 *INSIGNIAS DE ${tag(targetId)}*

No tiene insignias actualmente.`,
                        mentions: [
                            targetId
                        ]
                    },
                    {
                        quoted: m
                    }
                )
            }

            const texto =
                lista
                    .map(
                        x =>
                            `• ${
                                insigniasDisponibles[x] ||
                                x
                            }`
                    )
                    .join('\n')

            return conn.sendMessage(
                m.chat,
                {
                    text:
`🏅 *INSIGNIAS DE ${tag(targetId)}*

${texto}`,
                    mentions: [
                        targetId
                    ]
                },
                {
                    quoted: m
                }
            )
        }

        // ====================================================
        // 👤 PERFIL
        // ====================================================

        if (
            command === 'perfil'
        ) {

            // ==================================================
            // ❤️ PAREJA
            // ==================================================

            let parejaJid = null

            const parejaData =
                parejas[targetId]

            if (
                parejaData?.jid
            ) {

                parejaJid =
                    normalizeJid(
                        parejaData.jid,
                        conn
                    )

            } else {

                // =================================================
                // 🔄 BUSCAR RELACIÓN INVERSA
                // =================================================

                for (
                    const [
                        id,
                        data
                    ] of Object.entries(
                        parejas
                    )
                ) {

                    if (
                        data?.jid &&
                        sameUser(
                            data.jid,
                            targetId,
                            conn
                        )
                    ) {

                        parejaJid =
                            normalizeJid(
                                id,
                                conn
                            )

                        break
                    }
                }
            }

            // ==================================================
            // 🧬 TODOS LOS HERMANOS
            // ==================================================

            const hermanos =
                getAllBrothers(
                    hermanosDB,
                    targetId,
                    conn
                )

            const brotherData =
                hermanos.map(
                    brother =>
                        brotherInfo(
                            brother,
                            hermanosDB,
                            conn
                        )
                )

            // ==================================================
            // 🎂 DATOS PERSONALES
            // ==================================================

            const edad =
                calculateAge(
                    perfil.birth
                )

            let signo =
                '❔ Desconocido'

            if (
                perfil.birth
            ) {

                const birth =
                    new Date(
                        perfil.birth
                    )

                signo =
                    zodiac(
                        birth.getDate(),
                        birth.getMonth() + 1
                    )
            }

            const cumple =
                daysToBirthday(
                    perfil.birth
                )

            // ==================================================
            // 👮 ROL
            // ==================================================

            const role =
                await getRole(
                    m,
                    conn,
                    targetId
                )

            // ==================================================
            // 🏅 INSIGNIAS
            // ==================================================

            const insignias =
                Array.isArray(
                    perfil.insignias
                )
                    ? perfil.insignias
                    : []

            // ==================================================
            // 📸 FOTO DE PERFIL
            // ==================================================

            let ppUrl = null

            try {

                ppUrl =
                    await conn.profilePictureUrl(
                        targetId,
                        'image'
                    )

            } catch {}

            // ==================================================
            // 📅 REGISTRO
            // ==================================================

            const registered =
                perfil.registered ||
                perfil.joinGroup ||
                null

            // ==================================================
            // 📝 PERFIL BASE
            // ==================================================

            let texto =
`╭━━━〔 👤 *PERFIL* 〕━━━╮

👤 *Usuario:* ${tag(targetId)}
${role}

📝 *Bio:*
${perfil.bio || 'Sin biografía'}

⚧️ *Género:* ${
    perfil.genero ||
    'No especificado'
}

🎂 *Edad:* ${
    edad !== null
        ? `${edad} años`
        : 'No registrada'
}

♈ *Signo:* ${signo}

🎂 *Cumpleaños:* ${
    cumple !== null
        ? `faltan ${cumple} días`
        : 'No registrado'
}

📅 *Registrado:* ${
    formatDate(
        registered
    )
}`

            // ==================================================
            // ❤️ PAREJA
            // ==================================================

            texto +=
`\n\n❤️ *RELACIÓN*\n`

            if (
                parejaJid
            ) {

                texto +=
`💞 Pareja: ${tag(parejaJid)}\n`

            } else {

                texto +=
`💔 Soltero/a\n`
            }

            // ==================================================
            // 🧬 HERMANOS
            // ==================================================

            texto +=
`\n🧬 *HERMANOS*`

            const mentions = [
                targetId
            ]

            if (
                parejaJid
            ) {
                mentions.push(
                    parejaJid
                )
            }

            if (
                !brotherData.length
            ) {

                texto +=
`\n😹 No tiene hermanos registrados.`

            } else {

                texto +=
`\n`

                brotherData.forEach(
                    (
                        brother,
                        index
                    ) => {

                        const numero =
                            index + 1

                        const dias =
                            daysBetween(
                                brother.fecha
                            )

                        texto +=
`
${numero}. 🤝 ${tag(brother.jid)}
   💪 Nivel: ${brother.nivel}
   🏅 ${rangoHermano(brother.nivel)}
   🎮 Interacciones: ${brother.interacciones}
   📅 Desde: ${formatDate(brother.fecha)}
   🕒 ${dias} días`

                        mentions.push(
                            brother.jid
                        )
                    }
                )
            }

            // ==================================================
            // 🏅 INSIGNIAS
            // ==================================================

            texto +=
`\n\n🏅 *INSIGNIAS*\n`

            if (
                insignias.length
            ) {

                texto +=
                    insignias
                        .map(
                            x =>
                                `• ${
                                    insigniasDisponibles[x] ||
                                    x
                                }`
                        )
                        .join('\n')

            } else {

                texto +=
                    'Sin insignias'
            }

            // ==================================================
            // 📊 RESUMEN
            // ==================================================

            texto +=
`

━━━━━━━━━━━━━━━━━━━━
🧬 *Resumen familiar*

❤️ Pareja: ${
    parejaJid
        ? 'Sí'
        : 'No'
}

🤝 Hermanos: ${
    brotherData.length
}/3

🏅 Insignias: ${
    insignias.length
}
━━━━━━━━━━━━━━━━━━━━`

            // ==================================================
            // 📤 ENVIAR CON FOTO
            // ==================================================

            if (
                ppUrl
            ) {

                return conn.sendMessage(
                    m.chat,
                    {
                        image: {
                            url: ppUrl
                        },
                        caption:
                            texto.trim(),
                        mentions
                    },
                    {
                        quoted: m
                    }
                )
            }

            // ==================================================
            // 📤 ENVIAR SIN FOTO
            // ==================================================

            return conn.sendMessage(
                m.chat,
                {
                    text:
                        texto.trim(),
                    mentions
                },
                {
                    quoted: m
                }
            )
        }

    } catch (e) {

        console.error(
            '❌ Error en perfil.js:',
            e
        )

        return m.reply(
            '❌ Ocurrió un error al cargar el perfil.'
        )
    }
}

// ============================================================
// 📋 TODOS LOS COMANDOS DEL PERFIL
// ============================================================

handler.help = [

    'perfil',
    'setbr',
    'bio',
    'genero',

    'otorgar',
    'quitar',

    'insignias',
    'verinsignias',

    'clearinsignias',
    'clearins'

]

handler.tags = [
    'perfil',
    'owner'
]

handler.command = [

    'perfil',
    'setbr',
    'bio',
    'genero',

    'otorgar',
    'quitar',

    'insignias',
    'verinsignias',

    'clearinsignias',
    'clearins'

]

// ============================================================
// 🧹 LIMPIAR INSIGNIAS
// ============================================================

handler.before = async function (m) {

    try {

        const command =
            String(
                m.text || ''
            )
                .trim()
                .split(/\s+/)[0]
                .replace(
                    /^[.!#/]/,
                    ''
                )
                .toLowerCase()

        if (
            ![
                'clearinsignias',
                'clearins'
            ].includes(
                command
            )
        ) {
            return
        }

        const conn = this

        if (
            !isOwner(
                m,
                conn
            )
        ) {

            return m.reply(
                '🚫 Solo el dueño puede limpiar insignias.'
            )
        }

        const perfiles =
            loadJSON(
                PERFIL_FILE
            )

        for (
            const jid
            of Object.keys(
                perfiles
            )
        ) {

            if (
                !Array.isArray(
                    perfiles[jid].insignias
                )
            ) {
                perfiles[jid].insignias = []
            } else {
                perfiles[jid].insignias = []
            }
        }

        saveJSON(
            PERFIL_FILE,
            perfiles
        )

        return m.reply(
            '🧹 *INSIGNIAS LIMPIADAS*\n\n' +
            '✅ Todas las insignias fueron eliminadas.'
        )

    } catch (e) {

        console.error(
            '❌ Error limpiando insignias:',
            e
        )
    }
}

// ============================================================
// 📤 EXPORT
// ============================================================

export default handler
