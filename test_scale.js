const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:/Users/Luciano/OneDrive/backup Documents/websites/lucianomanenti.com/doc/burraco_debug_turno_1 (3).json'));
const anna = data.giocatori.find(g => g.nome === 'Anna');
const carte = anna.carteScoperte.concat(data.scarti); // Simuliamo aver preso gli scarti

// Funzione estratta da burraco-core.js
function trovaScale(mano) {
    const scale = [];
    const perSeme = new Map();

    mano.forEach(c => {
        if (!c.isJolly && !c.isPinella) {
            if (!perSeme.has(c.seme)) perSeme.set(c.seme, new Map());
            const semeMap = perSeme.get(c.seme);
            if (!semeMap.has(c.num || c.numero)) { // JSON ha .num
                semeMap.set(c.num || c.numero, []);
            }
            semeMap.get(c.num || c.numero).push(c);
        }
    });

    // Mappo isJolly/isPinella dal json (seme J è jolly, num 2 o seme vario è pinella)
    const matte = mano.filter(c => c.seme === 'J' || c.num === 2 || c.numero === 2);

    const provaScala = (semeMap, seme, start, end) => {
        const risultati = [];
        const carteScala = [];
        let buchi = 0;
        let posizioneBuco = -1;

        for (let n = start; n <= end; n++) {
            if (semeMap.has(n)) {
                carteScala.push({ numero: n, carta: semeMap.get(n)[0] });
            } else if (n === 14 && semeMap.has(1)) {
                carteScala.push({ numero: 14, carta: semeMap.get(1)[0] });
            } else {
                buchi++;
                posizioneBuco = n;
                carteScala.push({ numero: n, carta: null });
            }
        }

        const lunghezza = end - start + 1;
        if (lunghezza < 3) return risultati;

        if (buchi === 0) {
            const carte = carteScala.map(x => x.carta);
            risultati.push({
                carte: carte,
                usaMatta: false,
                seme: seme,
                daNumero: start,
                aNumero: end
            });
        }
        else if (buchi === 1 && matte.length > 0) {
            for (const matta of matte) {
                const carte = carteScala.map(x => x.carta || matta);
                risultati.push({
                    carte: carte,
                    usaMatta: true,
                    mattaUsata: matta,
                    seme: seme,
                    daNumero: start,
                    aNumero: end,
                    posizioneMatta: posizioneBuco
                });
            }
        }
        return risultati;
    };

    perSeme.forEach((semeMap, seme) => {
        const numeri = [...semeMap.keys()].sort((a, b) => a - b);
        if (numeri.length < 2) return;

        for (let len = 3; len <= 7; len++) {
            for (let start = 1; start <= 15 - len; start++) {
                const end = start + len - 1;
                if (end > 14) continue;

                let carteNelRange = 0;
                for (let n = start; n <= end; n++) {
                    if (semeMap.has(n) || (n === 14 && semeMap.has(1))) {
                        carteNelRange++;
                    }
                }

                if (carteNelRange >= len) {
                    scale.push(...provaScala(semeMap, seme, start, end));
                } else if (carteNelRange === len - 1 && matte.length > 0) {
                    scale.push(...provaScala(semeMap, seme, start, end));
                }
            }
        }

        for (let i = 0; i < numeri.length - 1; i++) {
            const n1 = numeri[i];
            const n2 = numeri[i + 1];
            if (n2 === n1 + 1 && matte.length > 0) {
                const c1 = semeMap.get(n1)[0];
                const c2 = semeMap.get(n2)[0];

                for (const matta of matte) {
                    if (n1 > 1) {
                        scale.push({
                            carte: [matta, c1, c2],
                            usaMatta: true,
                            mattaUsata: matta,
                            seme: seme,
                            daNumero: n1 - 1,
                            aNumero: n2
                        });
                    }
                    if (n2 < 14) {
                        scale.push({
                            carte: [c1, c2, matta],
                            usaMatta: true,
                            mattaUsata: matta,
                            seme: seme,
                            daNumero: n1,
                            aNumero: n2 + 1
                        });
                    }
                }
            }
        }
    });

    let uniche = [];
    const viste = new Set();
    for (const s of scale) {
        const key = s.carte.map(c => c.id).sort().join(',');
        if (!viste.has(key)) {
            viste.add(key);
            uniche.push(s);
        }
    }

    return uniche;
}

const scaleTrovate = trovaScale(carte);
console.log("CARTE MANO + SCARTI:");
console.log(carte.map(c => `${c.num || c.numero}${c.seme} (id:${c.id})`).join(', '));
console.log("\nSCALE TROVATE:");
scaleTrovate.forEach((s, idx) => {
    const carteStr = s.carte.map(c => `${c.num || c.numero}${c.seme}`).join('-');
    console.log(`[${idx + 1}] Seme: ${s.seme}, Carte: ${carteStr}`);
});
