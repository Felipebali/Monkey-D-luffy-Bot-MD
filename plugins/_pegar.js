// 📂 plugins/acciones.js
// 🎭 Acciones divertidas: pegar, cachetear, nalgear y empujar

import fs from 'fs'
import path from 'path'

const parejasFile = path.join('./database', 'parejas.json')

// ============================================================
// 💞 CARGAR PAREJAS
// ============================================================

function cargarParejas() {
  try {
    if (!fs.existsSync(parejasFile)) return {}

    return JSON.parse(
      fs.readFileSync(parejasFile, 'utf8')
    )
  } catch {
    return {}
  }
}

// ============================================================
// 🎲 FRASES
// ============================================================

const acciones = {

  pegar: [
    `👊 @USER le pegó a @TARGET. 💥`,
    `💥 @USER le dio un buen golpe a @TARGET. 😂`,
    `😤 @USER perdió la paciencia y le pegó a @TARGET.`,
    `👊 @USER atacó por sorpresa a @TARGET. 😳`,
    `🥊 @USER le acomodó un golpe a @TARGET. 💥`,
    `😂 @USER no dejó pasar una y le pegó a @TARGET.`
  ],

  cachetear: [
    `🖐️ @USER le dio un cachetazo a @TARGET. 😳`,
    `💥 @USER le acomodó una cachetada a @TARGET.`,
    `😂 @USER le dio un cachetazo inesperado a @TARGET.`,
    `🖐️ @USER dijo "hasta acá" y cacheteó a @TARGET.`,
    `😤 @USER le soltó una cachetada a @TARGET.`
  ],

  nalgear: [
    `🍑 @USER le dio un golpecito de broma a @TARGET. 😂`,
    `😂 @USER sorprendió a @TARGET con una palmada de broma.`,
    `🍑 @USER le hizo una broma a @TARGET y salió corriendo. 🏃💨`,
    `🤣 @USER agarró desprevenido a @TARGET con una palmada.`,
    `😈 @USER decidió molestar a @TARGET con una palmada de broma.`,
    `😂 @TARGET no esperaba esa broma de @USER.`
  ],

  empujar: [
    `👉 @USER empujó a @TARGET. 😂`,
    `💨 @USER mandó a @TARGET unos pasos para atrás.`,
    `😈 @USER empujó a @TARGET por hacerse el vivo.`,
    `😂 @USER le dio un empujoncito a @TARGET.`,
    `💥 @USER sorprendió a @TARGET con un empujón.`
  ]
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (m, { conn, command }) => {

  const who = conn.decodeJid(m.sender)

  // ==========================================================
  // 🎯 OBTENER OBJETIVO
  // ==========================================================

  const targetJid =
    m.quoted
      ? conn.decodeJid(m.quoted.sender)
      : (
          m.mentionedJid?.length
            ? conn.decodeJid(m.mentionedJid[0])
            : null
        )

  const senderName = '@' + who.split('@')[0]

  const targetName = targetJid
    ? '@' + targetJid.split('@')[0]
    : null

  // ==========================================================
  // 👤 SIN OBJETIVO
  // ==========================================================

  if (!targetJid) {

    const mensajes = {
      pegar: `👊 ${senderName} lanzó un golpe al aire. 😂`,
      cachetear: `🖐️ ${senderName} quiso cachetear al aire. 😭`,
      nalgear: `🍑 ${senderName} intentó hacerle una broma al aire. 😂`,
      empujar: `👉 ${senderName} empujó el aire. 💨`
    }

    return conn.sendMessage(
      m.chat,
      {
        text: mensajes[command],
        mentions: [who]
      },
      { quoted: m }
    )
  }

  // ==========================================================
  // 😂 HACERSE LA ACCIÓN A SÍ MISMO
  // ==========================================================

  if (targetJid === who) {

    const mensajes = {
      pegar: `👊 ${senderName} se pegó a sí mismo. 💀😂`,
      cachetear: `🖐️ ${senderName} se cacheteó solo. 😭`,
      nalgear: `🍑 ${senderName} intentó hacerse una broma a sí mismo. 😂`,
      empujar: `👉 ${senderName} intentó empujarse a sí mismo. 😂`
    }

    return conn.sendMessage(
      m.chat,
      {
        text: mensajes[command],
        mentions: [who]
      },
      { quoted: m }
    )
  }

  // ==========================================================
  // 💞 CARGAR PAREJAS
  // ==========================================================

  const parejas = cargarParejas()

  const senderData = parejas[who] || {}
  const targetData = parejas[targetJid] || {}

  const senderPareja = senderData.pareja || null
  const targetPareja = targetData.pareja || null

  // ==========================================================
  // 🎭 FRASE ALEATORIA
  // ==========================================================

  const lista = acciones[command] || acciones.pegar

  let mensaje =
    lista[Math.floor(Math.random() * lista.length)]

  mensaje = mensaje
    .replace(/@USER/g, senderName)
    .replace(/@TARGET/g, targetName)

  // ==========================================================
  // 👥 MENCIONES
  // ==========================================================

  const mentions = [
    who,
    targetJid
  ]

  if (
    senderPareja &&
    !mentions.includes(senderPareja)
  ) {
    mentions.push(conn.decodeJid(senderPareja))
  }

  if (
    targetPareja &&
    !mentions.includes(targetPareja)
  ) {
    mentions.push(conn.decodeJid(targetPareja))
  }

  // ==========================================================
  // 📤 ENVIAR
  // ==========================================================

  await conn.sendMessage(
    m.chat,
    {
      text: mensaje,
      mentions
    },
    { quoted: m }
  )
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

handler.tags = [
  'fun'
]

handler.group = true

export default handler
