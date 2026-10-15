// 📂 plugins/media-admin.js
// 🛡️ WHATSAPP-BOT — SISTEMA COMPLETO DE MEDIOS
// 💾 Guardado automático + administrador + limpieza de DB
// 📌 Recuperación en el grupo donde se usa el comando
// 📌 Grupo central conservado para otras funciones
// ============================================================

import fs from 'fs'
import path from 'path'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

// ============================================================
// 📁 CONFIGURACIÓN
// ============================================================

const MEDIA_DB_FILE = './database/media.json'
const MEDIA_FOLDER = './media'

// ============================================================
// 📌 GRUPO CENTRAL ORIGINAL
// ============================================================

const MEDIA_GROUP = '120363410955044864@g.us'

// ============================================================
// 📂 CREAR CARPETAS Y BASE DE DATOS
// ============================================================

fs.mkdirSync('./database', { recursive: true })
fs.mkdirSync(MEDIA_FOLDER, { recursive: true })

if (!fs.existsSync(MEDIA_DB_FILE)) {
    fs.writeFileSync(MEDIA_DB_FILE, '[]', 'utf8')
}

// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {
    return (global.owner || [])
        .map(owner => Array.isArray(owner) ? owner[0] : owner)
        .filter(Boolean)
        .map(owner => String(owner).trim())
        .filter(Boolean)
}

// ============================================================
// 🔐 NORMALIZAR JID
// ============================================================

function normalizeJid(jid) {
    if (!jid) return ''

    return String(jid)
        .replace(/:\d+@/, '@')
        .trim()
        .toLowerCase()
}

function getNumber(jid) {
    return normalizeJid(jid)
        .replace(/@s\.whatsapp\.net$/i, '')
        .replace(/@lid$/i, '')
        .replace(/\D/g, '')
}

function isOwner(m, conn) {
    const sender = normalizeJid(
        conn?.decodeJid
            ? conn.decodeJid(m.sender)
            : m.sender
    )

    const senderNumber = getNumber(sender)

    return getOwners().some(ownerValue => {
        const owner = normalizeJid(ownerValue)

        if (owner === sender) return true

        const ownerNumber = getNumber(owner)

        return Boolean(
            senderNumber &&
            ownerNumber &&
            senderNumber === ownerNumber
        )
    })
}

// ============================================================
// 📂 CARGAR BASE DE DATOS
// ============================================================

function loadMediaDB() {
    try {
        if (!fs.existsSync(MEDIA_DB_FILE)) {
            fs.writeFileSync(MEDIA_DB_FILE, '[]', 'utf8')
            return []
        }

        const data = JSON.parse(
            fs.readFileSync(MEDIA_DB_FILE, 'utf8')
        )

        return Array.isArray(data) ? data : []
    } catch (error) {
        console.error('[MEDIA] Error leyendo media.json:', error)
        return null
    }
}

// ============================================================
// 💾 GUARDAR BASE DE DATOS
// ============================================================

function saveMediaDB(list) {
    try {
        const tempFile = `${MEDIA_DB_FILE}.tmp`

        fs.writeFileSync(
            tempFile,
            JSON.stringify(list, null, 2),
            'utf8'
        )

        fs.renameSync(tempFile, MEDIA_DB_FILE)

        return true
    } catch (error) {
        console.error('[MEDIA] Error guardando media.json:', error)
        return false
    }
}

// ============================================================
// 📍 OBTENER RUTA DEL ARCHIVO
// ============================================================

function getFilePath(item) {
    if (!item) return null

    const root = path.resolve(MEDIA_FOLDER)

    if (item.path) {
        const registeredPath = path.resolve(item.path)
        const relative = path.relative(root, registeredPath)

        if (
            relative &&
            !relative.startsWith('..') &&
            !path.isAbsolute(relative) &&
            fs.existsSync(registeredPath) &&
            fs.statSync(registeredPath).isFile()
        ) {
            return registeredPath
        }
    }

    if (item.filename) {
        const filename = String(item.filename)

        if (
            filename !== path.basename(filename) ||
            filename === '.' ||
            filename === '..'
        ) {
            return null
        }

        const filepath = path.join(root, filename)

        if (
            fs.existsSync(filepath) &&
            fs.statSync(filepath).isFile()
        ) {
            return filepath
        }
    }

    return null
}

// ============================================================
// 🧹 SINCRONIZAR REGISTROS CON LOS ARCHIVOS
// ============================================================

function syncMediaDB() {
    try {
        const list = loadMediaDB()

        // No sobrescribir la base si no se pudo leer.
        if (!list) return null

        const valid = list.filter(item => Boolean(getFilePath(item)))

        const normalized = valid.map((item, index) => ({
            ...item,
            id: index + 1
        }))

        if (
            normalized.length !== list.length ||
            normalized.some((item, index) => item.id !== list[index]?.id)
        ) {
            if (!saveMediaDB(normalized)) return null
        }

        if (!global.db) global.db = {}
        if (!global.db.data) global.db.data = {}

        global.db.data.mediaList = normalized

        return normalized
    } catch (error) {
        console.error('[MEDIA] Error sincronizando:', error)
        return null
    }
}

// ============================================================
// 🚀 SINCRONIZAR AL CARGAR EL PLUGIN
// ============================================================

syncMediaDB()

// ============================================================
// 💾 GUARDAR IMÁGENES, VIDEOS, AUDIOS Y DOCUMENTOS
// ============================================================

async function saveIncomingMedia(m, conn) {
    try {
        if (!m?.message) return

        const typeMap = {
            imageMessage: 'image',
            videoMessage: 'video',
            audioMessage: 'audio',
            documentMessage: 'document'
        }

        const type = typeMap[m.mtype]

        if (!type) return

        const buffer = await downloadMediaMessage(
            m,
            'buffer',
            {}
        )

        if (!buffer || !buffer.length) return

        const list = syncMediaDB()

        if (!list) return

        const uniqueName =
            `${Date.now()}_${Math.floor(Math.random() * 999999)}`

        let extension = ''

        if (type === 'image') {
            extension = '.jpg'
        } else if (type === 'video') {
            extension = '.mp4'
        } else if (type === 'audio') {
            extension = '.mp3'
        } else if (type === 'document') {
            const originalName =
                m.msg?.fileName ||
                m.message?.documentMessage?.fileName ||
                'archivo'

            const safeName = String(originalName)
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
                .replace(/\s+/g, '_')

            extension = `_${safeName}`
        }

        const filename = uniqueName + extension
        const filepath = path.join(MEDIA_FOLDER, filename)

        fs.writeFileSync(filepath, buffer)

        let groupName = ''

        if (m.isGroup) {
            try {
                const metadata = await conn.groupMetadata(m.chat)
                groupName = metadata?.subject || ''
            } catch {
                groupName = ''
            }
        }

        const entry = {
            id: list.length + 1,
            filename,
            path: filepath,
            type,
            from: m.sender || null,
            groupId: m.isGroup ? m.chat : null,
            groupName: m.isGroup ? groupName : null,
            mimetype:
                m.msg?.mimetype ||
                m.message?.documentMessage?.mimetype ||
                null,
            date: new Date().toLocaleString()
        }

        list.push(entry)

        if (!saveMediaDB(list)) {
            try {
                fs.unlinkSync(filepath)
            } catch {}

            return
        }

        if (!global.db) global.db = {}
        if (!global.db.data) global.db.data = {}

        global.db.data.mediaList = list

        console.log(
            `[MEDIA] Archivo guardado con ID ${entry.id}: ${filename}`
        )
    } catch (error) {
        console.error('[MEDIA] Error guardando archivo:', error)
    }
}

// ============================================================
// 📤 ENVIAR ARCHIVO A UN GRUPO
// ============================================================

async function sendMediaToGroup(conn, groupId, item, filepath) {
    const buffer = fs.readFileSync(filepath)

    const mimetype =
        item.mimetype ||
        (
            item.type === 'image' ? 'image/jpeg' :
            item.type === 'video' ? 'video/mp4' :
            item.type === 'audio' ? 'audio/mpeg' :
            'application/octet-stream'
        )

    if (item.type === 'image') {
        return conn.sendMessage(groupId, {
            image: buffer,
            mimetype
        })
    }

    if (item.type === 'video') {
        return conn.sendMessage(groupId, {
            video: buffer,
            mimetype
        })
    }

    if (item.type === 'audio') {
        return conn.sendMessage(groupId, {
            audio: buffer,
            mimetype,
            ptt: false
        })
    }

    return conn.sendMessage(groupId, {
        document: buffer,
        mimetype,
        fileName: item.filename || 'archivo'
    })
}

// ============================================================
// 📡 COMANDO PRINCIPAL
// ============================================================

const handler = async (m, { conn, args, text }) => {
    try {
        // --------------------------------------------------------
        // 👑 SOLO OWNERS
        // --------------------------------------------------------

        if (!isOwner(m, conn)) return

        let list = syncMediaDB()

        if (!list) {
            return conn.reply(
                m.chat,
                '❌ No pude leer la base de datos de medios.',
                m
            )
        }

        let commandArgs = Array.isArray(args) ? [...args] : []

        if (!commandArgs.length && text) {
            commandArgs = String(text).trim().split(/\s+/)
        }

        const cmd = String(commandArgs[0] || '')
            .toLowerCase()
            .trim()

        // --------------------------------------------------------
        // 📋 LISTAR MEDIOS
        // --------------------------------------------------------

        if (
            !cmd ||
            cmd === 'list' ||
            cmd === 'lista' ||
            cmd === 'medias'
        ) {
            if (!list.length) {
                return conn.reply(
                    m.chat,
                    '📂 *No hay medios guardados actualmente.*',
                    m
                )
            }

            const max = Math.min(list.length, 800)

            const lines = list.slice(0, max).map(item => (
                `🆔 *ID:* ${item.id}\n` +
                `📄 *Archivo:* ${item.filename}\n` +
                `📦 *Tipo:* ${item.type}\n` +
                `👥 *Grupo:* ${item.groupName || item.groupId || 'Privado'}\n` +
                `📅 *Fecha:* ${item.date || 'Desconocida'}`
            ))

            return conn.reply(
                m.chat,
                `📁 *MEDIOS GUARDADOS*\n\n` +
                `📊 *Total:* ${list.length}\n\n` +
                `━━━━━━━━━━━━━━━━━━\n\n` +
                lines.join('\n\n━━━━━━━━━━━━━━━━━━\n\n'),
                m
            )
        }

        // --------------------------------------------------------
        // 🧹 LIMPIAR TODOS LOS MEDIOS
        // --------------------------------------------------------

        if (
            ['clear', 'clean', 'wipe', 'limpiar'].includes(cmd)
        ) {
            let deletedFiles = 0
            let failedFiles = 0

            for (const item of list) {
                const filepath = getFilePath(item)

                if (!filepath) continue

                try {
                    fs.unlinkSync(filepath)
                    deletedFiles++
                } catch (error) {
                    failedFiles++
                    console.error('[MEDIA] Error eliminando:', error)
                }
            }

            if (!saveMediaDB([])) {
                return conn.reply(
                    m.chat,
                    '❌ No pude actualizar la base de datos.',
                    m
                )
            }

            if (global.db?.data) {
                global.db.data.mediaList = []
            }

            return conn.reply(
                m.chat,
                `🧹 *LIMPIEZA DE MEDIOS*\n\n` +
                `🗑️ Archivos eliminados: *${deletedFiles}*\n` +
                `❌ Errores: *${failedFiles}*\n` +
                `📂 Registros eliminados: *${list.length}*`,
                m
            )
        }

        // --------------------------------------------------------
        // 🔄 SINCRONIZAR BASE DE DATOS
        // --------------------------------------------------------

        if (
            ['sync', 'sincronizar', 'repair', 'fix'].includes(cmd)
        ) {
            const before = loadMediaDB()

            if (!before) {
                return conn.reply(
                    m.chat,
                    '❌ No pude leer la base de datos.',
                    m
                )
            }

            list = syncMediaDB()

            if (!list) {
                return conn.reply(
                    m.chat,
                    '❌ No pude sincronizar la base de datos.',
                    m
                )
            }

            return conn.reply(
                m.chat,
                `🔄 *MEDIA SINCRONIZADO*\n\n` +
                `📂 Registros anteriores: *${before.length}*\n` +
                `📁 Registros actuales: *${list.length}*`,
                m
            )
        }

        // --------------------------------------------------------
        // 🗑️ BORRAR MEDIOS POR ID
        // Ejemplo: .media del 2
        // --------------------------------------------------------

        if (
            ['del', 'delete', 'rm', 'borrar', 'eliminar'].includes(cmd)
        ) {
            const ids = commandArgs
                .slice(1)
                .map(value => Number.parseInt(value, 10))
                .filter(Number.isInteger)

            if (!ids.length) {
                return conn.reply(
                    m.chat,
                    '❌ Indicá los ID que querés borrar. Ejemplo: *.media del 2*',
                    m
                )
            }

            let deleted = 0
            const notFound = []

            for (const id of [...new Set(ids)].sort((a, b) => b - a)) {
                const index = list.findIndex(
                    item => Number(item.id) === id
                )

                if (index === -1) {
                    notFound.push(id)
                    continue
                }

                const filepath = getFilePath(list[index])

                if (filepath) {
                    try {
                        fs.unlinkSync(filepath)
                    } catch (error) {
                        console.error('[MEDIA] Error borrando archivo:', error)
                        continue
                    }
                }

                list.splice(index, 1)
                deleted++
            }

            list = list.map((item, index) => ({
                ...item,
                id: index + 1
            }))

            if (!saveMediaDB(list)) {
                return conn.reply(
                    m.chat,
                    '❌ No pude guardar los cambios de la base de datos.',
                    m
                )
            }

            if (global.db?.data) {
                global.db.data.mediaList = list
            }

            let response = `🗑️ *MEDIOS ELIMINADOS*\n\n✅ Eliminados: *${deleted}*`

            if (notFound.length) {
                response += `\n❌ No encontrados: *${notFound.join(', ')}*`
            }

            return conn.reply(m.chat, response, m)
        }

        // --------------------------------------------------------
        // 📤 RECUPERAR MEDIO POR ID
        //
        // .media 1
        // .media 100
        //
        // 📌 ENVÍA AL GRUPO DONDE SE EJECUTA EL COMANDO
        // 📌 Si se usa en privado, envía al chat privado
        // 📌 No responde con confirmación adicional
        // --------------------------------------------------------

        if (/^\d+$/.test(cmd)) {
            const id = Number.parseInt(cmd, 10)

            const item = list.find(
                entry => Number(entry.id) === id
            )

            if (!item) {
                return conn.reply(
                    m.chat,
                    `❌ No existe ningún medio con ID *${id}*.`,
                    m
                )
            }

            const filepath = getFilePath(item)

            if (!filepath) {
                list = list.filter(
                    entry => Number(entry.id) !== id
                )

                list = list.map((entry, index) => ({
                    ...entry,
                    id: index + 1
                }))

                if (saveMediaDB(list) && global.db?.data) {
                    global.db.data.mediaList = list
                }

                return conn.reply(
                    m.chat,
                    `❌ El archivo del ID *${id}* ya no existe.`,
                    m
                )
            }

            // Enviar al mismo chat donde se ejecutó .media.
            // En un grupo: al grupo actual.
            // En privado: al chat privado actual.
            try {
                await sendMediaToGroup(
                    conn,
                    m.chat,
                    item,
                    filepath
                )
            } catch (error) {
                console.error(
                    `[MEDIA] Falló el envío del ID ${id} al chat ${m.chat}:`,
                    error
                )
            }

            // Sin confirmación adicional.
            return
        }

        // --------------------------------------------------------
        // ❓ COMANDO NO RECONOCIDO
        // --------------------------------------------------------

        return conn.reply(
            m.chat,
            '❌ Comando no reconocido. Usá *.media* para listar los medios.',
            m
        )
    } catch (error) {
        console.error('[MEDIA] Error en el comando:', error)
        return
    }
}

// ============================================================
// 📡 GUARDADO AUTOMÁTICO DE MEDIOS ENTRANTES
// ============================================================

handler.all = async function (m) {
    try {
        if (!m?.message) return

        await saveIncomingMedia(m, this)
    } catch (error) {
        console.error('[MEDIA] Error en handler.all:', error)
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.command = ['media', 'medias']
handler.owner = true

export default handler
