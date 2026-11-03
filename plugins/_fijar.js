/**
 * 📂 plugins/fijar.js
 * 📌 WHATSAPP-BOT — PIN IN CHAT
 *
 * .pin / .fijar
 * .unpin / .desfijar
 *
 * Owners y administradores.
 * Respondiendo al mensaje que se quiere fijar.
 */

import { proto } from '@whiskeysockets/baileys'

const activeGroups = new Set()

const PIN_DURATION = 604800 // 7 días

const handler = async (m, {
    conn,
    command,
    isAdmin,
    isOwner,
    isBotAdmin
}) => {

    if (!m.isGroup) {
        return m.reply('❌ Solo funciona en grupos.')
    }

    if (!isAdmin && !isOwner) {
        return m.reply(
            '⛔ Solo administradores y owners.'
        )
    }

    if (!isBotAdmin) {
        return m.reply(
            '❌ Necesito ser administrador del grupo.'
        )
    }

    if (!m.quoted?.id) {
        return m.reply(
            '📌 Respondé al mensaje que querés fijar o desfijar.'
        )
    }

    if (activeGroups.has(m.chat)) {
        return m.reply('⏳ Ya hay una operación en curso.')
    }

    activeGroups.add(m.chat)

    try {
        const fijar = /^(pin|fijar)$/i.test(command)

        const key = {
            remoteJid: m.chat,
            id: m.quoted.id,
            fromMe: Boolean(m.quoted.fromMe),
            participant: m.quoted.sender
        }

        const tipo = fijar
            ? proto.Message.ProtocolMessage.Type.PIN_IN_CHAT
            : proto.Message.ProtocolMessage.Type.UNPIN_IN_CHAT

        if (tipo === undefined) {
            throw new Error(
                'Esta versión de Baileys no expone el tipo de protocolo solicitado.'
            )
        }

        const mensaje = proto.Message.fromObject({
            protocolMessage: {
                type: tipo,
                key,
                ...(fijar
                    ? { pinInChat: PIN_DURATION }
                    : {})
            }
        })

        await conn.relayMessage(
            m.chat,
            mensaje,
            {
                messageId: conn.generateMessageTag
                    ? conn.generateMessageTag()
                    : undefined
            }
        )

        console.log(
            `[PIN IN CHAT] ${fijar ? 'FIJAR' : 'DESFIJAR'}`,
            key
        )

        await m.reply(
            fijar
                ? '📌 Solicitud de fijado enviada.'
                : '📍 Solicitud de desfijado enviada.'
        )

    } catch (error) {
        console.error('[PIN IN CHAT]', error)

        await m.reply(
            `❌ No se pudo completar la operación.\n${error.message}`
        )

    } finally {
        activeGroups.delete(m.chat)
    }
}

handler.help = ['pin', 'fijar', 'unpin', 'desfijar']
handler.tags = ['grupo']
handler.command = /^(pin|fijar|unpin|desfijar)$/i

handler.group = true

export default handler
