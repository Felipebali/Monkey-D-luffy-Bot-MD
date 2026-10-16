
// 📂 plugins/mejorbro.js
// 🤖 whatsapp-bot — La mejor bro del mundo 💖
// 🔒 Exclusivo para OWNERS
// ============================================================
// • Owner escribe su número → frase aleatoria
// • Owner la menciona con @ → frase aleatoria
// • Usuarios normales no activan el sistema
// ============================================================

const BRO_NUMBER = '59893491934'
const BRO_JID = `${BRO_NUMBER}@s.whatsapp.net`

const FRASES = [
    `👑💖 ¡@BRO es la mejor bro que se puede tener! 💖👑\n\n✨ Una amiga de oro, única e incondicional.\n🫶 ¡Una verdadera hermana de la vida!`,

    `💎🌹 ¡@BRO es de esas personas que no se encuentran dos veces!\n\n🤍 Vale más que mil amistades pasajeras.\n👑 ¡Una reina que merece todo lo bonito de la vida!`,

    `🫂💗 ¡Atención, grupo! @BRO es una bro de otro nivel.\n\n🔥 Lealtad, buena vibra y un corazón enorme.\n🏆 ¡La mejor compañera que se puede tener!`,

    `🌟👑 ¡@BRO no es una bro cualquiera, es una leyenda!\n\n💖 De esas personas que hacen la diferencia.\n🤝 ¡Una verdadera hermana elegida por la vida!`,

    `💐💕 ¡Si hablamos de buenas amistades, hablamos de @BRO!\n\n✨ Una persona que vale oro y brilla con luz propia.\n💎 ¡Inigualable, auténtica y especial!`,

    `🛡️💖 ¡@BRO tiene el título oficial de MEJOR BRO!\n\n👑 Nadie le quita esa corona.\n🤝 Amistad de la buena, de la que se valora de verdad.`,

    `🌈🫶 ¡La vida se disfruta más con una bro como @BRO!\n\n💗 Buena energía, grandes momentos y una amistad especial.\n👑 ¡Una reina en su propia historia!`,

    `🚨👑 ¡COMUNICADO OFICIAL DE WHATSAPP-BOT!\n\n📢 @BRO ha sido reconocida como una de las mejores bros que existen.\n💖 El título es permanente y no admite discusión.`,

    `💫🌹 ¡@BRO es pequeña palabra para una amistad gigante!\n\n🫂 Hay personas que llegan y se vuelven familia.\n💖 ¡Ella es una de esas personas!`,

    `🏆💗 ¡Premio a la mejor bro del universo para @BRO!\n\n🥇 Por su valor como persona y por ser única.\n👑 ¡La campeona indiscutida de la amistad!`,

    `🐐🔥 ¡@BRO es la GOAT de las bros!\n\n👑 La número uno, la irrepetible, la legendaria.\n💖 ¡No hay ranking que le haga justicia!`,

    `💌✨ Si la amistad tuviera una definición, @BRO estaría en ella.\n\n🫶 Una persona especial que merece respeto, cariño y felicidad.\n🌷 ¡Que nunca le falten motivos para sonreír!`,

    `👑💅 ¡Permiso, que está hablando la élite de las bros!\n\n💖 @BRO tiene categoría propia.\n🔥 No compite con nadie: tiene su propio nivel.`,

    `🌌💜 Entre millones de personas, @BRO tiene algo que la hace especial.\n\n💎 Auténtica, única e imposible de reemplazar.\n🫂 ¡Una amistad que merece cuidarse!`,

    `📣💖 ¡Que todo el grupo se entere!\n\n👑 @BRO tiene corona, título y reconocimiento oficial.\n🏆 ¡MEJOR BRO, categoría legendaria!`,

    `🤝❤️ Una buena bro se valora, se respeta y se cuida.\n\n🌹 @BRO merece amistades sinceras y momentos inolvidables.\n👑 ¡Una reina con todas las letras!`,

    `⚡🐐 ¡Nivel de amistad: LEGENDARIO!\n\n💖 @BRO desbloqueó el rango máximo de mejor bro.\n🏆 Logro conseguido: ser única en su categoría.`,

    `💗🫂 Hay amistades que se convierten en familia sin compartir apellido.\n\n🌟 @BRO tiene ese lugar especial.\n👑 ¡Una hermana elegida de corazón!`,

    `🔮✨ Predicción del día: @BRO seguirá siendo una bro increíble.\n\n💖 Probabilidad de ser reemplazada: ¡misión imposible!\n👑 Su corona está a salvo.`,

    `🎖️💎 Distinción especial para @BRO:\n\n🥇 Mejor bro.\n👑 Categoría: única.\n💖 Estado: irremplazable.\n🔥 Vigencia: para siempre.`,

    `🚀💖 ¡@BRO está en otra liga!\n\n🌟 Mientras otros buscan una amistad especial, nosotros ya sabemos quién es.\n👑 ¡La reina indiscutida de las bros!`,

    `🌻🫶 Que la vida le devuelva a @BRO toda la buena energía que transmite.\n\n💗 Que nunca le falten personas sinceras.\n👑 ¡Porque alguien tan especial merece cosas bonitas!`,

    `💥👑 ¡ALERTA DE GRANDEZA!\n\n🐐 @BRO acaba de aparecer y el nivel del grupo subió automáticamente.\n💖 Una leyenda no necesita presentación.`,

    `📜🏆 Por decisión unánime de este bot:\n\n💗 @BRO recibe el título de mejor bro.\n👑 No hay apelaciones, no hay desempate y no hay discusión.\n✨ Caso cerrado.`
]

// ============================================================
// 👑 COMPROBAR OWNERS
// ============================================================

function esOwner(m, conn) {
    const sender = conn.decodeJid(m.sender || '')
    const numero = sender.split('@')[0].replace(/\D/g, '')

    // Owner configurado en global.owner
    const owners = Array.isArray(global.owner)
        ? global.owner
        : []

    const ownerConfigurado = owners.some(owner => {
        const valor = Array.isArray(owner) ? owner[0] : owner
        const numeroOwner = String(valor || '').replace(/\D/g, '')
        return numeroOwner && numeroOwner === numero
    })

    // También admite el owner principal si el framework lo marca
    return ownerConfigurado || m.isOwner === true
}

// ============================================================
// 💖 DETECTAR MENCIÓN O NÚMERO
// ============================================================

const handler = async (m, { conn }) => {
    try {
        if (!m.isGroup || m.fromMe) return
        if (!esOwner(m, conn)) return

        const texto = String(
            m.text ||
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            ''
        )

        const numeroEscrito = texto
            .replace(/\D/g, '')
            .includes(BRO_NUMBER)

        const menciones = Array.isArray(m.mentionedJid)
            ? m.mentionedJid
            : []

        const mencionada = menciones.some(jid => {
            const normalizado = conn.decodeJid(jid || '')
            return normalizado.split('@')[0].replace(/\D/g, '') === BRO_NUMBER
        })

        if (!numeroEscrito && !mencionada) return

        const frase = FRASES[
            Math.floor(Math.random() * FRASES.length)
        ].replace(/@BRO/g, `@${BRO_NUMBER}`)

        await conn.sendMessage(
            m.chat,
            {
                text: frase,
                mentions: [BRO_JID]
            },
            { quoted: m }
        )

    } catch (error) {
        console.error('[MEJOR BRO] Error:', error)
    }
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

handler.all = async function (m) {
    return handler(m, { conn: this })
}

handler.command = /^$/
handler.tags = ['owner']
handler.help = ['mejorbro']
handler.group = true
handler.owner = true

export default handler
