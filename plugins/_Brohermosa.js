
// 📂 plugins/mejorbro.js
// 🤖 WHATSAPP-BOT — La mejor bro del mundo 💖

const BRO_NUMBER = '59893491934'
const BRO_LID = '181080552378538@lid'

const BRO_JID = '59893491934@s.whatsapp.net'

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
💖 ¡No hay ranking que le haga justicia!`
]

function normalizarNumero(valor = '') {
  return String(valor)
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

function esLaBro(m, conn) {
  const sender = String(m.sender || '')
  const decoded = conn.decodeJid?.(sender) || sender

  return (
    sender === BRO_LID ||
    decoded === BRO_LID ||
    normalizarNumero(sender) === BRO_NUMBER ||
    normalizarNumero(decoded) === BRO_NUMBER ||
    normalizarNumero(sender) === '181080552378538'
  )
}

const handler = async (m, { conn }) => {
  try {
    if (!m.isGroup) return
    if (m.fromMe || m.key?.fromMe) return

    // Solo responde cuando habla ella
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

handler.all = async function (m) {
  return handler(m, { conn: this })
}

handler.help = ['mejorbro']
handler.tags = ['owner']
handler.command = /^$/
handler.group = true

export default handler
