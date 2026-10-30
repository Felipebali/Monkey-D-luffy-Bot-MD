
// 📂 plugins/mejorbro.js
// 🤖 WHATSAPP-BOT — La mejor bro del mundo 💖
// ⏱️ Cooldown: 1 minuto por grupo
// 🎲 Frases aleatorias sin repetición

const BRO_NUMBER = '59893491934'
const BRO_JID = '59893491934@s.whatsapp.net'

const BRO_LID = '181080552378538@lid'
const BRO_LID_NUMBER = '181080552378538'

const COOLDOWN = 5 * 60 * 1000

const cooldowns = new Map()
const procesados = new Set()

// Control de frases sin repetición
let frasesDisponibles = []
let ultimaFrase = null

const FRASES = [
  `👑💖 ¡@BRO es la mejor bro que se puede tener!

✨ Una amiga de oro, única e incondicional.
🫶 ¡Una verdadera hermana de la vida!`,

  `💎🌹 ¡@BRO es de esas personas que no se encuentran dos veces!

🤍 Vale más que mil amistades pasajeras.
👑 ¡Una reina que merece todo lo bonito!`,

  `🫂💗 ¡Atención, grupo! @BRO es una bro de otro nivel.

🔥 Lealtad, buena vibra y un corazón enorme.
🏆 ¡La mejor compañera que se puede tener!`,

  `🌟👑 ¡@BRO no es una bro cualquiera, es una leyenda!

💖 De esas personas que hacen la diferencia.
🤝 ¡Una verdadera hermana elegida por la vida!`,

  `💐💕 ¡Si hablamos de buenas amistades, hablamos de @BRO!

✨ Una persona que vale oro.
💎 ¡Inigualable, auténtica y especial!`,

  `🛡️💖 ¡@BRO tiene el título oficial de MEJOR BRO!

👑 Nadie le quita esa corona.
🤝 ¡Amistad de la buena!`,

  `🌈🫶 ¡La vida se disfruta más con una bro como @BRO!

💗 Buena energía y una amistad especial.
👑 ¡Una reina en su propia historia!`,

  `🚨👑 ¡COMUNICADO OFICIAL DE WHATSAPP-BOT!

📢 @BRO ha sido reconocida como una de las mejores bros.
💖 ¡El título es permanente!`,

  `💫🌹 ¡Una amistad gigante para @BRO!

🫂 Hay personas que llegan y se vuelven familia.
💖 ¡Ella es una de esas personas!`,

  `🏆💗 ¡Premio a la mejor bro del universo para @BRO!

🥇 Por ser única.
👑 ¡La campeona indiscutida de la amistad!`,

  `🐐🔥 ¡@BRO es la GOAT de las bros!

👑 La número uno, la irrepetible, la legendaria.
💖 ¡No hay ranking que le haga justicia!`,

  `📰 ÚLTIMO MOMENTO:

Fuentes muy confiables (yo mismo) confirman que @BRO sigue siendo increíble.

📊 Los estudios no fueron necesarios.
👑 El resultado era evidente.`,

  `🤖 Error 404:

No se encontró ninguna bro que supere a @BRO.

🔎 Búsqueda finalizada.
💖 Resultado permanente.`,

  `📢 ¡ATENCIÓN, @BRO!

Se informa que su nivel de grandeza está causando problemas en los servidores.

⚠️ Por favor, continúe siendo increíble con moderación.`,

  `🐐 ¡EL SISTEMA HA DETECTADO UNA LEYENDA!

Nombre: @BRO
Categoría: irrepetible.
Nivel: máximo.
Posibilidad de reemplazo: no encontrada.

🏆 Fin del informe.`,

  `💻 Analizando a @BRO...

✔️ Buena persona.
✔️ Amistad especial.
✔️ Personalidad única.
✔️ Nivel legendario.

🤖 Conclusión: no hay actualizaciones disponibles, ya viene perfecta de fábrica.`,

  `🎮 ¡NUEVO LOGRO DESBLOQUEADO!

🏆 @BRO ha conseguido:
«Ser una persona inolvidable».

⭐ Rareza: legendaria.
💎 Valor: incalculable.
❤️ Estado: permanente.`,

  `🚀 Atención, tripulación:

@BRO acaba de entrar al chat.
Se recomienda ajustar los niveles de buena energía.

🌟 ¡La misión continúa!`,

  `⚖️ El tribunal de la amistad ha deliberado.

La sentencia es definitiva:
@BRO es culpable de ser una bro increíble.

👑 Sin posibilidad de apelación.`,

  `💗 Quizás @BRO no se dé cuenta de lo importante que puede ser para los demás.

Pero hay personas cuya presencia hace que todo sea un poquito mejor.

🫶 Y ella es una de esas personas.`,

  `🌌 De todas las casualidades que tiene la vida, algunas terminan convirtiéndose en amistades que uno quiere conservar.

@BRO es una de esas casualidades bonitas.

💜 ¡Que la vida cuide esa amistad!`,

  `🎁 Si hoy el universo tuviera que elegir a alguien para sorprender con cosas bonitas...

Yo ya tengo mi candidata: @BRO.

🌷 ¡Que le sobren razones para sonreír!`,

  `🧸💖 Mensaje especial para @BRO:

Que nunca tenga que cambiar su esencia para encajar en ningún lugar.
Las personas auténticas no necesitan convertirse en alguien más.

👑 ¡Siga siendo única!`,

  `✨ Hay personas que no necesitan hacer demasiado para dejar una huella.

A veces alcanza con estar, escuchar y compartir momentos.

🫂 @BRO, nunca subestimes lo especial que podés ser.`,

  `🏅 ENTREGA DE PREMIOS OFICIAL:

🥇 Mejor bro: @BRO
💎 Personalidad: única.
👑 Categoría: legendaria.
❤️ Vigencia: de por vida.

¡Gracias por participar, aunque no había competencia!`,

  `📣 ¡SE BUSCA!

Una persona capaz de superar a @BRO en la categoría mejor bro.

🔍 Recompensa: una corona.
📌 Estado de la búsqueda: sin resultados.

😂 ¡Seguiremos intentando!`,

  `👑 @BRO acaba de recibir una actualización:

+1000 puntos de amistad.
+500 puntos de buena energía.
+9999 puntos de autenticidad.

🔥 ¡Nivel máximo alcanzado!`,

  `🌟 No todas las estrellas están en el cielo.

Algunas aparecen en un grupo de WhatsApp y se llaman @BRO.

💖 ¡Que nunca se apague esa luz!`,

  `📖 Si la amistad fuera un libro, @BRO tendría un capítulo especial.

De esos que uno vuelve a leer porque siempre dejan algo bonito.

💗 ¡Una persona para valorar!`,

  `🔔 Notificación importante:

El universo te recuerda, @BRO, que sos mucho más valiosa de lo que a veces imaginás.

🫶 Fin de la notificación.
👑 Atentamente: WhatsApp-Bot.`,

  `🛡️ Se activa el protocolo de protección de amistades especiales.

Objetivo: @BRO.
Misión: que nunca le falten respeto, cariño y buenas personas.

💖 Protocolo activado.`,

  `🎬 ¡Y en el episodio de hoy de este grupo...!

La protagonista vuelve a aparecer:
@BRO.

⭐ Género: comedia, amistad y momentos inolvidables.
🏆 Calificación: cinco estrellas.`,

  `💐 Una pequeña pausa para decir algo:

@BRO merece amistades que la cuiden tanto como ella puede cuidar a los demás.

❤️ Que nunca le falte gente sincera a su alrededor.`,

  `🔮 Predicción del día:

@BRO recibirá buenas noticias, tendrá motivos para reír y encontrará alguna sorpresa bonita.

✨ ¿La fuente? Mis circuitos tienen buenas vibras.`,

  `👑 No es favoritismo, es reconocimiento institucional.

@BRO tiene un lugar especial en este grupo y el bot se encarga de recordarlo.

💖 Caso cerrado.`,

  `🌈 Que @BRO nunca pierda esa capacidad de disfrutar las pequeñas cosas.

Porque muchas veces la felicidad está en los momentos más simples.

🫶 ¡Un abrazo de parte del bot!`,

  `🚨 ALERTA: exceso de grandeza detectado.

La presencia de @BRO ha superado los niveles permitidos de buena onda.

🤖 Reiniciando sistema...
💗 Resultado: sigue siendo increíble.`,

  `📡 Transmisión especial para @BRO:

Desde este pequeño rincón digital se informa que hay personas que hacen más lindo cualquier lugar al que llegan.

💖 Y vos sos una de ellas.`,

  `🏆 Si existiera un ranking mundial de amistades que vale la pena cuidar...

@BRO tendría un lugar reservado.

🥇 No por competir, sino por ser ella misma.`,

  `💜 Un recordatorio que no ocupa mucho espacio:

@BRO no tiene que demostrarle nada a nadie para merecer cariño, respeto y cosas bonitas.

🌷 Que nunca lo olvide.`,

  `🤖 Informe confidencial:

Se ha detectado una persona con características extraordinarias.

Nombre: @BRO.
Debilidad: ninguna detectada.
Fortaleza: ser ella misma.

🔒 Informe archivado.`,

  `🎉 ¡FIESTA NACIONAL EN EL SERVIDOR!

Motivo: @BRO escribió un mensaje.
Duración: hasta nuevo aviso.
Invitados: todo el grupo.

👑 ¡Que comiencen los festejos!`
]

// Normalizar números y JID
function normalizarNumero(valor = '') {
  return String(valor)
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

// Comprobar identidad
function esLaBro(m, conn) {
  const sender = String(m.sender || '')
  const decoded = conn.decodeJid?.(sender) || sender

  const numero = normalizarNumero(sender)
  const numeroDecoded = normalizarNumero(decoded)

  return (
    sender === BRO_LID ||
    decoded === BRO_LID ||
    numero === BRO_NUMBER ||
    numeroDecoded === BRO_NUMBER ||
    numero === BRO_LID_NUMBER ||
    numeroDecoded === BRO_LID_NUMBER
  )
}

// Mezclar frases
function mezclarFrases(array) {
  const copia = [...array]

  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }

  return copia
}

// Obtener frase sin repetir
function obtenerFrase() {
  if (frasesDisponibles.length === 0) {
    frasesDisponibles = mezclarFrases(FRASES)

    // Evitar que la primera frase del nuevo ciclo
    // sea igual a la última del ciclo anterior
    if (
      frasesDisponibles.length > 1 &&
      frasesDisponibles[0] === ultimaFrase
    ) {
      ;[frasesDisponibles[0], frasesDisponibles[1]] =
        [frasesDisponibles[1], frasesDisponibles[0]]
    }
  }

  const frase = frasesDisponibles.shift()
  ultimaFrase = frase

  return frase.replace(/@BRO/g, `@${BRO_NUMBER}`)
}

// Ejecución principal
async function ejecutarMejorBro(m, conn) {
  try {
    if (!m?.isGroup) return
    if (m.fromMe || m.key?.fromMe) return
    if (!esLaBro(m, conn)) return

    const messageId = m.key?.id

    if (!messageId || procesados.has(messageId)) return

    procesados.add(messageId)

    // Limitar memoria de mensajes procesados
    if (procesados.size > 1000) {
      const antiguos = [...procesados].slice(0, 500)
      antiguos.forEach(id => procesados.delete(id))
    }

    const chat = m.chat
    const ahora = Date.now()
    const ultimoMensaje = cooldowns.get(chat) || 0

    // Un mensaje por minuto por grupo
    if (ahora - ultimoMensaje < COOLDOWN) return

    // Registrar antes del envío
    cooldowns.set(chat, ahora)

    await conn.sendMessage(chat, {
      text: obtenerFrase(),
      mentions: [BRO_JID]
    }, {
      quoted: m
    })

  } catch (error) {
    console.error('[MEJOR BRO] Error:', error)
  }
}

const handler = async (m, { conn }) => {
  return ejecutarMejorBro(m, conn)
}

handler.all = async function (m) {
  return ejecutarMejorBro(m, this)
}

handler.help = ['mejorbro']
handler.tags = ['owner']
handler.command = /^$/
handler.group = true

export default handler
