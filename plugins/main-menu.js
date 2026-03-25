// 📂 plugins/menu.js — MENU PRO FelixCat 🐾✨

const botname = global.botname || '😸 FelixCat-Bot 😸';
const creador = 'Anónimo🐼';
const versionBot = '11.0 PRO';

let handler = async (m, { conn }) => {
  try {
    const saludo = getSaludoGatuno();
    const fecha = new Date().toLocaleString('es-UY', {
      timeZone: 'America/Montevideo',
      hour12: false
    });

    let menu = `
╔═══ 🐾 *${botname}* 🐾 ═══╗
║ 👑 Creador: ${creador}
║ ⚙️ Versión: ${versionBot}
║ 🕒 ${fecha}
║ 💬 ${saludo}
╚═══════════════════════╝

🌐 *COMANDOS GENERALES*
➤ 🔮 .horoscopo
➤ 🌦️ .clima
➤ 🕐 .hora
➤ 🌍 .traducir
➤ 🚨 .reportar
➤ ✉️ .sug

📚 *MENÚS*
➤ 🎮 .menuj
➤ 👥 .menugp
➤ 🔥 .menuhot
➤ 👑 .mw
➤ 🎌 .menupj

━━━━━━━━━━━━━━━━━━━━

👤 *PERFIL*
➤ 🪪 .perfil
➤ 🎂 .setbr
➤ 📝 .bio
➤ 🚻 .genero

🤝 *HERMANOS*
➤ .hermano / .aceptarhermano
➤ .rechazarhermano / .romperhermandad
➤ .abrazohermano / .proteger
➤ .chocarhermano / .entrenarhermano
➤ .relacionhermano

💕 *RELACIONES*
➤ 💘 .pareja / .aceptar / .rechazar
➤ 💍 .casarse / .si / .no
➤ 💔 .terminar / .divorcio
➤ ❤️ .relacion
➤ 💋 .besar / 🤗 .abrazar
➤ 💖 .amor / 🌹 .flores
➤ 🎁 .regalo / 🍷 .cita

━━━━━━━━━━━━━━━━━━━━

🛡️ *SEGURIDAD*
➤ 🔗 .antilink / .antilink2
➤ 🤖 .antibot
➤ ☣️ .antitoxico
➤ 👻 .antifake

📥 *DESCARGAS*
➤ 📲 .apk
➤ 🎧 .spotify
➤ 📘 .fb / 📸 .ig
➤ 📂 .mediafire
➤ 🎵 .tiktok

🎶 *MÚSICA*
➤ 🎵 .play / .play2
➤ 🔊 .mp3
➤ 🎬 .mp2 / .ytmp4

🖼️ *MULTIMEDIA*
➤ 💬 .qc
➤ ✂️ .s
➤ 🖼️ .imagen
➤ 🌐 .google

━━━━━━━━━━━━━━━━━━━━

🎮 *JUEGOS*
➤ 🎯 .trivia / ❓ .adivinanza
➤ 🏴 .bandera / 🏛️ .capital
➤ 🧠 .pensar / 🔢 .numero
➤ 🐈 .miau / 🏆 .top10
➤ 💃 .dance / 🍝 .plato
➤ 🤡 .cornudo / 💔 .infiel
➤ 💋 .kiss / 🦊 .zorro

━━━━━━━━━━━━━━━━━━━━

🧰 *ADMINS*
➤ 🗑️ .del
➤ 👢 .k
➤ 🅿️ .p / 🅳 .d
➤ 🔇 .mute / .unmute
➤ 🏷️ .tagall / .tag
➤ ⚙️ .g

👑 *OWNERS*
➤ 🛡️ .autoadmin
➤ 🔗 .join
➤ 📜 .grouplist
➤ 🔄 .resetuser
➤ ✏️ .setprefix / 🧹 .resetprefix
➤ 🔁 .restart
➤ 🪄 .resetlink
➤ ⚙️ .update

━━━━━━━━━━━━━━━━━━━━

🐾 ${botname} activo 24/7 😼  
✨ _“Un maullido, una orden.”_
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
