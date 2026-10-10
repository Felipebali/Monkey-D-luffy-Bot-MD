// 📂 plugins/media-admin.js
// 🛡️ FELIXCAT-BOT — SISTEMA COMPLETO DE MEDIOS
// 💾 Guardado automático
// 📋 Listado con IDs numéricos
// 📤 Recuperación en DOS GRUPOS
// 🗑️ Eliminación de medios
// 🧹 Limpieza segura
// 🔄 Sincronización de la base de datos
// 👑 Exclusivo para OWNER
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
// 📌 GRUPOS DE RECUPERACIÓN
// ============================================================

const MEDIA_GROUPS = [
    '120363410955044864@g.us',
    '120363430366807750@g.us'
]

// ============================================================
// 📂 CREAR CARPETAS
// ============================================================

if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true })
}

if (!fs.existsSync(MEDIA_FOLDER)) {
    fs.mkdirSync(MEDIA_FOLDER, { recursive: true })
}

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
        .map(owner => {
            const number = String(owner).replace(/[^0-9]/g, '')
            return number ? `${number}@s.whatsapp.net` : null
        })
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
        return []
    }
}

// ============================================================
// 💾 GUARDAR BASE DE DATOS
// ============================================================

function saveMediaDB(list) {
    try {
        fs.writeFileSync(
            MEDIA_DB_FILE,
            JSON.stringify(list, null, 2),
            'utf8'
        )

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

    // Probar la ruta registrada.
    if (item.path) {
        const registeredPath = path.resolve(item.path)

        if (
            fs.existsSync(registeredPath) &&
            fs.statSync(registeredPath).isFile()
        ) {
            return registeredPath
        }
    }

    // Probar la carpeta ./media usando el nombre.
    if (item.filename) {
        const fallback = path.resolve(
            MEDIA_FOLDER,
            path.basename(item.filename)
        )

        if (
            fs.existsSync(fallback) &&
            fs.statSync(fallback).isFile()
        ) {
            return fallback
        }
    }

    return null
}

// ============================================================
// 🔒 COMPROBAR QUE EL ARCHIVO ESTÁ DENTRO DE ./MEDIA
// ============================================================

function isInsideMediaFolder(filepath) {
    if (!filepath) return false

    const folder = path.resolve(MEDIA_FOLDER)
    const file = path.resolve(filepath)
    const relative = path.relative(folder, file)

    return (
        relative !== '' &&
        relative !== '..' &&
        !relative.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(relative)
    )
}

// ============================================================
// 🔄 SINCRONIZAR BASE DE DATOS
// ============================================================

function syncMediaDB() {
    try {
        let list = loadMediaDB()

        list = list.filter(item => {
            const filepath = getFilePath(item)
            return Boolean(filepath)
        })

        // IDs sencillos: 1, 2, 3...
        list = list.map((item, index) => ({
            ...item,
            id: index + 1
        }))

        saveMediaDB(list)

        if (!global.db) global.db = {}
        if (!global.db.data) global.db.data = {}

        global.db.data.mediaList = list

        return list
    } catch (error) {
        console.error('[MEDIA] Error sincronizando:', error)
        return []
    }
}

// ============================================================
// 🔢 OBTENER ARGUMENTOS
// ============================================================

function getArguments(m, args, text) {
    // La mayoría de los handlers entrega args sin el comando.
    if (Array.isArray(args) && args.length) {
        return args.map(value => String(value))
    }

    // Algunas versiones entregan el texto restante en text.
    if (typeof text === 'string' && text.trim()) {
        return text.trim().split(/\s+/)
    }

    // Último recurso: leer el mensaje original.
    const messageText = String(
        m?.text ||
        m?.body ||
        m?.message?.conversation ||
        m?.message?.extendedTextMessage?.text ||
        ''
    ).trim()

    if (!messageText) return []

    return messageText
        .replace(/^[.!#/]\s*/, '')
        .replace(/^(media|medias)\b/i, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
}

// ============================================================
// 💾 GUARDAR MEDIOS AUTOMÁTICAMENTE
// ============================================================

async function saveIncomingMedia(m, conn) {
    try {
        if (!m?.message) return

        const mtype = m.mtype
        let type = null
        let mimetype = null
        let originalName = ''

        if (mtype === 'imageMessage') {
            type = 'image'
            mimetype = m.msg?.mimetype || 'image/jpeg'
        } else if (mtype === 'videoMessage') {
            type = 'video'
            mimetype = m.msg?.mimetype || 'video/mp4'
        } else if (mtype === 'audioMessage') {
            type = 'audio'
            mimetype = m.msg?.mimetype || 'audio/mpeg'
        } else if (mtype === 'documentMessage') {
            type = 'document'
            mimetype = m.msg?.mimetype || 'application/octet-stream'

            originalName =
                m.msg?.fileName ||
                m.message?.documentMessage?.fileName ||
                'archivo'
        } else {
            return
        }

        // Descargar el medio recibido.
        const buffer = await downloadMediaMessage(m, 'buffer')

        if (!buffer || !buffer.length) {
            console.warn('[MEDIA] Descarga vacía; no se guardó el archivo.')
            return
        }

        // Generar un nombre único.
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
            originalName = String(originalName)
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
                .replace(/\s+/g, '_')

            extension = `_${originalName}`
        }

        const filename = uniqueName + extension
        const filepath = path.resolve(MEDIA_FOLDER, filename)

        // Guardar archivo.
        fs.writeFileSync(filepath, buffer)

        // Obtener información del grupo.
        let groupName = null

        if (m.isGroup && conn?.groupMetadata) {
            try {
                const metadata = await conn.groupMetadata(m.chat)
                groupName = metadata?.subject || null
            } catch (error) {
                console.error('[MEDIA] No se pudo obtener el grupo:', error)
            }
        }

        // Cargar registros existentes.
        const list = loadMediaDB()

        // Calcular el siguiente ID.
        const nextId = list.reduce((max, item) => {
            const id = Number(item.id)
            return Number.isFinite(id) ? Math.max(max, id) : max
        }, 0) + 1

        const entry = {
            id: nextId,
            filename,
            path: filepath,
            type,
            from: m.sender || null,
            groupId: m.isGroup ? m.chat : null,
            groupName,
            mimetype,
            date: new Date().toLocaleString()
        }

        list.push(entry)

        if (!saveMediaDB(list)) {
            console.error('[MEDIA] No se pudo registrar el medio.')
            return
        }

        if (!global.db) global.db = {}
        if (!global.db.data) global.db.data = {}

        global.db.data.mediaList = list

        console.log(
            `✅ [MEDIA] Guardado ID ${entry.id}: ${filepath}`
        )
    } catch (error) {
        console.error('❌ [MEDIA] Error guardando medio:', error)
    }
}

// ============================================================
// 📤 ENVIAR ARCHIVO A UN GRUPO
// ============================================================

async function sendMediaToGroup(conn, destination, item, buffer, caption) {
    const mimetype = item.mimetype || 'application/octet-stream'
    const filename = item.filename || 'archivo'

    if (item.type === 'image') {
        return conn.sendMessage(destination, {
            image: buffer,
            caption,
            mimetype: item.mimetype || 'image/jpeg'
        })
    }

    if (item.type === 'video') {
        return conn.sendMessage(destination, {
            video: buffer,
            caption,
            fileName: filename,
            mimetype: item.mimetype || 'video/mp4'
        })
    }

    if (item.type === 'audio') {
        const result = await conn.sendMessage(destination, {
            audio: buffer,
            ptt: false,
            mimetype: item.mimetype || 'audio/mpeg',
            fileName: filename
        })

        await conn.sendMessage(destination, {
            text: caption
        })

        return result
    }

    if (item.type === 'document') {
        return conn.sendMessage(destination, {
            document: buffer,
            fileName: filename,
            mimetype,
            caption
        })
    }

    throw new Error(`Tipo de medio desconocido: ${item.type}`)
}

// ============================================================
// 📡 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn, args, text }) => {
    try {
        // --------------------------------------------------------
        // 👑 VERIFICAR OWNER
        // --------------------------------------------------------

        const sender = normalizeJid(
            conn?.decodeJid
                ? conn.decodeJid(m.sender)
                : m.sender
        )

        const owners = getOwners().map(normalizeJid)

        if (!owners.includes(sender)) return

        // --------------------------------------------------------
        // 🔢 LEER COMANDO
        // --------------------------------------------------------

        const commandArgs = getArguments(m, args, text)

        const cmd = String(commandArgs[0] || '')
            .toLowerCase()
            .trim()

        const values = commandArgs.slice(1)

        let list = syncMediaDB()

        console.log('[MEDIA] Comando:', cmd, '| Argumentos:', commandArgs)

        // ========================================================
        // 📋 LISTAR MEDIOS
        // ========================================================

        if (
            !cmd ||
            ['list', 'lista', 'listar', 'medias'].includes(cmd)
        ) {
            if (!list.length) {
                return conn.reply(
                    m.chat,
                    '📂 *No hay medios guardados actualmente.*',
                    m
                )
            }

            const max = Math.min(list.length, 800)

            const lines = list.slice(0, max).map(item =>
                `🆔 *ID:* ${item.id}\n` +
                `📄 *Archivo:* ${item.filename || 'Sin nombre'}\n` +
                `📦 *Tipo:* ${item.type || 'Desconocido'}\n` +
                `👤 *Remitente:* ${item.from || 'Desconocido'}\n` +
                `👥 *Grupo:* ${item.groupName || item.groupId || 'Privado'}\n` +
                `📅 *Fecha:* ${item.date || 'Desconocida'}`
            )

            return conn.reply(
                m.chat,
`📁 *MEDIOS GUARDADOS*

📊 *Total:* ${list.length}
📋 *Mostrando:* ${max}

━━━━━━━━━━━━━━━━━━

${lines.join('\n\n━━━━━━━━━━━━━━━━━━\n\n')}

━━━━━━━━━━━━━━━━━━
📤 Recuperar: *.media ID*
📌 Ejemplo: *.media 1*`,
                m
            )
        }

        // ========================================================
        // 🧹 LIMPIAR MEDIOS REGISTRADOS
        // ========================================================

        if (
            ['clear', 'clean', 'wipe', 'limpiar'].includes(cmd)
        ) {
            let deletedFiles = 0
            let failedFiles = 0

            for (const item of list) {
                const filepath = getFilePath(item)

                if (!filepath || !isInsideMediaFolder(filepath)) {
                    if (filepath) failedFiles++
                    continue
                }

                try {
                    fs.unlinkSync(filepath)
                    deletedFiles++
                } catch (error) {
                    failedFiles++
                    console.error('[MEDIA] Error eliminando:', filepath, error)
                }
            }

            saveMediaDB([])

            if (global.db?.data) {
                global.db.data.mediaList = []
            }

            return conn.reply(
                m.chat,
`🧹 *LIMPIEZA COMPLETADA*

━━━━━━━━━━━━━━━━━━

🗑️ Archivos eliminados: *${deletedFiles}*
❌ Errores: *${failedFiles}*
📂 Registros eliminados: *${list.length}*

━━━━━━━━━━━━━━━━━━

🔒 Solo se intentaron borrar los archivos registrados por este plugin.
✅ media.json quedó vacío.`,
                m
            )
        }

        // ========================================================
        // 🔄 SINCRONIZAR
        // ========================================================

        if (
            ['sync', 'sincronizar', 'repair', 'fix'].includes(cmd)
        ) {
            const before = loadMediaDB().length
            const synced = syncMediaDB()

            return conn.reply(
                m.chat,
`🔄 *SINCRONIZACIÓN COMPLETADA*

━━━━━━━━━━━━━━━━━━

📂 Registros anteriores: *${before}*
🧹 Registros sin archivo: *${Math.max(0, before - synced.length)}*
📁 Registros actuales: *${synced.length}*`,
                m
            )
        }

        // ========================================================
        // 🗑️ ELIMINAR UNO O VARIOS MEDIOS
        // ========================================================

        if (
            ['del', 'delete', 'rm', 'borrar', 'eliminar'].includes(cmd)
        ) {
            const ids = values
                .map(value => Number.parseInt(value, 10))
                .filter(id => Number.isInteger(id) && id > 0)

            if (!ids.length) {
                return conn.reply(
                    m.chat,
`❌ *Debes indicar un ID.*

📌 Ejemplos:
• *.media del 1*
• *.media del 2 4 6*`,
                    m
                )
            }

            let deleted = 0
            let failed = 0
            const notFound = []

            for (const id of [...new Set(ids)]) {
                list = loadMediaDB()

                const index = list.findIndex(
                    item => Number(item.id) === id
                )

                if (index === -1) {
                    notFound.push(id)
                    continue
                }

                const item = list[index]
                const filepath = getFilePath(item)

                if (filepath && isInsideMediaFolder(filepath)) {
                    try {
                        fs.unlinkSync(filepath)
                    } catch (error) {
                        failed++
                        console.error('[MEDIA] Error borrando:', error)
                        continue
                    }
                }

                list.splice(index, 1)

                if (!saveMediaDB(list)) {
                    failed++
                    continue
                }

                deleted++
            }

            list = loadMediaDB().map((item, index) => ({
                ...item,
                id: index + 1
            }))

            saveMediaDB(list)

            if (global.db?.data) {
                global.db.data.mediaList = list
            }

            let response =
`🗑️ *ELIMINACIÓN COMPLETADA*

━━━━━━━━━━━━━━━━━━

✅ Eliminados: *${deleted}*`

            if (notFound.length) {
                response += `\n❌ No encontrados: *${notFound.join(', ')}*`
            }

            if (failed) {
                response += `\n⚠️ Errores: *${failed}*`
            }

            return conn.reply(m.chat, response, m)
        }

        // ========================================================
        // 📤 RECUPERAR MEDIO POR ID
        // .media 1
        // .medias 1
        // ========================================================

        if (/^\d+$/.test(cmd)) {
            const id = Number.parseInt(cmd, 10)

            // Leer directamente la base de datos.
            const currentList = loadMediaDB()

            const item = currentList.find(
                entry => Number(entry.id) === id
            )

            if (!item) {
                return conn.reply(
                    m.chat,
`❌ *NO SE ENCONTRÓ EL MEDIO*

🆔 ID solicitado: *${id}*

Usá *.media* para consultar los IDs disponibles.`,
                    m
                )
            }

            // Buscar archivo físico.
            const filepath = getFilePath(item)

            if (!filepath) {
                console.error(
                    '[MEDIA] No se encuentra el archivo físico:',
                    item
                )

                return conn.reply(
                    m.chat,
`❌ *NO SE ENCUENTRA EL ARCHIVO*

🆔 ID: *${id}*
📄 Archivo: *${item.filename || 'Sin nombre'}*
📁 Carpeta esperada: *${path.resolve(MEDIA_FOLDER)}*

El registro existe, pero no se encontró el archivo en el almacenamiento.`,
                    m
                )
            }

            // Leer el archivo.
            let buffer

            try {
                buffer = fs.readFileSync(filepath)
            } catch (error) {
                console.error('[MEDIA] Error leyendo archivo:', error)

                return conn.reply(
                    m.chat,
                    '❌ No se pudo leer el archivo guardado. Revisá los permisos del archivo.',
                    m
                )
            }

            if (!buffer || !buffer.length) {
                return conn.reply(
                    m.chat,
                    '❌ El archivo está vacío. No se puede recuperar.',
                    m
                )
            }

            const caption =
`📁 *MEDIO RECUPERADO*

━━━━━━━━━━━━━━━━━━

🆔 *ID:* ${item.id}
📄 *Archivo:* ${item.filename || 'Sin nombre'}
📦 *Tipo:* ${item.type || 'Desconocido'}
👤 *Remitente:* ${item.from || 'Desconocido'}
👥 *Grupo:* ${item.groupName || item.groupId || 'Privado'}
📅 *Fecha:* ${item.date || 'Desconocida'}

━━━━━━━━━━━━━━━━━━
🐾 *FelixCat-Bot — Administrador de medios*`

            // Comprobar que el bot tiene método de envío.
            if (typeof conn.sendMessage !== 'function') {
                console.error('[MEDIA] conn.sendMessage no está disponible.')

                return conn.reply(
                    m.chat,
                    '❌ La conexión del bot no permite enviar mensajes en este momento.',
                    m
                )
            }

            // Enviar a los dos grupos.
            let enviados = 0
            const errores = []

            for (const destination of MEDIA_GROUPS) {
                try {
                    console.log(
                        `[MEDIA] Enviando ID ${id} a ${destination}...`
                    )

                    // No citar el mensaje original: puede pertenecer
                    // a un chat distinto del grupo de destino.
                    await sendMediaToGroup(
                        conn,
                        destination,
                        item,
                        buffer,
                        caption
                    )

                    enviados++

                    console.log(
                        `✅ [MEDIA] ID ${id} enviado a ${destination}`
                    )
                } catch (error) {
                    errores.push(destination)

                    console.error(
                        `❌ [MEDIA] Falló el envío a ${destination}:`,
                        error
                    )
                }
            }

            if (enviados === MEDIA_GROUPS.length) {
                return conn.reply(
                    m.chat,
`✅ *MEDIO RECUPERADO CORRECTAMENTE*

━━━━━━━━━━━━━━━━━━

🆔 ID: *${id}*
📄 Archivo: *${item.filename || 'Sin nombre'}*
📦 Tipo: *${item.type}*

📤 Enviado a los *${enviados} grupos*.

━━━━━━━━━━━━━━━━━━`,
                    m
                )
            }

            if (enviados > 0) {
                return conn.reply(
                    m.chat,
`⚠️ *RECUPERACIÓN PARCIAL*

🆔 ID: *${id}*
✅ Envíos exitosos: *${enviados}/${MEDIA_GROUPS.length}*
❌ Fallaron: *${errores.length} grupo(s)*

📌 Revisá la consola para ver el error del grupo que falló.`,
                    m
                )
            }

            return conn.reply(
                m.chat,
`❌ *NO SE PUDO ENVIAR EL ARCHIVO*

🆔 ID: *${id}*
📄 Archivo: *${item.filename || 'Sin nombre'}*

El archivo existe en el almacenamiento, pero WhatsApp rechazó los envíos.

Revisá la consola del bot: ahora muestra el error específico de cada grupo.

📌 Verificá que el bot esté en ambos grupos y que tenga conexión.`,
                m
            )
        }

        // ========================================================
        // ❓ AYUDA
        // ========================================================

        return conn.reply(
            m.chat,
`📂 *ADMINISTRADOR DE MEDIOS*

━━━━━━━━━━━━━━━━━━

📋 *LISTAR*
• *.media*
• *.media list*

📤 *RECUPERAR*
• *.media 1*
• *.media 2*
• *.medias 3*

🗑️ *ELIMINAR*
• *.media del 1*
• *.media del 2 4 6*

🧹 *LIMPIAR*
• *.media clear*

🔄 *SINCRONIZAR*
• *.media sync*

━━━━━━━━━━━━━━━━━━

📁 Almacenamiento: *./media*
📂 Base de datos: *./database/media.json*

📤 *GRUPOS DE RECUPERACIÓN*

1. ${MEDIA_GROUPS[0]}
2. ${MEDIA_GROUPS[1]}

━━━━━━━━━━━━━━━━━━
👑 Disponible únicamente para el OWNER.`,
            m
        )

    } catch (error) {
        console.error('❌ [MEDIA-ADMIN] ERROR GENERAL:', error)

        try {
            return conn.reply(
                m.chat,
                `❌ Error en el administrador de medios.\n\n📌 ${error?.message || 'Error desconocido'}\n\nRevisá la consola del bot.`,
                m
            )
        } catch {}
    }
}

// ============================================================
// 📡 GUARDADO AUTOMÁTICO
// ============================================================

handler.all = async function (m) {
    try {
        if (!m?.message) return

        const mtype = m.mtype

        if (
            ![
                'imageMessage',
                'videoMessage',
                'audioMessage',
                'documentMessage'
            ].includes(mtype)
        ) {
            return
        }

        const conn = this?.user ? this : null

        await saveIncomingMedia(m, conn)
    } catch (error) {
        console.error('❌ [MEDIA] Error en guardado automático:', error)
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.help = [
    'media',
    'medias'
]

handler.tags = [
    'owner'
]

handler.command = [
    'media',
    'medias'
]

handler.owner = true

// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
