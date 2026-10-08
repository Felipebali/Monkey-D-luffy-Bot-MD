// 📂 plugins/aura_pro.js — WhatsApp-Bot 🔮
// ============================================================
// 🔮 SISTEMA DE AURA — WHATSAPP BOT
//
// .aura
// .aura @usuario
// .aurapro
// .testaura
// .energia
// .energy
//
// 🎲 Aura aleatoria
// 📊 Estadísticas
// 🏆 Rangos
// 👑 Auras especiales para Owners
// 🎮 Requiere mini-juegos activados
// 💾 Guarda resultados en database/aura.json
// ============================================================

import fs from 'fs'

const FILE = './database/aura.json'


// ============================================================
// 🧰 UTILIDADES
// ============================================================

function loadJson(file) {
  try {

    if (!fs.existsSync(file))
      return {}

    const data =
      fs.readFileSync(file, 'utf8')

    if (!data.trim())
      return {}

    return JSON.parse(data)

  } catch (e) {

    console.error(
      '⚠️ Error leyendo aura.json:',
      e
    )

    return {}
  }
}


function saveJson(file, data) {
  try {

    const dir =
      file.substring(
        0,
        file.lastIndexOf('/')
      )

    if (
      dir &&
      !fs.existsSync(dir)
    ) {
      fs.mkdirSync(
        dir,
        { recursive: true }
      )
    }

    fs.writeFileSync(
      file,
      JSON.stringify(
        data,
        null,
        2
      )
    )

  } catch (e) {

    console.error(
      '⚠️ Error guardando aura.json:',
      e
    )
  }
}


// ============================================================
// 📱 NORMALIZAR NÚMERO
// ============================================================

function normalizarNumero(jid = '') {

  return String(jid)
    .split('@')[0]
    .replace(/[^0-9]/g, '')
}


// ============================================================
// 👑 OWNERS
// ============================================================

function getOwners() {

  return (global.owner || [])
    .map(owner => {

      if (Array.isArray(owner))
        owner = owner[0]

      if (
        typeof owner !== 'string'
      )
        return null

      return normalizarNumero(owner)

    })
    .filter(Boolean)
}


function isOwner(jid) {

  const numero =
    normalizarNumero(jid)

  return getOwners()
    .includes(numero)
}


// ============================================================
// 🎯 USUARIO OBJETIVO
// ============================================================

function obtenerUsuario(m) {

  return (
    m.mentionedJid?.[0] ||
    m.quoted?.sender ||
    m.sender
  )
}


// ============================================================
// 🎨 AURAS NORMALES
// ============================================================

const aurasNormales = [

  {
    nombre: 'Aura de Fuego',
    emoji: '🔥',
    color: 'Rojo Carmesí',
    descripcion:
      'Una energía intensa, impulsiva y difícil de detener.'
  },

  {
    nombre: 'Aura de Hielo',
    emoji: '❄️',
    color: 'Azul Glacial',
    descripcion:
      'Una presencia fría, calculadora y misteriosamente tranquila.'
  },

  {
    nombre: 'Aura Eléctrica',
    emoji: '⚡',
    color: 'Amarillo Neón',
    descripcion:
      'Energía rápida, impredecible y llena de intensidad.'
  },

  {
    nombre: 'Aura Cósmica',
    emoji: '🌌',
    color: 'Violeta Cósmico',
    descripcion:
      'Una energía extraña que parece venir de otro universo.'
  },

  {
    nombre: 'Aura Lunar',
    emoji: '🌙',
    color: 'Plata Lunar',
    descripcion:
      'Una presencia tranquila, misteriosa y difícil de descifrar.'
  },

  {
    nombre: 'Aura Solar',
    emoji: '☀️',
    color: 'Dorado Solar',
    descripcion:
      'Una energía brillante que destaca incluso entre los demás.'
  },

  {
    nombre: 'Aura Sombría',
    emoji: '🌑',
    color: 'Negro Abismal',
    descripcion:
      'Una energía silenciosa, profunda y bastante intimidante.'
  },

  {
    nombre: 'Aura Espiritual',
    emoji: '🔮',
    color: 'Violeta Místico',
    descripcion:
      'Una energía misteriosa relacionada con la intuición y la percepción.'
  },

  {
    nombre: 'Aura Acuática',
    emoji: '🌊',
    color: 'Azul Oceánico',
    descripcion:
      'Una energía adaptable que puede cambiar según la situación.'
  },

  {
    nombre: 'Aura Natural',
    emoji: '🌿',
    color: 'Verde Esmeralda',
    descripcion:
      'Una energía equilibrada, estable y conectada con la naturaleza.'
  }

]


// ============================================================
// 👑 AURAS ESPECIALES DE OWNER
// ============================================================

const aurasEspeciales = [

  {
    nombre: 'Aura Imperial',
    emoji: '👑',
    color: 'Dorado Imperial',
    descripcion:
      'Una energía dominante que parece estar por encima de las demás.'
  },

  {
    nombre: 'Aura Divina',
    emoji: '✨',
    color: 'Blanco Celestial',
    descripcion:
      'Una energía extremadamente rara, brillante y poderosa.'
  },

  {
    nombre: 'Aura Absoluta',
    emoji: '💠',
    color: 'Cristal Supremo',
    descripcion:
      'Una energía fuera de los parámetros normales.'
  },

  {
    nombre: 'Aura del Vacío',
    emoji: '🕳️',
    color: 'Negro Absoluto',
    descripcion:
      'Una energía inexplicable que parece absorber todo a su alrededor.'
  }

]


// ============================================================
// 📊 ESTADÍSTICAS
// ============================================================

const atributos = [
  'Poder',
  'Energía',
  'Velocidad',
  'Control',
  'Presencia'
]


// ============================================================
// 🏆 CLASIFICACIÓN
// ============================================================

function clasificar(promedio) {

  if (promedio >= 95)
    return {
      nombre: 'ABSOLUTA',
      emoji: '👑'
    }

  if (promedio >= 90)
    return {
      nombre: 'SUPREMA',
      emoji: '💠'
    }

  if (promedio >= 80)
    return {
      nombre: 'LEGENDARIA',
      emoji: '✨'
    }

  if (promedio >= 70)
    return {
      nombre: 'ÉPICA',
      emoji: '⚡'
    }

  if (promedio >= 60)
    return {
      nombre: 'RARA',
      emoji: '🔥'
    }

  if (promedio >= 45)
    return {
      nombre: 'INUSUAL',
      emoji: '🌟'
    }

  return {
    nombre: 'COMÚN',
    emoji: '🔹'
  }
}


// ============================================================
// 💬 FRASES
// ============================================================

const frases = [

  '🔥 Tu energía no pasa desapercibida.',

  '⚡ Hay algo diferente en tu aura.',

  '🌌 Tu energía parece venir de otro lugar.',

  '👀 Definitivamente hay algo interesante en vos.',

  '✨ Tu presencia tiene una energía especial.',

  '🌙 Misterioso, tranquilo y difícil de leer.',

  '💠 Tu aura está por encima de lo normal.',

  '🔥 Mucha energía acumulada. Cuidado.',

  '⚡ Tu aura está bastante cargada hoy.',

  '🔮 Hay más en vos de lo que parece.',

  '🌟 Tu presencia destaca entre los demás.',

  '💫 El análisis detectó una energía poco común.'

]


// ============================================================
// 📊 CREAR BARRA
// ============================================================

function crearBarra(valor) {

  const total = 10

  const llenos =
    Math.round(valor / 10)

  return (
    '🟩'.repeat(llenos) +
    '⬜'.repeat(
      total - llenos
    )
  )
}


// ============================================================
// 🎮 HANDLER
// ============================================================

let handler = async (
  m,
  { conn }
) => {

  try {

    // ========================================================
    // 🎮 COMPROBAR MINI-JUEGOS
    // ========================================================

    const chatData =
      global.db?.data?.chats?.[m.chat] || {}

    if (!chatData.games) {

      return conn.sendMessage(
        m.chat,
        {
          text:
`╭━━━〔 🎮 *MINI-JUEGOS* 〕━━━╮
┃
┃ 🚫 *Los mini-juegos están*
┃ *desactivados en este grupo.*
┃
┃ 🔓 Activálos con:
┃ *.juegos*
┃
╰━━━━━━━━━━━━━━━━━━━━╯`
        },
        {
          quoted: m
        }
      )
    }


    // ========================================================
    // 👥 SOLO GRUPOS
    // ========================================================

    if (!m.isGroup) {

      return m.reply(
`╭━━━〔 🔮 *AURA* 〕━━━╮
┃
┃ ❌ Este comando solo
┃ funciona en grupos.
┃
╰━━━━━━━━━━━━━━━━━━╯`
      )
    }


    // ========================================================
    // 🎯 USUARIO
    // ========================================================

    const who =
      obtenerUsuario(m)

    const simpleId =
      normalizarNumero(who)


    // ========================================================
    // ⏳ REACCIÓN INICIAL
    // ========================================================

    try {
      await m.react('🔮')
    } catch {}


    // ========================================================
    // 👑 COMPROBAR OWNER
    // ========================================================

    const owner =
      isOwner(who)


    // ========================================================
    // 🎨 LISTA DE AURAS
    // ========================================================

    const listaAuras =
      owner
        ? [
            ...aurasNormales,
            ...aurasEspeciales
          ]
        : aurasNormales


    // ========================================================
    // 🎲 ELEGIR AURA
    // ========================================================

    const aura =
      listaAuras[
        Math.floor(
          Math.random() *
          listaAuras.length
        )
      ]


    // ========================================================
    // 📊 GENERAR ESTADÍSTICAS
    // ========================================================

    const resultado = {}

    atributos.forEach(
      atributo => {

        resultado[atributo] =
          Math.floor(
            Math.random() * 101
          )

      }
    )


    // ========================================================
    // 📈 CALCULAR PROMEDIO
    // ========================================================

    const promedio =
      Math.floor(
        atributos.reduce(
          (total, atributo) =>
            total +
            resultado[atributo],
          0
        ) /
        atributos.length
      )


    // ========================================================
    // 🏆 CLASIFICACIÓN
    // ========================================================

    const rango =
      clasificar(
        promedio
      )


    // ========================================================
    // 💬 FRASE
    // ========================================================

    const frase =
      frases[
        Math.floor(
          Math.random() *
          frases.length
        )
      ]


    // ========================================================
    // 💾 BASE DE DATOS
    // ========================================================

    const db =
      loadJson(FILE)


    if (!db[who]) {

      db[who] = {
        resultados: []
      }

    }


    const registro = {

      aura:
        aura.nombre,

      emoji:
        aura.emoji,

      color:
        aura.color,

      atributos:
        resultado,

      promedio,

      rango:
        rango.nombre,

      fecha:
        new Date().toISOString()

    }


    db[who].ultimoResultado =
      registro


    db[who].resultados.push(
      registro
    )


    // Mantener últimos 10
    if (
      db[who].resultados.length >
      10
    ) {

      db[who].resultados =
        db[who].resultados
          .slice(-10)

    }


    saveJson(
      FILE,
      db
    )


    // ========================================================
    // 🧾 MENSAJE
    // ========================================================

    let mensaje =
`╭━━━〔 🔮 *AURA* 〕━━━╮
┃
┃ 👤 *Usuario:* @${simpleId}
┃
┃ ${aura.emoji} *Aura:* ${aura.nombre}
┃ 🎨 *Color:* ${aura.color}
┃
┃ ${rango.emoji} *Rango:* ${rango.nombre}
┃ 📊 *Promedio:* ${promedio}%
┃
┃ 💫 *Descripción*
┃ ${aura.descripcion}
┃
┃ ⚡ *ESTADÍSTICAS*
┃
`


    // ========================================================
    // 📊 ESTADÍSTICAS
    // ========================================================

    atributos.forEach(
      atributo => {

        const valor =
          resultado[atributo]

        const icono =
          valor >= 80
            ? '🔥'
            : valor >= 50
              ? '⚡'
              : '🔹'

        mensaje +=
`┃ ${icono} *${atributo}:* ${valor}%
┃ ${crearBarra(valor)}
┃
`

      }
    )


    // ========================================================
    // 💬 RESULTADO
    // ========================================================

    mensaje +=
`┃ 💬 *Resultado*
┃ ${frase}
┃
╰━━━━━━━━━━━━━━━━━━━━╯`


    // ========================================================
    // 📤 ENVIAR
    // ========================================================

    await conn.sendMessage(
      m.chat,
      {
        text: mensaje,
        mentions: [who]
      },
      {
        quoted: m
      }
    )


    // ========================================================
    // ✅ REACCIÓN FINAL
    // ========================================================

    try {

      await m.react(
        promedio >= 80
          ? '🔥'
          : promedio >= 60
            ? '⚡'
            : '✨'
      )

    } catch {}

  } catch (e) {

    console.error(
      '❌ Error en AURA:',
      e
    )

    try {
      await m.react('❌')
    } catch {}

    return conn.reply(
      m.chat,
`╭━━━〔 ❌ *ERROR* 〕━━━╮
┃
┃ No se pudo generar
┃ el análisis de aura.
┃
┃ 🔄 Intentá nuevamente.
┃
╰━━━━━━━━━━━━━━━━━━╯`,
      m
    )
  }
}


// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.command = [
  'aura',
  'aurapro',
  'testaura',
  'energia',
  'energy'
]

handler.tags = [
  'fun',
  'juego'
]

handler.help = [
  'aura',
  'aura @usuario'
]

handler.group = true


// ============================================================
// 📤 EXPORTAR
// ============================================================

export default handler
