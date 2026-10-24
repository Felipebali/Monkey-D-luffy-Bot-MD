
/**
 * 📂 plugins/promotebot.js
 * 🤖 WHATSAPP-BOT — GESTIÓN DE BOT PRINCIPAL
 *
 * Comandos:
 * .promotebot
 * .mainbot
 *
 * Créditos originales: The Carlos 👑
 */

const handler = async (m, { conn, command }) => {
  // 🔐 Reconocer propietarios desde global.owner
  const owners = (global.owner || []).map(owner => {
    if (Array.isArray(owner)) owner = owner[0]
    if (typeof owner === 'object' && owner !== null) {
      owner = owner.id || owner.number || owner.jid || ''
    }

    return String(owner).replace(/[^0-9]/g, '')
  })

  const senderNumber = String(m.sender || '').replace(/[^0-9]/g, '')

  // También contempla JID alternativos cuando están disponibles
  const senderLid = String(m.sender || '').split('@')[0]
  const isOwner = owners.includes(senderNumber) ||
    owners.includes(senderLid.replace(/[^0-9]/g, ''))

  if (!isOwner) {
    return conn.sendMessage(
      m.chat,
      { text: '❌ Solo el owner puede usar este comando.' },
      { quoted: m }
    )
  }

  if (!global.mainBot) global.mainBot = null
  if (!global.officialBots) global.officialBots = new Map()

  const isBotActive = botConn =>
    botConn?.ws?.socket?.readyState === 1

  const registerBot = (botConn, isMain = false) => {
    const jid = botConn.user?.jid
    if (!jid) return false

    global.officialBots.set(jid, {
      conn: botConn,
      active: true
    })

    if (isMain) global.mainBot = botConn
    return true
  }

  const cleanupBots = () => {
    for (const [jid, bot] of global.officialBots) {
      if (!isBotActive(bot.conn)) {
        bot.active = false
        global.officialBots.delete(jid)
      }
    }
  }

  cleanupBots()

  if (command === 'promotebot') {
    if (!global.mainBot || !isBotActive(global.mainBot)) {
      registerBot(conn, true)

      return conn.sendMessage(
        m.chat,
        {
          text: '✅ Este sub-bot ahora es el BOT principal *whatsapp-bot*.'
        },
        { quoted: m }
      )
    }

    if (global.mainBot === conn) {
      return conn.sendMessage(
        m.chat,
        { text: '⚠️ Este bot ya es el principal.' },
        { quoted: m }
      )
    }

    registerBot(conn, false)

    return conn.sendMessage(
      m.chat,
      {
        text: '🤖 Este bot ha sido registrado como oficial, pero no es el principal.'
      },
      { quoted: m }
    )
  }

  if (command === 'mainbot') {
    if (global.mainBot && isBotActive(global.mainBot)) {
      return conn.sendMessage(
        m.chat,
        { text: '🤖 El bot principal está activo y conectado.' },
        { quoted: m }
      )
    }

    let reassigned = false

    for (const [, bot] of global.officialBots) {
      if (isBotActive(bot.conn)) {
        global.mainBot = bot.conn
        reassigned = true
        break
      }
    }

    if (reassigned) {
      return conn.sendMessage(
        m.chat,
        {
          text: '⚡️ Se encontró un bot oficial activo y se reasignó como principal.'
        },
        { quoted: m }
      )
    }

    registerBot(conn, true)

    return conn.sendMessage(
      m.chat,
      {
        text: '⚠️ No había un bot principal activo. Este bot ahora es el principal ✅'
      },
      { quoted: m }
    )
  }
}

handler.command = ['promotebot', 'mainbot']
handler.tags = ['owner']
handler.help = ['promotebot', 'mainbot']
handler.estrellas = 9

export default handler
