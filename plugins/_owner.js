// 📂 plugins/owner.js
// 👑 WHATSAPP-BOT — OWNERS PREMIUM
// 🧸🩷 Angee | 🥶 Pipe

const handler = async (m, { conn }) => {
  // ============================================================
  // 🔧 OBTENER OWNERS DESDE global.owner
  // ============================================================

  const normalizarOwner = (owner) => {
    if (!owner) return ''

    let valor = owner

    if (Array.isArray(valor)) {
      valor = valor[0]
    }

    if (typeof valor === 'object' && valor !== null) {
      valor =
        valor.id ||
        valor.jid ||
        valor.number ||
        valor.numero ||
        valor.phone ||
        ''
    }

    return String(valor)
      .trim()
      .replace(/@s\.whatsapp\.net/gi, '')
      .replace(/@c\.us/gi, '')
      .replace(/@lid/gi, '')
      .replace(/:\d+$/g, '')
      .replace(/\D/g, '')
  }

  const owners = Array.isArray(global.owner)
    ? global.owner
    : []

  if (owners.length < 2) {
    return m.reply(
      '⚠️ *Faltan propietarios en la configuración.*\n\n' +
      'Configurá a Pipe y Angee en global.owner.'
    )
  }

  // Respeta el orden de global.owner:
  // [0] = Angee
  // [1] = Pipe

  const angeeNumero = normalizarOwner(owners[0])
  const pipeNumero = normalizarOwner(owners[1])

  if (
    !angeeNumero ||
    !pipeNumero ||
    angeeNumero.length < 7 ||
    pipeNumero.length < 7
  ) {
    return m.reply(
      '❌ *No se pudieron validar los propietarios.*\n\n' +
      `Angee: ${angeeNumero || 'Inválido'}\n` +
      `Pipe: ${pipeNumero || 'Inválido'}\n\n` +
      'Revisá los números configurados en global.owner.'
    )
  }

  if (angeeNumero === pipeNumero) {
    return m.reply(
      '⚠️ Los dos propietarios tienen el mismo número.'
    )
  }

  // ============================================================
  // 👑 INFORMACIÓN DE LOS OWNERS
  // ============================================================

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
    const jid = `${persona.numero}@s.whatsapp.net`

    mentions.push(jid)

    tarjetas.push(
      `╭━━━〔 ${persona.emoji} 〕━━━╮
┃
┃ ✨ *${persona.nombre}*
┃ 🛡️ ${persona.rol}
┃ 📱 @${persona.numero}
┃
┃ 💬 *Una frase para vos:*
┃ _${persona.frase}_
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
    )
  }

  // ============================================================
  // 💜 MENSAJE FINAL
  // ============================================================

  const texto =
    `╭━━━〔 👑 WHATSAPP-BOT 〕━━━╮
┃
┃ 💜 *NUESTRO EQUIPO*
┃ Dos owners, dos estilos
┃ Una misma familia de bot
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

${tarjetas.join('\n\n')}

╭━━━〔 💠 SISTEMA 〕━━━╮
┃ 👥 Propietarios: *2*
┃ 🔐 Estado: *Configuración activa*
╰━━━━━━━━━━━━━━━━━━━━━━╯`

  return conn.sendMessage(
    m.chat,
    {
      text: texto,
      mentions
    },
    {
      quoted: m
    }
  )
}

handler.command = /^owner$/i
handler.help = ['owner']
handler.tags = ['info']

export default handler
