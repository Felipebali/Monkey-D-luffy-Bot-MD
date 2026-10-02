// 📂 plugins/tagall2.js
// 👻 Mención oculta x4
// 👑 SOLO ROOT OWNERS reales
// 🚫 No responde/cita el mensaje que activa el comando
// 🔄 Frases aleatorias sin repetir inmediatamente
// 🛡️ Compatible con Baileys MD

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const RONDAS = 4
const ESPERA_ENTRE_MENSAJES = 1500

// Cantidad de espacios invisibles.
// Se mantiene moderada para evitar mensajes innecesariamente enormes.
const INVISIBLE = '\u200B'.repeat(250)

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

// ============================================================
// 💬 FRASES
// ============================================================

const frases = [

  '🌞 ¡Despierten! El grupo necesita actividad.',
  '🔥 ¡Hora de mover un poco este grupo!',
  '🎯 ¡Vamos equipo, activen el chat!',
  '🎉 ¡Que empiece el movimiento!',
  '🌙 ¿Quién sigue despierto por acá?',
  '🧠 ¡Hora de activar las neuronas!',
  '💬 ¡No dejen morir el grupo!',
  '🎵 ¡Un poco de música y movimiento para el chat!',
  '💪 ¡Energía arriba, gente!',
  '🚀 ¡Despegamos! Hora de activar el grupo.',
  '⚡ ¡Se detectó actividad pendiente en este chat!',
  '🎮 ¡Modo diversión activado!',
  '🔥 ¡Que aparezcan los desaparecidos!',
  '👀 ¿Dónde está todo el mundo?',
  '📢 ¡Atención grupo! Se solicita actividad inmediata.',
  '💥 ¡Sacudida general del chat!',
  '🎭 ¡Se abre el telón! Que empiece el espectáculo.',
  '☕ Café listo, grupo listo... ¿o no?',
  '📡 Señal recibida: el grupo necesita movimiento.',
  '🔔 Campanita del grupo: ¡hora de aparecer!',
  '🌎 Saludos para todos los habitantes de este chat.',
  '✨ El chat estaba demasiado tranquilo... eso se terminó.',
  '🪩 ¡Modo fiesta activado!',
  '🎊 ¡Vamos a darle vida a este grupo!',
  '😎 Los que están despiertos que se hagan notar.',
  '🫡 Presente quien siga con vida por acá.',
  '🚨 Alerta de silencio extremo detectada.',
  '📣 ¡Convocatoria oficial para revivir el chat!',
  '🌟 Hoy puede ser un buen día para mandar un mensaje.',
  '🧩 El sistema detectó demasiada tranquilidad.',
  '⚙️ Reiniciando actividad del grupo...',
  '💫 El universo dice que alguien tiene que hablar.',
  '🌪️ Se aproxima una tormenta de mensajes.',
  '🎯 Objetivo del día: que alguien responda.',
  '🥳 ¡Arriba ese ánimo, gente!',
  '📲 Si estás leyendo esto, técnicamente estás presente.',
  '🗣️ ¡Una palabra aunque sea!',
  '👋 Saluden antes de que vuelva a pasar.',
  '🔥 El chat pide contenido nuevo.',
  '💎 Los presentes tienen que demostrar que siguen vivos.',
  '🚀 Activando protocolo anti-silencio.',
  '🧠 Comprobación de actividad cerebral iniciada.',
  '📡 Todos los sensores apuntan hacia este grupo.',
  '🎬 ¡Comienza una nueva escena en el chat!',
  '🌈 Un poco de caos tampoco viene mal.',
  '⚡ ¡Nivel de energía del grupo: aumentando!',
  '🎪 El circo está abierto. Faltan los protagonistas.',
  '🕺 ¡Que alguien empiece la fiesta!',
  '💬 Este grupo tiene teclado, ahora falta usarlo.',
  '🔊 ¡Suban el volumen del chat!',
  '🌙 Para los nocturnos: seguimos acá.',
  '☀️ Para los diurnos: buenos días, criaturas.',
  '👽 Comunicación extraterrestre detectada: "hablen".',
  '🤖 El sistema solicita interacción humana.',
  '🛰️ Mensaje transmitido desde la central del grupo.',
  '🎲 El azar eligió este momento para despertar el chat.',
  '🏆 Premio imaginario para quien mande el próximo mensaje.',
  '😈 El silencio estaba demasiado cómodo.',
  '💥 ¡Rompan el silencio!',
  '📢 Comunicado oficial: pueden hablar.',
  '🫣 Algunos están leyendo en silencio... los estamos viendo.',
  '👀 Sí, vos que estás mirando también podés hablar.',
  '🔥 Grupo activado. Ahora depende de ustedes.',
  '🎉 ¡Bienvenidos nuevamente al mundo de los mensajes!'
]

// ============================================================
// 👑 OBTENER ROOT OWNERS
// ============================================================

function getOwners(conn) {

  return (global.owner || [])
    .map(owner => {

      if (Array.isArray(owner))
        owner = owner[0]

      if (
        typeof owner !== 'string' &&
        typeof owner !== 'number'
      ) {
        return null
      }

      const number =
        String(owner).replace(/\D/g, '')

      if (!number)
        return null

      return `${number}@s.whatsapp.net`
    })
    .filter(Boolean)
}

// ============================================================
// 🔐 NORMALIZAR JID
// ============================================================

function normalizeJid(conn, jid) {

  if (!jid)
    return null

  try {

    const decoded =
      conn.decodeJid
        ? conn.decodeJid(jid)
        : jid

    if (!decoded)
      return null

    if (
      decoded.includes('@g.us') ||
      decoded.includes('@broadcast')
    ) {
      return decoded
    }

    const number =
      decoded
        .split('@')[0]
        .replace(/\D/g, '')

    return number
      ? `${number}@s.whatsapp.net`
      : null

  } catch {

    return null
  }
}

// ============================================================
// 🎲 FRASE ALEATORIA SIN REPETIR
// ============================================================

function obtenerFrase(chatId) {

  if (!global.tagall2Last)
    global.tagall2Last = {}

  const anterior =
    global.tagall2Last[chatId]

  let frase
  let intentos = 0

  do {

    frase =
      frases[
        Math.floor(
          Math.random() * frases.length
        )
      ]

    intentos++

  } while (
    frase === anterior &&
    intentos < 20
  )

  global.tagall2Last[chatId] = frase

  return frase
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (
  m,
  {
    conn,
    isBotAdmin
  }
) => {

  try {

    // ========================================================
    // 👥 SOLO GRUPOS
    // ========================================================

    if (!m.isGroup)
      return

    // ========================================================
    // 🤖 EL BOT DEBE SER ADMIN
    // ========================================================

    if (!isBotAdmin)
      return

    // ========================================================
    // 👑 VERIFICAR ROOT OWNER
    // ========================================================

    const owners =
      getOwners(conn)

    const sender =
      normalizeJid(
        conn,
        m.sender
      )

    if (
      !sender ||
      !owners.includes(sender)
    ) {
      return
    }

    // ========================================================
    // 👥 OBTENER METADATA ACTUALIZADA
    // ========================================================

    const metadata =
      await conn.groupMetadata(
        m.chat
      )

    const botJid =
      normalizeJid(
        conn,
        conn.user?.id ||
        conn.user?.jid
      )

    // ========================================================
    // 👥 PARTICIPANTES
    // ========================================================

    const members = [
      ...new Set(
        (metadata?.participants || [])
          .map(p =>
            normalizeJid(
              conn,
              p.id
            )
          )
          .filter(Boolean)
      )
    ]

    // ========================================================
    // 🚫 EXCLUIR AL BOT
    // ========================================================

    const mentions =
      members.filter(
        jid => jid !== botJid
      )

    if (!mentions.length)
      return

    // ========================================================
    // 📢 ENVIAR LAS RONDAS
    // ========================================================

    for (
      let i = 0;
      i < RONDAS;
      i++
    ) {

      const frase =
        obtenerFrase(m.chat)

      // 🚫 SIN quoted
      // 👻 Mención visualmente oculta
      await conn.sendMessage(
        m.chat,
        {
          text:
            `${frase}\n${INVISIBLE}`,
          mentions
        }
      )

      // ⏱️ Evitar enviar todo instantáneamente
      if (
        i < RONDAS - 1
      ) {
        await sleep(
          ESPERA_ENTRE_MENSAJES
        )
      }
    }

  } catch (error) {

    console.error(
      '❌ Error en tagall2:',
      error
    )

    // 🚫 No manda mensajes de error al grupo.
    // Así el comando falla silenciosamente.
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL COMANDO
// ============================================================

handler.command = [
  'tagall2'
]

handler.help = [
  'tagall2'
]

handler.tags = [
  'owner'
]

handler.group = true

export default handler
