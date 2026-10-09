// 📂 plugins/ver.js
// ♻️ Sistema de archivos recuperados
// 🔢 ID numéricos consecutivos: 1, 2, 3...
// 💾 Almacenamiento físico + JSON
// 🗑️ Papelera y restauración
// 📡 Envío a grupos A, B y grupo de origen C
// 👑 Solo propietario
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// 📂 CONFIGURACIÓN
// ============================================================

const RECOVERED_DIR = './database/recovered-media-files'
const RECOVERED_DB = './database/recovered-media.json'

// Grupos A y B
const RECOVERY_GROUPS = [
    '120363410955044864@g.us',
    '120363430366807750@g.us'
]

// Crear carpeta y JSON si no existen
if (!fs.existsSync(RECOVERED_DIR)) {
    fs.mkdirSync(RECOVERED_DIR, { recursive: true })
}

if (!fs.existsSync(RECOVERED_DB)) {
    fs.writeFileSync(RECOVERED_DB, '[]', 'utf8')
}

// ============================================================
// 💾 GUARDAR BASE DE DATOS
// ============================================================

function saveRecoveredDB(list) {
    fs.writeFileSync(
        RECOVERED_DB,
        JSON.stringify(list, null, 2),
        'utf8'
    )
}

// ============================================================
// 🗃️ LEER BASE DE DATOS
// ============================================================

function getRecoveredDB() {
    try {
        const data = fs.readFileSync(RECOVERED_DB, 'utf8')
        const parsed = JSON.parse(data)

        if (!Array.isArray(parsed)) return []

        // Convertir los ID antiguos a números consecutivos.
        // Se conserva el orden y el archivo físico de cada registro.
        let changed = false

        parsed.forEach((item, index) => {
            const simpleId = String(index + 1)

            if (String(item.id) !== simpleId) {
                item.id = simpleId
                changed = true
            }
        })

        if (changed) {
            saveRecoveredDB(parsed)
        }

        return parsed

    } catch (error) {
        console.error('[RECOVERED] Error leyendo JSON:', error)
        return []
    }
}

// ============================================================
// 👑 COMPROBAR PROPIETARIO
// ============================================================

function isBotOwner(m, isOwner) {
    if (isOwner) return true

    const sender = (m.sender || '')
        .split('@')[0]
        .split(':')[0]

    const owners = global.owner || []

    return owners.some(owner => {
        const number = Array.isArray(owner)
            ? owner[0]
            : owner

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

    if (type === 'stickerMessage' || mime.includes('webp')) {
        return 'sticker'
    }

    if (type === 'imageMessage' || mime.startsWith('image/')) {
        return 'image'
    }

    if (type === 'videoMessage' || mime.startsWith('video/')) {
        return 'video'
    }

    return null
}

// ============================================================
// 📁 OBTENER RUTA DEL ARCHIVO
// ============================================================

function getFilePath(item) {
    if (!item?.filename) return null

    if (path.basename(item.filename) !== item.filename) {
        return null
    }

    const directory = path.resolve(RECOVERED_DIR)
    const filePath = path.resolve(directory, item.filename)

    if (!filePath.startsWith(directory + path.sep)) {
        return null
    }

    return fs.existsSync(filePath) ? filePath : null
}

// ============================================================
// 📤 ENVIAR ARCHIVO A UN CHAT
// ============================================================

async function sendRecoveredMedia(conn, chat, item) {
    const filePath = getFilePath(item)

    if (!filePath) {
        console.error(
            `[RECOVERED] No se encontró el archivo del ID ${item.id}`
        )
        return false
    }

    try {
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
            console.error(
                `[RECOVERED] Tipo desconocido: ${item.type}`
            )
            return false
        }

        return true

    } catch (error) {
        console.error(
            `[RECOVERED] Error enviando a ${chat}:`,
            error
        )
        return false
    }
}

// ============================================================
// 📡 ENVIAR A LOS GRUPOS A Y B
// ============================================================

async function sendToRecoveryGroups(conn, currentChat, item) {
    const filePath = getFilePath(item)

    if (!filePath) {
        console.error(
            `[RECOVERED] No existe el archivo físico: ${item.id}`
        )
        return
    }

    // Si el comando se usa en A o B, evitar duplicados.
    // Si se usa en C, enviar a A y B.
    // Si se usa por privado, enviar a A y B.
    const destinations = RECOVERY_GROUPS.filter(
        group => group !== currentChat
    )

    if (!destinations.length) {
        console.error('[RECOVERED] No hay destinos disponibles.')
        return
    }

    for (const chat of destinations) {
        await sendRecoveredMedia(conn, chat, item)
    }
}

// ============================================================
// 📋 FORMATEAR LISTAS
// ============================================================

function formatList(items) {
    if (!items.length) {
        return '📂 No hay registros para mostrar.'
    }

    return items.map(item =>
        `🔢 *N.º ${item.id}*\n` +
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
        // 📖 AYUDA
        // .recovered ayuda
        // --------------------------------------------------------

        if (
            ['recovered', 'recoveredlist'].includes(command) &&
            subcommand === 'ayuda'
        ) {
            return conn.sendMessage(m.chat, {
                text:
`🗃️ *ARCHIVOS RECUPERADOS*

♻️ *Recuperar*
• .ver
• .r

📋 *Consultar*
• .recovered
• .recovered 1
• .recoveredlist

🗑️ *Papelera*
• .recovered borrar 1
• .recovered papelera

♻️ *Restaurar*
• .recovered restaurar 1

🔢 Los ID son números consecutivos: 1, 2, 3...

📡 En un grupo C, el archivo se envía a C, A y B.
📩 Por privado, se envía únicamente a A y B.

💾 Los archivos se conservan en el almacenamiento local.`
            }, { quoted: m })
        }

        // --------------------------------------------------------
        // 🗑️ ENVIAR A LA PAPELERA
        // .recovered borrar 1
        // --------------------------------------------------------

        if (
            command === 'recovered' &&
            ['borrar', 'eliminar'].includes(subcommand)
        ) {
            const id = idArg

            if (!id) {
                return conn.sendMessage(m.chat, {
                    text: '❌ Indicá el número del archivo.\nEjemplo: .recovered borrar 1'
                }, { quoted: m })
            }

            const item = list.find(
                entry => String(entry.id) === id
            )

            if (!item) {
                return conn.sendMessage(m.chat, {
                    text: `❌ No existe el archivo número ${id}.`
                }, { quoted: m })
            }

            if (item.deleted) {
                return conn.sendMessage(m.chat, {
                    text:
`⚠️ El archivo número ${id} ya está en la papelera.

Para restaurarlo:
.recovered restaurar ${id}`
                }, { quoted: m })
            }

            // Solo marcar como eliminado.
            // No borrar el archivo físico.
            item.deleted = true
            item.deletedAt = new Date().toLocaleString('es-UY')

            saveRecoveredDB(list)

            return conn.sendMessage(m.chat, {
                text:
`🗑️ *ARCHIVO EN LA PAPELERA*

🔢 Número: ${id}
💾 La copia física sigue guardada.

Para restaurarlo:
.recovered restaurar ${id}`
            }, { quoted: m })
        }

        // --------------------------------------------------------
        // ♻️ RESTAURAR ARCHIVO
        // .recovered restaurar 1
        // --------------------------------------------------------

        if (
            command === 'recovered' &&
            ['restaurar', 'restore'].includes(subcommand)
        ) {
            const id = idArg

            if (!id) {
                return conn.sendMessage(m.chat, {
                    text: '❌ Indicá el número.\nEjemplo: .recovered restaurar 1'
                }, { quoted: m })
            }

            const item = list.find(
                entry => String(entry.id) === id
            )

            if (!item) {
                return conn.sendMessage(m.chat, {
                    text: `❌ No existe el archivo número ${id}.`
                }, { quoted: m })
            }

            if (!getFilePath(item)) {
                return conn.sendMessage(m.chat, {
                    text:
`❌ Falta el archivo físico.

🔢 Número: ${id}
📂 Carpeta: ${RECOVERED_DIR}`
                }, { quoted: m })
            }

            if (!item.deleted) {
                return conn.sendMessage(m.chat, {
                    text: `ℹ️ El archivo número ${id} ya está activo.`
                }, { quoted: m })
            }

            item.deleted = false
            delete item.deletedAt

            saveRecoveredDB(list)

            return conn.sendMessage(m.chat, {
                text:
`✅ *ARCHIVO RESTAURADO*

🔢 Número: ${id}
📁 Tipo: ${item.type}
💾 La copia física se conservó.
📋 El archivo vuelve a la lista activa.`
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
            const deleted = list
                .filter(item => item.deleted === true)
                .reverse()

            if (!deleted.length) {
                return conn.sendMessage(m.chat, {
                    text: '🗑️ La papelera está vacía.'
                }, { quoted: m })
            }

            return conn.sendMessage(m.chat, {
                text:
`🗑️ *PAPELERA DE ARCHIVOS*

${formatList(deleted.slice(0, 50))}

♻️ Para restaurar:
.recovered restaurar NÚMERO`
            }, { quoted: m })
        }

        // --------------------------------------------------------
        // 📋 LISTAR O CONSULTAR ARCHIVOS
        // .recovered
        // .recovered 1
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
                        text: `❌ No existe el archivo número ${subcommand}.`
                    }, { quoted: m })
                }

                if (item.deleted) {
                    return conn.sendMessage(m.chat, {
                        text:
`🗑️ El archivo número ${item.id} está en la papelera.

Para restaurarlo:
.recovered restaurar ${item.id}`
                    }, { quoted: m })
                }

                return sendRecoveredMedia(conn, m.chat, item)
            }

            const active = list
                .filter(item => item.deleted !== true)
                .reverse()
                .slice(0, 50)

            if (!active.length) {
                return conn.sendMessage(m.chat, {
                    text: '📂 No hay archivos activos guardados.'
                }, { quoted: m })
            }

            return conn.sendMessage(m.chat, {
                text:
`🗃️ *ARCHIVOS RECUPERADOS*

${formatList(active)}

📌 Mostrando hasta 50 archivos activos.`
            }, { quoted: m })
        }

        // --------------------------------------------------------
        // ♻️ RECUPERAR Y DISTRIBUIR
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

            // ID sencillo y consecutivo: 1, 2, 3...
            const id = String(list.length + 1)

            const extension = type === 'image'
                ? 'jpg'
                : type === 'video'
                    ? 'mp4'
                    : 'webp'

            const filename = `recovered_${id}.${extension}`
            const filePath = path.join(RECOVERED_DIR, filename)

            // Guardar archivo físico
            fs.writeFileSync(filePath, buffer)

            // Registrar en JSON
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

            // Si se ejecuta en un grupo, enviar al grupo de origen.
            // Por lo tanto, si se usa en C, aparece también en C.
            if (m.isGroup) {
                await sendRecoveredMedia(conn, m.chat, item)
            }

            // Enviar también a A y B.
            // Si el origen es A o B, evitar el duplicado.
            // Si se usa por privado, no enviar al privado.
            await sendToRecoveryGroups(conn, m.chat, item)

            // No enviar confirmación de guardado al chat de origen.
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
    'recovered <numero>',
    'recovered borrar <numero>',
    'recovered papelera',
    'recovered restaurar <numero>',
    'recoveredlist',
    'recovered ayuda'
]

handler.tags = ['owner']
handler.command = /^(ver|r|recovered|recoveredlist)$/i

export default handler
