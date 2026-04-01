import fetch from 'node-fetch'

let handler = async (m, { conn }) => {

  const botNumber = "59892379658@s.whatsapp.net"

  // ✅ DETECTA MENCIÓN REAL
  const isMentioned = m.text.includes('@' + botNumber.split('@')[0])

  if (!isMentioned) return

  let text = m.text.replace(/@\d+/g, '').trim()

  if (!text) return m.reply("💬 *Invócame... humano*")

  try {

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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", // 🔥 CAMBIAR
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Eres un espíritu anime épico, hablas con estilo otaku, divertido, intenso y con frases tipo shonen."
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
      return m.reply("❌ Error en IA (ver consola)")
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

handler.all = true

export default handler
