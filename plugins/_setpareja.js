// 📂 plugins/setpareja.js
// 👑 Forzar pareja — FelixCat_Bot
// 🔗 Compatible con plugins/parejas.js
//
// .setpareja @usuario1 @usuario2
// .setpareja 598XXXXXXXX 598XXXXXXXX
//
// 🚫 NO permite parejas repetidas.
// 🚫 NO rompe relaciones existentes.
// ❤️ Compatible con:
// .amor
// .cita
// .besar
// .abrazar
// .regalo
// .flores

import fs from 'fs'
import path from 'path'

// ============================================================
// 💾 DATABASE
// ============================================================

const dir = './database'
const file = path.join(dir, 'parejas.json')

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
}

if (!fs.existsSync(file)) {
    fs.writeFileSync(
        file,
        JSON.stringify({}, null, 2)
    )
}

// ============================================================
// 📖 CARGAR DATABASE
// ============================================================

const loadDB = () => {
    try {
        return JSON.parse(
            fs.readFileSync(file, 'utf8')
        )
    } catch {
        return {}
    }
}

// ============================================================
// 💾 GUARDAR DATABASE
// ============================================================

const saveDB = data => {
    fs.writeFileSync(
        file,
        JSON.stringify(data, null, 2)
    )
}

// ============================================================
// 👑 OWNERS
// ============================================================

function getOwnersJid() {

    return (global.owner || [])
        .map(v => {

            if (Array.isArray(v))
                v = v[0]

            if (
                typeof v !== 'string' &&
                typeof v !== 'number'
            ) {
                return null
            }

            const numero =
                String(v)
                    .replace(/[^0-9]/g, '')

            if (!numero)
                return null

            return numero +
                '@s.whatsapp.net'

        })
        .filter(Boolean)
}

// ============================================================
// 🔧 NORMALIZAR JID
// ============================================================

function normalizarJid(conn, jid) {

    if (!jid)
        return null

    try {

        let id = String(jid)

        if (
            typeof conn.decodeJid === 'function'
        ) {
            id = conn.decodeJid(id)
        }

        return id
            .trim()
            .toLowerCase()

    } catch {

        return String(jid)
            .trim()
            .toLowerCase()
    }
}

// ============================================================
// 📱 OBTENER NÚMERO
// ============================================================

function obtenerNumero(conn, jid) {

    if (!jid)
        return null

    const id =
        normalizarJid(
            conn,
            jid
        )

    if (!id)
        return null

    const numero =
        id
            .split('@')[0]
            .split(':')[0]
            .replace(/\D/g, '')

    return numero || null
}

// ============================================================
// 👥 COMPARAR DOS PERSONAS
// ============================================================

function mismaPersona(conn, jid1, jid2) {

    if (!jid1 || !jid2)
        return false

    const a =
        normalizarJid(
            conn,
            jid1
        )

    const b =
        normalizarJid(
            conn,
            jid2
        )

    if (!a || !b)
        return false

    // JID exacto
    if (a === b)
        return true

    // Comparación por número
    const numeroA =
        obtenerNumero(
            conn,
            a
        )

    const numeroB =
        obtenerNumero(
            conn,
            b
        )

    if (
        numeroA &&
        numeroB &&
        numeroA === numeroB
    ) {
        return true
    }

    return false
}

// ============================================================
// 🔎 BUSCAR REGISTRO DE UNA PERSONA
// ============================================================

function buscarUsuario(db, conn, jid) {

    if (!jid)
        return null

    const limpio =
        normalizarJid(
            conn,
            jid
        )

    // Coincidencia exacta
    if (
        limpio &&
        db[limpio]
    ) {
        return limpio
    }

    // Coincidencia por número
    const numero =
        obtenerNumero(
            conn,
            limpio
        )

    if (!numero)
        return null

    for (
        const id of Object.keys(db)
    ) {

        const numeroDB =
            obtenerNumero(
                conn,
                id
            )

        if (
            numeroDB &&
            numeroDB === numero
        ) {
            return id
        }
    }

    return null
}

// ============================================================
// 👥 OBTENER USUARIOS
// ============================================================

async function obtenerUsuarios(
    m,
    conn,
    text
) {

    let users = []

    // ========================================================
    // 👤 MENCIONES
    // ========================================================

    if (
        Array.isArray(m.mentionedJid) &&
        m.mentionedJid.length
    ) {

        for (
            const jid of m.mentionedJid
        ) {

            const limpio =
                normalizarJid(
                    conn,
                    jid
                )

            if (limpio)
                users.push(limpio)
        }
    }

    // ========================================================
    // 💬 CITADO
    // ========================================================

    if (
        m.quoted?.sender
    ) {

        const citado =
            normalizarJid(
                conn,
                m.quoted.sender
            )

        if (citado)
            users.push(citado)
    }

    // ========================================================
    // 📱 NÚMEROS ESCRITOS
    // ========================================================

    if (text) {

        const numeros =
            String(text)
                .match(/\d{7,15}/g)

        if (numeros) {

            for (
                const numero of numeros
            ) {

                try {

                    const resultado =
                        await conn.onWhatsApp(
                            numero
                        )

                    if (
                        resultado &&
                        resultado[0]?.jid
                    ) {

                        const jid =
                            normalizarJid(
                                conn,
                                resultado[0].jid
                            )

                        if (jid)
                            users.push(jid)
                    }

                } catch (e) {

                    console.error(
                        'Error verificando número:',
                        numero,
                        e
                    )
                }
            }
        }
    }

    // ========================================================
    // 🧹 ELIMINAR DUPLICADOS
    // ========================================================

    users = [
        ...new Set(users)
    ]

    return users
}

// ============================================================
// 👤 CREAR USUARIO
// ============================================================

function crearUsuario() {

    return {

        pareja: null,

        estado: 'soltero',

        propuesta: null,

        propuestaFecha: null,

        propuestaMatrimonio: null,

        propuestaMatrimonioFecha: null,

        relacionFecha: null,

        matrimonioFecha: null,

        amor: 0
    }
}

// ============================================================
// 🏷️ TAG
// ============================================================

function tag(conn, jid) {

    const numero =
        obtenerNumero(
            conn,
            jid
        )

    return '@' +
        (
            numero ||
            String(jid)
                .split('@')[0]
                .split(':')[0]
        )
}

// ============================================================
// 🤖 HANDLER
// ============================================================

let handler = async (
    m,
    {
        conn,
        text
    }
) => {

    try {

        // ====================================================
        // 👑 COMPROBAR OWNER
        // ====================================================

        const sender =
            normalizarJid(
                conn,
                m.sender
            )

        const owners =
            getOwnersJid()

        const esOwner =
            owners.some(owner =>
                mismaPersona(
                    conn,
                    owner,
                    sender
                )
            )

        if (!esOwner) {

            return m.reply(
                '❌ Solo el dueño puede usar este comando.'
            )
        }

        // ====================================================
        // 💾 DATABASE
        // ====================================================

        const db =
            loadDB()

        // ====================================================
        // 👥 OBTENER USUARIOS
        // ====================================================

        const users =
            await obtenerUsuarios(
                m,
                conn,
                text
            )

        if (
            users.length < 2
        ) {

            return m.reply(
`💡 *USO DE .setpareja*

Debes indicar dos usuarios.

📌 Ejemplos:

.setpareja @usuario1 @usuario2

.setpareja 59891234567 59898765432

.setpareja @usuario1 59898765432`
            )
        }

        // ====================================================
        // 💕 USUARIOS
        // ====================================================

        const user1 =
            users[0]

        const user2 =
            users[1]

        // ====================================================
        // 🚫 MISMA PERSONA
        // ====================================================

        if (
            mismaPersona(
                conn,
                user1,
                user2
            )
        ) {

            return m.reply(
                '❌ No puedes emparejar a la misma persona.'
            )
        }

        // ====================================================
        // 🔎 BUSCAR REGISTROS REALES
        // ====================================================

        const id1 =
            buscarUsuario(
                db,
                conn,
                user1
            )

        const id2 =
            buscarUsuario(
                db,
                conn,
                user2
            )

        const real1 =
            id1 || user1

        const real2 =
            id2 || user2

        // ====================================================
        // 👤 CREAR SI NO EXISTE
        // ====================================================

        if (!db[real1])
            db[real1] =
                crearUsuario()

        if (!db[real2])
            db[real2] =
                crearUsuario()

        const u1 =
            db[real1]

        const u2 =
            db[real2]

        // ====================================================
        // ❤️ YA SON PAREJA
        // ====================================================

        if (
            u1.pareja &&
            mismaPersona(
                conn,
                u1.pareja,
                real2
            )
        ) {

            return conn.reply(
                m.chat,

`╭━━━〔 💞 YA SON PAREJA 〕━━━⬣
👤 ${tag(conn, real1)} ❤️ ${tag(conn, real2)}

Esta pareja ya está registrada.

❤️ Nivel de amor: ${Number(u1.amor || 0)}
💑 Estado: ${u1.estado || 'novios'}
╰━━━━━━━━━━━━━━━━⬣`,
                m,
                {
                    mentions: [
                        real1,
                        real2
                    ]
                }
            )
        }

        // ====================================================
        // 💔 USER 1 YA TIENE PAREJA
        // ====================================================

        if (u1.pareja) {

            const parejaId =
                buscarUsuario(
                    db,
                    conn,
                    u1.pareja
                ) || u1.pareja

            return conn.reply(
                m.chat,

`╭━━━〔 💔 YA TIENE PAREJA 〕━━━⬣
👤 ${tag(conn, real1)}

Ya está en pareja con:
❤️ ${tag(conn, parejaId)}

❌ No se puede crear otra pareja.
╰━━━━━━━━━━━━━━━━⬣`,
                m,
                {
                    mentions: [
                        real1,
                        parejaId
                    ]
                }
            )
        }

        // ====================================================
        // 💔 USER 2 YA TIENE PAREJA
        // ====================================================

        if (u2.pareja) {

            const parejaId =
                buscarUsuario(
                    db,
                    conn,
                    u2.pareja
                ) || u2.pareja

            return conn.reply(
                m.chat,

`╭━━━〔 💔 YA TIENE PAREJA 〕━━━⬣
👤 ${tag(conn, real2)}

Ya está en pareja con:
❤️ ${tag(conn, parejaId)}

❌ No se puede crear otra pareja.
╰━━━━━━━━━━━━━━━━⬣`,
                m,
                {
                    mentions: [
                        real2,
                        parejaId
                    ]
                }
            )
        }

        // ====================================================
        // ❤️ CREAR PAREJA
        // ====================================================

        const ahora =
            Date.now()

        u1.pareja =
            real2

        u2.pareja =
            real1

        u1.estado =
            'novios'

        u2.estado =
            'novios'

        u1.relacionFecha =
            ahora

        u2.relacionFecha =
            ahora

        u1.matrimonioFecha =
            null

        u2.matrimonioFecha =
            null

        // ====================================================
        // ❤️ AMOR INICIAL
        // ====================================================

        u1.amor =
            0

        u2.amor =
            0

        // ====================================================
        // 🧹 LIMPIAR PROPUESTAS
        // ====================================================

        u1.propuesta =
            null

        u2.propuesta =
            null

        u1.propuestaFecha =
            null

        u2.propuestaFecha =
            null

        u1.propuestaMatrimonio =
            null

        u2.propuestaMatrimonio =
            null

        u1.propuestaMatrimonioFecha =
            null

        u2.propuestaMatrimonioFecha =
            null

        // ====================================================
        // 💾 GUARDAR
        // ====================================================

        saveDB(db)

        // ====================================================
        // 🎉 RESPUESTA
        // ====================================================

        return conn.reply(
            m.chat,

`╭━━━〔 👑 PAREJA FORZADA 〕━━━⬣
👤 ${tag(conn, real1)} ❤️ ${tag(conn, real2)}

💞 Ahora son pareja oficialmente.

💑 Estado: Novios
❤️ Amor: 0

🔗 Pareja vinculada al sistema.
💕 Las acciones románticas están habilitadas.
╰━━━━━━━━━━━━━━━━⬣`,
            m,
            {
                mentions: [
                    real1,
                    real2
                ]
            }
        )

    } catch (e) {

        console.error(
            '❌ Error en setpareja:',
            e
        )

        return m.reply(
            '❌ Ocurrió un error al establecer la pareja.'
        )
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = [
    'setpareja'
]

handler.rowner = true
handler.group = true

export default handler
