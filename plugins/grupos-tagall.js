// 📂 plugins/tagall.js — FelixCat-Bot 🐾
// TagAll con toggle .antitagall — sin cooldown

let handler = async function (m, { conn, groupMetadata, args, isAdmin, isOwner, command }) {

  if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos.')

  const chatId = m.chat
  const sender = m.sender

  // Inicializar datos del chat
  if (!global.db.data.chats[chatId]) global.db.data.chats[chatId] = {}
  const chatData = global.db.data.chats[chatId]

  // 🔥 Toggle .antitagall — SOLO ADMIN / OWNER
  if (command === 'antitagall') {
    if (!(isAdmin || isOwner)) {
      return conn.sendMessage(chatId, {
        text: '❌ Solo un administrador puede usar este comando.'
      })
    }

    chatData.tagallEnabled = !chatData.tagallEnabled

    return conn.sendMessage(chatId, {
      text: `⚡ TagAll ahora está ${chatData.tagallEnabled ? 'activado ✅' : 'desactivado ❌'} para este grupo.`
    })
  }

  // ===========================
  // TagAll normal
  // ===========================

  if (!(isAdmin || isOwner)) {
    return conn.sendMessage(chatId, {
      text: '❌ Solo un administrador puede usar este comando.',
      mentions: [sender]
    })
  }

  if (!chatData.tagallEnabled) {
    return conn.sendMessage(chatId, {
      text: '⚠️ El TagAll está desactivado. Usa ".antitagall" para activarlo.'
    })
  }

  // ===========================
  // 👥 OBTENER PARTICIPANTES
  // ===========================

  const participantes = groupMetadata?.participants || []

  const mencionados = participantes
    .map(p => p.id)
    .filter(Boolean)

  // ===========================
  // 💬 MENSAJE OPCIONAL
  // ===========================

  const mensajeOpcional = args.length
    ? args.join(' ')
    : ''

  // ===========================
  // 🔥 CREAR MENSAJE
  // ===========================

  const listaUsuarios = mencionados
    .map(jid => `- @${jid.split('@')[0]}`)
    .join('\n')

  const mensaje = [
    `🔥 *SE ACTIVÓ EL TAG DE TODOS* 🔥`,
    ``,
    `⚡ *Usuarios invocados:*`,
    listaUsuarios,
    ``,
    `💥 *¡Que comience la acción!*`,
    mensajeOpcional
  ]
    .filter(Boolean)
    .join('\n')

  // ===========================
  // 📢 MENCIONAR A TODOS
  // ===========================

  await conn.sendMessage(chatId, {
    text: mensaje,
    mentions: mencionados
  })
}

// ===========================
// 📌 COMANDOS
// ===========================

handler.command = [
  'invocar',
  'todos',
  'tagall',
  'antitagall'
]

handler.help = [
  'tagall',
  'antitagall'
]

handler.tags = [
  'grupos'
]

handler.group = true
handler.admin = true

export default handler
