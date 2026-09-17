// ============================================================================
// COEFFICIENTI MOTORE AI PREDEFINITO
// Editare direttamente questo file per modificare la strategia dell'AI.
// Viene caricato prima di burraco-engine-default.js tramite tag <script>.
//
// 17/09/2026 - AGGIUNTO moltScartoSostMatta, qui SPENTO (vale 1).
// Il termine sta in burraco-core.js dentro calcolaScartoPer: quando lo scarto
// non si limita ad allungare una combinazione avversaria ma prende il posto di
// una matta, la penalita' penScarto4c/5c/6c viene moltiplicata. La matta non
// torna in mano all'avversario (burraco-ui.js:1889): resta dentro e si sposta,
// quindi la combinazione cresce E conserva un jolly mobile. E' lo stesso evento
// per cui il motore si paga premioLiberaMatta* quando e' lui a calare, e finora
// non aveva il segno opposto.
// Frequenza misurata prima di toccare qualunque coefficiente (sonda-matta.js,
// 1.200 mani): 0,79 regali a mano, nel 47% delle mani, 5,8% degli scarti - di
// cui l'87% sostituzioni interne e i due terzi su un TRIS, per questo il malus
// non e' ristretto alle scale come il premio gemello.
// La variante in prova online da oggi (2/4/7 + x1,5) sta in B, vedi quel file.
//
// 11/09/2026 - penScartoTrisPozzo da 9 a 24, e il termine in burraco-core.js
// ora vede anche le SCALE (un 6 di fiori buttato sopra 5F e 7F lascia li' una
// scala bell'e' pronta, e la scala di tre e' un regalo esattamente come il
// tris). Il coefficiente e' lo stesso per tris e scala: le due penalita' non si
// sommano, una carta che fa tutt'e due prende quella del tris.
// Misurato su 1.200 mani appaiate contro la stessa tabella coi due coefficienti
// a zero: scarti sporchi dal 13,3% al 6,2%, scale nel monte da 14 a 1, tris da
// 77 a 5, esiti 598 contro 600 (netto -2 con errore standard 35). Il 24 non
// costa niente rispetto al 9, cambia solo i tris residui (12 invece di 5 ogni
// 16.500 scarti); si adotta perche' il tris nel monte e' punti pronti per chi
// pesca dopo, mentre la coppia e' esteticamente accettabile.
//
// 11/09/2026 - RIPROVATO penScarto6c coi coefficienti nuovi. Il valore basso
// resta quello giusto: 5 / 10 / 15 / 20 / 25 contro la base 5 danno margine
// +2,8 / +2,0 / -2,5 / -13,1 / -13,8 punti a mano, e il 25 confermato su 8.000
// mani appaiate a -13,4 con errore standard 4,3 (t -3,1, mani vinte 3.842
// contro 4.137). Nessuna gobba nascosta sopra il 5: non riprovarlo.
// Griglia in scratchpad/griglia-pen6c.csv.
//
// 10/09/2026 - AGGIUNTI penScartoCoppiaPozzo (3) e penScartoTrisPozzo (9).
// L'IA non guardava mai dentro il monte scarti e buttava il 7 sopra il 7: una
// cosa che si vede, perche' il monte si prende tutto intero ed e' visibile
// tutto. Misurati al banco appaiato (scratchpad/bench-pozzo.js) su 24.000 mani
// con lo stesso database di mazzi: gli scarti che cadono su una carta uguale
// passano dal 12,8% al 6,2% - il difetto si dimezza - e il margine e' +2,5
// punti a mano con errore standard 3,9, cioe' indistinguibile da zero.
// Non si guadagna: non si perde, e il difetto si vede molto meno.
// I valori sopra 4 tagliano di piu' ma cominciano a costare punti (a 6 il
// margine e' -6,8 su due griglie indipendenti), percio' 3 e non di piu'.
//
// 01/09/2026 - PROMOSSI GLI OTTO COEFFICIENTI. Sono le righe che qui sotto
// portano il commento "promosso 01/09". Venivano da burraco-engine-b.coeffs.js,
// dove stavano dal 22/08 in attesa di essere misurati sul campo.
//
// Perche' si promuovono. Due misure indipendenti, non una:
//   - banco a specchio, 4000 mani: 59,2% di mani vinte, margine +66,6, t 14,8;
//   - esperimento a tre bracci sulle partite vere, chiuso il 25/08 a 8.319
//     mani: circa 28 punti a mano per sedia, con i controlli puliti.
// Il banco da solo non bastava: il sospetto era che il vantaggio sfruttasse un
// punto cieco del motore A invece di essere una vera miglioria, e in
// autoscontro le due cose danno gli stessi numeri. L'esperimento online ha
// sciolto il dubbio, ed e' per quello che era stato costruito.
//
// ATTENZIONE se un giorno si tocca uno di questi otto: e' una COMBINAZIONE
// trovata tarandoli tutti insieme, non una somma di ottimi singoli. Muoverne
// uno solo non da' un ottavo del guadagno, puo' benissimo peggiorare. Per
// sapere quale degli otto porta il peso serve un giro di prove a togliere un
// coefficiente per volta, mai ancora fatto.
//
// Cambiando questi valori cambia l'impronta della tabella (_improntaCoeff in
// burraco-game.js), quindi nel database si registra da solo un motore nuovo e
// le mani vecchie restano leggibili col metro vecchio. Non e' un effetto
// collaterale: e' il motivo per cui l'impronta sta nella versione del motore.
// ============================================================================

window.coeffScoreOpz = {

    // --- VALORE CARTE ---
    valCarte:                     1,  // Moltiplicatore sui punti delle carte fisiche giocate in combinazioni — promosso 01/09 (era 0.5)

    // --- PREMI COMBINAZIONI ---
    premioTris:                   8,  // Premio base per un tris completato (3 carte) — promosso 01/09 (era 10)
    premioScala:                 20,  // Premio base per una scala completata (3 carte)
    premioTrisEstremo:            8,  // Bonus extra per tris di valori estremi (Asso, 3, Re) — promosso 01/09 (era 5)
    premio4c:                    10,  // Premio incrementale per portare una combo a 4 carte
    premio5c:                    20,  // Premio incrementale per portare una combo a 5 carte
    premio6c:                    40,  // Premio incrementale per portare una combo a 6 carte
    premioBurraco:              100,  // Premio per completare il burraco (7ª carta)
    premioOltreBurraco:           0,  // Premio per ogni carta aggiuntiva oltre il burraco (8+)

    // --- MATTE ---
    penMattaBase:                15,  // Penalità base per uso matta in combinazione (×lunghezza-2)
    penCalataMatta:              35,  // Penalità per calata di una matta (scoraggia calate non decisive)
    penMattaSuBurracoPulito:    100,  // Penalità per matta che "sporca" un burraco pulito
    premioLiberaMattaInterna:    15,  // Bonus per calata che libera una matta interna da una scala
    premioLiberaMattaBordo:      10,  // Bonus per calata che libera una matta di bordo da una scala
    premioMattaSolitaria:       200,  // Bonus per variante M: calata di matta solitaria su combo esistente

    // --- SCARTO ---
    coeffScartoDecent:            3,  // Peso della decentralizzazione nella scelta dello scarto (favorisce scarti di carte non centrali)
    coeffScartoConn:              4,  // Penalità per scartare carte connesse ad altre in mano
    penScarto6c:                  5,  // Penalità per scartare carta che completerebbe combo avversaria a 6 — promosso 01/09 (era 25)
    penScarto5c:                  3,  // Penalità per scartare carta che completerebbe combo avversaria a 5 — promosso 01/09 (era 15)
    penScarto4c:                  3,  // Penalità per scartare carta che completerebbe combo avversaria a 4 — promosso 01/09 (era 7)
    moltScartoSostMatta:          1,  // Moltiplicatore su penScarto4c/5c/6c quando lo scarto sostituisce una matta avversaria. 1 = SPENTO: la variante viva sta in burraco-engine-b.coeffs.js
    penScartoCalabile:            7,  // Penalità per scartare carta calabile su combo propria a terra
    penScartoMatta:              50,  // Penalità pesante per scartare una matta
    penScartoCoppiaPozzo:         3,  // Penalità se la carta forma una COPPIA nel monte scarti — misurato 10/09/2026
    penScartoTrisPozzo:          24,  // Penalità se la carta forma un TRIS o una SCALA nel monte scarti — alzato 11/09/2026 (era 9)

    // --- BONUS SOTTRAZIONE AVVERSARIO ---
    // Applicati quando una carta giocata impedisce all'avversario di raggiungere quella lunghezza
    bonusAvv4c:                  10,  // Bonus se la carta avrebbe portato una combo avversaria a 4
    bonusAvv5c:                  20,  // Bonus se la carta avrebbe portato una combo avversaria a 5
    bonusAvv6c:                  40,  // Bonus se la carta avrebbe portato una combo avversaria a 6
    bonusAvv7c:                 100,  // Bonus se la carta avrebbe completato il burraco avversario
    bonusAvv8c:                   0,  // Bonus per carte oltre il burraco avversario (normalmente 0)

    // --- CARTE ORFANE ---
    penCartaOrfana:               2,  // Penalità per ogni carta orfana rimasta in mano dopo l'opzione

    // --- SCENARIO E PESCA ---
    premioMazzo:                 10,  // Bonus per lo scenario 'mano' (pesca dal mazzo invece che dagli scarti) — promosso 01/09 (era 5)
    premioMattaPescata:          40,  // Bonus per prendere gli scarti quando la carta visibile è una matta

    // --- POZZETTO ---
    premioPrimoBurraco:         150,  // Bonus extra per la calata che completa esattamente il 7° posto (primo burraco) — promosso 01/09 (era 50)
    premioPozzetto:             100   // Bonus per opzioni che svuotano la mano permettendo il pozzetto
};
