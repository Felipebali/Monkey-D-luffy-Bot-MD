
/**
 * 📂 plugins/owner.js
 * 👑 WHATSAPP-BOT — OWNERS PREMIUM
 *
 * 🩷 Angee — Owner principal
 * 🥶 Pipe — Creador y segundo owner
 *
 * ✅ Dos propietarios
 * ✅ Angee aparece primero
 * ✅ Frases personalizadas
 * ✅ Menciones clickeables
 * ✅ Números desde global.owner
 *
 * Baileys ES Modules
 */

// ============================================================
// 🔧 NORMALIZAR NÚMEROS
// ============================================================

function normalizar(valor) {
  if (!valor) return ''

  if (Array.isArray(valor)) {
    valor = valor[0]
  }

  if (typeof valor === 'object' && valor !== null) {
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
// 👑 OBTENER LOS DOS OWNERS
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
        .filter(n =>
          n.length >= 7 &&
          n.length <= 15
        )
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
      '❌ Debés configurar dos propietarios en global.owner.'
    )
  }

  // Se asume Pipe primero y Angee segunda
  // en global.owner, pero se muestran invertidos.

  const [pipe, angee] = owners

  const mentions = [
    `${angee}@s.whatsapp.net`,
    `${pipe}@s.whatsapp.net`
  ]

  // ============================================================
  // 📝 MENSAJE
  // ============================================================

  const texto = `╭━━━〔 👑 *WHATSAPP-BOT* 〕━━━╮
┃
┃ 💠 *PROPIETARIOS OFICIALES*
┃
┣━━━〔 🩷 *OWNER PRINCIPAL* 〕━━━
┃
┃ 🎀 *Angee*
┃ 👑 Propietaria principal
┃ 📱 @${angee}
┃
┃ 💬 *Frase de Angee:*
┃ _No necesito ser perfecta para ser única; mi esencia habla por mí._ 🩷
┃
┣━━━〔 🥶 *SEGUNDO OWNER* 〕━━━
┃
┃ ✨ *Pipe*
┃ 🛡️ Creador y propietario
┃ 📱 @${pipe}
┃
┃ 💬 *Frase de Pipe:*
┃ _En silencio, a mi ritmo y a mi manera; no necesito demostrar quién soy._ 🥶
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
