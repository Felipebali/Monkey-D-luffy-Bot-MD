// 📂 plugins/id-lid-owner.js
// 🧠 ID / LID — Solo Owner
// ============================================================


// ============================================================
// 🔢 NORMALIZADOR DE NÚMEROS
// ============================================================

function normalizeNumber(input = '') {
  return String(input)
    .replace(/@s\.whatsapp\.net/gi, '')
    .replace(/@lid/gi, '')
    .replace(/[^0-9]/g, '')
    .replace(/^0+/, '')
}


// ============================================================
// 👑 COMPROBAR SI ES OWNER
// ============================================================

function isOwner(m) {

  const owners = Array.isArray(global.owner)
    ? global.owner
    : []

  // Número/JID del que ejecuta el comando
  const sender = normalizeNumber(
    m.sender ||
    m.participant ||
    ''
  )

  if (!sender)
    return false

  for (let owner of owners) {

    // Si global.owner tiene:
    // ['598xxxxxxxx']
    // [['598xxxxxxxx', 'Felipe']]
    // ['+598xxxxxxxx@s.whatsapp.net']

    if (Array.isArray(owner))
      owner = owner[0]

    const ownerNumber = normalizeNumber(owner)

    if (!ownerNumber)
      continue

    // Comparación directa
    if (sender === ownerNumber)
      return true

    // ========================================================
    // 🇺🇾 COMPATIBILIDAD URUGUAY
    // Permite comparar:
    // 598XXXXXXXX
    // 09XXXXXXX
    // XXXXXXXXX
    // ========================================================

    const senderUY =
      sender.startsWith('598')
        ? sender.slice(3)
        : sender

    const ownerUY =
      ownerNumber.startsWith('598')
        ? ownerNumber.slice(3)
        : ownerNumber

    if (senderUY === ownerUY)
      return true

    // También compara los últimos 8 dígitos
    if (
      sender.length >= 8 &&
      ownerNumber.length >= 8 &&
      sender.slice(-8) === ownerNumber.slice(-8)
    ) {
      return true
    }
  }

  return false
}


// ============================================================
// 🔎 EXTRAER NÚMERO DEL TEXTO
// ============================================================

function extractNumberFromText(text = '') {

  const match = String(text).match(/\+?\d{7,15}/)

  return match
    ? normalizeNumber(match[0])
    : null
}


// ============================================================
// 🆔 HANDLER .ID
// ============================================================

let handler = async function (m, { conn, groupMetadata }) {

  // ==========================================================
  // 👑 VERIFICACIÓN OWNER
  // ==========================================================

  if (!isOwner(m))
    return m.reply('❌ Solo el owner puede usar este comando.')


  // ==========================================================
  // 🧷 CASO 1 — MENCIÓN
  // ==========================================================

  if (m.mentionedJid && m.mentionedJid.length > 0) {

    const userJid = m.mentionedJid[0]

    const userName =
      await conn.getName(userJid).catch(() => null) ||
      'Usuario'

    const number = normalizeNumber(userJid)

    const mensaje = `
╭─✿ *ID DE USUARIO* ✿─╮
│
│ 👤 *Nombre:* ${userName}
│ 📞 *Número:* ${number}
│ 🆔 *JID/ID:* ${userJid}
│
╰─────────────────────╯
`.trim()

    return conn.reply(
      m.chat,
      mensaje,
      m,
      {
        mentions: [userJid]
      }
    )
  }


  // ==========================================================
  // 🧷 CASO 2 — NÚMERO ESCRITO
  // ==========================================================

  const rawText =
    m.text ||
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    ''

  const extracted = extractNumberFromText(rawText)

  if (extracted) {

    const userJid =
      extracted + '@s.whatsapp.net'

    const userName =
      await conn.getName(userJid).catch(() => null) ||
      'Usuario'

    const mensaje = `
╭─✿ *ID DE USUARIO* ✿─╮
│
│ 👤 *Nombre:* ${userName}
│ 📞 *Número:* ${extracted}
│ 🆔 *JID/ID:* ${userJid}
│
╰─────────────────────╯
`.trim()

    return conn.reply(
      m.chat,
      mensaje,
      m
    )
  }


  // ==========================================================
  // 🏢 CASO 3 — SIN DATOS EN GRUPO
  // ==========================================================

  if (m.isGroup) {

    const participantes =
      groupMetadata?.participants || []

    const mensaje = `
╭─✿ *ID DEL GRUPO* ✿─╮
│
│ 🏢 *Nombre:* ${groupMetadata?.subject || 'Sin nombre'}
│ 🆔 *JID/ID:* ${m.chat}
│ 👥 *Participantes:* ${participantes.length}
│
╰─────────────────────╯
`.trim()

    return conn.reply(
      m.chat,
      mensaje,
      m
    )
  }


  // ==========================================================
  // 📋 AYUDA
  // ==========================================================

  const ayuda = `
📋 *USO DEL COMANDO ID/LID*

🏷️ *.id @usuario*
📞 *.id +598XXXXXXXX*
🏢 *.id* — En un grupo
📱 *.lid* — Lista completa

💡 *Ejemplos:*

• .id @juan
• .id +59898116138
• .id
• .lid
`.trim()

  return conn.reply(
    m.chat,
    ayuda,
    m
  )
}


// ============================================================
// 📱 HANDLER .LID
// ============================================================

let handlerLid = async function (
  m,
  { conn, groupMetadata }
) {

  // ==========================================================
  // 👥 SOLO GRUPOS
  // ==========================================================

  if (!m.isGroup)
    return m.reply(
      '❌ Este comando solo funciona en grupos.'
    )


  // ==========================================================
  // 👑 VERIFICACIÓN OWNER
  // ==========================================================

  if (!isOwner(m))
    return m.reply(
      '❌ Solo el owner puede usar este comando.'
    )


  // ==========================================================
  // 👥 PARTICIPANTES
  // ==========================================================

  const participantes =
    groupMetadata?.participants || []


  // ==========================================================
  // 🪪 TARJETAS
  // ==========================================================

  const tarjetas = participantes.map(
    (p, index) => {

      const jid =
        p.id ||
        'N/A'

      const username =
        '@' + normalizeNumber(jid)

      const estado =
        p.admin === 'superadmin'
          ? '👑 *Propietario*'
          : p.admin === 'admin'
            ? '🛡️ *Administrador*'
            : '👤 *Miembro*'

      return [
        `╭─✿ *Usuario ${index + 1}* ✿`,
        `│ 👤 *Nombre:* ${username}`,
        `│ 🆔 *JID:* ${jid}`,
        `│ 🏷️ *Rol:* ${estado}`,
        '╰───────────────✿'
      ].join('\n')
    }
  )


  // ==========================================================
  // 📝 CONTENIDO
  // ==========================================================

  const contenido =
    tarjetas.join('\n\n')


  // ==========================================================
  // 📢 MENCIONES
  // ==========================================================

  const mencionados =
    participantes
      .map(p => p.id)
      .filter(Boolean)


  // ==========================================================
  // 📤 MENSAJE
  // ==========================================================

  const mensajeFinal = `
╭━━━❖『 *LISTA DE PARTICIPANTES* 』❖━━━╮
│
│ 👥 *Grupo:* ${groupMetadata?.subject || 'Sin nombre'}
│ 🔢 *Total:* ${participantes.length} miembros
│
╰━━━━━━━━━━━━━━━━━━━━━━╯

${contenido}
`.trim()

  return conn.reply(
    m.chat,
    mensajeFinal,
    m,
    {
      mentions: mencionados
    }
  )
}


// ============================================================
// ⚙️ CONFIGURACIÓN .ID
// ============================================================

handler.command = ['id']
handler.help = ['id', 'id @user']
handler.tags = ['info']
handler.rowner = true


// ============================================================
// ⚙️ CONFIGURACIÓN .LID
// ============================================================

handlerLid.command = ['lid']
handlerLid.help = ['lid']
handlerLid.tags = ['group']
handlerLid.group = true
handlerLid.rowner = true


// ============================================================
// 📤 EXPORTAR
// ============================================================

export {
  handler as default,
  handlerLid
}
