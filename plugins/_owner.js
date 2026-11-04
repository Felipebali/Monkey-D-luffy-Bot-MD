
/**
 * 📂 plugins/owner.js
 * 👑 WHATSAPP-BOT — OWNERS PREMIUM
 *
 * 🥶 Pipe — Creador principal
 * 🩷 Angee — Segunda propietaria
 *
 * ✅ Dos propietarios
 * ✅ Frase personalizada para cada uno
 * ✅ Menciones clickeables
 * ✅ Números obtenidos de global.owner
 *
 * Baileys ES Modules
 */

// ============================================================
// 🔧 NORMALIZAR NÚMEROS
// ============================================================

function normalizar(valor) {
  if (!valor) return ''

  if (Array.isArray(valor)) valor = valor[0]

  if (typeof valor === 'object') {
    valor =
      valor.id ||
      valor.jid ||
      valor.number ||
      valor.numero ||
      ''
  }

  return String(valor)
    .trim()
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

// ============================================================
// 👑 OBTENER OWNERS
// ============================================================

function obtenerOwners() {
  const lista = Array.isArray(global.owner)
    ? global.owner
    : global.owner
      ? [global.owner]
      : []

  return [
    ...new Set(
      lista
        .map(normalizar)
        .filter(n => n.length >= 7 && n.length <= 15)
    )
  ].slice(0, 2)
}

// ============================================================
// 📌 COMANDO OWNER
// ============================================================

const handler = async (m, { conn }) => {

  const owners = obtenerOwners()

  if (owners.length < 2) {
    return m.reply(
      '❌ Debés configurar a Pipe y Angee en global.owner.'
    )
  }

  const [pipe, angee] = owners

  const mentions = [
    `${pipe}@s.whatsapp.net`,
    `${angee}@s.whatsapp.net`
  ]

  // ============================================================
  // 📝 MENSAJE
  // ============================================================

  const texto = `╭━━━〔 👑 *WHATSAPP-BOT* 〕━━━╮
┃
┃ 🥶 *PROPIETARIOS OFICIALES*
┃
┣━━━〔 👑 *OWNER PRINCIPAL* 〕━━━
┃
┃ 🥶 *Pipe*
┃ 🛡️ Creador y propietario
┃ 📱 @${pipe}
┃
┃ 💬 *Frase de Pipe:*
┃ _En silencio, a mi ritmo y a mi manera; no necesito demostrar quién soy._ 🥶
┃
┣━━━〔 🩷 *SEGUNDA OWNER* 〕━━━
┃
┃ 🎀 *Angee*
┃ 🛡️ Propietaria y administradora
┃ 📱 @${angee}
┃
┃ 💬 *Frase de Angee:*
┃ _No necesito ser perfecta para ser única; mi esencia habla por mí._ 🩷
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 💠 *SISTEMA* 〕━━━╮
┃ 👤 Propietarios: *2*
┃ 🔐 Estado: *Configuración activa*
┃ 🤖 Bot: *WHATSAPP-BOT*
╰━━━━━━━━━━━━━━━━━━━━━━╯`

  return conn.sendMessage(
    m.chat,
    {
      text: texto,
      mentions
    },
    { quoted: m }
  )
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = /^owner$/i
handler.help = ['owner']
handler.tags = ['info']

export default handler
