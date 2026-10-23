
/**
 * 📂 plugins/_suicidarse.js
 * 💙 WHATSAPP-BOT — SISTEMA DE APOYO Y PREVENCIÓN
 *
 * Comando: .suicidarse
 * Disponible: grupos
 * Objetivo: ofrecer apoyo y orientar hacia ayuda humana
 */

const mensajesApoyo = [
  '💙 No tienes que resolverlo todo en este momento. Mereces apoyo y compañía.',
  '🫂 No tienes que pasar por un momento difícil en soledad. Hablar con alguien de confianza puede ayudar.',
  '🌱 Lo que estás sintiendo merece ser escuchado. No tengas miedo de pedir ayuda.',
  '💙 Tu vida importa. Mereces que te escuchen sin juzgarte.',
  '🤍 Está bien no sentirse bien todo el tiempo. Busca a alguien de confianza y cuéntale cómo te encuentras.',
  '🌤️ No necesitas tener todas las respuestas hoy. Da un paso a la vez y permite que alguien te acompañe.',
  '🫶 Pedir ayuda no es una debilidad. Mereces cuidado, respeto y apoyo.'
]

const elegirAleatorio = (lista) =>
  lista[Math.floor(Math.random() * lista.length)]

const handler = async (m, { conn }) => {
  if (!m.isGroup) {
    return conn.sendMessage(m.chat, {
      text: '💙 Este comando de apoyo está disponible en los grupos.'
    })
  }

  try {
    const usuario = m.sender
    const frase = elegirAleatorio(mensajesApoyo)

    const mensaje = [
      '╭━━━〔 💙 ESPACIO DE APOYO 〕━━━⬣',
      '',
      `🫂 @${usuario.split('@')[0]}, queremos recordarte algo importante:`,
      '',
      frase,
      '',
      '━━━━━━━━━━━━━━━━━━━━',
      '💬 *NO TIENES QUE AFRONTARLO A SOLAS*',
      '',
      'Si este tema tiene que ver con cómo te estás sintiendo, intenta hablar con alguien de confianza y decirle claramente que necesitas compañía y ayuda.',
      '',
      '🇺🇾 *AYUDA EN URUGUAY*',
      '',
      '📞 *Línea Vida: 0800 0767 o *0767 desde celular.*',
      '🚨 *Emergencia inmediata: 911.*',
      '',
      'Si existe peligro inmediato, busca a una persona que pueda quedarse contigo y contacta los servicios de emergencia.',
      '',
      '💙 _Tu bienestar importa. Mereces ser escuchado/a._',
      '',
      '╰━━━━━━━━━━━━━━━━━━━━⬣',
      '_WHATSAPP-BOT | Apoyo y prevención_'
    ].join('\n')

    await conn.sendMessage(m.chat, {
      text: mensaje,
      mentions: [usuario]
    })

    // Reacción de apoyo
    await conn.sendMessage(m.chat, {
      react: {
        text: '💙',
        key: m.key
      }
    }).catch(() => {})

  } catch (error) {
    console.error('[WHATSAPP-BOT | APOYO Y PREVENCIÓN]', error)

    await conn.sendMessage(m.chat, {
      text: '💙 No pudimos mostrar el mensaje completo. Si alguien necesita ayuda, puede acudir a una persona de confianza o a los servicios de emergencia.'
    }).catch(() => {})
  }
}

handler.help = ['suicidarse']
handler.tags = ['prevencion']
handler.command = ['suicidarse']
handler.group = true

export default handler
