
/**
 * 📂 lib/print.js
 * 🤖 WHATSAPP-BOT — CONSOLA DE MENSAJES
 *
 * ✅ Detecta imágenes de ver una vez
 * ✅ Detecta videos de ver una vez
 * ✅ Compatible con Baileys ES Modules
 * ✅ Compatible con Node.js 22 y 24
 * ✅ Corrige error de level undefined
 * ✅ Compatible con usuarios LID
 * ✅ Mantiene el formato de consola
 * ✅ No descarga contenido de ver una vez
 */

import PhoneNumber from 'awesome-phonenumber'
import chalk from 'chalk'
import { watchFile } from 'fs'
import { fileURLToPath } from 'url'

const urlRegex = (
    await import('url-regex-safe')
).default({ strict: false })

// ============================================================
// 📱 FORMATEAR NÚMEROS
// ============================================================

function formatPhone(jid = '') {
    try {
        if (!jid) return 'Desconocido'

        if (jid.endsWith('@lid')) {
            return jid.split('@')[0] + ' (LID)'
        }

        const number = jid
            .split('@')[0]
            .split(':')[0]

        const phone = PhoneNumber('+' + number)
            .getNumber('international')

        return phone || '+' + number

    } catch {
        return jid || 'Desconocido'
    }
}

// ============================================================
// 👁️ DETECTAR MENSAJES DE VER UNA VEZ
// ============================================================

function detectarViewOnce(m) {
    const result = {
        viewOnce: false,
        tipo: null,
        formato: null
    }

    try {
        let contenido = m?.message

        for (let i = 0; i < 12 && contenido; i++) {
            if (contenido.viewOnceMessage) {
                result.viewOnce = true
                result.formato = 'viewOnceMessage'
            }

            if (contenido.viewOnceMessageV2) {
                result.viewOnce = true
                result.formato = 'viewOnceMessageV2'
            }

            if (contenido.viewOnceMessageV2Extension) {
                result.viewOnce = true
                result.formato = 'viewOnceMessageV2Extension'
            }

            if (contenido.imageMessage) {
                result.tipo = 'IMAGEN'

                if (contenido.imageMessage.viewOnce === true) {
                    result.viewOnce = true
                    result.formato ||= 'imageMessage'
                }
            }

            if (contenido.videoMessage) {
                result.tipo = 'VIDEO'

                if (contenido.videoMessage.viewOnce === true) {
                    result.viewOnce = true
                    result.formato ||= 'videoMessage'
                }
            }

            const siguiente =
                contenido.ephemeralMessage?.message ||
                contenido.viewOnceMessage?.message ||
                contenido.viewOnceMessageV2?.message ||
                contenido.viewOnceMessageV2Extension?.message ||
                contenido.documentWithCaptionMessage?.message ||
                contenido.editedMessage?.message

            if (!siguiente) break

            contenido = siguiente
        }

        // Mensaje normalizado por smsg()
        if (m?.msg?.viewOnce === true) {
            result.viewOnce = true
            result.formato ||= 'viewOnce'
        }

        if (
            /viewonce/i.test(m?.mtype || '')
        ) {
            result.viewOnce = true
            result.formato ||= m.mtype
        }

        // Tipo de contenido cuando ya fue normalizado
        if (!result.tipo) {
            if (
                /image/i.test(m?.mtype || '') ||
                m?.msg?.mimetype?.startsWith('image/')
            ) {
                result.tipo = 'IMAGEN'
            } else if (
                /video/i.test(m?.mtype || '') ||
                m?.msg?.mimetype?.startsWith('video/')
            ) {
                result.tipo = 'VIDEO'
            }
        }

    } catch (error) {
        console.error('[VIEW ONCE ERROR]', error)
    }

    return result
}

// ============================================================
// 📦 CALCULAR TAMAÑO DEL MENSAJE
// ============================================================

function getFileSize(m) {
    try {
        const msg = m?.msg || {}

        const size =
            msg.vcard?.length ||
            msg.fileLength?.low ||
            msg.fileLength ||
            msg.axolotlSenderKeyDistributionMessage?.length ||
            m?.text?.length ||
            0

        return Number(size) || 0

    } catch {
        return 0
    }
}

function formatSize(size) {
    if (!size || size <= 0) {
        return {
            value: 0,
            unit: ''
        }
    }

    const units = ['', 'K', 'M', 'G', 'T', 'P']

    const i = Math.min(
        Math.floor(Math.log(size) / Math.log(1000)),
        units.length - 1
    )

    return {
        value: (size / 1000 ** i).toFixed(1),
        unit: units[i]
    }
}

// ============================================================
// 🖥️ IMPRESIÓN PRINCIPAL
// ============================================================

export default async function print(
    m,
    conn = { user: {} }
) {
    if (!m) return

    try {
        // ====================================================
        // 👤 REMITENTE
        // ====================================================

        const senderJid =
            m.sender ||
            m.key?.participant ||
            m.key?.remoteJid ||
            ''

        const chatJid =
            m.chat ||
            m.key?.remoteJid ||
            ''

        let _name = ''

        try {
            _name = await conn.getName(senderJid)
        } catch {}

        const sender =
            formatPhone(senderJid) +
            (_name ? ' ~' + _name : '')

        // ====================================================
        // 💬 CHAT
        // ====================================================

        let chat = ''

        try {
            chat = await conn.getName(chatJid)
        } catch {}

        const isGroup =
            m.isGroup ||
            chatJid.endsWith('@g.us')

        const chatName = chat
            ? (
                isGroup
                    ? 'Grupo: ' + chat
                    : 'Chat privado: ' + chat
            )
            : (
                isGroup
                    ? 'Grupo: ' + chatJid
                    : 'Chat privado'
            )

        // ====================================================
        // 👑 BOT
        // ====================================================

        const botJid =
            conn.user?.jid ||
            conn.user?.id ||
            ''

        const me =
            formatPhone(botJid) +
            ' ~' +
            (conn.user?.name || 'bot')

        // ====================================================
        // 🗃️ INFORMACIÓN DEL USUARIO
        // ====================================================

        const user =
            global.db?.data?.users?.[senderJid] ||
            global.db?.data?.users?.[m.sender] ||
            {}

        const exp = Number(user.exp || 0)
        const level = Number(user.level || 0)

        const limit =
            user.limit !== undefined
                ? user.limit
                : 0

        const userInfo =
            `${m.exp ?? 0}|${exp}|${limit}|${level}`

        // ====================================================
        // ⏰ HORA
        // ====================================================

        const hora = new Date().toLocaleTimeString(
            'es-UY',
            {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'America/Montevideo'
            }
        )

        // ====================================================
        // 📦 TAMAÑO
        // ====================================================

        const filesize = getFileSize(m)
        const formattedSize = formatSize(filesize)

        // ====================================================
        // 👁️ VIEW ONCE
        // ====================================================

        const viewOnce = detectarViewOnce(m)

        let tipoMensaje = ''

        if (viewOnce.viewOnce) {
            const tipo = viewOnce.tipo || 'MULTIMEDIA'

            tipoMensaje =
                `👁️ ${viewOnce.formato || 'viewOnce'} (${tipo})`

        } else if (m.mtype) {
            tipoMensaje = m.mtype
                .replace(/message$/i, '')
                .replace(
                    /audio/i,
                    m.msg?.ptt ? 'PTT' : 'audio'
                )
                .replace(/^./, v => v.toUpperCase())
        } else {
            tipoMensaje = 'Desconocido'
        }

        // ====================================================
        // 🖥️ FORMATO ORIGINAL DE CONSOLA
        // ====================================================

        console.log(`
╭────────────────────────────────···
│❍  ${chalk.black(chalk.bgCyanBright(me))}
│⧖ㅤ${chalk.cyanBright(hora)}
│⎙ㅤ${chalk.cyanBright(String(m.messageStubType ?? 'WAMessageStubType'))}
│⌨ㅤ${chalk.cyanBright(`${filesize} [${formattedSize.value} ${formattedSize.unit}B]`)}
│✦ㅤ${chalk.white(sender)}
│⚑ㅤ${chalk.cyanBright(userInfo)}
│❑ㅤ${chalk.cyanBright(chatName)}
│⎙ ⎗ㅤ${chalk.cyanBright(tipoMensaje)}
╰───────────────────···
`.trim())

        // ====================================================
        // 🖼️ MOSTRAR IMAGEN NORMAL EN TERMINAL
        // ====================================================

        if (
            global.opts?.img &&
            !viewOnce.viewOnce &&
            /sticker|image/i.test(m.mtype || '') &&
            typeof m.download === 'function'
        ) {
            try {
                const terminalImage = await import('terminal-image')

                const imageBuffer = await m.download()

                const imagen = await terminalImage.default.buffer(
                    imageBuffer
                )

                if (imagen) {
                    console.log(imagen.trimEnd())
                }

            } catch (error) {
                console.error(
                    '[PRINT IMAGE ERROR]',
                    error.message
                )
            }
        }

        // ====================================================
        // 📝 IMPRIMIR TEXTO
        // ====================================================

        if (
            typeof m.text === 'string' &&
            m.text.length
        ) {
            let log = m.text.replace(/\u200e+/g, '')

            const mdRegex =
                /(?<=(?:^|[\s\n])\S?)(?:([*_~])(.+?)\1|```([\s\S]+?)```)(?=\S?(?:[\s\n]|$))/g

            const mdFormat = (depth = 4) =>
                (_, type, content, monospace) => {
                    const types = {
                        _: 'italic',
                        '*': 'bold',
                        '~': 'strikethrough'
                    }

                    const value = content || monospace || ''

                    if (!types[type] || depth < 1) {
                        return value
                    }

                    return chalk[types[type]](
                        value.replace(
                            mdRegex,
                            mdFormat(depth - 1)
                        )
                    )
                }

            if (log.length < 4096) {
                log = log.replace(
                    urlRegex,
                    (url, i, text) => {
                        const end = url.length + i

                        return (
                            i === 0 ||
                            end === text.length ||
                            (
                                /^\s$/.test(text[end]) &&
                                /^\s$/.test(text[i - 1])
                            )
                        )
                            ? chalk.blueBright(url)
                            : url
                    }
                )
            }

            log = log.replace(
                mdRegex,
                mdFormat(4)
            )

            if (m.mentionedJid) {
                for (const jid of m.mentionedJid) {
                    try {
                        const name = await conn.getName(jid)

                        log = log.replace(
                            '@' + jid.split('@')[0],
                            chalk.blueBright('@' + name)
                        )
                    } catch {}
                }
            }

            console.log(
                m.error != null
                    ? chalk.red(log)
                    : m.isCommand
                        ? chalk.yellow(log)
                        : log
            )
        }

        // ====================================================
        // 👥 EVENTOS DE GRUPO
        // ====================================================

        if (m.messageStubParameters) {
            const nombres = []

            for (const jidOriginal of m.messageStubParameters) {
                try {
                    const jid = conn.decodeJid
                        ? conn.decodeJid(jidOriginal)
                        : jidOriginal

                    const name = await conn.getName(jid)

                    nombres.push(
                        chalk.gray(
                            `${formatPhone(jid)} (${name || 'Desconocido'})`
                        )
                    )
                } catch {}
            }

            if (nombres.length) {
                console.log(nombres.join(', '))
            }
        }

        // ====================================================
        // 📂 DOCUMENTOS Y MULTIMEDIA
        // ====================================================

        if (/document/i.test(m.mtype || '')) {
            console.log(
                `🗂️ ${m.msg?.fileName || m.msg?.displayName || 'Document'}`
            )

        } else if (/contactsarray/i.test(m.mtype || '')) {
            console.log('👨‍👩‍👧‍👦 Contactos')

        } else if (/contact/i.test(m.mtype || '')) {
            console.log(
                `👨 ${m.msg?.displayName || ''}`
            )

        } else if (/audio/i.test(m.mtype || '')) {
            const duration = Number(
                m.msg?.seconds || 0
            )

            const minutos = Math.floor(duration / 60)
                .toString()
                .padStart(2, '0')

            const segundos = (duration % 60)
                .toString()
                .padStart(2, '0')

            console.log(
                `${m.msg?.ptt ? '🎤ㅤ(PTT ' : '🎵ㅤ('}AUDIO) ${minutos}:${segundos}`
            )
        }

        if (viewOnce.viewOnce) {
            console.log(
                chalk.magentaBright(
                    `👁️ VER UNA VEZ DETECTADO — ${viewOnce.tipo || 'MULTIMEDIA'}`
                )
            )
        }

        console.log()

    } catch (error) {
        console.error('[PRINT ERROR]', error)
    }
}

// ============================================================
// 🔄 RECARGA AUTOMÁTICA
// ============================================================

const file = fileURLToPath(import.meta.url)

watchFile(file, () => {
    console.log(
        chalk.redBright("Update 'lib/print.js'")
    )
})
