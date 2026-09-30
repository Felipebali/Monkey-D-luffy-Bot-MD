// 📂 plugins/pegar.js
// 💋 Sistema de "pegar"
// Permite pegar aunque la persona tenga pareja en parejas.json

import fs from 'fs'
import path from 'path'

const parejasFile = path.join('./database', 'parejas.json')

// ============================================================
// 💞 CARGAR PAREJAS
// ============================================================

function cargarParejas() {
  try {

    if (!fs.existsSync(parejasFile))
      return {}

    return JSON.parse(
      fs.readFileSync(
        parejasFile,
        'utf8'
      )
    )

  } catch {
    return {}
  }
}

// ============================================================
// 🚀 HANDLER
// ============================================================

let handler = async (m, { conn }) => {

  const who =
    conn.decodeJid(m.sender)

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

  const senderName =
    '@' + who.split('@')[0]

  const targetName =
    targetJid
      ? '@' + targetJid.split('@')[0]
      : null

  // ==========================================================
  // 👤 SIN MENCIONAR A NADIE
  // ==========================================================

  if (!targetJid) {

    return conn.sendMessage(
      m.chat,
      {
        text:
          `👊 ${senderName} pegó al aire. 😂`,
        mentions: [who]
      },
      {
        quoted: m
      }
    )
  }

  // ==========================================================
  // 😂 PEGARSE A SÍ MISMO
  // ==========================================================

  if (targetJid === who) {

    return conn.sendMessage(
      m.chat,
      {
        text:
          `👊 ${senderName} se pegó a sí mismo. 😂`,
        mentions: [who]
      },
      {
        quoted: m
      }
    )
  }

  // ==========================================================
  // 💞 CARGAR PAREJAS
  // ==========================================================

  const parejas =
    cargarParejas()

  const senderData =
    parejas[who] || {}

  const targetData =
    parejas[targetJid] || {}

  // ==========================================================
  // 💑 COMPROBAR SI TIENEN PAREJA
  // ==========================================================
  //
  // Se obtiene la información de pareja,
  // pero NO se bloquea la acción.
  //

  const senderPareja =
    senderData.pareja || null

  const targetPareja =
    targetData.pareja || null

  // ==========================================================
  // 👊 MENSAJES
  // ==========================================================

  const mensajes = [

    `👊 ${senderName} le pegó a ${targetName}. 😂`,

    `👊 ${senderName} le dio un golpe a ${targetName}. 💥`,

    `👊 ${senderName} se enojó y le pegó a ${targetName}. 😤`,

    `👊 ${senderName} le dio un buen golpe a ${targetName}. 💥😂`,

    `👊 ${senderName} sorprendió a ${targetName} con un golpe. 😳💥`

  ]

  const textMessage =
    mensajes[
      Math.floor(
        Math.random() *
        mensajes.length
      )
    ]

  // ==========================================================
  // 📝 MENCIONES
  // ==========================================================

  const mentions = [
    who,
    targetJid
  ]

  // Agregar parejas si existen
  if (
    senderPareja &&
    !mentions.includes(senderPareja)
  ) {
    mentions.push(senderPareja)
  }

  if (
    targetPareja &&
    !mentions.includes(targetPareja)
  ) {
    mentions.push(targetPareja)
  }

  // ==========================================================
  // 👊 ENVIAR
  // ==========================================================

  await conn.sendMessage(
    m.chat,
    {
      text: textMessage,
      mentions
    },
    {
      quoted: m
    }
  )
}

// ============================================================
// ⚙️ COMANDOS
// ============================================================

handler.command = [
  'pegar'
]

handler.help = [
  'pegar @usuario'
]

handler.tags = [
  'fun'
]

export default handler
