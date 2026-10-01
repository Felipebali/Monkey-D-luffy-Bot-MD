// 📂 plugins/juegos-capital.js
// 🌍 Juego de capitales — FelixCat-Bot 🐾

// ============================================================
// 🌎 BASE DE DATOS DE PAÍSES Y CAPITALES
// ============================================================

const capitales = {
  "Uruguay": "Montevideo",
  "Argentina": "Buenos Aires",
  "Brasil": "Brasilia",
  "Chile": "Santiago",
  "Paraguay": "Asunción",
  "Perú": "Lima",
  "Bolivia": "Sucre",
  "Ecuador": "Quito",
  "Colombia": "Bogotá",
  "Venezuela": "Caracas",
  "Guyana": "Georgetown",
  "Surinam": "Paramaribo",
  "México": "Ciudad de México",
  "Guatemala": "Ciudad de Guatemala",
  "Belice": "Belmopán",
  "Honduras": "Tegucigalpa",
  "El Salvador": "San Salvador",
  "Nicaragua": "Managua",
  "Costa Rica": "San José",
  "Panamá": "Ciudad de Panamá",
  "Cuba": "La Habana",
  "Haití": "Puerto Príncipe",
  "República Dominicana": "Santo Domingo",

  "España": "Madrid",
  "Portugal": "Lisboa",
  "Francia": "París",
  "Alemania": "Berlín",
  "Italia": "Roma",
  "Reino Unido": "Londres",
  "Irlanda": "Dublín",
  "Bélgica": "Bruselas",
  "Países Bajos": "Ámsterdam",
  "Suiza": "Berna",
  "Austria": "Viena",
  "Polonia": "Varsovia",
  "Grecia": "Atenas",
  "Noruega": "Oslo",
  "Suecia": "Estocolmo",
  "Dinamarca": "Copenhague",
  "Finlandia": "Helsinki",
  "Islandia": "Reikiavik",
  "Ucrania": "Kiev",
  "Rumania": "Bucarest",
  "Hungría": "Budapest",
  "Croacia": "Zagreb",
  "Serbia": "Belgrado",
  "Bulgaria": "Sofía",
  "Eslovaquia": "Bratislava",
  "Eslovenia": "Liubliana",
  "Albania": "Tirana",

  "Rusia": "Moscú",
  "China": "Pekín",
  "Japón": "Tokio",
  "Corea del Sur": "Seúl",
  "India": "Nueva Delhi",
  "Pakistán": "Islamabad",
  "Afganistán": "Kabul",
  "Irán": "Teherán",
  "Irak": "Bagdad",
  "Israel": "Jerusalén",
  "Turquía": "Ankara",
  "Arabia Saudita": "Riad",
  "Emiratos Árabes Unidos": "Abu Dabi",
  "Qatar": "Doha",
  "Jordania": "Amán",

  "Egipto": "El Cairo",
  "Marruecos": "Rabat",
  "Argelia": "Argel",
  "Túnez": "Túnez",
  "Libia": "Trípoli",
  "Sudáfrica": "Pretoria",
  "Nigeria": "Abuya",
  "Kenia": "Nairobi",
  "Etiopía": "Adís Abeba",
  "Ghana": "Acra",
  "Senegal": "Dakar",
  "Tanzania": "Dodoma",
  "Uganda": "Kampala",
  "Angola": "Luanda",

  "Estados Unidos": "Washington D.C.",
  "Canadá": "Ottawa",
  "Australia": "Canberra",
  "Nueva Zelanda": "Wellington"
}

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
// 🎲 OBTENER PAÍS ALEATORIO
// ============================================================

function obtenerPais() {
  const paises = Object.keys(capitales)
  return paises[Math.floor(Math.random() * paises.length)]
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

  global.capitalGame = global.capitalGame || {}

  // Evitar dos partidas simultáneas
  if (global.capitalGame[m.chat]) {
    return conn.sendMessage(
      m.chat,
      {
        text:
          '🌍 *Ya hay una partida activa.*\n\n' +
          '💬 Responde a la pregunta actual antes de iniciar otra.'
      },
      { quoted: m }
    )
  }

  // ----------------------------------------------------------
  // 🎲 GENERAR PARTIDA
  // ----------------------------------------------------------

  const pais = obtenerPais()
  const capital = capitales[pais]

  try {

    const msg = await conn.sendMessage(
      m.chat,
      {
        text:
`╭━━━〔 🌍 *CAPITALES* 〕━━━╮
┃
┃ ❓ *¿Cuál es la capital de:*
┃
┃ 🌎 *${pais}*
┃
┃ 💬 Responde citando este mensaje
┃ con el nombre de la capital.
┃
┃ ⏱️ *Tiempo:* 25 segundos
┃ 🎯 *Intentos:* ilimitados
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
      },
      { quoted: m }
    )

    // --------------------------------------------------------
    // 💾 GUARDAR PARTIDA
    // --------------------------------------------------------

    const messageId = msg?.key?.id

    if (!messageId) {
      throw new Error('No se pudo obtener el ID del mensaje.')
    }

    const timeout = setTimeout(async () => {

      const game = global.capitalGame?.[m.chat]

      if (!game) return
      if (game.messageId !== messageId) return

      try {
        await conn.sendMessage(
          m.chat,
          {
            text:
`⏰ *¡TIEMPO AGOTADO!*

🌎 País: *${game.country}*
🏙️ Capital: *${game.answer}*

🎮 ¡Inténtalo nuevamente!`
          },
          { quoted: msg }
        )
      } catch (e) {
        console.error('Error enviando resultado:', e)
      }

      delete global.capitalGame[m.chat]

    }, 25000)

    global.capitalGame[m.chat] = {
      country: pais,
      answer: capital,
      messageId,
      answered: false,
      timeout
    }

  } catch (error) {

    console.error('❌ Error iniciando juego:', error)

    return conn.sendMessage(
      m.chat,
      {
        text: '❌ No se pudo iniciar el juego de capitales.'
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

  global.capitalGame = global.capitalGame || {}

  const game = global.capitalGame[m.chat]

  if (!game) return
  if (game.answered) return

  // ----------------------------------------------------------
  // 📌 SOLO RESPONDIENDO AL MENSAJE DEL JUEGO
  // ----------------------------------------------------------

  const quotedId =
    m.quoted?.key?.id ||
    m.quoted?.id ||
    m.message?.extendedTextMessage?.contextInfo?.stanzaId

  if (!quotedId) return
  if (quotedId !== game.messageId) return

  // ----------------------------------------------------------
  // 🔎 COMPARAR RESPUESTA
  // ----------------------------------------------------------

  const respuestaUsuario =
    normalizeText(m.text)

  const respuestaCorrecta =
    normalizeText(game.answer)

  // ----------------------------------------------------------
  // ❌ RESPUESTA INCORRECTA
  // ----------------------------------------------------------

  if (respuestaUsuario !== respuestaCorrecta) {

    const mensajes = [
      '❌ *Incorrecto.* Sigue intentando.',
      '🤔 *No es esa.* Probá nuevamente.',
      '❌ *Respuesta incorrecta.*',
      '😅 *Casi...* pero esa no es.'
    ]

    return conn.sendMessage(
      m.chat,
      {
        text:
          mensajes[
            Math.floor(Math.random() * mensajes.length)
          ]
      },
      { quoted: m }
    )
  }

  // ----------------------------------------------------------
  // 🏆 RESPUESTA CORRECTA
  // ----------------------------------------------------------

  game.answered = true

  clearTimeout(game.timeout)

  const nombre =
    m.pushName ||
    `@${m.sender.split('@')[0]}`

  const mensajesCorrectos = [
    `🎉 *¡CORRECTO, ${nombre}!*\n\n🌎 ${game.country} → 🏙️ *${game.answer}*`,
    `🏆 *¡Muy bien, ${nombre}!*\n\nLa capital de *${game.country}* es *${game.answer}*.`,
    `🔥 *¡Acertaste, ${nombre}!*\n\n🏙️ La respuesta era *${game.answer}*.`
  ]

  await conn.sendMessage(
    m.chat,
    {
      text:
        mensajesCorrectos[
          Math.floor(
            Math.random() *
            mensajesCorrectos.length
          )
        ]
    },
    { quoted: m }
  )

  delete global.capitalGame[m.chat]
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  'capital',
  'capitales'
]

handler.tags = [
  'game'
]

handler.command = [
  'capital',
  'capitales'
]

handler.group = true

export default handler
