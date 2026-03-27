// 📂 plugins/menu.js — FELIXCAT ULTRA MENU 🐾👑

const botname = global.botname || '😸 FelixCat-Bot 😸';
const creador = 'Anónimo🐼';
const versionBot = '11.0 ULTRA';

let handler = async (m, { conn }) => {
  try {
    const saludo = getSaludoGatuno();
    const fecha = new Date().toLocaleString('es-UY', {
      timeZone: 'America/Montevideo',
      hour12: false
    });

    let menu = `
╔══════════════════════╗
   🐾 *${botname}* 🐾
╚══════════════════════╝
👑 Creador: ${creador}
⚙️ Versión: ${versionBot}
🕒 ${fecha}
💬 ${saludo}

━━━━━━━━━━━━━━━━━━━
🌐 『 COMANDOS GENERALES 』
━━━━━━━━━━━━━━━━━━━
• .horoscopo → Tu destino 🔮
• .clima → Clima actual 🌦️
• .hora → Hora exacta 🕐
• .traducir → Traducciones 🌍
• .reportar → Reportes 🚨
• .sug → Sugerencias ✉️

━━━━━━━━━━━━━━━━━━━
📚 『 MENÚS DEL BOT 』
━━━━━━━━━━━━━━━━━━━
• .menuj → Juegos 🎮
• .menugp → Grupo 👥
• .menuhot → NSFW 🔥
• .mw → Owner 👑
• .menupj → Personajes 🎌

━━━━━━━━━━━━━━━━━━━
👤 『 PERFIL 』
━━━━━━━━━━━━━━━━━━━
• .perfil → Ver perfil 🪪
• .setbr → Cumpleaños 🎂
• .bio → Biografía 📝
• .genero → Género 🚻

━━━━━━━━━━━━━━━━━━━
🤝 『 HERMANOS 』
━━━━━━━━━━━━━━━━━━━
• .hermano → Solicitar 🤝
• .aceptarhermano → Aceptar ✅
• .rechazarhermano → Rechazar ❌
• .romperhermandad → Terminar 💔
• .abrazohermano → Abrazo 🤗
• .proteger → Proteger 🛡️
• .chocarhermano → Chocar ✋
• .entrenarhermano → Entrenar 🥊
• .relacionhermano → Estado 📊

━━━━━━━━━━━━━━━━━━━
💕 『 RELACIONES 』
━━━━━━━━━━━━━━━━━━━
• .pareja → Propuesta 💘
• .aceptar / .rechazar → Respuesta 💬
• .casarse → Matrimonio 💍
• .si / .no → Confirmar ✔️❌
• .terminar / .divorcio → Finalizar 💔
• .relacion → Estado ❤️
• .besar → Beso 💋
• .abrazar → Abrazo 🤗
• .amor → Nivel 💖
• .flores → Flores 🌹
• .regalo → Regalo 🎁
• .cita → Cita 🍷

━━━━━━━━━━━━━━━━━━━
🛡️ 『 SEGURIDAD 』
━━━━━━━━━━━━━━━━━━━
• .antilink → Bloquea links 🔗
• .antilink2 → Modo estricto 🚫
• .antibot → Anti bots 🤖
• .antitoxico → Anti insultos ☣️
• .antifake → Anti fake 👻

━━━━━━━━━━━━━━━━━━━
📥 『 DESCARGAS 』
━━━━━━━━━━━━━━━━━━━
• .apk → Apps 📲
• .spotify → Música 🎧
• .fb → Facebook 📘
• .ig → Instagram 📸
• .mediafire → Archivos 📂
• .tiktok → Videos 🎵

━━━━━━━━━━━━━━━━━━━
🎶 『 MÚSICA 』
━━━━━━━━━━━━━━━━━━━
• .play → Buscar música 🎵
• .play2 → Alternativa 🔊
• .mp3 → Solo audio 🎧
• .mp2 / .ytmp4 → Video 🎬

━━━━━━━━━━━━━━━━━━━
🖼️ 『 MULTIMEDIA 』
━━━━━━━━━━━━━━━━━━━
• .qc → Sticker texto 💬
• .s → Sticker imagen ✂️
• .imagen → Buscar imagen 🖼️
• .google → Buscar info 🌐

━━━━━━━━━━━━━━━━━━━
🎮 『 JUEGOS 』
━━━━━━━━━━━━━━━━━━━
• .trivia → Preguntas 🎯
• .adivinanza → Adivinar ❓
• .bandera → País 🏴
• .capital → Capitales 🏛️
• .pensar → Respuesta random 🧠
• .numero → Número 🔢
• .miau → Fun gato 🐈
• .top10 → Ranking 🏆
• .dance → Bailar 💃
• .plato → Comida 🍝
• .cornudo → Test 🤡
• .infiel → Infidelidad 💔
• .kiss → Beso 💋
• .zorro → Nivel 🦊

━━━━━━━━━━━━━━━━━━━
🧰 『 ADMINS 』
━━━━━━━━━━━━━━━━━━━
• .del → Borrar 🗑️
• .k → Expulsar 👢
• .p → Promover 🅿️
• .d → Degradar 🅳
• .mute → Silenciar 🔇
• .unmute → Activar 🔊
• .tagall → Mencionar 🏷️
• .tag → Tag manual 📢
• .g → Config grupo ⚙️

━━━━━━━━━━━━━━━━━━━
👑 『 OWNERS 』
━━━━━━━━━━━━━━━━━━━
• .autoadmin → Bot admin 🛡️
• .join → Entrar 🔗
• .grouplist → Lista 📜
• .resetuser → Reset 🔄
• .setprefix → Prefijo ✏️
• .resetprefix → Restaurar 🧹
• .restart → Reiniciar 🔁
• .resetlink → Nuevo link 🪄
• .update → Actualizar ⚙️

━━━━━━━━━━━━━━━━━━━
🐾 ${botname} activo 24/7 😼
💠 _“Dominando grupos como un verdadero felino.”_
━━━━━━━━━━━━━━━━━━━
`;

    await conn.reply(m.chat, menu.trim(), m);
    await conn.sendMessage(m.chat, { react: { text: '🐾', key: m.key } });

  } catch (err) {
    console.error(err);
    await conn.reply(m.chat, `❌ Error al mostrar el menú\n${err}`, m);
  }
};

handler.help = ['menu', 'menú', 'help'];
handler.tags = ['main'];
handler.command = ['menu', 'menú', 'allmenu'];

export default handler;

function getSaludoGatuno() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "🌅 Buenos días felinos";
  if (hour >= 12 && hour < 18) return "☀️ Buenas tardes felinas";
  return "🌙 Buenas noches felinas";
}
