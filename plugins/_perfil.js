// ============================================================
// 📂 plugins/perfil.js
// 👤 PERFIL COMPLETO — WHATSAPP-BOT
// 🧬 Hasta 3 hermanos
// ❤️ Pareja compatible con parejas.json
// 🏅 INSIGNIAS PERSONALIZADAS Y NUMERADAS
// 🎂 Cumpleaños
// 📝 Bio
// ⚧️ Género
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

for (const file of [
    PERFIL_FILE,
    PAREJAS_FILE,
    HERMANOS_FILE
]) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '{}')
    }
}

// ============================================================
// 💾 JSON
// ============================================================

function loadJSON(file) {
    try {
        return JSON.parse(
            fs.readFileSync(file, 'utf8') || '{}'
        )
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

    if (jid.includes('@')) {
        return jid
    }

    const number =
        jid.replace(/[^0-9]/g, '')

    if (!number) return null

    return `${number}@s.whatsapp.net`
}

// ============================================================
// 🔍 COMPARAR JID
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

    return Boolean(
        A &&
        B &&
        A === B
    )
}

// ============================================================
// 🔎 ENCONTRAR JID REAL
// ============================================================

function findJid(data, jid, conn) {

    if (!jid) return null

    jid =
        normalizeJid(
            jid,
            conn
        )

    if (!jid) return null

    if (data[jid]) {
        return jid
    }

    for (const id of Object.keys(data)) {

        if (
            sameUser(
                id,
                jid,
                conn
            )
        ) {
            return id
        }
    }

    return jid
}

// ============================================================
// 🏷️ MENCION
// ============================================================

function tag(jid) {

    if (!jid) {
        return '@usuario'
    }

    return '@' +
        String(jid)
            .split('@')[0]
            .split(':')[0]
}

// ============================================================
// 🎯 TARGET
// ============================================================

function getTarget(m, conn) {

    if (
        m.mentionedJid?.length
    ) {

        return normalizeJid(
            m.mentionedJid[0],
            conn
        )
    }

    if (
        m.quoted?.sender
    ) {

        return normalizeJid(
            m.quoted.sender,
            conn
        )
    }

    return null
}

// ============================================================
// 📅 FECHA
// ============================================================

function formatDate(value) {

    if (!value) {
        return 'No registrada'
    }

    const date =
        new Date(value)

    if (
        isNaN(
            date.getTime()
        )
    ) {
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
// ⏳ DÍAS
// ============================================================

function daysBetween(value) {

    if (!value) return 0

    const date =
        new Date(value)

    if (
        isNaN(
            date.getTime()
        )
    ) {
        return 0
    }

    return Math.max(
        0,
        Math.floor(
            (
                Date.now() -
                date.getTime()
            ) /
            86400000
        )
    )
}

// ============================================================
// 🎂 EDAD
// ============================================================

function calculateAge(birth) {

    if (!birth) return null

    const date =
        new Date(birth)

    if (
        isNaN(
            date.getTime()
        )
    ) {
        return null
    }

    const now =
        new Date()

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
            now.getDate() <
            date.getDate()
        )
    ) {
        age--
    }

    return age
}

// ============================================================
// ♑ ZODIACO
// ============================================================

function zodiac(day, month) {

    if (
        !day ||
        !month
    ) {
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

    const index =
        month - 1

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

    const date =
        new Date(birth)

    if (
        isNaN(
            date.getTime()
        )
    ) {
        return null
    }

    const now =
        new Date()

    let next =
        new Date(
            now.getFullYear(),
            date.getMonth(),
            date.getDate()
        )

    const today =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        )

    if (next < today) {

        next =
            new Date(
                now.getFullYear() + 1,
                date.getMonth(),
                date.getDate()
            )
    }

    return Math.ceil(
        (
            next.getTime() -
            now.getTime()
        ) /
        86400000
    )
}

// ============================================================
// 👑 OWNERS
// ============================================================

function getOwners(conn) {

    return (
        global.owner || []
    )
        .map(v => {

            if (
                Array.isArray(v)
            ) {
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
// 🛡️ OWNER
// ============================================================

function isOwner(m, conn) {

    return getOwners(conn).some(
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

async function getRole(
    m,
    conn,
    target
) {

    try {

        const owners =
            getOwners(conn)

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

        if (
            participant?.admin
        ) {
            return '🛡️ Administrador'
        }

    } catch {}

    return '👤 Usuario'
}

// ============================================================
// 🧬 OBTENER HERMANOS
// ============================================================

function getAllBrothers(
    hermanosDB,
    target,
    conn
) {

    const result = []

    const targetId =
        findJid(
            hermanosDB,
            target,
            conn
        )

    const data =
        hermanosDB[targetId]

    if (
        data &&
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

            if (!jid) continue

            result.push({
                jid:
                    normalizeJid(
                        jid,
                        conn
                    ),
                nivel:
                    Number(
                        brother?.nivel ||
                        0
                    ),
                interacciones:
                    Number(
                        brother?.interacciones ||
                        0
                    ),
                fecha:
                    brother?.fecha ||
                    null
            })
        }

        return result
    }

    return result
}

// ============================================================
// 🏅 RANGO HERMANO
// ============================================================

function rangoHermano(nivel) {

    nivel =
        Number(nivel || 0)

    if (nivel >= 500)
        return '👑 Hermanos Supremos'

    if (nivel >= 200)
        return '🔥 Hermanos Legendarios'

    if (nivel >= 120)
        return '💪 Hermanos Fuertes'

    if (nivel >= 60)
        return '🤝 Hermanos Reales'

    if (nivel >= 30)
        return '🙂 Hermanos Cercanos'

    return '👶 Hermanos Nuevos'
}

// ============================================================
// 🏅 UTILIDADES DE INSIGNIAS
// ============================================================

// Convierte:
// "Mejor Admin"
// "🏆 Mejor Admin"
// "mejor admin"
// en un texto limpio.
function normalizeBadgeName(text) {

    return String(text || '')
        .replace(
            /\s+/g,
            ' '
        )
        .trim()
}

// ============================================================
// 🏅 OBTENER INSIGNIAS
// ============================================================

function getBadges(perfil) {

    if (
        !perfil ||
        !Array.isArray(
            perfil.insignias
        )
    ) {
        return []
    }

    return perfil.insignias
        .map(
            badge =>
                normalizeBadgeName(
                    badge
                )
        )
        .filter(Boolean)
}

// ============================================================
// 🏅 BUSCAR DUPLICADO
// ============================================================

function badgeExists(
    badges,
    badge
) {

    const target =
        normalizeBadgeName(
            badge
        ).toLowerCase()

    return badges.some(
        x =>
            normalizeBadgeName(
                x
            ).toLowerCase() ===
            target
    )
}

// ============================================================
// 🏅 MOSTRAR INSIGNIAS
// ============================================================

function formatBadges(
    badges
) {

    if (
        !Array.isArray(badges) ||
        !badges.length
    ) {
        return 'Sin insignias'
    }

    return badges
        .map(
            (
                badge,
                index
            ) =>
                `${index + 1}. ${badge}`
        )
        .join('\n')
}

// ============================================================
// ❤️ OBTENER PAREJA
// ============================================================

function getParejaInfo(
    parejasDB,
    target,
    conn
) {

    const targetId =
        findJid(
            parejasDB,
            target,
            conn
        )

    let data =
        parejasDB[targetId]

    if (!data) {

        for (
            const jid
            of Object.keys(
                parejasDB
            )
        ) {

            const pareja =
                parejasDB[jid]

            if (
                pareja?.pareja &&
                sameUser(
                    pareja.pareja,
                    target,
                    conn
                )
            ) {

                data =
                    pareja

                return {
                    ...pareja,
                    parejaJid:
                        jid
                }
            }
        }

        return null
    }

    return {
        ...data,
        parejaJid:
            data.pareja
    }
}

// ============================================================
// ❤️ ESTADO PAREJA
// ============================================================

function estadoPareja(
    estado
) {

    const estados = {

        novios:
            '❤️ En pareja',

        casados:
            '💍 Casados',

        prometidos:
            '💎 Comprometidos',

        enamorados:
            '💖 Enamorados'

    }

    return (
        estados[estado] ||
        '❤️ En pareja'
    )
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (
    m,
    {
        conn,
        text,
        command
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

        const hermanos =
            loadJSON(
                HERMANOS_FILE
            )

        const target =
            getTarget(
                m,
                conn
            ) ||
            normalizeJid(
                m.sender,
                conn
            )

        const targetId =
            findJid(
                perfiles,
                target,
                conn
            )

        if (
            !perfiles[targetId]
        ) {
            perfiles[targetId] = {}
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

        // ========================================================
        // 🏅 OTORGAR INSIGNIA PERSONALIZADA
        // ========================================================

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
                    '❌ Menciona o responde al usuario al que quieres otorgarle la insignia.'
                )
            }

            const jid =
                findJid(
                    perfiles,
                    objetivo,
                    conn
                )

            if (
                !perfiles[jid]
            ) {
                perfiles[jid] = {}
            }

            if (
                !Array.isArray(
                    perfiles[jid].insignias
                )
            ) {
                perfiles[jid].insignias = []
            }

            // ====================================================
            // 📝 OBTENER NOMBRE DE INSIGNIA
            // ====================================================

            let badgeText =
                String(
                    text || ''
                )
                    .trim()

            // Eliminar menciones del texto
            badgeText =
                badgeText
                    .replace(
                        /@\d{5,16}/g,
                        ''
                    )
                    .replace(
                        /\s+/g,
                        ' '
                    )
                    .trim()

            // Si el texto viene vacío pero hay mención
            if (!badgeText) {

                return m.reply(
`🏅 *OTORGAR INSIGNIA*

Usa:

*.otorgar <insignia> @usuario*

Ejemplos:

*.otorgar 🏆 Mejor Admin @usuario*

*.otorgar 👑 Fundador @usuario*

*.otorgar 💎 VIP @usuario*

También puedes responder al usuario:

*.otorgar Mejor Admin*`
                )
            }

            // ====================================================
            // 🏅 EVITAR DUPLICADOS
            // ====================================================

            if (
                badgeExists(
                    perfiles[jid].insignias,
                    badgeText
                )
            ) {

                return m.reply(
`⚠️ ${tag(jid)} ya tiene esa insignia.

🏅 *Insignias actuales:*

${formatBadges(
    perfiles[jid].insignias
)}`
                )
            }

            // ====================================================
            // ➕ AGREGAR INSIGNIA
            // ====================================================

            perfiles[jid]
                .insignias
                .push(
                    badgeText
                )

            saveJSON(
                PERFIL_FILE,
                perfiles
            )

            const numero =
                perfiles[jid]
                    .insignias
                    .length

            return conn.sendMessage(
                m.chat,
                {
                    text:
`🏅 *INSIGNIA OTORGADA*

👤 ${tag(jid)}

${numero}. ${badgeText}

━━━━━━━━━━━━━━━━━━━━

🏅 *Insignias actuales:*
${formatBadges(
    perfiles[jid].insignias
)}`,
                    mentions: [
                        jid
                    ]
                },
                {
                    quoted: m
                }
            )
        }

        // ========================================================
        // ❌ QUITAR INSIGNIA POR NÚMERO
        // ========================================================

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
                    '❌ Menciona o responde al usuario al que quieres quitarle la insignia.'
                )
            }

            const jid =
                findJid(
                    perfiles,
                    objetivo,
                    conn
                )

            if (
                !perfiles[jid] ||
                !Array.isArray(
                    perfiles[jid].insignias
                ) ||
                !perfiles[jid].insignias.length
            ) {

                return m.reply(
                    `❌ ${tag(jid)} no tiene insignias.`
                )
            }

            // ====================================================
            // 🔢 NÚMERO
            // ====================================================

            const partes =
                String(
                    text || ''
                )
                    .trim()
                    .split(/\s+/)

            const numero =
                parseInt(
                    partes.find(
                        x =>
                            /^\d+$/.test(x)
                    )
                )

            if (
                !numero ||
                numero < 1
            ) {

                return m.reply(
`❌ Debes indicar el número de la insignia.

🏅 *Insignias de ${tag(jid)}:*

${formatBadges(
    perfiles[jid].insignias
)}

━━━━━━━━━━━━━━━━━━━━

Ejemplo:

*.quitar 1 @usuario*

También puedes responder al usuario:

*.quitar 1*`
                )
            }

            const index =
                numero - 1

            if (
                index >=
                perfiles[jid]
                    .insignias
                    .length
            ) {

                return m.reply(
`❌ La insignia número *${numero}* no existe.

🏅 *Insignias actuales:*

${formatBadges(
    perfiles[jid].insignias
)}`
                )
            }

            // ====================================================
            // 🗑️ ELIMINAR
            // ====================================================

            const insigniaEliminada =
                perfiles[jid]
                    .insignias
                    .splice(
                        index,
                        1
                    )[0]

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

❌ ${numero}. ${insigniaEliminada}

━━━━━━━━━━━━━━━━━━━━

🏅 *Insignias restantes:*
${
    formatBadges(
        perfiles[jid].insignias
    )
}`,
                    mentions: [
                        jid
                    ]
                },
                {
                    quoted: m
                }
            )
        }

        // ========================================================
        // 🏅 LISTAR INSIGNIAS DEL USUARIO
        // ========================================================

        if (
            command === 'insignias' ||
            command === 'verinsignias'
        ) {

            const objetivo =
                getTarget(
                    m,
                    conn
                ) ||
                normalizeJid(
                    m.sender,
                    conn
                )

            const jid =
                findJid(
                    perfiles,
                    objetivo,
                    conn
                )

            const userPerfil =
                perfiles[jid] || {}

            const insignias =
                getBadges(
                    userPerfil
                )

            return conn.sendMessage(
                m.chat,
                {
                    text:
`╭━━━〔 🏅 INSIGNIAS 〕━━━╮

👤 Usuario: ${tag(jid)}

━━━━━━━━━━━━━━━━━━━━

${
    insignias.length
        ? formatBadges(
            insignias
        )
        : 'Sin insignias actualmente.'
}

━━━━━━━━━━━━━━━━━━━━

🏅 Total: ${insignias.length}
╰━━━━━━━━━━━━━━━━━━━━╯`,
                    mentions: [
                        jid
                    ]
                },
                {
                    quoted: m
                }
            )
        }

        // ========================================================
        // 👤 PERFIL
        // ========================================================

        if (
            command === 'perfil'
        ) {

            // ====================================================
            // 🎂 DATOS
            // ====================================================

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

            // ====================================================
            // 👮 ROL
            // ====================================================

            const role =
                await getRole(
                    m,
                    conn,
                    targetId
                )

            // ====================================================
            // 🏅 INSIGNIAS
            // ====================================================

            const insignias =
                getBadges(
                    perfil
                )

            // ====================================================
            // ❤️ PAREJA
            // ====================================================

            const parejaInfo =
                getParejaInfo(
                    parejas,
                    targetId,
                    conn
                )

            const parejaJid =
                parejaInfo?.parejaJid ||
                parejaInfo?.pareja ||
                null

            // ====================================================
            // 🧬 HERMANOS
            // ====================================================

            const brotherData =
                getAllBrothers(
                    hermanos,
                    targetId,
                    conn
                )

            // ====================================================
            // 📸 FOTO
            // ====================================================

            let ppUrl = null

            try {

                ppUrl =
                    await conn.profilePictureUrl(
                        targetId,
                        'image'
                    )

            } catch {}

            // ====================================================
            // 📅 REGISTRO
            // ====================================================

            const registered =
                perfil.registered ||
                perfil.joinGroup ||
                null

            // ====================================================
            // 📝 CABECERA
            // ====================================================

            let texto =
`╭━━━━━━━━━━━━━━━━━━━━╮
        👤 *PERFIL*
╰━━━━━━━━━━━━━━━━━━━━╯

👤 *Usuario:* ${tag(targetId)}
${role}

━━━━━━━━━━━━━━━━━━━━
📝 *BIO*
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

            // ====================================================
            // ❤️ RELACIÓN
            // ====================================================

            texto +=
`
━━━━━━━━━━━━━━━━━━━━
❤️ *RELACIÓN*
`

            if (
                parejaInfo
            ) {

                const estado =
                    estadoPareja(
                        parejaInfo.estado
                    )

                const diasRelacion =
                    daysBetween(
                        parejaInfo.relacionFecha
                    )

                texto +=
`
${estado}

💞 *Pareja:* ${tag(parejaJid)}

📅 *Desde:* ${
    formatDate(
        parejaInfo.relacionFecha
    )
}

🕒 *Tiempo:* ${
    diasRelacion
} días

💖 *Amor:* ${
    parejaInfo.amor ||
    0
} puntos
`

                if (
                    parejaInfo.matrimonioFecha
                ) {

                    texto +=
`
💍 *Matrimonio:* ${
    formatDate(
        parejaInfo.matrimonioFecha
    )
}
`
                }

            } else {

                texto +=
`
💔 *Soltero/a*

No tiene una pareja registrada.
`
            }

            // ====================================================
            // 🧬 HERMANOS
            // ====================================================

            texto +=
`
━━━━━━━━━━━━━━━━━━━━
🧬 *HERMANOS*
`

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
`
😹 No tiene hermanos registrados.
`

            } else {

                texto +=
`
🤝 *${brotherData.length}/3 hermanos*
`

                brotherData.forEach(
                    (
                        brother,
                        index
                    ) => {

                        const dias =
                            daysBetween(
                                brother.fecha
                            )

                        texto +=
`
${index + 1}. 🤝 ${tag(brother.jid)}
   💪 Nivel: ${brother.nivel}
   🏅 ${rangoHermano(brother.nivel)}
   🎮 Interacciones: ${brother.interacciones}
   📅 Desde: ${formatDate(brother.fecha)}
   🕒 ${dias} días
`

                        mentions.push(
                            brother.jid
                        )
                    }
                )
            }

            // ====================================================
            // 🏅 INSIGNIAS
            // ====================================================

            texto +=
`
━━━━━━━━━━━━━━━━━━━━
🏅 *INSIGNIAS*
`

            if (
                insignias.length
            ) {

                texto +=
                    formatBadges(
                        insignias
                    )

            } else {

                texto +=
                    'Sin insignias'
            }

            // ====================================================
            // 📊 RESUMEN
            // ====================================================

            texto +=
`

━━━━━━━━━━━━━━━━━━━━
📊 *RESUMEN*

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

            // ====================================================
            // 📤 ENVIAR
            // ====================================================

            if (
                ppUrl
            ) {

                return conn.sendMessage(
                    m.chat,
                    {
                        image: {
                            url:
                                ppUrl
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
// 📋 COMANDOS
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

handler.before =
async function (m) {

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

        const conn =
            this

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
                !perfiles[jid]
            ) {
                perfiles[jid] = {}
            }

            perfiles[jid]
                .insignias = []
        }

        saveJSON(
            PERFIL_FILE,
            perfiles
        )

        return m.reply(
`🧹 *INSIGNIAS LIMPIADAS*

✅ Todas las insignias fueron eliminadas.`
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
