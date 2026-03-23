import fetch from "node-fetch";

const handler = async (m, { conn, text, isOwner, chat = {} }) => {

  if (!text) return conn.reply(m.chat, '❌ Debes escribir qué imagen buscar.', m);

  // 🔞 Filtro adultMode
  if (!chat.adultMode && m.isGroup && !isOwner) {
    const prohibited = ["caca", "polla", "gay", "hombres cogiendo", "mía malkova", "mia malkova", "hombres gay", "fisting", "porno", "porn", "gore", "cum", "semen", "puta", "puto", "culo", "putita", "putito", "pussy", "hentai", "pene", "coño", "asesinato", "zoofilia", "mia khalifa", "desnudo", "desnuda", "cuca", "chocha", "muertos", "pornhub", "xnxx", "xvideos", "teta", "vagina", "marsha may", "misha cross", "sexmex", "furry", "furro", "furra", "xxx", "rule34", "panocha", "pedofilia", "necrofilia", "pinga", "horny", "ass", "nude", "popo", "nsfw", "femdom", "futanari", "erofeet", "sexo", "sex", "yuri", "ero", "ecchi", "blowjob", "anal", "ahegao", "pija", "verga", "trasero", "violation", "violacion", "bdsm", "cachonda", "+18", "cp", "mia marin", "lana rhoades", "cepesito", "hot", "buceta", "xxx"];

    const normalizedText = text.replace(/\s+/g, "").toLowerCase();

    if (prohibited.some(word => normalizedText.includes(word.replace(/\s+/g, "")))) {
      await m.react("⚠️");
      return conn.sendMessage(m.chat, { text: "*⚠️ BUSQUEDA RESTRINGIDA ⚠️*" }, { quoted: m });
    }
  }

  await m.react("📷");

  try {
    const query = encodeURIComponent(text);
    const url = `https://www.google.com/search?q=${query}&hl=es&tbm=isch&tbs=isz:lt,islt:qsvga`;

    const HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Accept: "text/html",
      "Accept-Language": "es-ES,es;q=0.9",
    };

    const r = await fetch(url, { headers: HEADERS });
    const html = await r.text();

    const patron = /\["(https?:\/\/encrypted-tbn0\.gstatic\.com\/images\?[^"]+?)".*?\["(https?:\/\/[^"]+?)".*?"(.*?)".*?\]/g;

    let match;
    let resultados = [];
    let visto = new Set();

    while ((match = patron.exec(html)) !== null) {
      let original_url = match[2]
        .replace(/\\u003d/g, "=")
        .replace(/\\u0026/g, "&");

      let titulo = match[3]
        .replace(/\\u[\dA-F]{4}/gi, u =>
          String.fromCharCode(parseInt(u.replace("\\u", ""), 16))
        )
        .replace(/<[^>]+>/g, "")
        .trim();

      if (!titulo) titulo = `Imagen ${resultados.length + 1}`;

      if (!visto.has(original_url)) {
        visto.add(original_url);
        resultados.push({
          titulo,
          url: original_url,
        });
      }

      if (resultados.length >= 10) break;
    }

    if (resultados.length === 0) {
      return conn.reply(m.chat, "❌ No hubo resultados.", m);
    }

    const elegido = resultados[Math.floor(Math.random() * resultados.length)];

    await conn.sendFile(
      m.chat,
      elegido.url,
      "img.jpg",
      `*Resultado de:* ${text}`,
      m
    );

  } catch (err) {
    console.error(err);
    conn.reply(m.chat, "❌ Error al buscar la imagen.", m);
  }
};

handler.help = ['imagen <texto>'];
handler.tags = ['tools'];
handler.command = ['imagen', 'foto', 'imágen'];

handler.group = true;
handler.botAdmin = false;

export default handler;
