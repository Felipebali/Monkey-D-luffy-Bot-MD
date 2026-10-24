/**
 * 📂 plugins/fakewpp.js
 * 📱 WHATSAPP-BOT — FAKE IPHONE WHATSAPP
 *
 * Comandos:
 * .fakewpp <texto>
 * .fakeiphone <texto>
 * .fakewhatsapp <texto>
 * .iphonefake <texto>
 *
 * Sin sharp ni dependencias adicionales.
 */

const handler = async (m, { conn, text }) => {
  const ctxErr = global.rcanalx || {}
  const ctxWarn = global.rcanalw || {}
  const ctxOk = global.rcanalr || {}

  try {
    if (!text?.trim()) {
      return conn.reply(
        m.chat,
        '📱 *CREAR CAPTURA IPHONE WHATSAPP*\n\n' +
        '💡 Uso: .fakewpp <texto>\n' +
        '📝 Ejemplo: .fakewpp Hola, ¿cómo estás?',
        m,
        ctxWarn
      )
    }

    await conn.reply(
      m.chat,
      '🎨 Generando captura simulada...',
      m,
      ctxOk
    )

    const mensaje = text.trim().slice(0, 1500)

    const hora = new Date().toLocaleTimeString('es-UY', {
      timeZone: 'America/Montevideo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    const escapar = (valor) => String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')

    // Ajustar el texto a líneas.
    const palabras = mensaje.split(/\s+/)
    const lineas = []
    let linea = ''

    for (const palabra of palabras) {
      let restante = palabra

      while (restante.length > 28) {
        if (linea) {
          lineas.push(linea)
          linea = ''
        }

        lineas.push(restante.slice(0, 28))
        restante = restante.slice(28)
      }

      const prueba = linea ? `${linea} ${restante}` : restante

      if (prueba.length > 28) {
        if (linea) lineas.push(linea)
        linea = restante
      } else {
        linea = prueba
      }
    }

    if (linea) lineas.push(linea)

    const lineasFinales = lineas.slice(0, 30)
    const altoBurbuja = Math.max(90, 55 + lineasFinales.length * 26)
    const alto = 230 + altoBurbuja + 100

    const textoSVG = lineasFinales.map((lineaTexto, i) =>
      `<text x="205" y="${290 + i * 26}" font-family="Arial,sans-serif" font-size="18" fill="#111">${escapar(lineaTexto)}</text>`
    ).join('')

    const horaMensajeY = 290 + lineasFinales.length * 26 + 8

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="430" height="${alto}">
  <rect width="430" height="${alto}" fill="#F2F2F7"/>

  <rect width="430" height="55" fill="#FFFFFF"/>
  <text x="25" y="34" font-family="Arial" font-size="17" font-weight="bold" fill="#111">${hora}</text>
  <text x="345" y="34" font-family="Arial" font-size="15" fill="#111">●●● ▰</text>

  <rect y="55" width="430" height="72" fill="#FFFFFF"/>
  <path d="M32 81 L20 91 L32 101 M20 91 H43" stroke="#007AFF" stroke-width="3" fill="none"/>
  <circle cx="76" cy="91" r="22" fill="#DCE8DF"/>
  <circle cx="76" cy="85" r="8" fill="#FFFFFF"/>
  <path d="M61 103 Q76 84 91 103" fill="#FFFFFF"/>
  <text x="109" y="88" font-family="Arial" font-size="17" font-weight="bold" fill="#111">Contacto</text>
  <text x="109" y="107" font-family="Arial" font-size="12" fill="#777">en línea</text>
  <text x="365" y="98" font-family="Arial" font-size="24" fill="#007AFF">☎</text>

  <rect y="127" width="430" height="${alto - 127}" fill="#F2F2F7"/>

  <rect x="174" y="245" width="240" height="${altoBurbuja}" rx="17" fill="#A8ECA0"/>
  ${textoSVG}
  <text x="320" y="${horaMensajeY}" font-family="Arial" font-size="11" fill="#477B42">${hora} ✓✓</text>

  <rect y="${alto - 66}" width="430" height="66" fill="#FFFFFF"/>
  <circle cx="26" cy="${alto - 33}" r="12" fill="none" stroke="#888" stroke-width="2"/>
  <path d="M26 ${alto - 40} V${alto - 26} M19 ${alto - 33} H33" stroke="#888" stroke-width="2"/>
  <rect x="48" y="${alto - 52}" width="322" height="38" rx="19" fill="#FFFFFF" stroke="#CCC"/>
  <circle cx="397" cy="${alto - 33}" r="13" fill="#007AFF"/>
  <path d="M391 ${alto - 33} H403 M398 ${alto - 38} L403 ${alto - 33} L398 ${alto - 28}" fill="none" stroke="#FFF" stroke-width="2"/>
</svg>`

    // Se envía el SVG directamente como documento.
    // No se convierte a PNG porque Node.js no incluye un conversor SVG/PNG nativo.
    const imagen = Buffer.from(svg, 'utf8')

    await conn.sendMessage(
      m.chat,
      {
        document: imagen,
        mimetype: 'image/svg+xml',
        fileName: 'fakewpp.svg',
        caption:
          '📱 *Captura simulada estilo iPhone WhatsApp*\n\n' +
          `💬 *Mensaje:* ${mensaje}\n` +
          `🕒 *Hora de Uruguay:* ${hora}\n\n` +
          '✨ Generada localmente, sin API externa.'
      },
      { quoted: m }
    )
  } catch (error) {
    console.error('[FAKEWPP] Error:', error)

    await conn.reply(
      m.chat,
      '❌ *ERROR AL CREAR LA CAPTURA*\n\n' +
      `🔧 Detalle: ${error.message}`,
      m,
      ctxErr
    )
  }
}

handler.help = ['fakewpp <texto>']
handler.tags = ['maker']
handler.command = [
  'fakewpp',
  'fakeiphone',
  'fakewhatsapp',
  'iphonefake'
]

export default handler
