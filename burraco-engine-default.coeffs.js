// ============================================================================
// COEFFICIENTI MOTORE AI PREDEFINITO
// Editare direttamente questo file per modificare la strategia dell'AI.
// Viene caricato prima di burraco-engine-default.js tramite tag <script>.
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
    penScartoCalabile:            7,  // Penalità per scartare carta calabile su combo propria a terra
    penScartoMatta:              50,  // Penalità pesante per scartare una matta

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
