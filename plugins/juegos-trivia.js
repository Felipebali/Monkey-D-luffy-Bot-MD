// 📂 plugins/trivia.js — FelixCat_Bot
// 🎯 Juego de Trivia
// ✅ Responder citando el mensaje de la trivia
// ⏳ 30 segundos
// 🔢 También acepta responder con el número de la opción

console.log('[Plugin] trivia cargado')

const activeTrivia = {}

const preguntasTrivia = [
  {
    pregunta: '¿Cuál es el planeta más grande del sistema solar?',
    opciones: ['Marte', 'Júpiter', 'Saturno', 'Neptuno'],
    respuesta: 'Júpiter'
  },
  {
    pregunta: "¿Quién pintó 'La última cena'?",
    opciones: ['Leonardo da Vinci', 'Miguel Ángel', 'Picasso', 'Van Gogh'],
    respuesta: 'Leonardo da Vinci'
  },
  {
    pregunta: '¿Cuál es el río más largo del mundo?',
    opciones: ['Amazonas', 'Nilo', 'Yangtsé', 'Misisipi'],
    respuesta: 'Amazonas'
  },
  {
    pregunta: '¿En qué año llegó el hombre a la Luna?',
    opciones: ['1965', '1969', '1971', '1959'],
    respuesta: '1969'
  },
  {
    pregunta: '¿Cuál es el animal terrestre más veloz?',
    opciones: ['León', 'Tigre', 'Guepardo', 'Lobo'],
    respuesta: 'Guepardo'
  },
  {
    pregunta: '¿Cuál es el océano más grande?',
    opciones: ['Atlántico', 'Índico', 'Pacífico', 'Ártico'],
    respuesta: 'Pacífico'
  },
  {
    pregunta: '¿Qué gas respiramos para vivir?',
    opciones: ['Nitrógeno', 'Oxígeno', 'Dióxido de carbono', 'Helio'],
    respuesta: 'Oxígeno'
  },
  {
    pregunta: '¿Cuál es la capital de Japón?',
    opciones: ['Seúl', 'Tokio', 'Kioto', 'Osaka'],
    respuesta: 'Tokio'
  },
  {
    pregunta: "¿Quién escribió 'Cien años de soledad'?",
    opciones: [
      'Mario Vargas Llosa',
      'Gabriel García Márquez',
      'Pablo Neruda',
      'Julio Cortázar'
    ],
    respuesta: 'Gabriel García Márquez'
  },
  {
    pregunta: '¿Cuál es el metal más ligero?',
    opciones: ['Aluminio', 'Hierro', 'Litio', 'Mercurio'],
    respuesta: 'Litio'
  },
  {
    pregunta: '¿Qué país ganó el Mundial de fútbol 2022?',
    opciones: ['Francia', 'Brasil', 'Argentina', 'España'],
    respuesta: 'Argentina'
  },
  {
    pregunta: '¿Cuál es el idioma más hablado del mundo?',
    opciones: ['Inglés', 'Mandarín', 'Español', 'Hindi'],
    respuesta: 'Mandarín'
  },
  {
    pregunta: "¿Qué elemento químico tiene el símbolo 'O'?",
    opciones: ['Oro', 'Oxígeno', 'Osmio', 'Oxalato'],
    respuesta: 'Oxígeno'
  },
  {
    pregunta: '¿Qué país tiene forma de bota?',
    opciones: ['Portugal', 'Italia', 'Grecia', 'España'],
    respuesta: 'Italia'
  },
  {
    pregunta: '¿Quién es reconocido como inventor del teléfono?',
    opciones: [
      'Nikola Tesla',
      'Alexander Graham Bell',
      'Thomas Edison',
      'Einstein'
    ],
    respuesta: 'Alexander Graham Bell'
  },
  {
    pregunta: '¿Cuál es la capital de Canadá?',
    opciones: ['Toronto', 'Ottawa', 'Vancouver', 'Montreal'],
    respuesta: 'Ottawa'
  },
  {
    pregunta: '¿Qué vitamina se obtiene principalmente mediante la exposición al sol?',
    opciones: ['Vitamina A', 'Vitamina C', 'Vitamina D', 'Vitamina B12'],
    respuesta: 'Vitamina D'
  },
  {
    pregunta: '¿Cuál es el país más poblado del mundo?',
    opciones: ['China', 'India', 'Estados Unidos', 'Indonesia'],
    respuesta: 'India'
  },
  {
    pregunta: '¿Qué órgano bombea la sangre en el cuerpo?',
    opciones: ['Pulmón', 'Corazón', 'Riñón', 'Hígado'],
    respuesta: 'Corazón'
  },
  {
    pregunta: '¿Qué instrumento mide la temperatura?',
    opciones: ['Barómetro', 'Termómetro', 'Higrómetro', 'Anemómetro'],
    respuesta: 'Termómetro'
  }
]

// ============================================================
// 🧹 NORMALIZAR RESPUESTAS
// ============================================================

function normalizar(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// ============================================================
// 🔎 OBTENER ID DEL MENSAJE CITADO
// ============================================================

function getQuotedId(m) {
  return (
    m?.quoted?.id ||
    m?.quoted?.key?.id ||
    m?.msg?.contextInfo?.stanzaId ||
    m?.message?.extendedTextMessage?.contextInfo?.stanzaId ||
    null
  )
}

// ============================================================
// 🎯 HANDLER
// ============================================================

let handler = async (m, { conn }) => {
  try {

    if (!m.isGroup) return

    // ========================================================
    // 💬 COMPROBAR SI ES UNA RESPUESTA A UNA TRIVIA
    // ========================================================

    const juego = activeTrivia[m.chat]

    if (juego) {

      const quotedId = getQuotedId(m)

      // Solamente procesamos mensajes citando la trivia
      if (quotedId && quotedId === juego.msgId) {

        const respuestaUsuario = normalizar(m.text)

        let respuestaFinal = respuestaUsuario

        // ====================================================
        // 🔢 SI RESPONDE CON 1, 2, 3 O 4
        // ====================================================

        if (/^[1-4]$/.test(respuestaUsuario)) {

          const numero = Number(respuestaUsuario)

          if (
            numero >= 1 &&
            numero <= juego.opciones.length
          ) {
            respuestaFinal = normalizar(
              juego.opciones[numero - 1]
            )
          }
        }

        const respuestaCorrecta =
          normalizar(juego.respuesta)

        // ====================================================
        // ✅ CORRECTO
        // ====================================================

        if (respuestaFinal === respuestaCorrecta) {

          clearTimeout(juego.timeout)

          const nombre =
            m.pushName ||
            'Usuario'

          await conn.reply(
            m.chat,

            `╭━━━〔 🎉 TRIVIA 〕━━━⬣
┃
┃ ✅ ¡CORRECTO!
┃
┃ 🏆 @${m.sender.split('@')[0]}
┃
┃ 💡 Respuesta:
┃ *${juego.respuesta}*
┃
╰━━━━━━━━━━━━━━━━⬣`,

            m,

            {
              mentions: [m.sender]
            }
          )

          delete activeTrivia[m.chat]

          return
        }

        // ====================================================
        // ❌ INCORRECTO
        // ====================================================

        await conn.reply(
          m.chat,
          `❌ *Incorrecto, ${m.pushName || 'usuario'}.*\n\n` +
          `💡 La trivia sigue activa.\n` +
          `⏳ Todavía podés intentar nuevamente.`,
          m
        )

        return
      }
    }

    // ========================================================
    // 🎮 COMANDO .TRIVIA
    // ========================================================

    const chat =
      global.db?.data?.chats?.[m.chat]

    // Si existe la configuración y está desactivada
    if (chat && chat.games === false) {
      return
    }

    // ========================================================
    // 🚫 YA EXISTE UNA TRIVIA
    // ========================================================

    if (activeTrivia[m.chat]) {

      return m.reply(
        `⚠️ *Ya hay una trivia activa.*\n\n` +
        `📝 Respondé citando la pregunta actual.`
      )
    }

    // ========================================================
    // 🎲 ELEGIR PREGUNTA
    // ========================================================

    const pregunta =
      preguntasTrivia[
        Math.floor(
          Math.random() *
          preguntasTrivia.length
        )
      ]

    // ========================================================
    // 📝 CONSTRUIR TRIVIA
    // ========================================================

    const texto =
      `╭━━━〔 🎯 TRIVIA 〕━━━⬣\n` +
      `┃\n` +
      `┃ ❓ *${pregunta.pregunta}*\n` +
      `┃\n` +
      pregunta.opciones
        .map(
          (opcion, i) =>
            `┃ ${i + 1}️⃣ ${opcion}`
        )
        .join('\n') +
      `\n┃\n` +
      `┃ ⏳ Tiempo: *30 segundos*\n` +
      `┃ 📝 Respondé citando este mensaje.\n` +
      `╰━━━━━━━━━━━━━━━━⬣`

    // ========================================================
    // 📤 ENVIAR MENSAJE
    // ========================================================

    const enviado =
      await conn.sendMessage(
        m.chat,
        {
          text: texto
        },
        {
          quoted: m
        }
      )

    // ========================================================
    // 🆔 OBTENER ID
    // ========================================================

    const msgId =
      enviado?.key?.id

    if (!msgId) {

      console.error(
        '❌ Trivia: no se pudo obtener msgId.'
      )

      return m.reply(
        '❌ No pude iniciar la trivia correctamente.'
      )
    }

    // ========================================================
    // 💾 GUARDAR JUEGO
    // ========================================================

    activeTrivia[m.chat] = {

      pregunta: pregunta.pregunta,

      opciones: pregunta.opciones,

      respuesta: pregunta.respuesta,

      msgId: msgId,

      timeout: null
    }

    console.log(
      `[Trivia] ${m.chat} → ${msgId}`
    )

    // ========================================================
    // ⏰ TEMPORIZADOR
    // ========================================================

    activeTrivia[m.chat].timeout =
      setTimeout(async () => {

        try {

          const juego =
            activeTrivia[m.chat]

          if (!juego) return

          await conn.reply(
            m.chat,

            `╭━━━〔 ⏰ TIEMPO AGOTADO 〕━━━⬣
┃
┃ ❌ Nadie respondió correctamente.
┃
┃ ✅ La respuesta era:
┃ *${juego.respuesta}*
┃
╰━━━━━━━━━━━━━━━━⬣`
          )

          delete activeTrivia[m.chat]

        } catch (error) {

          console.error(
            '❌ Error finalizando trivia:',
            error
          )

          delete activeTrivia[m.chat]
        }

      }, 30000)

  } catch (error) {

    console.error(
      '❌ Error en trivia:',
      error
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = ['trivia']

handler.tags = [
  'fun',
  'juego'
]

handler.command = [
  'trivia'
]

handler.group = true

handler.register = true

export default handler
