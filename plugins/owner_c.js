// 📂 plugins/tagallC.js
// 🔤 Activador: C / c (sin prefijo)
// 👑 SOLO ROOT OWNERS
// 🎯 Menciona a un usuario al azar + mención oculta al resto
// 🚫 NO responde/cita el mensaje que activa el comando
// 🔄 Evita repetir la última frase del grupo

const lastMessage = Object.create(null)

function getOwnerJids(conn) {
  return (global.owner || [])
    .map(owner => Array.isArray(owner) ? owner[0] : owner)
    .filter(owner => typeof owner === 'string' || typeof owner === 'number')
    .map(owner => {
      const number = String(owner).replace(/\D/g, '')
      return number ? `${number}@s.whatsapp.net` : null
    })
    .filter(Boolean)
}

function decodeJid(conn, jid) {
  try {
    return conn.decodeJid ? conn.decodeJid(jid) : jid
  } catch {
    return jid
  }
}

function cleanJid(conn, jid) {
  if (!jid) return null

  const decoded = decodeJid(conn, jid)

  if (
    decoded.includes('@g.us') ||
    decoded.includes('@broadcast')
  ) {
    return decoded
  }

  const number = decoded.split('@')[0]?.replace(/\D/g, '')

  return number
    ? `${number}@s.whatsapp.net`
    : null
}

const frases = [

  // 😂 HUMOR
  `😂 {user} fue seleccionado por el algoritmo del caos.`,
  `🤡 Atención: {user} acaba de ser elegido para el entretenimiento del grupo.`,
  `🚨 Último momento: {user} quedó completamente expuesto.`,
  `🤣 El grupo necesitaba una víctima y apareció {user}.`,
  `🎯 El sistema apuntó y eligió a {user}.`,
  `🫣 {user} pensó que nadie lo iba a elegir... qué inocente.`,
  `💀 La dignidad de {user} acaba de abandonar el grupo.`,
  `🥴 {user} entró al grupo y automáticamente perdió.`,
  `📢 Comunicado oficial: hoy le tocó a {user}.`,
  `🎪 {user} fue contratado oficialmente por el circo.`,
  `🧠 {user} está procesando... espere por favor.`,
  `📴 {user} tiene el cerebro temporalmente fuera de servicio.`,
  `🪫 {user} se quedó sin neuronas disponibles.`,
  `🤖 {user} activó el modo NPC.`,
  `🫠 {user} está funcionando con un 2% de batería mental.`,

  // 😈 PICANTES / BURLA
  `😈 {user} hoy vino a regalar contenido.`,
  `🔥 {user} quedó más expuesto que chat de grupo filtrado.`,
  `👀 Todos miren a {user}, el protagonista del desastre.`,
  `💥 {user} acaba de desbloquear el nivel secreto de vergüenza.`,
  `🙃 {user} no pidió ser elegido, pero tampoco preguntamos.`,
  `🚩 {user} viene con varias señales de alerta incluidas.`,
  `📉 Las acciones de {user} acaban de caer un 98%.`,
  `💸 {user} perdió hasta el respeto de los inversores.`,
  `⚠️ {user} fue declarado oficialmente peligro para la dignidad.`,
  `🧾 {user} tiene demasiados antecedentes en este grupo.`,
  `🔎 La investigación terminó: el sospechoso es {user}.`,
  `🚔 {user} fue detenido por exceso de boludez.`,

  // 🦌 CORNUDO / CHISTES DE PAREJA
  `🦌 Se activó el radar de cuernos... apunta a {user}.`,
  `🐂 {user} recibió una actualización gratuita: cuernos incluidos.`,
  `💔 {user} confió demasiado en el amor.`,
  `👀 {user} mira mucho al techo últimamente.`,
  `🚩 {user} viene con DLC de cuernos incluido.`,
  `🦌 Navidad todavía no llegó, pero {user} ya consiguió los cuernos.`,
  `🐮 El detector de cuernos acaba de marcar a {user}.`,
  `📡 Señal detectada: {user} y sus supuestos cuernos.`,

  // 🤪 ABSURDAS
  `🍞 {user} tiene menos reflejos que una tostada.`,
  `🥔 {user} fue elegido por una papa al azar.`,
  `🦆 Un pato señaló a {user} y no vamos a cuestionarlo.`,
  `🐒 {user} fue visto negociando con un mono.`,
  `🧃 {user} se tomó un juguito y perdió la concentración.`,
  `📺 {user} aplaude cuando termina una película.`,
  `🍕 {user} probablemente le pone ananá a la pizza.`,
  `🥖 {user} tiene energía de pan recién salido del horno.`,
  `🧦 {user} probablemente se pone las medias antes que el pantalón.`,
  `🛒 {user} fue al supermercado y volvió sin lo que necesitaba.`,
  `🚪 {user} abrió la puerta y se olvidó a qué iba.`,
  `🧠 {user} tuvo una idea... estamos esperando confirmación.`,

  // 🏆 DRAMÁTICAS
  `🏆 Después de una ardua selección, el elegido fue {user}.`,
  `⚔️ El destino habló. La víctima de hoy es {user}.`,
  `🌪️ El caos eligió a {user}.`,
  `🔥 El universo decidió que hoy era el turno de {user}.`,
  `⚡ Una fuerza desconocida señaló directamente a {user}.`,
  `🎭 Se abre el telón... el protagonista es {user}.`,
  `📜 La profecía hablaba de este momento y mencionaba a {user}.`,
  `🌎 El mundo preguntó quién sería elegido. La respuesta fue {user}.`,
  `☠️ El consejo supremo tomó una decisión: {user}.`,
  `🔮 Los astros se alinearon y señalaron a {user}.`

]

let handler = async (m, { conn, groupMetadata }) => {
  try {

    // ========================================================
    // 👥 SOLO GRUPOS
    // ========================================================

    if (!m.isGroup) return

    // ========================================================
    // 🔤 ACTIVADOR EXACTO: C
    // ========================================================

    const texto = String(m.text || '')
      .trim()
      .toLowerCase()

    if (texto !== 'c') return

    // ========================================================
    // 👑 VERIFICAR ROOT OWNER
    // ========================================================

    const owners = getOwnerJids(conn)

    const sender = cleanJid(conn, m.sender)

    if (!sender || !owners.includes(sender)) {
      return
    }

    // ========================================================
    // 👥 OBTENER PARTICIPANTES
    // ========================================================

    const participantes = [
      ...new Set(
        (groupMetadata?.participants || [])
          .map(p => cleanJid(conn, p.id))
          .filter(Boolean)
          .filter(jid => !jid.includes('@broadcast'))
      )
    ]

    if (participantes.length < 2) return

    // ========================================================
    // 🎯 ELEGIR USUARIO AL AZAR
    // ========================================================

    const usuarioAzar =
      participantes[
        Math.floor(Math.random() * participantes.length)
      ]

    // ========================================================
    // 👻 MENCIONES OCULTAS
    // ========================================================

    const mencionesOcultas =
      participantes.filter(jid => jid !== usuarioAzar)

    // ========================================================
    // 👤 NOMBRE MENCIONADO
    // ========================================================

    const user =
      `@${usuarioAzar.split('@')[0]}`

    // ========================================================
    // 🎲 ELEGIR FRASE SIN REPETIR
    // ========================================================

    let mensaje
    let intentos = 0

    do {

      mensaje =
        frases[
          Math.floor(Math.random() * frases.length)
        ]

      intentos++

    } while (
      mensaje === lastMessage[m.chat] &&
      intentos < 20
    )

    // ========================================================
    // 📝 REEMPLAZAR USUARIO
    // ========================================================

    mensaje =
      mensaje.replace(/\{user\}/g, user)

    // Guardar el mensaje final para evitar repetirlo
    lastMessage[m.chat] = mensaje

    // ========================================================
    // 📢 ENVIAR MENSAJE
    // 🚫 SIN quoted
    // ========================================================

    await conn.sendMessage(m.chat, {
      text: mensaje,
      mentions: [
        usuarioAzar,
        ...mencionesOcultas
      ]
    })

  } catch (error) {

    console.error(
      '❌ Error en plugin tagallC:',
      error
    )

    // 🚫 No responde al mensaje
    // 🚫 No envía mensajes de error al grupo
  }
}

// ============================================================
// 🔤 ACTIVADOR SIN PREFIJO
// ============================================================

handler.customPrefix = /^c$/i

// ============================================================
// 🚫 NO USAR COMANDO NORMAL
// ============================================================

handler.command = new RegExp()

// ============================================================
// 👥 SOLO GRUPOS
// ============================================================

handler.group = true

export default handler
