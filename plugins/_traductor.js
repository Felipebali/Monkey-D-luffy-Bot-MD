// 📂 plugins/traducir.js
// 🌐 Traductor Universal — FelixCat-Bot

import fetch from 'node-fetch'

// ============================================================
// 🌍 IDIOMAS DISPONIBLES
// ============================================================

const idiomas = {
  es: 'Español 🇪🇸',
  en: 'Inglés 🇬🇧',
  pt: 'Portugués 🇧🇷',
  fr: 'Francés 🇫🇷',
  it: 'Italiano 🇮🇹',
  de: 'Alemán 🇩🇪',
  ja: 'Japonés 🇯🇵',
  ru: 'Ruso 🇷🇺',
  ko: 'Coreano 🇰🇷',
  zh: 'Chino 🇨🇳',
  ar: 'Árabe 🇸🇦',
  pl: 'Polaco 🇵🇱',
  nl: 'Neerlandés 🇳🇱',
  tr: 'Turco 🇹🇷',
  uk: 'Ucraniano 🇺🇦',
  hi: 'Hindi 🇮🇳',
  sv: 'Sueco 🇸🇪',
  no: 'Noruego 🇳🇴',
  da: 'Danés 🇩🇰',
  fi: 'Finés 🇫🇮',
  cs: 'Checo 🇨🇿',
  el: 'Griego 🇬🇷',
  he: 'Hebreo 🇮🇱',
  id: 'Indonesio 🇮🇩',
  vi: 'Vietnamita 🇻🇳'
}

// ============================================================
// 🧹 LIMPIAR TEXTO
// ============================================================

function limpiarTexto(texto) {
  return String(texto || '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ============================================================
// 📖 MENÚ DE AYUDA
// ============================================================

function menuIdiomas(usedPrefix, command) {
  return `
╭━━━〔 🌐 *TRADUCTOR* 〕━━━╮
┃
┃ 🔤 Traduce textos a
┃ diferentes idiomas.
┃
┣━━━━━━━━━━━━━━━━━━
┃ 📌 *USO*
┃
┃ ${usedPrefix + command} <idioma> <texto>
┃
┃ 💬 También puedes responder
┃ un mensaje con:
┃ ${usedPrefix + command} <idioma>
┃
┣━━━━━━━━━━━━━━━━━━
┃ 📘 *EJEMPLOS*
┃
┃ • ${usedPrefix + command} en Hola
┃ • ${usedPrefix + command} pt Buenos días
┃ • ${usedPrefix + command} ja Hola amigo
┃
┣━━━━━━━━━━━━━━━━━━
┃ 🌍 *IDIOMAS*
┃
${Object.entries(idiomas)
  .map(([codigo, nombre]) => `┃ • *${codigo}* → ${nombre}`)
  .join('\n')}
┃
╰━━━━━━━━━━━━━━━━━━╯
`.trim()
}

// ============================================================
// 🌐 HANDLER
// ============================================================

let handler = async (m, { conn, text, usedPrefix, command }) => {

  // Reacción inicial
  try {
    await conn.sendMessage(m.chat, {
      react: {
        text: '🌐',
        key: m.key
      }
    })
  } catch {}

  // ============================================================
  // 💬 TEXTO CITADO
  // ============================================================

  const citado = limpiarTexto(
    m.quoted?.text ||
    m.quoted?.caption ||
    ''
  )

  const entrada = limpiarTexto(text)

  // ============================================================
  // ❓ SIN TEXTO
  // ============================================================

  if (!entrada && !citado) {
    return m.reply(
      menuIdiomas(usedPrefix, command)
    )
  }

  // ============================================================
  // 🔎 OBTENER IDIOMA Y TEXTO
  // ============================================================

  const partes = entrada
    ? entrada.split(/\s+/)
    : []

  let lang = partes[0]?.toLowerCase() || 'es'

  // Permitir códigos como EN, Es, PT...
  lang = lang.replace(/[^a-z]/g, '')

  let texto

  // ============================================================
  // 🌍 IDIOMA VÁLIDO
  // ============================================================

  if (idiomas[lang]) {
    texto = partes.slice(1).join(' ')

    // Si no hay texto escrito, usar mensaje citado
    if (!texto) {
      texto = citado
    }
  }

  // ============================================================
  // ❌ IDIOMA NO VÁLIDO
  // ============================================================

  else {

    // Si escribió algo pero el primer término
    // no es un idioma, lo tratamos como texto
    texto = entrada || citado

    lang = 'es'
  }

  texto = limpiarTexto(texto)

  // ============================================================
  // ⚠️ SIN TEXTO
  // ============================================================

  if (!texto) {
    return m.reply(
      `✏️ *No hay texto para traducir.*\n\n` +
      `Ejemplo:\n` +
      `*${usedPrefix + command} en Hola mundo*`
    )
  }

  // ============================================================
  // ⏳ REACCIÓN DE PROCESANDO
  // ============================================================

  try {
    await conn.sendMessage(m.chat, {
      react: {
        text: '⏳',
        key: m.key
      }
    })
  } catch {}

  // ============================================================
  // 🌐 TRADUCCIÓN
  // ============================================================

  try {

    const apiUrl =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx` +
      `&sl=auto` +
      `&tl=${encodeURIComponent(lang)}` +
      `&dt=t` +
      `&dt=rm` +
      `&q=${encodeURIComponent(texto)}`

    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 15000
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const data = await res.json()

    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new Error('Respuesta inválida de la API')
    }

    // ==========================================================
    // 📝 CONSTRUIR TRADUCCIÓN
    // ==========================================================

    const traduccion = data[0]
      .map(parte => parte?.[0] || '')
      .join('')
      .trim()

    if (!traduccion) {
      throw new Error('No se obtuvo traducción')
    }

    // Idioma detectado
    const idiomaDetectado =
      typeof data[2] === 'string'
        ? data[2].toLowerCase()
        : 'auto'

    const nombreDetectado =
      idiomas[idiomaDetectado] ||
      idiomaDetectado.toUpperCase()

    // ==========================================================
    // 📤 RESULTADO
    // ==========================================================

    const resultado = `
╭━━━〔 🌐 *TRADUCCIÓN* 〕━━━╮
┃
┃ 🔤 *Destino:*
┃ ${idiomas[lang]}
┃
┃ 🗣️ *Detectado:*
┃ ${nombreDetectado}
┃
┣━━━━━━━━━━━━━━━━━━
┃
┃ 📥 *Original*
┃
┃ ${textooSeguro(texto)}
┃
┣━━━━━━━━━━━━━━━━━━
┃
┃ 📤 *Traducción*
┃
┃ ${textoSeguro(traduccion)}
┃
╰━━━━━━━━━━━━━━━━━━╯
`.trim()

    // Reacción final
    try {
      await conn.sendMessage(m.chat, {
        react: {
          text: '✅',
          key: m.key
        }
      })
    } catch {}

    await m.reply(resultado)

  } catch (error) {

    console.error(
      '❌ Error en traductor:',
      error
    )

    try {
      await conn.sendMessage(m.chat, {
        react: {
          text: '❌',
          key: m.key
        }
      })
    } catch {}

    return m.reply(
      `❌ *No se pudo realizar la traducción.*\n\n` +
      `🔄 Intenta nuevamente en unos segundos.`
    )
  }
}

// ============================================================
// 🛡️ SEGURIDAD VISUAL DEL TEXTO
// ============================================================

function textoSeguro(texto) {
  return String(texto || '')
    .replace(/\n/g, '\n┃ ')
    .trim()
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  'traducir <idioma> <texto>',
  'translate <idioma> <texto>',
  'trad <idioma> <texto>'
]

handler.tags = [
  'utilidades'
]

handler.command = [
  'traducir',
  'translate',
  'trad'
]

handler.group = false
handler.limit = false

export default handler
