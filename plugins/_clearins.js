// 📂 plugins/clear.js — CLEAR INSIGNIAS 🧹

import fs from 'fs'
import path from 'path'

// =====================
// RUTAS
// =====================

const dbPath = './database'
const perfilesFile = path.join(dbPath, 'perfiles.json')

// =====================
// CREAR DB SI NO EXISTE
// =====================

if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath)

if (!fs.existsSync(perfilesFile))
  fs.writeFileSync(perfilesFile, JSON.stringify({}, null, 2))

// =====================
// LOAD / SAVE
// =====================

const loadPerfiles = () => JSON.parse(fs.readFileSync(perfilesFile))
const savePerfiles = data =>
  fs.writeFileSync(perfilesFile, JSON.stringify(data, null, 2))

// =====================
// HANDLER
// =====================

let handler = async (m, { text, command }) => {

  try {

    const perfiles = loadPerfiles()

    const jid = m.sender

    const senderNumber = jid.replace(/[^0-9]/g, '')

    const ownerNumbers = (global.owner || []).map(v => {
      if (Array.isArray(v)) v = v[0]
      return String(v).replace(/[^0-9]/g, '')
    })

    const isRealOwner = ownerNumbers.includes(senderNumber)
    const isAdmin = m.isAdmin || false

    // =====================
    // PERMISOS
    // =====================

    if (!isAdmin && !isRealOwner)
      return m.reply('❌ Solo admins o dueño pueden usar este comando.')

    const target = m.mentionedJid?.[0] || m.quoted?.sender

    // =====================
    // BORRAR DE UN USUARIO
    // =====================

    if (target) {

      if (!perfiles[target]?.insignias?.length)
        return m.reply('❌ Ese usuario no tiene insignias.')

      perfiles[target].insignias = []

      savePerfiles(perfiles)

      return m.reply(
        `🧹 Se borraron todas las insignias de @${target.split('@')[0]}`,
        null,
        { mentions: [target] }
      )
    }

    // =====================
    // BORRAR TODAS
    // =====================

    for (const id in perfiles) {
      if (perfiles[id].insignias)
        perfiles[id].insignias = []
    }

    savePerfiles(perfiles)

    return m.reply('🧹 Se borraron TODAS las insignias del sistema.')

  } catch (e) {
    console.error(e)
    m.reply('❌ Error en clear.')
  }
}

// =====================
// COMANDO
// =====================

handler.command = ['clearinsignias', 'clearins']

export default handler
