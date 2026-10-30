
import yts from 'yt-search'
import axios from 'axios'

const MAX_DURATION_SECONDS = 7 * 60
const COOLDOWN_SECONDS = 300
const cooldowns = new Map()

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
    String(v || 0)

const formatDuration = (seconds) => {
    const n = Number(seconds) || 0
    const minutes = Math.floor(n / 60)
    const secs = n % 60
    return `${minutes}:${String(secs).padStart(2, '0')}`
}

const react = async (conn, m, emoji) => {
    try {
        await conn.sendMessage(m.chat, {
            react: { text: emoji, key: m.key }
        })
    } catch {}
}

const isOwner = (m, conn) => {
    const sender = conn.decodeJid(m.sender)
    const bot = conn.decodeJid(conn.user?.id || '')
    const owners = (global.owner || []).map(owner =>
        conn.decodeJid(typeof owner === 'string' ? owner : owner[0])
    )

    return owners.includes(sender) || sender === bot || m.fromMe
}

const isAdmin = async (m, conn) => {
    if (!m.isGroup) return false

    try {
        const metadata = await conn.groupMetadata(m.chat)
        const participant = metadata.participants.find(
            p => conn.decodeJid(p.id) === conn.decodeJid(m.sender)
        )
        return participant?.admin === 'admin' ||
               participant?.admin === 'superadmin'
    } catch {
        return false
    }
}

const getAudioBuffer = async (url) => {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024
    })

    return Buffer.from(response.data)
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const sender = conn.decodeJid(m.sender)
    const privileged = isOwner(m, conn) || await isAdmin(m, conn)

    if (!privileged) {
        const now = Date.now()
        const lastUse = cooldowns.get(sender) || 0
        const remaining = Math.ceil(
            (COOLDOWN_SECONDS * 1000 - (now - lastUse)) / 1000
        )

        if (remaining > 0) {
            await react(conn, m, '⏳')
            return m.reply(
                `⏳ Debes esperar *${formatDuration(remaining)}* antes de volver a usar ${usedPrefix + command}.`
            )
        }

        cooldowns.set(sender, now)
    }

    if (!text) {
        await react(conn, m, '❌')
        return m.reply(
            `🎵 Escribe el nombre de una canción.\n\nEjemplo: ${usedPrefix + command} Imagine Dragons Believer`
        )
    }

    try {
        await react(conn, m, '🎧')

        const search = await yts(text)
        const video = search.videos?.[0]

        if (!video) {
            await react(conn, m, '❌')
            return m.reply('❌ No encontré resultados para esa búsqueda.')
        }

        const duration = Number(video.seconds) || 0

        if (duration > MAX_DURATION_SECONDS) {
            await react(conn, m, '❌')
            return m.reply(
                `❌ El audio supera el límite de ${formatDuration(MAX_DURATION_SECONDS)}.`
            )
        }

        const title = cleanText(video.title)
        const url = video.url

        const apis = [
            `https://api.delirius.online/download/ytmp3?url=${encodeURIComponent(url)}`,
            `https://api.starlights.uk/api/download/ytmp3?url=${encodeURIComponent(url)}`,
            `https://api.starlights.uk/api/download/ytmp3v2?url=${encodeURIComponent(url)}`
        ]

        let audioUrl = null

        for (const api of apis) {
            try {
                const { data } = await axios.get(api, {
                    timeout: 30000
                })

                audioUrl =
                    data?.data?.download?.url ||
                    data?.data?.url ||
                    data?.result?.url ||
                    data?.url ||
                    data?.download?.url ||
                    null

                if (audioUrl) break
            } catch (e) {
                console.error('Error API:', e.message)
            }
        }

        if (!audioUrl) {
            await react(conn, m, '❌')
            return m.reply('❌ No pude obtener el enlace de descarga del audio.')
        }

        const audioBuffer = await getAudioBuffer(audioUrl)

        if (!audioBuffer || audioBuffer.length < 1000) {
            await react(conn, m, '❌')
            return m.reply('❌ El archivo de audio llegó vacío o incompleto.')
        }

        await conn.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: 'audio.mp3',
            ptt: false
        }, { quoted: m })

        await react(conn, m, '✅')

    } catch (error) {
        console.error('Error en play:', error)
        await react(conn, m, '❌')
        return m.reply('❌ Ocurrió un error al procesar el audio. Intenta nuevamente.')
    }
}

handler.help = ['play', 'playaudio', 'audio']
handler.tags = ['downloader']
handler.command = ['play', 'playaudio', 'audio']
handler.group = true

export default handler
