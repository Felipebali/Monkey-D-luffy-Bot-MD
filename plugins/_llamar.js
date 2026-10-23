
/**
 * 📂 plugins/grupos-llamar.js
 * 📞 WHATSAPP-BOT — LLAMADAS A USUARIOS
 *
 * Comandos:
 * .llamar @usuario [veces] [intervalo]
 * .cancelar
 *
 * Solo owners de global.owner.
 * Permite una llamada activa por grupo.
 */

const activeCalls = new Map()

const MAX_REPETICIONES = 50
const MAX_INTERVALO = 60
const MIN_INTERVALO = 3

// ============================================================
// 🔧 UTILIDADES
// ============================================================

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function normalizeNumber(value) {
  return String(value || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

function getOwners() {
  return (global.owner || [])
    .map(owner => {
      if (Array.isArray(owner)) owner = owner[0]

      if (typeof owner !== 'string' && typeof owner !== 'number') {
        return null
      }

      return normalizeNumber(owner)
    })
    .filter(Boolean)
}

function isBotOwner(m) {
  const sender = normalizeNumber(m.sender)
  return Boolean(sender) && getOwners().includes(sender)
}

function parsePositiveInt(value, fallback, max) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const number = Number(value)

  if (!Number.isInteger(number) || number < 1) {
    return null
  }

  return Math.min(number, max)
}

// ============================================================
// 🚀 HANDLER
// ============================================================

const handler = async (m, { conn, command, args = [] }) => {
  const chatId = m.chat
  const cmd = String(command || '').toLowerCase()

  // 🔐 Solo owners
  if (!isBotOwner(m)) {
    return conn.sendMessage(chatId, {
      text: '🚫 Solo los dueños del bot pueden usar este comando.'
    })
  }

  // ==========================================================
  // 🛑 CANCELAR
  // ==========================================================

  if (cmd === 'cancelar') {
    const call = activeCalls.get(chatId)

    if (!call || !call.running) {
      return conn.sendMessage(chatId, {
        text: '⚠️ No hay ninguna llamada activa en este grupo.'
      })
    }

    call.running = false

    return conn.sendMessage(chatId, {
      text: '🛑 *Cancelación solicitada.* La llamada se detendrá enseguida.'
    })
  }

  // ==========================================================
  // 📞 LLAMAR
  // ==========================================================

  if (cmd !== 'llamar') return

  if (!m.isGroup) {
    return conn.sendMessage(chatId, {
      text: '❌ Este comando solo funciona en grupos.'
    })
  }

  // Evitar llamadas simultáneas en el mismo grupo
  if (activeCalls.has(chatId)) {
    return conn.sendMessage(chatId, {
      text: '⚠️ Ya hay una llamada en curso en este grupo.\nUsá *.cancelar* para detenerla.'
    })
  }

  // Detectar mención o respuesta a un mensaje
  let target = m.mentionedJid?.[0]

  if (!target && m.quoted?.sender) {
    target = m.quoted.sender
  }

  if (!target) {
    return conn.sendMessage(chatId, {
      text: '⚠️ Tenés que mencionar o responder al mensaje de alguien.\n\n' +
        '📌 *Ejemplo:*\n' +
        '• *.llamar @usuario 10 5*\n' +
        '• Respondé a un mensaje con *.llamar 10 5*'
    })
  }

  // Normalizar JID si la conexión lo permite
  if (typeof conn.decodeJid === 'function') {
    target = conn.decodeJid(target)
  }

  // No permitir llamar al propio bot
  const botJid = typeof conn.decodeJid === 'function'
    ? conn.decodeJid(conn.user?.id || '')
    : conn.user?.id || ''

  if (target === botJid) {
    return conn.sendMessage(chatId, {
      text: '🤖 No me puedo llamar a mí mismo. JAJAJA.'
    })
  }

  // .llamar @usuario [veces] [intervalo]
  // Si el usuario está mencionado, los argumentos numéricos van en args[1] y args[2].
  // Si se responde a un mensaje sin mención, van en args[0] y args[1].
  const hasMention = Boolean(m.mentionedJid?.[0])
  const totalArg = hasMention ? args[1] : args[0]
  const intervalArg = hasMention ? args[2] : args[1]

  const total = parsePositiveInt(totalArg, 10, MAX_REPETICIONES)
  const intervalo = parsePositiveInt(intervalArg, 5, MAX_INTERVALO)

  if (total === null) {
    return conn.sendMessage(chatId, {
      text: `⚠️ La cantidad de repeticiones debe ser un número entre 1 y ${MAX_REPETICIONES}.`
    })
  }

  if (intervalo === null || intervalo < MIN_INTERVALO) {
    return conn.sendMessage(chatId, {
      text: `⚠️ El intervalo debe ser de ${MIN_INTERVALO} a ${MAX_INTERVALO} segundos.`
    })
  }

  const call = {
    running: true,
    target,
    startedBy: m.sender
  }

  activeCalls.set(chatId, call)

  try {
    await conn.sendMessage(chatId, {
      text:
        `📞 *LLAMADA INICIADA*\n\n` +
        `👤 Usuario: @${target.split('@')[0]}\n` +
        `🔢 Repeticiones: *${total}*\n` +
        `⏱️ Intervalo: *${intervalo} segundos*\n\n` +
        `🛑 Usá *.cancelar* para detenerla.`,
      mentions: [target]
    })

    for (let i = 1; i <= total; i++) {
      if (!call.running) break

      await conn.sendMessage(chatId, {
        text: `📞 *LLAMADA ${i}/${total}*\n➡️ @${target.split('@')[0]}`,
        mentions: [target]
      })

      if (i < total && call.running) {
        await sleep(intervalo * 1000)
      }
    }

    const cancelled = !call.running

    await conn.sendMessage(chatId, {
      text: cancelled
        ? '🛑 *Llamada cancelada.*'
        : '✅ *Llamadas finalizadas.*'
    })
  } catch (error) {
    console.error('[LLAMAR] Error:', error)

    await conn.sendMessage(chatId, {
      text: '❌ Ocurrió un error durante las llamadas.'
    }).catch(() => {})
  } finally {
    // Evita borrar una llamada nueva por error
    if (activeCalls.get(chatId) === call) {
      activeCalls.delete(chatId)
    }
  }
}

// ============================================================
// 📚 COMANDOS
// ============================================================

handler.help = [
  'llamar @usuario [veces] [intervalo]',
  'cancelar'
]

handler.tags = ['owner']
handler.command = ['llamar', 'cancelar']

export default handler
