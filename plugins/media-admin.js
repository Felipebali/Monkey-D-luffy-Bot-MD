// 📂 plugins/media-admin.js
// 🛡️ SISTEMA COMPLETO DE MEDIOS
// 💾 Guardado automático + administrador + limpieza segura de DB
// 📌 Recuperación de medios en grupo central
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
// 📌 GRUPO CENTRAL DE MEDIOS
// ============================================================

const MEDIA_GROUP_ID = '120363429424906972@g.us'

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
            return number ? number + '@s.whatsapp.net' : null
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

        return Array.isArray(data) ? data : []
    } catch (e) {
        console.error('[MEDIA] Error leyendo media.json:', e)
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
        console.error('[MEDIA] Error guardando media.json:', e)
        return false
    }
}

// ============================================================
// 📍 OBTENER RUTA REAL DEL ARCHIVO
// ============================================================

function getFilePath(item) {
    if (!item) return null

    if (item.path && fs.existsSync(item.path)) {
        return item.path
    }

    if (item.filename) {
        return path.join(MEDIA_FOLDER, item.filename)
    }

    return null
}

// ============================================================
// 🧹 SINCRONIZAR MEDIA.JSON CON ./MEDIA
// ============================================================

function syncMediaDB() {
    try {
        let list = loadMediaDB()

        if (!Array.isArray(list)) {
            list = []
        }

        const originalLength = list.length

        list = list.filter(item => {
            const filepath = getFilePath(item)
            return filepath && fs.existsSync(filepath)
        })

        list = list.map((item, index) => ({
            ...item,
            id: index + 1
        }))

        if (
            list.length !== originalLength ||
            originalLength === 0
        ) {
            saveMediaDB(list)
        }

        if (!global.db) global.db = {}
        if (!global.db.data) global.db.data = {}

        global.db.data.mediaList = list

        return list
    } catch (e) {
        console.error('[MEDIA] Error sincronizando:', e)
        return []
    }
}

// ============================================================
// 🚀 SINCRONIZACIÓN AL INICIAR
// ============================================================

syncMediaDB()

// ============================================================
// 💾 GUARDAR MEDIA AUTOMÁTICAMENTE
// ============================================================

async function saveIncomingMedia(m, conn) {
    try {
        if (!m?.message) return

        const mtype = m.mtype
        let type = null

        if (mtype === 'imageMessage') {
            type = 'image'
        } else if (mtype === 'videoMessage') {
            type = 'video'
        } else if (mtype === 'audioMessage') {
            type = 'audio'
        } else if (mtype === 'documentMessage') {
            type = 'document'
        } else {
            return
        }

        // Descargar medio
        const buffer = await downloadMediaMessage(m, 'buffer')

        if (!buffer) return

        // Sincronizar base de datos
        let list = syncMediaDB()

        // Generar nombre único
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
            let originalName =
                m.message?.documentMessage?.fileName || 'file'

            originalName = String(originalName)
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
                .replace(/\s+/g, '_')

            extension = `_${originalName}`
        }

        const finalName = uniqueName + extension
        const filepath = path.join(MEDIA_FOLDER, finalName)

        // Guardar archivo
        fs.writeFileSync(filepath, buffer)

        // Obtener información del grupo
        let chatInfo = null

        if (m.isGroup) {
            try {
                if (conn?.groupMetadata) {
                    chatInfo = await conn.groupMetadata(m.chat)
                }
            } catch {
                chatInfo = null
            }
        }

        // Crear registro
        const entry = {
            id: list.length + 1,
            filename: finalName,
            path: filepath,
            type,
            from: m.sender || null,
            groupId: m.isGroup ? m.chat : null,
            groupName: m.isGroup
                ? (chatInfo?.subject || '')
                : null,
            mimetype:
                m.msg?.mimetype ||
                m.message?.documentMessage?.mimetype ||
                null,
            date: new Date().toLocaleString()
        }

        list.push(entry)

        saveMediaDB(list)

        if (!global.db) global.db = {}
        if (!global.db.data) global.db.data = {}

        global.db.data.mediaList = list

        console.log('[MEDIA GUARDADO]:', entry)
    } catch (e) {
        console.error('❌ ERROR GUARDANDO MEDIA:', e)
    }
}

// ============================================================
// 📡 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn, args }) => {
    try {
        // Verificar owner
        const sender = conn?.decodeJid
            ? conn.decodeJid(m.sender)
            : normalizeJid(m.sender)

        const owners = getOwners().map(normalizeJid)

        if (!owners.includes(sender)) return

        // Sincronizar
        let list = syncMediaDB()

        // Argumentos
        const cmd = String(args?.[0] || '')
            .toLowerCase()
            .trim()

        // ========================================================
        // 📋 LISTAR MEDIOS — HASTA 800
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

            const max = Math.min(list.length, 800)

            const lines = list
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

            return conn.reply(m.chat, text, m)
        }

        // ========================================================
        // 🧹 BORRAR TODO DE MEDIA-ADMIN DE FORMA SEGURA
        // ========================================================

        if (
            ['clear', 'clean', 'wipe', 'limpiar'].includes(cmd)
        ) {
            let deletedFiles = 0
            let failedFiles = 0

            // Solo borrar archivos registrados en media.json.
            // No recorrer toda la carpeta ./media.
            for (const item of list) {
                const filepath = getFilePath(item)

                if (filepath && fs.existsSync(filepath)) {
                    try {
                        // Protección adicional: permitir únicamente
                        // archivos ubicados dentro de ./media.
                        const absoluteMediaFolder = path.resolve(MEDIA_FOLDER)
                        const absoluteFilepath = path.resolve(filepath)
                        const relativePath = path.relative(
                            absoluteMediaFolder,
                            absoluteFilepath
                        )

                        const isInsideMediaFolder =
                            relativePath !== '' &&
                            !relativePath.startsWith('..') &&
                            !path.isAbsolute(relativePath)

                        if (!isInsideMediaFolder) {
                            console.warn(
                                '[MEDIA] Archivo fuera de ./media; no se borra:',
                                absoluteFilepath
                            )
                            failedFiles++
                            continue
                        }

                        fs.unlinkSync(absoluteFilepath)
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

            // Vaciar solamente la base de datos de este plugin.
            // Los archivos no registrados en media.json se conservan.
            saveMediaDB([])

            if (global.db?.data) {
                global.db.data.mediaList = []
            }

            return conn.reply(
                m.chat,
`🧹 *MEDIOS DE MEDIA-ADMIN LIMPIADOS*

━━━━━━━━━━━━━━━━━━

🗑️ Archivos eliminados: *${deletedFiles}*
❌ Errores al borrar: *${failedFiles}*
📂 Registros eliminados: *${list.length}*

━━━━━━━━━━━━━━━━━━

✅ Se limpiaron los registros de media-admin.js.
✅ media.json quedó vacío.
🔒 Los archivos ajenos de ./media se conservaron.
🔒 No se modificó la carpeta de recuperación de _ver.js.`,
                m
            )
        }

        // ========================================================
        // 🔄 SINCRONIZAR
        // ========================================================

        if (
            ['sync', 'sincronizar', 'repair', 'fix'].includes(cmd)
        ) {
            const before = list.length
            const synced = syncMediaDB()
            const removed = before - synced.length

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
        // 🗑️ BORRAR UNO O VARIOS MEDIOS
        // ========================================================

        if (
            ['del', 'delete', 'rm', 'borrar', 'eliminar'].includes(cmd)
        ) {
            const ids = args
                .slice(1)
                .map(v => parseInt(v))
                .filter(v => !isNaN(v))

            if (!ids.length) {
                return conn.reply(
                    m.chat,
`❌ *Debes indicar al menos un ID.*

━━━━━━━━━━━━━━━━━━

📌 *Ejemplos:*

• *.media del 5*
  └─ Elimina el medio con ID 5.

• *.media del 3 7 9*
  └─ Elimina los medios 3, 7 y 9.

• *.media borrar 10*
  └─ Elimina el medio con ID 10.

⚠️ *Los archivos eliminados no podrán recuperarse desde este sistema.*`,
                    m
                )
            }

            let deleted = 0
            const notFound = []

            const uniqueIds = [...new Set(ids)]
                .sort((a, b) => b - a)

            for (const id of uniqueIds) {
                const index = list.findIndex(
                    item => Number(item.id) === id
                )

                if (index === -1) {
                    notFound.push(id)
                    continue
                }

                const item = list[index]
                const filepath = getFilePath(item)

                if (filepath && fs.existsSync(filepath)) {
                    try {
                        const absoluteMediaFolder = path.resolve(MEDIA_FOLDER)
                        const absoluteFilepath = path.resolve(filepath)
                        const relativePath = path.relative(
                            absoluteMediaFolder,
                            absoluteFilepath
                        )

                        const isInsideMediaFolder =
                            relativePath !== '' &&
                            !relativePath.startsWith('..') &&
                            !path.isAbsolute(relativePath)

                        if (isInsideMediaFolder) {
                            fs.unlinkSync(absoluteFilepath)
                        } else {
                            console.warn(
                                '[MEDIA] Archivo fuera de ./media; no se borra:',
                                absoluteFilepath
                            )
                        }
                    } catch (e) {
                        console.error(
                            '[MEDIA] Error borrando archivo:',
                            e
                        )
                    }
                }

                list.splice(index, 1)
                deleted++
            }

            list = list.map((item, index) => ({
                ...item,
                id: index + 1
            }))

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

            return conn.reply(m.chat, respuesta, m)
        }

        // ========================================================
        // 📤 RECUPERAR MEDIO POR ID
        // .media 5 / .medias 5
        // ========================================================

        if (/^\d+$/.test(cmd)) {
            const id = parseInt(cmd)

            const item = list.find(
                x => Number(x.id) === id
            )

            if (!item) {
                return conn.reply(
                    m.chat,
                    `❌ No existe ningún medio con ID *${id}*.`,
                    m
                )
            }

            const filepath = getFilePath(item)

            // Verificar archivo
            if (!filepath || !fs.existsSync(filepath)) {
                list = list.filter(
                    x => Number(x.id) !== id
                )

                list = list.map((x, index) => ({
                    ...x,
                    id: index + 1
                }))

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

            // Leer archivo
            const buffer = fs.readFileSync(filepath)

            // Caption
            const caption =
`📁 *MEDIO GUARDADO*

━━━━━━━━━━━━━━━━━━

🆔 *ID:* ${item.id}
📄 *Archivo:* ${item.filename}
📦 *Tipo:* ${item.type}
👤 *From:* ${item.from || 'Desconocido'}
👥 *Grupo:* ${item.groupName || item.groupId || 'Privado'}
📅 *Fecha:* ${item.date || 'Desconocida'}

━━━━━━━━━━━━━━━━━━

📌 *Recuperado en grupo central*`

            const destination = MEDIA_GROUP_ID

            // Imagen
            if (item.type === 'image') {
                await conn.sendMessage(
                    destination,
                    {
                        image: buffer,
                        caption
                    },
                    { quoted: m }
                )

                return
            }

            // Video
            if (item.type === 'video') {
                await conn.sendMessage(
                    destination,
                    {
                        video: buffer,
                        caption,
                        fileName: item.filename,
                        mimetype: item.mimetype || 'video/mp4'
                    },
                    { quoted: m }
                )

                return
            }

            // Audio
            if (item.type === 'audio') {
                await conn.sendMessage(
                    destination,
                    {
                        audio: buffer,
                        ptt: false,
                        fileName: item.filename,
                        mimetype: item.mimetype || 'audio/mpeg'
                    },
                    { quoted: m }
                )

                return
            }

            // Documento
            await conn.sendMessage(
                destination,
                {
                    document: buffer,
                    fileName: item.filename,
                    mimetype:
                        item.mimetype ||
                        'application/octet-stream',
                    caption
                },
                { quoted: m }
            )

            return
        }

        // ========================================================
        // ❓ AYUDA / MENÚ COMPLETO
        // ========================================================

        return conn.reply(
            m.chat,
`📂 *ADMINISTRADOR DE MEDIOS*

━━━━━━━━━━━━━━━━━━━━━━━━

🛡️ *¿QUÉ HACE ESTE SISTEMA?*

Este sistema guarda automáticamente los
medios recibidos por el bot y permite al
👑 *OWNER* administrarlos desde WhatsApp.

📦 *TIPOS DE MEDIOS GUARDADOS:*

🖼️ Imágenes
🎥 Videos
🎵 Audios
📄 Documentos

💾 Cada medio se guarda físicamente en:

📁 *./media*

Y su información se registra en:

📂 *./database/media.json*

━━━━━━━━━━━━━━━━━━━━━━━━

📋 *1. LISTAR MEDIOS*

📝 *Comandos:*

• *.media*
• *.medias*
• *.media list*
• *.media lista*

📊 El listado muestra hasta *800 medios*.

🔎 Cada registro incluye:

🆔 ID del medio
📄 Nombre del archivo
📦 Tipo de archivo
👤 Usuario que lo envió
👥 Grupo donde fue recibido
📅 Fecha de guardado

━━━━━━━━━━━━━━━━━━━━━━━━

📤 *2. RECUPERAR UN MEDIO*

📝 *Comandos:*

• *.media <ID>*
• *.medias <ID>*

📌 *Ejemplo:* *.media 25*

➡️ El archivo se enviará automáticamente
al grupo central de medios.

━━━━━━━━━━━━━━━━━━━━━━━━

🗑️ *3. ELIMINAR MEDIOS*

• *.media del <ID>*
• *.media borrar <ID>*
• *.media delete <ID>*
• *.media del <ID> <ID> <ID>*

📌 Ejemplos:

• *.media del 5*
• *.media del 3 7 12*

⚠️ Al eliminar un medio también se elimina
su archivo físico registrado en *./media*.

━━━━━━━━━━━━━━━━━━━━━━━━

🧹 *4. LIMPIAR REGISTROS Y ARCHIVOS DEL SISTEMA*

• *.media clear*
• *.media clean*
• *.media wipe*
• *.media limpiar*

🔒 Solo elimina los archivos registrados
por *media-admin.js* en *media.json*.

✅ Conserva los archivos ajenos de *./media*.
✅ No vacía carpetas de otros plugins.

━━━━━━━━━━━━━━━━━━━━━━━━

🔄 *5. SINCRONIZAR / REPARAR*

• *.media sync*
• *.media sincronizar*
• *.media repair*
• *.media fix*

Elimina de la base de datos los registros
cuyo archivo físico ya no existe.

━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *6. GUARDADO AUTOMÁTICO*

El bot detecta automáticamente:

🖼️ Imágenes
🎥 Videos
🎵 Audios
📄 Documentos

📥 Los archivos se descargan y registran
automáticamente.

━━━━━━━━━━━━━━━━━━━━━━━━

📍 *GRUPO CENTRAL*

Los medios recuperados mediante
*.media <ID>* se envían a:

${MEDIA_GROUP_ID}

━━━━━━━━━━━━━━━━━━━━━━━━

👑 *PERMISOS*

🔐 Disponible únicamente para el OWNER.

━━━━━━━━━━━━━━━━━━━━━━━━

🐾 *ADMINISTRADOR DE MEDIOS*
👑 *Solo para el OWNER*`,
            m
        )

    } catch (e) {
        console.error('❌ MEDIA-ADMIN ERROR:', e)

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

        const mtype = m.mtype

        if (
            mtype !== 'imageMessage' &&
            mtype !== 'videoMessage' &&
            mtype !== 'audioMessage' &&
            mtype !== 'documentMessage'
        ) {
            return
        }

        const conn = this?.user ? this : null

        await saveIncomingMedia(m, conn)
    } catch (e) {
        console.error('❌ MEDIA AUTO-SAVE ERROR:', e)
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
