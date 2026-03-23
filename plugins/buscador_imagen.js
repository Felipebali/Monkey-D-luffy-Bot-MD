const handler = async (m, { conn, text }) => {

  if (!text) return conn.reply(m.chat, "❌ Escribe qué imagen buscar", m);

  await m.react("📷");

  try {
    const query = encodeURIComponent(text);

    const url = `https://source.unsplash.com/900x700/?${query}`;

    await conn.sendMessage(m.chat, {
      image: { url },
      caption: `*Resultado de:* ${text}`
    }, { quoted: m });

  } catch (e) {
    console.error(e);
    conn.reply(m.chat, "❌ Error al buscar imagen", m);
  }
};

handler.help = ["imagen <texto>"];
handler.tags = ["tools"];
handler.command = ["imagen", "foto", "img"];

handler.group = true;
handler.botAdmin = false;

export default handler;
