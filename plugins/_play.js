
/**
 * 📂 plugins/play-audio.js
 * 🤖 WHATSAPP-BOT — PLAY AUDIO
 *
 * 🎵 Búsqueda de canciones en YouTube
 * 🖼️ Miniatura e información
 * 🎧 Descarga y envío de audio
 * 🔄 Tres API de respaldo
 * ⏳ Reacción de espera
 * ✅ Reacción de éxito
 * ❌ Manejo de errores
 * ⏱️ Duración máxima: 7 minutos
 *
 * Comandos:
 * .play
 * .play-audio
 * .pa
 *
 * Baileys ES Modules
 */

import yts from 'yt-search'
import axios from 'axios'

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const MAX_DURATION = 7 * 60
const API_TIMEOUT = 15000

// ============================================================
// 🎭 REACCIONES
// ============================================================

async function react(conn, m, emoji) {
    try {
        await conn.sendMessage(m.chat, {
            react: {
                text: emoji,
                key: m.key
            }
        })
    } catch (error) {
        console.error(
            '[PLAY-AUDIO] Error en reacción:',
            error.message
        )
    }
}

// ============================================================
// 👁️ FORMATEAR VISTAS
// ============================================================

function formatViews(views) {
    const v = Number(views) || 0

    if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B'
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'

    return String(v)
}

// ============================================================
// 🔗 EXTRAER URL DE DESCARGA
// ============================================================

function extractDownloadUrl(data) {
    const candidates = [
        data?.data?.download,
        data?.download,
        data?.dl,
        data?.data?.dl_url,
        data?.data?.download?.url,
        data?.datos?.url,
        data?.result?.download,
        data?.result?.dl,
        data?.result?.url,
        data?.result?.link,
        data?.data?.url,
        data?.data?.link,
        data?.download?.url,
        data?.download?.link,
        data?.url,
        data?.link
    ]

    for (const candidate of candidates) {
        if (
            typeof candidate === 'string' &&
            /^https?:\/\//i.test(candidate)
        ) {
            return candidate
        }

        if (candidate && typeof candidate === 'object') {
            const url =
                candidate.url ||
                candidate.link ||
                candidate.download

            if (
                typeof url === 'string' &&
                /^https?:\/\//i.test(url)
            ) {
                return url
            }
        }
    }

    return ''
}

// ============================================================
// 🌐 CONSULTAR API
// ============================================================

async function fetchApiUrl(apiUrl) {
    const response = await axios.get(apiUrl, {
        timeout: API_TIMEOUT,
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    })

    const downloadUrl = extractDownloadUrl(
        response.data
    )

    if (!downloadUrl) {
        throw new Error(
            'La API no devolvió un enlace de descarga.'
        )
    }

    return downloadUrl
}

// ============================================================
// 🔄 API DE DESCARGA CON RESPALDO
// ============================================================

async function getAudioUrl(videoUrl) {
    const encoded = encodeURIComponent(videoUrl)

    const apis = [
        `https://api.ryuzei.xyz/download/ytmp3/v4?url=${encoded}`,
        `https://api.ryuzei.xyz/download/ytmp3/v2?url=${encoded}`,
        `https://api.ryuzei.xyz/download/ytmp3/v3?url=${encoded}`
    ]

    let lastError

    for (let i = 0; i < apis.length; i++) {
        try {
            console.log(
                `[PLAY-AUDIO] Probando API ${i + 1}/${apis.length}`
            )

            return await fetchApiUrl(apis[i])

        } catch (error) {
            lastError = error

            console.error(
                `[PLAY-AUDIO] API ${i + 1} falló:`,
                error.message
            )
        }
    }

    throw lastError || new Error(
        'Todos los servidores fallaron.'
    )
}

// ============================================================
// 🎵 COMANDO PRINCIPAL
// ============================================================

const handler = async (m, {
    conn,
    text,
    usedPrefix,
    command
}) => {
    try {
        const query = String(text || '').trim()

        // ====================================================
        // 📝 VALIDAR BÚSQUEDA
        // ====================================================

        if (!query) {
            return m.reply(
                `❌ *Necesitás decirme qué canción querés buscar.*

🎵 *Ejemplo:*
${usedPrefix || '.'}${command || 'play'} MC Hariel`
            )
        }

        // ====================================================
        // 🔗 BLOQUEAR ENLACES
        // ====================================================

        if (/https?:\/\//i.test(query)) {
            return m.reply(
                `❌ *No podés utilizar enlaces para descargar canciones.*

🎵 Escribí el nombre de la canción.

📌 *Ejemplo:*
.play MC Hariel`
            )
        }

        // ====================================================
        // ⏳ REACCIÓN DE ESPERA
        // ====================================================

        await react(conn, m, '⏳')

        console.log(
            `[PLAY-AUDIO] Buscando: ${query}`
        )

        // ====================================================
        // 🔎 BUSCAR EN YOUTUBE
        // ====================================================

        const results = await yts(query)

        if (!results?.videos?.length) {
            await react(conn, m, '❌')

            return m.reply(
                '❌ *No se encontraron resultados para esa canción.*'
            )
        }

        const video = results.videos[0]

        const title = video.title || 'Sin título'
        const channel = video.author?.name || 'Desconocido'
        const duration = Number(video.seconds) || 0
        const durationText = video.timestamp || 'Desconocida'
        const views = video.views || 0
        const videoUrl = video.url ||
            `https://youtu.be/${video.videoId}`

        // ====================================================
        // ⏱️ LÍMITE DE DURACIÓN
        // ====================================================

        if (duration > MAX_DURATION) {
            await react(conn, m, '❌')

            return m.reply(
                `❌ *La canción supera el límite permitido.*

🎵 *Título:* ${title}
⏱️ *Duración:* ${durationText}
🚫 *Máximo permitido:* 7 minutos`
            )
        }

        // ====================================================
        // 🖼️ MINIATURA E INFORMACIÓN
        // ====================================================

        const thumbnail =
            video.thumbnail ||
            `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`

        const caption =
            `╭━━〔 🎵 *PLAY AUDIO* 〕━━╮

🎶 *Título:* ${title}

📺 *Canal:* ${channel}
👁️ *Vistas:* ${formatViews(views)}
⏱️ *Duración:* ${durationText}

🔗 *YouTube:* ${videoUrl}

🎧 *Descargando audio...*

╰━━━━━━━━━━━━━━━━━━╯`

        try {
            await conn.sendMessage(
                m.chat,
                {
                    image: {
                        url: thumbnail
                    },
                    caption
                },
                {
                    quoted: m
                }
            )
        } catch (error) {
            console.error(
                '[PLAY-AUDIO] Error enviando miniatura:',
                error.message
            )

            await conn.sendMessage(
                m.chat,
                { text: caption },
                { quoted: m }
            )
        }

        // ====================================================
        // 📥 OBTENER AUDIO
        // ====================================================

        console.log(
            `[PLAY-AUDIO] Obteniendo audio: ${title}`
        )

        const downloadUrl = await getAudioUrl(
            videoUrl
        )

        // ====================================================
        // 🎧 ENVIAR AUDIO
        // ====================================================

        const fileName = String(title)
            .replace(/[\\/:*?"<>|]/g, '')
            .slice(0, 100) + '.mp3'

        await conn.sendMessage(
            m.chat,
            {
                audio: {
                    url: downloadUrl
                },
                mimetype: 'audio/mpeg',
                fileName,
                ptt: false
            },
            {
                quoted: m
            }
        )

        // ====================================================
        // ✅ REACCIÓN DE ÉXITO
        // ====================================================

        await react(conn, m, '✅')

        console.log(
            `[PLAY-AUDIO] Audio enviado: ${title}`
        )

    } catch (error) {
        console.error(
            '[PLAY-AUDIO] Error:',
            error
        )

        await react(conn, m, '❌')

        return m.reply(
            `❌ *No se pudo descargar el audio.*

⚠️ Los servidores de descarga pueden estar temporalmente fuera de servicio.

🔄 Intentá nuevamente más tarde.`
        )
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL HANDLER
// ============================================================

handler.help = [
    'play <canción>',
    'play-audio <canción>',
    'pa <canción>'
]

handler.tags = ['descargas']

handler.command = /^(play|play-audio|pa)$/i

handler.group = true

export default handler
