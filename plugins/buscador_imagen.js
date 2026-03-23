import fetch from "node-fetch";

const handler = async (m, { conn, text }) => {
  if (!text) return conn.reply(m.chat, "❌ Escribe algo", m);

  await m.react("📷");

  try {
    const res = await fetch(`https://duckduckgo.com/i.js?q=${encodeURIComponent(text)}&o=json`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://duckduckgo.com/"
      }
    });

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      return conn.reply(m.chat, "❌ No hubo resultados", m);
    }

    const img = data.results[Math.floor(Math.random() * data.results.length)];

    await conn.sendFile(
      m.chat,
      img.image,
      "img.jpg",
      `*Resultado de:* ${text}`,
      m
    );

  } catch (e) {
    console.log(e);
    conn.reply(m.chat, "❌ Error", m);
  }
};

handler.command = ["imagen"];
export default handler;
