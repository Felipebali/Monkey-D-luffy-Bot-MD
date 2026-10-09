// 📂 plugins/media-admin.js
// 🛡️ FELIXCAT BOT — SISTEMA COMPLETO DE MEDIOS
// 💾 Guardado automático + administrador + limpieza automática de DB
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

            const number =
                String(v)
                    .replace(/[^0-9]/g, '')

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

    if (!jid)
        return ''

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

            fs.writeFileSync(
                MEDIA_DB_FILE,
                '[]'
            )

            return []
        }

        const data =
            JSON.parse(
                fs.readFileSync(
                    MEDIA_DB_FILE,
                    'utf8'
                )
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
            JSON.stringify(
                list,
                null,
                2
            ),
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

    if (!item)
        return null

    if (item.path) {

        if (fs.existsSync(item.path)) {
            return item.path
        }
    }

    if (item.filename) {

        const fallback =
            path.join(
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

function syncMediaDB() {

    try {

        let list =
            loadMediaDB()

        if (!Array.isArray(list)) {
            list = []
        }

        const originalLength =
            list.length

        let filesInFolder = []

        try {

            filesInFolder =
                fs.readdirSync(
                    MEDIA_FOLDER
                )

        } catch {

            filesInFolder = []
        }

        list =
            list.filter(item => {

                const filepath =
                    getFilePath(item)

                if (!filepath) {
                    return false
                }

                return fs.existsSync(filepath)
            })

        list =
            list.map(
                (item, index) => ({
                    ...item,
                    id: index + 1
                })
            )

        if (
            list.length !== originalLength ||
            originalLength === 0
        ) {

            saveMediaDB(list)
        }

        if (!global.db) {
            global.db = {}
        }

        if (!global.db.data) {
            global.db.data = {}
        }

        global.db.data.mediaList =
            list

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
// 🚀 SINCRONIZACIÓN AL INICIAR
// ============================================================

syncMediaDB()


// ============================================================
// 💾 GUARDAR MEDIA AUTOMÁTICAMENTE
// ============================================================

async function saveIncomingMedia(m, conn) {

    try {

        if (!m?.message)
            return

        const mtype =
            m.mtype

        let type = null

        if (
            mtype === 'imageMessage'
        ) {

            type = 'image'

        } else if (
            mtype === 'videoMessage'
        ) {

            type = 'video'

        } else if (
            mtype === 'audioMessage'
        ) {

            type = 'audio'

        } else if (
            mtype === 'documentMessage'
        ) {

            type = 'document'

        } else {

            return
        }


        // --------------------------------------------------------
        // Descargar media
        // --------------------------------------------------------

        const buffer =
            await downloadMediaMessage(
                m,
                'buffer'
            )

        if (!buffer)
            return


        // --------------------------------------------------------
        // Sincronizar DB
        // --------------------------------------------------------

        let list =
            syncMediaDB()


        // --------------------------------------------------------
        // Generar nombre
        // --------------------------------------------------------

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
                m.message?.documentMessage?.fileName ||
                'file'

            originalName =
                String(originalName)
                    .replace(
                        /[<>:"/\\|?*\x00-\x1F]/g,
                        '_'
                    )
                    .replace(
                        /\s+/g,
                        '_'
                    )

            extension =
                `_${originalName}`
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

            id:
                list.length + 1,

            filename:
                finalName,

            path:
                filepath,

            type,

            from:
                m.sender || null,

            groupId:
                m.isGroup
                    ? m.chat
                    : null,

            groupName:
                m.isGroup
                    ? (
                        chatInfo?.subject ||
                        ''
                    )
                    : null,

            mimetype:
                m.msg?.mimetype ||
                m.message?.documentMessage?.mimetype ||
                null,

            date:
                new Date().toLocaleString()
        }


        list.push(entry)

        saveMediaDB(list)


        if (!global.db) {
            global.db = {}
        }

        if (!global.db.data) {
            global.db.data = {}
        }

        global.db.data.mediaList =
            list


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
// 📡 HANDLER
// ============================================================

const handler = async (
    m,
    { conn, args }
) => {

    try {

        // ========================================================
        // 👑 VERIFICAR OWNER
        // ========================================================

        const sender =
            conn?.decodeJid
                ? conn.decodeJid(m.sender)
                : normalizeJid(m.sender)

        const owners =
            getOwners()
                .map(normalizeJid)

        if (!owners.includes(sender)) {
            return
        }


        // ========================================================
        // 🧹 SINCRONIZAR
        // ========================================================

        let list =
            syncMediaDB()


        // ========================================================
        // ARGUMENTOS
        // ========================================================

        const cmd =
            String(
                args?.[0] || ''
            )
                .toLowerCase()
                .trim()


        // ========================================================
        // 📋 LISTAR
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
                    500
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
        // ========================================================

        if (
            cmd === 'clear' ||
            cmd === 'clean' ||
            cmd === 'wipe' ||
            cmd === 'limpiar'
        ) {

            let deletedFiles = 0
            let failedFiles = 0


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
                            fs.statSync(filepath)
                                .isFile()
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
        // 🔄 SINCRONIZAR
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
                before -
                synced.length


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
            let notFound = []


            const uniqueIds =
                [...new Set(ids)]
                    .sort(
                        (a, b) => b - a
                    )


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


                list.splice(
                    index,
                    1
                )

                deleted++
            }


            list =
                list.map(
                    (item, index) => ({
                        ...item,
                        id: index + 1
                    })
                )


            saveMediaDB(list)


            if (global.db?.data) {
                global.db.data.mediaList =
                    list
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
        // 📤 RECUPERAR MEDIO POR ID
        //
        // .media 5
        // .medias 5
        //
        // 📌 SIEMPRE SE ENVÍA AL GRUPO CENTRAL
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
                    global.db.data.mediaList =
                        list
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


            // ----------------------------------------------------
            // Caption
            // ----------------------------------------------------

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


            // ====================================================
            // 📌 DESTINO FIJO
            // ====================================================

            const destination =
                MEDIA_GROUP_ID


            // ====================================================
            // 🖼️ IMAGEN
            // ====================================================

            if (
                item.type === 'image'
            ) {

                await conn.sendMessage(
                    destination,
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


            // ====================================================
            // 🎥 VIDEO
            // ====================================================

            if (
                item.type === 'video'
            ) {

                await conn.sendMessage(
                    destination,
                    {
                        video: buffer,
                        caption,
                        fileName:
                            item.filename,
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


            // ====================================================
            // 🎵 AUDIO
            // ====================================================

            if (
                item.type === 'audio'
            ) {

                await conn.sendMessage(
                    destination,
                    {
                        audio: buffer,
                        ptt: false,
                        fileName:
                            item.filename,
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


            // ====================================================
            // 📄 DOCUMENTO
            // ====================================================

            await conn.sendMessage(
                destination,
                {
                    document: buffer,
                    fileName:
                        item.filename,
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
        // ❓ AYUDA / MENÚ COMPLETO
        // ========================================================

        return conn.reply(
            m.chat,
`📂 *ADMINISTRADOR DE MEDIOS — FELIXCAT*

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

Muestra los medios almacenados junto con
su información y su ID correspondiente.

📝 *Comandos:*

• *.media*
• *.medias*
• *.media list*
• *.media lista*

📊 El listado muestra hasta *500 medios*.

🔎 Cada registro incluye:

🆔 ID del medio
📄 Nombre del archivo
📦 Tipo de archivo
👤 Usuario que lo envió
👥 Grupo donde fue recibido
📅 Fecha de guardado

━━━━━━━━━━━━━━━━━━━━━━━━

📤 *2. RECUPERAR UN MEDIO*

Permite recuperar un archivo utilizando
su número de ID.

📝 *Comandos:*

• *.media <ID>*
• *.medias <ID>*

📌 *Ejemplo:*

*.media 25*

➡️ El bot buscará el medio con ID *25*.

📍 El archivo recuperado será enviado
automáticamente al:

👥 *GRUPO CENTRAL DE MEDIOS*

⚠️ El archivo debe existir físicamente
en la carpeta *./media*.

━━━━━━━━━━━━━━━━━━━━━━━━

🗑️ *3. ELIMINAR MEDIOS*

Permite eliminar uno o varios medios
utilizando sus respectivos IDs.

📝 *Comandos:*

• *.media del <ID>*
• *.media borrar <ID>*
• *.media delete <ID>*
• *.media del <ID> <ID> <ID>*

📌 *Ejemplos:*

*.media del 5*

➡️ Elimina solamente el medio 5.

*.media del 3 7 12*

➡️ Elimina los medios 3, 7 y 12.

⚠️ Al eliminar un medio también se elimina
su archivo físico de *./media*.

━━━━━━━━━━━━━━━━━━━━━━━━

🧹 *4. LIMPIAR TODO*

Elimina completamente los medios
almacenados por el sistema.

📝 *Comandos:*

• *.media clear*
• *.media clean*
• *.media wipe*
• *.media limpiar*

💥 Esta acción elimina:

🗑️ Archivos de *./media*
🗑️ Registros de *media.json*
🗑️ Lista de medios en la memoria del bot

⚠️ *ATENCIÓN:*

Esta operación elimina *TODOS* los medios.
No utilices este comando si solamente
querés borrar un archivo específico.

━━━━━━━━━━━━━━━━━━━━━━━━

🔄 *5. SINCRONIZAR / REPARAR*

Comprueba que los registros de
*media.json* todavía tengan su archivo
correspondiente en *./media*.

📝 *Comandos:*

• *.media sync*
• *.media sincronizar*
• *.media repair*
• *.media fix*

🔎 El sistema revisa los archivos y elimina
de la base de datos aquellos registros cuyo
archivo físico ya no existe.

📌 Esto ayuda a mantener sincronizados:

📂 *./media*
↕️
📄 *media.json*

━━━━━━━━━━━━━━━━━━━━━━━━

🤖 *6. GUARDADO AUTOMÁTICO*

El bot detecta automáticamente cuando
recibe:

🖼️ Imagen
🎥 Video
🎵 Audio
📄 Documento

📥 El archivo se descarga automáticamente
y se registra en la base de datos.

No es necesario ejecutar ningún comando
para guardar el medio.

━━━━━━━━━━━━━━━━━━━━━━━━

📊 *7. IDENTIFICACIÓN DE MEDIOS*

Cada archivo recibe un ID numérico.

Ejemplo:

🆔 ID 1
🆔 ID 2
🆔 ID 3
🆔 ID 4
🆔 ID 5

Estos IDs permiten posteriormente
recuperar o eliminar un archivo.

━━━━━━━━━━━━━━━━━━━━━━━━

📍 *GRUPO CENTRAL*

Los medios recuperados mediante:

*.media <ID>*

se envían automáticamente al grupo:

${MEDIA_GROUP_ID}

━━━━━━━━━━━━━━━━━━━━━━━━

👑 *PERMISOS*

🔐 Este administrador está disponible
únicamente para el *OWNER* del bot.

Los usuarios normales no pueden:

❌ Ver la lista
❌ Recuperar medios
❌ Eliminar medios
❌ Limpiar la biblioteca
❌ Sincronizar la base de datos

━━━━━━━━━━━━━━━━━━━━━━━━

💡 *EJEMPLO RÁPIDO*

1️⃣ Ver medios:

*.media*

2️⃣ Buscar un archivo por ID:

*.media 25*

3️⃣ Eliminar un archivo:

*.media del 25*

4️⃣ Reparar la base de datos:

*.media sync*

5️⃣ Eliminar absolutamente todo:

*.media clear*

━━━━━━━━━━━━━━━━━━━━━━━━

🐈 *FELIXCAT BOT*
🛡️ *Administrador de medios*
👑 *Solo para el OWNER*`,
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

        if (!m?.message)
            return


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
