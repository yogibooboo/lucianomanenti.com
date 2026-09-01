// ============================================================================
// COEFFICIENTI MOTORE AI — B
//
// 01/09/2026 — ATTENZIONE: QUESTA TABELLA ORA È IDENTICA A QUELLA DI SERIE.
// Gli otto coefficienti sono stati promossi in burraco-engine-default.coeffs.js,
// quindi B non si scosta più da niente. Oggi non fa danni perché i bracci sono
// spenti (AB_ATTIVO = false in burraco-game.js), ma chi riaccendesse
// l'esperimento senza prima mettere qui dei valori NUOVI otterrebbe un
// esperimento nullo che sembra funzionare: tre bracci che giocano tutti allo
// stesso modo, e nel database `parametri` vuoto su tutti e tre — cioè B
// indistinguibile da A. Il file resta come impalcatura per il prossimo
// esperimento, non come una variante viva.
//
// Il giro naturale sarebbe quello mai fatto: togliere un coefficiente per
// volta dagli otto per sapere quale porta il peso (vedi la nota in fondo).
//
// --- storia, da qui in giù ---
//
// 22/08/2026: ripristinati gli OTTO valori che erano annotati nel commento
// "era N", cioè la combinazione trovata a maggio tarando i coefficienti tutti
// insieme (i guadagni del singolo parametro NON si sommano: questa è una
// combinazione, non una somma di ottimi). Sono le otto righe che qui sotto
// portano il commento "combinazione 22/08".
//
// Misurata contro la tabella di serie su 4000 mani a specchio (stesso mazzo
// giocato due volte coi motori scambiati di posto, così la fortuna delle carte
// si annulla per costruzione): 59,2% di mani vinte, margine medio +66,6 punti,
// t = 14,8. Il meccanismo non è limare punti ma andare fuori: 1272 chiusure
// contro 698, pozzetti 1807 contro 1408.
//
// Il sospetto che l'esperimento online deve sciogliere è che quel vantaggio
// sfrutti un punto cieco del motore A invece di essere una vera miglioria: in
// autoscontro le due cose danno gli stessi numeri. Vedi i tre bracci in
// burraco-game.js.
//
// Nota per quando si leggeranno i risultati: cambiando otto coefficienti
// insieme, un esito positivo dirà che il MAZZETTO funziona, non quale degli
// otto lo faccia funzionare. Per quello serve un giro di prove a togliere un
// coefficiente per volta.
// ============================================================================

window.coeffScoreOpzB = {

    // --- VALORE CARTE ---
    valCarte:                     1,  // Moltiplicatore sui punti delle carte fisiche giocate in combinazioni — combinazione 22/08 (di serie 0.5)

    // --- PREMI COMBINAZIONI ---
    premioTris:                   8,  // Premio base per un tris completato (3 carte) — combinazione 22/08 (di serie 10)
    premioScala:                 20,  // Premio base per una scala completata (3 carte)
    premioTrisEstremo:            8,  // Bonus extra per tris di valori estremi (Asso, 3, Re) — combinazione 22/08 (di serie 5)
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
    penScarto6c:                  5,  // Penalità per scartare carta che completerebbe combo avversaria a 6 — combinazione 22/08 (di serie 25)
    penScarto5c:                  3,  // Penalità per scartare carta che completerebbe combo avversaria a 5 — combinazione 22/08 (di serie 15)
    penScarto4c:                  3,  // Penalità per scartare carta che completerebbe combo avversaria a 4 — combinazione 22/08 (di serie 7)
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
    premioMazzo:                 10,  // Bonus per lo scenario 'mano' (pesca dal mazzo invece che dagli scarti) — combinazione 22/08 (di serie 5)
    premioMattaPescata:          40,  // Bonus per prendere gli scarti quando la carta visibile è una matta

    // --- POZZETTO ---
    premioPrimoBurraco:         150,  // Bonus extra per la calata che completa esattamente il 7° posto (primo burraco) — combinazione 22/08 (di serie 50)
    premioPozzetto:             100   // Bonus per opzioni che svuotano la mano permettendo il pozzetto
};
