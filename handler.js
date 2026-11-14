
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

const isNumber = x =>
  typeof x === 'number' && !isNaN(x)

const delay = ms =>
  isNumber(ms) &&
  new Promise(resolve => setTimeout(resolve, ms))

const normalizeJid = jid =>
  jid?.replace(/[^0-9]/g, '')

const cleanJid = jid =>
  jid?.split(':')[0] || ''

// ============================================================
// 🔎 WHATSAPP-BOT — DETECTOR DE MENSAJES
// ============================================================

function detectarTipoMensaje(message) {
  let msg = message

  for (let i = 0; i < 6; i++) {
    if (!msg || typeof msg !== 'object') break

    if (msg.ephemeralMessage) {
      msg = msg.ephemeralMessage.message
      continue
    }

    if (msg.viewOnceMessage) {
      return 'viewOnceMessage'
    }

    if (msg.viewOnceMessageV2) {
      return 'viewOnceMessageV2'
    }

    if (msg.viewOnceMessageV2Extension) {
      return 'viewOnceMessageV2Extension'
    }

    if (msg.documentWithCaptionMessage) {
      msg = msg.documentWithCaptionMessage.message
      continue
    }

    break
  }

  if (msg?.imageMessage) {
    return msg.imageMessage.viewOnce
      ? 'imageMessage (ver una vez)'
      : 'imageMessage'
  }

  if (msg?.videoMessage) {
    return msg.videoMessage.viewOnce
      ? 'videoMessage (ver una vez)'
      : 'videoMessage'
  }

  if (msg?.stickerMessage) return 'stickerMessage'
  if (msg?.audioMessage) return 'audioMessage'
  if (msg?.documentMessage) return 'documentMessage'
  if (msg?.conversation) return 'conversation'
  if (msg?.extendedTextMessage) return 'extendedTextMessage'

  return Object.keys(msg || {})[0] || 'unknown'
}

function registrarMensaje(etapa, m) {
  try {
    console.log(`[WHATSAPP-BOT] ${etapa}:`, {
      tipo: detectarTipoMensaje(m?.message),
      mtype: m?.mtype || 'sin definir',
      id: m?.key?.id || m?.id || 'sin ID',
      grupo: Boolean(
        m?.isGroup ||
        m?.key?.remoteJid?.endsWith('@g.us')
      ),
      chat: m?.chat || m?.key?.remoteJid || 'sin chat'
    })
  } catch (e) {
    console.error('[WHATSAPP-BOT] DEBUG:', e.message)
  }
}

// ============================================================
// ⚠️ MANEJO DE ERRORES DE PERMISOS
// ============================================================

global.dfail = (type, m, conn) => {
  const messages = {
    owner: '⛔ Solo propietarios.',
    rowner: '⛔ Solo el propietario principal.',
    mods: '⛔ Solo moderadores.',
    premium: '⛔ Solo usuarios premium.',
    admin: '⛔ Solo administradores.',
    botAdmin: '⛔ Necesito ser administrador.',
    private: '⛔ Solo en privado.',
    group: '⛔ Solo en grupos.',
    unreg: '⛔ Primero tenés que registrarte.'
  }

  return m.reply(
    messages[type] || '⛔ No tenés permiso.'
  )
}

// ============================================================
// 🤖 HANDLER PRINCIPAL
// ============================================================

export async function handler(chatUpdate) {
  this.msgqueque = this.msgqueque || []
  this.uptime = this.uptime || Date.now()

  if (!chatUpdate?.messages?.length) return

  this.pushMessage(chatUpdate.messages).catch(console.error)

  let m = chatUpdate.messages[
    chatUpdate.messages.length - 1
  ]

  if (!m) return

  // Detectar antes de que otros manejadores lo procesen.
  registrarMensaje('Mensaje original', m)

  if (await manejarRespuestasBotones(this, m)) return
  if (await manejarRespuestasStickers(this, m)) return

  if (global.db?.data == null) {
    await global.loadDatabase()
  }

  let sender

  try {
    m = smsg(this, m) || m

    if (!m) return

    registrarMensaje('Mensaje serializado', m)

    if (m.isGroup) {
      const chat = global.db.data.chats[m.chat]

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
        ) {
          return
        }
      }
    }

    sender = m.isGroup
      ? (m.key.participant || m.sender)
      : m.key.remoteJid

    const metadataOriginal = m.isGroup
      ? (
          this.chats[m.chat]?.metadata ||
          await this.groupMetadata(m.chat).catch(() => null) ||
          {}
        )
      : {}

    const groupMetadata_lid = {
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

    const participants_lid = (
      m.isGroup ? groupMetadata_lid.participants : []
    ).map(p => ({
      id: p.jid,
      jid: p.jid,
      lid: p.lid,
      admin: p.admin
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

    // ========================================================
    // 💾 USUARIOS, GRUPOS Y CONFIGURACIÓN
    // ========================================================

    try {
      global.db.data.users ||= {}
      global.db.data.chats ||= {}
      global.db.data.settings ||= {}

      let user = global.db.data.users[sender]

      if (typeof user !== 'object' || !user) {
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
        if (!(key in user)) user[key] = value
      }

      if (!user.premium) user.premiumTime = 0

      let chat = global.db.data.chats[m.chat]

      if (typeof chat !== 'object' || !chat) {
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
          chat[key] = Array.isArray(value) ? [...value] : value
        }
      }

      let settings =
        global.db.data.settings[this.user.jid]

      if (typeof settings !== 'object' || !settings) {
        settings =
          global.db.data.settings[this.user.jid] = {}
      }

      const settingDefaults = {
        self: false,
        restrict: true,
        jadibotmd: true,
        antiPrivate: false,
        autoread: false,
        status: 0
      }

      for (const [key, value] of Object.entries(settingDefaults)) {
        if (!(key in settings)) settings[key] = value
      }

    } catch (e) {
      console.error('[HANDLER DB]', e)
    }

    // ========================================================
    // 🛡️ CONTROL DE BOTS PERMITIDOS
    // ========================================================

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
    if (
      opts['swonly'] &&
      m.chat !== 'status@broadcast'
    ) return

    if (typeof m.text !== 'string') {
      m.text = ''
    }

    // ========================================================
    // 👑 OWNERS Y ADMINISTRADORES
    // ========================================================

    const _user = global.db.data.users[sender]

    const groupMetadata = groupMetadata_lid
    const participants = participants_lid

    const user = m.isGroup
      ? participants.find(
          u => this.decodeJid(u.jid) === sender
        ) || {}
      : {}

    const bot = m.isGroup
      ? participants.find(
          u => this.decodeJid(u.jid) === this.user.jid
        ) || {}
      : {}

    const isRAdmin = user?.admin === 'superadmin'
    const isAdmin =
      isRAdmin || user?.admin === 'admin'
    const isBotAdmin = Boolean(bot?.admin)

    const senderNum = sender.split('@')[0]

    const ownerNumbers = [
      conn.decodeJid(global.conn.user.id),
      ...global.owner.map(
        x => Array.isArray(x) ? x[0] : x
      )
    ].map(v => String(v).replace(/[^0-9]/g, ''))

    const isROwner = ownerNumbers.includes(senderNum)
    const isOwner = isROwner || m.fromMe

    const isMods =
      isOwner ||
      global.mods.map(
        v => String(v).replace(/[^0-9]/g, '')
      ).includes(senderNum)

    const isPrems =
      isROwner ||
      global.prems.map(
        v => String(v).replace(/[^0-9]/g, '')
      ).includes(senderNum) ||
      _user.premium === true

    // ========================================================
    // ⏳ COLA
    // ========================================================

    if (
      opts['queque'] &&
      m.text &&
      !(isMods || isPrems)
    ) {
      const queque = this.msgqueque
      const previousID = queque[queque.length - 1]

      queque.push(m.id || m.key.id)

      if (previousID) {
        while (queque[0] !== (m.id || m.key.id)) {
          await delay(1000)
        }
      }
    }

    if (m.isBaileys) return

    m.exp += Math.ceil(Math.random() * 10)

    // ========================================================
    // 🔌 EJECUTAR PLUGINS
    // ========================================================

    let usedPrefix

    const ___dirname = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      './plugins'
    )

    for (const name in global.plugins) {
      const plugin = global.plugins[name]

      if (!plugin || plugin.disabled) continue

      const __filename = join(___dirname, name)

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
      ) {
        continue
      }

      const str2Regex = str =>
        str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')

      const _prefix =
        plugin.customPrefix ||
        conn.prefix ||
        global.prefix

      const prefixes = Array.isArray(_prefix)
        ? _prefix
        : [_prefix]

      const match = prefixes
        .map(p => {
          const re = p instanceof RegExp
            ? p
            : new RegExp(str2Regex(String(p || '.')))

          return [re.exec(m.text), re]
        })
        .find(p => p[0])

      if (!match) continue

      // ======================================================
      // 🔄 BEFORE
      // ======================================================

      if (typeof plugin.before === 'function') {
        try {
          const skip = await plugin.before.call(
            this,
            m,
            {
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
            }
          )

          if (skip) continue
        } catch (e) {
          console.error(
            `[BEFORE] ${name}:`,
            e
          )
        }
      }

      if (typeof plugin !== 'function') continue

      usedPrefix = match[0]?.[0] || ''

      if (!usedPrefix) continue

      const noPrefix = m.text.replace(
        usedPrefix,
        ''
      )

      let [command, ...args] =
        noPrefix.trim().split(/\s+/).filter(Boolean)

      args ||= []

      const _args = noPrefix
        .trim()
        .split(/\s+/)
        .slice(1)

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

      if (!isAccept) continue

      global.comando = command

      if (
        m.id?.startsWith('NJX-') ||
        (
          m.id?.startsWith('BAE5') &&
          m.id.length === 16
        ) ||
        (
          m.id?.startsWith('B24E') &&
          m.id.length === 20
        )
      ) return

      m.plugin = name

      // ======================================================
      // 🚫 RESTRICCIONES
      // ======================================================

      const currentChat =
        global.db.data.chats[m.chat] || {}

      const currentUser =
        global.db.data.users[sender] || {}

      if (
        currentChat.isBanned &&
        !isROwner &&
        ![
          'grupo-unbanchat.js',
          'owner-exec.js',
          'owner-exec2.js',
          'grupo-delete.js'
        ].includes(name)
      ) {
        return
      }

      if (currentUser.antispam > 2) return

      if (
        m.text &&
        currentUser.banned &&
        !isROwner
      ) {
        await m.reply(
          '⛔ Estás baneado del bot.'
        )

        currentUser.antispam =
          (currentUser.antispam || 0) + 1

        return
      }

      if (currentUser.antispam2 && isROwner) {
        return
      }

      const lastSpam = Number(currentUser.spam) || 0

      if (
        !isROwner &&
        Date.now() - lastSpam < 3000
      ) {
        console.log('[SPAM]')
        return
      }

      currentUser.spam = Date.now()

      const adminMode =
        currentChat.modoadmin === true

      if (
        adminMode &&
        !isOwner &&
        !isROwner &&
        m.isGroup &&
        !isAdmin
      ) {
        return
      }

      // ======================================================
      // 🔐 PERMISOS
      // ======================================================

      if (
        plugin.rowner &&
        plugin.owner &&
        !(isROwner || isOwner)
      ) {
        fail('owner', m, this)
        continue
      }

      if (plugin.rowner && !isROwner) {
        fail('rowner', m, this)
        continue
      }

      if (plugin.owner && !isOwner) {
        fail('owner', m, this)
        continue
      }

      if (plugin.mods && !isMods) {
        fail('mods', m, this)
        continue
      }

      if (plugin.premium && !isPrems) {
        fail('premium', m, this)
        continue
      }

      if (plugin.admin && !isAdmin) {
        fail('admin', m, this)
        continue
      }

      if (plugin.botAdmin && !isBotAdmin) {
        fail('botAdmin', m, this)
        continue
      }

      if (plugin.private && m.isGroup) {
        fail('private', m, this)
        continue
      }

      if (plugin.group && !m.isGroup) {
        fail('group', m, this)
        continue
      }

      if (
        plugin.register === true &&
        _user.registered === false
      ) {
        fail('unreg', m, this)
        continue
      }

      // ======================================================
      // ⭐ EXPERIENCIA Y MONEDAS
      // ======================================================

      m.isCommand = true

      const xp = 'exp' in plugin
        ? parseInt(plugin.exp)
        : 17

      if (xp > 200) {
        m.reply('chirrido -_-')
      } else {
        m.exp += xp
      }

      if (
        !isPrems &&
        plugin.coin &&
        currentUser.coin < Number(plugin.coin)
      ) {
        conn.reply(
          m.chat,
          `❌ Se agotaron tus ${global.moneda || 'monedas'}.`,
          m
        )
        continue
      }

      if (plugin.level > _user.level) {
        conn.reply(
          m.chat,
          `❌ Se requiere nivel ${plugin.level}.`,
          m
        )
        continue
      }

      // ======================================================
      // ▶️ EJECUTAR COMANDO
      // ======================================================

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

        for (const key of Object.values(
          global.APIKeys || {}
        )) {
          if (key) {
            errorText = errorText.split(key).join(
              'Administrador'
            )
          }
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
          conn.reply(
            m.chat,
            `❮✦❯ Utilizaste ${Number(m.coin)} ${global.moneda || 'monedas'}`,
            m
          )
        }
      }

      break
    }

  } catch (e) {
    console.error('[HANDLER ERROR]', e)
  } finally {

    // ========================================================
    // 🧹 LIMPIEZA DE COLA
    // ========================================================

    if (opts['queque'] && m?.text) {
      const index = this.msgqueque.indexOf(
        m.id || m.key?.id
      )

      if (index !== -1) {
        this.msgqueque.splice(index, 1)
      }
    }

    const stats = global.db?.data?.stats || {}

    if (m && sender) {
      const utente =
        global.db.data.users[sender]

      if (utente?.muto === true) {
        try {
          await this.sendMessage(m.chat, {
            delete: {
              remoteJid: m.chat,
              fromMe: false,
              id: m.key.id,
              participant: m.key.participant
            }
          })
        } catch (e) {
          console.error('[MUTO]', e)
        }
      }

      if (utente) {
        utente.exp =
          (Number(utente.exp) || 0) +
          (Number(m.exp) || 0)

        utente.coin =
          (Number(utente.coin) || 0) -
          (Number(m.coin) || 0)
      }

      if (m.plugin) {
        const now = Date.now()

        if (!stats[m.plugin]) {
          stats[m.plugin] = {
            total: 0,
            success: 0,
            last: now,
            lastSuccess: now
          }
        }

        const stat = stats[m.plugin]

        stat.total++
        stat.last = now

        if (m.error == null) {
          stat.success++
          stat.lastSuccess = now
        }
      }
    }

    // ========================================================
    // 🖥️ REGISTRO DEL SERVIDOR
    // ========================================================

    try {
      if (!opts['noprint'] && m) {
        await (
          await import('./lib/print.js')
        ).default(m, this)
      }
    } catch (e) {
      console.error('[PRINT]', e)
    }

    // ========================================================
    // 👁️ LECTURA AUTOMÁTICA
    // ========================================================

    try {
      if (opts['autoread'] && m?.key) {
        await this.readMessages([m.key])
      }
    } catch (e) {
      console.error('[AUTOREAD]', e)
    }

    // ========================================================
    // 😀 REACCIONES
    // ========================================================

    try {
      const reactionRegex =
        /(ción|dad|aje|oso|izar|mente|pero|tion|age|ous|ate|and|but|ify|ai|yuki|a|s)/gi

      const chat = global.db?.data?.chats?.[m?.chat]

      if (
        chat?.reaction &&
        m?.text?.match(reactionRegex) &&
        !m.fromMe
      ) {
        const emojis = [
          '😃', '😄', '😁', '😂', '🤣',
          '🥰', '😍', '😘', '😎', '🤩',
          '😏', '🥺', '😭', '😤', '🤯',
          '🤔', '🫣', '🤖', '🩷', '❤️',
          '💙', '💜', '💗', '🔥', '✨',
          '👑', '🫶', '👍', '🌸', '💫'
        ]

        const emoji = emojis[
          Math.floor(Math.random() * emojis.length)
        ]

        await this.sendMessage(m.chat, {
          react: {
            text: emoji,
            key: m.key
          }
        })
      }
    } catch (e) {
      console.error('[REACTION]', e)
    }
  }
}

// ============================================================
// 🔄 RECARGA AUTOMÁTICA
// ============================================================

const file = global.__filename(
  import.meta.url,
  true
)

watchFile(file, async () => {
  unwatchFile(file)

  console.log(
    chalk.green('Actualizando "handler.js"')
  )

  if (global.conns?.length > 0) {
    const users = [
      ...new Set(
        global.conns.filter(
          conn =>
            conn.user &&
            conn.ws?.socket &&
            conn.ws.socket.readyState !== ws.CLOSED
        )
      )
    ]

    for (const user of users) {
      user.subreloadHandler(false)
    }
  }
})

export default { handler }
