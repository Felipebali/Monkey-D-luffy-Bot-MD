
import fetch from 'node-fetch'
import axios from 'axios'
import yts from 'yt-search'

// Carga opcional: si la librería no está instalada o falla,
// el comando igual carga.
const { youtubedl, youtubedlv2 } = await import('@bochilteam/scraper').catch(() => ({}))

import ytdl from 'ytdl-core'
import { bestFormat, getUrlDl } from '../lib/y2dl.js'
import YTDL from '../lib/ytdll.js'
import fs from 'fs'

let limit1 = 100
let limit2 = 400
let limit_a1 = 50
let limit_a2 = 400

const handler = async (m, { conn, command, args, text, usedPrefix }) => {
  if (!text) {
    throw `> ⓘ 𝙄𝙣𝙜𝙧𝙚𝙨𝙚 𝙚𝙡 𝙣𝙤𝙢𝙗𝙧𝙚 𝙙𝙚 𝙡𝙖 𝙘𝙖𝙣𝙘𝙞𝙤𝙣 𝙦𝙪𝙚 𝙦𝙪𝙞𝙚𝙧𝙚`
  }

  try {
    const yt_play = await search(args.join(' '))

    if (!yt_play.length) {
      throw '> ⓘ No se encontraron resultados.'
    }

    let additionalText = ''

    if (command === 'play') {
      additionalText = 'audio'
    } else if (command === 'youtube') {
      additionalText = 'video'
    }

    await conn.sendMessage(m.chat, {
      react: {
        text: '✅',
        key: m.key
      }
    })

    const texto1 = `♡₊˚ ₊✧♡₊˚ 📎・₊✧★🎸🎧°⋆♡₊˚ 🛰️
> ⓘ 𝙏𝙄𝙏𝙐𝙇𝙊/𝙉𝙊𝙈𝘽𝙍𝙀:
> • ${yt_play[0].title}
> •┄┄┄┄┄┄┄┄┄┄┄┄•
> ⓘ 𝙋𝙐𝘽𝙇𝙄𝘾𝘼𝘿𝙊 𝙀𝙉:
> • ${yt_play[0].ago}
> •┄┄┄┄┄┄┄┄┄┄┄┄•
> ⓘ 𝙇𝙄𝙉𝙆/𝙀𝙉𝙇𝘼𝘾𝙀:
> • ${yt_play[0].url}
♡₊˚ 🛰️₊✧♡₊˚ 📎・₊✧★🎸🎧°⋆♡₊˚ 📎
01:06 ======⬤------------------------- ${secondString(yt_play[0].duration.seconds)}
               ⇆ㅤ ◁ㅤ❚❚ㅤ▷ㅤ ↻

> *_Enviando ${additionalText}, Aguarde Un Momento..._*`

    await conn.sendMessage(
      m.chat,
      {
        image: { url: yt_play[0].thumbnail },
        caption: texto1
      },
      { quoted: m }
    )

    // ========================================================
    // 🎵 DESCARGAR AUDIO
    // ========================================================

    if (command === 'play') {
      try {
        const q = '128kbps'
        const v = yt_play[0].url

        const yt = await youtubedl(v).catch(
          async () => await youtubedlv2(v)
        )

        const dl_url = await yt.audio[q].download()
        const ttl = await yt.title

        const sex = await getBuffer(dl_url)

        const fileSizeInBytes = sex.byteLength
        const fileSizeInKB = fileSizeInBytes / 1024
        const fileSizeInMB = fileSizeInKB / 1024
        const size = fileSizeInMB.toFixed(2)

        if (size >= limit_a2) {
          await conn.sendMessage(
            m.chat,
            {
              text: `> ⓘ 𝙋𝙪𝙚𝙙𝙚 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙧 𝙨𝙪 𝙖𝙪𝙙𝙞𝙤 𝙚𝙣: ${dl_url}*`
            },
            { quoted: m }
          )
          return
        }

        if (size >= limit_a1 && size <= limit_a2) {
          await conn.sendMessage(
            m.chat,
            {
              document: sex,
              mimetype: 'audio/mpeg',
              fileName: ttl + '.mp3'
            },
            { quoted: m }
          )
          return
        } else {
          await conn.sendMessage(
            m.chat,
            {
              audio: sex,
              mimetype: 'audio/mpeg',
              fileName: ttl + '.mp3'
            },
            { quoted: m }
          )
          return
        }

      } catch (error) {
        console.log('[PLAY] Primer método falló:', error)

        try {
          const info = await ytdl.getInfo(yt_play[0].videoId)

          const format = ytdl.chooseFormat(info.formats, {
            quality: 'highestaudio'
          })

          const stream = ytdl.downloadFromInfo(info, {
            format
          })

          const bufs = []

          stream.on('data', chunk => {
            bufs.push(chunk)
          })

          stream.on('end', async () => {
            try {
              const buff = Buffer.concat(bufs)

              await conn.sendMessage(
                m.chat,
                {
                  audio: buff,
                  fileName: yt_play[0].title + '.mp3',
                  mimetype: 'audio/mpeg'
                },
                { quoted: m }
              )
            } catch (err) {
              console.error('[PLAY] Error enviando audio:', err)
            }
          })

          stream.on('error', async error => {
            console.error('[PLAY] Error en stream:', error)

            try {
              await YTDL.mp3(yt_play[0].url).then(async s => {
                await conn.sendMessage(
                  m.chat,
                  {
                    audio: fs.readFileSync(s.path),
                    mimetype: 'audio/mpeg',
                    fileName: `${s.meta.title || '-'}.mp3`
                  },
                  { quoted: m }
                )

                await fs.promises.unlink(s.path)
              })
            } catch (err) {
              console.error('[PLAY] Último método falló:', err)
              await m.reply('❌ No fue posible descargar el audio.')
            }
          })

        } catch (error2) {
          console.log('[PLAY] Segundo método falló:', error2)

          try {
            const s = await YTDL.mp3(yt_play[0].url)

            await conn.sendMessage(
              m.chat,
              {
                audio: fs.readFileSync(s.path),
                mimetype: 'audio/mpeg',
                fileName: `${s.meta.title || '-'}.mp3`
              },
              { quoted: m }
            )

            await fs.promises.unlink(s.path)

          } catch (error3) {
            console.error('[PLAY] Error final:', error3)
            await m.reply('❌ No fue posible descargar el audio.')
          }
        }
      }
    }

    // ========================================================
    // 🎥 DESCARGAR VIDEO
    // ========================================================

    if (command === 'youtube') {
      try {
        const qu = '360'
        const q = qu + 'p'
        const v = yt_play[0].url

        const yt = await youtubedl(v).catch(
          async () => await youtubedlv2(v)
        )

        const dl_url = await yt.video[q].download()
        const ttl = await yt.title

        const sex = await getBuffer(dl_url)

        const fileSizeInBytes = sex.byteLength
        const fileSizeInKB = fileSizeInBytes / 1024
        const fileSizeInMB = fileSizeInKB / 1024
        const size = fileSizeInMB.toFixed(2)

        if (size >= limit2) {
          await conn.sendMessage(
            m.chat,
            {
              text: `> ⓘ 𝙋𝙪𝙚𝙙𝙚 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖𝙧 𝙨𝙪 𝙫𝙞𝙙𝙚𝙤 𝙚𝙣: ${dl_url}*`
            },
            { quoted: m }
          )
          return
        }

        if (size >= limit1 && size <= limit2) {
          await conn.sendMessage(
            m.chat,
            {
              document: sex,
              mimetype: 'video/mp4',
              fileName: ttl + '.mp4'
            },
            { quoted: m }
          )
          return
        } else {
          await conn.sendMessage(
            m.chat,
            {
              video: sex,
              mimetype: 'video/mp4',
              fileName: ttl + '.mp4'
            },
            { quoted: m }
          )
          return
        }

      } catch (error) {
        console.log('[YOUTUBE] Primer método falló:', error)

        try {
          const formats = await bestFormat(
            yt_play[0].url,
            'video'
          )

          const buff = await getBuffer(formats.url)

          const ttl_1 = yt_play[0].title
            ? yt_play[0].title
            : 'Tu_video_descargado'

          await conn.sendMessage(
            m.chat,
            {
              video: buff,
              fileName: ttl_1 + '.mp4',
              mimetype: 'video/mp4'
            },
            { quoted: m }
          )

        } catch (error2) {
          console.error('[YOUTUBE] Segundo método falló:', error2)

          await m.reply(
            '❌ No fue posible descargar el video.'
          )
        }
      }
    }

  } catch (error) {
    console.log('[PLAY/YOUTUBE] Error:', error)

    throw '> ⓘ 𝙊𝙘𝙪𝙧𝙧𝙞𝙤 𝙪𝙣 𝙚𝙧𝙧𝙤𝙧 𝙚𝙣 𝙡𝙖 𝙙𝙚𝙨𝙘𝙖𝙧𝙜𝙖, 𝙥𝙤𝙧 𝙛𝙖𝙫𝙤𝙧, 𝙫𝙪𝙚𝙡𝙫𝙖 𝙖 𝙞𝙣𝙩𝙚𝙣𝙩𝙖𝙧𝙡𝙤.'
  }
}

// ============================================================
// ⚙️ CONFIGURACIÓN DEL HANDLER
// ============================================================

handler.help = ['play', 'youtube'].map(v => v + ' <busqueda>')
handler.tags = ['downloader']
handler.command = /^(play|youtube)$/i
handler.register = true

export default handler

// ============================================================
// 🔎 BUSCAR EN YOUTUBE
// ============================================================

async function search(query, options = {}) {
  const result = await yts.search({
    query,
    hl: 'es',
    gl: 'ES',
    ...options
  })

  return result.videos
}

// ============================================================
// 🔢 FORMATEAR NÚMEROS
// ============================================================

function MilesNumber(number) {
  const exp = /(\d)(?=(\d{3})+(?!\d))/g
  const rep = '$1.'
  const arr = number.toString().split('.')

  arr[0] = arr[0].replace(exp, rep)

  return arr[1] ? arr.join('.') : arr[0]
}

// ============================================================
// ⏱️ FORMATEAR DURACIÓN
// ============================================================

function secondString(seconds) {
  seconds = Number(seconds)

  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const dDisplay = d > 0
    ? d + (d == 1 ? ' día, ' : ' días, ')
    : ''

  const hDisplay = h > 0
    ? h + (h == 1 ? ' hora, ' : ' horas, ')
    : ''

  const mDisplay = m > 0
    ? m + (m == 1 ? ' minuto, ' : ' minutos, ')
    : ''

  const sDisplay = s > 0
    ? s + (s == 1 ? ' segundo' : ' segundos')
    : ''

  return dDisplay + hDisplay + mDisplay + sDisplay
}

// ============================================================
// 📦 FORMATEAR TAMAÑO
// ============================================================

function bytesToSize(bytes) {
  return new Promise((resolve, reject) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

    if (bytes === 0) return resolve('n/a')

    const i = parseInt(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      10
    )

    if (i === 0) resolve(`${bytes} ${sizes[i]}`)

    resolve(`${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`)
  })
}

// ============================================================
// 📥 OBTENER BUFFER
// ============================================================

const getBuffer = async (url, options) => {
  const res = await axios({
    method: 'get',
    url,
    headers: {
      DNT: 1,
      'Upgrade-Insecure-Request': 1
    },
    ...options,
    responseType: 'arraybuffer'
  })

  return res.data
}
