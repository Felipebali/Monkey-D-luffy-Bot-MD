// 📂 plugins/media-admin.js
// 🛡️ FELIXCAT BOT — SISTEMA COMPLETO DE MEDIOS
// 💾 Guardado automático + administrador + limpieza automática de DB

import fs from 'fs'
import path from 'path'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

// ============================================================
// 📁 CONFIGURACIÓN
// ============================================================

const MEDIA_DB_FILE = './database/media.json'
const MEDIA_FOLDER = './media'

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
    fs.writeFileSync(MEDIA_DB_FILE, '[]')
}

// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function getOwners() {
    return (global.owner || [])
        .map(o => Array.isArray(o) ? o[0] : o)
        .filter(Boolean)
        .map(v => {
            const number = String(v).replace(/[^0-9]/g, '')
            return number
                ? number + '@s.whatsapp.net'
                : null
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
// 📂 CARGAR MEDIA.JSON
// ============================================================

function loadMediaDB() {

    try {

        if (!fs.existsSync(MEDIA_DB_FILE)) {
            fs.writeFileSync(MEDIA_DB_FILE, '[]')
            return []
        }

        const data = JSON.parse(
            fs.readFileSync(MEDIA_DB_FILE, 'utf8')
        )

        return Array.isArray(data)
            ? data
            : []

    } catch (e) {

        console.error(
            '[MEDIA] Error leyendo media.json:',
            e
        )

        return []
    }
}

// ============================================================
// 💾 GUARDAR MEDIA.JSON
// ============================================================

function saveMediaDB(list) {

    try {

        fs.writeFileSync(
            MEDIA_DB_FILE,
            JSON.stringify(list, null, 2),
            'utf8'
        )

        return true

    } catch (e) {

        console.error(
            '[MEDIA] Error guardando media.json:',
            e
        )

        return false
    }
}

// ============================================================
// 📍 OBTENER RUTA REAL DEL ARCHIVO
// ============================================================

function getFilePath(item) {

    if (!item) return null

    // Si tiene path guardado
    if (item.path) {

        // Si existe exactamente esa ruta
        if (fs.existsSync(item.path)) {
            return item.path
        }
    }

    // Intentar buscarlo por filename
    if (item.filename) {

        const fallback = path.join(
            MEDIA_FOLDER,
            item.filename
        )

        return fallback
    }

    return null
}

// ============================================================
// 🧹 SINCRONIZAR MEDIA.JSON CON ./MEDIA
// ============================================================
//
// Esta función es MUY IMPORTANTE.
//
// Si el archivo físico fue borrado,
// también elimina su registro de media.json.
//
// Así los archivos viejos NO vuelven a aparecer.
// ============================================================

function syncMediaDB() {

    try {

        let list = loadMediaDB()

        if (!Array.isArray(list)) {
            list = []
        }

        const originalLength = list.length

        // --------------------------------------------------------
        // Si la carpeta está vacía, no puede haber registros
        // --------------------------------------------------------

        let filesInFolder = []

        try {

            filesInFolder = fs.readdirSync(
                MEDIA_FOLDER
            )

        } catch {

            filesInFolder = []
        }

        // --------------------------------------------------------
        // Eliminar registros cuyo archivo ya no existe
        // --------------------------------------------------------

        list = list.filter(item => {

            const filepath = getFilePath(item)

            if (!filepath) {
                return false
            }

            return fs.existsSync(filepath)
        })

        // --------------------------------------------------------
        // Reorganizar IDs
        // --------------------------------------------------------

        list = list.map((item, index) => ({
            ...item,
            id: index + 1
        }))

        // --------------------------------------------------------
        // Guardar si hubo cambios
        // --------------------------------------------------------

        if (
            list.length !== originalLength ||
            originalLength === 0
        ) {

            saveMediaDB(list)

        }

        // --------------------------------------------------------
        // Sincronizar DB global
        // --------------------------------------------------------

        if (!global.db) {
            global.db = {}
        }

        if (!global.db.data) {
            global.db.data = {}
        }

        global.db.data.mediaList = list

        return list

    } catch (e) {

        console.error(
            '[MEDIA] Error sincronizando:',
            e
        )

        return []
    }
}

// ============================================================
// 🚀 SINCRONIZACIÓN AL INICIAR EL PLUGIN
// ============================================================
//
// Esto hace que si reiniciás el bot después de borrar archivos,
// media.json se limpie automáticamente.
// ============================================================

syncMediaDB()

// ============================================================
// 💾 GUARDAR MEDIA AUTOMÁTICAMENTE
// ============================================================

async function saveIncomingMedia(m, conn) {

    try {

        if (!m?.message) return

        // --------------------------------------------------------
        // Detectar tipo
        // --------------------------------------------------------

        const mtype = m.mtype

        let type = null

        if (mtype === 'imageMessage') {
            type = 'image'
        }

        else if (mtype === 'videoMessage') {
            type = 'video'
        }

        else if (mtype === 'audioMessage') {
            type = 'audio'
        }

        else if (mtype === 'documentMessage') {
            type = 'document'
        }

        else {
            return
        }

        // --------------------------------------------------------
        // Descargar media
        // --------------------------------------------------------

        const buffer = await downloadMediaMessage(
            m,
            'buffer'
        )

        if (!buffer) return

        // --------------------------------------------------------
        // Sincronizar DB ANTES de agregar nuevo archivo
        // --------------------------------------------------------

        let list = syncMediaDB()

        // --------------------------------------------------------
        // Generar nombre
        // --------------------------------------------------------

        const uniqueName =
            `${Date.now()}_${Math.floor(Math.random() * 999999)}`

        let extension = ''

        if (type === 'image') {
            extension = '.jpg'
        }

        else if (type === 'video') {
            extension = '.mp4'
        }

        else if (type === 'audio') {
            extension = '.mp3'
        }

        else if (type === 'document') {

            let originalName =
                m.message?.documentMessage?.fileName ||
                'file'

            // Limpiar nombre peligroso
            originalName = String(originalName)
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
                .replace(/\s+/g, '_')

            extension = `_${originalName}`
        }

        const finalName =
            uniqueName + extension

        const filepath =
            path.join(
                MEDIA_FOLDER,
                finalName
            )

        // --------------------------------------------------------
        // Guardar archivo
        // --------------------------------------------------------

        fs.writeFileSync(
            filepath,
            buffer
        )

        // --------------------------------------------------------
        // Obtener grupo
        // --------------------------------------------------------

        let chatInfo = null

        if (m.isGroup) {

            try {

                if (conn?.groupMetadata) {

                    chatInfo =
                        await conn.groupMetadata(
                            m.chat
                        )
                }

            } catch {

                chatInfo = null
            }
        }

        // --------------------------------------------------------
        // Crear registro
        // --------------------------------------------------------

        const entry = {

            id: list.length + 1,

            filename: finalName,

            path: filepath,

            type,

            from: m.sender || null,

            groupId:
                m.isGroup
                    ? m.chat
                    : null,

            groupName:
                m.isGroup
                    ? (chatInfo?.subject || '')
                    : null,

            mimetype:
                m.msg?.mimetype ||
                m.message?.documentMessage?.mimetype ||
                null,

            date:
                new Date().toLocaleString()
        }

        // --------------------------------------------------------
        // Agregar
        // --------------------------------------------------------

        list.push(entry)

        // --------------------------------------------------------
        // Guardar DB
        // --------------------------------------------------------

        saveMediaDB(list)

        // También actualizar global.db
        if (!global.db) {
            global.db = {}
        }

        if (!global.db.data) {
            global.db.data = {}
        }

        global.db.data.mediaList = list

        console.log(
            '[MEDIA GUARDADO]:',
            entry
        )

    } catch (e) {

        console.error(
            '❌ ERROR GUARDANDO MEDIA:',
            e
        )
    }
}

// ============================================================
// 📡 HANDLER GLOBAL
// ============================================================
//
// Guarda automáticamente:
// 🖼️ imágenes
// 🎥 videos
// 🎵 audios
// 📄 documentos
// ============================================================

const handler = async (m, { conn, args }) => {

    try {

        // ========================================================
        // 👑 VERIFICAR OWNER
        // ========================================================

        const sender =
            conn?.decodeJid
                ? conn.decodeJid(m.sender)
                : normalizeJid(m.sender)

        const owners =
            getOwners().map(normalizeJid)

        if (!owners.includes(sender)) {

            return
        }

        // ========================================================
        // 🧹 SINCRONIZAR ANTES DE CUALQUIER OPERACIÓN
        // ========================================================

        let list = syncMediaDB()

        // ========================================================
        // ARGUMENTOS
        // ========================================================

        const cmd =
            String(args?.[0] || '')
                .toLowerCase()
                .trim()

        // ========================================================
        // 📋 LISTAR
        //
        // .media
        // .medias
        // .media list
        // .media lista
        // ========================================================

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

            const max =
                Math.min(
                    list.length,
                    250
                )

            const lines =
                list
                    .slice(0, max)
                    .map(item => {

                        return (
                            `🆔 *ID:* ${item.id}\n` +
                            `📄 *Archivo:* ${item.filename}\n` +
                            `📦 *Tipo:* ${item.type}\n` +
                            `👤 *From:* ${item.from || 'Desconocido'}\n` +
                            `👥 *Grupo:* ${item.groupName || item.groupId || 'Privado'}\n` +
                            `📅 *Fecha:* ${item.date || 'Desconocida'}`
                        )
                    })

            const text =
`📁 *MEDIOS GUARDADOS*

📊 *Total:* ${list.length}
📋 *Mostrando:* ${max}

━━━━━━━━━━━━━━━━━━

${lines.join('\n\n━━━━━━━━━━━━━━━━━━\n\n')}`

            return conn.reply(
                m.chat,
                text,
                m
            )
        }

        // ========================================================
        // 🧹 BORRAR TODO
        //
        // .media clear
        // .media clean
        // .media wipe
        // .media limpiar
        // ========================================================

        if (
            cmd === 'clear' ||
            cmd === 'clean' ||
            cmd === 'wipe' ||
            cmd === 'limpiar'
        ) {

            let deletedFiles = 0
            let failedFiles = 0

            // ----------------------------------------------------
            // Borrar archivos registrados
            // ----------------------------------------------------

            for (const item of list) {

                const filepath =
                    getFilePath(item)

                if (
                    filepath &&
                    fs.existsSync(filepath)
                ) {

                    try {

                        fs.unlinkSync(
                            filepath
                        )

                        deletedFiles++

                    } catch (e) {

                        failedFiles++

                        console.error(
                            '[MEDIA] No se pudo borrar:',
                            filepath,
                            e
                        )
                    }
                }
            }

            // ----------------------------------------------------
            // IMPORTANTE:
            // También eliminar cualquier archivo que haya quedado
            // físicamente dentro de ./media
            // ----------------------------------------------------

            try {

                const files =
                    fs.readdirSync(
                        MEDIA_FOLDER
                    )

                for (const file of files) {

                    const filepath =
                        path.join(
                            MEDIA_FOLDER,
                            file
                        )

                    try {

                        if (
                            fs.statSync(filepath).isFile()
                        ) {

                            fs.unlinkSync(
                                filepath
                            )

                            deletedFiles++
                        }

                    } catch (e) {

                        failedFiles++

                        console.error(
                            '[MEDIA] Error limpiando:',
                            filepath,
                            e
                        )
                    }
                }

            } catch (e) {

                console.error(
                    '[MEDIA] Error leyendo carpeta media:',
                    e
                )
            }

            // ----------------------------------------------------
            // Vaciar DB
            // ----------------------------------------------------

            saveMediaDB([])

            if (global.db?.data) {
                global.db.data.mediaList = []
            }

            return conn.reply(
                m.chat,
`🧹 *MEDIOS COMPLETAMENTE LIMPIADOS*

━━━━━━━━━━━━━━━━━━

🗑️ Archivos eliminados: *${deletedFiles}*
❌ Errores al borrar: *${failedFiles}*
📂 Registros eliminados: *${list.length}*

━━━━━━━━━━━━━━━━━━

✅ *La carpeta ./media quedó limpia.*
✅ *media.json quedó vacío.*`,
                m
            )
        }

        // ========================================================
        // 🧹 SINCRONIZAR / LIMPIAR REGISTROS VIEJOS
        //
        // .media sync
        // .media sincronizar
        // ========================================================

        if (
            cmd === 'sync' ||
            cmd === 'sincronizar' ||
            cmd === 'repair' ||
            cmd === 'fix'
        ) {

            const before =
                list.length

            const synced =
                syncMediaDB()

            const removed =
                before - synced.length

            return conn.reply(
                m.chat,
`🔄 *MEDIA SINCRONIZADO*

━━━━━━━━━━━━━━━━━━

📂 Registros encontrados: *${before}*
🧹 Registros eliminados: *${removed}*
📁 Registros actuales: *${synced.length}*

━━━━━━━━━━━━━━━━━━

✅ Los registros que ya no tienen archivo físico fueron eliminados.`,
                m
            )
        }

        // ========================================================
        // 🗑️ BORRAR UNO O VARIOS
        //
        // .media del 5
        // .media del 3 7 9
        // ========================================================

        if (
            cmd === 'del' ||
            cmd === 'delete' ||
            cmd === 'rm' ||
            cmd === 'borrar' ||
            cmd === 'eliminar'
        ) {

            const ids =
                args
                    .slice(1)
                    .map(v => parseInt(v))
                    .filter(v => !isNaN(v))

            if (!ids.length) {

                return conn.reply(
                    m.chat,
`❌ *Debes indicar al menos un ID.*

Ejemplos:

*.media del 5*

*.media del 3 7 9*

*.media borrar 10*`,
                    m
                )
            }

            let deleted = 0
            let notFound = []

            // Ordenar de mayor a menor
            // para evitar problemas al eliminar
            const uniqueIds =
                [...new Set(ids)]
                    .sort((a, b) => b - a)

            for (const id of uniqueIds) {

                const index =
                    list.findIndex(
                        item =>
                            Number(item.id) === id
                    )

                if (index === -1) {

                    notFound.push(id)

                    continue
                }

                const item =
                    list[index]

                const filepath =
                    getFilePath(item)

                // ------------------------------------------------
                // Borrar archivo físico
                // ------------------------------------------------

                if (
                    filepath &&
                    fs.existsSync(filepath)
                ) {

                    try {

                        fs.unlinkSync(
                            filepath
                        )

                    } catch (e) {

                        console.error(
                            '[MEDIA] Error borrando archivo:',
                            e
                        )
                    }
                }

                // ------------------------------------------------
                // Eliminar registro
                // ------------------------------------------------

                list.splice(
                    index,
                    1
                )

                deleted++
            }

            // ----------------------------------------------------
            // Reorganizar IDs
            // ----------------------------------------------------

            list =
                list.map(
                    (item, index) => ({
                        ...item,
                        id: index + 1
                    })
                )

            saveMediaDB(list)

            if (global.db?.data) {
                global.db.data.mediaList = list
            }

            let respuesta =
`🗑️ *MEDIOS ELIMINADOS*

━━━━━━━━━━━━━━━━━━

✅ Eliminados: *${deleted}*`

            if (notFound.length) {

                respuesta +=
                    `\n❌ No encontrados: *${notFound.join(', ')}*`
            }

            return conn.reply(
                m.chat,
                respuesta,
                m
            )
        }

        // ========================================================
        // 📤 ENVIAR ARCHIVO POR ID
        //
        // .media 5
        // .medias 5
        // ========================================================

        if (/^\d+$/.test(cmd)) {

            const id =
                parseInt(cmd)

            const item =
                list.find(
                    x =>
                        Number(x.id) === id
                )

            if (!item) {

                return conn.reply(
                    m.chat,
                    `❌ No existe ningún medio con ID *${id}*.`,
                    m
                )
            }

            const filepath =
                getFilePath(item)

            // ----------------------------------------------------
            // Verificar archivo
            // ----------------------------------------------------

            if (
                !filepath ||
                !fs.existsSync(filepath)
            ) {

                // Eliminar registro viejo
                list =
                    list.filter(
                        x =>
                            Number(x.id) !== id
                    )

                list =
                    list.map(
                        (x, index) => ({
                            ...x,
                            id: index + 1
                        })
                    )

                saveMediaDB(list)

                if (global.db?.data) {
                    global.db.data.mediaList = list
                }

                return conn.reply(
                    m.chat,
`❌ *El archivo ya no existe.*

🆔 ID: *${id}*

🧹 El registro viejo también fue eliminado de *media.json*.`,
                    m
                )
            }

            // ----------------------------------------------------
            // Leer archivo
            // ----------------------------------------------------

            const buffer =
                fs.readFileSync(
                    filepath
                )

            const caption =
`📁 *MEDIO GUARDADO*

━━━━━━━━━━━━━━━━━━

🆔 *ID:* ${item.id}
📄 *Archivo:* ${item.filename}
📦 *Tipo:* ${item.type}
👤 *From:* ${item.from || 'Desconocido'}
👥 *Grupo:* ${item.groupName || item.groupId || 'Privado'}
📅 *Fecha:* ${item.date || 'Desconocida'}

━━━━━━━━━━━━━━━━━━`

            // ----------------------------------------------------
            // IMAGEN
            // ----------------------------------------------------

            if (
                item.type === 'image'
            ) {

                await conn.sendMessage(
                    sender,
                    {
                        image: buffer,
                        caption
                    },
                    {
                        quoted: m
                    }
                )

                return
            }

            // ----------------------------------------------------
            // VIDEO
            // ----------------------------------------------------

            if (
                item.type === 'video'
            ) {

                await conn.sendMessage(
                    sender,
                    {
                        video: buffer,
                        caption,
                        fileName: item.filename,
                        mimetype:
                            item.mimetype ||
                            'video/mp4'
                    },
                    {
                        quoted: m
                    }
                )

                return
            }

            // ----------------------------------------------------
            // AUDIO
            // ----------------------------------------------------

            if (
                item.type === 'audio'
            ) {

                await conn.sendMessage(
                    sender,
                    {
                        audio: buffer,
                        ptt: false,
                        fileName: item.filename,
                        mimetype:
                            item.mimetype ||
                            'audio/mpeg'
                    },
                    {
                        quoted: m
                    }
                )

                return
            }

            // ----------------------------------------------------
            // DOCUMENTO
            // ----------------------------------------------------

            await conn.sendMessage(
                sender,
                {
                    document: buffer,
                    fileName: item.filename,
                    mimetype:
                        item.mimetype ||
                        'application/octet-stream',
                    caption
                },
                {
                    quoted: m
                }
            )

            return
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
• *.medias*
• *.media list*

📤 *ENVIAR*

• *.media <id>*
• *.medias <id>*

🗑️ *BORRAR*

• *.media del <id>*
• *.media del <id> <id> <id>*

🧹 *BORRAR TODO*

• *.media clear*
• *.media clean*
• *.media wipe*

🔄 *SINCRONIZAR*

• *.media sync*
• *.media fix*

━━━━━━━━━━━━━━━━━━

👑 *Solo disponible para el owner.*`,
            m
        )

    } catch (e) {

        console.error(
            '❌ MEDIA-ADMIN ERROR:',
            e
        )

        return conn.reply(
            m.chat,
            '❌ Error ejecutando el administrador de medios.',
            m
        )
    }
}

// ============================================================
// 📡 GUARDADO AUTOMÁTICO
// ============================================================

handler.all = async function (m) {

    try {

        if (!m?.message) return

        // No guardar comandos normales
        // solamente media real

        const mtype =
            m.mtype

        if (
            mtype !== 'imageMessage' &&
            mtype !== 'videoMessage' &&
            mtype !== 'audioMessage' &&
            mtype !== 'documentMessage'
        ) {
            return
        }

        // --------------------------------------------------------
        // Obtener conexión
        // --------------------------------------------------------

        const conn =
            this?.user
                ? this
                : null

        await saveIncomingMedia(
            m,
            conn
        )

    } catch (e) {

        console.error(
            '❌ MEDIA AUTO-SAVE ERROR:',
            e
        )
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
