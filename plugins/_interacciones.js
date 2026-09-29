// 📂 plugins/romance.js
// 💞 Flores, regalos y citas
// FelixCat_Bot ❤️

import fs from 'fs'
import path from 'path'

const dir = './database'
const file = path.join(dir, 'parejas.json')

// ============================================================
// 📁 CREAR CARPETA Y BASE DE DATOS
// ============================================================

if (!fs.existsSync(dir))
  fs.mkdirSync(dir, { recursive: true })

if (!fs.existsSync(file))
  fs.writeFileSync(file, JSON.stringify({}, null, 2))


// ============================================================
// 💾 BASE DE DATOS
// ============================================================

const loadDB = () => {
  try {
    return JSON.parse(fs.readFileSync(file))
  } catch {
    return {}
  }
}

const saveDB = (data) => {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  )
}


// ============================================================
// 💕 HANDLER
// ============================================================

let handler = async (m, { conn, command }) => {

  const db = loadDB()

  // 👤 Usuario que ejecuta el comando
  const sender = conn.decodeJid(m.sender)


  // ============================================================
  // 👤 CREAR / OBTENER USUARIO
  // ============================================================

  const getUser = (id) => {

    if (!db[id]) {

      db[id] = {
        pareja: null,
        estado: 'soltero',

        propuesta: null,
        propuestaFecha: null,

        propuestaMatrimonio: null,
        propuestaMatrimonioFecha: null,

        relacionFecha: null,
        matrimonioFecha: null,

        amor: 0
      }
    }

    return db[id]
  }


  // ============================================================
  // 🏷️ MENCIONAR
  // ============================================================

  const tag = (id) => {

    if (!id)
      return ''

    return '@' + id.split('@')[0]
  }


  // ============================================================
  // 📦 CAJA
  // ============================================================

  const box = (title, text) => `
╭━━━〔 ${title} 〕━━━⬣
${text}
╰━━━━━━━━━━━━━━━━⬣`


  // ============================================================
  // 🎯 OBTENER OBJETIVO
  // MENCIONANDO O RESPONDIENDO A UN MENSAJE
  // ============================================================

  const getTarget = () => {

    // 👤 Mención
    if (m.mentionedJid?.length)
      return conn.decodeJid(m.mentionedJid[0])

    // 💬 Respuesta / citado
    if (m.quoted?.sender)
      return conn.decodeJid(m.quoted.sender)

    return null
  }


  // ============================================================
  // 🔎 COMPARAR DOS USUARIOS
  // Evita problemas con @lid, dispositivos o JID diferentes
  // ============================================================

  const sameUser = (a, b) => {

    if (!a || !b)
      return false

    a = conn.decodeJid(a)
    b = conn.decodeJid(b)

    // Comparación directa
    if (a === b)
      return true


    // Quitar identificador de dispositivo
    const clean = jid => {

      if (!jid)
        return ''

      return jid
        .split(':')[0]
        .toLowerCase()
    }


    const cleanA = clean(a)
    const cleanB = clean(b)


    if (cleanA === cleanB)
      return true


    // Comparar números
    const numberA = cleanA.replace(
      /[^0-9]/g,
      ''
    )

    const numberB = cleanB.replace(
      /[^0-9]/g,
      ''
    )


    if (
      numberA &&
      numberB &&
      numberA === numberB
    ) {
      return true
    }


    return false
  }


  // ============================================================
  // 🔎 BUSCAR EL ID REAL EN parejas.json
  // ============================================================

  const findUserId = (jid) => {

    if (!jid)
      return null


    // Existe directamente
    if (db[jid])
      return jid


    // Buscar entre todos los usuarios
    for (const id of Object.keys(db)) {

      if (sameUser(id, jid))
        return id
    }


    return jid
  }


  // ============================================================
  // 🎯 OBTENER OBJETIVO
  // ============================================================

  const targetRaw = getTarget()


  if (!targetRaw)
    return m.reply(
      '💌 Menciona o responde a alguien.'
    )


  // Buscar el ID real guardado
  const target = findUserId(targetRaw)


  // ============================================================
  // 👤 USUARIOS
  // ============================================================

  const user = getUser(sender)
  const targetUser = getUser(target)


  // ============================================================
  // 🚫 PERSONA EN RELACIÓN
  // Si el objetivo tiene pareja y NO es el sender
  // ============================================================

  if (
    targetUser.pareja &&
    !sameUser(
      targetUser.pareja,
      sender
    )
  ) {

    return conn.reply(
      m.chat,

      box(
        '🚨 PERSONA EN RELACIÓN',

        `${tag(target)} está en pareja con ${tag(targetUser.pareja)} ❤️

Respeta relaciones ajenas 😾`
      ),

      m,

      {
        mentions: [
          target,
          targetUser.pareja
        ]
      }
    )
  }


  // ============================================================
  // 🚨 INFIDELIDAD
  // El usuario tiene pareja pero intenta actuar
  // con otra persona
  // ============================================================

  if (
    user.pareja &&
    !sameUser(
      user.pareja,
      target
    )
  ) {

    return conn.reply(
      m.chat,

      box(
        '🚨 INFIDELIDAD DETECTADA',

        `${tag(sender)} intentó ${command} a ${tag(target)} 😾

Pero su pareja es ${tag(user.pareja)} ❤️`
      ),

      m,

      {
        mentions: [
          sender,
          target,
          user.pareja
        ]
      }
    )
  }


  // ============================================================
  // ❌ NO SON PAREJA
  // ============================================================

  if (
    !user.pareja ||
    !sameUser(
      user.pareja,
      target
    )
  ) {

    return m.reply(
      '💔 No son pareja.'
    )
  }


  // ============================================================
  // ❤️ ACCIONES ROMÁNTICAS
  // ============================================================

  let suma = 0


  if (command === 'flores')
    suma = 15


  if (command === 'regalo')
    suma = 20


  if (command === 'cita')
    suma = 25


  // ============================================================
  // 💕 SUMAR AMOR A LOS DOS
  // ============================================================

  user.amor = Number(user.amor || 0)
  targetUser.amor = Number(targetUser.amor || 0)

  user.amor += suma
  targetUser.amor += suma


  // ============================================================
  // 💾 GUARDAR
  // ============================================================

  saveDB(db)


  // ============================================================
  // 💞 RESPUESTA
  // ============================================================

  return conn.reply(
    m.chat,

    box(
      '💞 MOMENTO ROMÁNTICO',

      `${tag(sender)} 💕 ${tag(target)}

Acción: ${command}

❤️ Amor actual: ${user.amor}`
    ),

    m,

    {
      mentions: [
        sender,
        target
      ]
    }
  )
}


// ============================================================
// 📌 COMANDOS
// ============================================================

handler.command = [
  'flores',
  'regalo',
  'cita'
]


export default handler
