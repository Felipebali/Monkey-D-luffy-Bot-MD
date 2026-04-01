import fetch from 'node-fetch'

let handler = async (m, { conn }) => {

  // 📌 Detectar si mencionan al bot
  const botNumber = conn.user.jid

  const mentioned = m.mentionedJid || []
  const isMentioned = mentioned.includes(botNumber)

  if (!isMentioned) return

  // 🧠 Obtener texto (sin la mención)
  let text = m.text.replace(/@\d+/g, '').trim()

  if (!text) return m.reply("💬 Preguntame algo...")

  try {

    // 🔥 LLAMADA A OPENAI
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "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",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Responde como un personaje anime, divertido, épico y con estilo otaku."
          },
          {
            role: "user",
            content: text
          }
        ]
      })
    })

    const json = await res.json()

    let reply = json.choices?.[0]?.message?.content || "❌ Error IA"

    return conn.sendMessage(m.chat, {
      text: `🤖 *IA FelixCat*\n\n${reply}`,
      mentions: [m.sender]
    })

  } catch (e) {
    console.log(e)
    m.reply("❌ Error conectando con la IA")
  }
}

handler.all = true

export default handler
