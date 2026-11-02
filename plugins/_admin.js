
// 📂 plugins/noadmin.js
// 🤖 WHATSAPP-BOT — NO SE DA ADMIN 😂
// 🔒 Si un usuario NO OWNER pide admin, responde automáticamente.

const FRASES = [
  '😂 No hay admin y no se da admin jajajaj.',
  '🤖 ¿Admin? Acá no regalamos poderes 😂',
  '🤣 No hay admin disponible, vuelva mañana.',
  '😎 El admin no se pide, se sueña jajajaj.',
  '💀 Seguí participando, capaz algún día.',
  '😂 No se da admin, no insista jajaja.',
  '🤖 Solicitud rechazada automáticamente.',
  '🙄 ¿Otra vez pidiendo admin? Qué insistencia.',
  '🐒 No hay admin para nadie jajajaj.',
  '🤣 Acá todos somos usuarios, a llorar.'
]

const PATRON =
  /\b(admin|administrador|administradora|admins)\b/i

const PETICION =
  /\b(dame|denme|den|dame|quiero|queremos|necesito|necesitamos|pongan|hagan|hace|ponme|suban|asciendan|quiero ser|denle|dale)\b/i

function esOwner(m) {
  const sender = m.sender?.split('@')[0]
  const owners = global.owner || []

  return owners.some(owner => {
    const numero = String(
      Array.isArray(owner) ? owner[0] : owner
    ).replace(/\D/g, '')

    return numero && numero === sender
  })
}

let handler = async (m, { conn }) => {
  try {
    if (!m.isGroup) return
    if (esOwner(m)) return

    const texto = String(m.text || '').trim()
    if (!texto) return

    if (!PATRON.test(texto)) return
    if (!PETICION.test(texto)) return

    const respuesta =
      FRASES[Math.floor(Math.random() * FRASES.length)]

    await conn.sendMessage(
      m.chat,
      { text: respuesta },
      { quoted: m }
    )

  } catch (e) {
    console.error('❌ Error en noadmin:', e)
  }
}

handler.customPrefix =
  /\b(admin|administrador|administradora|admins)\b/i

handler.command = new RegExp()
handler.group = true

export default handler
