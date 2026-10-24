/**
 * 📂 plugins/ht2.js
 * 👑 WHATSAPP-BOT — HT2 PRO
 *
 * Comandos:
 * .ht2
 * .ht2 test
 * .ht2 on
 * .ht2 on 2
 * .ht2 on 3
 * .ht2 on 6
 * .ht2 on 12
 * .ht2 off
 *
 * Acceso exclusivo: global.owner
 * Zona horaria: America/Montevideo
 */

const INVITE_LINKS = [
  'https://chat.whatsapp.com/HwQuzOOfqA8C38ICFG4jq5?s=cl&p=a&mlu=4&ilr=4&iam=0',
  'https://chat.whatsapp.com/EMFwLDMzjJ0KwUjaYDdSXT?s=cl&p=a&mlu=4&ilr=4&iam=0',
  'https://chat.whatsapp.com/BpNPJrkFY4EDSR4DsOyZMs?s=cl&p=a&mlu=4&ilr=4&iam=0'
]

const FRECUENCIAS = [1, 2, 3, 6, 12]
const recordatorios = new Map()

// ------------------------------------------------------------
// 🔧 UTILIDADES
// ------------------------------------------------------------

function normalizarJid(jid = '') {
  return String(jid)
    .trim()
    .split(':')[0]
    .toLowerCase()
}

function normalizarNumero(numero = '') {
  return String(numero).replace(/\D/g, '')
}

function esOwner(m) {
  const owners = Array.isArray(global.owner) ? global.owner : []
  const sender = normalizarNumero(
    String(m.sender || '').split('@')[0].split(':')[0]
  )

  return Boolean(sender) && owners.some(owner => {
    const numero = Array.isArray(owner) ? owner[0] : owner
    return normalizarNumero(numero) === sender
  })
}

function obtenerCodigo(link) {
  return link.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/)?.[1] || null
}

function obtenerClavesParticipante(participante) {
  const claves = new Set()
  const jid = normalizarJid(participante?.id)

  if (jid) claves.add(`jid:${jid}`)

  // Solo usar el número si Baileys lo identifica como teléfono.
  const id = String(participante?.id || '')
  const esTelefono =
    id.endsWith('@s.whatsapp.net') ||
    id.endsWith('@c.us')

  const telefono = participante?.phoneNumber ||
    (esTelefono ? id.split('@')[0] : '')

  const numero = normalizarNumero(telefono)

  if (numero) claves.add(`num:${numero}`)

  return claves
}

function perteneceAUnGrupo(participante, miembros) {
  for (const clave of obtenerClavesParticipante(participante)) {
    if (miembros.has(clave)) return true
  }

  return false
}

// ------------------------------------------------------------
// 🔗 IDENTIFICAR LOS TRES GRUPOS
// ------------------------------------------------------------

async function obtenerGruposObjetivo(conn) {
  if (typeof conn.groupGetInviteInfo !== 'function') {
    throw new Error(
      'Tu versión de Baileys no permite consultar información mediante enlaces. ' +
      'Se necesitan los ID reales de los tres grupos.'
    )
  }

  const ids = new Set()

  for (const link of INVITE_LINKS) {
    const codigo = obtenerCodigo(link)

    if (!codigo) {
      throw new Error('Hay un enlace de invitación inválido.')
    }

    const info = await conn.groupGetInviteInfo(codigo)

    if (!info?.id) {
      throw new Error(
        'No se pudo obtener el ID de uno de los grupos.'
      )
    }

    ids.add(normalizarJid(info.id))
  }

  if (ids.size !== INVITE_LINKS.length) {
    throw new Error(
      'Los enlaces no corresponden a tres grupos diferentes.'
    )
  }

  return [...ids]
}

async function obtenerParticipantes(conn, grupoId) {
  const metadata = await conn.groupMetadata(grupoId)
  return metadata.participants || []
}

// ------------------------------------------------------------
// 📢 ENVIAR RECORDATORIO INTELIGENTE
// ------------------------------------------------------------

async function enviarRecordatorio(conn, chat) {
  const grupos = await obtenerGruposObjetivo(conn)
  const miembros = new Set()

  // Reunir a los miembros de los tres grupos de destino.
  for (const grupoId of grupos) {
    const participantes = await obtenerParticipantes(conn, grupoId)

    for (const participante of participantes) {
      for (const clave of obtenerClavesParticipante(participante)) {
        miembros.add(clave)
      }
    }
  }

  // Buscar pendientes en el grupo donde se publica el anuncio.
  const participantesAnuncio = await obtenerParticipantes(conn, chat)
  const menciones = []
  const vistos = new Set()
  const botJid = normalizarJid(conn.user?.id)

  for (const participante of participantesAnuncio) {
    const jid = participante.id
    if (!jid) continue

    const jidNormalizado = normalizarJid(jid)

    if (jidNormalizado === botJid) continue
    if (vistos.has(jidNormalizado)) continue

    vistos.add(jidNormalizado)

    // Si ya pertenece a cualquiera de los tres grupos, se omite.
    if (perteneceAUnGrupo(participante, miembros)) continue

    menciones.push(jid)
  }

  const enlaces = INVITE_LINKS
    .map((link, index) => `🔗 *Grupo ${index + 1}:*\n${link}`)
    .join('\n\n')

  let texto

  if (menciones.length) {
    texto =
      '📢 *INVITACIÓN A NUESTROS GRUPOS*\n\n' +
      '👋 Invitamos a quienes todavía no están en ninguno de los grupos:\n' +
      menciones.map(jid => `@${jid.split('@')[0]}`).join(' ') +
      '\n\n'
  } else {
    texto =
      '📢 *INVITACIÓN A NUESTROS GRUPOS*\n\n' +
      '🔗 Estos son nuestros enlaces de invitación:\n\n'
  }

  texto += enlaces

  await conn.sendMessage(chat, {
    text: texto,
    mentions: menciones
  })

  console.log(
    `[HT2 PRO] Grupo: ${chat} | Menciones: ${menciones.length}`
  )

  return menciones.length
}

// ------------------------------------------------------------
// 👑 COMANDO PRINCIPAL
// ------------------------------------------------------------

const handler = async (m, { conn, args }) => {
  if (!esOwner(m)) {
    return m.reply('⛔ Este comando es exclusivo de los owners.')
  }

  if (!m.isGroup) {
    return m.reply('⚠️ Este comando solo funciona dentro de un grupo.')
  }

  const chat = m.chat
  const accion = String(args?.[0] || '').toLowerCase()

  // 🧪 PRUEBA
  if (['test', 'prueba'].includes(accion)) {
    try {
      const cantidad = await enviarRecordatorio(conn, chat)

      return m.reply(
        `✅ Prueba completada.\n👥 Menciones enviadas: ${cantidad}`
      )
    } catch (error) {
      console.error('[HT2 PRO] Error en prueba:', error)
      return m.reply(`❌ Error de HT2: ${error.message}`)
    }
  }

  // 🛑 DETENER
  if (['off', 'stop'].includes(accion)) {
    const activo = recordatorios.get(chat)

    if (activo?.timer) clearInterval(activo.timer)

    recordatorios.delete(chat)

    return m.reply('🛑 HT2 quedó desactivado en este grupo.')
  }

  // ✅ ACTIVAR
  if (['on', 'start'].includes(accion)) {
    const solicitadas = Number(args?.[1] || 1)
    const horas = FRECUENCIAS.includes(solicitadas)
      ? solicitadas
      : 1

    const anterior = recordatorios.get(chat)

    if (anterior?.timer) clearInterval(anterior.timer)

    try {
      // Un solo mensaje inicial: no se envía confirmación adicional.
      await enviarRecordatorio(conn, chat)

      const timer = setInterval(async () => {
        try {
          await enviarRecordatorio(conn, chat)
        } catch (error) {
          console.error('[HT2 PRO] Error automático:', error)
        }
      }, horas * 60 * 60 * 1000)

      recordatorios.set(chat, { timer, horas })

      return
    } catch (error) {
      recordatorios.delete(chat)
      console.error('[HT2 PRO] No se pudo activar:', error)

      return m.reply(`❌ No se pudo activar HT2: ${error.message}`)
    }
  }

  // 📊 ESTADO
  const estado = recordatorios.get(chat)

  if (estado) {
    return m.reply(
      '👑 *HT2 PRO — ESTADO*\n\n' +
      '🟢 Estado: activo\n' +
      `⏰ Frecuencia: cada ${estado.horas} hora(s)\n` +
      `🔗 Enlaces: ${INVITE_LINKS.length}\n\n` +
      '🛑 Detener: .ht2 off'
    )
  }

  // 📖 AYUDA
  return m.reply(
    '👑 *HT2 PRO — PANEL DE CONTROL*\n\n' +
    '🧪 .ht2 test — probar envío\n' +
    '🟢 .ht2 on — cada 1 hora\n' +
    '🟢 .ht2 on 2 — cada 2 horas\n' +
    '🟢 .ht2 on 3 — cada 3 horas\n' +
    '🟢 .ht2 on 6 — cada 6 horas\n' +
    '🟢 .ht2 on 12 — cada 12 horas\n' +
    '🛑 .ht2 off — detener\n' +
    '📊 .ht2 — consultar estado'
  )
}

handler.help = [
  'ht2',
  'ht2 test',
  'ht2 on',
  'ht2 on 2',
  'ht2 on 3',
  'ht2 on 6',
  'ht2 on 12',
  'ht2 off'
]

handler.tags = ['owner']
handler.command = /^ht2$/i
handler.group = true

export default handler
