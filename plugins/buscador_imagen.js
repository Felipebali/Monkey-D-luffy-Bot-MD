import fetch from "node-fetch";

const handler = async (m, { conn, text }) => {
  if (!text) return conn.reply(m.chat, "❌ Escribe algo", m);

  await m.react("📷");

  try {
    const query = encodeURIComponent(text);

    // 1️⃣ Obtener vqd
    const res1 = await fetch(`https://duckduckgo.com/?q=${query}`, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await res1.text();

    const vqdMatch = html.match(/vqd='(.*?)'/);
    if (!vqdMatch) throw "No se pudo obtener vqd";

    const vqd = vqdMatch[1];

    // 2️⃣ Pedir imágenes
    const res2 = await fetch(`https://duckduckgo.com/i.js?q=${query}&vqd=${vqd}&o=json`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://duckduckgo.com/"
      }
    });

    const data = await res2.json();

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

  } catch (err) {
    console.error(err);
    conn.reply(m.chat, "❌ Error al buscar imagen.", m);
  }
};

handler.command = ["imagen"];
export default handler;
