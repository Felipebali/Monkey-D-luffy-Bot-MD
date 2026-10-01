// 📂 plugins/juegos-bandera.js
// 🌍 Juego de banderas — FelixCat-Bot 🐾

// ============================================================
// 🌎 BASE DE DATOS DE BANDERAS
// ============================================================

const flags = [
  // América
  { name: "Argentina", emoji: "🇦🇷" },
  { name: "Bolivia", emoji: "🇧🇴" },
  { name: "Brasil", emoji: "🇧🇷" },
  { name: "Canadá", emoji: "🇨🇦" },
  { name: "Chile", emoji: "🇨🇱" },
  { name: "Colombia", emoji: "🇨🇴" },
  { name: "México", emoji: "🇲🇽" },
  { name: "Uruguay", emoji: "🇺🇾" },
  { name: "Paraguay", emoji: "🇵🇾" },
  { name: "Perú", emoji: "🇵🇪" },
  { name: "Estados Unidos", emoji: "🇺🇸" },
  { name: "Cuba", emoji: "🇨🇺" },
  { name: "Ecuador", emoji: "🇪🇨" },
  { name: "Venezuela", emoji: "🇻🇪" },
  { name: "Costa Rica", emoji: "🇨🇷" },
  { name: "Panamá", emoji: "🇵🇦" },
  { name: "Guatemala", emoji: "🇬🇹" },
  { name: "Honduras", emoji: "🇭🇳" },
  { name: "Nicaragua", emoji: "🇳🇮" },
  { name: "El Salvador", emoji: "🇸🇻" },
  { name: "Jamaica", emoji: "🇯🇲" },
  { name: "Haití", emoji: "🇭🇹" },
  { name: "República Dominicana", emoji: "🇩🇴" },

  // Europa
  { name: "España", emoji: "🇪🇸" },
  { name: "Francia", emoji: "🇫🇷" },
  { name: "Italia", emoji: "🇮🇹" },
  { name: "Alemania", emoji: "🇩🇪" },
  { name: "Reino Unido", emoji: "🇬🇧" },
  { name: "Portugal", emoji: "🇵🇹" },
  { name: "Polonia", emoji: "🇵🇱" },
  { name: "Grecia", emoji: "🇬🇷" },
  { name: "Rusia", emoji: "🇷🇺" },
  { name: "Ucrania", emoji: "🇺🇦" },
  { name: "Irlanda", emoji: "🇮🇪" },
  { name: "Bélgica", emoji: "🇧🇪" },
  { name: "Países Bajos", emoji: "🇳🇱" },
  { name: "Suiza", emoji: "🇨🇭" },
  { name: "Austria", emoji: "🇦🇹" },
  { name: "Noruega", emoji: "🇳🇴" },
  { name: "Suecia", emoji: "🇸🇪" },
  { name: "Dinamarca", emoji: "🇩🇰" },
  { name: "Finlandia", emoji: "🇫🇮" },
  { name: "Islandia", emoji: "🇮🇸" },
  { name: "Croacia", emoji: "🇭🇷" },
  { name: "Serbia", emoji: "🇷🇸" },
  { name: "Bulgaria", emoji: "🇧🇬" },
  { name: "Rumania", emoji: "🇷🇴" },

  // Asia
  { name: "China", emoji: "🇨🇳" },
  { name: "Japón", emoji: "🇯🇵" },
  { name: "India", emoji: "🇮🇳" },
  { name: "Corea del Sur", emoji: "🇰🇷" },
  { name: "Arabia Saudita", emoji: "🇸🇦" },
  { name: "Tailandia", emoji: "🇹🇭" },
  { name: "Indonesia", emoji: "🇮🇩" },
  { name: "Turquía", emoji: "🇹🇷" },
  { name: "Vietnam", emoji: "🇻🇳" },
  { name: "Filipinas", emoji: "🇵🇭" },
  { name: "Pakistán", emoji: "🇵🇰" },
  { name: "Israel", emoji: "🇮🇱" },
  { name: "Irán", emoji: "🇮🇷" },
  { name: "Irak", emoji: "🇮🇶" },

  // África
  { name: "Egipto", emoji: "🇪🇬" },
  { name: "Sudáfrica", emoji: "🇿🇦" },
  { name: "Nigeria", emoji: "🇳🇬" },
  { name: "Marruecos", emoji: "🇲🇦" },
  { name: "Argelia", emoji: "🇩🇿" },
  { name: "Etiopía", emoji: "🇪🇹" },
  { name: "Kenia", emoji: "🇰🇪" },
  { name: "Ghana", emoji: "🇬🇭" },
  { name: "Tanzania", emoji: "🇹🇿" },
  { name: "Uganda", emoji: "🇺🇬" },

  // Oceanía
  { name: "Australia", emoji: "🇦🇺" },
  { name: "Nueva Zelanda", emoji: "🇳🇿" },
  { name: "Fiyi", emoji: "🇫🇯" },
  { name: "Samoa", emoji: "🇼🇸" },
  { name: "Papúa Nueva Guinea", emoji: "🇵🇬" }
]

// ============================================================
// 🧹 NORMALIZAR TEXTO
// ============================================================

function normalizeText(text) {
  if (!text) return ''

  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?¡¿'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// ============================================================
// 🎲 ELEMENTO ALEATORIO
// ============================================================

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)]
}

// ============================================================
// 👤 OBTENER JID DEL USUARIO
// ============================================================

function getUserJid(m, conn) {
  try {
    return conn.decodeJid
      ? conn.decodeJid(m.sender)
      : m.sender
  } catch {
    return m.sender
  }
}

// ============================================================
// 🌍 HANDLER PRINCIPAL
// ============================================================

let handler = async (m, { conn }) => {

  // ----------------------------------------------------------
  // 🎮 COMPROBAR JUEGOS
  // ----------------------------------------------------------

  const chatSettings =
    global.db?.data?.chats?.[m.chat] || {}

  if (chatSettings.games === false) {
    return conn.sendMessage(
      m.chat,
      {
        text:
          '🎮 *Los mini-juegos están desactivados.*\n\n' +
          '💡 Usa *.juegos* para activarlos.'
      },
      { quoted: m }
    )
  }

  // ----------------------------------------------------------
  // 🗃️ BASE DE PARTIDAS
  // ----------------------------------------------------------

  global.flagGame = global.flagGame || {}

  // Una sola partida por grupo
  if (global.flagGame[m.chat]) {
    return conn.sendMessage(
      m.chat,
      {
        text:
          '🚩 *Ya hay una partida activa.*\n\n' +
          '💬 Responde a la bandera actual antes de iniciar otra.'
      },
      { quoted: m }
    )
  }

  // ----------------------------------------------------------
  // 🎲 SELECCIONAR BANDERA
  // ----------------------------------------------------------

  const correct = randomItem(flags)

  // ----------------------------------------------------------
  // 🧩 GENERAR 4 OPCIONES
  // ----------------------------------------------------------

  let options = [correct.name]

  while (options.length < 4) {

    const option = randomItem(flags).name

    if (!options.includes(option)) {
      options.push(option)
    }
  }

  // Mezclar opciones
  options.sort(() => Math.random() - 0.5)

  // ----------------------------------------------------------
  // 🔢 OPCIÓN CORRECTA
  // ----------------------------------------------------------

  const correctIndex =
    options.findIndex(
      option =>
        normalizeText(option) ===
        normalizeText(correct.name)
    ) + 1

  // ----------------------------------------------------------
  // 📩 MENSAJE DEL JUEGO
  // ----------------------------------------------------------

  const texto =
`╭━━━〔 🚩 *ADIVINA LA BANDERA* 〕━━━╮
┃
┃ ${correct.emoji}
┃
┃ ❓ *¿De qué país es esta bandera?*
┃
┃ 🔢 *Opciones:*
┃
┃ 1️⃣ ${options[0]}
┃ 2️⃣ ${options[1]}
┃ 3️⃣ ${options[2]}
┃ 4️⃣ ${options[3]}
┃
┃ 💬 Responde citando este mensaje
┃ con el nombre o número correcto.
┃
┃ ⏱️ *Tiempo: 25 segundos*
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

  try {

    // --------------------------------------------------------
    // 📤 ENVIAR PREGUNTA
    // --------------------------------------------------------

    const msg = await conn.sendMessage(
      m.chat,
      {
        text: texto
      }
    )

    const messageId = msg?.key?.id

    if (!messageId) {
      throw new Error(
        'No se pudo obtener el ID del mensaje del juego.'
      )
    }

    // --------------------------------------------------------
    // ⏱️ TEMPORIZADOR
    // --------------------------------------------------------

    const timeout = setTimeout(async () => {

      const game = global.flagGame?.[m.chat]

      if (!game) return
      if (game.messageId !== messageId) return
      if (game.answered) return

      try {

        await conn.sendMessage(
          m.chat,
          {
            text:
`⏰ *¡TIEMPO AGOTADO!*

🚩 La bandera era de:
🌎 *${game.answer}* ${game.emoji}

🔢 La opción correcta era: *${game.correctIndex}*

🎮 ¡Intentá nuevamente!`
          },
          { quoted: msg }
        )

      } catch (error) {
        console.error(
          '❌ Error enviando resultado de bandera:',
          error
        )
      }

      delete global.flagGame[m.chat]

    }, 25000)

    // --------------------------------------------------------
    // 💾 GUARDAR PARTIDA
    // --------------------------------------------------------

    global.flagGame[m.chat] = {
      answer: correct.name,
      emoji: correct.emoji,
      options,
      correctIndex,
      messageId,
      answered: false,
      timeout
    }

  } catch (error) {

    console.error(
      '❌ Error iniciando juego de bandera:',
      error
    )

    return conn.sendMessage(
      m.chat,
      {
        text:
          '❌ *No se pudo iniciar el juego de banderas.*'
      },
      { quoted: m }
    )
  }
}

// ============================================================
// 🧠 COMPROBAR RESPUESTAS
// ============================================================

handler.before = async (m, { conn }) => {

  if (!m.isGroup) return
  if (!m.text) return

  global.flagGame = global.flagGame || {}

  const game = global.flagGame[m.chat]

  if (!game) return
  if (game.answered) return

  // ----------------------------------------------------------
  // 📌 SOLO RESPONDER SI CITA EL MENSAJE DEL JUEGO
  // ----------------------------------------------------------

  const quotedId =
    m.quoted?.key?.id ||
    m.quoted?.id ||
    m.quoted?.stanzaId ||
    m.message?.extendedTextMessage?.contextInfo?.stanzaId

  if (!quotedId) return

  if (quotedId !== game.messageId) return

  // ----------------------------------------------------------
  // 👤 DATOS DEL USUARIO
  // ----------------------------------------------------------

  const userJid = getUserJid(m, conn)

  if (!userJid) return

  const mention =
    `@${userJid.split('@')[0]}`

  // ----------------------------------------------------------
  // 🔎 RESPUESTA
  // ----------------------------------------------------------

  const userAnswer =
    normalizeText(m.text)

  const correctAnswer =
    normalizeText(game.answer)

  // ----------------------------------------------------------
  // 🔢 COMPROBAR NÚMERO
  // ----------------------------------------------------------

  const isNumber =
    /^[1-4]$/.test(userAnswer)

  let correctByNumber = false

  if (isNumber) {

    const selectedIndex =
      parseInt(userAnswer, 10) - 1

    const selectedOption =
      game.options[selectedIndex]

    if (selectedOption) {

      correctByNumber =
        normalizeText(selectedOption) ===
        correctAnswer
    }
  }

  // ----------------------------------------------------------
  // 📝 COMPROBAR NOMBRE
  // ----------------------------------------------------------

  const correctByName =
    userAnswer === correctAnswer

  const isCorrect =
    correctByName ||
    correctByNumber

  // ==========================================================
  // ❌ RESPUESTA INCORRECTA
  // ==========================================================

  if (!isCorrect) {

    const mensajes = [

      `❌ ${mention} *¡Incorrecto!* 😅\n\n💬 Tu respuesta: *${m.text}*\n🔄 ¡Seguí intentando!`,

      `🤔 ${mention} *esa no es.*\n\n🚩 La bandera todavía está esperando una respuesta correcta.`,

      `❌ ${mention} *respuesta incorrecta.*\n\n🎯 Probá con otra opción.`,

      `😅 ${mention} *casi... pero no.*\n\n🚩 ¡Todavía podés intentarlo!`

    ]

    return conn.sendMessage(
      m.chat,
      {
        text: randomItem(mensajes),
        mentions: [userJid]
      },
      { quoted: m }
    )
  }

  // ==========================================================
  // 🏆 RESPUESTA CORRECTA
  // ==========================================================

  game.answered = true

  clearTimeout(game.timeout)

  const mensajesCorrectos = [

`🎉 *¡CORRECTO!* 🎉

👤 ${mention}
🚩 La bandera pertenece a:
🌎 *${game.answer}* ${game.emoji}

🏆 ¡Excelente!`,

`🏆 *¡MUY BIEN!* 🏆

👤 ${mention} acertó la bandera.

🚩 *${game.answer}* ${game.emoji}

🔥 ¡Respuesta correcta!`,

`🔥 *¡ACERTASTE!* 🔥

👤 ${mention}
🌎 País: *${game.answer}*
🚩 Bandera: ${game.emoji}

👏 ¡Muy buena!`

  ]

  await conn.sendMessage(
    m.chat,
    {
      text: randomItem(mensajesCorrectos),
      mentions: [userJid]
    },
    { quoted: m }
  )

  // ----------------------------------------------------------
  // 🧹 ELIMINAR PARTIDA
  // ----------------------------------------------------------

  delete global.flagGame[m.chat]
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = [
  'bandera',
  'flags',
  'flag'
]

handler.help = [
  'bandera'
]

handler.tags = [
  'juegos'
]

handler.group = true

export default handler
