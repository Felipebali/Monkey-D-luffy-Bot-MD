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
 * Sin sharp ni API externa.
 * Requiere ImageMagick (convert) disponible en el sistema.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const ejecutar = promisify(execFile)

const handler = async (m, { conn, text }) => {
  const ctxErr = global.rcanalx || {}
  const ctxWarn = global.rcanalw || {}
  const ctxOk = global.rcanalr || {}

  let archivoSVG
  let archivoPNG

  try {
    if (!text?.trim()) {
      return await conn.reply(
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

    const escapar = valor => String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')

    // Dividir el mensaje en líneas.
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
    const altoBurbuja = Math.max(
      90,
      55 + lineasFinales.length * 26
    )

    const alto = 230 + altoBurbuja + 100

    const textoSVG = lineasFinales.map((lineaTexto, i) =>
      `<text x="205" y="${290 + i * 26}" ` +
      `font-family="Arial,sans-serif" font-size="18" ` +
      `fill="#111111">${escapar(lineaTexto)}</text>`
    ).join('')

    const horaMensajeY =
      290 + lineasFinales.length * 26 + 8

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="430" height="${alto}">
  <rect width="430" height="${alto}" fill="#F2F2F7"/>

  <!-- Barra de estado -->
  <rect width="430" height="55" fill="#FFFFFF"/>
  <text x="25" y="34"
        font-family="Arial" font-size="17"
        font-weight="bold" fill="#111111">${hora}</text>
  <text x="345" y="34"
        font-family="Arial" font-size="15"
        fill="#111111">●●● ▰</text>

  <!-- Encabezado -->
  <rect y="55" width="430" height="72" fill="#FFFFFF"/>
  <path d="M32 81 L20 91 L32 101 M20 91 H43"
        stroke="#007AFF" stroke-width="3" fill="none"/>

  <circle cx="76" cy="91" r="22" fill="#DCE8DF"/>
  <circle cx="76" cy="85" r="8" fill="#FFFFFF"/>
  <path d="M61 103 Q76 84 91 103" fill="#FFFFFF"/>

  <text x="109" y="88"
        font-family="Arial" font-size="17"
        font-weight="bold" fill="#111111">Contacto</text>

  <text x="109" y="107"
        font-family="Arial" font-size="12"
        fill="#777777">en línea</text>

  <text x="365" y="98"
        font-family="Arial" font-size="24"
        fill="#007AFF">☎</text>

  <!-- Fondo del chat -->
  <rect y="127" width="430" height="${alto - 127}"
        fill="#F2F2F7"/>

  <!-- Burbuja del mensaje -->
  <rect x="174" y="245" width="240"
        height="${altoBurbuja}" rx="17"
        fill="#A8ECA0"/>

  ${textoSVG}

  <text x="320" y="${horaMensajeY}"
        font-family="Arial" font-size="11"
        fill="#477B42">${hora} ✓✓</text>

  <!-- Barra de escritura -->
  <rect y="${alto - 66}" width="430" height="66"
        fill="#FFFFFF"/>

  <circle cx="26" cy="${alto - 33}" r="12"
          fill="none" stroke="#888888" stroke-width="2"/>

  <path d="M26 ${alto - 40} V${alto - 26}
           M19 ${alto - 33} H33"
        stroke="#888888" stroke-width="2"/>

  <rect x="48" y="${alto - 52}" width="322"
        height="38" rx="19"
        fill="#FFFFFF" stroke="#CCCCCC"/>

  <circle cx="397" cy="${alto - 33}" r="13"
          fill="#007AFF"/>

  <path d="M391 ${alto - 33} H403
           M398 ${alto - 38} L403 ${alto - 33}
           L398 ${alto - 28}"
        fill="none" stroke="#FFFFFF" stroke-width="2"/>
</svg>`

    // Crear archivos temporales únicos.
    const id = `${Date.now()}-${Math.random()
      .toString(36).slice(2)}`

    archivoSVG = join(tmpdir(), `fakewpp-${id}.svg`)
    archivoPNG = join(tmpdir(), `fakewpp-${id}.png`)

    await writeFile(archivoSVG, svg, 'utf8')

    // Convertir SVG a PNG mediante ImageMagick.
    await ejecutar('convert', [
      archivoSVG,
      '-background',
      '#F2F2F7',
      '-flatten',
      archivoPNG
    ])

    const imagen = await readFile(archivoPNG)

    // Enviar como imagen visible en el chat.
    await conn.sendMessage(
      m.chat,
      {
        image: imagen,
        mimetype: 'image/png',
        fileName: 'fakewpp.png',
        caption:
          '📱 *Captura simulada estilo iPhone WhatsApp*\n\n' +
          `💬 *Mensaje:* ${mensaje}\n` +
          `🕒 *Hora de Uruguay:* ${hora}\n\n` +
          '✨ Captura generada localmente.'
      },
      { quoted: m }
    )

  } catch (error) {
    console.error('[FAKEWPP] Error:', error)

    let detalle = error.message || 'Error desconocido'

    if (error.code === 'ENOENT') {
      detalle =
        'No se encontró ImageMagick (convert) en el servidor Boxmine. ' +
        'Para enviar un PNG real se necesita un conversor disponible.'
    }

    await conn.reply(
      m.chat,
      '❌ *ERROR AL CREAR LA CAPTURA*\n\n' +
      `🔧 *Detalle:* ${detalle}`,
      m,
      ctxErr
    )

  } finally {
    // Eliminar archivos temporales.
    if (archivoSVG) {
      await unlink(archivoSVG).catch(() => {})
    }

    if (archivoPNG) {
      await unlink(archivoPNG).catch(() => {})
    }
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
