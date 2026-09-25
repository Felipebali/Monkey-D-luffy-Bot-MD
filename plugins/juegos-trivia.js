// 📂 plugins/trivia.js
// 🎯 FelixCat_Bot — Trivia simple
// ✅ Sin handler.all
// ✅ Sin dfail
// ✅ Sin permisos
// ✅ Responde citando la pregunta
// ⏳ 30 segundos

console.log('[Plugin] trivia cargado')

const activeTrivia = new Map()

const preguntas = [
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
    pregunta: '¿Cuál es la capital de Canadá?',
    opciones: ['Toronto', 'Ottawa', 'Vancouver', 'Montreal'],
    respuesta: 'Ottawa'
  },
  {
    pregunta: '¿Qué vitamina se obtiene principalmente mediante el sol?',
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
// 🧹 NORMALIZAR TEXTO
// ============================================================

function normalizar(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// ============================================================
// 🔎 BUSCAR ID DEL MENSAJE CITADO
// ============================================================

function obtenerIdCitado(m) {
  return (
    m?.quoted?.id ||
    m?.quoted?.key?.id ||
    m?.msg?.contextInfo?.stanzaId ||
    m?.message?.extendedTextMessage?.contextInfo?.stanzaId ||
    null
  )
}

// ============================================================
// 🎯 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn }) => {
  try {

    if (!m.isGroup) return

    const chatId = m.chat

    // ========================================================
    // 📝 SI ES UNA RESPUESTA A UNA TRIVIA ACTIVA
    // ========================================================

    const juego = activeTrivia.get(chatId)

    if (juego) {

      const citado = obtenerIdCitado(m)

      // No está citando la pregunta
      if (citado && citado === juego.msgId) {

        const texto = normalizar(m.text)

        let respuesta = texto

        // ====================================================
        // 🔢 ACEPTAR 1 / 2 / 3 / 4
        // ====================================================

        if (/^[1-4]$/.test(texto)) {

          const numero = Number(texto)

          if (numero <= juego.opciones.length) {
            respuesta = normalizar(
              juego.opciones[numero - 1]
            )
          }
        }

        // ====================================================
        // ✅ CORRECTA
        // ====================================================

        if (respuesta === normalizar(juego.respuesta)) {

          clearTimeout(juego.timer)

          await conn.sendMessage(
            chatId,
            {
              text:
                `╭━━━〔 🎉 TRIVIA 〕━━━⬣\n` +
                `┃\n` +
                `┃ ✅ ¡CORRECTO!\n` +
                `┃\n` +
                `┃ 🏆 @${String(m.sender).split('@')[0]}\n` +
                `┃\n` +
                `┃ 💡 Respuesta:\n` +
                `┃ *${juego.respuesta}*\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`,
              mentions: [m.sender]
            }
          )

          activeTrivia.delete(chatId)

        } else {

          // ==================================================
          // ❌ INCORRECTA
          // ==================================================

          await conn.sendMessage(
            chatId,
            {
              text:
                `❌ *Incorrecto, ${m.pushName || 'usuario'}.*\n\n` +
                `💡 La trivia sigue activa.\n` +
                `⏳ Intentá nuevamente citando la pregunta.`
            }
          )
        }

        return
      }
    }

    // ========================================================
    // 🎲 COMPROBAR SI ES .TRIVIA
    // ========================================================

    const texto = String(m.text || '').trim()

    if (!/^\.trivia$/i.test(texto)) {
      return
    }

    // ========================================================
    // 🚫 YA HAY UNA TRIVIA
    // ========================================================

    if (activeTrivia.has(chatId)) {

      await conn.sendMessage(
        chatId,
        {
          text:
            '⚠️ Ya hay una trivia activa.\n\n' +
            '📝 Respondé citando la pregunta actual.'
        }
      )

      return
    }

    // ========================================================
    // 🎲 ELEGIR PREGUNTA
    // ========================================================

    const pregunta =
      preguntas[
        Math.floor(
          Math.random() * preguntas.length
        )
      ]

    // ========================================================
    // 📝 CREAR MENSAJE
    // ========================================================

    const textoTrivia =
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
    // 📤 ENVIAR
    // ========================================================

    const enviado = await conn.sendMessage(
      chatId,
      {
        text: textoTrivia
      },
      {
        quoted: m
      }
    )

    // ========================================================
    // 🆔 GUARDAR ID
    // ========================================================

    const msgId = enviado?.key?.id

    if (!msgId) {

      console.error(
        '[Trivia] No se pudo obtener el ID del mensaje.'
      )

      return
    }

    // ========================================================
    // 💾 GUARDAR TRIVIA
    // ========================================================

    const juegoNuevo = {
      msgId: msgId,
      pregunta: pregunta.pregunta,
      opciones: pregunta.opciones,
      respuesta: pregunta.respuesta,
      timer: null
    }

    activeTrivia.set(chatId, juegoNuevo)

    // ========================================================
    // ⏰ 30 SEGUNDOS
    // ========================================================

    juegoNuevo.timer = setTimeout(
      async () => {

        try {

          const juegoActual =
            activeTrivia.get(chatId)

          if (!juegoActual) return

          await conn.sendMessage(
            chatId,
            {
              text:
                `╭━━━〔 ⏰ TIEMPO AGOTADO 〕━━━⬣\n` +
                `┃\n` +
                `┃ ❌ Se terminó el tiempo.\n` +
                `┃\n` +
                `┃ ✅ La respuesta era:\n` +
                `┃ *${juegoActual.respuesta}*\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            }
          )

          activeTrivia.delete(chatId)

        } catch (error) {

          console.error(
            '[Trivia] Error en temporizador:',
            error
          )

          activeTrivia.delete(chatId)
        }

      },
      30000
    )

  } catch (error) {

    console.error(
      '[Trivia] Error:',
      error
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN FELIXCAT
// ============================================================

handler.help = ['trivia']
handler.tags = ['fun', 'juego']
handler.command = ['trivia']
handler.group = true
handler.register = true

export default handler
