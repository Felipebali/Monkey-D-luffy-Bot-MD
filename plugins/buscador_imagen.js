const handler = async (m, { conn, text }) => {

  if (!text) return conn.reply(m.chat, "❌ Escribe qué imagen buscar", m);

  await m.react("📷");

  try {
    const query = encodeURIComponent(text);

    // 📸 Imagen random basada en búsqueda
    const url = `https://source.unsplash.com/900x700/?${query}`;

    await conn.sendFile(
      m.chat,
      url,
      "imagen.jpg",
      `*Resultado de:* ${text}`,
      m
    );

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
