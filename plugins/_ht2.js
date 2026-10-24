/**
 * 📂 plugins/ht2.js
 * 👑 WHATSAPP-BOT — RECORDATORIOS INTELIGENTES
 *
 * Comandos:
 * .ht2
 * .ht2 test
 * .ht2 on
 * .ht2 on 2
 * .ht2 off
 *
 * Acceso exclusivo: global.owner
 */

const INVITE_LINKS = [
  'https://chat.whatsapp.com/HwQuzOOfqA8C38ICFG4jq5?s=cl&p=a&mlu=4&ilr=4&iam=0',
  'https://chat.whatsapp.com/EMFwLDMzjJ0KwUjaYDdSXT?s=cl&p=a&mlu=4&ilr=4&iam=0',
  'https://chat.whatsapp.com/BpNPJrkFY4EDSR4DsOyZMs?s=cl&p=a&mlu=4&ilr=4&iam=0'
]

const recordatorios = new Map()

let gruposCache = null
let gruposCacheFecha = 0
const CACHE_GRUPOS_MS = 5 * 60 * 1000

function normalizarJid(valor = '') {
  return String(valor)
    .trim()
    .split(':')[0]
    .toLowerCase()
}

function normalizarNumero(valor = '') {
  return String(valor)
    .replace(/@.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\D/g, '')
}

function esOwner(m) {
  const owners = Array.isArray(global.owner) ? global.owner : []
  const sender = normalizarNumero(m.sender)

  return Boolean(sender) && owners.some(owner => {
    const numero = Array.isArray(owner) ? owner[0] : owner
    return normalizarNumero(numero) === sender
  })
}

function obtenerCodigo(link) {
  const coincidencia = link.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/)
  return coincidencia?.[1] || null
}

async function obtenerGruposObjetivo(conn) {
  if (
    gruposCache &&
    Date.now() - gruposCacheFecha < CACHE_GRUPOS_MS
  ) {
    return gruposCache
  }

  if (typeof conn.groupGetInviteInfo !== 'function') {
    throw new Error(
      'Esta versión de Baileys no ofrece groupGetInviteInfo. ' +
      'Configura los ID reales de los tres grupos.'
    )
  }

  const ids = new Set()

  for (const link of INVITE_LINKS) {
    const codigo = obtenerCodigo(link)
    if (!codigo) continue

    const info = await conn.groupGetInviteInfo(codigo)
    const id = info?.id

    if (id) {
      ids.add(normalizarJid(id))
    }
  }

  if (ids.size !== INVITE_LINKS.length) {
    throw new Error(
      `Se identificaron ${ids.size} de ${INVITE_LINKS.length} grupos.`
    )
  }

  gruposCache = ids
  gruposCacheFecha = Date.now()

  return ids
}

async function obtenerParticipantes(conn, grupoId) {
  const metadata = await conn.groupMetadata(grupoId)
  return metadata.participants || []
}

async function enviarRecordatorio(conn, chat) {
  const gruposObjetivo = await obtenerGruposObjetivo(conn)

  const miembrosConocidos = new Set()
  const numerosConocidos = new Set()

  for (const grupoId of gruposObjetivo) {
    const participantes = await obtenerParticipantes(conn, grupoId)

    for (const participante of participantes) {
      if (participante.id) {
        miembrosConocidos.add(normalizarJid(participante.id))

        const numero = normalizarNumero(
          participante.phoneNumber || participante.id
        )

        if (numero) numerosConocidos.add(numero)
      }

      if (participante.phoneNumber) {
        const numero = normalizarNumero(participante.phoneNumber)
        if (numero) numerosConocidos.add(numero)
      }
    }
  }

  const actuales = await obtenerParticipantes(conn, chat)
  const menciones = []
  const vistos = new Set()

  const botJid = normalizarJid(conn.user?.id)

  for (const participante of actuales) {
    const jid = participante.id
    if (!jid) continue

    if (normalizarJid(jid) === botJid) continue

    const jidNormalizado = normalizarJid(jid)

    if (vistos.has(jidNormalizado)) continue
    vistos.add(jidNormalizado)

    const numero = normalizarNumero(
      participante.phoneNumber || jid
    )

    const yaIngreso =
      miembrosConocidos.has(jidNormalizado) ||
      (numero && numerosConocidos.has(numero))

    if (!yaIngreso) menciones.push(jid)
  }

  const enlaces = INVITE_LINKS
    .map((link, index) => `🔗 *Grupo ${index + 1}:*\n${link}`)
    .join('\n\n')

  const texto =
    '📢 *LISTA DE ENLACES DE INVITACIÓN*\n\n' +
    (
      menciones.length
        ? '👋 Invitamos a quienes todavía no están en ninguno de los grupos:\n' +
          menciones.map(jid => `@${jid.split('@')[0]}`).join(' ') +
          '\n\n'
        : '✅ No hay participantes pendientes de mencionar en este grupo.\n\n'
    ) +
    'Podés ingresar a los grupos desde estos enlaces:\n\n' +
    enlaces

  await conn.sendMessage(chat, {
    text: texto,
    mentions: menciones
  })

  return menciones.length
}

const handler = async (m, { conn, args }) => {
  if (!esOwner(m)) {
    return m.reply(
      '⛔ *ACCESO DENEGADO*\n\n' +
      'Este comando es exclusivo de los owners de WHATSAPP-BOT.'
    )
  }

  if (!m.isGroup) {
    return m.reply('⚠️ Este comando solo funciona dentro de un grupo.')
  }

  const chat = m.chat
  const accion = String(args?.[0] || '').toLowerCase()

  // 🧪 PRUEBA INMEDIATA
  if (accion === 'test' || accion === 'prueba') {
    try {
      const cantidad = await enviarRecordatorio(conn, chat)

      return m.reply(
        '✅ *Prueba de HT2 enviada.*\n\n' +
        `👥 Participantes mencionados: ${cantidad}`
      )
    } catch (error) {
      console.error('[HT2] Error en la prueba:', error)

      return m.reply(
        '❌ No se pudo completar la prueba.\n' +
        `Motivo: ${error.message}`
      )
    }
  }

  // 🛑 DETENER
  if (accion === 'off' || accion === 'stop') {
    const activo = recordatorios.get(chat)

    if (activo?.timer) clearInterval(activo.timer)

    recordatorios.delete(chat)

    return m.reply('🛑 Recordatorios detenidos en este grupo.')
  }

  // ✅ ACTIVAR
  if (accion === 'on' || accion === 'start') {
    const solicitadas = Number(args?.[1] || 1)
    const horas = [1, 2].includes(solicitadas) ? solicitadas : 1

    const anterior = recordatorios.get(chat)

    if (anterior?.timer) clearInterval(anterior.timer)

    try {
      const cantidad = await enviarRecordatorio(conn, chat)

      const timer = setInterval(async () => {
        try {
          const pendientes = await enviarRecordatorio(conn, chat)

          console.log(
            `[HT2] Recordatorio enviado a ${chat}. Menciones: ${pendientes}`
          )
        } catch (error) {
          console.error('[HT2] Error automático:', error)
        }
      }, horas * 60 * 60 * 1000)

      recordatorios.set(chat, { timer, horas })

      return m.reply(
        '✅ *RECORDATORIOS ACTIVADOS*\n\n' +
        `🔗 Enlaces: ${INVITE_LINKS.length}\n` +
        `⏰ Frecuencia: cada ${horas} hora(s)\n` +
        `👥 Menciones en el primer envío: ${cantidad}\n\n` +
        '🧪 Probar: .ht2 test\n' +
        '🛑 Detener: .ht2 off'
      )
    } catch (error) {
      console.error('[HT2] No se pudo activar:', error)

      return m.reply(
        '❌ No se pudo activar HT2.\n' +
        `Motivo: ${error.message}`
      )
    }
  }

  // 📊 ESTADO
  const estado = recordatorios.get(chat)

  if (estado) {
    return m.reply(
      '📢 *ESTADO DE HT2*\n\n' +
      '🟢 Estado: activo\n' +
      `🔗 Enlaces: ${INVITE_LINKS.length}\n` +
      `⏰ Frecuencia: cada ${estado.horas} hora(s)\n\n` +
      '🧪 Probar: .ht2 test\n' +
      '🛑 Detener: .ht2 off'
    )
  }

  // 📖 AYUDA
  return m.reply(
    '📢 *RECORDATORIOS HT2*\n\n' +
    '• .ht2 test — probar ahora\n' +
    '• .ht2 on — activar cada hora\n' +
    '• .ht2 on 2 — activar cada 2 horas\n' +
    '• .ht2 off — detener\n' +
    '• .ht2 — consultar estado'
  )
}

handler.help = [
  'ht2',
  'ht2 test',
  'ht2 on',
  'ht2 on 2',
  'ht2 off'
]

handler.tags = ['owner']
handler.command = /^ht2$/i
handler.group = true

export default handler
