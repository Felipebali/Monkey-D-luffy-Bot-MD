
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

// ============================================================
// 🤖 WHATSAPP-BOT — HANDLER PRINCIPAL
// ============================================================

const { proto } = (await import('@whiskeysockets/baileys')).default

const isNumber = x => typeof x === 'number' && !isNaN(x)

const delay = ms => isNumber(ms) && new Promise(resolve => {
    setTimeout(resolve, ms)
})

const normalizeJid = jid => jid?.replace(/[^0-9]/g, '')
const cleanJid = jid => jid?.split(':')[0] || ''

// ============================================================
// 👁️ DETECTOR VIEW ONCE — CONSOLA
// ============================================================

function detectarViewOnce(incoming) {
    try {
        let content = incoming?.message
        let isViewOnce = false
        let mediaType = 'DESCONOCIDO'

        for (let depth = 0; depth < 12 && content; depth++) {
            if (
                content.viewOnceMessage ||
                content.viewOnceMessageV2 ||
                content.viewOnceMessageV2Extension
            ) {
                isViewOnce = true
            }

            if (content.imageMessage) {
                mediaType = 'IMAGEN'

                if (content.imageMessage.viewOnce === true) {
                    isViewOnce = true
                }
            }

            if (content.videoMessage) {
                mediaType = 'VIDEO'

                if (content.videoMessage.viewOnce === true) {
                    isViewOnce = true
                }
            }

            const next =
                content.ephemeralMessage?.message ||
                content.viewOnceMessage?.message ||
                content.viewOnceMessageV2?.message ||
                content.viewOnceMessageV2Extension?.message ||
                content.documentWithCaptionMessage?.message ||
                content.editedMessage?.message

            if (!next) break

            content = next
        }

        if (isViewOnce) {
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            console.log('👁️ WHATSAPP-BOT — VER UNA VEZ')
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            console.log('📸 Tipo:', mediaType)
            console.log('💬 Chat:', incoming.key?.remoteJid || 'Desconocido')
            console.log(
                '👤 Remitente:',
                incoming.key?.participant ||
                incoming.key?.remoteJid ||
                'Desconocido'
            )
            console.log('🆔 ID:', incoming.key?.id || 'Sin ID')
            console.log('✅ Mensaje detectado')
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        }
    } catch (error) {
        console.error('[VIEW ONCE] Error:', error)
    }
}

// ============================================================
// ⚠️ MANEJADOR DE ERRORES
// ============================================================

global.dfail = (type, m, conn) => {
    if (typeof global.failureHandler === 'function') {
        return global.failureHandler(type, conn, m, global.comando)
    }

    console.error('[DFAIL]', type)

    return m.reply('⛔ No tenés permisos para utilizar este comando.')
}

// ============================================================
// 📩 HANDLER PRINCIPAL
// ============================================================

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || []
    this.uptime = this.uptime || Date.now()

    if (!chatUpdate?.messages?.length) return

    // ========================================================
    // 👁️ DETECTAR VIEW ONCE ANTES DE PROCESAR
    // ========================================================

    for (const incoming of chatUpdate.messages) {
        detectarViewOnce(incoming)
    }

    this.pushMessage(chatUpdate.messages).catch(console.error)

    let m = chatUpdate.messages[chatUpdate.messages.length - 1]

    if (!m) return

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
                ? m.text.trim().split(' ')[0]
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
        m = smsg(this, m) || m

        if (!m) return

        sender = m.isGroup
            ? (m.key.participant || m.sender)
            : m.key.remoteJid

        // ====================================================
        // 👤 NORMALIZACIÓN LID
        // ====================================================

        const cachedMetadata = m.isGroup
            ? (
                this.chats[m.chat]?.metadata ||
                await this.groupMetadata(m.chat).catch(() => null) ||
                {}
            )
            : {}

        const groupMetadata_lid = m.isGroup
            ? {
                ...cachedMetadata,
                participants: (cachedMetadata.participants || []).map(p => ({
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

        if (m.isGroup && sender?.endsWith('@lid')) {
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

            if (typeof user !== 'object' || user === null) {
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

            if (typeof chat !== 'object' || chat === null) {
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

            let settings = global.db.data.settings[this.user.jid]

            if (typeof settings !== 'object' || settings === null) {
                settings = global.db.data.settings[this.user.jid] = {}
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
            console.error(e)
        }

        // ====================================================
        // 🤖 CONTROL DE SUBBOTS
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
        // 👥 METADATOS DEL GRUPO
        // ====================================================

        const _user = global.db.data.users[sender]

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
        const isAdmin = isRAdmin || user?.admin === 'admin'
        const isBotAdmin = !!bot?.admin

        // ====================================================
        // 👑 OWNERS Y PERMISOS
        // ====================================================

        const senderNum = sender.split('@')[0]

        const ownerNumbers = [
            conn.decodeJid(global.conn.user.id),
            ...global.owner.map(([number]) => number)
        ].map(v => String(v).replace(/[^0-9]/g, ''))

        const isROwner = ownerNumbers.includes(senderNum)
        const isOwner = isROwner || m.fromMe

        const isMods = isOwner || global.mods
            .map(v => v.replace(/[^0-9]/g, ''))
            .includes(senderNum)

        const isPrems =
            isROwner ||
            global.prems
                .map(v => v.replace(/[^0-9]/g, ''))
                .includes(senderNum) ||
            _user.premium === true

        // ====================================================
        // ⏳ COLA DE MENSAJES
        // ====================================================

        if (opts['queque'] && m.text && !(isMods || isPrems)) {
            const queque = this.msgqueque

            queque.push(m.id || m.key.id)

            while (queque[0] !== (m.id || m.key.id)) {
                await delay(500)
            }
        }

        if (m.isBaileys) return

        m.exp += Math.ceil(Math.random() * 10)

        let usedPrefix

        // ====================================================
        // 🧩 CARGADOR DE PLUGINS
        // ====================================================

        const ___dirname = path.join(
            path.dirname(fileURLToPath(import.meta.url)),
            './plugins'
        )

        for (const name in global.plugins) {
            const plugin = global.plugins[name]

            if (!plugin || plugin.disabled) continue

            const __filename = join(___dirname, name)

            // =================================================
            // 🌐 PLUGINS GLOBALES
            // =================================================

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
                    const skip = await plugin.before.call(this, m, {
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

                    if (skip) continue
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
            // ⛔ ANTISPAM Y BANEOS
            // =================================================

            if (
                m.chat in global.db.data.chats ||
                sender in global.db.data.users
            ) {
                const chat = global.db.data.chats[m.chat]
                const user = global.db.data.users[sender]

                if (
                    !['grupo-unbanchat.js'].includes(name) &&
                    chat?.isBanned &&
                    !isROwner
                ) return

                if (user.antispam > 2) return

                if (m.text && user.banned && !isROwner) {
                    await m.reply(
                        `《✦》 Estás baneado/a, no podés usar comandos.\n\n` +
                        `✰ Motivo: ${user.bannedReason || 'Sin especificar'}`
                    )

                    user.antispam = (user.antispam || 0) + 1
                    return
                }

                if (user.antispam2 && isROwner) return

                const now = Date.now()

                if (
                    !isOwner &&
                    !isAdmin &&
                    now - (user.spam || 0) < 3000
                ) {
                    console.log('[ SPAM ]')
                    return
                }

                user.spam = now

                if (
                    name !== 'owner-unbanuser.js' &&
                    user?.banned &&
                    !isROwner
                ) return
            }

            // =================================================
            // 🔐 MODO ADMIN
            // =================================================

            const adminMode =
                global.db.data.chats[m.chat]?.modoadmin

            if (
                adminMode &&
                !isOwner &&
                !isROwner &&
                m.isGroup &&
                !isAdmin
            ) return

            // =================================================
            // 🛡️ PERMISOS DE PLUGINS
            // =================================================

            if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) {
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

            if (plugin.register === true && !_user.registered) {
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
                _user.coin < Number(plugin.coin)
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

            if (plugin.level > _user.level) {
                await conn.reply(
                    m.chat,
                    `❮✦❯ Se requiere el nivel: *${plugin.level}*\n\n` +
                    `• Tu nivel actual es: *${_user.level}*\n\n` +
                    `• Usá *${usedPrefix}levelup* para subir de nivel.`,
                    m
                )

                continue
            }

            // =================================================
            // 🚀 EJECUTAR PLUGIN
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

                    errorText = errorText.split(key).join('Administrador')
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

    } catch (e) {
        console.error(e)
    } finally {

        // ====================================================
        // ⏳ LIBERAR COLA
        // ====================================================

        if (opts['queque'] && m?.text) {
            const quequeIndex = this.msgqueque.indexOf(
                m.id || m.key.id
            )

            if (quequeIndex !== -1) {
                this.msgqueque.splice(quequeIndex, 1)
            }
        }

        // ====================================================
        // 📊 ESTADÍSTICAS
        // ====================================================

        const stats = global.db.data.stats || (
            global.db.data.stats = {}
        )

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
        // 🖥️ IMPRIMIR MENSAJES EN CONSOLA
        // ====================================================

        try {
            if (!opts['noprint']) {
                await (
                    await import('./lib/print.js')
                ).default(m, this)
            }
        } catch (e) {
            console.error('[PRINT ERROR]', e)
        }

        // ====================================================
        // 📖 LECTURA AUTOMÁTICA
        // ====================================================

        if (opts['autoread'] && m?.key) {
            await this.readMessages([m.key]).catch(console.error)
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
// 🔄 RECARGA AUTOMÁTICA DEL HANDLER
// ============================================================

const file = global.__filename(import.meta.url, true)

watchFile(file, async () => {
    unwatchFile(file)

    console.log(
        chalk.green('Actualizando "handler.js"')
    )

    if (global.conns && global.conns.length > 0) {
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
