// 📂 plugins/trivia.js — FelixCat_Bot
// 🎯 Juego de Trivia
// ✅ Responde citando exactamente el mensaje de la pregunta
// ⏳ 30 segundos por pregunta

console.log('[Plugin] trivia cargado')

const activeTrivia = {}

const preguntasTrivia = [
  {
    pregunta: "¿Cuál es el planeta más grande del sistema solar?",
    opciones: ["Marte", "Júpiter", "Saturno", "Neptuno"],
    respuesta: "Júpiter"
  },
  {
    pregunta: "¿Quién pintó 'La última cena'?",
    opciones: ["Leonardo da Vinci", "Miguel Ángel", "Picasso", "Van Gogh"],
    respuesta: "Leonardo da Vinci"
  },
  {
    pregunta: "¿Cuál es el río más largo del mundo?",
    opciones: ["Amazonas", "Nilo", "Yangtsé", "Misisipi"],
    respuesta: "Amazonas"
  },
  {
    pregunta: "¿En qué año llegó el hombre a la Luna?",
    opciones: ["1965", "1969", "1971", "1959"],
    respuesta: "1969"
  },
  {
    pregunta: "¿Cuál es el animal terrestre más veloz?",
    opciones: ["León", "Tigre", "Guepardo", "Lobo"],
    respuesta: "Guepardo"
  },
  {
    pregunta: "¿Cuál es el océano más grande?",
    opciones: ["Atlántico", "Índico", "Pacífico", "Ártico"],
    respuesta: "Pacífico"
  },
  {
    pregunta: "¿Qué gas respiramos para vivir?",
    opciones: ["Nitrógeno", "Oxígeno", "Dióxido de carbono", "Helio"],
    respuesta: "Oxígeno"
  },
  {
    pregunta: "¿Cuál es la capital de Japón?",
    opciones: ["Seúl", "Tokio", "Kioto", "Osaka"],
    respuesta: "Tokio"
  },
  {
    pregunta: "¿Quién escribió 'Cien años de soledad'?",
    opciones: [
      "Mario Vargas Llosa",
      "Gabriel García Márquez",
      "Pablo Neruda",
      "Julio Cortázar"
    ],
    respuesta: "Gabriel García Márquez"
  },
  {
    pregunta: "¿Cuál es el metal más ligero?",
    opciones: ["Aluminio", "Hierro", "Litio", "Mercurio"],
    respuesta: "Litio"
  },
  {
    pregunta: "¿Qué país ganó el Mundial de fútbol 2022?",
    opciones: ["Francia", "Brasil", "Argentina", "España"],
    respuesta: "Argentina"
  },
  {
    pregunta: "¿Cuál es el idioma más hablado del mundo?",
    opciones: ["Inglés", "Mandarín", "Español", "Hindi"],
    respuesta: "Mandarín"
  },
  {
    pregunta: "¿Qué elemento químico tiene el símbolo 'O'?",
    opciones: ["Oro", "Oxígeno", "Osmio", "Oxalato"],
    respuesta: "Oxígeno"
  },
  {
    pregunta: "¿Qué país tiene forma de bota?",
    opciones: ["Portugal", "Italia", "Grecia", "España"],
    respuesta: "Italia"
  },
  {
    pregunta: "¿Quién es reconocido como inventor del teléfono?",
    opciones: [
      "Nikola Tesla",
      "Alexander Graham Bell",
      "Thomas Edison",
      "Einstein"
    ],
    respuesta: "Alexander Graham Bell"
  },
  {
    pregunta: "¿Cuál es la capital de Canadá?",
    opciones: ["Toronto", "Ottawa", "Vancouver", "Montreal"],
    respuesta: "Ottawa"
  },
  {
    pregunta: "¿Qué vitamina se obtiene principalmente mediante la exposición al sol?",
    opciones: ["Vitamina A", "Vitamina C", "Vitamina D", "Vitamina B12"],
    respuesta: "Vitamina D"
  },
  {
    pregunta: "¿Cuál es el país más poblado del mundo?",
    opciones: ["China", "India", "Estados Unidos", "Indonesia"],
    respuesta: "India"
  },
  {
    pregunta: "¿Qué órgano bombea la sangre en el cuerpo?",
    opciones: ["Pulmón", "Corazón", "Riñón", "Hígado"],
    respuesta: "Corazón"
  },
  {
    pregunta: "¿Qué instrumento mide la temperatura?",
    opciones: ["Barómetro", "Termómetro", "Higrómetro", "Anemómetro"],
    respuesta: "Termómetro"
  }
]

// ============================================================
// 🧹 NORMALIZAR TEXTO
// ============================================================

function normalizarTexto(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// ============================================================
// 🔎 OBTENER ID DEL MENSAJE CITADO
// ============================================================

function obtenerIdCitado(m) {
  return (
    m?.quoted?.id ||
    m?.quoted?.key?.id ||
    m?.quoted?.key?.remoteJid ||
    null
  )
}

// ============================================================
// 🎯 HANDLER PRINCIPAL
// ============================================================

let handler = async (m, { conn }) => {
  try {
    if (!m.isGroup) return

    // ========================================================
    // 🔒 COMPROBAR SI LOS JUEGOS ESTÁN ACTIVADOS
    // ========================================================

    const chat =
      global.db?.data?.chats?.[m.chat] ||
      {}

    if (chat.games === false) return

    // Si games no está configurado, también permitimos el juego.
    // Si querés que sea obligatorio activarlo, cambiá por:
    // if (!chat.games) return

    // ========================================================
    // 🚫 YA HAY UNA TRIVIA ACTIVA
    // ========================================================

    if (activeTrivia[m.chat]) {
      return m.reply(
        '⚠️ Ya hay una trivia activa.\n\n' +
        '💡 Respondé la pregunta actual citando su mensaje.'
      )
    }

    // ========================================================
    // 🎲 ELEGIR PREGUNTA
    // ========================================================

    const pregunta =
      preguntasTrivia[
        Math.floor(Math.random() * preguntasTrivia.length)
      ]

    // ========================================================
    // 📝 CREAR TEXTO
    // ========================================================

    const texto =
      `╭━━━〔 🎯 TRIVIA 〕━━━⬣\n` +
      `┃\n` +
      `┃ ❓ ${pregunta.pregunta}\n` +
      `┃\n` +
      pregunta.opciones
        .map((opcion, i) => `┃ ${i + 1}️⃣ ${opcion}`)
        .join('\n') +
      `\n┃\n` +
      `┃ ⏳ Tiempo: *30 segundos*\n` +
      `┃ 📝 Respondé *citando este mensaje*\n` +
      `┃\n` +
      `╰━━━━━━━━━━━━━━━━⬣`

    // ========================================================
    // 📤 ENVIAR TRIVIA
    // ========================================================

    const msg = await conn.reply(m.chat, texto, m)

    // Obtener ID real del mensaje enviado
    const msgId =
      msg?.key?.id ||
      msg?.id ||
      null

    if (!msgId) {
      console.error('❌ No se pudo obtener el ID del mensaje de trivia.')
      return
    }

    // ========================================================
    // 💾 GUARDAR TRIVIA ACTIVA
    // ========================================================

    activeTrivia[m.chat] = {
      pregunta: pregunta.pregunta,
      opciones: pregunta.opciones,
      respuesta: pregunta.respuesta,
      msgId,
      timeout: null
    }

    // ========================================================
    // ⏳ TEMPORIZADOR
    // ========================================================

    activeTrivia[m.chat].timeout = setTimeout(async () => {
      try {
        const juego = activeTrivia[m.chat]

        if (!juego) return

        await conn.reply(
          m.chat,
          `╭━━━〔 ⏰ TIEMPO AGOTADO 〕━━━⬣\n` +
          `┃\n` +
          `┃ ❌ Nadie respondió correctamente.\n` +
          `┃\n` +
          `┃ ✅ Respuesta correcta:\n` +
          `┃ *${juego.respuesta}*\n` +
          `┃\n` +
          `╰━━━━━━━━━━━━━━━━⬣`
        )

        delete activeTrivia[m.chat]

      } catch (error) {
        console.error('❌ Error en timeout de trivia:', error)

        delete activeTrivia[m.chat]
      }
    }, 30000)

  } catch (error) {
    console.error('❌ Error iniciando trivia:', error)
  }
}

// ============================================================
// 📌 CAPTURAR RESPUESTAS CITANDO LA TRIVIA
// ============================================================

handler.all = async function (m) {
  try {
    if (!m?.chat) return
    if (!m?.text) return
    if (!m.isGroup) return

    const juego = activeTrivia[m.chat]

    // No hay trivia activa
    if (!juego) return

    // ========================================================
    // 🔗 VERIFICAR QUE SEA RESPUESTA CITANDO LA TRIVIA
    // ========================================================

    const quotedId = obtenerIdCitado(m)

    if (!quotedId) return

    // Tiene que ser exactamente el mensaje de la trivia
    if (quotedId !== juego.msgId) return

    // ========================================================
    // 📝 RESPUESTA DEL USUARIO
    // ========================================================

    const respuestaUsuario = normalizarTexto(m.text)
    const respuestaCorrecta = normalizarTexto(juego.respuesta)

    // ========================================================
    // 🔢 TAMBIÉN PERMITIR RESPONDER CON EL NÚMERO
    // ========================================================

    let respuestaFinal = respuestaUsuario

    const numero = Number(respuestaUsuario)

    if (
      Number.isInteger(numero) &&
      numero >= 1 &&
      numero <= juego.opciones.length
    ) {
      respuestaFinal = normalizarTexto(
        juego.opciones[numero - 1]
      )
    }

    // ========================================================
    // ✅ RESPUESTA CORRECTA
    // ========================================================

    if (respuestaFinal === respuestaCorrecta) {

      clearTimeout(juego.timeout)

      const usuario =
        m.pushName ||
        'usuario'

      await m.reply(
        `╭━━━〔 🎉 ¡CORRECTO! 〕━━━⬣\n` +
        `┃\n` +
        `┃ 🏆 ¡Bien hecho, *${usuario}*!\n` +
        `┃\n` +
        `┃ ✅ Respuesta:\n` +
        `┃ *${juego.respuesta}*\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━⬣`
      )

      delete activeTrivia[m.chat]

      return
    }

    // ========================================================
    // ❌ RESPUESTA INCORRECTA
    // ========================================================

    await m.reply(
      `❌ *Incorrecto, ${m.pushName || 'usuario'}.*\n\n` +
      `💡 La trivia continúa.\n` +
      `⏳ Todavía queda tiempo para responder.`
    )

  } catch (error) {
    console.error('❌ Error procesando respuesta de trivia:', error)
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL LOADER
// ============================================================

handler.help = ['trivia']
handler.tags = ['fun', 'juego']
handler.command = ['trivia']
handler.group = true
handler.register = true

export default handler
