// 📂 plugins/enemigo.js
// ⚔️ Juego de enemigos — FelixCat-Bot

let handler = async (m, { conn, participants }) => {
  try {

    // ============================================================
    // 🎮 COMPROBAR JUEGOS
    // ============================================================

    const chat = global.db?.data?.chats?.[m.chat] || {}

    if (chat.games === false) {
      return conn.sendMessage(m.chat, {
        text:
          '🎮 *Los mini-juegos están desactivados en este grupo.*\n\n' +
          '🔓 Usa *.juegos* para activarlos.'
      })
    }

    // ============================================================
    // 👥 PARTICIPANTES
    // ============================================================

    if (!participants || participants.length < 2) {
      return conn.sendMessage(m.chat, {
        text:
          '👥 *No hay suficientes participantes.*\n\n' +
          'Se necesitan al menos *2 personas* para iniciar un duelo.'
      })
    }

    // Limpiar participantes
    const lista = participants
      .filter(p => p?.id)
      .filter(p => !String(p.id).includes('status@broadcast'))

    if (lista.length < 2) {
      return conn.sendMessage(m.chat, {
        text: '❌ No se pudieron obtener suficientes participantes.'
      })
    }

    // ============================================================
    // 🎲 SELECCIONAR DOS RIVALES
    // ============================================================

    const random1 = Math.floor(Math.random() * lista.length)

    let random2
    do {
      random2 = Math.floor(Math.random() * lista.length)
    } while (random2 === random1)

    const user1 = conn.decodeJid
      ? conn.decodeJid(lista[random1].id)
      : lista[random1].id

    const user2 = conn.decodeJid
      ? conn.decodeJid(lista[random2].id)
      : lista[random2].id

    const nombre1 = `@${user1.split('@')[0]}`
    const nombre2 = `@${user2.split('@')[0]}`

    // ============================================================
    // ⚔️ FRASES
    // ============================================================

    const frases = [
      '⚔️ Dos rivales acaban de encontrarse.',
      '🔥 La tensión entre estos dos acaba de subir al máximo.',
      '💢 Parece que hay cuentas pendientes entre ellos.',
      '🥊 El duelo está servido. Solo uno puede quedar arriba.',
      '🚨 ¡Alerta de rivalidad! El grupo acaba de presenciar un enfrentamiento.',
      '💥 Dos voluntades chocan en un duelo legendario.',
      '😈 El destino decidió enfrentarlos sin previo aviso.',
      '⚡ La rivalidad acaba de comenzar.',
      '🏹 Dos contrincantes, un solo enfrentamiento.',
      '☠️ Hoy el grupo tiene nuevos enemigos declarados.'
    ]

    const frase =
      frases[Math.floor(Math.random() * frases.length)]

    // ============================================================
    // 🏆 MENSAJES FINALES
    // ============================================================

    const mensajes = [
`╭━━━〔 ⚔️ *ENEMIGOS* 〕━━━╮
┃
┃ 👤 ${nombre1}
┃        ⚔️ VS ⚔️
┃ 👤 ${nombre2}
┃
┣━━━━━━━━━━━━━━━━━━
┃
┃ ${frase}
┃
╰━━━━━━━━━━━━━━━━━━╯`,

`╭━━━〔 💥 *DUELO ACTIVADO* 〕━━━╮
┃
┃ 🔥 ${nombre1}
┃
┃          🆚
┃
┃ ⚡ ${nombre2}
┃
┣━━━━━━━━━━━━━━━━━━
┃
┃ 🎯 *Resultado:* El destino decidirá.
┃
┃ ${frase}
╰━━━━━━━━━━━━━━━━━━╯`,

`╭━━━〔 🥊 *RIVALIDAD* 〕━━━╮
┃
┃ 🥇 ${nombre1}
┃
┃       ⚔️
┃
┃ 🥈 ${nombre2}
┃
┣━━━━━━━━━━━━━━━━━━
┃
┃ 🚨 ¡Que comience el enfrentamiento!
┃
┃ ${frase}
╰━━━━━━━━━━━━━━━━━━╯`
    ]

    const text =
      mensajes[Math.floor(Math.random() * mensajes.length)]

    // ============================================================
    // 📤 ENVIAR
    // ============================================================

    await conn.sendMessage(
      m.chat,
      {
        text,
        mentions: [user1, user2]
      }
    )

  } catch (e) {

    console.error('❌ Error en enemigo:', e)

    await conn.sendMessage(m.chat, {
      text:
        '❌ *Ocurrió un error al generar el duelo.*\n\n' +
        'Inténtalo nuevamente.'
    })
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = [
  'enemigo',
  'enemigos',
  'rival',
  'rivales',
  'duelo'
]

handler.tags = [
  'fun',
  'juego'
]

handler.help = [
  'enemigo',
  'rival',
  'duelo'
]

handler.group = true

export default handler
