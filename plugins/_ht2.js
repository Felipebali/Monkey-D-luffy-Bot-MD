
/**
 * 📂 plugins/ht2.js
 * 👑 WHATSAPP-BOT — RECORDATORIOS DE INVITACIÓN
 *
 * Comandos:
 * .ht2          → consultar estado / ayuda
 * .ht2 test     → probar el envío inmediatamente
 * .ht2 on       → activar cada 1 hora
 * .ht2 on 2     → activar cada 2 horas
 * .ht2 off      → detener recordatorios
 *
 * Acceso exclusivo: global.owner
 */

const INVITE_LINKS = [
  'https://chat.whatsapp.com/HwQuzOOfqA8C38ICFG4jq5?s=cl&p=a&mlu=4&ilr=4&iam=0',
  'https://chat.whatsapp.com/EMFwLDMzjJ0KwUjaYDdSXT?s=cl&p=a&mlu=4&ilr=4&iam=0',
  'https://chat.whatsapp.com/BpNPJrkFY4EDSR4DsOyZMs?s=cl&p=a&mlu=4&ilr=4&iam=0'
]

// Los temporizadores se conservan mientras el proceso siga activo.
const recordatorios = new Map()

const normalizar = (jid = '') =>
  String(jid)
    .trim()
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')

function esOwner(m) {
  const owners = Array.isArray(global.owner) ? global.owner : []
  const sender = normalizar(m.sender)

  return Boolean(sender) && owners.some(owner => {
    const numero = Array.isArray(owner) ? owner[0] : owner
    return normalizar(numero) === sender
  })
}

async function enviarRecordatorio(conn, chat) {
  const metadata = await conn.groupMetadata(chat)

  const participantes = (metadata.participants || [])
    .map(p => p.id)
    .filter(Boolean)

  const enlaces = INVITE_LINKS
    .map((link, index) => `🔗 *Grupo ${index + 1}:*\n${link}`)
    .join('\n\n')

  await conn.sendMessage(chat, {
    text:
      '📢 *LISTA DE ENLACES DE INVITACIÓN*\n\n' +
      'Podés utilizar estos enlaces para ingresar a los grupos:\n\n' +
      enlaces,
    mentions: participantes
  })
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
      await enviarRecordatorio(conn, chat)

      return m.reply(
        '✅ *Prueba de HT2 enviada.*\n\n' +
        `📎 Enlaces enviados: ${INVITE_LINKS.length}\n` +
        'Revisá el mensaje anterior para comprobar que aparezcan.'
      )
    } catch (error) {
      console.error('[HT2] Error durante la prueba:', error)

      return m.reply(
        '❌ No se pudo enviar la prueba.\n' +
        'Revisá la consola del bot para ver el error.'
      )
    }
  }

  // 🛑 DETENER RECORDATORIOS
  if (accion === 'off' || accion === 'stop') {
    const activo = recordatorios.get(chat)

    if (activo?.timer) clearInterval(activo.timer)

    recordatorios.delete(chat)

    return m.reply('🛑 Recordatorios detenidos en este grupo.')
  }

  // ✅ ACTIVAR RECORDATORIOS
  if (accion === 'on' || accion === 'start') {
    const horasSolicitadas = Number(args?.[1] || 1)
    const horas = horasSolicitadas === 2 ? 2 : 1

    // Evitar duplicar temporizadores en el mismo grupo.
    const anterior = recordatorios.get(chat)

    if (anterior?.timer) {
      clearInterval(anterior.timer)
    }

    try {
      // Primer envío inmediato.
      await enviarRecordatorio(conn, chat)
    } catch (error) {
      console.error('[HT2] Error en el envío inicial:', error)

      return m.reply(
        '❌ No se pudo enviar el mensaje inicial. ' +
        'Revisá la consola del bot.'
      )
    }

    const timer = setInterval(async () => {
      try {
        await enviarRecordatorio(conn, chat)
      } catch (error) {
        console.error('[HT2] Error en recordatorio automático:', error)
      }
    }, horas * 60 * 60 * 1000)

    recordatorios.set(chat, { timer, horas })

    return m.reply(
      '✅ *RECORDATORIOS ACTIVADOS*\n\n' +
      `🔗 Enlaces por mensaje: ${INVITE_LINKS.length}\n` +
      `⏰ Frecuencia: cada ${horas} hora(s).\n\n` +
      '🧪 Probar: .ht2 test\n' +
      '🛑 Detener: .ht2 off'
    )
  }

  // 📊 CONSULTAR ESTADO
  const estado = recordatorios.get(chat)

  if (estado) {
    return m.reply(
      '📢 *ESTADO DE HT2*\n\n' +
      '🟢 Estado: activo\n' +
      `🔗 Enlaces configurados: ${INVITE_LINKS.length}\n` +
      `⏰ Frecuencia: cada ${estado.horas} hora(s).\n\n` +
      '🧪 Probar: .ht2 test\n' +
      '🛑 Detener: .ht2 off'
    )
  }

  return m.reply(
    '📢 *RECORDATORIOS HT2*\n\n' +
    '• .ht2 test — probar el envío ahora\n' +
    '• .ht2 on — activar cada 1 hora\n' +
    '• .ht2 on 2 — activar cada 2 horas\n' +
    '• .ht2 off — detener los recordatorios\n' +
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
