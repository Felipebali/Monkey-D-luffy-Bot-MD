import fetch from 'node-fetch'

let handler = async (m, { conn, text }) => {

  if (!text) {
    return m.reply("💬 *Usa:* .ia <pregunta>\n\nEjemplo:\n.ia quien gana goku o naruto?")
  }

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
            content: "Eres una IA estilo anime, respondes con frases épicas, divertidas y otaku."
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
      console.log(json)
      return m.reply("❌ Error en IA (revisá consola)")
    }

    let reply = json.choices[0].message.content

    return conn.sendMessage(m.chat, {
      text: `╭━━━〔 🤖 IA FELIXCAT 〕━━━⬣
┃
┃ ${reply}
┃
╰━━━━━━━━━━━━━━━━⬣`,
      mentions: [m.sender]
    })

  } catch (e) {
    console.log(e)
    m.reply("❌ Error conectando con la IA")
  }
}

// 🔥 COMANDO
handler.command = ['ia']

export default handler
