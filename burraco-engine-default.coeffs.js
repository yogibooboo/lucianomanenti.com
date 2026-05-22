// ============================================================================
// COEFFICIENTI MOTORE AI PREDEFINITO
// Editare direttamente questo file per modificare la strategia dell'AI.
// Viene caricato prima di burraco-engine-default.js tramite tag <script>.
// ============================================================================

window.coeffScoreOpz = {

    // --- VALORE CARTE ---
    valCarte:                   0.5,  // Moltiplicatore sui punti delle carte fisiche giocate in combinazioni

    // --- PREMI COMBINAZIONI ---
    premioTris:                  10,  // Premio base per un tris completato (3 carte)
    premioScala:                 20,  // Premio base per una scala completata (3 carte)
    premioTrisEstremo:            5,  // Bonus extra per tris di valori estremi (Asso, 3, Re)
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
    penScarto6c:                 25,  // Penalità per scartare carta che completerebbe combo avversaria a 6
    penScarto5c:                 15,  // Penalità per scartare carta che completerebbe combo avversaria a 5
    penScarto4c:                  7,  // Penalità per scartare carta che completerebbe combo avversaria a 4
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
    premioMazzo:                  5,  // Bonus per lo scenario 'mano' (pesca dal mazzo invece che dagli scarti)
    premioMattaPescata:          40,  // Bonus per prendere gli scarti quando la carta visibile è una matta

    // --- POZZETTO ---
    premioPrimoBurraco:          50,  // Bonus extra per la calata che completa esattamente il 7° posto (primo burraco)
    premioPozzetto:             100   // Bonus per opzioni che svuotano la mano permettendo il pozzetto
};
