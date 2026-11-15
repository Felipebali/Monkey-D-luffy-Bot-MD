
/**
 * 📂 plugins/_perfil.js
 * 🤖 WHATSAPP-BOT — SISTEMA COMPLETO DE PERFILES
 *
 * Compatible con Baileys ES Modules.
 * Sin operadores ||=, ?? ni ?.
 *
 * Comandos:
 * .perfil
 * .perfil @usuario
 * .setbr 31/12/1998
 * .bio Mi biografía
 * .genero Masculino
 * .otorgar 🏆 Insignia @usuario
 * .quitar 1 @usuario
 * .insignias
 * .verinsignias
 * .clearinsignias
 * .clearins
 * .probarbio
 */

import fs from 'fs'
import path from 'path'

// ============================================================
// 📁 ARCHIVOS
// ============================================================

const DIR = './database'

const PERFIL_FILE = path.join(DIR, 'perfiles.json')
const PAREJAS_FILE = path.join(DIR, 'parejas.json')
const HERMANOS_FILE = path.join(DIR, 'hermanos.json')

fs.mkdirSync(DIR, { recursive: true })

for (const file of [
  PERFIL_FILE,
  PAREJAS_FILE,
  HERMANOS_FILE
]) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '{}', 'utf8')
  }
}

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

function loadJSON(file) {
  try {
    const data = JSON.parse(
      fs.readFileSync(file, 'utf8')
    )

    if (
      data &&
      typeof data === 'object' &&
      !Array.isArray(data)
    ) {
      return data
    }

    return {}
  } catch (error) {
    console.error('[PERFIL] Error leyendo JSON:', error)
    return {}
  }
}

function saveJSON(file, data) {
  const temp = file + '.tmp'

  fs.writeFileSync(
    temp,
    JSON.stringify(data, null, 2),
    'utf8'
  )

  fs.renameSync(temp, file)
}

// ============================================================
// 👤 IDENTIFICADORES
// ============================================================

function normalizeJid(value, conn) {
  if (!value) return null

  if (typeof value === 'object') {
    value =
      value.jid ||
      value.id ||
      value.user ||
      value.numero ||
      value.number ||
      value.phone ||
      value.pareja ||
      value.partner ||
      value.partnerJid
  }

  if (!value) return null

  let result = String(value)
    .trim()
    .replace(/^@/, '')

  try {
    if (
      result.includes('@') &&
      conn &&
      typeof conn.decodeJid === 'function'
    ) {
      result = conn.decodeJid(result) || result
    }
  } catch (error) {}

  if (result.includes('@')) {
    const parts = result.split('@')
    const user = parts[0].split(':')[0]
    const domain = parts[1]

    if (!user || !domain) return null

    return user + '@' + domain
  }

  const number = result.replace(/\D/g, '')

  if (!number) return null

  return number + '@s.whatsapp.net'
}

function sameUser(a, b, conn) {
  const A = normalizeJid(a, conn)
  const B = normalizeJid(b, conn)

  return Boolean(A && B && A === B)
}

function findJid(data, user, conn) {
  const normalized = normalizeJid(user, conn)

  if (!normalized) return null

  const keys = Object.keys(data)

  for (const key of keys) {
    if (sameUser(key, normalized, conn)) {
      return key
    }
  }

  return normalized
}

function tag(user) {
  if (!user) return '@usuario'

  return '@' + String(user)
    .split('@')[0]
    .split(':')[0]
}

function getTarget(m, conn) {
  let mentions = []

  if (Array.isArray(m.mentionedJid)) {
    mentions = m.mentionedJid
  } else if (Array.isArray(m.mentions)) {
    mentions = m.mentions
  } else if (
    m.message &&
    m.message.extendedTextMessage &&
    m.message.extendedTextMessage.contextInfo
  ) {
    mentions =
      m.message.extendedTextMessage
        .contextInfo.mentionedJid || []
  }

  const selected =
    mentions[0] ||
    (m.quoted && m.quoted.sender)

  return normalizeJid(selected, conn)
}

// ============================================================
// 👑 PERMISOS
// ============================================================

function ownerAllowed(m, conn, extra) {
  if (
    extra.isOwner ||
    extra.isROwner ||
    m.fromMe
  ) {
    return true
  }

  const owners = Array.isArray(global.owner)
    ? global.owner
    : []

  return owners.some(function(owner) {
    const value = Array.isArray(owner)
      ? owner[0]
      : owner

    return sameUser(value, m.sender, conn)
  })
}

// ============================================================
// 📅 FECHAS
// ============================================================

function getDateParts(value) {
  if (!value) return null

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  )

  if (!match) return null

  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])

  const date = new Date(Date.UTC(y, m - 1, d))

  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null
  }

  return { y, m, d }
}

function parseBirth(value) {
  const match = String(value || '').trim().match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  )

  if (!match) return null

  const d = Number(match[1])
  const m = Number(match[2])
  const y = Number(match[3])

  if (
    y < 1900 ||
    y > new Date().getFullYear()
  ) {
    return null
  }

  const iso =
    String(y).padStart(4, '0') + '-' +
    String(m).padStart(2, '0') + '-' +
    String(d).padStart(2, '0')

  return getDateParts(iso) ? iso : null
}

function formatDate(value) {
  const parts = getDateParts(value)

  if (parts) {
    return (
      String(parts.d).padStart(2, '0') + '/' +
      String(parts.m).padStart(2, '0') + '/' +
      parts.y
    )
  }

  if (!value) return 'No registrada'

  const date = new Date(value)

  if (isNaN(date.getTime())) {
    return 'No registrada'
  }

  return date.toLocaleDateString('es-UY', {
    timeZone: 'America/Montevideo'
  })
}

function todayUY() {
  const fields = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Montevideo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())

  const result = {}

  for (const field of fields) {
    result[field.type] = field.value
  }

  return {
    y: Number(result.year),
    m: Number(result.month),
    d: Number(result.day)
  }
}

function ageOf(value) {
  const birth = getDateParts(value)

  if (!birth) return null

  const now = todayUY()

  let age = now.y - birth.y

  if (
    now.m < birth.m ||
    (
      now.m === birth.m &&
      now.d < birth.d
    )
  ) {
    age--
  }

  return Math.max(0, age)
}

function birthdayIn(value) {
  const birth = getDateParts(value)

  if (!birth) return null

  const now = todayUY()

  const today = Date.UTC(
    now.y,
    now.m - 1,
    now.d
  )

  for (
    let year = now.y;
    year <= now.y + 8;
    year++
  ) {
    const next = Date.UTC(
      year,
      birth.m - 1,
      birth.d
    )

    const date = new Date(next)

    if (
      date.getUTCMonth() === birth.m - 1 &&
      date.getUTCDate() === birth.d &&
      next >= today
    ) {
      return Math.round(
        (next - today) / 86400000
      )
    }
  }

  return null
}

function daysSince(value) {
  if (!value) return 0

  const date = new Date(value)

  if (isNaN(date.getTime())) return 0

  return Math.max(
    0,
    Math.floor(
      (Date.now() - date.getTime()) / 86400000
    )
  )
}

// ============================================================
// ♑ ZODIACO
// ============================================================

function zodiac(value) {
  const birth = getDateParts(value)

  if (!birth) return '❔ Desconocido'

  const signs = [
    '♑ Capricornio',
    '♒ Acuario',
    '♓ Piscis',
    '♈ Aries',
    '♉ Tauro',
    '♊ Géminis',
    '♋ Cáncer',
    '♌ Leo',
    '♍ Virgo',
    '♎ Libra',
    '♏ Escorpio',
    '♐ Sagitario'
  ]

  const limits = [
    19, 18, 20, 19, 20, 20,
    22, 22, 22, 22, 21, 21
  ]

  return birth.d <= limits[birth.m - 1]
    ? signs[birth.m - 1]
    : signs[birth.m % 12]
}

// ============================================================
// 🏅 INSIGNIAS
// ============================================================

function badgesOf(profile) {
  if (
    !profile ||
    !Array.isArray(profile.insignias)
  ) {
    return []
  }

  return profile.insignias
    .map(function(x) {
      return String(x || '').trim()
    })
    .filter(Boolean)
}

function formatBadges(list) {
  if (!list.length) {
    return 'Sin insignias'
  }

  return list.map(function(value, index) {
    return (index + 1) + '. ' + value
  }).join('\n')
}

// ============================================================
// ❤️ RELACIONES
// ============================================================

function partnerJid(value, conn) {
  if (typeof value === 'string') {
    return normalizeJid(value, conn)
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  return normalizeJid(
    value.jid ||
    value.id ||
    value.user ||
    value.numero ||
    value.number ||
    value.phone ||
    value.pareja ||
    value.partner ||
    value.partnerJid,
    conn
  )
}

function getPartner(db, target, conn) {
  const key = findJid(db, target, conn)
  const direct = db[key]

  if (direct && typeof direct === 'object') {
    const partner = partnerJid(
      direct.pareja ||
      direct.partner ||
      direct.partnerJid ||
      direct.parejaJid,
      conn
    )

    if (
      partner &&
      !sameUser(partner, target, conn)
    ) {
      return Object.assign({}, direct, {
        parejaJid: partner
      })
    }
  }

  for (const entry of Object.entries(db)) {
    const user = entry[0]
    const data = entry[1]

    if (!data || typeof data !== 'object') {
      continue
    }

    const partner = partnerJid(
      data.pareja ||
      data.partner ||
      data.partnerJid ||
      data.parejaJid,
      conn
    )

    if (
      partner &&
      sameUser(partner, target, conn) &&
      !sameUser(user, target, conn)
    ) {
      return Object.assign({}, data, {
        parejaJid: normalizeJid(user, conn)
      })
    }
  }

  return null
}

function relationshipStatus(value) {
  const states = {
    novios: '❤️ En pareja',
    casados: '💍 Casados',
    prometidos: '💎 Comprometidos',
    comprometidos: '💎 Comprometidos',
    enamorados: '💖 Enamorados',
    pareja: '❤️ En pareja'
  }

  const state = String(value || '')
    .toLowerCase()
    .trim()

  return states[state] || '❤️ En pareja'
}

// ============================================================
// 🧬 HERMANOS
// ============================================================

function getBrothers(db, target, conn) {
  const key = findJid(db, target, conn)
  const record = db[key]

  if (
    !record ||
    !Array.isArray(record.hermanos)
  ) {
    return []
  }

  return record.hermanos
    .map(function(brother) {
      let user = null

      if (typeof brother === 'string') {
        user = brother
      } else if (brother) {
        user = brother.jid || brother.id
      }

      return {
        jid: normalizeJid(user, conn),
        nivel: Number(
          brother && brother.nivel || 0
        ),
        interacciones: Number(
          brother && brother.interacciones || 0
        ),
        fecha:
          brother && brother.fecha || null
      }
    })
    .filter(function(brother) {
      return Boolean(brother.jid)
    })
    .slice(0, 3)
}

function brotherRank(level) {
  level = Number(level || 0)

  if (level >= 500) return '👑 Hermanos Supremos'
  if (level >= 200) return '🔥 Hermanos Legendarios'
  if (level >= 120) return '💪 Hermanos Fuertes'
  if (level >= 60) return '🤝 Hermanos Reales'
  if (level >= 30) return '🙂 Hermanos Cercanos'

  return '👶 Hermanos Nuevos'
}

// ============================================================
// 👮 ROLES
// ============================================================

async function roleOf(m, conn, target, extra) {
  const owners = Array.isArray(global.owner)
    ? global.owner
    : []

  const owner = owners.some(function(value) {
    const user = Array.isArray(value)
      ? value[0]
      : value

    return sameUser(user, target, conn)
  })

  if (
    owner ||
    (
      sameUser(target, m.sender, conn) &&
      ownerAllowed(m, conn, extra)
    )
  ) {
    return '👑 Dueño'
  }

  if (!m.isGroup) {
    return '👤 Usuario'
  }

  try {
    const metadata = await conn.groupMetadata(m.chat)

    const participant = metadata.participants.find(
      function(p) {
        return [
          p.id,
          p.jid,
          p.lid,
          p.phoneNumber
        ].some(function(user) {
          return sameUser(user, target, conn)
        })
      }
    )

    if (
      participant &&
      participant.admin === 'superadmin'
    ) {
      return '👑 Creador'
    }

    if (
      participant &&
      participant.admin
    ) {
      return '🛡️ Administrador'
    }
  } catch (error) {
    console.log(
      '[PERFIL] No se pudo consultar rol:',
      error.message
    )
  }

  return '👤 Usuario'
}

// ============================================================
// 📤 RESPUESTAS
// ============================================================

async function replyMention(
  conn,
  m,
  text,
  mentions = []
) {
  return conn.sendMessage(
    m.chat,
    {
      text: text,
      mentions: Array.from(
        new Set(mentions.filter(Boolean))
      )
    },
    { quoted: m }
  )
}

// ============================================================
// 🧠 COMANDOS
// ============================================================

const COMMANDS = [
  'perfil',
  'setbr',
  'bio',
  'genero',
  'otorgar',
  'quitar',
  'insignias',
  'verinsignias',
  'clearinsignias',
  'clearins',
  'probarbio'
]

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, extra = {}) => {
  const conn = extra.conn

  if (!conn || !conn.sendMessage) {
    console.error('[PERFIL] Conexión no disponible')
    return
  }

  const cmd = String(extra.command || '')
    .replace(/^[.!#/]/, '')
    .trim()
    .toLowerCase()

  if (!COMMANDS.includes(cmd)) {
    return
  }

  let text = ''

  if (typeof extra.text === 'string') {
    text = extra.text.trim()
  } else if (Array.isArray(extra.args)) {
    text = extra.args.join(' ').trim()
  }

  try {
    // ========================================================
    // 🧪 PRUEBA
    // ========================================================

    if (cmd === 'probarbio') {
      return replyMention(
        conn,
        m,
        '🧪 *PERFIL ACTIVO*\n\n' +
        '✅ Plugin funcionando.\n' +
        '✅ Sistema de respuestas disponible.\n\n' +
        'Probá:\n' +
        '.bio Soy Feli\n' +
        '.setbr 31/12/1998\n' +
        '.genero Masculino'
      )
    }

    const perfiles = loadJSON(PERFIL_FILE)
    const sender = normalizeJid(m.sender, conn)

    if (!sender) {
      return replyMention(
        conn,
        m,
        '❌ No pude identificar tu usuario.'
      )
    }

    const selected = getTarget(m, conn)
    const target = selected || sender

    const senderKey = findJid(
      perfiles,
      sender,
      conn
    )

    const targetKey = findJid(
      perfiles,
      target,
      conn
    )

    // ========================================================
    // 🎂 CUMPLEAÑOS
    // ========================================================

    if (cmd === 'setbr') {
      const birth = parseBirth(text)

      if (!birth) {
        return replyMention(
          conn,
          m,
          '❌ Fecha inválida.\n\n' +
          'Uso: *.setbr 31/12/1998*'
        )
      }

      perfiles[senderKey] =
        perfiles[senderKey] || {}

      perfiles[senderKey].birth = birth

      saveJSON(PERFIL_FILE, perfiles)

      return replyMention(
        conn,
        m,
        `🎂 *CUMPLEAÑOS REGISTRADO*

👤 ${tag(sender)}
📅 Nacimiento: ${formatDate(birth)}
🎉 Edad: ${ageOf(birth)} años
✨ Signo: ${zodiac(birth)}

🤖 WHATSAPP-BOT`,
        [sender]
      )
    }

    // ========================================================
    // 📝 BIOGRAFÍA
    // ========================================================

    if (cmd === 'bio') {
      if (!text || text.length > 300) {
        return replyMention(
          conn,
          m,
          '❌ Uso: *.bio Mi biografía*\n' +
          'Máximo 300 caracteres.'
        )
      }

      perfiles[senderKey] =
        perfiles[senderKey] || {}

      perfiles[senderKey].bio = text

      saveJSON(PERFIL_FILE, perfiles)

      return replyMention(
        conn,
        m,
        `📝 *BIOGRAFÍA ACTUALIZADA*

👤 ${tag(sender)}
📖 ${text}

🤖 WHATSAPP-BOT`,
        [sender]
      )
    }

    // ========================================================
    // ⚧️ GÉNERO
    // ========================================================

    if (cmd === 'genero') {
      if (!text || text.length > 40) {
        return replyMention(
          conn,
          m,
          '❌ Uso: *.genero Masculino*\n' +
          'Máximo 40 caracteres.'
        )
      }

      perfiles[senderKey] =
        perfiles[senderKey] || {}

      perfiles[senderKey].genero = text

      saveJSON(PERFIL_FILE, perfiles)

      return replyMention(
        conn,
        m,
        `⚧️ *GÉNERO ACTUALIZADO*

👤 ${tag(sender)}
⚧️ Género: ${text}

🤖 WHATSAPP-BOT`,
        [sender]
      )
    }

    // ========================================================
    // 🧹 LIMPIAR INSIGNIAS
    // ========================================================

    if (
      cmd === 'clearinsignias' ||
      cmd === 'clearins'
    ) {
      if (!ownerAllowed(m, conn, extra)) {
        return replyMention(
          conn,
          m,
          '🚫 Solo los dueños pueden limpiar insignias.'
        )
      }

      let total = 0

      for (
        const profile of Object.values(perfiles)
      ) {
        if (
          !profile ||
          typeof profile !== 'object'
        ) {
          continue
        }

        total += badgesOf(profile).length
        profile.insignias = []
      }

      saveJSON(PERFIL_FILE, perfiles)

      return replyMention(
        conn,
        m,
        `🧹 *INSIGNIAS LIMPIADAS*\n\n` +
        `✅ Se eliminaron ${total} insignias.`
      )
    }

    // ========================================================
    // 🏅 OTORGAR / QUITAR
    // ========================================================

    if (
      cmd === 'otorgar' ||
      cmd === 'quitar'
    ) {
      if (!ownerAllowed(m, conn, extra)) {
        return replyMention(
          conn,
          m,
          '🚫 Solo los dueños pueden administrar insignias.'
        )
      }

      if (!selected) {
        return replyMention(
          conn,
          m,
          '❌ Mencioná o respondé al usuario.\n\n' +
          (
            cmd === 'otorgar'
              ? 'Ejemplo: *.otorgar 🏆 Mejor Admin @usuario*'
              : 'Ejemplo: *.quitar 1 @usuario*'
          )
        )
      }

      const id = findJid(
        perfiles,
        selected,
        conn
      )

      perfiles[id] = perfiles[id] || {}

      const list = badgesOf(perfiles[id])

      const content = text
        .replace(/@\d{5,20}(?::\d+)?/g, '')
        .replace(/\s+/g, ' ')
        .trim()

      if (cmd === 'otorgar') {
        if (
          !content ||
          content.length > 100
        ) {
          return replyMention(
            conn,
            m,
            '❌ Indicá una insignia de hasta 100 caracteres.'
          )
        }

        const exists = list.some(function(value) {
          return (
            value.toLowerCase() ===
            content.toLowerCase()
          )
        })

        if (exists) {
          return replyMention(
            conn,
            m,
            '⚠️ Esa insignia ya existe.'
          )
        }

        list.push(content)

        perfiles[id].insignias = list

        saveJSON(PERFIL_FILE, perfiles)

        return replyMention(
          conn,
          m,
          `🏅 *INSIGNIA OTORGADA*

👤 Usuario: ${tag(id)}
🏆 Insignia: ${content}

━━━━━━━━━━━━━━━━━━━━
${formatBadges(list)}

🤖 WHATSAPP-BOT`,
          [id]
        )
      }

      const number = Number(content)

      if (
        !Number.isInteger(number) ||
        number < 1 ||
        number > list.length
      ) {
        return replyMention(
          conn,
          m,
          '❌ Indicá un número válido.\n\n' +
          formatBadges(list)
        )
      }

      const removed = list.splice(
        number - 1,
        1
      )[0]

      perfiles[id].insignias = list

      saveJSON(PERFIL_FILE, perfiles)

      return replyMention(
        conn,
        m,
        `🗑️ *INSIGNIA ELIMINADA*

👤 Usuario: ${tag(id)}
❌ Insignia: ${removed}

━━━━━━━━━━━━━━━━━━━━
${formatBadges(list)}

🤖 WHATSAPP-BOT`,
        [id]
      )
    }

    // ========================================================
    // 🏅 VER INSIGNIAS
    // ========================================================

    if (
      cmd === 'insignias' ||
      cmd === 'verinsignias'
    ) {
      const list = badgesOf(
        perfiles[targetKey]
      )

      return replyMention(
        conn,
        m,
        `╭━━━〔 🏅 INSIGNIAS 〕━━━╮

👤 Usuario: ${tag(targetKey)}

━━━━━━━━━━━━━━━━━━━━
${formatBadges(list)}

━━━━━━━━━━━━━━━━━━━━
🏅 Total: ${list.length}
╰━━━━━━━━━━━━━━━━━━━━╯`,
        [targetKey]
      )
    }

    // ========================================================
    // 👤 PERFIL COMPLETO
    // ========================================================

    if (cmd === 'perfil') {
      const perfil = perfiles[targetKey] || {}

      const edad = ageOf(perfil.birth)
      const cumple = birthdayIn(perfil.birth)

      const role = await roleOf(
        m,
        conn,
        targetKey,
        extra
      )

      const list = badgesOf(perfil)

      const parejas = loadJSON(PAREJAS_FILE)
      const hermanos = loadJSON(HERMANOS_FILE)

      const parejaInfo = getPartner(
        parejas,
        targetKey,
        conn
      )

      const pareja = parejaInfo
        ? parejaInfo.parejaJid
        : null

      const brothers = getBrothers(
        hermanos,
        targetKey,
        conn
      )

      const mentions = [
        targetKey,
        pareja
      ]

      for (const brother of brothers) {
        mentions.push(brother.jid)
      }

      let relacion = ''

      if (pareja) {
        relacion =
          relationshipStatus(parejaInfo.estado) +
          '\n\n' +
          '💞 Pareja: ' + tag(pareja) + '\n' +
          '📅 Desde: ' +
          formatDate(parejaInfo.relacionFecha) +
          '\n' +
          '🕒 Tiempo: ' +
          daysSince(parejaInfo.relacionFecha) +
          ' días\n' +
          '💖 Amor: ' +
          (Number(parejaInfo.amor) || 0) +
          ' puntos'

        if (parejaInfo.matrimonioFecha) {
          relacion +=
            '\n💍 Matrimonio: ' +
            formatDate(parejaInfo.matrimonioFecha)
        }
      } else {
        relacion =
          '💔 Soltero/a\n\n' +
          'No tiene pareja registrada.'
      }

      const hermanosTexto = brothers.length
        ? brothers.map(function(b, index) {
            return (
              (index + 1) + '. 🤝 ' +
              tag(b.jid) + '\n' +
              '   💪 Nivel: ' + b.nivel + '\n' +
              '   🏅 ' + brotherRank(b.nivel) + '\n' +
              '   🎮 Interacciones: ' +
              b.interacciones + '\n' +
              '   📅 Desde: ' +
              formatDate(b.fecha) + '\n' +
              '   🕒 ' + daysSince(b.fecha) +
              ' días'
            )
          }).join('\n\n')
        : 'No tiene hermanos registrados.'

      const cumpleTexto =
        cumple === null
          ? 'No registrado'
          : cumple === 0
            ? '🎉 ¡Hoy es su cumpleaños!'
            : 'faltan ' + cumple + ' días'

      const texto =
`╭━━━━━━━━━━━━━━━━━━━━╮
        👤 *PERFIL*
╰━━━━━━━━━━━━━━━━━━━━╯

👤 *Usuario:* ${tag(targetKey)}
${role}

━━━━━━━━━━━━━━━━━━━━
📝 *BIO*
${perfil.bio || 'Sin biografía'}

⚧️ *Género:* ${perfil.genero || 'No especificado'}

🎂 *Edad:* ${edad === null ? 'No registrada' : edad + ' años'}

✨ *Signo:* ${zodiac(perfil.birth)}

🎂 *Cumpleaños:* ${cumpleTexto}

📅 *Registrado:* ${formatDate(
  perfil.registered || perfil.joinGroup
)}

━━━━━━━━━━━━━━━━━━━━
❤️ *RELACIÓN*

${relacion}

━━━━━━━━━━━━━━━━━━━━
🧬 *HERMANOS*

🤝 *${brothers.length}/3 hermanos*

${hermanosTexto}

━━━━━━━━━━━━━━━━━━━━
🏅 *INSIGNIAS*

${formatBadges(list)}

━━━━━━━━━━━━━━━━━━━━
📊 *RESUMEN*

❤️ Pareja: ${pareja ? 'Sí' : 'No'}
🤝 Hermanos: ${brothers.length}/3
🏅 Insignias: ${list.length}

━━━━━━━━━━━━━━━━━━━━
🤖 WHATSAPP-BOT`

      const uniqueMentions = Array.from(
        new Set(mentions.filter(Boolean))
      )

      // Intentar enviar foto de perfil.
      try {
        const photo = await conn.profilePictureUrl(
          targetKey,
          'image'
        )

        if (photo) {
          try {
            return await conn.sendMessage(
              m.chat,
              {
                image: { url: photo },
                caption: texto,
                mentions: uniqueMentions
              },
              { quoted: m }
            )
          } catch (error) {
            console.log(
              '[PERFIL] Error enviando foto:',
              error.message
            )
          }
        }
      } catch (error) {
        console.log(
          '[PERFIL] Foto no disponible:',
          error.message
        )
      }

      // Si no hay foto, enviar texto.
      return replyMention(
        conn,
        m,
        texto,
        uniqueMentions
      )
    }

  } catch (error) {
    console.error(
      '[PERFIL] ERROR:',
      cmd,
      error
    )

    try {
      return await replyMention(
        conn,
        m,
        '❌ Error al ejecutar *.' +
        cmd +
        '*.\nRevisá la consola del bot.'
      )
    } catch (sendError) {
      console.error(
        '[PERFIL] Error enviando respuesta:',
        sendError
      )
    }
  }
}

// ============================================================
// 📋 REGISTRO DE COMANDOS
// ============================================================

handler.help = COMMANDS

handler.tags = [
  'perfil',
  'owner'
]

handler.command =
  /^(perfil|setbr|bio|genero|otorgar|quitar|insignias|verinsignias|clearinsignias|clearins|probarbio)$/i

console.log(
  '✅ [PERFIL] Plugin cargado correctamente'
)

export default handler
