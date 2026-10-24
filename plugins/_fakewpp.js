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
 * Generación local: no depende de una API externa.
 */

import sharp from 'sharp'

const handler = async (m, { conn, text }) => {
  const ctxErr = global.rcanalx || {}
  const ctxWarn = global.rcanalw || {}
  const ctxOk = global.rcanalr || {}

  try {
    if (!text || !text.trim()) {
      return conn.reply(
        m.chat,
        '📱 *CREAR CAPTURA DE IPHONE WHATSAPP*\n\n' +
        '💡 *Uso:* .fakewpp <texto>\n' +
        '📝 *Ejemplo:* .fakewpp Hola, ¿cómo estás?',
        m,
        ctxWarn
      )
    }

    await conn.reply(
      m.chat,
      '🎨 Generando captura de WhatsApp para iPhone...',
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

    const hora12 = new Date().toLocaleTimeString('es-UY', {
      timeZone: 'America/Montevideo',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    // Escapar caracteres para que el texto sea seguro dentro del SVG.
    const escapar = valor => String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')

    // Ajustar el mensaje en líneas.
    const anchoMaximo = 29
    const palabras = mensaje.split(/\s+/)
    const lineas = []
    let linea = ''

    for (const palabra of palabras) {
      if (palabra.length > anchoMaximo) {
        if (linea) {
          lineas.push(linea)
          linea = ''
        }

        for (let i = 0; i < palabra.length; i += anchoMaximo) {
          lineas.push(palabra.slice(i, i + anchoMaximo))
        }

        continue
      }

      const prueba = linea ? `${linea} ${palabra}` : palabra

      if (prueba.length > anchoMaximo) {
        lineas.push(linea)
        linea = palabra
      } else {
        linea = prueba
      }
    }

    if (linea) lineas.push(linea)

    const lineasFinales = lineas.slice(0, 30)
    const altoBurbuja = Math.max(76, 34 + lineasFinales.length * 27)
    const alto = Math.max(650, 360 + altoBurbuja + 60)

    const textoSvg = lineasFinales.map((lineaTexto, i) => (
      `<text x="224" y="${320 + i * 27}" ` +
      `font-family="Arial, Helvetica, sans-serif" ` +
      `font-size="19" fill="#111111">${escapar(lineaTexto)}</text>`
    )).join('')

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="430" height="${alto}">
        <rect width="430" height="${alto}" rx="0" fill="#F5F5F5"/>

        <!-- Barra de estado -->
        <rect x="0" y="0" width="430" height="58" fill="#FFFFFF"/>
        <text x="27" y="35" font-family="Arial" font-size="17"
          font-weight="bold" fill="#111111">${escapar(hora)}</text>
        <rect x="349" y="20" width="24" height="12" rx="3"
          fill="none" stroke="#111111" stroke-width="1.8"/>
        <rect x="374" y="23" width="3" height="6" rx="1" fill="#111111"/>
        <rect x="352" y="23" width="16" height="6" rx="1" fill="#111111"/>
        <path d="M309 30 Q319 18 329 30 M313 30 Q319 23 325 30"
          fill="none" stroke="#111111" stroke-width="2"/>
        <circle cx="319" cy="32" r="2" fill="#111111"/>

        <!-- Encabezado del chat -->
        <rect x="0" y="58" width="430" height="78" fill="#FFFFFF"/>
        <path d="M30 91 L19 99 L30 107 M19 99 H43"
          fill="none" stroke="#007AFF" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="77" cy="97" r="23" fill="#D8E4DC"/>
        <circle cx="77" cy="91" r="8" fill="#FFFFFF"/>
        <path d="M62 108 Q77 89 92 108" fill="#FFFFFF"/>
        <text x="111" y="92" font-family="Arial" font-size="18"
          font-weight="bold" fill="#111111">Contacto</text>
        <text x="111" y="113" font-family="Arial" font-size="12"
          fill="#777777">en línea</text>
        <path d="M355 91 Q367 79 379 91 Q379 103 367 111
          Q355 103 355 91" fill="none" stroke="#007AFF"
          stroke-width="2.5"/>

        <!-- Fondo del chat -->
        <rect x="0" y="136" width="430" height="${alto - 136}"
          fill="#F5F5F5"/>

        <!-- Mensaje -->
        <rect x="190" y="264" width="222" height="${altoBurbuja}"
          rx="17" fill="#A8ECA0"/>
        ${textoSvg}
        <path d="M391 ${264 + altoBurbuja - 17}
          L411 ${264 + altoBurbuja - 5}
          L391 ${264 + altoBurbuja - 5} Z" fill="#A8ECA0"/>

        <text x="331" y="${264 + altoBurbuja - 12}"
          font-family="Arial" font-size="11" fill="#467A42">
          ${escapar(hora12)} ✓✓
        </text>

        <!-- Barra de escritura -->
        <rect x="0" y="${alto - 65}" width="430" height="65"
          fill="#FFFFFF"/>
        <circle cx="27" cy="${alto - 32}" r="12"
          fill="none" stroke="#777777" stroke-width="2"/>
        <path d="M27 ${alto - 39} V${alto - 25}
          M20 ${alto - 32} H34"
          stroke="#777777" stroke-width="2"/>
        <rect x="52" y="${alto - 51}" width="320" height="39"
          rx="19" fill="#FFFFFF" stroke="#D1D1D1"/>
        <circle cx="394" cy="${alto - 32}" r="13"
          fill="#007AFF"/>
        <path d="M388 ${alto - 32} L400 ${alto - 32}
          M395 ${alto - 37} L400 ${alto - 32}
          L395 ${alto - 27}"
          fill="none" stroke="#FFFFFF" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `

    const imagen = await sharp(Buffer.from(svg))
      .png()
      .toBuffer()

    await conn.sendMessage(
      m.chat,
      {
        image: imagen,
        fileName: 'fakewpp.png',
        caption:
          '📱 *Captura estilo iPhone WhatsApp*\n\n' +
          `💬 *Mensaje:* ${mensaje}\n` +
          `🕒 *Hora de Uruguay:* ${hora12}\n\n` +
          '✨ Captura generada localmente.'
      },
      { quoted: m }
    )
  } catch (error) {
    console.error('[FAKEWPP] Error:', error)

    await conn.reply(
      m.chat,
      '❌ *ERROR AL CREAR LA CAPTURA*\n\n' +
      `🔧 *Detalle:* ${error.message}\n\n` +
      'Verificá que la dependencia sharp esté instalada.',
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
