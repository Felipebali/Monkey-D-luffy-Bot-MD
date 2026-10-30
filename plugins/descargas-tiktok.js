
import fetch from 'node-fetch'
import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1
    ? baileysMod.default
    : baileysMod

const { generateWAMessageFromContent, generateWAMessage } = pkg

const handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply(`*『 ✙ 』ENLACE INVÁLIDO.*
> Enviá un enlace válido de TikTok.`)
    }

    if (!/tiktok\.com|vt\.tiktok\.com/i.test(text)) {
        return m.reply(`*『 ✙ 』ENLACE INVÁLIDO.*
> Asegurate de que sea de TikTok.`)
    }

    const chatId = m.chat

    await m.reply(`*『 📥 』Descargando de TikTok...*`)

    try {
        const response = await fetch(
            `https://luxinfinity.vercel.app/api/tiktok?url=${encodeURIComponent(text)}`
        )

        const json = await response.json()

        if (!json.status || !json.data) {
            return m.reply(`*『 ❌ 』ERROR.*
> No se pudo obtener respuesta del servidor.`)
        }

        const data = json.data

        const title = data.title || ''
        const author = data.author || data.music?.author || 'Anónimo'
        const music = data.music?.title || 'Sonido original'

        const likes = (data.likes || 0).toLocaleString()
        const comments = (data.comments || 0).toLocaleString()
        const shares = (data.shares || 0).toLocaleString()
        const plays = (data.plays || 0).toLocaleString()

        // ÁLBUM DE IMÁGENES
        if (Array.isArray(data.images) && data.images.length > 0) {
            const caption = `*『 🖼️ 』TIKTOK · ${data.images.length} IMÁGENES*
> 👤 *${author}*
> 📝 ${title}
> 🎵 ${music}
> ❤️ ${likes} · 💬 ${comments} · 🔁 ${shares} · 👁️ ${plays}`

            const album = generateWAMessageFromContent(chatId, {
                albumMessage: {
                    expectedImageCount: data.images.length,
                    contextInfo: {
                        stanzaId: m.key.id,
                        participant: m.key.participant || m.key.remoteJid,
                        quotedMessage: m.message
                    }
                }
            }, {})

            await conn.relayMessage(
                chatId,
                album.message,
                { messageId: album.key.id }
            )

            await Promise.all(data.images.map(async (imgUrl, i) => {
                try {
                    const imgResponse = await fetch(imgUrl)

                    if (!imgResponse.ok) {
                        throw new Error(`Error descargando imagen: ${imgResponse.status}`)
                    }

                    const imgBuf = Buffer.from(
                        await imgResponse.arrayBuffer()
                    )

                    const msg = await generateWAMessage(
                        chatId,
                        {
                            image: imgBuf,
                            caption: i === 0 ? caption : ''
                        },
                        {
                            upload: conn.waUploadToServer
                        }
                    )

                    msg.message.messageContextInfo = {
                        messageAssociation: {
                            associationType: 1,
                            parentMessageKey: album.key
                        }
                    }

                    await conn.relayMessage(
                        chatId,
                        msg.message,
                        { messageId: msg.key.id }
                    )

                } catch (err) {
                    console.error('[TIKTOK] Error enviando imagen:', err)
                }
            }))

            // AUDIO DEL TIKTOK
            if (data.audio) {
                try {
                    const audioResponse = await fetch(data.audio)

                    if (!audioResponse.ok) {
                        throw new Error('No se pudo descargar el audio')
                    }

                    const mp3Buf = Buffer.from(
                        await audioResponse.arrayBuffer()
                    )

                    await conn.sendMessage(
                        chatId,
                        {
                            audio: mp3Buf,
                            mimetype: 'audio/mpeg',
                            ptt: false
                        },
                        { quoted: m }
                    )

                } catch (err) {
                    console.error('[TIKTOK] Error enviando audio:', err)
                }
            }

        } else {
            // VIDEO SIN MARCA DE AGUA
            if (!data?.nowatermark) {
                return m.reply(`*『 ✙ 』SIN VIDEO.*
> No se encontró video en ese enlace.`)
            }

            const captionVid = `*『 🎵 』TIKTOK*
> 👤 *${author}*
> 📝 ${title}
> 🎵 ${music}
> ❤️ ${likes} · 💬 ${comments} · 🔁 ${shares} · 👁️ ${plays}`

            const videoResponse = await fetch(data.nowatermark)

            if (!videoResponse.ok) {
                throw new Error('No se pudo descargar el video')
            }

            const buf = Buffer.from(
                await videoResponse.arrayBuffer()
            )

            await conn.sendMessage(
                chatId,
                {
                    video: buf,
                    mimetype: 'video/mp4',
                    caption: captionVid
                },
                { quoted: m }
            )
        }

    } catch (e) {
        console.error('[TIKTOK] Error:', e)

        return m.reply(`*『 ❌ 』ERROR.*
> Ocurrió un error inesperado. Intentá de nuevo.`)
    }
}

handler.help = ['tt <link>']
handler.command = [
    'ttkdl',
    'tt',
    'tiktok',
    'tiktokdl',
    'ttk'
]
handler.tags = ['descargas']

export default handler
