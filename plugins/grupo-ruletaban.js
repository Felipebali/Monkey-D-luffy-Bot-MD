
let handler = async (m, { conn, participants, isAdmin, isBotAdmin }) => {
  if (!m.isGroup) {
    return m.reply('❌ Este comando solo se puede usar en grupos.')
  }

  if (!isBotAdmin) {
    return m.reply('❌ El bot necesita ser administrador para usar este comando.')
  }

  // Obtener los owners desde la configuración global
  const owners = Array.isArray(global.owners)
    ? global.owners
    : []

  // Normalizar números: acepta números simples o JID
  const normalizarNumero = (valor) =>
    String(valor || '')
      .split('@')[0]
      .replace(/\D/g, '')

  const ownerNumbers = owners
    .map(owner => {
      // Admite formato string o array [número, nombre]
      const numero = Array.isArray(owner) ? owner[0] : owner
      return normalizarNumero(numero)
    })
    .filter(Boolean)

  const senderID = normalizarNumero(m.sender)

  // Verificar si quien ejecuta es admin o owner
  const esOwner = ownerNumbers.includes(senderID)

  if (!isAdmin && !esOwner) {
    return m.reply(
      '⛔ Este comando solo puede usarlo un administrador o el dueño del bot.'
    )
  }

  // Obtener el JID del bot normalizado
  const botJid = conn.decodeJid
    ? conn.decodeJid(conn.user.id)
    : conn.user.id

  // Filtrar miembros que se pueden expulsar:
  // no admins, no owners y no el bot
  const kickables = participants.filter(p => {
    const id = p.id || p.jid
    if (!id) return false

    const numero = normalizarNumero(id)
    const jidNormalizado = conn.decodeJid
      ? conn.decodeJid(id)
      : id

    const esAdminParticipante = Boolean(p.admin)
    const esOwnerParticipante = ownerNumbers.includes(numero)
    const esBot = jidNormalizado === botJid

    return !esAdminParticipante && !esOwnerParticipante && !esBot
  })

  if (kickables.length === 0) {
    return m.reply(
      '😅 No hay miembros normales disponibles para expulsar.'
    )
  }

  // Elegir un participante al azar
  const elegido = kickables[
    Math.floor(Math.random() * kickables.length)
  ]

  const elegidoJid = elegido.id || elegido.jid
  const numeroElegido = normalizarNumero(elegidoJid)

  await conn.sendMessage(m.chat, {
    text:
      `🎯 *RULETA BAN ACTIVADA* 🎯\n\n` +
      `💣 El elegido al azar fue @${numeroElegido}!\n\n` +
      `👋 ¡Hasta la próxima!`,
    mentions: [elegidoJid]
  })

  // Dar tiempo para que el grupo vea el resultado
  await new Promise(resolve => setTimeout(resolve, 3000))

  try {
    await conn.groupParticipantsUpdate(
      m.chat,
      [elegidoJid],
      'remove'
    )
  } catch (error) {
    console.error('[RULETABAN] Error al expulsar:', error)

    await m.reply(
      '❌ No se pudo expulsar al participante. Verificá los permisos del bot.'
    )
  }
}

handler.command = /^ruletaban$/i
handler.group = true
handler.admin = false

export default handler
