
/**
 * 📂 handler.js
 * 🤖 WHATSAPP-BOT — HANDLER PRINCIPAL
 * 👁️ Detector View Once para consola
 * Baileys ES Modules
 */

import { smsg } from './lib/simple.js'
import { format } from 'util'
import * as ws from 'ws'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'
import { manejarRespuestasBotones } from './lib/botones.js'
import { manejarRespuestasStickers } from './lib/stickers.js'

const { proto } = (await import('@whiskeysockets/baileys')).default

const isNumber = x => typeof x === 'number' && !isNaN(x)

const delay = ms =>
    isNumber(ms) &&
    new Promise(resolve => setTimeout(resolve, ms))

const normalizeJid = jid => jid?.replace(/[^0-9]/g, '')
const cleanJid = jid => jid?.split(':')[0] || ''

// ============================================================
// 👁️ DETECTOR DE VER UNA VEZ
// ============================================================

function inspectViewOnce(raw) {
    let content = raw?.message
    let wrapper = null
    let media = null

    const seen = new Set()

    for (
        let i = 0;
        i < 12 && content && typeof content === 'object';
        i++
    ) {
        if (seen.has(content)) break
        seen.add(content)

        if (content.imageMessage) {
            media = 'IMAGEN'

            if (content.imageMessage.viewOnce === true) {
                wrapper ||= 'imageMessage (viewOnce)'
            }
        }

        if (content.videoMessage) {
            media = 'VIDEO'

            if (content.videoMessage.viewOnce === true) {
                wrapper ||= 'videoMessage (viewOnce)'
            }
        }

        const wrappers = [
            'viewOnceMessage',
            'viewOnceMessageV2',
            'viewOnceMessageV2Extension'
        ]

        let next = null

        for (const type of wrappers) {
            if (content[type]) {
                wrapper ||= type
                next = content[type].message
                break
            }
        }

        if (!next) {
            next =
                content.ephemeralMessage?.message ||
                content.documentWithCaptionMessage?.message ||
                content.editedMessage?.message
        }

        if (!next) break

        content = next
    }

    return wrapper
        ? {
            wrapper,
            media: media || 'MULTIMEDIA'
        }
        : null
}

// ============================================================
// ⚠️ MANEJADOR DE ERRORES
// ============================================================

global.dfail = async (type, m, conn) => {
    try {
        if (typeof global.failureHandler === 'function') {
            return await global.failureHandler(
                type,
                conn,
                m,
                global.comando
            )
        }

        const mensajes = {
            owner: '⛔ Solo los owners pueden utilizar este comando.',
            rowner: '⛔ Solo el owner principal puede utilizarlo.',
            mods: '⛔ Solo los moderadores pueden utilizarlo.',
            premium: '⛔ Este comando es exclusivo para usuarios premium.',
            admin: '⛔ Solo los administradores pueden utilizarlo.',
            botAdmin: '⛔ El bot necesita ser administrador.',
            private: '⛔ Este comando solamente funciona en privado.',
            group: '⛔ Este comando solamente funciona en grupos.',
            unreg: '⛔ Necesitás registrarte para utilizar este comando.'
        }

        return await m.reply(
            mensajes[type] || '⛔ No tenés permisos para usar este comando.'
        )
    } catch (error) {
        console.error('[DFAIL ERROR]', error)
    }
}

// ============================================================
// 📩 HANDLER PRINCIPAL
// ============================================================

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || []
    this.uptime = this.uptime || Date.now()

    if (!chatUpdate?.messages?.length) return

    // ========================================================
    // 👁️ DETECTAR MENSAJES ORIGINALES
    // ========================================================

    for (const raw of chatUpdate.messages) {
        const info = inspectViewOnce(raw)

        if (info) {
            raw.__viewOnceInfo = info

            console.log(
                `[VIEW ONCE] ${info.wrapper} (${info.media}) | ` +
                `${raw.key?.remoteJid || 'Chat desconocido'}`
            )
        } else if (
            !raw?.message ||
            raw.message?.conversation?.includes(
                'Message absent from node'
            )
        ) {
            console.log(
                '[RECEPCIÓN] Mensaje sin contenido identificable.'
            )
        }
    }

    this.pushMessage(chatUpdate.messages).catch(console.error)

    let m = chatUpdate.messages[chatUpdate.messages.length - 1]

    if (!m) return

    const rawViewOnce =
        m.__viewOnceInfo ||
        inspectViewOnce(m)

    // ========================================================
    // 🔘 BOTONES Y STICKERS
    // ========================================================

    if (await manejarRespuestasBotones(this, m)) return
    if (await manejarRespuestasStickers(this, m)) return

    // ========================================================
    // 🤖 BOT PRINCIPAL
    // ========================================================

    if (m.isGroup) {
        const chat = global.db?.data?.chats?.[m.chat]

        if (chat?.primaryBot) {
            const universalWords = [
                'resetbot',
                'resetprimario',
                'botreset'
            ]

            const firstWord = m.text
                ? m.text.trim()
                    .split(' ')[0]
                    .toLowerCase()
                    .replace(/^[./#]/, '')
                : ''

            if (
                !universalWords.includes(firstWord) &&
                this?.user?.jid !== chat.primaryBot
            ) return
        }
    }

    if (global.db.data == null) {
        await global.loadDatabase()
    }

    let sender

    try {
        // ====================================================
        // 🔄 NORMALIZAR MENSAJE
        // ====================================================

        m = smsg(this, m) || m

        if (!m) return

        // Preservar la detección anterior a smsg()
        if (rawViewOnce) {
            m.__viewOnceInfo = rawViewOnce
        }

        sender = m.isGroup
            ? (m.key.participant || m.sender)
            : m.key.remoteJid

        // ====================================================
        // 👥 METADATOS Y LID
        // ====================================================

        const metadataOriginal = m.isGroup
            ? (
                this.chats[m.chat]?.metadata ||
                await this.groupMetadata(m.chat).catch(() => null) ||
                {}
            )
            : {}

        const groupMetadata_lid = m.isGroup
            ? {
                ...metadataOriginal,
                participants: (
                    metadataOriginal.participants || []
                ).map(p => ({
                    ...p,
                    id: p.jid || p.id,
                    jid: p.jid || p.id,
                    lid: p.lid
                }))
            }
            : {}

        const participants_lid = (
            groupMetadata_lid.participants || []
        ).map(participant => ({
            id: participant.jid,
            jid: participant.jid,
            lid: participant.lid,
            admin: participant.admin
        }))

        if (
            m.isGroup &&
            sender?.endsWith('@lid')
        ) {
            const participantInfo = participants_lid.find(
                p => p.lid === sender
            )

            if (participantInfo?.jid) {
                sender = participantInfo.jid
            }
        }

        m.exp = 0
        m.coin = false

        // ====================================================
        // 🗃️ BASE DE DATOS
        // ====================================================

        try {
            global.db.data.users ||= {}
            global.db.data.chats ||= {}
            global.db.data.settings ||= {}

            let user = global.db.data.users[sender]

            if (!user || typeof user !== 'object') {
                user = global.db.data.users[sender] = {}
            }

            const userDefaults = {
                exp: 0,
                coin: 10,
                joincount: 1,
                diamond: 3,
                lastadventure: 0,
                lastclaim: 0,
                health: 100,
                crime: 0,
                lastcofre: 0,
                lastdiamantes: 0,
                lastpago: 0,
                lastcode: 0,
                lastcodereg: 0,
                lastduel: 0,
                lastmining: 0,
                muto: false,
                premium: false,
                premiumTime: 0,
                registered: false,
                genre: '',
                birth: '',
                marry: '',
                description: '',
                packstickers: null,
                name: m.name,
                age: -1,
                regTime: -1,
                afk: -1,
                afkReason: '',
                role: 'Nuv',
                banned: false,
                useDocument: false,
                level: 0,
                bank: 0,
                warn: 0
            }

            for (const [key, value] of Object.entries(userDefaults)) {
                if (!(key in user)) {
                    user[key] = value
                }
            }

            if (!user.premium) {
                user.premiumTime = 0
            }

            let chat = global.db.data.chats[m.chat]

            if (!chat || typeof chat !== 'object') {
                chat = global.db.data.chats[m.chat] = {}
            }

            const chatDefaults = {
                isBanned: false,
                sAutoresponder: '',
                welcome: true,
                autolevelup: false,
                autoAceptar: false,
                autosticker: false,
                autoRechazar: false,
                autoresponder: false,
                detect: true,
                antiBot: false,
                antiBot2: false,
                modoadmin: false,
                antiLink: true,
                antiImg: false,
                reaction: false,
                nsfw: false,
                antifake: false,
                delete: false,
                expired: 0,
                antiLag: false,
                per: []
            }

            for (const [key, value] of Object.entries(chatDefaults)) {
                if (!(key in chat)) {
                    chat[key] = value
                }
            }

            let settings =
                global.db.data.settings[this.user.jid]

            if (!settings || typeof settings !== 'object') {
                settings =
                    global.db.data.settings[this.user.jid] = {}
            }

            const settingsDefaults = {
                self: false,
                restrict: true,
                jadibotmd: true,
                antiPrivate: false,
                autoread: false,
                status: 0
            }

            for (const [key, value] of Object.entries(settingsDefaults)) {
                if (!(key in settings)) {
                    settings[key] = value
                }
            }
        } catch (e) {
            console.error('[DATABASE ERROR]', e)
        }

        // ====================================================
        // 🤖 SUBBOTS
        // ====================================================

        const mainBot = global.conn.user.jid
        const chat = global.db.data.chats[m.chat] || {}
        const isSubbs = chat.antiLag === true
        const allowedBots = chat.per || []

        if (!allowedBots.includes(mainBot)) {
            allowedBots.push(mainBot)
        }

        const isAllowed = allowedBots.includes(this.user.jid)

        if (isSubbs && !isAllowed) return

        if (opts['nyimak']) return
        if (!m.fromMe && opts['self']) return
        if (opts['swonly'] && m.chat !== 'status@broadcast') return

        if (typeof m.text !== 'string') {
            m.text = ''
        }

        // ====================================================
        // 👥 PARTICIPANTES
        // ====================================================

        const _user = global.db.data.users[sender] || {}

        const groupMetadata = m.isGroup
            ? groupMetadata_lid
            : {}

        const participants = (
            groupMetadata.participants || []
        ).map(participant => ({
            id: participant.jid,
            jid: participant.jid,
            lid: participant.lid,
            admin: participant.admin
        }))

        const user = (
            m.isGroup
                ? participants.find(
                    u => this.decodeJid(u.jid) === sender
                )
                : {}
        ) || {}

        const bot = (
            m.isGroup
                ? participants.find(
                    u => this.decodeJid(u.jid) === this.user.jid
                )
                : {}
        ) || {}

        const isRAdmin = user?.admin === 'superadmin'
        const isAdmin =
            isRAdmin || user?.admin === 'admin'
        const isBotAdmin = !!bot?.admin

        // ====================================================
        // 👑 OWNERS
        // ====================================================

        const senderNum = sender.split('@')[0]

        const ownerNumbers = [
            conn.decodeJid(global.conn.user.id),
            ...global.owner.map(([number]) => number)
        ].map(v => String(v).replace(/[^0-9]/g, ''))

        const isROwner = ownerNumbers.includes(senderNum)
        const isOwner = isROwner || m.fromMe

        const isMods =
            isOwner ||
            global.mods
                .map(v => String(v).replace(/[^0-9]/g, ''))
                .includes(senderNum)

        const isPrems =
            isROwner ||
            global.prems
                .map(v => String(v).replace(/[^0-9]/g, ''))
                .includes(senderNum) ||
            _user.premium === true

        // ====================================================
        // ⏳ COLA
        // ====================================================

        if (
            opts['queque'] &&
            m.text &&
            !(isMods || isPrems)
        ) {
            const queque = this.msgqueque
            const id = m.id || m.key.id

            queque.push(id)

            while (queque[0] !== id) {
                await delay(500)
            }
        }

        if (m.isBaileys) return

        m.exp += Math.ceil(Math.random() * 10)

        let usedPrefix

        // ====================================================
        // 🧩 PLUGINS
        // ====================================================

        const ___dirname = path.join(
            path.dirname(fileURLToPath(import.meta.url)),
            './plugins'
        )

        for (const name in global.plugins) {
            const plugin = global.plugins[name]

            if (!plugin || plugin.disabled) continue

            const __filename = join(___dirname, name)

            // Plugins globales
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: ___dirname,
                        __filename
                    })
                } catch (e) {
                    console.error(e)
                }
            }

            if (
                !opts['restrict'] &&
                plugin.tags?.includes('admin')
            ) continue

            const str2Regex = str =>
                str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')

            const _prefix = plugin.customPrefix
                ? plugin.customPrefix
                : conn.prefix
                    ? conn.prefix
                    : global.prefix

            const match = (
                _prefix instanceof RegExp
                    ? [[_prefix.exec(m.text), _prefix]]
                    : Array.isArray(_prefix)
                        ? _prefix.map(p => {
                            const re = p instanceof RegExp
                                ? p
                                : new RegExp(str2Regex(p))

                            return [re.exec(m.text), re]
                        })
                        : typeof _prefix === 'string'
                            ? [[
                                new RegExp(str2Regex(_prefix)).exec(m.text),
                                new RegExp(str2Regex(_prefix))
                            ]]
                            : [[[], new RegExp]]
            ).find(p => p[0])

            if (!match) continue

            // =================================================
            // 🔎 BEFORE
            // =================================================

            if (typeof plugin.before === 'function') {
                try {
                    if (
                        await plugin.before.call(this, m, {
                            match,
                            conn: this,
                            participants,
                            groupMetadata,
                            user,
                            bot,
                            isROwner,
                            isOwner,
                            isRAdmin,
                            isAdmin,
                            isBotAdmin,
                            isPrems,
                            chatUpdate,
                            __dirname: ___dirname,
                            __filename
                        })
                    ) continue
                } catch (e) {
                    console.error(e)
                    continue
                }
            }

            if (typeof plugin !== 'function') continue

            usedPrefix = match[0]?.[0]

            if (!usedPrefix) continue

            const noPrefix = m.text.replace(usedPrefix, '')

            let [command, ...args] = noPrefix
                .trim()
                .split(' ')
                .filter(Boolean)

            args ||= []

            const _args = noPrefix.trim().split(' ').slice(1)
            const text = _args.join(' ')

            command = (command || '').toLowerCase()

            const fail = plugin.fail || global.dfail

            const isAccept =
                plugin.command instanceof RegExp
                    ? plugin.command.test(command)
                    : Array.isArray(plugin.command)
                        ? plugin.command.some(cmd =>
                            cmd instanceof RegExp
                                ? cmd.test(command)
                                : cmd === command
                        )
                        : typeof plugin.command === 'string'
                            ? plugin.command === command
                            : false

            global.comando = command

            if (
                m.id?.startsWith('NJX-') ||
                (m.id?.startsWith('BAE5') && m.id.length === 16) ||
                (m.id?.startsWith('B24E') && m.id.length === 20)
            ) return

            if (!isAccept) continue

            m.plugin = name

            // =================================================
            // ⛔ BAN Y ANTISPAM
            // =================================================

            const chatData = global.db.data.chats[m.chat] || {}
            const userData = global.db.data.users[sender] || {}

            if (
                ![
                    'grupo-unbanchat.js',
                    'owner-exec.js',
                    'owner-exec2.js',
                    'grupo-delete.js'
                ].includes(name) &&
                chatData.isBanned &&
                !isROwner
            ) return

            if (!isROwner && (userData.antispam || 0) > 2) {
                return
            }

            if (userData.banned && !isROwner) {
                if (m.text) {
                    await m.reply(
                        `《✦》 Estás baneado/a, no podés utilizar comandos.\n\n` +
                        `✰ Motivo: ${userData.bannedReason || 'Sin especificar'}`
                    )
                }
                return
            }

            const now = Date.now()

            if (
                !isOwner &&
                !isAdmin &&
                now - (userData.spam || 0) < 3000
            ) {
                console.log('[ SPAM ]')
                return
            }

            userData.spam = now

            // =================================================
            // 🔐 MODO ADMIN
            // =================================================

            const adminMode = chatData.modoadmin

            if (
                adminMode &&
                !isOwner &&
                !isROwner &&
                m.isGroup &&
                !isAdmin
            ) return

            // =================================================
            // 🛡️ PERMISOS
            // =================================================

            if (
                plugin.rowner &&
                plugin.owner &&
                !(isROwner || isOwner)
            ) {
                await fail('owner', m, this)
                continue
            }

            if (plugin.rowner && !isROwner) {
                await fail('rowner', m, this)
                continue
            }

            if (plugin.owner && !isOwner) {
                await fail('owner', m, this)
                continue
            }

            if (plugin.mods && !isMods) {
                await fail('mods', m, this)
                continue
            }

            if (plugin.premium && !isPrems) {
                await fail('premium', m, this)
                continue
            }

            if (plugin.admin && !isAdmin) {
                await fail('admin', m, this)
                continue
            }

            if (plugin.botAdmin && !isBotAdmin) {
                await fail('botAdmin', m, this)
                continue
            }

            if (plugin.private && m.isGroup) {
                await fail('private', m, this)
                continue
            }

            if (plugin.group && !m.isGroup) {
                await fail('group', m, this)
                continue
            }

            if (plugin.register && !_user.registered) {
                await fail('unreg', m, this)
                continue
            }

            // =================================================
            // ⭐ EXPERIENCIA
            // =================================================

            m.isCommand = true

            const xp = 'exp' in plugin
                ? parseInt(plugin.exp)
                : 17

            if (xp > 200) {
                await m.reply('chirrido -_-')
            } else {
                m.exp += xp
            }

            // =================================================
            // 🪙 MONEDAS
            // =================================================

            if (
                !isPrems &&
                plugin.coin &&
                userData.coin < Number(plugin.coin)
            ) {
                await conn.reply(
                    m.chat,
                    `❮✦❯ Se agotaron tus ${global.moneda || 'monedas'}`,
                    m
                )
                continue
            }

            // =================================================
            // 📈 NIVELES
            // =================================================

            if ((plugin.level || 0) > (_user.level || 0)) {
                await conn.reply(
                    m.chat,
                    `❮✦❯ Se requiere el nivel: *${plugin.level}*\n\n` +
                    `• Tu nivel actual es: *${_user.level || 0}*\n\n` +
                    `• Usá *${usedPrefix}levelup* para subir de nivel.`,
                    m
                )
                continue
            }

            // =================================================
            // 🚀 EJECUTAR COMANDO
            // =================================================

            const extra = {
                match,
                usedPrefix,
                noPrefix,
                _args,
                args,
                command,
                text,
                conn: this,
                participants,
                groupMetadata,
                user,
                bot,
                isROwner,
                isOwner,
                isRAdmin,
                isAdmin,
                isBotAdmin,
                isPrems,
                chatUpdate,
                __dirname: ___dirname,
                __filename
            }

            try {
                await plugin.call(this, m, extra)

                if (!isPrems) {
                    m.coin = m.coin || plugin.coin || false
                }
            } catch (e) {
                m.error = e
                console.error(e)

                let errorText = format(e)

                for (const key of Object.values(global.APIKeys || {})) {
                    if (!key) continue

                    errorText = errorText.split(
                        String(key)
                    ).join('Administrador')
                }

                await m.reply(errorText)
            } finally {
                if (typeof plugin.after === 'function') {
                    try {
                        await plugin.after.call(this, m, extra)
                    } catch (e) {
                        console.error(e)
                    }
                }

                if (m.coin) {
                    await conn.reply(
                        m.chat,
                        `❮✦❯ Utilizaste ${Number(m.coin)} ` +
                        `${global.moneda || 'monedas'}`,
                        m
                    )
                }
            }

            break
        }

    } catch (error) {
        console.error('[HANDLER ERROR]', error)

    } finally {
        // ====================================================
        // ⏳ LIBERAR COLA
        // ====================================================

        if (opts['queque'] && m?.text) {
            const id = m.id || m.key?.id
            const queueIndex = this.msgqueque.indexOf(id)

            if (queueIndex !== -1) {
                this.msgqueque.splice(queueIndex, 1)
            }
        }

        // ====================================================
        // 📊 ESTADÍSTICAS
        // ====================================================

        global.db.data.stats ||= {}

        const stats = global.db.data.stats

        if (m) {
            const utente = sender
                ? global.db.data.users[sender]
                : null

            if (utente?.muto === true) {
                await this.sendMessage(m.chat, {
                    delete: {
                        remoteJid: m.chat,
                        fromMe: false,
                        id: m.key.id,
                        participant: m.key.participant
                    }
                }).catch(console.error)
            }

            if (sender && utente) {
                utente.exp += m.exp || 0
                utente.coin -= Number(m.coin || 0)
            }

            if (m.plugin) {
                const now = Date.now()

                const stat = stats[m.plugin] || (
                    stats[m.plugin] = {
                        total: 0,
                        success: 0,
                        last: 0,
                        lastSuccess: 0
                    }
                )

                stat.total++
                stat.last = now

                if (m.error == null) {
                    stat.success++
                    stat.lastSuccess = now
                }
            }
        }

        // ====================================================
        // 🖥️ PRINT.JS
        // ====================================================

        try {
            if (!opts['noprint'] && m) {
                const print = (
                    await import('./lib/print.js')
                ).default

                await print(m, this)
            }
        } catch (error) {
            console.error('[PRINT ERROR]', error)
        }

        // ====================================================
        // 📖 LECTURA AUTOMÁTICA
        // ====================================================

        if (opts['autoread'] && m?.key) {
            await this.readMessages([m.key])
                .catch(console.error)
        }

        // ====================================================
        // 😄 REACCIONES AUTOMÁTICAS
        // ====================================================

        const reactionRegex =
            /(ción|dad|aje|oso|izar|mente|pero|tion|age|ous|ate|and|but|ify|ai|yuki|a|s)/gi

        const emojis = [
            '🍟', '😃', '😄', '😁', '😆', '🍓',
            '😅', '😂', '🤣', '🥲', '☺️', '😊',
            '😇', '🙂', '🙃', '😉', '😌', '😍',
            '🥰', '😘', '😗', '😙', '🌺', '🌸',
            '😚', '😋', '😛', '😝', '😜', '🤪',
            '🤨', '🌟', '🤓', '😎', '🥸', '🤩',
            '🥳', '😏', '💫', '😞', '😔', '😟',
            '😕', '🙁', '☹️', '😣', '😖', '😫',
            '😩', '🥺', '😢', '😭', '😤', '😠',
            '😡', '🤬', '🤯', '😳', '🥵', '🥶',
            '😱', '😨', '😰', '😥', '😓', '🤗',
            '🤔', '🫣', '🤭', '🤖', '🍭', '🤫',
            '🫠', '🤥', '😶', '😐', '💧', '😑',
            '🫨', '😬', '🙄', '😯', '😦', '😧',
            '😮', '😲', '🥱', '😴', '🤤', '😪',
            '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮',
            '🤧', '😷', '🤒', '🤕', '🤑', '🤠',
            '😈', '👿', '👺', '🧿', '🌩', '👻',
            '😺', '😸', '😹', '😻', '😼', '😽',
            '🙀', '😿', '😾', '🫶', '👍', '✌️',
            '🙏', '🫵', '🤏', '🤌', '☝️', '🖕',
            '🫂', '🐱', '🗿', '✨', '⚡', '🔥',
            '🌈', '🩷', '❤️', '🧡', '💛', '💚',
            '🩵', '💙', '💜', '🖤', '🩶', '🤍',
            '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️',
            '💕', '💞', '💓', '💗', '💖', '💘',
            '💝', '🚩', '👊', '💋', '🫰', '💅',
            '👑', '🐣', '🐤', '🐈'
        ]

        if (
            m?.chat &&
            global.db.data.chats[m.chat]?.reaction &&
            typeof m.text === 'string' &&
            reactionRegex.test(m.text) &&
            !m.fromMe
        ) {
            const emot = emojis[
                Math.floor(Math.random() * emojis.length)
            ]

            await this.sendMessage(m.chat, {
                react: {
                    text: emot,
                    key: m.key
                }
            }).catch(console.error)
        }
    }
}

// ============================================================
// 🔄 RECARGA AUTOMÁTICA
// ============================================================

const file = global.__filename(import.meta.url, true)

watchFile(file, async () => {
    unwatchFile(file)

    console.log(
        chalk.green('Actualizando "handler.js"')
    )

    if (global.conns?.length > 0) {
        const users = [
            ...new Set(
                global.conns.filter(conn =>
                    conn.user &&
                    conn.ws?.socket &&
                    conn.ws.socket.readyState !== ws.CLOSED
                )
            )
        ]

        for (const user of users) {
            if (typeof user.subreloadHandler === 'function') {
                await user.subreloadHandler(false)
            }
        }
    }
})

export default { handler }
