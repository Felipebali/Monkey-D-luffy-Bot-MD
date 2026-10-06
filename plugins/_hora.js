// 📂 plugins/hora.js — WhatsApp-Bot 🕒🌎
// ⏰ Hora mundial — versión PRO
// ============================================================

const cooldowns = new Map()

// ============================================================
// 🌎 ZONAS HORARIAS
// ============================================================

const ZONAS = {

  // 🇺🇾 URUGUAY
  uruguay: 'America/Montevideo',
  montevideo: 'America/Montevideo',
  salto: 'America/Montevideo',
  paysandu: 'America/Montevideo',
  paysandú: 'America/Montevideo',
  mercedes: 'America/Montevideo',
  colonia: 'America/Montevideo',
  rivera: 'America/Montevideo',
  punta: 'America/Montevideo',

  // 🇦🇷 ARGENTINA
  argentina: 'America/Argentina/Buenos_Aires',
  buenosaires: 'America/Argentina/Buenos_Aires',
  'buenos aires': 'America/Argentina/Buenos_Aires',
  cordoba: 'America/Argentina/Cordoba',
  córdoba: 'America/Argentina/Cordoba',
  rosario: 'America/Argentina/Cordoba',
  mendoza: 'America/Argentina/Mendoza',
  salta: 'America/Argentina/Salta',
  tucuman: 'America/Argentina/Tucuman',
  ushuaia: 'America/Argentina/Ushuaia',

  // 🇧🇷 BRASIL
  brasil: 'America/Sao_Paulo',
  brazil: 'America/Sao_Paulo',
  saopaulo: 'America/Sao_Paulo',
  'sao paulo': 'America/Sao_Paulo',
  río: 'America/Argentina/Buenos_Aires',
  rio: 'America/Sao_Paulo',
  brasilia: 'America/Sao_Paulo',
  salvador: 'America/Bahia',
  recife: 'America/Recife',
  fortaleza: 'America/Fortaleza',

  // 🇨🇱 CHILE
  chile: 'America/Santiago',
  santiago: 'America/Santiago',
  valparaiso: 'America/Santiago',
  valparaíso: 'America/Santiago',

  // 🇵🇾 PARAGUAY
  paraguay: 'America/Asuncion',
  asuncion: 'America/Asuncion',
  asunción: 'America/Asuncion',

  // 🇧🇴 BOLIVIA
  bolivia: 'America/La_Paz',
  lapaz: 'America/La_Paz',
  'la paz': 'America/La_Paz',

  // 🇵🇪 PERÚ
  peru: 'America/Lima',
  perú: 'America/Lima',
  lima: 'America/Lima',

  // 🇨🇴 COLOMBIA
  colombia: 'America/Bogota',
  bogota: 'America/Bogota',
  bogotá: 'America/Bogota',
  medellin: 'America/Bogota',
  medellín: 'America/Bogota',

  // 🇻🇪 VENEZUELA
  venezuela: 'America/Caracas',
  caracas: 'America/Caracas',

  // 🇪🇨 ECUADOR
  ecuador: 'America/Guayaquil',
  quito: 'America/Guayaquil',
  guayaquil: 'America/Guayaquil',

  // 🇲🇽 MÉXICO
  mexico: 'America/Mexico_City',
  méxico: 'America/Mexico_City',
  mexicocity: 'America/Mexico_City',
  'mexico city': 'America/Mexico_City',
  ciudadmexico: 'America/Mexico_City',
  cancun: 'America/Cancun',
  cancún: 'America/Cancun',
  monterrey: 'America/Monterrey',
  tijuana: 'America/Tijuana',

  // 🇺🇸 ESTADOS UNIDOS
  usa: 'America/New_York',
  eeuu: 'America/New_York',
  estadosunidos: 'America/New_York',
  'estados unidos': 'America/New_York',
  newyork: 'America/New_York',
  'new york': 'America/New_York',
  miami: 'America/New_York',
  washington: 'America/New_York',
  chicago: 'America/Chicago',
  denver: 'America/Denver',
  losangeles: 'America/Los_Angeles',
  'los angeles': 'America/Los_Angeles',
  california: 'America/Los_Angeles',
  lasvegas: 'America/Los_Angeles',
  'las vegas': 'America/Los_Angeles',
  hawaii: 'Pacific/Honolulu',
  alaska: 'America/Anchorage',

  // 🇨🇦 CANADÁ
  canada: 'America/Toronto',
  canadá: 'America/Toronto',
  toronto: 'America/Toronto',
  vancouver: 'America/Vancouver',
  montreal: 'America/Toronto',
  montreal: 'America/Toronto',

  // 🇪🇸 ESPAÑA
  espana: 'Europe/Madrid',
  españa: 'Europe/Madrid',
  madrid: 'Europe/Madrid',
  barcelona: 'Europe/Madrid',
  valencia: 'Europe/Madrid',
  sevilla: 'Europe/Madrid',

  // 🇵🇹 PORTUGAL
  portugal: 'Europe/Lisbon',
  lisboa: 'Europe/Lisbon',
  lisbon: 'Europe/Lisbon',

  // 🇫🇷 FRANCIA
  francia: 'Europe/Paris',
  paris: 'Europe/Paris',

  // 🇩🇪 ALEMANIA
  alemania: 'Europe/Berlin',
  berlin: 'Europe/Berlin',

  // 🇮🇹 ITALIA
  italia: 'Europe/Rome',
  roma: 'Europe/Rome',
  milan: 'Europe/Rome',
  milán: 'Europe/Rome',

  // 🇬🇧 REINO UNIDO
  inglaterra: 'Europe/London',
  reino: 'Europe/London',
  reinounido: 'Europe/London',
  'reino unido': 'Europe/London',
  londres: 'Europe/London',
  london: 'Europe/London',

  // 🇮🇪 IRLANDA
  irlanda: 'Europe/Dublin',
  dublin: 'Europe/Dublin',
  dublín: 'Europe/Dublin',

  // 🇷🇺 RUSIA
  rusia: 'Europe/Moscow',
  moscu: 'Europe/Moscow',
  moscú: 'Europe/Moscow',

  // 🇯🇵 JAPÓN
  japon: 'Asia/Tokyo',
  japón: 'Asia/Tokyo',
  tokio: 'Asia/Tokyo',
  tokyo: 'Asia/Tokyo',

  // 🇰🇷 COREA DEL SUR
  corea: 'Asia/Seoul',
  coreadelsur: 'Asia/Seoul',
  'corea del sur': 'Asia/Seoul',
  seul: 'Asia/Seoul',
  seoul: 'Asia/Seoul',

  // 🇨🇳 CHINA
  china: 'Asia/Shanghai',
  pekin: 'Asia/Shanghai',
  pekín: 'Asia/Shanghai',
  beijing: 'Asia/Shanghai',
  shanghai: 'Asia/Shanghai',

  // 🇮🇳 INDIA
  india: 'Asia/Kolkata',
  mumbai: 'Asia/Kolkata',
  delhi: 'Asia/Kolkata',
  'nueva delhi': 'Asia/Kolkata',

  // 🇦🇪 EMIRATOS
  dubai: 'Asia/Dubai',
  emiratos: 'Asia/Dubai',
  arabes: 'Asia/Dubai',
  'emiratos arabes': 'Asia/Dubai',

  // 🇦🇺 AUSTRALIA
  australia: 'Australia/Sydney',
  sidney: 'Australia/Sydney',
  sydney: 'Australia/Sydney',
  melbourne: 'Australia/Melbourne',
  perth: 'Australia/Perth',

  // 🇳🇿 NUEVA ZELANDA
  nuevazelanda: 'Pacific/Auckland',
  'nueva zelanda': 'Pacific/Auckland',
  auckland: 'Pacific/Auckland',

  // 🌍 UTC
  utc: 'UTC',
  gmt: 'UTC'
}

// ============================================================
// 🧠 NORMALIZAR TEXTO
// ============================================================

function normalizar(texto = '') {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// ============================================================
// 🔎 BUSCAR ZONA
// ============================================================

function obtenerZona(texto) {

  const limpio = normalizar(texto)

  if (!limpio) {
    return {
      zona: 'America/Montevideo',
      nombre: 'Uruguay 🇺🇾'
    }
  }

  // Primero intenta coincidencia completa
  if (ZONAS[limpio]) {
    return {
      zona: ZONAS[limpio],
      nombre: texto.trim()
    }
  }

  // Luego busca expresiones de varias palabras
  const entradas = Object.keys(ZONAS)
    .sort((a, b) => b.length - a.length)

  for (const nombre of entradas) {

    const nombreNormalizado = normalizar(nombre)

    if (limpio.includes(nombreNormalizado)) {

      return {
        zona: ZONAS[nombre],
        nombre: nombre
      }
    }
  }

  return null
}

// ============================================================
// 🎨 EMOJI SEGÚN HORA
// ============================================================

function obtenerEmoji(hora) {

  if (hora >= 5 && hora < 7)
    return '🌅'

  if (hora >= 7 && hora < 12)
    return '☀️'

  if (hora >= 12 && hora < 18)
    return '🌞'

  if (hora >= 18 && hora < 21)
    return '🌇'

  if (hora >= 21 && hora < 24)
    return '🌙'

  return '🌌'
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (
  m,
  {
    conn,
    text = '',
    usedPrefix,
    command
  }
) => {

  try {

    // ========================================================
    // ⏱️ COOLDOWN
    // ========================================================

    const userId = m.sender
    const ahora = Date.now()

    // 30 segundos
    const cooldownTime = 30 * 1000

    const ultimoUso = cooldowns.get(userId)

    if (ultimoUso) {

      const restante = cooldownTime - (ahora - ultimoUso)

      if (restante > 0) {

        const segundos = Math.ceil(restante / 1000)

        return conn.reply(
          m.chat,
          `🕒 Esperá *${segundos} segundos* para volver a consultar la hora.`,
          m
        )
      }
    }

    // Guardar uso
    cooldowns.set(userId, ahora)

    // Limpieza automática del Map
    setTimeout(() => {
      if (cooldowns.get(userId) === ahora) {
        cooldowns.delete(userId)
      }
    }, cooldownTime + 1000)

    // ========================================================
    // 🕒 REACCIÓN
    // ========================================================

    try {
      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '🕒',
            key: m.key
          }
        }
      )
    } catch {}

    // ========================================================
    // 🌎 OBTENER ZONA
    // ========================================================

    const resultado = obtenerZona(text)

    if (!resultado) {

      return conn.reply(
        m.chat,
        `❌ No reconocí esa ciudad o país.

🌎 *Ejemplos:*

${usedPrefix + command} Uruguay
${usedPrefix + command} Argentina
${usedPrefix + command} Buenos Aires
${usedPrefix + command} Chile
${usedPrefix + command} Brasil
${usedPrefix + command} España
${usedPrefix + command} Japón
${usedPrefix + command} Estados Unidos
${usedPrefix + command} Nueva York
${usedPrefix + command} Londres
${usedPrefix + command} Tokio

💡 También podés usar:
${usedPrefix + command} UTC`,
        m
      )
    }

    const {
      zona,
      nombre
    } = resultado

    // ========================================================
    // 📅 FECHA
    // ========================================================

    const fecha = new Intl.DateTimeFormat(
      'es-UY',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: zona
      }
    ).format(new Date())

    // ========================================================
    // ⏰ HORA
    // ========================================================

    const hora = new Intl.DateTimeFormat(
      'es-UY',
      {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: zona
      }
    ).format(new Date())

    // ========================================================
    // 🔢 HORA NUMÉRICA
    // ========================================================

    const horaNumerica = parseInt(
      hora.split(':')[0],
      10
    )

    const emoji = obtenerEmoji(horaNumerica)

    // ========================================================
    // 🌍 NOMBRE DE LA ZONA
    // ========================================================

    const fechaCapitalizada =
      fecha.charAt(0).toUpperCase() +
      fecha.slice(1)

    // ========================================================
    // 📋 MENSAJE
    // ========================================================

    const mensaje = `
╭━━━〔 ${emoji} *HORA MUNDIAL* 〕━━━⬣
┃
┃ 📍 Lugar: *${String(nombre).toUpperCase()}*
┃
┃ ⏰ Hora: *${hora}*
┃ 📅 Fecha: *${fechaCapitalizada}*
┃ 🌐 Zona: *${zona}*
┃
╰━━━━━━━━━━━━━━━━⬣

🌎 *WhatsApp-Bot*
`.trim()

    // ========================================================
    // 📤 ENVIAR
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        text: mensaje
      },
      {
        quoted: m
      }
    )

    // ========================================================
    // ✅ REACCIÓN FINAL
    // ========================================================

    try {

      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '✅',
            key: m.key
          }
        }
      )

    } catch {}

  } catch (error) {

    console.error(
      '❌ Error en plugins/hora.js:',
      error
    )

    try {

      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '⚠️',
            key: m.key
          }
        }
      )

    } catch {}

    return conn.reply(
      m.chat,
      '⚠️ Ocurrió un error al obtener la hora. Intentá nuevamente.',
      m
    )
  }
}

// ============================================================
// 📚 AYUDA
// ============================================================

handler.help = [
  'hora',
  'hora <ciudad>',
  'hora <país>'
]

// ============================================================
// 🏷️ CATEGORÍA
// ============================================================

handler.tags = [
  'utilidad'
]

// ============================================================
// ⚙️ COMANDOS
// ============================================================

handler.command = [
  'hora',
  'time'
]

export default handler
