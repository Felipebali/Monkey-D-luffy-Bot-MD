/**
 * 📂 plugins/media-admin.js
 * 🤖 WHATSAPP-BOT — SISTEMA COMPLETO DE MEDIOS
 *
 * 💾 Guardado automático
 * 👑 Exclusivo para owners
 * 📂 Imágenes, videos, audios y documentos
 * 🎙️ Recuperación de notas de voz
 * 🗑️ Eliminación individual y limpieza completa
 * 🔄 Sincronización de base de datos
 *
 * Baileys ES Modules
 */

import fs from 'fs'
import path from 'path'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const MEDIA_DB_FILE = './database/media.json'
const MEDIA_FOLDER = './media'

fs.mkdirSync('./database', { recursive: true })
fs.mkdirSync(MEDIA_FOLDER, { recursive: true })

if (!fs.existsSync(MEDIA_DB_FILE)) {
    fs.writeFileSync(MEDIA_DB_FILE, '[]', 'utf8')
}

// ============================================================
// 👑 OWNERS
// ============================================================

function getOwners() {
    const owners = Array.isArray(global.owner)
        ? global.owner
        : global.owner
            ? [global.owner]
            : []

    return owners
        .map(function (owner) {
            return Array.isArray(owner) ? owner[0] : owner
        })
        .filter(Boolean)
        .map(function (owner) {
            return String(owner).trim()
        })
        .filter(Boolean)
}

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
        conn && conn.decodeJid
            ? conn.decodeJid(m.sender)
            : m.sender
    )

    const senderNumber = getNumber(sender)

    return getOwners().some(function (ownerValue) {
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
// 📂 UTILIDADES DE MENSAJES
// ============================================================

function getMessageContent(m) {
    return (
        (m.message && m.message.audioMessage) ||
        (m.message && m.message.imageMessage) ||
        (m.message && m.message.videoMessage) ||
        (m.message && m.message.documentMessage) ||
        m.msg ||
        {}
    )
}

function getMimeType(m, type) {
    const content = getMessageContent(m)

    return (
        content.mimetype ||
        m.mimetype ||
        (
            type === 'image' ? 'image/jpeg' :
            type === 'video' ? 'video/mp4' :
            type === 'audio' ? 'audio/ogg; codecs=opus' :
            'application/octet-stream'
        )
    )
}

function getAudioExtension(mimetype) {
    const mime = String(mimetype || '').toLowerCase()

    if (mime.indexOf('ogg') !== -1 || mime.indexOf('opus') !== -1) return '.ogg'
    if (mime.indexOf('mpeg') !== -1 || mime.indexOf('mp3') !== -1) return '.mp3'
    if (mime.indexOf('mp4') !== -1 || mime.indexOf('m4a') !== -1) return '.m4a'
    if (mime.indexOf('aac') !== -1) return '.aac'
    if (mime.indexOf('wav') !== -1) return '.wav'
    if (mime.indexOf('flac') !== -1) return '.flac'
    if (mime.indexOf('amr') !== -1) return '.amr'
    if (mime.indexOf('3gpp') !== -1) return '.3gp'

    return '.bin'
}

function isVoiceNote(m) {
    const content = getMessageContent(m)

    return (
        content.ptt === true ||
        (m.msg && m.msg.ptt === true) ||
        m.ptt === true
    )
}

// ============================================================
// 📂 BASE DE DATOS
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

function saveMediaDB(list) {
    try {
        const tempFile = MEDIA_DB_FILE + '.tmp'

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
// 📍 RUTA SEGURA DE ARCHIVOS
// ============================================================

function getFilePath(item) {
    if (!item) return null

    const root = path.resolve(MEDIA_FOLDER)

    if (item.path) {
        const registeredPath = path.resolve(item.path)
        const relative = path.relative(root, registeredPath)

        if (
            relative !== '' &&
            relative.indexOf('..') !== 0 &&
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
// 🔄 SINCRONIZAR BASE DE DATOS
// ============================================================

function syncMediaDB() {
    try {
        const list = loadMediaDB()

        if (!list) return null

        const valid = list.filter(function (item) {
            return Boolean(getFilePath(item))
        })

        const normalized = valid.map(function (item, index) {
            return Object.assign({}, item, {
                id: index + 1
            })
        })

        let changed = normalized.length !== list.length

        if (!changed) {
            normalized.forEach(function (item, index) {
                if (item.id !== list[index].id) {
                    changed = true
                }
            })
        }

        if (changed && !saveMediaDB(normalized)) {
            return null
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

syncMediaDB()

// ============================================================
// 💾 GUARDAR MEDIOS ENTRANTES AUTOMÁTICAMENTE
// ============================================================

async function saveIncomingMedia(m, conn) {
    try {
        if (!m || !m.message) return

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
            Date.now() + '_' +
            Math.floor(Math.random() * 999999)

        const mimetype = getMimeType(m, type)

        let extension = ''

        if (type === 'image') {
            extension = '.jpg'

        } else if (type === 'video') {
            extension = '.mp4'

        } else if (type === 'audio') {
            extension = getAudioExtension(mimetype)

        } else {
            const content = getMessageContent(m)

            const originalName =
                content.fileName ||
                (m.msg && m.msg.fileName) ||
                'archivo'

            const safeName = String(originalName)
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
                .replace(/\s+/g, '_')

            extension = '_' + safeName
        }

        const filename = uniqueName + extension
        const filepath = path.join(MEDIA_FOLDER, filename)

        fs.writeFileSync(filepath, buffer)

        let groupName = ''

        if (m.isGroup) {
            try {
                const metadata = await conn.groupMetadata(m.chat)
                groupName = metadata && metadata.subject
                    ? metadata.subject
                    : ''
            } catch (error) {
                groupName = ''
            }
        }

        const entry = {
            id: list.length + 1,
            filename: filename,
            path: filepath,
            type: type,
            from: m.sender || null,
            groupId: m.isGroup ? m.chat : null,
            groupName: m.isGroup ? groupName : null,
            mimetype: mimetype,
            ptt: type === 'audio' && isVoiceNote(m),
            date: new Date().toLocaleString('es-UY', {
                timeZone: 'America/Montevideo'
            })
        }

        list.push(entry)

        if (!saveMediaDB(list)) {
            try {
                fs.unlinkSync(filepath)
            } catch (error) {}

            return
        }

        if (!global.db) global.db = {}
        if (!global.db.data) global.db.data = {}

        global.db.data.mediaList = list

        console.log(
            '[MEDIA] Archivo guardado con ID ' +
            entry.id + ': ' + filename
        )

    } catch (error) {
        console.error('[MEDIA] Error guardando archivo:', error)
    }
}

// ============================================================
// 📤 ENVIAR MEDIO RECUPERADO
// ============================================================

async function sendMediaToGroup(conn, chatId, item, filepath) {
    const buffer = fs.readFileSync(filepath)

    const mimetype =
        item.mimetype ||
        (
            item.type === 'image' ? 'image/jpeg' :
            item.type === 'video' ? 'video/mp4' :
            item.type === 'audio' ? 'audio/ogg; codecs=opus' :
            'application/octet-stream'
        )

    if (item.type === 'image') {
        return conn.sendMessage(chatId, {
            image: buffer,
            mimetype: mimetype,
            caption:
                '╭━━〔 ✅ *MEDIO RECUPERADO* 〕━━╮\n\n' +
                '📂 *Media N.º ' + item.id + ' recuperada correctamente.*\n' +
                '📦 *Tipo:* ' + item.type + '\n' +
                '📄 *Archivo:* ' + item.filename + '\n\n' +
                '╰━━━━━━━━━━━━━━━━━━╯'
        })
    }

    if (item.type === 'video') {
        return conn.sendMessage(chatId, {
            video: buffer,
            mimetype: mimetype,
            caption:
                '╭━━〔 ✅ *MEDIO RECUPERADO* 〕━━╮\n\n' +
                '📂 *Media N.º ' + item.id + ' recuperada correctamente.*\n' +
                '📦 *Tipo:* ' + item.type + '\n' +
                '📄 *Archivo:* ' + item.filename + '\n\n' +
                '╰━━━━━━━━━━━━━━━━━━╯'
        })
    }

    // AUDIO: SOLAMENTE ENVÍA EL AUDIO
    if (item.type === 'audio') {
        return conn.sendMessage(chatId, {
            audio: buffer,
            mimetype: mimetype,
            ptt: item.ptt === true
        })
    }

    return conn.sendMessage(chatId, {
        document: buffer,
        mimetype: mimetype,
        fileName: item.filename || 'archivo',
        caption:
            '╭━━〔 ✅ *MEDIO RECUPERADO* 〕━━╮\n\n' +
            '📂 *Media N.º ' + item.id + ' recuperada correctamente.*\n' +
            '📦 *Tipo:* ' + item.type + '\n' +
            '📄 *Archivo:* ' + item.filename + '\n\n' +
            '╰━━━━━━━━━━━━━━━━━━╯'
    })
}

// ============================================================
// 📡 COMANDO PRINCIPAL
// ============================================================

const handler = async function (m, context) {
    try {
        const conn = context.conn
        const args = context.args
        const text = context.text

        if (!isOwner(m, conn)) return

        let list = syncMediaDB()

        if (!list) {
            return conn.reply(
                m.chat,
                '❌ No pude leer la base de datos de medios.',
                m
            )
        }

        let commandArgs = Array.isArray(args) ? args.slice() : []

        if (!commandArgs.length && text) {
            commandArgs = String(text).trim().split(/\s+/)
        }

        const cmd = String(commandArgs[0] || '')
            .toLowerCase()
            .trim()

        // ====================================================
        // 📋 LISTAR MEDIOS
        // ====================================================

        if (
            !cmd ||
            ['list', 'lista', 'medias'].includes(cmd)
        ) {
            if (!list.length) {
                return conn.reply(
                    m.chat,
                    '📂 *No hay medios guardados actualmente.*',
                    m
                )
            }

            const lines = list.slice(0, 800).map(function (item) {
                return (
                    '🆔 *ID:* ' + item.id + '\n' +
                    '📄 *Archivo:* ' + item.filename + '\n' +
                    '📦 *Tipo:* ' + item.type +
                    (
                        item.type === 'audio'
                            ? '\n🎙️ *Formato:* ' +
                                (item.ptt ? 'Nota de voz' : 'Audio')
                            : ''
                    ) +
                    '\n👥 *Grupo:* ' +
                    (item.groupName || item.groupId || 'Privado') +
                    '\n📅 *Fecha:* ' +
                    (item.date || 'Desconocida')
                )
            })

            return conn.reply(
                m.chat,
                '📁 *MEDIOS GUARDADOS*\n\n' +
                '📊 *Total:* ' + list.length + '\n\n' +
                '━━━━━━━━━━━━━━━━━━\n\n' +
                lines.join('\n\n━━━━━━━━━━━━━━━━━━\n\n'),
                m
            )
        }

        // ====================================================
        // 🧹 LIMPIAR TODOS LOS MEDIOS
        // ====================================================

        if (
            ['clear', 'clean', 'wipe', 'limpiar'].includes(cmd)
        ) {
            let failedFiles = 0

            if (!saveMediaDB([])) {
                return conn.reply(
                    m.chat,
                    '❌ No pude actualizar la base de datos.',
                    m
                )
            }

            for (const item of list) {
                const filepath = getFilePath(item)

                if (!filepath) continue

                try {
                    fs.unlinkSync(filepath)
                } catch (error) {
                    failedFiles++
                    console.error('[MEDIA] Error eliminando:', error)
                }
            }

            if (global.db && global.db.data) {
                global.db.data.mediaList = []
            }

            return conn.reply(
                m.chat,
                '🧹 *LIMPIEZA DE MEDIOS*\n\n' +
                '🗑️ Registros eliminados: *' + list.length + '*\n' +
                '❌ Errores al eliminar archivos: *' + failedFiles + '*\n' +
                '📂 Base de datos limpiada correctamente.',
                m
            )
        }

        // ====================================================
        // 🔄 SINCRONIZAR
        // ====================================================

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
                '🔄 *MEDIA SINCRONIZADO*\n\n' +
                '📂 Registros anteriores: *' + before.length + '*\n' +
                '📁 Registros actuales: *' + list.length + '*',
                m
            )
        }

        // ====================================================
        // 🗑️ BORRAR MEDIOS POR ID
        // ====================================================

        if (
            ['del', 'delete', 'rm', 'borrar', 'eliminar'].includes(cmd)
        ) {
            const ids = commandArgs
                .slice(1)
                .map(function (value) {
                    return Number.parseInt(value, 10)
                })
                .filter(function (id) {
                    return Number.isInteger(id) && id > 0
                })

            if (!ids.length) {
                return conn.reply(
                    m.chat,
                    '❌ Indicá los ID que querés borrar.\n\n' +
                    'Ejemplo: *.media del 2*',
                    m
                )
            }

            let deleted = 0
            const notFound = []
            const filesToDelete = []

            const uniqueIds = Array.from(new Set(ids)).sort(function (a, b) {
                return b - a
            })

            for (const id of uniqueIds) {
                const index = list.findIndex(function (item) {
                    return Number(item.id) === id
                })

                if (index === -1) {
                    notFound.push(id)
                    continue
                }

                const filepath = getFilePath(list[index])

                if (filepath) {
                    filesToDelete.push(filepath)
                }

                list.splice(index, 1)
                deleted++
            }

            list = list.map(function (item, index) {
                return Object.assign({}, item, {
                    id: index + 1
                })
            })

            if (!saveMediaDB(list)) {
                return conn.reply(
                    m.chat,
                    '❌ No pude guardar los cambios de la base de datos.',
                    m
                )
            }

            let failed = 0

            for (const filepath of filesToDelete) {
                try {
                    fs.unlinkSync(filepath)
                } catch (error) {
                    failed++
                    console.error('[MEDIA] Error borrando archivo:', error)
                }
            }

            if (global.db && global.db.data) {
                global.db.data.mediaList = list
            }

            let response =
                '🗑️ *MEDIOS ELIMINADOS*\n\n' +
                '✅ Eliminados: *' + deleted + '*'

            if (notFound.length) {
                response += '\n❌ No encontrados: *' + notFound.join(', ') + '*'
            }

            if (failed) {
                response += '\n⚠️ Archivos que no se pudieron eliminar: *' + failed + '*'
            }

            return conn.reply(m.chat, response, m)
        }

        // ====================================================
        // 📤 RECUPERAR MEDIO POR ID
        // ====================================================

        if (/^\d+$/.test(cmd)) {
            const id = Number.parseInt(cmd, 10)

            const item = list.find(function (entry) {
                return Number(entry.id) === id
            })

            if (!item) {
                return conn.reply(
                    m.chat,
                    '❌ No existe ningún medio con ID *' + id + '*.',
                    m
                )
            }

            const filepath = getFilePath(item)

            if (!filepath) {
                list = list.filter(function (entry) {
                    return Number(entry.id) !== id
                })

                list = list.map(function (entry, index) {
                    return Object.assign({}, entry, {
                        id: index + 1
                    })
                })

                if (saveMediaDB(list) && global.db && global.db.data) {
                    global.db.data.mediaList = list
                }

                return conn.reply(
                    m.chat,
                    '❌ El archivo del ID *' + id + '* ya no existe.',
                    m
                )
            }

            try {
                await sendMediaToGroup(
                    conn,
                    m.chat,
                    item,
                    filepath
                )

            } catch (error) {
                console.error(
                    '[MEDIA] Falló el envío del ID ' + id +
                    ' al chat ' + m.chat + ':',
                    error
                )

                return conn.reply(
                    m.chat,
                    '❌ No se pudo recuperar el medio N.º ' + id + '.',
                    m
                )
            }

            return
        }

        // ====================================================
        // ❓ COMANDO DESCONOCIDO
        // ====================================================

        return conn.reply(
            m.chat,
            '❌ Comando no reconocido.\n\n' +
            'Usá *.media* para listar los medios.',
            m
        )

    } catch (error) {
        console.error('[MEDIA] Error en el comando:', error)
    }
}

// ============================================================
// 📡 GUARDADO AUTOMÁTICO DE MEDIOS ENTRANTES
// ============================================================

handler.all = async function (m) {
    try {
        if (!m || !m.message) return

        await saveIncomingMedia(m, this)

    } catch (error) {
        console.error('[MEDIA] Error en handler.all:', error)
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.help = [
    'media',
    'media <id>',
    'media del <id>',
    'media list',
    'media sync',
    'media limpiar'
]

handler.tags = ['owner']

handler.command = ['media', 'medias']

handler.owner = true

export default handler
