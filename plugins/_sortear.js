
/**
 * 📂 plugins/_sortear.js
 * 🤖 whatsapp-bot — SORTEOS
 *
 * 🎁 Premio personalizado
 * 🎲 Ganador aleatorio
 * 👑 Exclusivo para owners
 * 👥 Solo grupos
 * 🛡️ Compatible con LID
 * 🔇 Sin spam ni mensajes privados
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

    // 🚫 Evitar sorteos simultáneos.
    if (processing.has(m.chat)) return

    const premio = String(
        text || args.join(' ') || ''
    ).trim()

    if (!premio) {
        return m.reply(
            '🎁 Uso: .sortear <premio>'
        )
    }

    processing.add(m.chat)

    try {

        const metadata = await conn.groupMetadata(m.chat)

        // 🤖 Identificar al bot.
        const botIds = new Set(
            [
                conn.user?.id,
                conn.user?.lid,
                conn.user?.phoneNumber
            ]
                .filter(id =>
                    typeof id === 'string' &&
                    id.includes('@')
                )
                .map(id => jidNormalizedUser(id))
        )

        const participantes = new Map()

        // 👥 Obtener participantes.
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
            return m.reply(
                '❌ No hay participantes disponibles.'
            )
        }

        // 🎲 Elegir ganador.
        const ganador = elegibles[
            randomInt(elegibles.length)
        ]

        const mention = ganador.split('@')[0]

        // 🏆 Enviar únicamente el resultado.
        await conn.sendMessage(m.chat, {

            text: `╭━━〔 🎉 *SORTEO* 〕━━╮
┃
┃ 🏆 *Ganador:* @${mention}
┃ 🎁 *Premio:* ${premio}
┃ 👥 *Participantes:* ${elegibles.length}
┃
┃ 🥳 ¡Felicidades!
╰━━━━━━━━━━━━━━━━╯`,

            mentions: [ganador]

        }, { quoted: m })

    } catch (error) {

        console.error('[SORTEAR] ERROR:', error)

        await m.reply(
            '❌ No se pudo realizar el sorteo.'
        )

    } finally {

        processing.delete(m.chat)

    }

}

handler.help = ['sortear <premio>']
handler.tags = ['game']
handler.command = /^sortear$/i

handler.group = true
handler.rowner = true
handler.register = false
handler.limit = false

export default handler
