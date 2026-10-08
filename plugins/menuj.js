// 📂 plugins/menuj.js — WhatsApp-Bot
// ============================================================
// 🎮 MENÚ DE MINI-JUEGOS
// ============================================================

let handler = async (m, { conn }) => {
  try {

    const chatSettings =
      global.db.data.chats[m.chat] || {}

    const gamesEnabled =
      chatSettings.games !== false


    // ========================================================
    // 🎮 ENCABEZADO
    // ========================================================

    let menuText = `╭━━━〔 🎮 *MINI-JUEGOS* 〕━━━╮
┃
┃ 🎲 *MENÚ DE JUEGOS*
┃ 📱 WhatsApp-Bot
┃
┃ ⚙️ *Estado:* ${
      gamesEnabled
        ? '🟢 Activados'
        : '🔴 Desactivados'
    }
┃
╰━━━━━━━━━━━━━━━━━━━━╯`


    // ========================================================
    // 🟢 JUEGOS ACTIVADOS
    // ========================================================

    if (gamesEnabled) {

      menuText += `

╭━━━〔 🌟 *ESPECIAL* 〕━━━╮
┃
┃ 🔮 *.aura <@usuario>*
┃ └─ Descubre tu aura,
┃    rango y estadísticas.
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🎲 *JUEGOS* 〕━━━╮
┃
┃ ✊ *.ppt <@usuario>*
┃ └─ Piedra, papel o tijera
┃
┃ 💃 *.dance <@usuario>*
┃ └─ Baila con un amigo
┃
┃ 🌍 *.bandera*
┃ └─ Adivina la bandera
┃
┃ 😸 *.adivinanza*
┃ └─ Resuelve una adivinanza
┃
┃ 🏛️ *.capital*
┃ └─ Adivina la capital
┃
┃ 🎯 *.trivia*
┃ └─ Preguntas de cultura general
┃
┃ ✨ *.consejo*
┃ └─ Consejo aleatorio
┃
┃ 💭 *.pensar <pregunta>*
┃ └─ Bola mágica
┃
┃ 🔢 *.numero*
┃ └─ Número aleatorio
┃
┃ 🎲 *.mayormenor*
┃ └─ Mayor o Menor
┃
┃ 👑 *.top10*
┃ └─ Top 10 del grupo
┃
┃ 🍽️ *.plato*
┃ └─ Adivina la opción correcta
┃
┃ ❤️ *.match*
┃ └─ Empareja dos personas
┃
┃ 💢 *.enemigo*
┃ └─ Enfrenta dos personas
┃
┃ 🏳️‍🌈 *.gay*
┃ └─ Juego del grupo
┃
┃ 😻 *.lindo*
┃ └─ El bot elige uno
┃
┃ 💋 *.linda*
┃ └─ El bot elige una
┃
┃ 😹 *.feo*
┃ └─ El bot elige uno
┃
┃ 🙈 *.fea*
┃ └─ El bot elige una
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 💅 *TESTS* 〕━━━╮
┃
┃ 💅 *.trolo <@usuario>*
┃ └─ Test de trolez
┃
┃ 🧢 *.cornudo <@usuario>*
┃ └─ Test de cornudez
┃
┃ 🧢 *.cornuda <@usuario>*
┃ └─ Test de cornudez
┃
┃ 💚 *.fiel <@usuario>*
┃ └─ Test de fidelidad
┃
┃ 💔 *.infiel <@usuario>*
┃ └─ Test de infidelidad
┃
┃ 🔥 *.zorra <@usuario>*
┃ └─ Test de zorreada
┃
┃ 🔥 *.zorro <@usuario>*
┃ └─ Test de zorreada
┃
┃ 😈 *.puta <@usuario>*
┃ └─ Comando divertido
┃
┃ 😂 *.puto <@usuario>*
┃ └─ Comando divertido
┃
┃ 🎉 *.sortear [premio]*
┃ └─ Sortea participantes
┃
╰━━━━━━━━━━━━━━━━━━━━╯`

    } else {

      // ======================================================
      // 🔴 JUEGOS DESACTIVADOS
      // ======================================================

      menuText += `

╭━━━〔 ⚠️ *MINI-JUEGOS* 〕━━━╮
┃
┃ 🔴 *Estado:* Desactivados
┃
┃ Los mini-juegos están
┃ desactivados en este grupo.
┃
┃ 🔓 Un administrador puede
┃ activarlos con:
┃
┃    *.juegos*
┃
╰━━━━━━━━━━━━━━━━━━━━╯`

    }


    // ========================================================
    // 📌 PIE DEL MENÚ
    // ========================================================

    menuText += `

╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🎮 *MINI-JUEGOS*
┃ ⚡ ¡Elegí un comando y jugá!
╰━━━━━━━━━━━━━━━━━━━━╯`


    // ========================================================
    // 📤 ENVIAR
    // ========================================================

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

    console.error(
      '❌ Error en menuj:',
      e
    )

    await conn.reply(
      m.chat,
      `╭━━━〔 ❌ *ERROR* 〕━━━╮
┃
┃ No se pudo mostrar
┃ el menú de mini-juegos.
┃
╰━━━━━━━━━━━━━━━━━━╯`,
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


// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
