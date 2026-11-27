
/**
 * 📂 plugins/_sortear.js
 * 🤖 whatsapp-bot — SORTEOS
 *
 * 🎁 Premio personalizado
 * 🎲 Ganador completamente aleatorio
 * 👑 Exclusivo para owners
 * 👥 Solo grupos
 * 🛡️ Compatible con LID
 * 🚫 Excluye al bot
 * 🔇 Sin mensajes privados
 */

import { randomInt } from 'node:crypto'
import { jidNormalizedUser } from '@whiskeysockets/baileys'

const processing = new Set()

const handler = async (m, {
    conn,
    text = '',
    args = [],
    isOwner,
    isROwner
}) => {

    if (!m.isGroup) return

    // 👑 Exclusivo para owners.

    if (!(isOwner || isROwner || m.fromMe)) return

    if (processing.has(m.chat)) return

    const premio = String(
        text || args.join(' ') || ''
    ).trim()

    if (!premio) {

        return m.reply(
            '🎁 *Ingresá el premio del sorteo.*\n\n' +
            'Ejemplo:\n' +
            '.sortear una noche en un jacuzzi'
        )

    }

    processing.add(m.chat)

    try {

        await react(conn, m, '🎲')

        // 👥 Obtener participantes.

        const metadata = await conn.groupMetadata(m.chat)

        const botIds = new Set(
            [
                conn.user?.id,
                conn.user?.lid,
                conn.user?.phoneNumber
            ]
                .filter(Boolean)
                .map(id => jidNormalizedUser(id))
        )

        const participantes = new Map()

        for (const p of metadata.participants || []) {

            const ids = [
                p.id,
                p.lid,
                p.phoneNumber,
                p.jid
            ]
                .filter(id =>
                    typeof id === 'string' &&
                    id.includes('@')
                )
                .map(id => jidNormalizedUser(id))

            if (!ids.length) continue

            // Excluir al bot.

            if (ids.some(id => botIds.has(id))) continue

            // Evitar participantes duplicados.

            const key = ids.find(
                id => id.endsWith('@s.whatsapp.net')
            ) || ids[0]

            participantes.set(key, ids[0])

        }

        const elegibles = [...participantes.values()]

        if (!elegibles.length) {

            await react(conn, m, '❌')

            return m.reply(
                '❌ No hay participantes disponibles.'
            )

        }

        // 🎉 Anunciar sorteo.

        await conn.sendMessage(m.chat, {
            text: `╭━━━〔 🎲 *SORTEO* 〕━━━╮
┃
┃ 🎁 *Premio:* ${premio}
┃ 👥 *Participantes:* ${elegibles.length}
┃ 🏠 *Grupo:* ${metadata.subject}
┃
┃ ⏳ Seleccionando ganador...
┃
╰━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: m })

        await new Promise(
            resolve => setTimeout(resolve, 3000)
        )

        // 🎲 Elegir ganador aleatorio.

        const ganador = elegibles[
            randomInt(elegibles.length)
        ]

        const mention = ganador.split('@')[0]

        // 🏆 Anunciar ganador.

        await conn.sendMessage(m.chat, {

            text: `╭━━━〔 🎉 *SORTEO FINALIZADO* 〕━━━╮
┃
┃ 🏆 *Ganador:* @${mention}
┃ 🎁 *Premio:* ${premio}
┃ 👥 *Participantes:* ${elegibles.length}
┃
┃ 🥳 ¡Muchas felicidades!
┃
╰━━━━━━━━━━━━━━━━━━━━╯

> 🤖 WHATSAPP-BOT`,

            mentions: [ganador]

        }, { quoted: m })

        await react(conn, m, '🎉')

    } catch (error) {

        console.error('[SORTEAR] ERROR:', error)

        await react(conn, m, '❌')

        await m.reply(
            '❌ No se pudo realizar el sorteo.'
        )

    } finally {

        processing.delete(m.chat)

    }

}

// 🎭 Reacciones.

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

// ⚙️ Configuración.

handler.help = ['sortear <premio>']
handler.tags = ['game']
handler.command = /^sortear$/i

handler.group = true
handler.rowner = true
handler.register = false
handler.limit = false

export default handler
