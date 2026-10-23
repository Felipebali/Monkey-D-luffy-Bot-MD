
/**
 * 📂 plugins/detectarsyntax.js
 * 🔍 WHATSAPP-BOT — ANALIZADOR DE SINTAXIS
 *
 * Comandos:
 * .detectarsyntax
 * .detectar
 *
 * Permisos: Owner principal
 *
 * Comprueba la sintaxis de los plugins sin importarlos
 * ni ejecutar su código.
 */

import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { spawn } from 'child_process'

const PLUGINS_DIR = path.resolve('./plugins')
const MAX_MENSAJE = 3500

const handler = async (m, { conn }) => {
  let proceso

  try {
    if (!fs.existsSync(PLUGINS_DIR)) {
      return conn.sendMessage(m.chat, {
        text: '❌ No se encontró la carpeta de plugins.'
      })
    }

    await m.react('🕒').catch(() => {})
    await conn.sendPresenceUpdate('composing', m.chat).catch(() => {})

    const archivos = fs.readdirSync(PLUGINS_DIR, {
      withFileTypes: true
    })
      .filter(item => item.isFile() && item.name.endsWith('.js'))
      .map(item => item.name)
      .sort((a, b) => a.localeCompare(b))

    if (!archivos.length) {
      await m.react('⚠️').catch(() => {})
      return conn.sendMessage(m.chat, {
        text: '⚠️ No se encontraron archivos .js en la carpeta plugins.'
      })
    }

    const errores = []
    let revisados = 0

    /*
     * Usar --check en un proceso independiente evita importar
     * los plugins en el proceso principal del bot.
     */
    const comprobarArchivo = (archivo) => new Promise(resolve => {
      const ruta = path.join(PLUGINS_DIR, archivo)

      proceso = spawn(
        process.execPath,
        ['--check', ruta],
        {
          stdio: ['ignore', 'ignore', 'pipe'],
          windowsHide: true
        }
      )

      let stderr = ''
      let finalizado = false

      const terminar = resultado => {
        if (finalizado) return
        finalizado = true
        proceso = null
        resolve(resultado)
      }

      proceso.stderr.setEncoding('utf8')

      proceso.stderr.on('data', chunk => {
        stderr += chunk
      })

      proceso.on('error', error => {
        terminar({
          archivo,
          error: `No se pudo ejecutar el verificador: ${error.message}`
        })
      })

      proceso.on('close', codigo => {
        if (codigo === 0) {
          terminar(null)
          return
        }

        const lineas = stderr.trim().split('\n')
        const ultimaUbicacion = stderr.match(/:(\d+)(?::(\d+))?/)

        terminar({
          archivo,
          linea: ultimaUbicacion?.[1] || 'No identificada',
          columna: ultimaUbicacion?.[2] || 'No identificada',
          error: lineas.slice(-8).join('\n') || `Proceso finalizado con código ${codigo}`
        })
      })
    })

    for (const archivo of archivos) {
      const resultado = await comprobarArchivo(archivo)
      revisados++

      if (resultado) errores.push(resultado)
    }

    const correctos = revisados - errores.length

    const lineas = [
      '╭━━━〔 🔍 ANALIZADOR DE SINTAXIS 〕━━━⬣',
      '',
      '🤖 *WHATSAPP-BOT | INFORME DE REVISIÓN*',
      '',
      `📂 *Directorio:* plugins/`,
      `📄 *Archivos revisados:* ${revisados}`,
      `✅ *Sin errores de sintaxis:* ${correctos}`,
      `❌ *Con errores:* ${errores.length}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━'
    ]

    if (!errores.length) {
      lineas.push(
        '',
        '✅ *REVISIÓN COMPLETADA*',
        '',
        'No se detectaron errores de sintaxis en los archivos revisados.',
        '',
        'ℹ️ Esta comprobación no garantiza que los plugins funcionen correctamente durante la ejecución.'
      )
    } else {
      lineas.push('', '❌ *ERRORES DETECTADOS*', '')

      for (const error of errores) {
        lineas.push(
          `📄 *Archivo:* ${error.archivo}`,
          `📍 *Línea:* ${error.linea}`,
          `📌 *Columna:* ${error.columna}`,
          '```',
          error.error.slice(0, 1200),
          '```',
          '━━━━━━━━━━━━━━━━━━━━',
          ''
        )
      }
    }

    lineas.push('', '🔧 _WHATSAPP-BOT | Herramientas de diagnóstico_')

    let respuesta = lineas.join('\n')

    if (respuesta.length > MAX_MENSAJE) {
      respuesta = respuesta.slice(0, MAX_MENSAJE - 100) +
        '\n\n⚠️ Informe recortado por límite de longitud. Consulta la consola para más detalles.'
    }

    await conn.sendMessage(m.chat, {
      text: respuesta
    })

    await m.react(errores.length ? '❌' : '✅').catch(() => {})

    if (errores.length) {
      console.error('[WHATSAPP-BOT | DETECTAR SINTAXIS]', errores)
    }

  } catch (error) {
    if (proceso) {
      proceso.kill()
      proceso = null
    }

    console.error('[WHATSAPP-BOT | ANALIZADOR]', error)

    await m.react('❌').catch(() => {})

    return conn.sendMessage(m.chat, {
      text: `❌ No se pudo completar el análisis.\n\nMotivo: ${String(error.message || error).slice(0, 1000)}`
    }).catch(() => {})
  }
}

handler.command = ['detectarsyntax', 'detectar']
handler.help = ['detectarsyntax', 'detectar']
handler.tags = ['tools']
handler.rowner = true

export default handler
