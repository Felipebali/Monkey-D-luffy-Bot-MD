
import fs from 'fs'
import path from 'path'

// ============================================================
// ⚠️ WHATSAPP-BOT — SISTEMA DE ADVERTENCIAS
// ============================================================

const DATA_PATH = path.join(process.cwd(), 'data')
const WARNS_FILE = path.join(DATA_PATH, 'warns.json')

const WARN_LIMIT = 3
const AUTO_REMOVE = true
const MAX_HISTORY = 50

// ============================================================
// 📁 BASE DE DATOS
// ============================================================

if (!fs.existsSync(DATA_PATH)) {
  fs.mkdirSync(DATA_PATH, { recursive: true })
}

function loadWarns() {
  if (!fs.existsSync(WARNS_FILE)) return {}

  try {
    const data = fs.readFileSync(WARNS_FILE, 'utf8')
    const parsed = JSON.parse(data)

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {}
  } catch (error) {
    console.error('[WARN] Error leyendo la base:', error)
    return {}
  }
}

function saveWarns(data) {
  const tempFile = `${WARNS_FILE}.tmp`

  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8')
    fs.renameSync(tempFile, WARNS_FILE)
    return true
  } catch (error) {
    console.error('[WARN] Error guardando la base:', error)

    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
    } catch {}

    return false
  }
}

// ============================================================
// 🔧 UTILIDADES
// ============================================================

function normalizeJid(jid) {
  if (!jid) return null

  return String(jid)
    .trim()
    .replace(/:\d+(?=@)/g, '')
    .replace(/@c\.us$/, '@s.whatsapp.net')
}

function getTag(jid) {
  return `@${String(jid).split('@')[0]}`
}

function getDate() {
  return new Date().toLocaleString('es-UY', {
    timeZone: 'America/Montevideo'
  })
}

function getGroupWarns(db, group) {
  if (!db[group]) db[group] = {}
  return db[group]
}

function getUserWarn(warns, jid) {
  if (!warns[jid]) {
    warns[jid] = {
      count: 0,
      motivos: []
    }
  }

  if (!Array.isArray(warns[jid].motivos)) {
    warns[jid].motivos = []
  }

  return warns[jid]
}

function getTarget(m) {
  return normalizeJid(
    m.mentionedJid?.[0] ||
    m.quoted?.sender ||
    null
  )
}

function getReason(text, jid) {
  let reason = String(text || '').trim()

  // Quitar menciones escritas en el texto.
  if (jid) {
    const number = jid.split('@')[0]
    reason = reason.replace(
      new RegExp(`@${number}\\b`, 'g'),
      ''
    )
  }

  return reason.trim() || 'No se especificó un motivo.'
}

function getCount(warn) {
  return Math.max(0, Number(warn?.count) || 0)
}

function getFooter() {
  return '\n\n╰━━━━━━━━━━━━━━━━━━╯\n      ⚙️ *WHATSAPP-BOT*'
}

function getHeader(title) {
  return (
    '╭━━━〔 ⚠️ 〕━━━╮\n' +
    `   *${title}*\n` +
    '╰━━━━━━━━━━━━━━╯\n\n'
  )
}

async function react(conn, m, emoji) {
  try {
    await conn.sendMessage(m.chat, {
      react: { text: emoji, key: m.key }
    })
  } catch {}
}

async function send(conn, m, text, mentions = []) {
  return conn.sendMessage(
    m.chat,
    {
      text: text + getFooter(),
      mentions: [...new Set(mentions.filter(Boolean))]
    },
    { quoted: m }
  )
}

// ============================================================
// 🛡️ COMPROBACIÓN DE PARTICIPANTES
// ============================================================

async function getParticipants(conn, chat) {
  try {
    const metadata = await conn.groupMetadata(chat)
    return metadata?.participants || []
  } catch (error) {
    console.error('[WARN] No se pudo consultar el grupo:', error)
    return null
  }
}

function findParticipant(participants, jid) {
  const normalized = normalizeJid(jid)

  return participants?.find(p => {
    const ids = [p.id, p.jid, p.lid, p.phoneNumber]
      .filter(Boolean)
      .map(normalizeJid)

    return ids.includes(normalized)
  })
}

// ============================================================
// ⚠️ HANDLER PRINCIPAL
// ============================================================

const handler = async (
  m,
  {
    conn,
    text,
    usedPrefix,
    command,
    isAdmin,
    isBotAdmin,
    isROwner
  }
) => {
  if (!m.isGroup) {
    return m.reply('🚫 Este comando solo está disponible en grupos.')
  }

  const db = loadWarns()
  const warns = getGroupWarns(db, m.chat)

  const cmd = String(command || '').toLowerCase()

  // ==========================================================
  // ⚠️ DAR ADVERTENCIA
  // ==========================================================

  if ([
    'advertencia',
    'ad',
    'daradvertencia',
    'advertir',
    'warn'
  ].includes(cmd)) {
    if (!isAdmin && !isROwner) {
      return m.reply('🛡️ Solo los administradores pueden dar advertencias.')
    }

    const user = getTarget(m)

    if (!user) {
      return m.reply(
        `⚠️ *FALTA EL USUARIO*\n\n` +
        `Mencioná a una persona o respondé a su mensaje.\n\n` +
        `📌 *Ejemplo:*\n${usedPrefix}${cmd} @usuario spam`
      )
    }

    const botJid = normalizeJid(conn.user?.id)

    if (user === botJid) {
      return m.reply('🤖 No podés advertir al propio bot.')
    }

    const participants = await getParticipants(conn, m.chat)

    if (!participants) {
      return m.reply('❌ No pude verificar los participantes del grupo.')
    }

    const targetParticipant = findParticipant(participants, user)

    if (!targetParticipant) {
      return m.reply('❌ Ese usuario no figura como participante del grupo.')
    }

    if (targetParticipant.admin === 'admin' ||
        targetParticipant.admin === 'superadmin') {
      return m.reply('🛡️ No se puede advertir a un administrador del grupo.')
    }

    if (AUTO_REMOVE && !isBotAdmin) {
      return m.reply(
        '🤖 Necesito ser administrador para poder ejecutar expulsiones automáticas.'
      )
    }

    const motivo = getReason(text, user)
    const fecha = getDate()

    const userWarn = getUserWarn(warns, user)

    const oldCount = getCount(userWarn)
    const newCount = oldCount + 1

    userWarn.count = newCount
    userWarn.motivos.push({
      motivo,
      fecha,
      admin: normalizeJid(m.sender) || 'desconocido'
    })

    if (userWarn.motivos.length > MAX_HISTORY) {
      userWarn.motivos = userWarn.motivos.slice(-MAX_HISTORY)
    }

    if (!saveWarns(db)) {
      return m.reply('❌ No se pudo guardar la advertencia. No se aplicó la sanción.')
    }

    await react(conn, m, '⚠️')

    // --------------------------------------------------------
    // 🚫 LÍMITE ALCANZADO
    // --------------------------------------------------------

    if (newCount >= WARN_LIMIT && AUTO_REMOVE) {
      const warningMessage =
        getHeader('LÍMITE DE ADVERTENCIAS') +
        `👤 *Usuario:* ${getTag(user)}\n` +
        `📋 *Advertencias:* ${newCount}/${WARN_LIMIT}\n` +
        `📝 *Último motivo:* ${motivo}\n\n` +
        '🚫 Se alcanzó el límite establecido.\n' +
        '🧹 Se intentará retirar al usuario del grupo.'

      try {
        // Avisar antes de intentar la expulsión.
        await send(conn, m, warningMessage, [user])

        await conn.groupParticipantsUpdate(
          m.chat,
          [user],
          'remove'
        )

        // Borrar el registro solo después de una expulsión exitosa.
        delete warns[user]

        if (!saveWarns(db)) {
          console.error('[WARN] No se pudo guardar el borrado posterior a la expulsión.')
        }

        return
      } catch (error) {
        console.error('[WARN] Error al expulsar:', error)

        // Se conservan las advertencias si falla la expulsión.
        return send(
          conn,
          m,
          getHeader('EXPULSIÓN NO REALIZADA') +
          `👤 *Usuario:* ${getTag(user)}\n` +
          `📋 *Advertencias:* ${newCount}/${WARN_LIMIT}\n\n` +
          '❌ No se pudo expulsar al usuario.\n' +
          '⚠️ Las advertencias se conservaron.\n' +
          '🛡️ Revisá los permisos del bot.',
          [user]
        )
      }
    }

    // --------------------------------------------------------
    // 📣 AVISO NORMAL
    // --------------------------------------------------------

    const restantes = Math.max(0, WARN_LIMIT - newCount)

    const mensaje =
      getHeader('ADVERTENCIA REGISTRADA') +
      `👤 *Usuario:* ${getTag(user)}\n` +
      `🛡️ *Aplicada por:* ${getTag(m.sender)}\n` +
      `📝 *Motivo:* ${motivo}\n` +
      `📅 *Fecha:* ${fecha}\n\n` +
      `📊 *Advertencias:* ${newCount}/${WARN_LIMIT}\n` +
      `⚠️ *Restantes hasta el límite:* ${restantes}\n\n` +
      (restantes > 0
        ? '📌 Respetá las reglas del grupo para evitar nuevas sanciones.'
        : '⚠️ Se alcanzó el límite, pero la expulsión automática está desactivada.')

    return send(conn, m, mensaje, [user, m.sender])
  }

  // ==========================================================
  // 🟢 RETIRAR UNA ADVERTENCIA
  // ==========================================================

  else if ([
    'unwarn',
    'quitarwarn',
    'sacarwarn'
  ].includes(cmd)) {
    if (!isAdmin && !isROwner) {
      return m.reply('🛡️ Solo los administradores o el dueño pueden retirar advertencias.')
    }

    const target = getTarget(m)

    if (!target) {
      return m.reply('⚠️ Mencioná al usuario o respondé a uno de sus mensajes.')
    }

    const userWarn = warns[target]

    if (!userWarn || getCount(userWarn) === 0) {
      return send(
        conn,
        m,
        getHeader('SIN ADVERTENCIAS') +
        `✅ ${getTag(target)} no tiene advertencias registradas.`,
        [target]
      )
    }

    userWarn.count = Math.max(0, getCount(userWarn) - 1)

    if (Array.isArray(userWarn.motivos) && userWarn.motivos.length) {
      userWarn.motivos.pop()
    }

    const count = userWarn.count

    if (count === 0) {
      delete warns[target]
    }

    if (!saveWarns(db)) {
      return m.reply('❌ No se pudo guardar el cambio en las advertencias.')
    }

    await react(conn, m, '🟢')

    return send(
      conn,
      m,
      getHeader('ADVERTENCIA RETIRADA') +
      `👤 *Usuario:* ${getTag(target)}\n` +
      `🛡️ *Gestionado por:* ${getTag(m.sender)}\n\n` +
      `📊 *Advertencias actuales:* ${count}/${WARN_LIMIT}\n` +
      '✅ La modificación fue guardada correctamente.',
      [target, m.sender]
    )
  }

  // ==========================================================
  // 🔎 INFORMACIÓN DE UN USUARIO
  // ==========================================================

  else if (['warninfo', 'infowarn'].includes(cmd)) {
    const target = getTarget(m)

    if (!target) {
      return m.reply('⚠️ Mencioná a un usuario o respondé a su mensaje.')
    }

    const userWarn = warns[target]

    if (!userWarn || getCount(userWarn) === 0) {
      return send(
        conn,
        m,
        getHeader('INFORMACIÓN DE ADVERTENCIAS') +
        `👤 *Usuario:* ${getTag(target)}\n\n` +
        '✅ No tiene advertencias registradas.',
        [target]
      )
    }

    const history = (userWarn.motivos || [])
      .slice(-10)
      .map((item, index) =>
        `${index + 1}. *Motivo:* ${item.motivo || 'Sin motivo'}\n` +
        `   📅 ${item.fecha || 'Fecha desconocida'}`
      )
      .join('\n\n')

    return send(
      conn,
      m,
      getHeader('INFORMACIÓN DE ADVERTENCIAS') +
      `👤 *Usuario:* ${getTag(target)}\n` +
      `📊 *Total:* ${getCount(userWarn)}/${WARN_LIMIT}\n\n` +
      `📜 *Últimos registros:*\n${history}`,
      [target]
    )
  }

  // ==========================================================
  // 📜 LISTA DE ADVERTENCIAS
  // ==========================================================

  else if ([
    'warnlist',
    'advertencias',
    'listaad'
  ].includes(cmd)) {
    const entries = Object.entries(warns)
      .filter(([_, w]) => getCount(w) > 0)
      .sort((a, b) => getCount(b[1]) - getCount(a[1]))

    if (!entries.length) {
      return m.reply('✅ No hay usuarios con advertencias en este grupo.')
    }

    let output = getHeader('LISTA DE ADVERTENCIAS')
    const mentions = []

    for (const [jid, warning] of entries.slice(0, 30)) {
      const last = warning.motivos?.at(-1)

      output +=
        `👤 ${getTag(jid)}\n` +
        `📊 *Advertencias:* ${getCount(warning)}/${WARN_LIMIT}\n` +
        `📝 *Último motivo:* ${last?.motivo || 'Sin motivo'}\n` +
        `📅 *Fecha:* ${last?.fecha || 'Desconocida'}\n` +
        '━━━━━━━━━━━━━━━━━━\n\n'

      mentions.push(jid)
    }

    output += `👥 *Usuarios registrados:* ${entries.length}`

    if (entries.length > 30) {
      output += '\n📌 Se muestran los primeros 30 registros.'
    }

    return send(conn, m, output, mentions)
  }

  // ==========================================================
  // 🧹 LIMPIAR ADVERTENCIAS DE UN USUARIO
  // ==========================================================

  else if (['warnclear', 'limpiarwarnuser'].includes(cmd)) {
    if (!isAdmin && !isROwner) {
      return m.reply('🛡️ Solo los administradores o el dueño pueden realizar esta acción.')
    }

    const target = getTarget(m)

    if (!target) {
      return m.reply('⚠️ Mencioná a un usuario o respondé a su mensaje.')
    }

    if (!warns[target]) {
      return m.reply('✅ Ese usuario no tiene advertencias registradas.')
    }

    delete warns[target]

    if (!saveWarns(db)) {
      return m.reply('❌ No se pudo guardar la modificación.')
    }

    return send(
      conn,
      m,
      getHeader('REGISTRO LIMPIADO') +
      `👤 *Usuario:* ${getTag(target)}\n` +
      `🛡️ *Gestionado por:* ${getTag(m.sender)}\n\n` +
      '🧹 Se eliminaron todas sus advertencias.',
      [target, m.sender]
    )
  }

  // ==========================================================
  // 🧹 LIMPIAR ADVERTENCIAS DEL GRUPO
  // ==========================================================

  else if (['clearwarn', 'limpiarwarn'].includes(cmd)) {
    if (!isROwner) {
      return m.reply('🔐 Solo el dueño principal del bot puede limpiar todas las advertencias.')
    }

    const total = Object.keys(warns).length

    db[m.chat] = {}

    if (!saveWarns(db)) {
      return m.reply('❌ No se pudo guardar la limpieza de la base de datos.')
    }

    return send(
      conn,
      m,
      getHeader('ADVERTENCIAS ELIMINADAS') +
      `🧹 *Grupo:* ${m.chat}\n` +
      `📊 *Registros eliminados:* ${total}\n\n` +
      '✅ Se limpió el registro de advertencias de este grupo.'
    )
  }

  // ==========================================================
  // ⚙️ CONFIGURACIÓN
  // ==========================================================

  else if (['warnconfig', 'configwarn'].includes(cmd)) {
    return send(
      conn,
      m,
      getHeader('CONFIGURACIÓN DE ADVERTENCIAS') +
      `📊 *Límite:* ${WARN_LIMIT} advertencias\n` +
      `🚫 *Expulsión automática:* ${AUTO_REMOVE ? 'Activada' : 'Desactivada'}\n` +
      `📜 *Historial máximo por usuario:* ${MAX_HISTORY}\n\n` +
      '⚙️ Para cambiar estos valores, editá las constantes al inicio del plugin.'
    )
  }
}

// ============================================================
// 📌 COMANDOS
// ============================================================

handler.command = [
  'advertencia',
  'ad',
  'daradvertencia',
  'advertir',
  'warn',
  'unwarn',
  'quitarwarn',
  'sacarwarn',
  'warninfo',
  'infowarn',
  'warnlist',
  'advertencias',
  'listaad',
  'warnclear',
  'limpiarwarnuser',
  'clearwarn',
  'limpiarwarn',
  'warnconfig',
  'configwarn'
]

handler.tags = ['grupo']
handler.group = true
handler.admin = false
handler.botAdmin = false

export default handler
