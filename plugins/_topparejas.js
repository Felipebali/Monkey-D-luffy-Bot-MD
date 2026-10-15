// 📂 plugins/topparejas.js
// 🏆 TOP PAREJAS — whatsapp-bot 💞
// ❤️ Ranking de parejas por puntos de amor
// 🔒 Comando exclusivo para Owners
// ============================================================

import fs from 'fs'
import path from 'path'

// ============================================================
// 📁 BASE DE DATOS
// ============================================================

const dir = './database'
const file = path.join(dir, 'parejas.json')

function prepararDB() {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '{}', 'utf8')
  }
}

function loadDB() {
  try {
    prepararDB()

    const contenido = fs.readFileSync(file, 'utf8')
    const db = JSON.parse(contenido || '{}')

    if (!db || typeof db !== 'object' || Array.isArray(db)) {
      throw new Error('La estructura de la base de datos no es válida.')
    }

    return db
  } catch (error) {
    console.error('[TOP PAREJAS] Error al leer la base de datos:', error)
    return null
  }
}

// ============================================================
// 💞 HANDLER PRINCIPAL
// ============================================================

let handler = async (m, { conn, isOwner }) => {

  // ----------------------------------------------------------
  // 🔒 PERMISOS
  // ----------------------------------------------------------

  if (!isOwner) {
    return m.reply(
      '👑 *ACCESO EXCLUSIVO PARA OWNERS*\n\n' +
      '💌 Este ranking está reservado para los propietarios de whatsapp-bot.'
    )
  }

  // ----------------------------------------------------------
  // 💾 CARGAR DATOS
  // ----------------------------------------------------------

  const db = loadDB()

  if (!db) {
    return m.reply(
      '❌ No pude leer `database/parejas.json`.\n\n' +
      '📂 Revisa que el archivo contenga un JSON válido.'
    )
  }

  const parejas = []
  const procesadas = new Set()

  // ----------------------------------------------------------
  // 💑 RECOPILAR PAREJAS
  // ----------------------------------------------------------

  for (const id of Object.keys(db)) {
    const user = db[id]

    if (!user || !user.pareja) continue

    const parejaId = String(user.pareja)
    const parejaData = db[parejaId]

    // Comprobar que ambos integrantes existan
    if (!parejaData || parejaId === id) continue

    // Evitar registrar la misma pareja dos veces
    const idsOrdenados = [id, parejaId].sort()
    const clave = idsOrdenados.join('|')

    if (procesadas.has(clave)) continue
    procesadas.add(clave)

    // Utilizar el amor de un solo integrante.
    // No sumar los puntos de ambos usuarios.
    const amorTotal = Math.max(0, Number(user.amor) || 0)

    // Detectar matrimonio si alguno tiene fecha registrada
    const casados = Boolean(
      user.matrimonioFecha || parejaData.matrimonioFecha
    )

    parejas.push({
      u1: id,
      u2: parejaId,
      amor: amorTotal,
      casados
    })
  }

  // ----------------------------------------------------------
  // 💔 SIN PAREJAS REGISTRADAS
  // ----------------------------------------------------------

  if (parejas.length === 0) {
    return m.reply(
      '╭━━━〔 💔 SIN PAREJAS 〕━━━⬣\n' +
      '│\n' +
      '│ 🏹 ¡Cupido todavía está trabajando!\n' +
      '│\n' +
      '│ Aún no hay parejas registradas\n' +
      '│ para aparecer en nuestro ranking.\n' +
      '│\n' +
      '│ 💌 ¡Pronto podría nacer una historia\n' +
      '│ llena de amor en whatsapp-bot!\n' +
      '│\n' +
      '╰━━━━━━━━━━━━━━━━━━━━⬣'
    )
  }

  // ----------------------------------------------------------
  // 🏆 ORDENAR Y SELECCIONAR TOP 10
  // ----------------------------------------------------------

  parejas.sort((a, b) => b.amor - a.amor)

  const top = parejas.slice(0, 10)

  const medallas = ['🥇', '🥈', '🥉']

  // ----------------------------------------------------------
  // 💌 ENCABEZADO
  // ----------------------------------------------------------

  let texto =
    '╭━━━〔 💞 TOP PAREJAS 💞 〕━━━⬣\n' +
    '│\n' +
    '│ 🏆 *EL RINCÓN DEL AMOR*\n' +
    '│ 🤖 whatsapp-bot\n' +
    '│\n' +
    '│ Las parejas con más puntos\n' +
    '│ de amor ocupan los primeros puestos.\n' +
    '│\n' +
    '╰━━━━━━━━━━━━━━━━━━━━⬣\n\n'

  // ----------------------------------------------------------
  // ❤️ CONSTRUIR RANKING
  // ----------------------------------------------------------

  for (let i = 0; i < top.length; i++) {
    const p = top[i]

    const u1 = '@' + p.u1.split('@')[0]
    const u2 = '@' + p.u2.split('@')[0]

    const puesto = medallas[i] || '💗'
    const estado = p.casados ? '💍 Casados' : '💑 En pareja'

    let frase

    if (i === 0) {
      frase = '👑 ¡La pareja que lidera el ranking!'
    } else if (i === 1) {
      frase = '✨ ¡Dos corazones que brillan!'
    } else if (i === 2) {
      frase = '🌹 ¡Una historia llena de cariño!'
    } else {
      frase = '💌 ¡Cada punto suma a su historia!'
    }

    texto +=
      `${puesto} *PUESTO ${i + 1}*\n\n` +
      `💞 ${u1} ❤️ ${u2}\n` +
      `${estado}\n` +
      `💗 Puntos de amor: *${p.amor}*\n\n` +
      `_${frase}_\n\n` +
      '━━━━━━━━━━━━━━━━━━\n\n'
  }

  // ----------------------------------------------------------
  // 🌹 PIE DEL RANKING
  // ----------------------------------------------------------

  texto +=
    '🏹 *¡QUE VIVA EL AMOR!*\n\n' +
    '💌 Cada detalle cuenta.\n' +
    '❤️ Cada punto tiene su historia.\n' +
    '🌹 ¿Quién conquistará el primer puesto?\n\n' +
    '╰┈➤ _Ranking oficial de whatsapp-bot_ 💞'

  // ----------------------------------------------------------
  // 📢 ENVIAR MENSAJE CON MENCIONES
  // ----------------------------------------------------------

  const mentions = [
    ...new Set(top.flatMap(p => [p.u1, p.u2]))
  ]

  await conn.sendMessage(
    m.chat,
    {
      text: texto,
      mentions
    },
    { quoted: m }
  )
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL COMANDO
// ============================================================

handler.help = ['topparejas', 'topamor']
handler.tags = ['owner']
handler.command = ['topparejas', 'topamor']

export default handler
