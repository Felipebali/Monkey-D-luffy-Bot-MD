
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
    v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(v)

const emitProgress = (msgId, step, extraData = {}) => {
    queueMicrotask(() => {
        global.broadcast?.('cmd_progress', {
            id: msgId,
            step,
            ...extraData
        })
    })
}

const extractDownloadUrl = (data) => {
    const candidate =
        data?.data?.download ||
        data?.download ||
        data?.dl ||
        data?.data?.dl_url ||
        data?.data?.download?.url ||
        data?.datos?.url ||
        data?.result?.download ||
        data?.result?.dl ||
        data?.result?.url ||
        data?.result?.link ||
        data?.data?.dl ||
        data?.data?.url ||
        data?.data?.link ||
        (typeof data?.download === 'object'
            ? data?.download?.url || data?.download?.link
            : null) ||
        data?.url ||
        data?.link

    return typeof candidate === 'string' && candidate.startsWith('http')
        ? candidate
        : ''
}

const fetchApiUrl = (apiUrl) => {
    return axios.get(apiUrl, {
        timeout: 10000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    }).then(res => {
        const dlUrl = extractDownloadUrl(res.data)
        if (!dlUrl) throw new Error('Sin URL')
        return dlUrl
    })
}

const getAudioUrlWithRetry = (videoUrl) => {
    const encoded = encodeURIComponent(videoUrl)

    const apis = [
        `https://api.ryuzei.xyz/download/ytmp3/v4?url=${encoded}`,
        `https://api.ryuzei.xyz/download/ytmp3/v2?url=${encoded}`,
        `https://api.ryuzei.xyz/download/ytmp3/v3?url=${encoded}`
    ]

    return fetchApiUrl(apis[0])
        .catch(() => fetchApiUrl(apis[1]))
        .catch(() => fetchApiUrl(apis[2]))
}

const handler = async (m, { conn, text, usedPrefix }) => {
    const query = (text || '').trim()
    const msgId = m?.key?.id

    if (!query) {
        return conn.sendMessage(
            m.chat,
            {
                text: `ꕤ *Ingresa el título o enlace a buscar* ✰`
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

    yts(searchQuery)
        .then(searchResult => {
            if (!searchResult?.videos?.length) {
                emitProgress(msgId, 'no_results', { query })

                return conn.sendMessage(
                    m.chat,
                    {
                        text: `   ׄ  ✿ No se encontraron resultados para **${query}**.`
                    },
                    { quoted: m }
                )
            }

            const video = searchResult.videos[0]
            const videoId = video.videoId || (urlMatch ? urlMatch[1] : '')
            const videoUrl = `https://youtu.be/${videoId}`
            const title = cleanText(video.title) || 'Sin título'
            const channel = cleanText(video.author?.name || video.author) || 'Desconocido'
            const views = typeof video.views === 'number' ? video.views : 0
            const duration = cleanText(video.timestamp || video.duration) || ''

            if (video.seconds && video.seconds > MAX_DURATION_SECONDS) {
                return conn.sendMessage(
                    m.chat,
                    {
                        text: `   ׄ  ✿ El audio dura **${duration}**, superando el límite permitido de **7 minutos**.`
                    },
                    { quoted: m }
                )
            }

            const mqThumbUrl = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`

            const caption =
                `﹒𝜗ৎ      ࣪  *${title}*\n\n` +
                `ׅ  ׄ  ✿ *Canal* » ${channel}\n` +
                `ׅ  ׄ  ✿ *Vistas* » ${formatViews(views)}\n` +
                `ׅ  ׄ  ✿ *Tiempo* » ${duration}\n` +
                `ׅ  ׄ  ✿ *Link* » ${videoUrl}\n\n` +
                `ׅ  ׄ  ✿ *Descargando audio...*`

            conn.sendMessage(
                m.chat,
                {
                    image: { url: mqThumbUrl },
                    caption
                },
                { quoted: m }
            ).catch(() => {})

            emitProgress(msgId, 'fetching_audio_stream')

            return getAudioUrlWithRetry(videoUrl).then(downloadUrl => {
                emitProgress(msgId, 'sending_audio_to_whatsapp')

                return conn.sendMessage(
                    m.chat,
                    {
                        audio: { url: downloadUrl },
                        mimetype: 'audio/mpeg',
                        fileName: `${title}.mp3`,
                        ptt: false
                    },
                    { quoted: m }
                )
            })
        })
        .catch(() => {})
}

handler.help = ['play', 'playaudio', 'audio']
handler.tags = ['download']
handler.command = ['play', 'playaudio', 'audio']

export default handler
