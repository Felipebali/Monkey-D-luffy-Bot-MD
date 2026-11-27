
/**
 * 📂 plugins/tagall.js
 * 🤖 WHATSAPP-BOT — TAGALL SYSTEM
 *
 * 📢 Menciones masivas
 * 🔕 Exclusión voluntaria con .notagall
 * 💾 Base de datos persistente
 * 🔄 Toggle sin on/off
 * 🆔 Compatibilidad con JID y LID
 * 👑 TagAll exclusivo para admins y owners
 * 👥 NoTagAll disponible para todos
 * ⏳ Sin cooldown
 * 🔇 Sin mensajes privados
 */

import fs from 'node:fs'
import path from 'node:path'

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

const DB_FOLDER = './database'
const DB_FILE = path.join(DB_FOLDER, 'notagall.json')

fs.mkdirSync(DB_FOLDER, { recursive: true })

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify({ usuarios: [] }, null, 2),
        'utf8'
    )
}

// ============================================================
// 📖 LEER BASE DE DATOS
// ============================================================

function leerDB() {
    const data = JSON.parse(
        fs.readFileSync(DB_FILE, 'utf8')
    )

    if (!Array.isArray(data.usuarios)) {
        throw new Error('Base de datos NoTagAll inválida.')
    }

    return data
}

// ============================================================
// 💾 GUARDAR BASE DE DATOS
// ============================================================

function guardarDB(data) {
    const temporal = `${DB_FILE}.tmp`

    fs.writeFileSync(
        temporal,
        JSON.stringify(data, null, 2),
        'utf8'
    )

    fs.renameSync(temporal, DB_FILE)
}

// ============================================================
// 🆔 NORMALIZAR IDENTIFICADORES
// ============================================================

function normalizarJid(jid) {
    if (typeof jid !== 'string') return null

    jid = jid.trim().toLowerCase()

    if (/^\d+$/.test(jid)) {
        return `${jid}@s.whatsapp.net`
    }

    jid = jid
        .replace(/:\d+@/, '@')
        .replace(/@c\.us$/, '@s.whatsapp.net')

    if (!/^\d+@(s\.whatsapp\.net|lid)$/.test(jid)) {
        return null
    }

    return jid
}

function obtenerIds(...valores) {
    return [...new Set(
        valores
            .flat(Infinity)
            .map(normalizarJid)
            .filter(Boolean)
    )]
}

// ============================================================
// 👤 OBTENER IDENTIFICADORES DEL PARTICIPANTE
// ============================================================

function idsParticipante(p) {
    if (!p) return []

    return obtenerIds(
        p.id,
        p.jid,
        p.lid,
        p.phoneNumber,
        p.pn
    )
}

// ============================================================
// 🔄 RESOLVER LID Y NÚMERO NORMAL
// ============================================================

async function resolverIds(conn, ids) {
    const resultado = new Set(ids)

    const mapping =
        conn.signalRepository?.lidMapping

    if (!mapping) {
        return [...resultado]
    }

    for (const id of ids) {
        try {
            let alternativo

            if (
                id.endsWith('@lid') &&
                typeof mapping.getPNForLID === 'function'
            ) {
                alternativo =
                    await mapping.getPNForLID(id)

            } else if (
                id.endsWith('@s.whatsapp.net') &&
                typeof mapping.getLIDForPN === 'function'
            ) {
                alternativo =
                    await mapping.getLIDForPN(id)
            }

            const normalizado =
                normalizarJid(alternativo)

            if (normalizado) {
                resultado.add(normalizado)
            }

        } catch {
            // Continuar con los identificadores disponibles.
        }
    }

    return [...resultado]
}

// ============================================================
// 👤 IDENTIFICAR USUARIO
// ============================================================

async function identificarUsuario(
    conn,
    m,
    participantes
) {
    let ids = obtenerIds(
        m.sender,
        m.senderPn,
        m.senderLid,
        m.key?.participant,
        m.key?.participantAlt
    )

    ids = await resolverIds(conn, ids)

    const participante = participantes.find(p =>
        idsParticipante(p).some(id =>
            ids.includes(id)
        )
    )

    if (participante) {
        ids = obtenerIds(
            ids,
            idsParticipante(participante)
        )
    }

    return resolverIds(conn, ids)
}

// ============================================================
// 🔕 COMPROBAR EXCLUSIÓN
// ============================================================

function estaExcluido(data, ids) {
    return data.usuarios.some(usuario =>
        Array.isArray(usuario.ids) &&
        usuario.ids.some(id => ids.includes(id))
    )
}

// ============================================================
// 🎭 REACCIONES
// ============================================================

async function react(conn, m, emoji) {
    try {
        await conn.sendMessage(m.chat, {
            react: {
                text: emoji,
                key: m.key
            }
        })
    } catch {}
}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

let handler = async function (m, {
    conn,
    groupMetadata,
    args = [],
    isAdmin,
    isOwner,
    isROwner,
    command = ''
}) {

    // 🔇 No responder en privados.

    if (!m.isGroup) return

    command = command.toLowerCase()

    const chatId = m.chat

    const autorizado = Boolean(
        isAdmin || isOwner || isROwner
    )

    try {

        // ====================================================
        // 🔕 NOTAGALL — DISPONIBLE PARA TODOS
        // ====================================================

        if (command === 'notagall') {

            const participantes =
                groupMetadata?.participants ||
                (await conn.groupMetadata(chatId)).participants ||
                []

            const ids = await identificarUsuario(
                conn,
                m,
                participantes
            )

            if (!ids.length) {
                return m.reply(
                    '❌ No pude identificar tu usuario.'
                )
            }

            const data = leerDB()

            const excluido = estaExcluido(data, ids)

            // ================================================
            // 🔔 VOLVER A RECIBIR MENCIONES
            // ================================================

            if (excluido) {

                data.usuarios = data.usuarios.filter(
                    usuario =>
                        !usuario.ids?.some(id =>
                            ids.includes(id)
                        )
                )

                guardarDB(data)

                await m.reply(
                    `╭━━〔 🔔 *NOTAGALL* 〕━━╮
┃
┃ 🟢 Menciones activadas.
┃
┃ Volverás a recibir avisos
┃ de los comandos TagAll.
┃
┃ 🔄 Usa .notagall para
┃ desactivarlas nuevamente.
╰━━━━━━━━━━━━━━━━━━━━╯`
                )

                return react(conn, m, '🔔')
            }

            // ================================================
            // 🔕 DEJAR DE RECIBIR MENCIONES
            // ================================================

            data.usuarios.push({
                ids,
                fecha: new Date().toISOString()
            })

            guardarDB(data)

            await m.reply(
                `╭━━〔 🔕 *NOTAGALL* 〕━━╮
┃
┃ 🔴 Menciones desactivadas.
┃
┃ Ya no serás mencionado
┃ mediante TagAll, Todos
┃ o Invocar.
┃
┃ 🌐 Válido en todos los
┃ grupos de este bot.
┃
┃ 🔄 Usa .notagall para
┃ volver a recibir avisos.
╰━━━━━━━━━━━━━━━━━━━━╯`
            )

            return react(conn, m, '🔕')
        }

        // ====================================================
        // 👑 PERMISOS ADMIN / OWNER
        // ====================================================

        if (!autorizado) {
            return m.reply(
                '❌ Solo administradores y owners pueden usar este comando.'
            )
        }

        // ====================================================
        // 💾 CONFIGURACIÓN DEL GRUPO
        // ====================================================

        if (!global.db?.data) {
            throw new Error('Base de datos global no disponible.')
        }

        global.db.data.chats ??= {}
        global.db.data.chats[chatId] ??= {}

        const chatData =
            global.db.data.chats[chatId]

        // ====================================================
        // 🔄 TOGGLE .ANTITAGALL
        // ====================================================

        if (command === 'antitagall') {

            chatData.tagallEnabled =
                !chatData.tagallEnabled

            await m.reply(
                `╭━━〔 ⚙️ *TAGALL* 〕━━╮
┃
┃ Estado: ${
    chatData.tagallEnabled
        ? 'Activado ✅'
        : 'Desactivado ❌'
}
┃
┃ 👥 Configuración del grupo.
╰━━━━━━━━━━━━━━━━━━━━╯`
            )

            return react(
                conn,
                m,
                chatData.tagallEnabled ? '✅' : '❌'
            )
        }

        // ====================================================
        // 🔒 COMPROBAR ESTADO DEL TAGALL
        // ====================================================

        if (!chatData.tagallEnabled) {
            return m.reply(
                '⚠️ El TagAll está desactivado.\n\nUsa *.antitagall* para activarlo.'
            )
        }

        // ====================================================
        // 👥 OBTENER PARTICIPANTES
        // ====================================================

        const participantes =
            groupMetadata?.participants ||
            (await conn.groupMetadata(chatId)).participants ||
            []

        if (!participantes.length) {
            return m.reply(
                '❌ No pude obtener los participantes.'
            )
        }

        // ====================================================
        // 🔕 CARGAR USUARIOS EXCLUIDOS
        // ====================================================

        const data = leerDB()

        const excluidosDB = new Set()

        for (const usuario of data.usuarios) {

            const ids = await resolverIds(
                conn,
                obtenerIds(usuario.ids || [])
            )

            for (const id of ids) {
                excluidosDB.add(id)
            }
        }

        // ====================================================
        // 🤖 IDENTIFICAR AL BOT
        // ====================================================

        const botIds = await resolverIds(
            conn,
            obtenerIds(
                conn.user?.id,
                conn.user?.jid,
                conn.user?.lid
            )
        )

        // ====================================================
        // 🔍 FILTRAR PARTICIPANTES
        // ====================================================

        const mencionados = []
        const registrados = new Set()

        let excluidos = 0

        for (const participante of participantes) {

            const ids = idsParticipante(participante)

            const jid =
                normalizarJid(participante.id) ||
                ids[0]

            if (!jid) continue

            // No mencionar al propio bot.

            if (ids.some(id => botIds.includes(id))) {
                continue
            }

            // Evitar usuarios duplicados.

            if (ids.some(id => registrados.has(id))) {
                continue
            }

            for (const id of ids) {
                registrados.add(id)
            }

            // Respetar las preferencias de NoTagAll.

            if (ids.some(id => excluidosDB.has(id))) {
                excluidos++
                continue
            }

            mencionados.push(jid)
        }

        // ====================================================
        // 🔇 SI NO HAY USUARIOS PARA MENCIONAR
        // ====================================================

        if (!mencionados.length) {
            return m.reply(
                '🔕 No hay usuarios disponibles para mencionar.'
            )
        }

        // ====================================================
        // 💬 MENSAJE OPCIONAL
        // ====================================================

        const mensajeOpcional =
            args.join(' ').trim()

        // ====================================================
        // 📋 LISTA DE USUARIOS
        // ====================================================

        const listaUsuarios = mencionados
            .map(jid =>
                `┃ 🐾 @${jid.split('@')[0]}`
            )
            .join('\n')

        // ====================================================
        // 🔥 CREAR MENSAJE TAGALL
        // ====================================================

        const mensaje = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   ✦ 𝑻𝑨𝑮𝑨𝑳𝑳 𝑺𝒀𝑺𝑻𝑬𝑴 ✦
╰━━━━━━━━━━━━━━━━━━━━━━╯

        ✧ 𝑼𝑳𝑻𝑹𝑨 𝑴𝑶𝑫𝑬 ✧

╭━━━〔 📢 𝑰𝑵𝑽𝑶𝑪𝑨𝑪𝑰Ó𝑵 〕━━━╮
┃
┃ 👥 Mencionados: ${mencionados.length}
┃ 🔕 Excluidos: ${excluidos}
┃
┃ 💬 *Mensaje:*
┃ ${mensajeOpcional || '¡Atención, grupo!'}
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 👥 𝑼𝑺𝑼𝑨𝑹𝑰𝑶𝑺 〕━━━╮
┃
${listaUsuarios}
┃
╰━━━━━━━━━━━━━━━━━━━━╯

🔕 ¿No querés recibir menciones?
Usa *.notagall*

╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ 🐾 *WHATSAPP-BOT ONLINE*
┃ ⚡ *𝑼𝑳𝑻𝑹𝑨 𝑴𝑶𝑫𝑬*
╰━━━━━━━━━━━━━━━━━━━━━━╯
`.trim()

        // ====================================================
        // 📤 ENVIAR MENCIÓN MASIVA
        // ====================================================

        await conn.sendMessage(chatId, {
            text: mensaje,
            mentions: mencionados
        })

        console.log(
            `[TAGALL] Grupo: ${chatId} | ` +
            `Mencionados: ${mencionados.length} | ` +
            `Excluidos: ${excluidos}`
        )

    } catch (error) {

        console.error(
            '[TAGALL] ERROR:',
            error.stack || error.message || error
        )

        await react(conn, m, '❌')

        await m.reply(
            '❌ No se pudo ejecutar el comando.'
        )
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL HANDLER
// ============================================================

handler.command = /^(invocar|todos|tagall|antitagall|notagall)$/i

handler.help = [
    'tagall <mensaje>',
    'todos <mensaje>',
    'invocar <mensaje>',
    'antitagall',
    'notagall'
]

handler.tags = ['grupos']

handler.group = true
handler.admin = false
handler.botAdmin = false
handler.register = false
handler.limit = false

export default handler
