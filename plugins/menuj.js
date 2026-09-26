// 📂 plugins/menuj.js — FelixCat_Bot

let handler = async (m, { conn }) => {
  try {

    const chatSettings = global.db.data.chats[m.chat] || {}
    const gamesEnabled = chatSettings.games !== false

    let menuText = [
      '╔═════════════════════╗',
      '🎮  MINI-JUEGOS FELIXCAT 🐾',
      '╚═════════════════════╝',
      'Estado: ' + (gamesEnabled ? '🟢 Activados' : '🔴 Desactivados'),
      '────────────────────────────'
    ].join('\n')

    if (gamesEnabled) {

      menuText += '\n' + [
        '',
        '🌟 *Juego Especial y Viral:*',
        '🐾 *.therian* → Descubre tu animal interior PRO 🐲✨',
        '────────────────────────────',
        '',
        '🎲 *Juegos Disponibles:*',
        '',
        '🧠 *.math* → Operaciones matemáticas',
        '✊✋✌️ *.ppt <@user>* → Piedra, papel o tijera',
        '💃🕺 *.dance <@user>* → Bailar con amigo',
        '🌍 *.bandera* → Adivina la bandera',
        '😸 *.adivinanza* → Resuelve adivinanzas',
        '🏛️ *.capital* → Adivina la capital de un país',
        '🎯 *.trivia* → Preguntas de cultura general',
        '✨ *.consejo* → Te da un consejo aleatorio',
        '💭 *.pensar <pregunta>* → Bola mágica que responde tu pregunta',
        '🔢 *.numero* → Genera un número aleatorio',
        '🎲 *.mayormenor* → Juego de Mayor o Menor',
        '👑 *.top10* → Top 10 divertidos del grupo',
        '🍽️ *.plato* → Adivina la opción correcta',
        '❤️ *.match* → Empareja dos personas al azar 💞',
        '💢 *.enemigo* → Enfrenta a dos personas al azar 😾',
        '🏳️‍🌈 *.gay* → Descubre quién es el más gay del grupo',
        '😻 *.lindo* → El bot elige al más lindo del grupo',
        '💋 *.linda* → El bot elige a la más linda del grupo',
        '😹 *.feo* → El bot elige al más feo del grupo',
        '🙈 *.fea* → El bot elige a la más fea del grupo',
        '────────────────────────────',
        '',
        '💅 *.trolo <@user>* → Test de trolez',
        '🧢 *.cornudo <@user>* / *.cornuda <@user>* → Test de cornudez',
        '💚 *.fiel <@user>* → Test de fidelidad',
        '💔 *.infiel <@user>* → Test de infidelidad',
        '🔥 *.zorra <@user>* / *.zorro <@user>* → Test de zorreada',
        '😈 *.puta <@user>* → Comando divertido',
        '😂 *.puto <@user>* → Comando divertido',
        '🎉 *.sortear [premio]* → Sortea participantes del grupo',
        '────────────────────────────'
      ].join('\n')

    } else {

      menuText += '\n' + [
        '',
        '⚠️ *Mini-juegos desactivados.*',
        'Menciona a un admin para activarlos 🔴',
        '────────────────────────────'
      ].join('\n')
    }

    menuText += '\n👑 *Powered by FelixCat 🐾*'

    await conn.sendMessage(
      m.chat,
      {
        text: menuText
      },
      {
        quoted: m
      }
    )

  } catch (e) {

    console.error(e)

    await conn.reply(
      m.chat,
      '✖️ Error al mostrar el menú de mini-juegos.',
      m
    )
  }
}

// ============================================================
// 📌 COMANDOS
// ============================================================

handler.command = [
  'menuj',
  'mj'
]

handler.group = true

export default handler
