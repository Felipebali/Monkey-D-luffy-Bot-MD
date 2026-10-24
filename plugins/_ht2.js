
/**
 * 📂 plugins/ht2.js
 * 👑 WHATSAPP-BOT — RECORDATORIO DE INVITACIÓN
 *
 * .ht2 on      → activar cada 1 hora
 * .ht2 on 2    → activar cada 2 horas
 * .ht2 test    → enviar prueba inmediata
 * .ht2 off     → detener
 * .ht2         → consultar estado
 */

const INVITE_LINK =
  'https://chat.whatsapp.com/HwQuzOOfqA8C38ICFG4jq5?s=cl&p=a&mlu=4&ilr=4&iam=0'

const recordatorios = new Map()

const normalizar = (jid = '') =>
  String(jid).trim().split('@')[0].split(':')[0].replace(/\D/g, '')

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

  await conn.sendMessage(chat, {
    text:
      '📢 *RECORDATORIO DE INVITACIÓN*\n\n' +
      '¿Querés invitar a alguien? Acá está el enlace del grupo:\n\n' +
      INVITE_LINK,
    mentions: participantes
  })
}

const handler = async (m, { conn, args }) => {
  if (!esOwner(m)) {
    return m.reply('⛔ Este comando es exclusivo de los owners.')
  }

  if (!m.isGroup) {
    return m.reply('⚠️ Usá este comando dentro de un grupo.')
  }

  const chat = m.chat
  const accion = String(args?.[0] || '').toLowerCase()

  // 🧪 PRUEBA INMEDIATA
  if (accion === 'test' || accion === 'prueba') {
    try {
      await enviarRecordatorio(conn, chat)
      return m.reply(
        '✅ *Prueba enviada correctamente.*\n\n' +
        'Se intentó enviar el enlace y las menciones al grupo.'
      )
    } catch (error) {
      console.error('[HT2] Error en prueba:', error)
      return m.reply(
        '❌ No se pudo enviar la prueba.\n' +
        'Revisá la consola para ver el error.'
      )
    }
  }

  // 🛑 DETENER
  if (accion === 'off' || accion === 'stop') {
    const activo = recordatorios.get(chat)

    if (activo?.timer) clearInterval(activo.timer)
    recordatorios.delete(chat)

    return m.reply('🛑 Recordatorios desactivados en este grupo.')
  }

  // ✅ ACTIVAR
  if (accion === 'on' || accion === 'start') {
    const horasSolicitadas = Number(args?.[1] || 1)
    const horas = horasSolicitadas === 2 ? 2 : 1

    const anterior = recordatorios.get(chat)
    if (anterior?.timer) clearInterval(anterior.timer)

    try {
      // Comprueba que el bot pueda enviar el primer mensaje.
      await enviarRecordatorio(conn, chat)
    } catch (error) {
      console.error('[HT2] Error activando:', error)
      return m.reply('❌ No se pudo enviar el mensaje inicial. Revisá la consola.')
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
      `✅ Recordatorios activados.\n` +
      `⏰ Frecuencia: cada ${horas} hora(s).\n` +
      `🧪 Probar: .ht2 test\n` +
      `🛑 Detener: .ht2 off`
    )
  }

  // 📊 ESTADO
  const estado = recordatorios.get(chat)

  if (estado) {
    return m.reply(
      `📢 *ESTADO DE HT2*\n\n` +
      `✅ Activo.\n` +
      `⏰ Cada ${estado.horas} hora(s).\n` +
      `🧪 Prueba: .ht2 test\n` +
      `🛑 Detener: .ht2 off`
    )
  }

  return m.reply(
    '📢 *RECORDATORIOS HT2*\n\n' +
    '• .ht2 test — probar ahora\n' +
    '• .ht2 on — activar cada 1 hora\n' +
    '• .ht2 on 2 — activar cada 2 horas\n' +
    '• .ht2 off — detener\n' +
    '• .ht2 — consultar estado'
  )
}

handler.help = ['ht2', 'ht2 test', 'ht2 on', 'ht2 on 2', 'ht2 off']
handler.tags = ['owner']
handler.command = /^ht2$/i
handler.group = true

export default handler
