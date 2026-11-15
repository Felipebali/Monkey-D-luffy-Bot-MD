
/**
 * 📂 plugins/perfil.js
 * 🤖 WHATSAPP-BOT — SISTEMA COMPLETO DE PERFILES
 *
 * Baileys ES Modules
 *
 * COMANDOS:
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

    return data &&
      typeof data === 'object' &&
      !Array.isArray(data)
      ? data
      : {}
  } catch (error) {
    console.error('[PERFIL] Error leyendo JSON:', error)
    return {}
  }
}

function saveJSON(file, data) {
  const temp = `${file}.tmp`

  fs.writeFileSync(
    temp,
    JSON.stringify(data, null, 2),
    'utf8'
  )

  fs.renameSync(temp, file)
}

// ============================================================
// 🔧 IDENTIFICADORES
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
      value.partner
  }

  if (!value) return null

  let jid = String(value).trim().replace(/^@/, '')

  try {
    if (jid.includes('@') && conn?.decodeJid) {
      jid = conn.decodeJid(jid) || jid
    }
  } catch {}

  if (jid.includes('@')) {
    const [left, domain] = jid.split('@')

    return `${left.split(':')[0]}@${domain}`
  }

  const number = jid.replace(/\D/g, '')

  return number
    ? `${number}@s.whatsapp.net`
    : null
}

function sameUser(a, b, conn) {
  const A = normalizeJid(a, conn)
  const B = normalizeJid(b, conn)

  return Boolean(A && B && A === B)
}

function findJid(data, jid, conn) {
  const normalized = normalizeJid(jid, conn)

  if (!normalized) return null

  if (Object.hasOwn(data, normalized)) {
    return normalized
  }

  return Object.keys(data).find(
    key => sameUser(key, normalized, conn)
  ) || normalized
}

function tag(jid) {
  if (!jid) return '@usuario'

  return '@' + String(jid)
    .split('@')[0]
    .split(':')[0]
}

function getTarget(m, conn) {
  const mentioned =
    m.mentionedJid?.[0] ||
    m.mentions?.[0] ||
    m.message?.extendedTextMessage
      ?.contextInfo?.mentionedJid?.[0]

  return normalizeJid(
    mentioned || m.quoted?.sender,
    conn
  )
}

// ============================================================
// 👑 PERMISOS
// ============================================================

function ownerAllowed(m, conn, extra = {}) {
  if (
    extra.isOwner ||
    extra.isROwner ||
    m.fromMe
  ) {
    return true
  }

  return (global.owner || []).some(owner =>
    sameUser(
      Array.isArray(owner) ? owner[0] : owner,
      m.sender,
      conn
    )
  )
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

  const date = new Date(y, m - 1, d)

  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
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

  const iso =
    `${String(y).padStart(4, '0')}-` +
    `${String(m).padStart(2, '0')}-` +
    `${String(d).padStart(2, '0')}`

  if (
    y < 1900 ||
    y > new Date().getFullYear()
  ) {
    return null
  }

  return getDateParts(iso) ? iso : null
}

function formatDate(value) {
  const parts = getDateParts(value)

  if (parts) {
    return (
      `${String(parts.d).padStart(2, '0')}/` +
      `${String(parts.m).padStart(2, '0')}/` +
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

function ageOf(value) {
  const birth = getDateParts(value)

  if (!birth) return null

  const now = new Date()

  let age = now.getFullYear() - birth.y

  if (
    now.getMonth() + 1 < birth.m ||
    (
      now.getMonth() + 1 === birth.m &&
      now.getDate() < birth.d
    )
  ) {
    age--
  }

  return Math.max(0, age)
}

function birthdayIn(value) {
  const birth = getDateParts(value)

  if (!birth) return null

  const now = new Date()

  const today = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )

  for (
    let year = now.getFullYear();
    year <= now.getFullYear() + 8;
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

  const { d, m } = birth

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

  return d <= limits[m - 1]
    ? signs[m - 1]
    : signs[m % 12]
}

// ============================================================
// 🏅 INSIGNIAS
// ============================================================

function badgesOf(profile) {
  if (!Array.isArray(profile?.insignias)) {
    return []
  }

  return profile.insignias
    .map(x => String(x || '').trim())
    .filter(Boolean)
}

function formatBadges(badges) {
  if (!badges.length) {
    return 'Sin insignias'
  }

  return badges.map(
    (badge, index) =>
      `${index + 1}. ${badge}`
  ).join('\n')
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
      direct.pareja ??
      direct.partner ??
      direct.partnerJid ??
      direct.parejaJid,
      conn
    )

    if (
      partner &&
      !sameUser(partner, target, conn)
    ) {
      return {
        ...direct,
        parejaJid: partner
      }
    }
  }

  for (const [jid, data] of Object.entries(db)) {
    if (!data || typeof data !== 'object') {
      continue
    }

    const partner = partnerJid(
      data.pareja ??
      data.partner ??
      data.partnerJid ??
      data.parejaJid,
      conn
    )

    if (
      partner &&
      sameUser(partner, target, conn) &&
      !sameUser(jid, target, conn)
    ) {
      return {
        ...data,
        parejaJid: normalizeJid(jid, conn)
      }
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

  return states[
    String(value || '').toLowerCase().trim()
  ] || '❤️ En pareja'
}

// ============================================================
// 🧬 HERMANOS
// ============================================================

function getBrothers(db, target, conn) {
  const key = findJid(db, target, conn)
  const record = db[key]

  if (!Array.isArray(record?.hermanos)) {
    return []
  }

  return record.hermanos
    .map(brother => ({
      jid: normalizeJid(
        typeof brother === 'string'
          ? brother
          : brother?.jid || brother?.id,
        conn
      ),
      nivel: Number(brother?.nivel || 0),
      interacciones: Number(
        brother?.interacciones || 0
      ),
      fecha: brother?.fecha || null
    }))
    .filter(brother => brother.jid)
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
// 👮 ROL
// ============================================================

async function roleOf(m, conn, target, extra = {}) {
  const owners = global.owner || []

  if (owners.some(owner =>
    sameUser(
      Array.isArray(owner) ? owner[0] : owner,
      target,
      conn
    )
  )) {
    return '👑 Dueño'
  }

  if (
    sameUser(target, m.sender, conn) &&
    ownerAllowed(m, conn, extra)
  ) {
    return '👑 Dueño'
  }

  if (!m.isGroup) {
    return '👤 Usuario'
  }

  try {
    const metadata = await conn.groupMetadata(m.chat)

    const participant = metadata.participants.find(
      p => sameUser(
        p.id || p.jid || p.lid,
        target,
        conn
      )
    )

    if (participant?.admin === 'superadmin') {
      return '👑 Creador'
    }

    if (participant?.admin) {
      return '🛡️ Administrador'
    }
  } catch {}

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
      text,
      mentions: [
        ...new Set(mentions.filter(Boolean))
      ]
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

const COMMAND_REGEX =
  /^(perfil|setbr|bio|genero|otorgar|quitar|insignias|verinsignias|clearinsignias|clearins|probarbio)$/i

function extractMessageText(m) {
  const message =
    m.message?.ephemeralMessage?.message ||
    m.message?.viewOnceMessage?.message ||
    m.message ||
    {}

  return String(
    m.text ||
    m.body ||
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    ''
  ).trim()
}

function getCommandData(m, extra = {}) {
  const raw = extractMessageText(m)

  const match = raw.match(
    /^[.!#/](perfil|setbr|bio|genero|otorgar|quitar|insignias|verinsignias|clearinsignias|clearins|probarbio)(?:\s+([\s\S]*))?$/i
  )

  const rawCommand = String(extra.command || '')
    .replace(/^[.!#/]/, '')
    .trim()
    .toLowerCase()

  const command =
    match?.[1]?.toLowerCase() ||
    rawCommand

  const text = match
    ? String(match[2] || '').trim()
    : String(
        extra.text ||
        (
          Array.isArray(extra.args)
            ? extra.args.join(' ')
            : ''
        )
      ).trim()

  return { command, text }
}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, extra = {}) => {
  const { conn } = extra

  const {
    command: cmd,
    text
  } = getCommandData(m, extra)

  console.log('[PERFIL DEBUG]', {
    comando: cmd,
    texto: text,
    comandoHandler: extra.command,
    textoHandler: extra.text
  })

  try {
    if (!conn?.sendMessage) {
      console.error(
        '[PERFIL] No se recibió conn.sendMessage'
      )
      return
    }

    // ========================================================
    // 🧪 PROBAR BIO
    // ========================================================

    if (cmd === 'probarbio') {
      return replyMention(
        conn,
        m,
        `🧪 *PRUEBA DEL PERFIL*

✅ El plugin recibió el comando.
✅ El sistema de respuestas está disponible.

Probá:
📝 .bio Soy Feli
🎂 .setbr 31/12/1998
⚧️ .genero Masculino

🤖 WHATSAPP-BOT`
      )
    }

    if (!COMMANDS.includes(cmd)) {
      console.warn(
        '[PERFIL] Comando desconocido:',
        cmd
      )
      return
    }

    const perfiles = loadJSON(PERFIL_FILE)

    const sender = normalizeJid(
      m.sender,
      conn
    )

    const selected = getTarget(m, conn)
    const target = selected || sender

    if (!sender) {
      return replyMention(
        conn,
        m,
        '❌ No pude identificar tu usuario.'
      )
    }

    const targetId = findJid(
      perfiles,
      target,
      conn
    )

    // ========================================================
    // 🎂 REGISTRAR CUMPLEAÑOS
    // ========================================================

    if (cmd === 'setbr') {
      if (!text) {
        return replyMention(
          conn,
          m,
          '🎂 *REGISTRAR CUMPLEAÑOS*\n\n' +
          'Uso: *.setbr 31/12/1998*'
        )
      }

      const birth = parseBirth(text)

      if (!birth) {
        return replyMention(
          conn,
          m,
          '❌ Fecha inválida.\n\n' +
          'Ejemplo: *.setbr 31/12/1998*'
        )
      }

      const id = findJid(
        perfiles,
        sender,
        conn
      )

      perfiles[id] ||= {}
      perfiles[id].birth = birth

      saveJSON(PERFIL_FILE, perfiles)

      return replyMention(
        conn,
        m,
        `🎂 *CUMPLEAÑOS REGISTRADO*

👤 Usuario: ${tag(id)}
✅ Tu cumpleaños fue registrado correctamente.

📅 Nacimiento: ${formatDate(birth)}
🎉 Edad: ${ageOf(birth)} años
✨ Signo: ${zodiac(birth)}

🤖 WHATSAPP-BOT`,
        [id]
      )
    }

    // ========================================================
    // 📝 BIOGRAFÍA
    // ========================================================

    if (cmd === 'bio') {
      const bio = String(text || '').trim()

      if (!bio) {
        return replyMention(
          conn,
          m,
          '📝 *BIOGRAFÍA*\n\n' +
          'Uso: *.bio Me gusta la música*'
        )
      }

      if (bio.length > 300) {
        return replyMention(
          conn,
          m,
          '❌ Máximo 300 caracteres.'
        )
      }

      const id = findJid(
        perfiles,
        sender,
        conn
      )

      perfiles[id] ||= {}
      perfiles[id].bio = bio

      saveJSON(PERFIL_FILE, perfiles)

      return replyMention(
        conn,
        m,
        `📝 *BIOGRAFÍA ACTUALIZADA*

👤 Usuario: ${tag(id)}
✅ Tu biografía fue guardada correctamente.

📖 *Nueva biografía:*
${bio}

🤖 WHATSAPP-BOT`,
        [id]
      )
    }

    // ========================================================
    // ⚧️ GÉNERO
    // ========================================================

    if (cmd === 'genero') {
      const genero = String(text || '').trim()

      if (!genero) {
        return replyMention(
          conn,
          m,
          '⚧️ *REGISTRAR GÉNERO*\n\n' +
          'Uso: *.genero Masculino*'
        )
      }

      if (genero.length > 40) {
        return replyMention(
          conn,
          m,
          '❌ Máximo 40 caracteres.'
        )
      }

      const id = findJid(
        perfiles,
        sender,
        conn
      )

      perfiles[id] ||= {}
      perfiles[id].genero = genero

      saveJSON(PERFIL_FILE, perfiles)

      return replyMention(
        conn,
        m,
        `⚧️ *GÉNERO ACTUALIZADO*

👤 Usuario: ${tag(id)}
✅ Tu género fue guardado correctamente.

⚧️ Género: ${genero}

🤖 WHATSAPP-BOT`,
        [id]
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

      for (const profile of Object.values(perfiles)) {
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
        '🧹 *INSIGNIAS LIMPIADAS*\n\n' +
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
              ? 'Ejemplo: *.otorgar 🏆 Admin @usuario*'
              : 'Ejemplo: *.quitar 1 @usuario*'
          )
        )
      }

      const id = findJid(
        perfiles,
        selected,
        conn
      )

      perfiles[id] ||= {}
      perfiles[id].insignias =
        badgesOf(perfiles[id])

      const badges = perfiles[id].insignias

      const content = String(text)
        .replace(/@\d{5,20}/g, '')
        .replace(/\s+/g, ' ')
        .trim()

      if (cmd === 'otorgar') {
        if (!content) {
          return replyMention(
            conn,
            m,
            '🏅 Uso:\n' +
            '*.otorgar 🏆 Mejor Admin @usuario*'
          )
        }

        if (content.length > 100) {
          return replyMention(
            conn,
            m,
            '❌ Máximo 100 caracteres.'
          )
        }

        if (badges.some(x =>
          x.toLowerCase() === content.toLowerCase()
        )) {
          return replyMention(
            conn,
            m,
            '⚠️ Esa insignia ya existe.'
          )
        }

        badges.push(content)

        saveJSON(PERFIL_FILE, perfiles)

        return replyMention(
          conn,
          m,
          `🏅 *INSIGNIA OTORGADA*

👤 Usuario: ${tag(id)}
🏆 Insignia: ${content}

━━━━━━━━━━━━━━━━━━━━
*INSIGNIAS ACTUALES*

${formatBadges(badges)}

🤖 WHATSAPP-BOT`,
          [id]
        )
      }

      const numero = Number(content)

      if (
        !Number.isInteger(numero) ||
        numero < 1 ||
        numero > badges.length
      ) {
        return replyMention(
          conn,
          m,
          '❌ Indicá un número válido.\n\n' +
          formatBadges(badges)
        )
      }

      const eliminada = badges.splice(
        numero - 1,
        1
      )[0]

      saveJSON(PERFIL_FILE, perfiles)

      return replyMention(
        conn,
        m,
        `🗑️ *INSIGNIA ELIMINADA*

👤 Usuario: ${tag(id)}
❌ Insignia: ${eliminada}

━━━━━━━━━━━━━━━━━━━━
*INSIGNIAS RESTANTES*

${formatBadges(badges)}

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
      const id = findJid(
        perfiles,
        target,
        conn
      )

      const badges = badgesOf(
        perfiles[id]
      )

      return replyMention(
        conn,
        m,
        `╭━━━〔 🏅 INSIGNIAS 〕━━━╮

👤 Usuario: ${tag(id)}

━━━━━━━━━━━━━━━━━━━━

${formatBadges(badges)}

━━━━━━━━━━━━━━━━━━━━
🏅 Total: ${badges.length}
╰━━━━━━━━━━━━━━━━━━━━╯`,
        [id]
      )
    }

    // ========================================================
    // 👤 PERFIL COMPLETO
    // ========================================================

    if (cmd === 'perfil') {
      const perfil = perfiles[targetId] || {}

      const edad = ageOf(perfil.birth)
      const cumple = birthdayIn(perfil.birth)

      const role = await roleOf(
        m,
        conn,
        targetId,
        extra
      )

      const badges = badgesOf(perfil)

      const parejas = loadJSON(PAREJAS_FILE)
      const hermanos = loadJSON(HERMANOS_FILE)

      const parejaInfo = getPartner(
        parejas,
        targetId,
        conn
      )

      const parejaJid =
        parejaInfo?.parejaJid || null

      const brothers = getBrothers(
        hermanos,
        targetId,
        conn
      )

      const mentions = [
        targetId,
        parejaJid,
        ...brothers.map(b => b.jid)
      ].filter(Boolean)

      let relacion = ''

      if (parejaJid) {
        relacion =
          `${relationshipStatus(parejaInfo.estado)}\n\n` +
          `💞 *Pareja:* ${tag(parejaJid)}\n` +
          `📅 *Desde:* ${formatDate(parejaInfo.relacionFecha)}\n` +
          `🕒 *Tiempo:* ${daysSince(parejaInfo.relacionFecha)} días\n` +
          `💖 *Amor:* ${Number(parejaInfo.amor || 0)} puntos`

        if (parejaInfo.matrimonioFecha) {
          relacion +=
            `\n💍 *Matrimonio:* ${formatDate(parejaInfo.matrimonioFecha)}`
        }
      } else {
        relacion =
          '💔 *Soltero/a*\n\n' +
          'No tiene pareja registrada.'
      }

      const hermanosTexto = brothers.length
        ? brothers.map((b, index) =>
          `${index + 1}. 🤝 ${tag(b.jid)}\n` +
          `   💪 Nivel: ${b.nivel}\n` +
          `   🏅 ${brotherRank(b.nivel)}\n` +
          `   🎮 Interacciones: ${b.interacciones}\n` +
          `   📅 Desde: ${formatDate(b.fecha)}\n` +
          `   🕒 ${daysSince(b.fecha)} días`
        ).join('\n\n')
        : '😹 No tiene hermanos registrados.'

      const texto =
`╭━━━━━━━━━━━━━━━━━━━━╮
        👤 *PERFIL*
╰━━━━━━━━━━━━━━━━━━━━╯

👤 *Usuario:* ${tag(targetId)}
${role}

━━━━━━━━━━━━━━━━━━━━
📝 *BIO*
${perfil.bio || 'Sin biografía'}

⚧️ *Género:* ${perfil.genero || 'No especificado'}

🎂 *Edad:* ${
  edad === null
    ? 'No registrada'
    : `${edad} años`
}

✨ *Signo:* ${zodiac(perfil.birth)}

🎂 *Cumpleaños:* ${
  cumple === null
    ? 'No registrado'
    : cumple === 0
      ? '🎉 ¡Hoy es su cumpleaños!'
      : `faltan ${cumple} días`
}

📅 *Registrado:* ${
  formatDate(
    perfil.registered ||
    perfil.joinGroup
  )
}

━━━━━━━━━━━━━━━━━━━━
❤️ *RELACIÓN*

${relacion}

━━━━━━━━━━━━━━━━━━━━
🧬 *HERMANOS*

🤝 *${brothers.length}/3 hermanos*

${hermanosTexto}

━━━━━━━━━━━━━━━━━━━━
🏅 *INSIGNIAS*

${formatBadges(badges)}

━━━━━━━━━━━━━━━━━━━━
📊 *RESUMEN*

❤️ Pareja: ${parejaJid ? 'Sí' : 'No'}
🤝 Hermanos: ${brothers.length}/3
🏅 Insignias: ${badges.length}

━━━━━━━━━━━━━━━━━━━━
🤖 WHATSAPP-BOT`

      try {
        const photo = await conn.profilePictureUrl(
          targetId,
          'image'
        )

        if (photo) {
          return await conn.sendMessage(
            m.chat,
            {
              image: { url: photo },
              caption: texto,
              mentions: [...new Set(mentions)]
            },
            { quoted: m }
          )
        }
      } catch (error) {
        console.log(
          '[PERFIL] Foto no disponible:',
          error.message
        )
      }

      return replyMention(
        conn,
        m,
        texto,
        mentions
      )
    }

  } catch (error) {
    console.error(
      '[PERFIL] ERROR EN COMANDO:',
      cmd,
      error
    )

    try {
      return await replyMention(
        conn,
        m,
        `❌ Error al ejecutar *.${cmd}*.\n\n` +
        'Revisá la consola del bot.'
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
