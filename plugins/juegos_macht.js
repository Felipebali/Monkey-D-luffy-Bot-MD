// 📂 plugins/match.js
// 💘 Sistema MATCH — FelixCat_Bot

console.log('[Plugin] match.js cargado')

// ============================================================
// 🎯 HANDLER
// ============================================================

const handler = async (m, { conn, args, command }) => {

  try {

    // ========================================================
    // 👥 SOLO GRUPOS
    // ========================================================

    if (!m.isGroup)
      return m.reply(
        '❌ Este comando solo funciona en grupos.'
      )

    // ========================================================
    // 🎮 COMPROBAR GAMES
    // ========================================================

    const chat =
      global.db?.data?.chats?.[m.chat]

    if (
      chat &&
      chat.games === false
    ) {
      return
    }

    // ========================================================
    // 📋 METADATA DEL GRUPO
    // ========================================================

    const metadata =
      await conn.groupMetadata(m.chat)

    if (!metadata)
      return m.reply(
        '❌ No pude obtener los datos del grupo.'
      )

    const groupName =
      metadata.subject || 'este grupo'

    // ========================================================
    // 👥 PARTICIPANTES
    // ========================================================

    let participants =
      (metadata.participants || [])
        .map(p =>
          p.id ||
          p.jid ||
          p.lid
        )
        .filter(Boolean)

    // ========================================================
    // 🤖 BOT
    // ========================================================

    const botJid =
      conn.user?.id
        ? conn.decodeJid
          ? conn.decodeJid(conn.user.id)
          : conn.user.id
        : null

    const botNumber =
      botJid
        ? botJid
            .split('@')[0]
            .split(':')[0]
        : null

    // ========================================================
    // 👑 OWNERS
    // ========================================================

    const owners = [
      '59898719147',
      '59896026646'
    ]

    // ========================================================
    // 🛡 FILTRAR BOT Y OWNERS
    // ========================================================

    participants =
      participants.filter(jid => {

        const numero =
          String(jid)
            .split('@')[0]
            .split(':')[0]
            .replace(/\D/g, '')

        if (!numero)
          return false

        if (
          botNumber &&
          numero === botNumber
        ) {
          return false
        }

        if (
          owners.includes(numero)
        ) {
          return false
        }

        return true
      })

    // ========================================================
    // 👥 MÍNIMO
    // ========================================================

    if (participants.length < 2) {

      return m.reply(
        '❌ No hay suficientes participantes para hacer un match.'
      )
    }

    // ========================================================
    // 🎲 RANDOM
    // ========================================================

    const pickRandom = array =>
      array[
        Math.floor(
          Math.random() * array.length
        )
      ]

    // ========================================================
    // 📊 PORCENTAJE
    // ========================================================

    const porcentaje = () =>
      Math.floor(
        Math.random() * 101
      )

    // ========================================================
    // 💘 FRASES
    // ========================================================

    const frases = [

      '💘 *El destino los ha unido.*',

      '❤️ *El amor está en el aire.*',

      '💞 *Una pareja que haría historia.*',

      '💖 *Cupido hizo de las suyas.*',

      '💝 *Romance felino detectado.*'

    ]

    // ========================================================
    // 💘 COMANDO
    // ========================================================

    const cmd =
      String(command || '')
        .trim()
        .toLowerCase()

    // ========================================================
    // 💘 MATCH ALL
    // ========================================================

    if (
      args?.[0] &&
      String(args[0])
        .toLowerCase() === 'all'
    ) {

      // 🎲 Mezclar participantes
      participants =
        [...participants]
          .sort(
            () => Math.random() - 0.5
          )

      let msg =
        `💘 *MATCH GENERAL EN ${groupName.toUpperCase()}* 💘\n\n`

      const mentions = []

      let numeroPareja = 1

      // ======================================================
      // 💞 CREAR PAREJAS
      // ======================================================

      for (
        let i = 0;
        i < participants.length;
        i += 2
      ) {

        const p1 =
          participants[i]

        const p2 =
          participants[i + 1]

        // ====================================================
        // 💞 PAREJA COMPLETA
        // ====================================================

        if (p2) {

          const pct =
            porcentaje()

          msg +=
            `╭━━━〔 💞 PAREJA ${numeroPareja} 〕━━━⬣\n` +
            `👤 @${p1.split('@')[0]}\n` +
            `❤️ @${p2.split('@')[0]}\n` +
            `💘 Compatibilidad: *${pct}%*\n` +
            `╰━━━━━━━━━━━━━━━━⬣\n\n`

          mentions.push(
            p1,
            p2
          )

          numeroPareja++

        }

        // ====================================================
        // 😿 PARTICIPANTE SIN PAREJA
        // ====================================================

        else {

          msg +=
            `╭━━━〔 😿 SIN PAREJA 〕━━━⬣\n` +
            `👤 @${p1.split('@')[0]}\n` +
            `💔 Se quedó sin pareja esta ronda.\n` +
            `╰━━━━━━━━━━━━━━━━⬣\n\n`

          mentions.push(
            p1
          )
        }
      }

      // ======================================================
      // 💘 FRASE FINAL
      // ======================================================

      msg +=
        pickRandom(frases)

      // ======================================================
      // 💘 REACCIÓN
      // ======================================================

      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '💘',
            key: m.key
          }
        }
      )

      // ======================================================
      // 📤 ENVIAR RESULTADO
      // ======================================================

      return conn.sendMessage(
        m.chat,
        {
          text: msg,
          mentions
        },
        {
          quoted: m
        }
      )
    }

    // ========================================================
    // 💞 MATCH @USUARIO
    // ========================================================

    const mentioned =
      Array.isArray(m.mentionedJid) &&
      m.mentionedJid.length
        ? (
            conn.decodeJid
              ? conn.decodeJid(
                  m.mentionedJid[0]
                )
              : m.mentionedJid[0]
          )
        : null

    if (mentioned) {

      const author =
        conn.decodeJid
          ? conn.decodeJid(m.sender)
          : m.sender

      // ======================================================
      // 🚫 NO HACER MATCH CONSIGO MISMO
      // ======================================================

      if (
        author === mentioned
      ) {

        return conn.reply(
          m.chat,
          '😂 No podés hacer match con vos mismo.',
          m
        )
      }

      const pct =
        porcentaje()

      const msg =
        `💞 *MATCH ENTRE USUARIOS EN ${groupName}* 💞\n\n` +
        `@${author.split('@')[0]} ❤️ @${mentioned.split('@')[0]} — *${pct}% compatibles*\n\n` +
        pickRandom(frases)

      // ======================================================
      // 💘 REACCIÓN
      // ======================================================

      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '💘',
            key: m.key
          }
        }
      )

      // ======================================================
      // 📤 ENVIAR RESULTADO
      // ======================================================

      return conn.sendMessage(
        m.chat,
        {
          text: msg,
          mentions: [
            author,
            mentioned
          ]
        },
        {
          quoted: m
        }
      )
    }

    // ========================================================
    // 💘 MATCH NORMAL
    // ========================================================

    const author =
      conn.decodeJid
        ? conn.decodeJid(m.sender)
        : m.sender

    const pool =
      participants.filter(
        p =>
          p !== author
      )

    if (pool.length < 2) {

      return m.reply(
        '❌ No hay suficientes personas para hacer un match.'
      )
    }

    // ========================================================
    // 🎲 ELEGIR PRIMERA PERSONA
    // ========================================================

    const p1 =
      pickRandom(pool)

    // ========================================================
    // 🎲 ELEGIR SEGUNDA PERSONA
    // ========================================================

    const posibles =
      pool.filter(
        p =>
          p !== p1
      )

    const p2 =
      pickRandom(posibles)

    // ========================================================
    // 📊 PORCENTAJE
    // ========================================================

    const pct =
      porcentaje()

    // ========================================================
    // 💘 MENSAJE
    // ========================================================

    const msg =
      `💞 *MATCH ALEATORIO EN ${groupName}* 💞\n\n` +
      `@${p1.split('@')[0]} ❤️ @${p2.split('@')[0]} — *${pct}% compatibles*\n\n` +
      pickRandom(frases)

    // ========================================================
    // 💘 REACCIÓN
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: '💘',
          key: m.key
        }
      }
    )

    // ========================================================
    // 📤 ENVIAR RESULTADO
    // ========================================================

    return conn.sendMessage(
      m.chat,
      {
        text: msg,
        mentions: [
          p1,
          p2
        ]
      },
      {
        quoted: m
      }
    )

  } catch (error) {

    console.error(
      '❌ Error en match.js:',
      error
    )

    return m.reply(
      '❌ Ocurrió un error ejecutando el comando .match'
    )
  }
}

// ============================================================
// 📌 CONFIGURACIÓN DEL PLUGIN
// ============================================================

handler.help = [
  'match',
  'match all',
  'match @usuario'
]

handler.tags = [
  'fun',
  'juego'
]

handler.command = [
  'match',
  'macht'
]

handler.group = true

export default handler
