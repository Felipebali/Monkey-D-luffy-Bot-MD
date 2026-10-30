
const BRO_NUMBER = '59893491934'
const BRO_JID = `${BRO_NUMBER}@s.whatsapp.net`
const BRO_LID = '181080552378538@lid'
const BRO_LID_NUMBER = '181080552378538'

const FRASES = [
  `👑💖 ¡@BRO es la mejor bro que se puede tener! 💖👑

✨ Una amiga de oro, única e incondicional.
🫶 ¡Una verdadera hermana de la vida!`,

  `💎🌹 ¡@BRO es de esas personas que no se encuentran dos veces!

🤍 Vale más que mil amistades pasajeras.
👑 ¡Una reina que merece todo lo bonito de la vida!`,

  `🫂💗 ¡Atención, grupo! @BRO es una bro de otro nivel.

🔥 Lealtad, buena vibra y un corazón enorme.
🏆 ¡La mejor compañera que se puede tener!`,

  `🌟👑 ¡@BRO no es una bro cualquiera, es una leyenda!

💖 De esas personas que hacen la diferencia.
🤝 ¡Una verdadera hermana elegida por la vida!`,

  `💐💕 ¡Si hablamos de buenas amistades, hablamos de @BRO!

✨ Una persona que vale oro y brilla con luz propia.
💎 ¡Inigualable, auténtica y especial!`,

  `🛡️💖 ¡@BRO tiene el título oficial de MEJOR BRO!

👑 Nadie le quita esa corona.
🤝 Amistad de la buena, de la que se valora de verdad.`,

  `🌈🫶 ¡La vida se disfruta más con una bro como @BRO!

💗 Buena energía, grandes momentos y una amistad especial.
👑 ¡Una reina en su propia historia!`,

  `🚨👑 ¡COMUNICADO OFICIAL DE WHATSAPP-BOT!

📢 @BRO ha sido reconocida como una de las mejores bros que existen.
💖 El título es permanente y no admite discusión.`,

  `💫🌹 ¡@BRO es pequeña palabra para una amistad gigante!

🫂 Hay personas que llegan y se vuelven familia.
💖 ¡Ella es una de esas personas!`,

  `🏆💗 ¡Premio a la mejor bro del universo para @BRO!

🥇 Por su valor como persona y por ser única.
👑 ¡La campeona indiscutida de la amistad!`,

  `🐐🔥 ¡@BRO es la GOAT de las bros!

👑 La número uno, la irrepetible, la legendaria.
💖 ¡No hay ranking que le haga justicia!`,

  `💌✨ Si la amistad tuviera una definición, @BRO estaría en ella.

🫶 Una persona especial que merece respeto, cariño y felicidad.
🌷 ¡Que nunca le falten motivos para sonreír!`,

  `👑💅 ¡Permiso, que está hablando la élite de las bros!

💖 @BRO tiene categoría propia.
🔥 No compite con nadie: tiene su propio nivel.`,

  `🌌💜 Entre millones de personas, @BRO tiene algo que la hace especial.

💎 Auténtica, única e imposible de reemplazar.
🫂 ¡Una amistad que merece cuidarse!`,

  `📣💖 ¡Que todo el grupo se entere!

👑 @BRO tiene corona, título y reconocimiento oficial.
🏆 ¡MEJOR BRO, categoría legendaria!`,

  `🤝❤️ Una buena bro se valora, se respeta y se cuida.

🌹 @BRO merece amistades sinceras y momentos inolvidables.
👑 ¡Una reina con todas las letras!`,

  `⚡🐐 ¡Nivel de amistad: LEGENDARIO!

💖 @BRO desbloqueó el rango máximo de mejor bro.
🏆 Logro conseguido: ser única en su categoría.`,

  `💗🫂 Hay amistades que se convierten en familia sin compartir apellido.

🌟 @BRO tiene ese lugar especial.
👑 ¡Una hermana elegida de corazón!`,

  `🔮✨ Predicción del día: @BRO seguirá siendo una bro increíble.

💖 Probabilidad de ser reemplazada: ¡misión imposible!
👑 Su corona está a salvo.`,

  `🎖️💎 Distinción especial para @BRO:

🥇 Mejor bro.
👑 Categoría: única.
💖 Estado: irremplazable.
🔥 Vigencia: para siempre.`,

  `🚀💖 ¡@BRO está en otra liga!

🌟 Mientras otros buscan una amistad especial, nosotros ya sabemos quién es.
👑 ¡La reina indiscutida de las bros!`,

  `🌻🫶 Que la vida le devuelva a @BRO toda la buena energía que transmite.

💗 Que nunca le falten personas sinceras.
👑 ¡Porque alguien tan especial merece cosas bonitas!`,

  `💥👑 ¡ALERTA DE GRANDEZA!

🐐 @BRO acaba de aparecer y el nivel del grupo subió automáticamente.
💖 Una leyenda no necesita presentación.`,

  `📜🏆 Por decisión unánime de este bot:

💗 @BRO recibe el título de mejor bro.
👑 No hay apelaciones, no hay desempate y no hay discusión.
✨ Caso cerrado.`
]

function normalizarNumero(valor = '') {
  return String(valor)
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

function esOwner(m, conn) {
  const sender = conn.decodeJid?.(m.sender || '') || m.sender || ''
  const numero = normalizarNumero(sender)

  const owners = Array.isArray(global.owner) ? global.owner : []

  return m.isOwner === true || owners.some(owner => {
    const valor = Array.isArray(owner) ? owner[0] : owner
    const numeroOwner = normalizarNumero(valor)

    return numeroOwner !== '' && numeroOwner === numero
  })
}

function obtenerTexto(m) {
  return String(
    m.text ||
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    ''
  )
}

function obtenerMenciones(m) {
  const menciones = m.mentionedJid || []

  if (Array.isArray(menciones) && menciones.length) {
    return menciones
  }

  const contexto =
    m.message?.extendedTextMessage?.contextInfo ||
    m.message?.imageMessage?.contextInfo ||
    m.message?.videoMessage?.contextInfo

  return contexto?.mentionedJid || []
}

function esLaBro(m, conn) {
  const texto = obtenerTexto(m)

  // Detectar número o LID escrito en el texto
  const textoNormalizado = normalizarNumero(texto)

  if (
    textoNormalizado.includes(BRO_NUMBER) ||
    textoNormalizado.includes(BRO_LID_NUMBER)
  ) {
    return true
  }

  // Detectar menciones reales de WhatsApp
  const menciones = obtenerMenciones(m)

  return menciones.some(jid => {
    const id = String(jid || '')
    const decodificado = conn.decodeJid?.(id) || id

    return (
      id === BRO_LID ||
      decodificado === BRO_LID ||
      id === BRO_JID ||
      decodificado === BRO_JID ||
      normalizarNumero(id) === BRO_NUMBER ||
      normalizarNumero(decodificado) === BRO_NUMBER ||
      normalizarNumero(id) === BRO_LID_NUMBER
    )
  })
}

async function ejecutarMejorBro(m, conn) {
  try {
    if (!m?.isGroup || m.fromMe || m.key?.fromMe) return
    if (!esOwner(m, conn)) return

    if (!esLaBro(m, conn)) return

    const frase = FRASES[
      Math.floor(Math.random() * FRASES.length)
    ].replace(/@BRO/g, `@${BRO_NUMBER}`)

    await conn.sendMessage(m.chat, {
      text: frase,
      mentions: [BRO_JID]
    }, { quoted: m })

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
handler.owner = true

export default handler
