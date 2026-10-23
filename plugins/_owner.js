
// 📂 plugins/owner.js
// 👑 WHATSAPP-BOT — OWNERS PREMIUM
// 🎀 Angee 🧸🩷 | ❄️ Pipe 🥶

const handler = async (m, { conn }) => {
  if (!Array.isArray(global.owner) || global.owner.length === 0) {
    return m.reply(
      '╭━━━〔 ⚠️ SISTEMA DE OWNERS 〕━━━╮\n' +
      '┃\n' +
      '┃ ❌ No hay propietarios configurados.\n' +
      '┃\n' +
      '╰━━━━━━━━━━━━━━━━━━━━━━━━╯'
    )
  }

  const normalizar = (valor) => String(valor || '')
    .trim()
    .replace(/@s\.whatsapp\.net/gi, '')
    .replace(/@c\.us/gi, '')
    .replace(/@lid/gi, '')
    .replace(/:\d+$/g, '')
    .replace(/\D/g, '')

  // Obtener los números de los owners configurados.
  const configurados = global.owner.map(data => ({
    numero: normalizar(Array.isArray(data) ? data[0] : data)
  }))

  // Buscar los números configurados de Angee y Pipe.
  // Se identifican por el orden: primer owner = Pipe,
  // segundo owner = Angee, salvo que cambies los índices.
  const pipeNumero = configurados[0]?.numero
  const angeeNumero = configurados[1]?.numero

  const personas = [
    {
      numero: angeeNumero,
      nombre: 'Ange 🧸🩷',
      emoji: '🎀',
      rol: 'Propietaria oficial',
      estilo: '🌸'
    },
    {
      numero: pipeNumero,
      nombre: 'Pipe 🥶',
      emoji: '❄️',
      rol: 'Propietario oficial',
      estilo: '⚡'
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

    const jid = `${persona.numero}@s.whatsapp.net`

    mentions.push(jid)

    tarjetas.push(
      `╭━━━〔 ${persona.emoji} 〕━━━╮\n` +
      `┃\n` +
      `┃ ${persona.estilo} *${persona.nombre}*\n` +
      `┃\n` +
      `┃ 📱 @${persona.numero}\n` +
      `┃ ${persona.emoji} ${persona.rol}\n` +
      `┃ 🔐 Acceso de propietario\n` +
      `┃\n` +
      `╰━━━━━━━━━━━━━━━━━━╯`
    )
  }

  if (tarjetas.length === 0) {
    return m.reply(
      '╭━━━〔 ⚠️ ERROR 〕━━━╮\n' +
      '┃ No se encontraron números válidos.\n' +
      '┃ Revisá la configuración de global.owner.\n' +
      '╰━━━━━━━━━━━━━━━━━━╯'
    )
  }

  const encabezado =
    `╭━━━〔 👑 WHATSAPP-BOT 〕━━━╮\n` +
    `┃\n` +
    `┃ ✨ *EQUIPO DE PROPIETARIOS*\n` +
    `┃ 🛡️ Administración oficial\n` +
    `┃ 💜 Confianza · Control · Seguridad\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`

  const pie =
    `\n\n╭━━━〔 📊 INFORMACIÓN 〕━━━╮\n` +
    `┃ 👥 Total: *${tarjetas.length} ${tarjetas.length === 1 ? 'propietario' : 'propietarios'}*\n` +
    `┃ 🟢 Estado: *Configuración activa*\n` +
    `┃ 🤖 Sistema: *WHATSAPP-BOT*\n` +
    `╰━━━━━━━━━━━━━━━━━━━━━━━━╯`

  return conn.sendMessage(
    m.chat,
    {
      text: encabezado + tarjetas.join('\n\n') + pie,
      mentions
    },
    { quoted: m }
  )
}

handler.command = /^owner$/i
handler.help = ['owner']
handler.tags = ['info']

export default handler
