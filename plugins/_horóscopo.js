// 📂 plugins/horoscopo.js — WhatsApp-Bot 🔮✨
// 🌌 Horóscopo diario
// ============================================================

import axios from 'axios'

// ============================================================
// ⏱️ COOLDOWN
// ============================================================

const cooldowns = new Map()

const COOLDOWN = 30 * 1000 // 30 segundos

// ============================================================
// ♈ SIGNOS
// ============================================================

const signos = {
  aries: {
    nombre: 'Aries',
    emoji: '♈',
    slug: 'aries'
  },

  tauro: {
    nombre: 'Tauro',
    emoji: '♉',
    slug: 'tauro'
  },

  geminis: {
    nombre: 'Géminis',
    emoji: '♊',
    slug: 'geminis'
  },

  cancer: {
    nombre: 'Cáncer',
    emoji: '♋',
    slug: 'cancer'
  },

  leo: {
    nombre: 'Leo',
    emoji: '♌',
    slug: 'leo'
  },

  virgo: {
    nombre: 'Virgo',
    emoji: '♍',
    slug: 'virgo'
  },

  libra: {
    nombre: 'Libra',
    emoji: '♎',
    slug: 'libra'
  },

  escorpio: {
    nombre: 'Escorpio',
    emoji: '♏',
    slug: 'escorpion'
  },

  sagitario: {
    nombre: 'Sagitario',
    emoji: '♐',
    slug: 'sagitario'
  },

  capricornio: {
    nombre: 'Capricornio',
    emoji: '♑',
    slug: 'capricornio'
  },

  acuario: {
    nombre: 'Acuario',
    emoji: '♒',
    slug: 'acuario'
  },

  piscis: {
    nombre: 'Piscis',
    emoji: '♓',
    slug: 'piscis'
  }
}

// ============================================================
// 🔄 ALIAS
// ============================================================

const aliasSignos = {

  aries: 'aries',

  tauro: 'tauro',

  geminis: 'geminis',
  géminis: 'geminis',
  geminis: 'geminis',

  cancer: 'cancer',
  cáncer: 'cancer',

  leo: 'leo',

  virgo: 'virgo',

  libra: 'libra',

  escorpio: 'escorpio',
  escorpión: 'escorpio',
  escorpion: 'escorpio',

  sagitario: 'sagitario',

  capricornio: 'capricornio',

  acuario: 'acuario',

  piscis: 'piscis'
}

// ============================================================
// 🧠 NORMALIZAR
// ============================================================

function normalizar(texto = '') {

  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// ============================================================
// 🔎 OBTENER SIGNO
// ============================================================

function obtenerSigno(texto = '') {

  const limpio = normalizar(texto)

  const clave = aliasSignos[limpio]

  if (!clave)
    return null

  return {
    clave,
    ...signos[clave]
  }
}

// ============================================================
// 📋 MENÚ
// ============================================================

function menuHoroscopo(usedPrefix, command) {

  return `
╭━━━〔 🌌 *HORÓSCOPO DIARIO* 〕━━━⬣
┃
┃ 🔮 Consultá el horóscopo de tu signo
┃ y descubrí qué dicen los astros hoy.
┃
┣━━━━━━━━━━━━━━━━━━━
┃ ♈ *Aries*
┃ ♉ *Tauro*
┃ ♊ *Géminis*
┃ ♋ *Cáncer*
┃ ♌ *Leo*
┃ ♍ *Virgo*
┃ ♎ *Libra*
┃ ♏ *Escorpio*
┃ ♐ *Sagitario*
┃ ♑ *Capricornio*
┃ ♒ *Acuario*
┃ ♓ *Piscis*
┣━━━━━━━━━━━━━━━━━━━
┃ 📝 *Ejemplo:*
┃ ${usedPrefix + command} aries
┃
┃ 💡 También acepta signos
┃ con o sin tilde.
╰━━━━━━━━━━━━━━━━━━⬣
`.trim()
}

// ============================================================
// 🧹 LIMPIAR HTML
// ============================================================

function limpiarHTML(texto = '') {

  return String(texto)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim()
}

// ============================================================
// 🔎 EXTRAER HORÓSCOPO
// ============================================================

function extraerHoroscopo(html = '') {

  /*
   * Intentamos encontrar el primer párrafo con contenido.
   * Se mantiene compatible con la estructura actual del sitio,
   * pero limpiamos el HTML antes de mostrarlo.
   */

  const coincidencia = html.match(
    /<p[^>]*>([\s\S]*?)<\/p>/i
  )

  if (!coincidencia)
    return null

  let contenido = limpiarHTML(coincidencia[1])

  if (!contenido)
    return null

  // Intentar separar fecha y predicción
  const partes = contenido.split(/\s*-\s*/)

  let fecha = ''
  let mensaje = contenido

  if (partes.length >= 2) {
    fecha = partes.shift().trim()
    mensaje = partes.join(' - ').trim()
  }

  return {
    fecha,
    mensaje
  }
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
    // 📋 SIN SIGNO
    // ========================================================

    if (!text?.trim()) {

      return conn.sendMessage(
        m.chat,
        {
          text: menuHoroscopo(
            usedPrefix,
            command
          )
        },
        {
          quoted: m
        }
      )
    }

    // ========================================================
    // ⏱️ COOLDOWN
    // ========================================================

    const userId = m.sender
    const ahora = Date.now()

    const ultimoUso = cooldowns.get(userId)

    if (ultimoUso) {

      const restante =
        COOLDOWN - (ahora - ultimoUso)

      if (restante > 0) {

        const segundos =
          Math.ceil(restante / 1000)

        return conn.sendMessage(
          m.chat,
          {
            text:
              `🕒 Esperá *${segundos} segundos* ` +
              `antes de consultar nuevamente.`
          },
          {
            quoted: m
          }
        )
      }
    }

    // ========================================================
    // 🔎 SIGNO
    // ========================================================

    const signo = obtenerSigno(text)

    if (!signo) {

      return conn.sendMessage(
        m.chat,
        {
          text:
`❌ *Signo no reconocido.*

🌌 Signos disponibles:

♈ Aries
♉ Tauro
♊ Géminis
♋ Cáncer
♌ Leo
♍ Virgo
♎ Libra
♏ Escorpio
♐ Sagitario
♑ Capricornio
♒ Acuario
♓ Piscis

📝 *Ejemplo:*
${usedPrefix + command} capricornio`
        },
        {
          quoted: m
        }
      )
    }

    // Guardar solamente después de validar
    cooldowns.set(userId, ahora)

    // Limpieza automática
    setTimeout(() => {

      if (cooldowns.get(userId) === ahora)
        cooldowns.delete(userId)

    }, COOLDOWN + 1000)

    // ========================================================
    // ♈ REACCIÓN
    // ========================================================

    try {

      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: signo.emoji,
            key: m.key
          }
        }
      )

    } catch {}

    // ========================================================
    // 🌐 CONSULTAR WEB
    // ========================================================

    const url =
      `https://www.horoscopo.com/horoscopos/general-diaria-${signo.slug}`

    const res = await axios.get(
      url,
      {
        timeout: 10000,

        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36',
          'Accept-Language':
            'es-ES,es;q=0.9'
        },

        validateStatus: status =>
          status >= 200 &&
          status < 400
      }
    )

    // ========================================================
    // 🔮 EXTRAER
    // ========================================================

    const resultado =
      extraerHoroscopo(res.data)

    if (
      !resultado ||
      !resultado.mensaje
    ) {

      throw new Error(
        'No se encontró el contenido del horóscopo.'
      )
    }

    // ========================================================
    // 📅 FECHA
    // ========================================================

    const fechaActual =
      new Intl.DateTimeFormat(
        'es-UY',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'America/Montevideo'
        }
      ).format(new Date())

    const fecha =
      resultado.fecha ||
      fechaActual

    // ========================================================
    // 🧾 MENSAJE FINAL
    // ========================================================

    const textoFinal =
`
╭━━━〔 ${signo.emoji} *${signo.nombre.toUpperCase()}* ${signo.emoji} 〕━━━⬣
┃
┃ 📅 *Fecha:* ${fecha}
┃
┣━━━━━━━━━━━━━━━━━━━
┃ 🔮 *HORÓSCOPO GENERAL*
┣━━━━━━━━━━━━━━━━━━━
┃
${resultado.mensaje}
┃
╰━━━━━━━━━━━━━━━━━━━⬣

✨ *Que los astros te acompañen.*
🌌 *WhatsApp-Bot*
`.trim()

    // ========================================================
    // 📤 ENVIAR
    // ========================================================

    const msg =
      await conn.sendMessage(
        m.chat,
        {
          text: textoFinal
        },
        {
          quoted: m
        }
      )

    // ========================================================
    // 🌠 REACCIÓN FINAL
    // ========================================================

    try {

      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '🌠',
            key: msg.key
          }
        }
      )

    } catch {}

  } catch (error) {

    console.error(
      '❌ Error en plugins/horoscopo.js:',
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

    return conn.sendMessage(
      m.chat,
      {
        text:
`⚠️ *No se pudo obtener el horóscopo.*

Puede que el sitio no esté disponible en este momento.

🔄 Intentá nuevamente más tarde.`
      },
      {
        quoted: m
      }
    )
  }
}

// ============================================================
// 📚 AYUDA
// ============================================================

handler.help = [
  'horoscopo',
  'horoscopo <signo>'
]

// ============================================================
// 🏷️ CATEGORÍA
// ============================================================

handler.tags = [
  'entretenimiento'
]

// ============================================================
// ⚙️ COMANDOS
// ============================================================

handler.command = [
  'horoscopo',
  'horóscopo'
]

// ============================================================
// 🤖 NO REQUIERE ADMIN
// ============================================================

handler.botAdmin = false

export default handler
