// 📂 plugins/autoadmin.js — AUTO ADMIN SILENCIOSO 👑

let handler = async (m, { conn, isBotAdmin }) => {
  try {
    if (!m.isGroup) return

    // 🔐 Owners reales
    const owners = (global.owner || []).map(v => {
      if (Array.isArray(v)) v = v[0]
      return String(v).replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    })

    const sender = conn.decodeJid ? conn.decodeJid(m.sender) : m.sender
    if (!owners.includes(sender)) return

    // ⚠️ Verificar si el bot es admin
    if (!isBotAdmin) return

    // 🧠 Detectar texto correctamente
    const texto =
      m.text ||
      m.body ||
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      ''

    const cmd = texto.trim().toLowerCase()

    // 🔥 PROMOTE
    if (cmd === 'aa') {
      await conn.groupParticipantsUpdate(m.chat, [sender], 'promote')
    }

    // 🔥 DEMOTE
    if (cmd === 'ad') {
      await conn.groupParticipantsUpdate(m.chat, [sender], 'demote')
    }

  } catch (e) {
    console.error('AUTOADMIN ERROR:', e)
  }
}

// 👇 IMPORTANTE
handler.customPrefix = /^(aa|ad)$/i
handler.command = new RegExp()
handler.group = true

export default handler
