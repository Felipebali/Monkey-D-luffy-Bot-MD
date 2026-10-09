
import fs from 'fs'
import path from 'path'

// ============================================================
// 📂 CONFIGURACIÓN DE ARCHIVOS
// ============================================================

const RECOVERED_DIR = './database/recovered-media-files'
const RECOVERED_DB = './database/recovered-media.json'

// Grupos donde se envían los archivos recuperados
const RECOVERY_GROUPS = [
    '120363410955044864@g.us',
    '120363430366807750@g.us'
]

// Crear carpeta si no existe
if (!fs.existsSync(RECOVERED_DIR)) {
    fs.mkdirSync(RECOVERED_DIR, { recursive: true })
}

// Crear JSON si no existe
if (!fs.existsSync(RECOVERED_DB)) {
    fs.writeFileSync(RECOVERED_DB, '[]', 'utf8')
}

// ============================================================
// 🗃️ BASE DE DATOS JSON
// ============================================================

function getRecoveredDB() {
    try {
        const data = fs.readFileSync(RECOVERED_DB, 'utf8')
        const parsed = JSON.parse(data)

        return Array.isArray(parsed) ? parsed : []
    } catch (error) {
        console.error('[RECOVERED] Error leyendo JSON:', error)
        return []
    }
}

function saveRecoveredDB(list) {
    fs.writeFileSync(
        RECOVERED_DB,
        JSON.stringify(list, null, 2),
        'utf8'
    )
}

// ============================================================
// 🛡️ COMPROBAR PROPIETARIO
// ============================================================

function isBotOwner(m, isOwner) {
    if (isOwner) return true

    const sender = (m.sender || '')
        .split('@')[0]
        .split(':')[0]

    const owners = global.owner || []

    return owners.some(owner => {
        const number = Array.isArray(owner) ? owner[0] : owner

        return String(number).replace(/\D/g, '') ===
            sender.replace(/\D/g, '')
    })
}

// ============================================================
// 🎞️ DETECTAR TIPO DE ARCHIVO
// ============================================================

function getMediaType(quoted) {
    const type = quoted?.mtype || ''
    const mime = quoted?.mimetype || ''

    if (type === 'stickerMessage' || mime.includes('webp'))
        return 'sticker'

    if (type === 'imageMessage' || mime.startsWith('image/'))
        return 'image'

    if (type === 'videoMessage' || mime.startsWith('video/'))
        return 'video'

    return null
}

// ============================================================
// 📍 OBTENER RUTA SEGURA DEL ARCHIVO
// ============================================================

function getFilePath(item) {
    if (!item?.filename) return null

    if (path.basename(item.filename) !== item.filename)
        return null

    const directory = path.resolve(RECOVERED_DIR)
    const filePath = path.resolve(directory, item.filename)

    if (!filePath.startsWith(directory + path.sep))
        return null

    return fs.existsSync(filePath) ? filePath : null
}

// ============================================================
// 📤 ENVIAR ARCHIVO A UN CHAT
// ============================================================

async function sendRecoveredMedia(conn, chat, item) {
    const filePath = getFilePath(item)

    if (!filePath) {
        await conn.sendMessage(chat, {
            text:
`❌ No se encontró la copia física del archivo.

🆔 ID: ${item.id}

El registro existe, pero el archivo podría haberse eliminado de la carpeta.`
        })

        return false
    }

    const buffer = fs.readFileSync(filePath)
    const caption = `♻️ *Archivo recuperado*\n🆔 ID: ${item.id}`

    if (item.type === 'image') {
        await conn.sendMessage(chat, {
            image: buffer,
            caption
        })
    } else if (item.type === 'video') {
        await conn.sendMessage(chat, {
            video: buffer,
            caption
        })
    } else if (item.type === 'sticker') {
        await conn.sendMessage(chat, {
            sticker: buffer
        })
    } else {
        await conn.sendMessage(chat, {
            text: '❌ No se reconoce el tipo de archivo.'
        })

        return false
    }

    return true
}

// ============================================================
// 📡 DISTRIBUIR ARCHIVO A LOS GRUPOS CONFIGURADOS
// 🚫 EXCLUIR EL GRUPO DONDE SE EJECUTÓ EL COMANDO
// ============================================================

async function sendToRecoveryGroups(conn, currentChat, item) {
    const filePath = getFilePath(item)

    if (!filePath) {
        console.error(
            `[RECOVERED] No existe el archivo físico: ${item.id}`
        )
        return
    }

    const destinations = RECOVERY_GROUPS.filter(
        group => group !== currentChat
    )

    if (!destinations.length) {
        console.error(
            '[RECOVERED] No hay grupos de destino disponibles.'
        )
        return
    }

    const buffer = fs.readFileSync(filePath)
    const caption = `♻️ *Archivo recuperado*\n🆔 ID: ${item.id}`

    for (const chat of destinations) {
        try {
            if (item.type === 'image') {
                await conn.sendMessage(chat, {
                    image: buffer,
                    caption
                })
            } else if (item.type === 'video') {
                await conn.sendMessage(chat, {
                    video: buffer,
                    caption
                })
            } else if (item.type === 'sticker') {
                await conn.sendMessage(chat, {
                    sticker: buffer
                })
            } else {
                console.error(
                    `[RECOVERED] Tipo desconocido para ${item.id}`
                )
                return
            }
        } catch (error) {
            console.error(
                `[RECOVERED] Error enviando al grupo ${chat}:`,
                error
            )
        }
    }
}

// ============================================================
// 📋 FORMATEAR LISTAS
// ============================================================

function formatList(items) {
    return items.map(item =>
        `🆔 *${item.id}*\n` +
        `📁 Tipo: ${item.type}\n` +
        `📅 Fecha: ${item.date}\n` +
        `📄 Archivo: ${item.filename}` +
        (item.deletedAt
            ? `\n🗑️ Eliminado: ${item.deletedAt}`
            : '')
    ).join('\n\n')
}

// ============================================================
// ♻️ COMANDOS PRINCIPALES
// ============================================================

let handler = async (m, { conn, isOwner }) => {
    try {
        if (!isBotOwner(m, isOwner)) {
            return conn.sendMessage(m.chat, {
                text: '⛔ Este comando solo puede usarlo el propietario del bot.'
            }, { quoted: m })
        }

        const text = (m.text || '').trim()
        const args = text.split(/\s+/)

        const command = (args[0] || '')
            .replace(/^[.!#]/, '')
            .toLowerCase()

        const subcommand = (args[1] || '').toLowerCase()
        const idArg = args[2] || ''

        const list = getRecoveredDB()

        // --------------------------------------------------------
        // 📖 MENÚ DE AYUDA
        // .recovered ayuda
        // --------------------------------------------------------

        if (
            (command === 'recovered' ||
             command === 'recoveredlist') &&
            subcommand === 'ayuda'
        ) {
            return conn.sendMessage(m.chat, {
                text:
`🗃️ *SISTEMA DE ARCHIVOS RECUPERADOS*

♻️ *Recuperar y consultar*
• .ver
• .r
• .recovered
• .recovered ID

🗑️ *Papelera*
• .recovered borrar ID
• .recovered papelera

✅ *Restaurar*
• .recovered restaurar ID

📡 Los archivos recuperados se envían a los grupos configurados,
excluyendo el grupo donde se ejecuta .ver o .r.

💾 Los archivos se conservan en el almacenamiento local.`
            }, { quoted: m })
        }

        // --------------------------------------------------------
        // 🗑️ ENVIAR REGISTRO A LA PAPELERA
        // .recovered borrar ID
        // --------------------------------------------------------

        if (
            command === 'recovered' &&
            ['borrar', 'eliminar'].includes(subcommand)
        ) {
            const id = idArg

            if (!id) {
                return conn.sendMessage(m.chat, {
                    text: '❌ Indicá el ID.\nEjemplo: .recovered borrar 123456789'
                }, { quoted: m })
            }

            const item = list.find(
                entry => String(entry.id) === id
            )

            if (!item) {
                return conn.sendMessage(m.chat, {
                    text: `❌ No existe ningún registro con el ID ${id}.`
                }, { quoted: m })
            }

            if (item.deleted) {
                return conn.sendMessage(m.chat, {
                    text:
`⚠️ El archivo ${id} ya está en la papelera.

Usá:
.recovered restaurar ${id}`
                }, { quoted: m })
            }

            // Solo se marca como eliminado.
            // El archivo físico NO se borra.
            item.deleted = true
            item.deletedAt = new Date().toLocaleString('es-UY')

            saveRecoveredDB(list)

            return conn.sendMessage(m.chat, {
                text:
`🗑️ *Registro enviado a la papelera*

🆔 ID: ${id}
💾 La copia física sigue guardada.

♻️ Para restaurarlo:
.recovered restaurar ${id}`
            }, { quoted: m })
        }

        // --------------------------------------------------------
        // ♻️ RESTAURAR REGISTRO
        // .recovered restaurar ID
        // --------------------------------------------------------

        if (
            command === 'recovered' &&
            ['restaurar', 'restore'].includes(subcommand)
        ) {
            const id = idArg

            if (!id) {
                return conn.sendMessage(m.chat, {
                    text: '❌ Indicá el ID.\nEjemplo: .recovered restaurar 123456789'
                }, { quoted: m })
            }

            const item = list.find(
                entry => String(entry.id) === id
            )

            if (!item) {
                return conn.sendMessage(m.chat, {
                    text: `❌ No existe ningún registro con el ID ${id}.`
                }, { quoted: m })
            }

            if (!getFilePath(item)) {
                return conn.sendMessage(m.chat, {
                    text:
`❌ No se puede restaurar el registro porque falta el archivo físico.

🆔 ID: ${id}
📂 Carpeta:
${RECOVERED_DIR}`
                }, { quoted: m })
            }

            if (!item.deleted) {
                return conn.sendMessage(m.chat, {
                    text: `ℹ️ El archivo ${id} ya está activo.`
                }, { quoted: m })
            }

            item.deleted = false
            delete item.deletedAt

            saveRecoveredDB(list)

            return conn.sendMessage(m.chat, {
                text:
`✅ *Registro restaurado correctamente*

🆔 ID: ${id}
📁 Tipo: ${item.type}
💾 La copia física se conservó.
📋 Ya aparece nuevamente en la lista activa.`
            }, { quoted: m })
        }

        // --------------------------------------------------------
        // 🗑️ MOSTRAR PAPELERA
        // .recovered papelera
        // --------------------------------------------------------

        if (
            command === 'recovered' &&
            ['papelera', 'borrados', 'deleted'].includes(subcommand)
        ) {
            const deleted = list.filter(
                item => item.deleted === true
            )

            if (!deleted.length) {
                return conn.sendMessage(m.chat, {
                    text: '🗑️ La papelera está vacía.'
                }, { quoted: m })
            }

            return conn.sendMessage(m.chat, {
                text:
`🗑️ *PAPELERA DE ARCHIVOS*

${formatList(deleted.slice(-50).reverse())}

♻️ Para restaurar:
.recovered restaurar ID`
            }, { quoted: m })
        }

        // --------------------------------------------------------
        // 📋 LISTAR ARCHIVOS ACTIVOS
        // .recovered
        // .recoveredlist
        // --------------------------------------------------------

        if (
            command === 'recovered' ||
            command === 'recoveredlist'
        ) {
            if (subcommand) {
                const item = list.find(
                    entry => String(entry.id) === subcommand
                )

                if (!item) {
                    return conn.sendMessage(m.chat, {
                        text: `❌ No existe un archivo con el ID ${subcommand}.`
                    }, { quoted: m })
                }

                if (item.deleted) {
                    return conn.sendMessage(m.chat, {
                        text:
`🗑️ Este registro está en la papelera.

Para restaurarlo:
.recovered restaurar ${item.id}`
                    }, { quoted: m })
                }

                return sendRecoveredMedia(conn, m.chat, item)
            }

            const active = list.filter(
                item => item.deleted !== true
            )

            if (!active.length) {
                return conn.sendMessage(m.chat, {
                    text: '📂 No hay archivos activos guardados.'
                }, { quoted: m })
            }

            return conn.sendMessage(m.chat, {
                text:
`🗃️ *ARCHIVOS RECUPERADOS*

${formatList(active.slice(-50).reverse())}

📌 Mostrando los últimos ${Math.min(active.length, 50)} registros activos.`
            }, { quoted: m })
        }

        // --------------------------------------------------------
        // ♻️ GUARDAR Y DISTRIBUIR MEDIO
        // .ver
        // .r
        // --------------------------------------------------------

        if (command === 'ver' || command === 'r') {
            const quoted = m.quoted

            if (!quoted) {
                return conn.sendMessage(m.chat, {
                    text:
`❌ Respondé a una imagen, video o sticker.

Ejemplos:
• .ver
• .r`
                }, { quoted: m })
            }

            const type = getMediaType(quoted)

            if (!type) {
                return conn.sendMessage(m.chat, {
                    text: '❌ El mensaje citado no es una imagen, video o sticker compatible.'
                }, { quoted: m })
            }

            const buffer = await quoted.download()

            if (!buffer || !buffer.length) {
                return conn.sendMessage(m.chat, {
                    text: '❌ No se pudo descargar el archivo citado.'
                }, { quoted: m })
            }

            const id = `${Date.now()}`

            const extension = type === 'image'
                ? 'jpg'
                : type === 'video'
                    ? 'mp4'
                    : 'webp'

            const filename = `recovered_${id}.${extension}`
            const filePath = path.join(RECOVERED_DIR, filename)

            // Guardar el archivo físico localmente
            fs.writeFileSync(filePath, buffer)

            // Registrar el archivo en el JSON
            const item = {
                id,
                type,
                filename,
                date: new Date().toLocaleString('es-UY'),
                chat: m.chat,
                sender: m.sender || null,
                mimetype: quoted.mimetype || null,
                deleted: false
            }

            list.push(item)
            saveRecoveredDB(list)

            // Enviar solamente a los grupos configurados.
            // Nunca al grupo desde el que se ejecutó el comando.
            // No enviar confirmación de guardado al chat de origen.
            await sendToRecoveryGroups(conn, m.chat, item)

            // No enviar mensajes de éxito al chat de origen.
        }

    } catch (error) {
        console.error('[RECOVERED] Error:', error)

        return conn.sendMessage(m.chat, {
            text: '❌ Ocurrió un error al procesar el archivo.'
        }, { quoted: m })
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.help = [
    'ver',
    'r',
    'recovered',
    'recovered <ID>',
    'recovered borrar <ID>',
    'recovered papelera',
    'recovered restaurar <ID>',
    'recoveredlist',
    'recovered ayuda'
]

handler.tags = ['owner']
handler.command = /^(ver|r|recovered|recoveredlist)$/i

export default handler
