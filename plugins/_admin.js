
/**
 * 📂 plugins/noadmin.js
 * 🤖 WHATSAPP-BOT — NO HAY ADMIN 😂
 *
 * 😂 Respuestas automáticas
 * 👑 Diferencia OWNERS
 * 🛡️ Diferencia ADMINS
 * 👤 Respuestas para usuarios
 * 🔎 Detecta variantes de "admin"
 * 🔄 Evita respuestas repetidas
 * ⏳ Cooldown de 15 segundos
 *
 * Baileys ES Modules
 */

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const COOLDOWN = 15 * 1000

const cooldowns = new Map()
const ultimasRespuestas = new Map()

// ============================================================
// 😂 RESPUESTAS
// ============================================================

const RESPUESTAS = {
  usuario: [
    '😂 No hay admin y no se da admin, JAJAJA.',
    '🤖 ¿Admin? Seguí participando, campeón.',
    '💀 Acá no regalamos coronas.',
    '🤣 ¿Querés admin? Qué gracioso sos.',
    '🙄 No insistas, la respuesta sigue siendo NO.',
    '🐒 Admin no hay, admin no se da.',
    '💅 ¿Y vos quién sos para pedir admin?',
    '😂 Solicitud rechazada por el departamento de NO.',
    '🤡 Otro que quiere ser importante en el grupo.',
    '🤣 Volvé a intentarlo en tu próxima vida.',
    '🚫 Error 403: permisos de admin denegados.',
    '👑 Las coronas no se regalan, se ganan.',
    '💀 Admin dice JAJAJAJA, NO.',
    '🐒 Mucho pedir admin, poco aportar al grupo.',
    '😂 ¿Admin? Primero aprendé a saludar.',
    '🤖 Tu solicitud fue enviada directamente a la papelera.',
    '🤣 Acá el único ascenso es de participante a silenciado.',
    '💅 No hay vacantes para administradores.',
    '😎 Seguí soñando con esa coronita.',
    '🚨 ALERTA: otro usuario hablando de admin.',
    '😂 El admin está en mantenimiento, vuelva nunca.',
    '💀 ¿Y si mejor disfrutás del grupo sin admin?',
    '🤡 El sindicato de administradores rechazó tu solicitud.',
    '🤣 ¿Admin? Ni con recomendación presidencial.',
    '👀 Otra vez con el tema del admin, qué pesados.'
  ],

  admin: [
    '😂 ¿Y vos sos admin, rompe huevo?',
    '💀 Pero si ya sos admin, ¿qué más querés?',
    '🤣 ¿No te alcanza con el poder que tenés?',
    '🙄 Administrador y todavía molestando.',
    '🤡 ¿Querés ser dueño del grupo también?',
    '😂 Cerrá el trámite, que ya tenés admin.',
    '🐒 ¿Qué sigue? ¿Pedir ser dueño de WhatsApp?',
    '😎 Sos admin, no el presidente del grupo.',
    '🤣 Dejá de romper las bolas, que ya tenés corona.',
    '💅 Otro privilegio más querés, rompe huevo.',
    '🚨 ADMIN DETECTADO: nivel de rompebolas elevado.',
    '😂 ¿No tenés un grupo que administrar?',
    '🤖 Administrador hablando de administración, qué novedad.',
    '💀 Mucho admin y pocas ganas de trabajar.',
    '🤣 Mirá quién apareció, el gerente del grupo.',
    '👑 Tranquilo, rey, que la corona no se te cae.',
    '😂 ¿Querés que te demos admin dos veces?',
    '🙄 Administrá algo en vez de hablar tanto.',
    '🐒 El admin más rompehuevos del condado.',
    '💅 Bajale un cambio, señor administrador.'
  ],

  owner: [
    '👑 ¿Y vos sos owner, qué más querés, rompe huevo? 😂',
    '🤣 Hasta el dueño viene a hablar de admin.',
    '💀 Señor propietario, deje de molestar.',
    '😂 Vos mandás acá y todavía estás hablando de admin.',
    '🤖 Owner detectado: nivel de rompehuevos máximo.',
    '👑 ¿Querés que te demos admin de tu propio bot?',
    '🤣 El jefe también rompe las bolas.',
    '😎 Patrón, ya sabemos que usted manda.',
    '😂 Llegó el dueño del circo a hablar de coronas.',
    '💀 Ni el propietario se salva de mis respuestas.',
    '🤡 Mucho owner, pero seguís molestando.',
    '👑 Su majestad, ¿otra vez hablando de admin?',
    '🤣 El jefe está aburrido y se nota.',
    '🐒 Dueño del bot y protagonista del quilombo.',
    '😂 Patrón, deje de romper las bolas un ratito.',
    '🤖 Permisos máximos, paciencia mínima.',
    '💅 El owner tiene corona, pero no inmunidad.',
    '🚨 ATENCIÓN: el dueño volvió a hablar de admin.'
  ]
}

// ============================================================
// 🔎 NORMALIZAR IDENTIFICADORES
// ============================================================

function normalizarJid(jid = '', conn) {
  const valor = String(jid || '')

  try {
    return conn.decodeJid?.(valor) || valor
  } catch {
    return valor
  }
}

function obtenerNumero(jid = '') {
  return String(jid || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

function mismoJid(a, b, conn) {
  const primero = normalizarJid(a, conn)
  const segundo = normalizarJid(b, conn)

  if (primero === segundo) return true

  const tipoA = primero.split('@')[1]
  const tipoB = segundo.split('@')[1]

  // Comparar números solo si ambos son JID telefónicos.
  // Un LID no es un número de teléfono.
  const telefonico = tipo =>
    tipo === 's.whatsapp.net' ||
    tipo === 'c.us'

  if (telefonico(tipoA) && telefonico(tipoB)) {
    return obtenerNumero(primero) === obtenerNumero(segundo)
  }

  return false
}

// ============================================================
// 👑 DETECTAR OWNER
// ============================================================

function esOwner(m, conn) {
  if (m.isOwner === true) return true

  const sender = normalizarJid(
    m.sender || m.key?.participant || '',
    conn
  )

  const owners = [
    ...(Array.isArray(global.owner) ? global.owner : []),
    ...(Array.isArray(global.owners) ? global.owners : [])
  ]

  return owners.some(owner => {
    const valor = Array.isArray(owner)
      ? owner[0]
      : owner?.jid || owner?.id || owner

    if (!valor) return false

    const id = String(valor)

    const ownerJid = id.includes('@')
      ? id
      : `${obtenerNumero(id)}@s.whatsapp.net`

    return mismoJid(sender, ownerJid, conn)
  })
}

// ============================================================
// 🛡️ DETECTAR ADMINISTRADOR
// ============================================================

async function esAdmin(m, conn, participants = []) {
  if (m.isAdmin === true) return true

  const sender = normalizarJid(
    m.sender || m.key?.participant || '',
    conn
  )

  let miembros = participants

  if (!Array.isArray(miembros) || !miembros.length) {
    try {
      const metadata = await conn.groupMetadata(m.chat)
      miembros = metadata.participants || []
    } catch {
      miembros = []
    }
  }

  const participante = miembros.find(p => {
    const identificadores = [
      p.id,
      p.jid,
      p.lid,
      p.phoneNumber
    ].filter(Boolean)

    return identificadores.some(id =>
      mismoJid(sender, id, conn)
    )
  })

  return (
    participante?.admin === 'admin' ||
    participante?.admin === 'superadmin' ||
    participante?.admin === 'owner'
  )
}

// ============================================================
// 📝 OBTENER TEXTO
// ============================================================

function obtenerTexto(m) {
  return String(
    m.text ||
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    ''
  ).trim()
}

// ============================================================
// 🔍 DETECTAR LA PALABRA ADMIN
// ============================================================

function contieneAdmin(texto) {
  const limpio = String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  // Detecta palabras relacionadas con admin.
  // No activa por palabras como "admirar".
  const patron =
    /(?:^|[^\p{L}\p{N}])(?:admin(?:s|es)?|admi|adm|administrador(?:a|es|as)?|administracion|administrativo(?:s|as)?|administrativa(?:s)?)(?=$|[^\p{L}\p{N}])/iu

  return patron.test(limpio)
}

// ============================================================
// 🔄 SELECCIONAR RESPUESTA SIN REPETIR
// ============================================================

function elegirRespuesta(tipo, chat) {
  const lista = RESPUESTAS[tipo] || RESPUESTAS.usuario

  const anterior = ultimasRespuestas.get(`${chat}:${tipo}`)

  const disponibles = lista.filter(frase =>
    frase !== anterior
  )

  const opciones = disponibles.length
    ? disponibles
    : lista

  const respuesta = opciones[
    Math.floor(Math.random() * opciones.length)
  ]

  ultimasRespuestas.set(`${chat}:${tipo}`, respuesta)

  return respuesta
}

// ============================================================
// ⏳ COOLDOWN POR USUARIO
// ============================================================

function tieneCooldown(chat, sender) {
  const clave = `${chat}:${sender}`
  const ahora = Date.now()

  const ultimo = cooldowns.get(clave) || 0

  if (ahora - ultimo < COOLDOWN) {
    return true
  }

  cooldowns.set(clave, ahora)

  return false
}

// ============================================================
// 🤖 EJECUTAR DETECCIÓN
// ============================================================

async function ejecutarNoAdmin(m, conn, participants = []) {
  try {
    if (!m?.isGroup) return
    if (m.fromMe || m.key?.fromMe) return

    const texto = obtenerTexto(m)

    if (!texto) return
    if (!contieneAdmin(texto)) return

    const sender = m.sender || m.key?.participant || ''

    // Evitar spam de respuestas
    if (tieneCooldown(m.chat, sender)) return

    // ========================================================
    // 👑 IDENTIFICAR TIPO DE USUARIO
    // ========================================================

    let tipo = 'usuario'

    if (esOwner(m, conn)) {
      tipo = 'owner'
    } else if (await esAdmin(m, conn, participants)) {
      tipo = 'admin'
    }

    // ========================================================
    // 😂 GENERAR RESPUESTA
    // ========================================================

    const respuesta = elegirRespuesta(tipo, m.chat)

    // ========================================================
    // 📤 RESPONDER CITANDO
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        text: respuesta
      },
      {
        quoted: m
      }
    )

  } catch (error) {
    console.error(
      '[NOADMIN] Error:',
      error
    )
  }
}

// ============================================================
// ⚙️ HANDLER
// ============================================================

const handler = async (m, { conn, participants = [] }) => {
  return ejecutarNoAdmin(m, conn, participants)
}

// Detectar mensajes automáticamente sin comando
handler.all = async function (m) {
  return ejecutarNoAdmin(m, this)
}

// No requiere prefijo
handler.customPrefix =
  /\b(admin|admins|admines|administrador|administradora|administradores|administradoras|administracion|admi|adm)\b/i

handler.command = /^$/

handler.help = ['noadmin']
handler.tags = ['fun']
handler.group = true

export default handler
