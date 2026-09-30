// 📂 plugins/tagallT.js
// 🔤 Activador: letra "T" o "t" (sin prefijo)
// 🔐 SOLO ROOT OWNERS reales pueden activarlo
// 👤 Mención visible a un usuario al azar
// 🫥 Mención oculta al resto
// 🚫 NO responde/cita el mensaje original

function getRootOwners() {
  return (global.owner || [])
    .map(owner => {
      if (Array.isArray(owner)) owner = owner[0]

      if (typeof owner !== 'string' && typeof owner !== 'number') {
        return null
      }

      const number = String(owner).replace(/[^0-9]/g, '')

      if (!number) return null

      return number
    })
    .filter(Boolean)
}

function normalizeJid(jid, conn) {
  if (!jid) return null

  try {
    if (conn?.decodeJid) {
      jid = conn.decodeJid(jid)
    }
  } catch {}

  return String(jid).trim()
}

function isRootOwner(m, conn) {
  const owners = getRootOwners()
  const sender = normalizeJid(m.sender, conn)

  if (!sender) return false

  const senderNumber = sender
    .split('@')[0]
    .replace(/[^0-9]/g, '')

  return owners.includes(senderNumber)
}

let handler = async (m, { conn, groupMetadata }) => {
  try {
    if (!m.isGroup) return

    // 🔐 SOLO ROOT OWNERS
    if (!isRootOwner(m, conn)) return

    // 🔤 SOLO "T" O "t"
    const texto = String(m.text || '').trim()

    if (!/^t$/i.test(texto)) return

    // 👥 PARTICIPANTES
    const participantes = (groupMetadata?.participants || [])
      .map(p => {
        if (!p?.id) return null
        return normalizeJid(p.id, conn)
      })
      .filter(Boolean)

    if (participantes.length < 2) return

    // 🎲 USUARIO ALEATORIO
    const usuarioAzar =
      participantes[
        Math.floor(Math.random() * participantes.length)
      ]

    // 🫥 RESTO DE PARTICIPANTES
    const mencionesOcultas = participantes.filter(
      usuario => usuario !== usuarioAzar
    )

    // 💬 FRASES
    const frases = [
      `📢 Parece que @${usuarioAzar.split('@')[0]} quiso asegurarse de que nadie se quede dormido 😴`,
      `👀 @${usuarioAzar.split('@')[0]} tocó la letra mágica... y ahora todos fueron notificados 💬`,
      `💡 @${usuarioAzar.split('@')[0]} pensó que sería buena idea avisar a todos 😅`,
      `⚡ @${usuarioAzar.split('@')[0]} activó el modo “presente o expulsado” 😆`,
      `🔥 @${usuarioAzar.split('@')[0]} encendió el grupo con una sola letra 😎`,
      `😂 Todo indica que @${usuarioAzar.split('@')[0]} tenía ganas de charlar con todos 📲`
    ]

    const mensaje =
      frases[Math.floor(Math.random() * frases.length)]

    // 📢 ENVIAR SIN CITAR EL MENSAJE ORIGINAL
    await conn.sendMessage(m.chat, {
      text: mensaje,
      mentions: [
        usuarioAzar,
        ...mencionesOcultas
      ]
    })

  } catch (error) {
    console.error('[tagallT] Error:', error)
  }
}

// 🔤 Detectar solamente T o t sin prefijo
handler.customPrefix = /^\s*t\s*$/i

// 🚫 No usa comando normal
handler.command = new RegExp()

// 👥 Solo grupos
handler.group = true

export default handler
