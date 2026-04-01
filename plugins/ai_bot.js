import fetch from 'node-fetch'

let handler = async (m, { conn }) => {

  const botNumber = "59892379658@s.whatsapp.net"

  // 🧠 TEXTO SEGURO
  let text = m.message?.conversation || m.text || ''

  if (!text) return

  // 🔥 DETECCIÓN PRO
  const mentioned = m.mentionedJid || []
  const isMentioned = mentioned.includes(botNumber)
  const isMentionText = text.includes('@' + botNumber.split('@')[0])

  if (!isMentioned && !isMentionText) return

  // 🧹 LIMPIAR MENCIÓN
  text = text.replace(/@\d+/g, '').trim()

  if (!text) return m.reply("💬 *Háblame... invócame*")

  try {

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer import fetch from 'node-fetch'

let handler = async (m, { conn }) => {

  const botNumber = "59892379658@s.whatsapp.net"

  // 🧠 TEXTO SEGURO
  let text = m.message?.conversation || m.text || ''

  if (!text) return

  // 🔥 DETECCIÓN PRO
  const mentioned = m.mentionedJid || []
  const isMentioned = mentioned.includes(botNumber)
  const isMentionText = text.includes('@' + botNumber.split('@')[0])

  if (!isMentioned && !isMentionText) return

  // 🧹 LIMPIAR MENCIÓN
  text = text.replace(/@\d+/g, '').trim()

  if (!text) return m.reply("💬 *Háblame... invócame*")

  try {

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Eres un espíritu anime poderoso, respondes con estilo épico, otaku, divertido y shonen."
          },
          {
            role: "user",
            content: text
          }
        ]
      })
    })

    const json = await res.json()

    if (!json.choices) {
      console.log("ERROR IA:", json)
      return m.reply("❌ Error IA (mirá la consola)")
    }

    let reply = json.choices[0].message.content

    return conn.sendMessage(m.chat, {
      text: `╭━━━〔 🤖 IA FELIXCAT 〕━━━⬣
┃ ${reply}
╰━━━━━━━━━━━━━━━━⬣`,
      mentions: [m.sender]
    })

  } catch (e) {
    console.log("ERROR FETCH:", e)
    m.reply("❌ Error conectando con IA")
  }
}

// 🔥 ESTO ES CLAVE
handler.command = /.*/

export default handler",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Eres un espíritu anime poderoso, respondes con estilo épico, otaku, divertido y shonen."
          },
          {
            role: "user",
            content: text
          }
        ]
      })
    })

    const json = await res.json()

    if (!json.choices) {
      console.log("ERROR IA:", json)
      return m.reply("❌ Error IA (mirá la consola)")
    }

    let reply = json.choices[0].message.content

    return conn.sendMessage(m.chat, {
      text: `╭━━━〔 🤖 IA FELIXCAT 〕━━━⬣
┃ ${reply}
╰━━━━━━━━━━━━━━━━⬣`,
      mentions: [m.sender]
    })

  } catch (e) {
    console.log("ERROR FETCH:", e)
    m.reply("❌ Error conectando con IA")
  }
}

// 🔥 ESTO ES CLAVE
handler.command = /.*/

export default handler
