// 📂 plugins/clima.js — WhatsApp-Bot 🌤️
// 🌦️ Sistema de clima PRO
// ============================================================

import fetch from 'node-fetch'

// ============================================================
// 🌎 TRADUCCIONES
// ============================================================

const traducciones = {
  'Sunny': 'Soleado',
  'Clear': 'Despejado',
  'Partly cloudy': 'Parcialmente nublado',
  'Cloudy': 'Nublado',
  'Overcast': 'Cubierto',
  'Mist': 'Neblina',
  'Fog': 'Niebla',
  'Freezing fog': 'Niebla helada',

  'Patchy rain possible': 'Posibles lluvias aisladas',
  'Patchy light rain': 'Lluvia ligera aislada',
  'Light rain': 'Lluvia ligera',
  'Moderate rain': 'Lluvia moderada',
  'Heavy rain': 'Lluvia fuerte',
  'Light rain shower': 'Chubasco ligero',
  'Moderate or heavy rain shower': 'Chubascos moderados o fuertes',
  'Torrential rain shower': 'Chubasco torrencial',

  'Patchy snow possible': 'Posibles nevadas aisladas',
  'Light snow': 'Nieve ligera',
  'Moderate snow': 'Nieve moderada',
  'Heavy snow': 'Nieve fuerte',
  'Patchy light snow': 'Nevadas ligeras aisladas',
  'Moderate or heavy snow': 'Nevadas moderadas o fuertes',

  'Thundery outbreaks possible': 'Posibles tormentas eléctricas',
  'Patchy sleet possible': 'Posible aguanieve',
  'Light sleet': 'Aguanieve ligera',
  'Moderate or heavy sleet': 'Aguanieve moderada o fuerte',

  'Blowing snow': 'Nieve arrastrada por el viento',
  'Blizzard': 'Ventisca',

  'Ice pellets': 'Granizo pequeño',
  'Light showers of ice pellets': 'Lluvia ligera de granizo',
  'Moderate or heavy showers of ice pellets': 'Lluvia fuerte de granizo',

  'Moderate or heavy rain': 'Lluvia moderada o fuerte',
  'Moderate or heavy freezing rain': 'Lluvia helada moderada o fuerte',

  'Light freezing rain': 'Lluvia helada ligera',
  'Heavy freezing rain': 'Lluvia helada fuerte',

  'Patchy freezing drizzle possible': 'Posible llovizna helada',
  'Freezing drizzle': 'Llovizna helada',

  'Thundery rain': 'Lluvia con tormenta',
  'Moderate or heavy rain with thunder': 'Lluvia fuerte con tormenta',
  'Patchy light rain with thunder': 'Lluvia ligera con tormenta',

  'Light showers': 'Chubascos ligeros',
  'Moderate or heavy showers': 'Chubascos moderados o fuertes',

  'Light drizzle': 'Llovizna ligera',
  'Moderate or heavy drizzle': 'Llovizna moderada o fuerte'
}


// ============================================================
// 🌈 EMOJI SEGÚN CLIMA
// ============================================================

function getWeatherEmoji(estado = '') {

  const e = estado.toLowerCase()

  if (
    e.includes('torment') ||
    e.includes('thunder')
  ) {
    return '⛈️'
  }

  if (
    e.includes('lluvia') ||
    e.includes('rain') ||
    e.includes('chubasco')
  ) {
    return '🌧️'
  }

  if (
    e.includes('nieve') ||
    e.includes('snow') ||
    e.includes('ventisca')
  ) {
    return '❄️'
  }

  if (
    e.includes('niebla') ||
    e.includes('neblina') ||
    e.includes('mist') ||
    e.includes('fog')
  ) {
    return '🌫️'
  }

  if (
    e.includes('nublado') ||
    e.includes('cubierto') ||
    e.includes('cloud')
  ) {
    return '☁️'
  }

  if (
    e.includes('despejado') ||
    e.includes('soleado') ||
    e.includes('clear') ||
    e.includes('sunny')
  ) {
    return '☀️'
  }

  return '🌤️'
}


// ============================================================
// 🧹 LIMPIAR TEXTO
// ============================================================

function limpiarCiudad(text = '') {

  return String(text)
    .trim()
    .replace(/\s+/g, ' ')
}


// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (
  m,
  {
    conn,
    text,
    usedPrefix,
    command
  }
) => {

  // ==========================================================
  // 📝 VALIDAR CIUDAD
  // ==========================================================

  const ciudad = limpiarCiudad(text)

  if (!ciudad) {

    return conn.reply(
      m.chat,
`🌦️ *CONSULTA DEL CLIMA*

📌 *Uso:*
${usedPrefix}${command} <ciudad>

🧭 *Ejemplos:*
• ${usedPrefix}${command} Mercedes
• ${usedPrefix}${command} Montevideo
• ${usedPrefix}${command} Buenos Aires
• ${usedPrefix}${command} Punta del Este`,
      m
    )
  }


  // ==========================================================
  // 🔄 REACCIÓN
  // ==========================================================

  try {

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: '🌤️',
          key: m.key
        }
      }
    )


    // ========================================================
    // 🌐 CONSULTA WTTR
    // ========================================================

    const url =
      `https://wttr.in/${encodeURIComponent(ciudad)}?format=j1`

    const response =
      await fetch(url, {
        headers: {
          'User-Agent': 'WhatsApp-Bot/1.0'
        }
      })


    // ========================================================
    // ❌ ERROR HTTP
    // ========================================================

    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      )
    }


    const data =
      await response.json()


    // ========================================================
    // 🔎 VALIDAR RESPUESTA
    // ========================================================

    if (
      !data ||
      !Array.isArray(data.current_condition) ||
      !data.current_condition[0]
    ) {

      throw new Error(
        'Respuesta del clima inválida'
      )
    }


    // ========================================================
    // 📍 UBICACIÓN
    // ========================================================

    const area =
      data.nearest_area?.[0] || {}

    const clima =
      data.current_condition[0]


    const lugar =
      area.areaName?.[0]?.value ||
      ciudad

    const region =
      area.region?.[0]?.value ||
      ''

    const pais =
      area.country?.[0]?.value ||
      ''

    const lat =
      area.latitude ||
      ''

    const lon =
      area.longitude ||
      ''


    // ========================================================
    // 🌡️ DATOS
    // ========================================================

    const temperatura =
      clima.temp_C ?? 'N/D'

    const sensacion =
      clima.FeelsLikeC ?? 'N/D'

    const humedad =
      clima.humidity ?? 'N/D'

    const viento =
      clima.windspeedKmph ?? 'N/D'

    const direccionViento =
      clima.winddir16Point ?? 'N/D'

    const presion =
      clima.pressure ?? 'N/D'

    const visibilidad =
      clima.visibility ?? 'N/D'

    const indiceUV =
      clima.uvIndex ?? 'N/D'

    const precipitacion =
      clima.precipMM ?? '0'

    const nubosidad =
      clima.cloudcover ?? 'N/D'


    // ========================================================
    // 🌤️ ESTADO
    // ========================================================

    const estadoOriginal =
      clima.weatherDesc?.[0]?.value ||
      'Sin información'

    const estado =
      traducciones[estadoOriginal] ||
      estadoOriginal

    const emoji =
      getWeatherEmoji(estado)


    // ========================================================
    // 🕒 HORA LOCAL
    // ========================================================

    const zonaHoraria =
      area.timezone?.[0]?.value ||
      'America/Montevideo'


    let horaLocal

    try {

      horaLocal =
        new Date().toLocaleString(
          'es-UY',
          {
            timeZone: zonaHoraria,
            hour12: false,
            dateStyle: 'short',
            timeStyle: 'medium'
          }
        )

    } catch {

      horaLocal =
        new Date().toLocaleString(
          'es-UY',
          {
            timeZone: 'America/Montevideo',
            hour12: false
          }
        )
    }


    // ========================================================
    // 📊 MENSAJE
    // ========================================================

    const ubicacion =
      [lugar, region, pais]
        .filter(Boolean)
        .join(', ')


    const info = `
╭━━━〔 ${emoji} *CLIMA ACTUAL* 〕━━━⬣
┃ 📍 *Ubicación:* ${ubicacion}
┃ 🕒 *Hora local:* ${horaLocal}
╰━━━━━━━━━━━━━━━━━━⬣

🌡️ *Temperatura:* ${temperatura}°C
🥵 *Sensación:* ${sensacion}°C
${emoji} *Condición:* ${estado}

💧 *Humedad:* ${humedad}%
💨 *Viento:* ${viento} km/h
🧭 *Dirección:* ${direccionViento}
🌧️ *Precipitación:* ${precipitacion} mm
☁️ *Nubosidad:* ${nubosidad}%
👁️ *Visibilidad:* ${visibilidad} km
🔆 *Índice UV:* ${indiceUV}
📊 *Presión:* ${presion} hPa

${lat && lon
  ? `🌐 *Coordenadas:* ${lat}, ${lon}`
  : ''}

━━━━━━━━━━━━━━━━━━━━
🤖 *WhatsApp-Bot* 🌤️
`.trim()


    // ========================================================
    // 🖼️ ICONO DEL CLIMA
    // ========================================================

    const icono =
      clima.weatherIconUrl?.[0]?.value ||
      null


    if (icono) {

      try {

        await conn.sendMessage(
          m.chat,
          {
            image: {
              url: icono
            },
            caption: info
          },
          {
            quoted: m
          }
        )

      } catch {

        await conn.reply(
          m.chat,
          info,
          m
        )
      }

    } else {

      await conn.reply(
        m.chat,
        info,
        m
      )
    }


    // ========================================================
    // ✅ FINALIZAR
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: '✅',
          key: m.key
        }
      }
    )

  } catch (error) {

    console.error(
      '❌ Error en .clima:',
      error
    )


    // ========================================================
    // ⚠️ REACCIÓN DE ERROR
    // ========================================================

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


    // ========================================================
    // ❌ MENSAJE DE ERROR
    // ========================================================

    return conn.reply(
      m.chat,
`⚠️ *NO SE PUDO OBTENER EL CLIMA*

📍 Ciudad consultada:
*${ciudad}*

Posibles causas:
• El nombre de la ciudad no es correcto.
• El servicio meteorológico no respondió.
• Hay un problema temporal de conexión.

💡 Probá nuevamente con:
${usedPrefix}${command} Mercedes`,
      m
    )
  }
}


// ============================================================
// 📚 AYUDA
// ============================================================

handler.help = [
  'clima <ciudad>',
  'tiempo <ciudad>'
]


// ============================================================
// 🏷️ CATEGORÍA
// ============================================================

handler.tags = [
  'información'
]


// ============================================================
// ⚙️ COMANDOS
// ============================================================

handler.command = [
  'clima',
  'tiempo'
]


// ============================================================
// 📤 EXPORT
// ============================================================

export default handler
