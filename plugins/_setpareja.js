// 📂 plugins/setpareja.js
// 👑 Forzar pareja — FelixCat_Bot
// 🔗 Compatible con plugins/parejas.js
//
// .setpareja @usuario1 @usuario2
// .setpareja 598XXXXXXXX 598XXXXXXXX
//
// La relación queda guardada en:
// ./database/parejas.json
//
// Luego las acciones:
// .amor
// .cita
// .besar
// .abrazar
// .regalo
// .flores
//
// reconocerán automáticamente la pareja.

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
// 👑 OBTENER OWNERS
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
        normalizarJid(conn, jid)

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
    // 💬 USUARIO CITADO
    // ========================================================

    if (m.quoted?.sender) {

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
            owners.some(owner => {

                const numeroOwner =
                    obtenerNumero(
                        conn,
                        owner
                    )

                const numeroSender =
                    obtenerNumero(
                        conn,
                        sender
                    )

                return (
                    numeroOwner &&
                    numeroSender &&
                    numeroOwner === numeroSender
                )
            })

        if (!esOwner) {

            return m.reply(
                '❌ Solo el dueño puede usar este comando.'
            )
        }

        // ====================================================
        // 💾 CARGAR DATABASE
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

        if (users.length < 2) {

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
            user1 === user2 ||
            obtenerNumero(conn, user1) ===
            obtenerNumero(conn, user2)
        ) {

            return m.reply(
                '❌ No puedes emparejar a la misma persona.'
            )
        }

        // ====================================================
        // 👤 CREAR REGISTROS
        // ====================================================

        if (!db[user1])
            db[user1] = crearUsuario()

        if (!db[user2])
            db[user2] = crearUsuario()

        const u1 =
            db[user1]

        const u2 =
            db[user2]

        const ahora =
            Date.now()

        // ====================================================
        // 💔 LIMPIAR PAREJA ANTERIOR DE USER 1
        // ====================================================

        if (u1.pareja) {

            const anterior =
                u1.pareja

            if (db[anterior]) {

                db[anterior].pareja = null
                db[anterior].estado = 'soltero'
                db[anterior].relacionFecha = null
                db[anterior].matrimonioFecha = null
                db[anterior].amor = 0
                db[anterior].propuesta = null
                db[anterior].propuestaFecha = null
                db[anterior].propuestaMatrimonio = null
                db[anterior].propuestaMatrimonioFecha = null
            }
        }

        // ====================================================
        // 💔 LIMPIAR PAREJA ANTERIOR DE USER 2
        // ====================================================

        if (u2.pareja) {

            const anterior =
                u2.pareja

            if (db[anterior]) {

                db[anterior].pareja = null
                db[anterior].estado = 'soltero'
                db[anterior].relacionFecha = null
                db[anterior].matrimonioFecha = null
                db[anterior].amor = 0
                db[anterior].propuesta = null
                db[anterior].propuestaFecha = null
                db[anterior].propuestaMatrimonio = null
                db[anterior].propuestaMatrimonioFecha = null
            }
        }

        // ====================================================
        // ❤️ CREAR RELACIÓN MUTUA
        // ====================================================

        u1.pareja =
            user2

        u2.pareja =
            user1

        u1.estado =
            'novios'

        u2.estado =
            'novios'

        u1.relacionFecha =
            ahora

        u2.relacionFecha =
            ahora

        // ====================================================
        // 💍 NO CASADOS
        // ====================================================

        u1.matrimonioFecha =
            null

        u2.matrimonioFecha =
            null

        // ====================================================
        // ❤️ REINICIAR AMOR
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
        // 🏷️ TAG
        // ====================================================

        const tag = jid => {

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
                )
        }

        // ====================================================
        // 💞 RESPUESTA
        // ====================================================

        const mensaje =
`╭━━━〔 👑 PAREJA FORZADA 〕━━━⬣
👤 ${tag(user1)} ❤️ ${tag(user2)}

💞 Ahora son pareja oficialmente.

💑 Estado: Novios
❤️ Amor: 0

🔗 La pareja quedó vinculada al sistema.
✨ Las acciones románticas ya están habilitadas.
╰━━━━━━━━━━━━━━━━⬣`

        return conn.reply(
            m.chat,
            mensaje,
            m,
            {
                mentions: [
                    user1,
                    user2
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
