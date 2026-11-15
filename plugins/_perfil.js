
/**
 * 📂 plugins/perfil.js
 * 🤖 WHATSAPP-BOT — SISTEMA DE PERFILES
 * Baileys ES Modules
 */

import fs from 'fs'
import path from 'path'

// ============================================================
// 📁 BASE DE DATOS
// ============================================================

const DIR = './database'

const FILES = {
  perfiles: path.join(DIR, 'perfiles.json'),
  parejas: path.join(DIR, 'parejas.json'),
  hermanos: path.join(DIR, 'hermanos.json')
}

fs.mkdirSync(DIR, { recursive: true })

for (const file of Object.values(FILES)) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '{}', 'utf8')
  }
}

function load(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return data && typeof data === 'object' && !Array.isArray(data)
      ? data
      : {}
  } catch (error) {
    console.error('[PERFIL] Error leyendo:', file, error)
    return {}
  }
}

function save(file, data) {
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(temp, file)
}

// ============================================================
// 👤 IDENTIFICADORES
// ============================================================

function jid(value, conn) {
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

  let result = String(value).trim().replace(/^@/, '')

  try {
    if (result.includes('@') && conn?.decodeJid) {
      result = conn.decodeJid(result) || result
    }
  } catch {}

  if (result.includes('@')) {
    const [user, domain] = result.split('@')
    return user && domain
      ? `${user.split(':')[0]}@${domain}`
      : null
  }

  const digits = result.replace(/\D/g, '')

  return digits ? `${digits}@s.whatsapp.net` : null
}

function same(a, b, conn) {
  const x = jid(a, conn)
  const y = jid(b, conn)
  return Boolean(x && y && x === y)
}

function keyFor(db, user, conn) {
  const normalized = jid(user, conn)
  if (!normalized) return null

  return Object.keys(db).find(
    key => same(key, normalized, conn)
  ) || normalized
}

function mention(user) {
  return user
    ? '@' + String(user).split('@')[0].split(':')[0]
    : '@usuario'
}

function owners() {
  return Array.isArray(global.owner) ? global.owner : []
}

function isOwner(m, conn, extra) {
  if (extra.isOwner || extra.isROwner || m.fromMe) {
    return true
  }

  return owners().some(o =>
    same(Array.isArray(o) ? o[0] : o, m.sender, conn)
  )
}

function targetOf(m, conn) {
  const mentions =
    m.mentionedJid ||
    m.mentions ||
    m.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    []

  return jid(mentions[0] || m.quoted?.sender, conn)
}

// ============================================================
// 🎂 CUMPLEAÑOS
// ============================================================

function validBirth(input) {
  const match = String(input || '').trim().match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  )

  if (!match) return null

  const d = Number(match[1])
  const m = Number(match[2])
  const y = Number(match[3])

  if (y < 1900 || y > new Date().getFullYear()) {
    return null
  }

  const date = new Date(Date.UTC(y, m - 1, d))

  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) return null

  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parts(value) {
  const match = String(value || '').match(
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
  ) return null

  return { y, m, d }
}

function dateText(value) {
  const p = parts(value)

  if (p) {
    return `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}`
  }

  if (!value) return 'No registrada'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? 'No registrada'
    : date.toLocaleDateString('es-UY', {
        timeZone: 'America/Montevideo'
      })
}

function todayUY() {
  const fields = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montevideo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())

  const obj = Object.fromEntries(
    fields.map(p => [p.type, p.value])
  )

  return {
    y: Number(obj.year),
    m: Number(obj.month),
    d: Number(obj.day)
  }
}

function ageAndBirthday(value) {
  const b = parts(value)

  if (!b) {
    return { age: null, remaining: null }
  }

  const now = todayUY()

  const age = now.y - b.y - (
    now.m < b.m ||
    (now.m === b.m && now.d < b.d)
      ? 1
      : 0
  )

  const today = Date.UTC(now.y, now.m - 1, now.d)
  let remaining = null

  for (let year = now.y; year <= now.y + 8; year++) {
    const next = Date.UTC(year, b.m - 1, b.d)
    const check = new Date(next)

    if (
      check.getUTCMonth() === b.m - 1 &&
      check.getUTCDate() === b.d &&
      next >= today
    ) {
      remaining = Math.round(
        (next - today) / 86400000
      )
      break
    }
  }

  return {
    age: Math.max(0, age),
    remaining
  }
}

function zodiac(value) {
  const b = parts(value)
  if (!b) return '❔ Desconocido'

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

  return b.d <= limits[b.m - 1]
    ? signs[b.m - 1]
    : signs[b.m % 12]
}

function daysSince(value) {
  const time = new Date(value).getTime()

  return Number.isFinite(time)
    ? Math.max(
        0,
        Math.floor((Date.now() - time) / 86400000)
      )
    : 0
}

// ============================================================
// 🏅 INSIGNIAS
// ============================================================

function badges(profile) {
  return Array.isArray(profile?.insignias)
    ? profile.insignias
        .map(x => String(x || '').trim())
        .filter(Boolean)
    : []
}

function badgeText(list) {
  return list.length
    ? list.map((x, i) => `${i + 1}. ${x}`).join('\n')
    : 'Sin insignias'
}

// ============================================================
// ❤️ PAREJAS
// ============================================================

function partnerId(value, conn) {
  if (typeof value === 'string') {
    return jid(value, conn)
  }

  return jid(
    value?.jid ||
    value?.id ||
    value?.user ||
    value?.numero ||
    value?.number ||
    value?.phone ||
    value?.pareja ||
    value?.partner ||
    value?.partnerJid,
    conn
  )
}

function partnerOf(db, user, conn) {
  const key = keyFor(db, user, conn)
  const record = db[key]

  if (record && typeof record === 'object') {
    const partner = partnerId(
      record.pareja ??
      record.partner ??
      record.partnerJid ??
      record.parejaJid,
      conn
    )

    if (partner && !same(partner, user, conn)) {
      return { ...record, parejaJid: partner }
    }
  }

  for (const [other, data] of Object.entries(db)) {
    if (!data || typeof data !== 'object') continue

    const partner = partnerId(
      data.pareja ??
      data.partner ??
      data.partnerJid ??
      data.parejaJid,
      conn
    )

    if (
      partner &&
      same(partner, user, conn) &&
      !same(other, user, conn)
    ) {
      return {
        ...data,
        parejaJid: jid(other, conn)
      }
    }
  }

  return null
}

function relationStatus(state) {
  const states = {
    novios: '❤️ En pareja',
    casados: '💍 Casados',
    prometidos: '💎 Comprometidos',
    comprometidos: '💎 Comprometidos',
    enamorados: '💖 Enamorados',
    pareja: '❤️ En pareja'
  }

  return states[
    String(state || '').toLowerCase()
  ] || '❤️ En pareja'
}

// ============================================================
// 🧬 HERMANOS
// ============================================================

function brothersOf(db, user, conn) {
  const record = db[keyFor(db, user, conn)]

  return (
    Array.isArray(record?.hermanos)
      ? record.hermanos
      : []
  ).map(b => ({
    jid: jid(
      typeof b === 'string'
        ? b
        : b?.jid || b?.id,
      conn
    ),
    nivel: Number(b?.nivel) || 0,
    interacciones: Number(b?.interacciones) || 0,
    fecha: b?.fecha || null
  }))
    .filter(x => x.jid)
    .slice(0, 3)
}

function brotherRank(n) {
  if (n >= 500) return '👑 Hermanos Supremos'
  if (n >= 200) return '🔥 Hermanos Legendarios'
  if (n >= 120) return '💪 Hermanos Fuertes'
  if (n >= 60) return '🤝 Hermanos Reales'
  if (n >= 30) return '🙂 Hermanos Cercanos'
  return '👶 Hermanos Nuevos'
}

// ============================================================
// 🛡️ ROLES
// ============================================================

async function roleOf(m, conn, target, extra) {
  if (
    owners().some(o =>
      same(Array.isArray(o) ? o[0] : o, target, conn)
    ) ||
    (
      same(target, m.sender, conn) &&
      isOwner(m, conn, extra)
    )
  ) {
    return '👑 Dueño'
  }

  if (!m.isGroup) return '👤 Usuario'

  try {
    const metadata = await conn.groupMetadata(m.chat)

    const participant = metadata.participants.find(p =>
      [
        p.id,
        p.jid,
        p.lid,
        p.phoneNumber
      ].some(x => same(x, target, conn))
    )

    if (participant?.admin === 'superadmin') {
      return '👑 Creador'
    }

    if (participant?.admin) {
      return '🛡️ Administrador'
    }
  } catch (error) {
    console.warn('[PERFIL] Error consultando rol:', error.message)
  }

  return '👤 Usuario'
}

// ============================================================
// 📤 RESPUESTAS
// ============================================================

async function reply(conn, m, text, mentions = []) {
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
// ⚙️ COMANDOS
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

const handler = async (m, extra = {}) => {
  const { conn } = extra

  if (!conn?.sendMessage) return

  const cmd = String(extra.command || '')
    .replace(/^[.!#\/]/, '')
    .toLowerCase()

  if (!COMMANDS.includes(cmd)) return

  const text = typeof extra.text === 'string'
    ? extra.text.trim()
    : Array.isArray(extra.args)
      ? extra.args.join(' ').trim()
      : ''

  try {
    if (cmd === 'probarbio') {
      return reply(
        conn,
        m,
        '🧪 *PERFIL ACTIVO*\n\n' +
        '✅ Comandos y respuestas disponibles.\n\n' +
        'Probá:\n' +
        '.bio Soy Feli\n' +
        '.setbr 31/12/1998\n' +
        '.genero Masculino'
      )
    }

    const db = load(FILES.perfiles)
    const sender = jid(m.sender, conn)

    if (!sender) {
      return reply(
        conn,
        m,
        '❌ No pude identificar tu usuario.'
      )
    }

    const selected = targetOf(m, conn)
    const target = selected || sender

    const senderKey = keyFor(db, sender, conn)
    const targetKey = keyFor(db, target, conn)

    // ========================================================
    // 🎂 REGISTRAR CUMPLEAÑOS
    // ========================================================

    if (cmd === 'setbr') {
      const birth = validBirth(text)

      if (!birth) {
        return reply(
          conn,
          m,
          '🎂 Fecha inválida.\n' +
          'Usá *.setbr 31/12/1998*'
        )
      }

      db[senderKey] ||= {}
      db[senderKey].birth = birth

      save(FILES.perfiles, db)

      const { age } = ageAndBirthday(birth)

      return reply(
        conn,
        m,
        `🎂 *CUMPLEAÑOS REGISTRADO*\n\n` +
        `👤 ${mention(sender)}\n` +
        `📅 ${dateText(birth)}\n` +
        `🎉 ${age} años\n` +
        `✨ ${zodiac(birth)}`,
        [sender]
      )
    }

    // ========================================================
    // 📝 BIOGRAFÍA Y GÉNERO
    // ========================================================

    if (cmd === 'bio' || cmd === 'genero') {
      const limit = cmd === 'bio' ? 300 : 40

      if (!text || text.length > limit) {
        return reply(
          conn,
          m,
          `❌ Usá *.${cmd} ${
            cmd === 'bio'
              ? 'Me gusta la música'
              : 'Masculino'
          }*\nMáximo ${limit} caracteres.`
        )
      }

      db[senderKey] ||= {}
      db[senderKey][cmd] = text

      save(FILES.perfiles, db)

      return reply(
        conn,
        m,
        `✅ ${
          cmd === 'bio' ? 'Biografía' : 'Género'
        } actualizado.\n\n` +
        `👤 ${mention(sender)}\n${text}`,
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
      if (!isOwner(m, conn, extra)) {
        return reply(
          conn,
          m,
          '🚫 Solo los dueños pueden limpiar insignias.'
        )
      }

      let total = 0

      for (const profile of Object.values(db)) {
        if (!profile || typeof profile !== 'object') {
          continue
        }

        total += badges(profile).length
        profile.insignias = []
      }

      save(FILES.perfiles, db)

      return reply(
        conn,
        m,
        `🧹 Se eliminaron ${total} insignias.`
      )
    }

    // ========================================================
    // 🏅 OTORGAR Y QUITAR INSIGNIAS
    // ========================================================

    if (cmd === 'otorgar' || cmd === 'quitar') {
      if (!isOwner(m, conn, extra)) {
        return reply(
          conn,
          m,
          '🚫 Solo los dueños pueden administrar insignias.'
        )
      }

      if (!selected) {
        return reply(
          conn,
          m,
          '❌ Mencioná o respondé al usuario.\n' +
          `Ejemplo: *.${cmd} ${
            cmd === 'otorgar' ? '🏆 Mejor Admin' : '1'
          } @usuario*`
        )
      }

      const id = keyFor(db, selected, conn)
      const list = badges(db[id])

      const content = text
        .replace(/@\d{5,20}(?::\d+)?/g, '')
        .replace(/\s+/g, ' ')
        .trim()

      if (cmd === 'otorgar') {
        if (!content || content.length > 100) {
          return reply(
            conn,
            m,
            '❌ Indicá una insignia de hasta 100 caracteres.'
          )
        }

        if (list.some(x =>
          x.toLowerCase() === content.toLowerCase()
        )) {
          return reply(
            conn,
            m,
            '⚠️ Esa insignia ya existe.'
          )
        }

        list.push(content)

        db[id] ||= {}
        db[id].insignias = list

        save(FILES.perfiles, db)

        return reply(
          conn,
          m,
          `🏅 *INSIGNIA OTORGADA*\n\n` +
          `👤 ${mention(id)}\n` +
          `🏆 ${content}\n\n` +
          badgeText(list),
          [id]
        )
      }

      const number = Number(content)

      if (
        !Number.isInteger(number) ||
        number < 1 ||
        number > list.length
      ) {
        return reply(
          conn,
          m,
          '❌ Indicá un número válido.\n' +
          badgeText(list)
        )
      }

      const removed = list.splice(number - 1, 1)[0]

      db[id] ||= {}
      db[id].insignias = list

      save(FILES.perfiles, db)

      return reply(
        conn,
        m,
        `🗑️ Insignia eliminada de ${mention(id)}:\n` +
        `${removed}\n\n${badgeText(list)}`,
        [id]
      )
    }

    // ========================================================
    // 📋 VER INSIGNIAS
    // ========================================================

    if (
      cmd === 'insignias' ||
      cmd === 'verinsignias'
    ) {
      const list = badges(db[targetKey])

      return reply(
        conn,
        m,
        `🏅 *INSIGNIAS*\n\n` +
        `👤 ${mention(targetKey)}\n\n` +
        `${badgeText(list)}\n\n` +
        `Total: ${list.length}`,
        [targetKey]
      )
    }

    // ========================================================
    // 👤 PERFIL COMPLETO
    // ========================================================

    if (cmd === 'perfil') {
      const profile = db[targetKey] || {}

      const { age, remaining } = ageAndBirthday(
        profile.birth
      )

      const role = await roleOf(
        m,
        conn,
        targetKey,
        extra
      )

      const list = badges(profile)

      const relation = partnerOf(
        load(FILES.parejas),
        targetKey,
        conn
      )

      const partner = relation?.parejaJid || null

      const brothers = brothersOf(
        load(FILES.hermanos),
        targetKey,
        conn
      )

      const relationText = partner
        ? `${relationStatus(relation.estado)}\n` +
          `💞 Pareja: ${mention(partner)}\n` +
          `📅 Desde: ${dateText(relation.relacionFecha)}\n` +
          `🕒 Tiempo: ${daysSince(relation.relacionFecha)} días\n` +
          `💖 Amor: ${Number(relation.amor) || 0} puntos` +
          (
            relation.matrimonioFecha
              ? `\n💍 Matrimonio: ${dateText(relation.matrimonioFecha)}`
              : ''
          )
        : '💔 Soltero/a\nNo tiene pareja registrada.'

      const brothersText = brothers.length
        ? brothers.map((b, i) =>
            `${i + 1}. 🤝 ${mention(b.jid)}\n` +
            `   💪 Nivel: ${b.nivel}\n` +
            `   🏅 ${brotherRank(b.nivel)}\n` +
            `   🎮 Interacciones: ${b.interacciones}\n` +
            `   📅 Desde: ${dateText(b.fecha)}\n` +
            `   🕒 ${daysSince(b.fecha)} días`
          ).join('\n\n')
        : 'No tiene hermanos registrados.'

      const caption =
`╭━━━〔 👤 PERFIL 〕━━━╮
👤 Usuario: ${mention(targetKey)}
${role}

📝 *BIO*
${profile.bio || 'Sin biografía'}

⚧️ Género: ${profile.genero || 'No especificado'}
🎂 Edad: ${age === null ? 'No registrada' : `${age} años`}
✨ Signo: ${zodiac(profile.birth)}
🎂 Cumpleaños: ${
  remaining === null
    ? 'No registrado'
    : remaining === 0
      ? '🎉 ¡Hoy es su cumpleaños!'
      : `faltan ${remaining} días`
}
📅 Registrado: ${dateText(
  profile.registered || profile.joinGroup
)}

❤️ *RELACIÓN*
${relationText}

🧬 *HERMANOS (${brothers.length}/3)*
${brothersText}

🏅 *INSIGNIAS*
${badgeText(list)}

📊 *RESUMEN*
❤️ Pareja: ${partner ? 'Sí' : 'No'}
🤝 Hermanos: ${brothers.length}/3
🏅 Insignias: ${list.length}

🤖 WHATSAPP-BOT`

      const mentions = [
        ...new Set([
          targetKey,
          partner,
          ...brothers.map(b => b.jid)
        ].filter(Boolean))
      ]

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
                caption,
                mentions
              },
              { quoted: m }
            )
          } catch (error) {
            console.warn(
              '[PERFIL] Falló el envío de foto:',
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

      return reply(conn, m, caption, mentions)
    }

  } catch (error) {
    console.error(
      `[PERFIL] Error en ${cmd}:`,
      error
    )

    try {
      return await reply(
        conn,
        m,
        `❌ Error al ejecutar *.${cmd}*.\n` +
        'Revisá la consola.'
      )
    } catch (sendError) {
      console.error(
        '[PERFIL] Error respondiendo:',
        sendError
      )
    }
  }
}

// ============================================================
// 📋 REGISTRO
// ============================================================

handler.help = COMMANDS
handler.tags = ['perfil', 'owner']

handler.command =
  /^(perfil|setbr|bio|genero|otorgar|quitar|insignias|verinsignias|clearinsignias|clearins|probarbio)$/i

export default handler
