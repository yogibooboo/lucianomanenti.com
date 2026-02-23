const fs = require('fs');
const coreCode = fs.readFileSync('C:/Users/Luciano/OneDrive/backup Documents/websites/lucianomanenti.com/burraco-core.js', 'utf8');

// Creiamo un evaluator per estrarre solo la classe BurracoLogic
const Sandbox = { console: console };
try {
    const fn = new Function('module', 'exports', coreCode + '\nreturn BurracoLogic;');
    const mod = { exports: {} };
    const LogicClass = fn(mod, mod.exports);

    const data = JSON.parse(fs.readFileSync('C:/Users/Luciano/OneDrive/backup Documents/websites/lucianomanenti.com/doc/burraco_debug_turno_1 (3).json'));
    const anna = data.giocatori.find(g => g.nome === 'Anna');
    const carte = anna.carteScoperte.concat(data.scarti);

    const engine = new LogicClass();
    const scaleTrovate = engine.trovaScale(carte);

    console.log("CARTE MANO + SCARTI:");
    console.log(carte.map(c => `${c.num || c.numero}${c.seme}`).join(', '));
    console.log("\nSCALE TROVATE:");
    scaleTrovate.forEach((s, idx) => {
        const carteStr = s.carte.map(c => `${c.num || c.numero}${c.seme}`).join('-');
        console.log(`[${idx + 1}] Seme: ${s.seme}, Carte: ${carteStr}`);
    });
} catch (e) {
    console.error("Errore import core:", e);
}
