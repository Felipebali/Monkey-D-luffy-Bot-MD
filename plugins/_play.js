
import yts from 'yt-search'
import axios from 'axios'

const MAX_DURATION_SECONDS = 7 * 60

const cleanText = (text) => {
    if (!text) return ''
    if (typeof text === 'string') return text.trim()
    if (typeof text === 'number') return String(text)
    return String(text).trim()
}

const formatViews = (v) =>
    v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' :
    v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' :
    v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' :
    String(v)

const emitProgress = (msgId, step, extraData = {}) => {
    if (!msgId) return

    queueMicrotask(() => {
        global.broadcast?.('cmd_progress', {
            id: msgId,
            step,
            ...extraData
        })
    })
}

// ============================================================
// EXTRAER URL DE DESCARGA
// ============================================================

const extractDownloadUrl = (data) => {
    if (!data || typeof data !== 'object') return ''

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
        data?.data?.dl,
        data?.data?.url,
        data?.data?.link,
        data?.download?.url,
        data?.download?.link,
        data?.url,
        data?.link
    ]

    for (const candidate of candidates) {
        const url = typeof candidate === 'string'
            ? candidate
            : candidate?.url || candidate?.link

        if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
            return url
        }
    }

    return ''
}

// ============================================================
// CONSULTAR API
// ============================================================

const fetchApiUrl = async (apiUrl) => {
    const { data } = await axios.get(apiUrl, {
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            Accept: 'application/json'
        }
    })

    const downloadUrl = extractDownloadUrl(data)

    if (!downloadUrl) {
        throw new Error('La API no devolvió una URL de descarga válida')
    }

    return downloadUrl
}

// ============================================================
// OBTENER AUDIO CON REINTENTOS
// ============================================================

const getAudioUrlWithRetry = async (videoUrl) => {
    const encoded = encodeURIComponent(videoUrl)

    const apis = [
        `https://api.ryuzei.xyz/download/ytmp3/v4?url=${encoded}`,
        `https://api.ryuzei.xyz/download/ytmp3/v2?url=${encoded}`,
        `https://api.ryuzei.xyz/download/ytmp3/v3?url=${encoded}`
    ]

    let lastError

    for (const api of apis) {
        try {
            const downloadUrl = await fetchApiUrl(api)

            // Comprobar que el enlace realmente responda.
            await axios.get(downloadUrl, {
                timeout: 20000,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            }).then(response => {
                response.data.destroy()
            })

            return downloadUrl

        } catch (error) {
            lastError = error
            console.error('[PLAY] API fallida:', error.message)
        }
    }

    throw lastError || new Error('Ninguna API pudo generar el audio')
}

// ============================================================
// HANDLER
// ============================================================

const handler = async (m, { conn, args, text }) => {
    const msgId = m?.key?.id
    const query = (text || args.join(' ')).trim()

    if (!query) {
        return conn.sendMessage(
            m.chat,
            {
                text: 'ꕤ *Ingresa el título o enlace a buscar* ✰'
            },
            { quoted: m }
        )
    }

    emitProgress(msgId, 'search_started', { query })

    const urlMatch = query.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/
    )

    const searchQuery = urlMatch
        ? `https://youtu.be/${urlMatch[1]}`
        : query

    try {
        // BUSCAR VIDEO
        const searchResult = await yts(searchQuery)

        if (!searchResult?.videos?.length) {
            emitProgress(msgId, 'no_results', { query })

            return conn.sendMessage(
                m.chat,
                {
                    text: `   ׄ  ✿ No se encontraron resultados para *${query}*.`
                },
                { quoted: m }
            )
        }

        const video = searchResult.videos[0]
        const videoId = video.videoId || (urlMatch ? urlMatch[1] : '')

        if (!videoId) {
            throw new Error('No se pudo obtener el ID del video')
        }

        const videoUrl = `https://youtu.be/${videoId}`
        const title = cleanText(video.title) || 'Sin título'
        const channel = cleanText(video.author?.name || video.author) || 'Desconocido'
        const views = typeof video.views === 'number' ? video.views : 0
        const duration = cleanText(video.timestamp || video.duration) || ''

        // COMPROBAR DURACIÓN
        if (video.seconds && video.seconds > MAX_DURATION_SECONDS) {
            return conn.sendMessage(
                m.chat,
                {
                    text: `   ׄ  ✿ El audio dura *${duration}*, superando el límite permitido de *7 minutos*.`
                },
                { quoted: m }
            )
        }

        const thumbnail = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`

        const caption = `﹒𝜗ৎ      ࣪  *${title}*

ׅ  ׄ  ✿ *Canal* » ${channel}
ׅ  ׄ  ✿ *Vistas* » ${formatViews(views)}
ׅ  ׄ  ✿ *Tiempo* » ${duration}
ׅ  ׄ  ✿ *Link* » ${videoUrl}

ׅ  ׄ  ✿ *Descargando audio...*`

        // ENVIAR MINIATURA
        try {
            await conn.sendMessage(
                m.chat,
                {
                    image: { url: thumbnail },
                    caption
                },
                { quoted: m }
            )
        } catch (error) {
            console.error('[PLAY] Error enviando miniatura:', error.message)
            await conn.sendMessage(
                m.chat,
                { text: caption },
                { quoted: m }
            )
        }

        // DESCARGAR AUDIO
        emitProgress(msgId, 'fetching_audio_stream')

        const downloadUrl = await getAudioUrlWithRetry(videoUrl)

        emitProgress(msgId, 'sending_audio_to_whatsapp')

        // ENVIAR AUDIO
        await conn.sendMessage(
            m.chat,
            {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`,
                ptt: false
            },
            { quoted: m }
        )

    } catch (error) {
        console.error('[PLAY] Error:', error.message || error)

        return conn.sendMessage(
            m.chat,
            {
                text: '❌ No se pudo descargar el audio. El servidor de descarga puede estar temporalmente fuera de servicio. Inténtalo nuevamente más tarde.'
            },
            { quoted: m }
        )
    }
}

handler.help = ['play', 'playaudio', 'audio']
handler.tags = ['download']
handler.command = ['play', 'playaudio', 'audio']
handler.group = true

export default handler
