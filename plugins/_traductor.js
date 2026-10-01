// 📂 plugins/_traductor.js
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
  pl: 'Polaco 🇵🇱'
}

// ============================================================
// 🧹 NORMALIZAR TEXTO
// ============================================================

function limpiarTexto(texto) {
  return String(texto || '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ============================================================
// 🌐 HANDLER
// ============================================================

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {

    // 🌐 Reacción inicial
    try {
      await conn.sendMessage(m.chat, {
        react: {
          text: '🌐',
          key: m.key
        }
      })
    } catch {}

    // ========================================================
    // 📌 TEXTO CITADO
    // ========================================================

    const citado = m.quoted?.text
      ? limpiarTexto(m.quoted.text)
      : ''

    // ========================================================
    // 📖 AYUDA
    // ========================================================

    if (!text && !citado) {
      return m.reply(
`╭━━━〔 🌐 *TRADUCTOR UNIVERSAL* 〕━━━╮
┃
┃ 📌 *Uso:*
┃ • ${usedPrefix + command} <idioma> <texto>
┃ • Responder un mensaje con:
┃   ${usedPrefix + command} <idioma>
┃
┃ 📘 *Ejemplos:*
┃ • ${usedPrefix + command} en Hola amigo
┃ • ${usedPrefix + command} pt Buenos días
┃ • ${usedPrefix + command} pl ¿Cómo estás?
┃ • Responder mensaje → ${usedPrefix + command} en
┃
┃ 🌍 *Idiomas disponibles:*
${Object.entries(idiomas)
  .map(([codigo, nombre]) => `┃ • ${codigo} → ${nombre}`)
  .join('\n')}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
      )
    }

    // ========================================================
    // 🔎 PROCESAR COMANDO
    // ========================================================

    const entrada = limpiarTexto(text)

    const partes = entrada
      ? entrada.split(/\s+/)
      : []

    let lang = partes[0]?.toLowerCase() || 'es'

    let texto = partes
      .slice(1)
      .join(' ')
      .trim()

    // ========================================================
    // 🧠 SI NO ES UN IDIOMA VÁLIDO
    // ========================================================

    if (!idiomas[lang]) {
      lang = 'es'

      // Si escribió texto directamente, traducirlo al español
      texto = entrada || citado
    }

    // Si no hay texto en el comando, usar el citado
    if (!texto) {
      texto = citado
    }

    texto = limpiarTexto(texto)

    // ========================================================
    // ❌ SIN TEXTO
    // ========================================================

    if (!texto) {
      return m.reply(
`❌ *No hay texto para traducir.*

📌 Ejemplo:
${usedPrefix + command} en Hola, ¿cómo estás?

O responde un mensaje con:
${usedPrefix + command} en`
      )
    }

    // ========================================================
    // ⏳ REACCIÓN
    // ========================================================

    try {
      await conn.sendMessage(m.chat, {
        react: {
          text: '⏳',
          key: m.key
        }
      })
    } catch {}

    // ========================================================
    // 🌐 API GOOGLE TRANSLATE
    // ========================================================

    const apiUrl =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx` +
      `&sl=auto` +
      `&tl=${encodeURIComponent(lang)}` +
      `&dt=t` +
      `&q=${encodeURIComponent(texto)}`

    const res = await fetch(apiUrl)

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const data = await res.json()

    if (!data || !data[0]) {
      throw new Error('La API no devolvió una traducción válida.')
    }

    // ========================================================
    // 📝 OBTENER TRADUCCIÓN
    // ========================================================

    const traduccion = data[0]
      .map(parte => parte?.[0] || '')
      .join('')
      .trim()

    if (!traduccion) {
      throw new Error('No se pudo obtener la traducción.')
    }

    // Idioma detectado
    const idiomaDetectado =
      typeof data[2] === 'string'
        ? data[2].toUpperCase()
        : 'AUTO'

    // ========================================================
    // 📤 RESULTADO
    // ========================================================

    const resultado =
`╭━━━〔 🌐 *TRADUCCIÓN* 〕━━━╮
┃
┃ 🔤 *Destino:* ${idiomas[lang] || lang.toUpperCase()}
┃ 🗣️ *Detectado:* ${idiomaDetectado}
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

📥 *Original:*
${texto}

📤 *Traducción:*
${traduccion}`

    // ========================================================
    // ✅ REACCIÓN FINAL
    // ========================================================

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

    console.error('❌ Error en traductor:', error)

    try {
      await conn.sendMessage(m.chat, {
        react: {
          text: '⚠️',
          key: m.key
        }
      })
    } catch {}

    return m.reply(
`⚠️ *No se pudo realizar la traducción.*

🔄 Intentá nuevamente en unos segundos.`
    )
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.help = [
  'traducir <idioma> <texto>',
  'translate <idioma> <texto>',
  'trad <idioma> <texto>'
]

handler.tags = ['utilidades']

handler.command = /^(traducir|translate|trad)$/i

handler.group = false
handler.limit = false

export default handler
