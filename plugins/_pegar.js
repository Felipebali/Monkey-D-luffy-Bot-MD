// 📂 plugins/acciones.js
// 🤖 WHATSAPP BOT — SISTEMA DE ACCIONES
// ============================================================
// .pegar @usuario
// .cachetear @usuario
// .nalgear @usuario
// .empujar @usuario
//
// ✅ Diseño estilo WhatsApp-Bot
// ✅ Frases aleatorias
// ✅ Menciones reales compatibles con Baileys
// ✅ Integración con parejas.json
// ✅ Mensajes especiales sin objetivo
// ✅ Prevención de menciones duplicadas
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const DATABASE_DIR = './database'
const PAREJAS_FILE = path.join(DATABASE_DIR, 'parejas.json')

// ============================================================
// 💞 CARGAR PAREJAS
// ============================================================

function cargarParejas() {
  try {
    if (!fs.existsSync(PAREJAS_FILE))
      return {}

    const data = JSON.parse(
      fs.readFileSync(PAREJAS_FILE, 'utf8')
    )

    return data &&
      typeof data === 'object' &&
      !Array.isArray(data)
      ? data
      : {}

  } catch (error) {
    console.error('[ACCIONES] Error leyendo parejas:', error)
    return {}
  }
}

// ============================================================
// 🔢 NORMALIZAR JID
// ============================================================

function normalizarJid(conn, jid) {
  if (!jid || typeof jid !== 'string')
    return null

  try {
    return (
      typeof conn.decodeJid === 'function'
        ? conn.decodeJid(jid)
        : jid
    ) || jid
  } catch {
    return jid
  }
}

// ============================================================
// 👥 AGREGAR MENCIÓN SIN DUPLICAR
// ============================================================

function agregarMencion(lista, jid) {
  if (jid && !lista.includes(jid))
    lista.push(jid)
}

// ============================================================
// 🎲 ELEGIR FRASE ALEATORIA
// ============================================================

function fraseAleatoria(lista) {
  return lista[Math.floor(Math.random() * lista.length)]
}

// ============================================================
// 🎭 FRASES DE LAS ACCIONES
// ============================================================

const acciones = {

  pegar: [
    '👊 @USER le declaró la guerra a @TARGET. 💥',
    '🥊 @USER retó a @TARGET a un combate imaginario.',
    '💢 @USER sorprendió a @TARGET en una batalla de película.',
    '😂 @USER y @TARGET terminaron en una pelea de almohadas.',
    '🎮 @USER derrotó a @TARGET en una pelea virtual.',
    '🤣 @USER lanzó un golpe de película y @TARGET quedó sorprendido.',
    '💥 @USER protagonizó una escena de acción con @TARGET.',
    '🥋 @USER desafió a @TARGET a un duelo de artes marciales.',
    '🎬 @USER y @TARGET grabaron la pelea más dramática del grupo.',
    '😂 @USER ganó la pelea imaginaria contra @TARGET.'
  ],

  cachetear: [
    '🖐️ @USER le dio un cachetazo de broma a @TARGET. 😂',
    '🎭 @USER y @TARGET protagonizaron una escena de novela.',
    '😳 @USER sorprendió a @TARGET con una actuación dramática.',
    '🎬 @USER pidió repetir la escena con @TARGET.',
    '🤣 @USER hizo una broma teatral y @TARGET quedó sin palabras.',
    '🎭 @USER convirtió el chat en una telenovela con @TARGET.',
    '😂 @USER y @TARGET se llevaron el premio a la escena más dramática.',
    '🖐️ @USER hizo una actuación de película junto a @TARGET.'
  ],

  nalgear: [
    '😂 @USER le hizo una broma inesperada a @TARGET.',
    '🏃💨 @USER hizo una travesura y salió corriendo de @TARGET.',
    '🤣 @USER sorprendió a @TARGET con una broma de película.',
    '😈 @USER preparó una travesura para @TARGET.',
    '🎭 @USER y @TARGET protagonizaron una escena cómica.',
    '😂 @TARGET no esperaba semejante ocurrencia de @USER.',
    '🤣 @USER hizo una broma y terminó riéndose con @TARGET.',
    '🏃 @USER escapó antes de que @TARGET pudiera responder.'
  ],

  empujar: [
    '👉 @USER empujó suavemente a @TARGET en una escena de comedia.',
    '💨 @USER hizo que @TARGET diera un paso hacia atrás.',
    '😂 @USER sorprendió a @TARGET con un empujoncito de broma.',
    '🌀 @USER y @TARGET compitieron por mantener el equilibrio.',
    '🎬 @USER protagonizó una escena de acción con @TARGET.',
    '🤣 @USER intentó mover a @TARGET, pero no pudo.',
    '💨 @TARGET esquivó la broma de @USER.',
    '😂 @USER y @TARGET terminaron riéndose de la escena.'
  ]
}

// ============================================================
// 🌬️ MENSAJES SIN OBJETIVO
// ============================================================

const sinObjetivo = {

  pegar: [
    '👊 @USER lanzó un golpe al aire. 😂',
    '🥊 @USER entrenó contra un enemigo invisible.',
    '💥 @USER perdió una pelea imaginaria.',
    '🤣 @USER desafió al aire y el aire ganó.'
  ],

  cachetear: [
    '🖐️ @USER quiso cachetear al aire. 😭',
    '🎭 @USER actuó una escena dramática en solitario.',
    '😂 @USER buscó compañía para su telenovela.',
    '🎬 @USER ensayó una escena sin público.'
  ],

  nalgear: [
    '😂 @USER preparó una broma, pero no había nadie.',
    '🤣 @USER se quedó sin compañero para la travesura.',
    '😈 @USER buscó a alguien para hacerle una broma.',
    '🎭 @USER terminó haciendo su actuación en solitario.'
  ],

  empujar: [
    '👉 @USER empujó el aire. 💨',
    '😂 @USER intentó mover una pared invisible.',
    '🌀 @USER hizo un movimiento y no movió a nadie.',
    '🤣 @USER perdió contra una fuerza invisible.'
  ]
}

// ============================================================
// 😅 MENSAJES PARA UNO MISMO
// ============================================================

const aSiMismo = {

  pegar: [
    '👊 @USER perdió un combate contra sí mismo. 😂',
    '🥊 @USER se retó a un duelo y terminó empatando.',
    '🤣 @USER descubrió que su propio rival era él mismo.'
  ],

  cachetear: [
    '🖐️ @USER protagonizó una escena dramática en solitario.',
    '🎭 @USER se convirtió en protagonista de su propia novela.',
    '😂 @USER ensayó una escena frente al espejo.'
  ],

  nalgear: [
    '🤣 @USER preparó una travesura y terminó riéndose solo.',
    '😂 @USER se quedó sin compañero para la broma.',
    '🎭 @USER hizo una escena cómica consigo mismo.'
  ],

  empujar: [
    '👉 @USER intentó empujarse, pero no se movió. 😂',
    '🌀 @USER desafió su propio equilibrio.',
    '🤣 @USER perdió una competencia contra sí mismo.'
  ]
}

// ============================================================
// 🖼️ FORMATO WHATSAPP-BOT
// ============================================================

function crearMensaje({
  titulo,
  usuario,
  objetivo,
  frase,
  solo = false
}) {

  if (solo) {
    return (
`╭━━〔 ${titulo} 〕━━⬣
┃
┃ 👤 *Usuario:* ${usuario}
┃
┃ ${frase}
┃
╰━━━━━━━━━━━━━━━━━━⬣
🤖 *WhatsApp Bot*`
    )
  }

  return (
`╭━━〔 ${titulo} 〕━━⬣
┃
┃ 👤 *Usuario:* ${usuario}
┃ 🎯 *Objetivo:* ${objetivo}
┃
┃ ${frase}
┃
╰━━━━━━━━━━━━━━━━━━⬣
🤖 *WhatsApp Bot*`
  )
}

// ============================================================
// 🚀 HANDLER PRINCIPAL
// ============================================================

const handler = async (m, { conn, command }) => {

  try {

    // --------------------------------------------------------
    // 👥 VALIDAR GRUPO
    // --------------------------------------------------------

    if (!m.isGroup) {
      return conn.reply(
        m.chat,
        '❌ Este comando solamente funciona en grupos.',
        m
      )
    }

    // --------------------------------------------------------
    // 👤 OBTENER REMITENTE
    // --------------------------------------------------------

    const who = normalizarJid(conn, m.sender)

    if (!who) {
      return conn.reply(
        m.chat,
        '❌ No pude identificar al usuario.',
        m
      )
    }

    const senderName = `@${who.split('@')[0]}`

    // --------------------------------------------------------
    // 🎯 OBTENER OBJETIVO
    // --------------------------------------------------------

    const quotedJid = m.quoted
      ? normalizarJid(conn, m.quoted.sender)
      : null

    const mentionedJid =
      Array.isArray(m.mentionedJid) &&
      m.mentionedJid.length
        ? normalizarJid(conn, m.mentionedJid[0])
        : null

    const targetJid = quotedJid || mentionedJid

    const targetName = targetJid
      ? `@${targetJid.split('@')[0]}`
      : null

    // --------------------------------------------------------
    // 🎭 IDENTIFICAR ACCIÓN
    // --------------------------------------------------------

    const cmd = String(command || '')
      .toLowerCase()
      .replace(/^\./, '')

    const titulos = {
      pegar: '👊 𝐏𝐄𝐆𝐀𝐑',
      cachetear: '🖐️ 𝐂𝐀𝐂𝐇𝐄𝐓𝐄𝐀𝐑',
      nalgear: '😂 𝐁𝐑𝐎𝐌𝐀',
      empujar: '👉 𝐄𝐌𝐏𝐔𝐉𝐀𝐑'
    }

    if (!acciones[cmd])
      return

    // --------------------------------------------------------
    // 🌬️ SIN OBJETIVO
    // --------------------------------------------------------

    if (!targetJid) {

      const frase = fraseAleatoria(
        sinObjetivo[cmd]
      ).replace(/@USER/g, senderName)

      const mensaje = crearMensaje({
        titulo: titulos[cmd],
        usuario: senderName,
        frase,
        solo: true
      })

      return conn.sendMessage(
        m.chat,
        {
          text: mensaje,
          mentions: [who]
        },
        { quoted: m }
      )
    }

    // --------------------------------------------------------
    // 😅 OBJETIVO: UNO MISMO
    // --------------------------------------------------------

    if (targetJid === who) {

      const frase = fraseAleatoria(
        aSiMismo[cmd]
      ).replace(/@USER/g, senderName)

      const mensaje = crearMensaje({
        titulo: titulos[cmd],
        usuario: senderName,
        frase,
        solo: true
      })

      return conn.sendMessage(
        m.chat,
        {
          text: mensaje,
          mentions: [who]
        },
        { quoted: m }
      )
    }

    // --------------------------------------------------------
    // 🎲 SELECCIONAR FRASE
    // --------------------------------------------------------

    const frase = fraseAleatoria(
      acciones[cmd]
    )
      .replace(/@USER/g, senderName)
      .replace(/@TARGET/g, targetName)

    // --------------------------------------------------------
    // 💞 CARGAR PAREJAS
    // --------------------------------------------------------

    const parejas = cargarParejas()

    const senderData = parejas[who] || {}
    const targetData = parejas[targetJid] || {}

    const senderPareja = normalizarJid(
      conn,
      senderData.pareja
    )

    const targetPareja = normalizarJid(
      conn,
      targetData.pareja
    )

    // --------------------------------------------------------
    // 👥 PREPARAR MENCIONES
    // --------------------------------------------------------

    const mentions = []

    agregarMencion(mentions, who)
    agregarMencion(mentions, targetJid)
    agregarMencion(mentions, senderPareja)
    agregarMencion(mentions, targetPareja)

    // --------------------------------------------------------
    // 📨 CREAR MENSAJE
    // --------------------------------------------------------

    const mensaje = crearMensaje({
      titulo: titulos[cmd],
      usuario: senderName,
      objetivo: targetName,
      frase
    })

    // --------------------------------------------------------
    // 📤 ENVIAR
    // --------------------------------------------------------

    return await conn.sendMessage(
      m.chat,
      {
        text: mensaje,
        mentions
      },
      { quoted: m }
    )

  } catch (error) {

    console.error(
      '[ACCIONES] Error ejecutando comando:',
      error
    )

    return conn.reply(
      m.chat,
      '❌ Ocurrió un error al ejecutar la acción. Intentá nuevamente.',
      m
    )
  }
}

// ============================================================
// ⚙️ COMANDOS
// ============================================================

handler.command = [
  'pegar',
  'cachetear',
  'nalgear',
  'empujar'
]

handler.help = [
  'pegar @usuario',
  'cachetear @usuario',
  'nalgear @usuario',
  'empujar @usuario'
]

handler.tags = ['fun']

handler.group = true

export default handler
