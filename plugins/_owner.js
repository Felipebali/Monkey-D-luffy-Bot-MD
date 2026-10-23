
// 📂 plugins/owner.js
// 👑 WHATSAPP-BOT — OWNERS PREMIUM
// 🧸🩷 Angee | 🥶 Pipe

const handler = async (m, { conn }) => {
  if (!Array.isArray(global.owner) || global.owner.length < 2) {
    return m.reply(
      '⚠️ *Faltan propietarios en la configuración.*\n\n' +
      'Configurá a Pipe y Angee en global.owner.'
    )
  }

  const normalizar = (valor) => String(valor || '')
    .trim()
    .replace(/@s\.whatsapp\.net/gi, '')
    .replace(/@c\.us/gi, '')
    .replace(/@lid/gi, '')
    .replace(/:\d+$/g, '')
    .replace(/\D/g, '')

  // Se asume: global.owner[0] = Pipe y global.owner[1] = Angee.
  const pipeNumero = normalizar(
    Array.isArray(global.owner[0]) ? global.owner[0][0] : global.owner[0]
  )

  const angeeNumero = normalizar(
    Array.isArray(global.owner[1]) ? global.owner[1][0] : global.owner[1]
  )

  const personas = [
    {
      numero: angeeNumero,
      nombre: 'Angee 🧸🩷',
      emoji: '🧸',
      rol: 'Creadora y propietaria',
      frase: 'Hay amistades que hacen más llevaderos los días y convierten cualquier charla en un buen recuerdo. 🧸🩷✨'
    },
    {
      numero: pipeNumero,
      nombre: 'Pipe 🥶',
      emoji: '🥶',
      rol: 'Creador y propietario',
      frase: 'En silencio, a mi ritmo y a mi manera; no necesito demostrar quién soy. 🥶'
    }
  ]

  const mentions = []
  const tarjetas = []

  for (const persona of personas) {
    if (
      !persona.numero ||
      persona.numero.length < 7 ||
      persona.numero.length > 15
    ) continue

    mentions.push(`${persona.numero}@s.whatsapp.net`)

    tarjetas.push(
      `╭━━━〔 ${persona.emoji} 〕━━━╮\n` +
      `┃\n` +
      `┃ ✨ *${persona.nombre}*\n` +
      `┃ 🛡️ ${persona.rol}\n` +
      `┃ 📱 @${persona.numero}\n` +
      `┃\n` +
      `┃ 💬 *Una frase para vos:*\n` +
      `┃ _${persona.frase}_\n` +
      `┃\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`
    )
  }

  if (tarjetas.length !== 2) {
    return m.reply(
      '❌ *No se pudieron validar los dos propietarios.*\n' +
      'Revisá los números y el orden en global.owner.'
    )
  }

  const texto =
    `╭━━━〔 👑 WHATSAPP-BOT 〕━━━╮\n` +
    `┃\n` +
    `┃ 💜 *NUESTRO EQUIPO*\n` +
    `┃ Dos owners, dos estilos\n` +
    `┃ Una misma familia de bot\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
    tarjetas.join('\n\n') +
    `\n\n╭━━━〔 💠 SISTEMA 〕━━━╮\n` +
    `┃ 👥 Propietarios: *2*\n` +
    `┃ 🔐 Estado: *Configuración activa*\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━╯`

  return conn.sendMessage(m.chat, {
    text: texto,
    mentions
  }, { quoted: m })
}

handler.command = /^owner$/i
handler.help = ['owner']
handler.tags = ['info']

export default handler
