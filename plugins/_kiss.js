// 📂 plugins/kiss.js
// 💋 Sistema de besos
// Permite besar aunque la persona tenga pareja en parejas.json

import fs from 'fs'
import path from 'path'

const parejasFile = path.join('./database', 'parejas.json')

function cargarParejas() {
  try {
    if (!fs.existsSync(parejasFile)) return {}
    return JSON.parse(fs.readFileSync(parejasFile, 'utf8'))
  } catch {
    return {}
  }
}

let handler = async (m, { conn }) => {

  const who = conn.decodeJid(m.sender)

  const targetJid = m.quoted
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


  // ============================================================
  // 💋 SI NO MENCIONÓ A NADIE
  // ============================================================

  if (!targetJid) {
    return conn.sendMessage(
      m.chat,
      {
        text: `💋 ${senderName} mandó un beso al aire. 😘`,
        mentions: [who]
      },
      { quoted: m }
    )
  }


  // ============================================================
  // 💋 BESARSE A SÍ MISMO
  // ============================================================

  if (targetJid === who) {

    return conn.sendMessage(
      m.chat,
      {
        text: `💋 ${senderName} se dio un beso a sí mismo. 😂💋`,
        mentions: [who]
      },
      { quoted: m }
    )
  }


  // ============================================================
  // 💞 CARGAR PAREJAS
  // ============================================================

  const parejas = cargarParejas()

  const senderData = parejas[who] || {}
  const targetData = parejas[targetJid] || {}


  // ============================================================
  // 💑 COMPROBAR SI TIENEN PAREJA
  // ============================================================
  //
  // Se comprueba únicamente para tener la información disponible.
  // NO bloqueamos el beso aunque alguno tenga pareja.
  //

  const senderPareja = senderData.pareja || null
  const targetPareja = targetData.pareja || null


  // ============================================================
  // 💋 MENSAJES
  // ============================================================

  const mensajes = [

    `💋 ${senderName} le dio un beso a ${targetName}. 😘`,

    `💋 ${senderName} saludó a ${targetName} con un beso. 😊`,

    `💋 ${senderName} le mandó un beso a ${targetName}. 😘💞`,

    `💋 ${senderName} se acercó y le dio un beso a ${targetName}. 💋`,

    `💋 ${senderName} sorprendió a ${targetName} con un beso. 😳💋`

  ]


  const textMessage =
    mensajes[
      Math.floor(Math.random() * mensajes.length)
    ]


  // ============================================================
  // 📝 MENCIONES
  // ============================================================

  const mentions = [
    who,
    targetJid
  ]

  // Agregar parejas a las menciones si existen
  if (senderPareja && !mentions.includes(senderPareja))
    mentions.push(senderPareja)

  if (targetPareja && !mentions.includes(targetPareja))
    mentions.push(targetPareja)


  // ============================================================
  // 💋 ENVIAR
  // ============================================================

  await conn.sendMessage(
    m.chat,
    {
      text: textMessage,
      mentions
    },
    { quoted: m }
  )
}


handler.command = [
  'kiss',
  'beso'
]

handler.help = [
  'kiss @usuario',
  'beso @usuario'
]

handler.tags = [
  'fun'
]

export default handler
